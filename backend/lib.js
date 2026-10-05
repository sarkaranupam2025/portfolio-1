/* Shared helpers for the CMS backend functions.

   Storage is behind one interface so the same handlers run on:
     • node:fs        — local `netlify dev` / `vercel dev`, and any plain Node host
     • Netlify Blobs  — set NETLIFY=1 (the adapter is imported lazily)
     • Vercel Blob    — set VERCEL_BLOB_READ_WRITE_TOKEN

   Add another provider by implementing get/put/del over a key string.
*/
const crypto = require('crypto');

const NS = 'as-cms';

/* ── storage adapters ─────────────────────────────────────────────────────── */
const fsAdapter = () => {
  const fs = require('fs');
  const path = require('path');
  const dir = process.env.CMS_DATA_DIR || path.join(__dirname, '..', '.cms-data');
  fs.mkdirSync(dir, { recursive: true });
  const file = (key) => path.join(dir, key.replace(/[^\w.@-]/g, '_') + '.json');
  return {
    name: 'filesystem:' + dir,
    async get(key) {
      try { return JSON.parse(fs.readFileSync(file(key), 'utf8')); } catch (e) { return null; }
    },
    async put(key, value) { fs.writeFileSync(file(key), JSON.stringify(value, null, 2)); return true; },
    async del(key) { try { fs.unlinkSync(file(key)); } catch (e) {} return true; },
  };
};

const netlifyAdapter = () => {
  const { getStore } = require('@netlify/blobs');
  const blobStore = getStore(NS);
  return {
    name: 'netlify-blobs:' + NS,
    async get(key) { try { return await blobStore.getJSON(key); } catch (e) { return null; } },
    async put(key, value) { await blobStore.setJSON(key, value); return true; },
    async del(key) { try { await blobStore.delete(key); } catch (e) {} return true; },
  };
};

const vercelAdapter = () => {
  const { getBlob, put, del } = require('@vercel/blob');
  const url = async (key) => getBlob(key, process.env.VERCEL_BLOB_READ_WRITE_TOKEN);
  return {
    name: 'vercel-blob',
    async get(key) {
      try {
        const b = await url(key);
        if (!b) return null;
        const r = await fetch(b.downloadUrl);
        return r.ok ? await r.json() : null;
      } catch (e) { return null; }
    },
    async put(key, value) {
      await put(key, JSON.stringify(value), {
        access: 'public', token: process.env.VERCEL_BLOB_READ_WRITE_TOKEN,
        contentType: 'application/json', addRandomSuffix: false,
      });
      return true;
    },
    async del(key) {
      try {
        const b = await url(key);
        if (b) await del(b.url, process.env.VERCEL_BLOB_READ_WRITE_TOKEN);
      } catch (e) {}
      return true;
    },
  };
};

let cached = null;
function store() {
  if (cached) return cached;
  if (process.env.VERCEL_BLOB_READ_WRITE_TOKEN) cached = vercelAdapter();
  else if (process.env.NETLIFY) cached = netlifyAdapter();
  else cached = fsAdapter();
  return cached;
}

/* ── passwords ────────────────────────────────────────────────────────────── */
const ITERATIONS = 210000;          /* OWASP floor for PBKDF2-SHA256 */

function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(String(password), salt, ITERATIONS, 32, 'sha256').toString('hex');
  return { salt, hash, iterations: ITERATIONS, algorithm: 'pbkdf2-sha256' };
}
function verifyPassword(password, rec) {
  if (!rec || !rec.hash) return false;
  const iters = rec.iterations || ITERATIONS;
  const got = crypto.pbkdf2Sync(String(password), rec.salt, iters, 32, 'sha256').toString('hex');
  const a = Buffer.from(got, 'hex'), b = Buffer.from(rec.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ── sessions ─────────────────────────────────────────────────────────────── */
const SESSION_TTL = 1000 * 60 * 60 * 8;      /* 8 hours */
function secret() {
  const s = process.env.CMS_SESSION_SECRET;
  if (s) return s;
  throw new Error('CMS_SESSION_SECRET is not set. Generate one with: openssl rand -hex 32');
}
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return body + '.' + mac;
}
function unsign(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const want = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(String(mac)), b = Buffer.from(want);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch (e) { return null; }
}
function issueToken() {
  return sign({ sub: 'admin', exp: Date.now() + SESSION_TTL, iat: Date.now() });
}
function bearer(event) {
  const h = (event && (event.headers || {})) || {};
  const raw = h.authorization || h.Authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(raw);
  return m ? unsign(m[1].trim()) : null;
}

/* ── HTTP helpers ─────────────────────────────────────────────────────────── */
function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
    body: JSON.stringify(body),
  };
}
function method(event) { return String((event && event.httpMethod) || (event && event.requestMethod) || 'GET').toUpperCase(); }
function params(event) {
  const qs = (event && (event.queryStringParameters || (event.rawUrl && Object.fromEntries(new URL(event.rawUrl).searchParams)))) || {};
  return qs;
}
function readBody(event) {
  if (!event || !event.body) return {};
  try { return JSON.parse(event.body); } catch (e) { return {}; }
}

/* rate limiting: best effort, per-instance (use Upstash/Redis for a real one) */
const hits = new Map();
function tooMany(key, limit, windowMs) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return list.length > limit;
}

module.exports = {
  store, json, method, params, readBody, bearer, issueToken,
  hashPassword, verifyPassword, tooMany, NS,
};
