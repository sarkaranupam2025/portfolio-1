/* GET /content?which=draft|published — read the stored document (public read for
       "published" so the live site can fetch it without a token)
   PUT /content — write it (requires a valid session)
   DELETE /content?which=draft — clear a draft (requires a valid session)

   Stored shape: { content, design, cases, savedAt, savedBy }
   Only the keys that differ from the shipped defaults are stored, which is what
   the admin already computes, so a payload is a couple of kilobytes.
*/
const { store, json, method, params, readBody, bearer } = require('./lib');

const ALLOWED = new Set(['draft', 'published']);
const MAX_BYTES = 6 * 1024 * 1024;      /* generous: embedded images are the bulk */

/* Only these top-level keys may appear, so a caller cannot use this as a
   general-purpose key/value store on your account. */
const ALLOWED_SECTIONS = new Set(['meta', 'header', 'hero', 'philosophy', 'experience',
  'works', 'projects', 'ai', 'contact']);

/* The project cards carry two nested structures the admin edits: which parts of a
   card are visible, and the colours of its preview plate. Both are whitelisted so a
   stray key cannot reach the page (where it would become a class or a CSS value). */
const CARD_FIELDS = ['badge', 'dots', 'meta', 'problem', 'outcome', 'tags', 'cta'];
const PREVIEW_KEYS = ['type', 'svg', 'image', 'bg', 'ink', 'dot'];
const HEX = /^#[0-9a-fA-F]{6}$/;
const MAX_CARDS = 12;

function validateCards(content) {
  const works = content.works;
  if (!works || works.items === undefined) return null;
  if (!Array.isArray(works.items)) return 'content.works.items must be an array';
  if (works.items.length > MAX_CARDS) return 'content.works.items is limited to ' + MAX_CARDS + ' cards';

  for (let i = 0; i < works.items.length; i++) {
    const it = works.items[i];
    const at = 'content.works.items[' + i + ']';
    if (!it || typeof it !== 'object' || Array.isArray(it)) return at + ' must be an object';

    if (it.fields !== undefined) {
      if (!it.fields || typeof it.fields !== 'object' || Array.isArray(it.fields)) {
        return at + '.fields must be an object';
      }
      for (const k of Object.keys(it.fields)) {
        if (!CARD_FIELDS.includes(k)) return at + '.fields has an unknown key: ' + k;
        if (typeof it.fields[k] !== 'boolean') return at + '.fields.' + k + ' must be true or false';
      }
    }

    if (it.preview !== undefined) {
      if (!it.preview || typeof it.preview !== 'object' || Array.isArray(it.preview)) {
        return at + '.preview must be an object';
      }
      for (const k of Object.keys(it.preview)) {
        if (!PREVIEW_KEYS.includes(k)) return at + '.preview has an unknown key: ' + k;
      }
      for (const k of ['bg', 'ink', 'dot']) {
        if (it.preview[k] !== undefined && !HEX.test(String(it.preview[k]))) {
          return at + '.preview.' + k + ' must be a 6-digit hex colour';
        }
      }
    }
  }
  return null;
}

function validate(doc) {
  if (!doc || typeof doc !== 'object') return 'Body must be an object';
  if (doc.content !== null && doc.content !== undefined) {
    if (typeof doc.content !== 'object' || Array.isArray(doc.content)) return 'content must be an object';
    const bad = Object.keys(doc.content).filter((k) => !ALLOWED_SECTIONS.has(k));
    if (bad.length) return 'Unknown content section(s): ' + bad.join(', ');
    /* nested card structures get their own whitelist */
    const cardProblem = validateCards(doc.content);
    if (cardProblem) return cardProblem;

    /* each section must be a plain object, never a string/number/array */
    for (const k of Object.keys(doc.content)) {
      const v = doc.content[k];
      if (v === null) continue;
      if (typeof v !== 'object' || Array.isArray(v)) {
        return 'content.' + k + ' must be an object, got ' + (Array.isArray(v) ? 'array' : typeof v);
      }
    }
  }
  if (doc.design !== null && doc.design !== undefined && typeof doc.design !== 'object') {
    return 'design must be an object';
  }
  if (doc.cases !== null && doc.cases !== undefined && typeof doc.cases !== 'object') {
    return 'cases must be an object';
  }
  const size = Buffer.byteLength(JSON.stringify(doc));
  if (size > MAX_BYTES) return 'Payload is ' + size + ' bytes; the limit is ' + MAX_BYTES;
  return null;
}

exports.handler = async function (event) {
  const verb = method(event);
  const db = store();
  const q = params(event);
  const which = ALLOWED.has(q.which) ? q.which : 'published';
  const key = 'content:' + which;

  if (verb === 'OPTIONS') {
    return { statusCode: 204, headers: cors(event), body: '' };
  }

  if (verb === 'GET') {
    /* the published document is world-readable on purpose: the live site fetches
       it. The draft is not — it can contain unreviewed copy. */
    if (which === 'draft' && !bearer(event)) {
      return withCors(event, json(401, { error: 'Sign in to read the draft' }));
    }
    const doc = await db.get(key);
    return withCors(event, json(200, doc || { content: null, design: null, cases: null }));
  }

  if (verb === 'PUT' || verb === 'POST') {
    const session = bearer(event);
    if (!session) return withCors(event, json(401, { error: 'Sign in first' }));
    const body = readBody(event);
    const target = ALLOWED.has(body.which) ? body.which : which;
    const doc = {
      content: body.content || null,
      design: body.design || null,
      cases: body.cases || null,
    };
    const problem = validate(doc);
    if (problem) return withCors(event, json(400, { error: problem }));
    doc.savedAt = Date.now();
    doc.savedBy = session.sub || 'admin';
    await db.put('content:' + target, doc);
    return withCors(event, json(200, { ok: true, which: target, savedAt: doc.savedAt,
      bytes: Buffer.byteLength(JSON.stringify(doc)) }));
  }

  if (verb === 'DELETE') {
    if (!bearer(event)) return withCors(event, json(401, { error: 'Sign in first' }));
    await db.del(key);
    return withCors(event, json(200, { ok: true, cleared: which }));
  }

  return withCors(event, json(405, { error: 'Use GET, PUT or DELETE' }));
};

function cors(event) {
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}
function withCors(event, res) {
  res.headers = Object.assign({}, res.headers, cors(event));
  return res;
}
