/* POST /auth — set up or verify the admin password, and issue a session token.
   GET  /auth — report whether the CMS has been set up (no secrets returned).

   Body: { action: 'setup' | 'login' | 'change',
           username, password, newUsername?, newPassword? }

   Setup is only possible while no password exists, so a stranger who finds the
   endpoint later cannot claim the account. Login is rate-limited and the hash is
   PBKDF2-SHA256 at the OWASP iteration floor, compared in constant time.
*/
const { store, json, method, readBody, hashPassword, verifyPassword,
        issueToken, bearer, tooMany } = require('./lib');

const AUTH_KEY = 'auth';
const MIN_LENGTH = 8;
const MIN_USERNAME = 3;
const MAX_USERNAME = 64;

/* Usernames are stored as given but compared exactly; this keeps anything odd
   (control characters, huge strings) out of the record. */
function cleanUsername(v) {
  const u = String(v === undefined || v === null ? '' : v).trim();
  if (u.length < MIN_USERNAME || u.length > MAX_USERNAME) return null;
  if (/[\u0000-\u001f<>]/.test(u)) return null;
  return u;
}

exports.handler = async function (event) {
  const verb = method(event);
  const db = store();
  /* every response needs CORS, or a browser on another origin cannot read it */
  const out = (res) => withCors(event, res);

  if (verb === 'OPTIONS') {
    return { statusCode: 204, headers: cors(event), body: '' };
  }

  if (verb === 'GET') {
    const rec = await db.get(AUTH_KEY);
    return out(json(200, {
      configured: !!(rec && rec.hash),
      algorithm: rec ? (rec.algorithm || 'pbkdf2-sha256') : null,
      storage: db.name,
      session: !!bearer(event),
      /* the username is not a secret, and the admin prefills the form with it */
      username: rec && rec.username ? rec.username : null,
    }));
  }

  if (verb !== 'POST') return out(json(405, { error: 'Use POST' }));

  const ip = (event.headers && (event.headers['x-forwarded-for'] || event.headers['client-ip'])) || 'local';
  const body = readBody(event);
  const action = body.action;
  const rec = await db.get(AUTH_KEY);

  if (action === 'setup') {
    if (rec && rec.hash) return out(json(409, { error: 'Already configured. Use "change" while signed in.' }));
    const username = cleanUsername(body.username);
    if (!username) {
      return out(json(400, { error: 'Username must be ' + MIN_USERNAME + '-' + MAX_USERNAME +
                                  ' characters, with no markup or control characters' }));
    }
    if (!body.password || String(body.password).length < MIN_LENGTH) {
      return out(json(400, { error: 'Password must be at least ' + MIN_LENGTH + ' characters' }));
    }
    const record = hashPassword(body.password);
    record.username = username;
    record.createdAt = Date.now();
    await db.put(AUTH_KEY, record);
    return out(json(200, { ok: true, token: issueToken(), username: username, storage: db.name }));
  }

  if (action === 'login') {
    if (!rec || !rec.hash) return out(json(409, { error: 'Not configured yet. Use action "setup" first.' }));
    if (tooMany('login:' + ip, 12, 10 * 60 * 1000)) {
      return out(json(429, { error: 'Too many attempts. Wait ten minutes.' }));
    }
    /* one message for both failures, so the endpoint cannot be used to
       discover which usernames exist */
    const sentUser = body.username === undefined || body.username === null
      ? rec.username : cleanUsername(body.username);
    if (sentUser !== rec.username || !verifyPassword(body.password || '', rec)) {
      return out(json(401, { error: 'Wrong username or password' }));
    }
    return out(json(200, { ok: true, token: issueToken() }));
  }

  if (action === 'change') {
    if (!bearer(event)) return out(json(401, { error: 'Sign in first' }));
    const sentUser = body.username === undefined || body.username === null
      ? rec.username : cleanUsername(body.username);
    if (sentUser !== rec.username || !verifyPassword(body.password || '', rec)) {
      return out(json(401, { error: 'Current username or password is wrong' }));
    }
    const nextUser = body.newUsername === undefined || body.newUsername === null
      ? rec.username : cleanUsername(body.newUsername);
    if (!nextUser) {
      return out(json(400, { error: 'New username must be ' + MIN_USERNAME + '-' + MAX_USERNAME + ' characters' }));
    }
    const nextPw = body.newPassword || body.password;
    if (!nextPw || String(nextPw).length < MIN_LENGTH) {
      return out(json(400, { error: 'New password must be at least ' + MIN_LENGTH + ' characters' }));
    }
    const record = hashPassword(nextPw);
    record.username = nextUser;
    record.createdAt = rec.createdAt || Date.now();
    record.changedAt = Date.now();
    await db.put(AUTH_KEY, record);
    return out(json(200, { ok: true, token: issueToken(), username: nextUser }));
  }

  return out(json(400, { error: 'Unknown action. Use setup, login or change.' }));
};

function cors(event) {
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}
function withCors(event, res) {
  res.headers = Object.assign({}, res.headers, cors(event));
  return res;
}
