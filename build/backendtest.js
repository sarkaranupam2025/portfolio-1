/* Backend test: drives the function handlers directly with fake events against the
   filesystem adapter in a temp directory. No network, no cloud account. */
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'as-cms-'));
process.env.CMS_DATA_DIR = tmp;
process.env.CMS_SESSION_SECRET = 'test-secret-do-not-use-in-production-0123456789';

const auth = require('../backend/auth.js');
const content = require('../backend/content.js');

const results = [];
const check = (name, ok, extra) => {
  results.push(!!ok);
  console.log(`   ${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
};
const body = (r) => JSON.parse(r.body || '{}');
const ev = (method, event) => Object.assign({
  httpMethod: method, headers: { origin: 'https://anupamsarkar.test' },
}, event);
const post = (b, headers) => auth.handler(ev('POST', { headers: headers || { origin: 'x' }, body: JSON.stringify(b) }));

const USER = 'asarkar57';
const PASS = 'correct-horse-battery';

(async () => {
  console.log('\n── GET /auth before setup ───────────────────────────────────────');
  let r = await auth.handler(ev('GET'));
  check('reports not configured', r.statusCode === 200 && body(r).configured === false, JSON.stringify(body(r)));
  check('names its storage adapter', /filesystem/.test(body(r).storage || ''), body(r).storage);
  check('CORS header on the success path', !!r.headers['Access-Control-Allow-Origin']);

  console.log('\n── setup ────────────────────────────────────────────────────────');
  r = await post({ action: 'setup', username: USER, password: 'short' });
  check('rejects a short password', r.statusCode === 400, body(r).error);
  check('CORS header on the error path too', !!r.headers['Access-Control-Allow-Origin']);

  r = await post({ action: 'setup', password: PASS });
  check('rejects a setup with no username', r.statusCode === 400, body(r).error);
  r = await post({ action: 'setup', username: 'ab', password: PASS });
  check('rejects a too-short username', r.statusCode === 400, body(r).error);
  r = await post({ action: 'setup', username: 'bad<>name', password: PASS });
  check('rejects markup in a username', r.statusCode === 400, body(r).error);
  r = await post({ action: 'setup', username: 'x'.repeat(80), password: PASS });
  check('rejects an over-long username', r.statusCode === 400);

  r = await post({ action: 'setup', username: USER, password: PASS });
  check('setup succeeds with a username', r.statusCode === 200 && body(r).ok === true && body(r).username === USER,
        JSON.stringify(body(r)).slice(0, 70));
  const token = body(r).token;
  check('issues a session token', typeof token === 'string' && token.split('.').length === 2);

  r = await post({ action: 'setup', username: 'attacker', password: 'attacker-password' });
  check('second setup refused (account cannot be claimed)', r.statusCode === 409, body(r).error);

  console.log('\n── login ────────────────────────────────────────────────────────');
  r = await post({ action: 'login', username: USER, password: 'wrong-password' });
  check('wrong password rejected', r.statusCode === 401);
  r = await post({ action: 'login', username: 'nobody', password: PASS });
  check('wrong username rejected with the right password', r.statusCode === 401, body(r).error);
  check('error does not reveal which half was wrong', body(r).error === 'Wrong username or password', body(r).error);
  r = await post({ action: 'login', username: 'ASARKAR57', password: PASS });
  check('username is case-sensitive', r.statusCode === 401);
  r = await post({ action: 'login', username: USER, password: PASS });
  check('correct credentials accepted', r.statusCode === 200 && !!body(r).token);

  r = await auth.handler(ev('GET'));
  check('GET /auth exposes the username but never the hash',
        body(r).username === USER && !JSON.stringify(body(r)).includes('hash'),
        JSON.stringify(body(r)).slice(0, 96));

  const stored = JSON.parse(fs.readFileSync(path.join(tmp, 'auth.json'), 'utf8'));
  check('password never stored in plaintext', !JSON.stringify(stored).includes(PASS),
        stored.algorithm + ' · ' + stored.iterations + ' iterations');
  check('salt is per-account and random', typeof stored.salt === 'string' && stored.salt.length === 32);
  check('PBKDF2 at the OWASP iteration floor', stored.iterations >= 210000, String(stored.iterations));

  console.log('\n── changing credentials ─────────────────────────────────────────');
  const authHdr = { authorization: 'Bearer ' + token, origin: 'https://anupamsarkar.test' };
  r = await post({ action: 'change', username: 'wrong', password: 'whatever', newPassword: 'a-stronger-passphrase' }, authHdr);
  check('change requires the current credentials', r.statusCode === 401, body(r).error);
  r = await post({ action: 'change', username: USER, password: PASS, newUsername: 'anupam', newPassword: 'a-stronger-passphrase' }, authHdr);
  check('username and password can be changed', r.statusCode === 200 && body(r).username === 'anupam', body(r).error || '');
  r = await post({ action: 'login', username: USER, password: PASS });
  check('old credentials stop working', r.statusCode === 401);
  r = await post({ action: 'login', username: 'anupam', password: 'a-stronger-passphrase' });
  check('new credentials work', r.statusCode === 200 && !!body(r).token);
  const liveToken = body(r).token;
  const liveHdr = { authorization: 'Bearer ' + liveToken, origin: 'https://anupamsarkar.test' };
  r = await post({ action: 'change', username: 'anupam', password: 'a-stronger-passphrase', newUsername: 'x' }, liveHdr);
  check('a too-short new username is rejected', r.statusCode === 400, body(r).error);

  console.log('\n── rate limiting ────────────────────────────────────────────────');
  let limited = null;
  for (let i = 0; i < 16; i++) {
    const rr = await auth.handler(ev('POST', {
      headers: { origin: 'x', 'x-forwarded-for': '203.0.113.9' },
      body: JSON.stringify({ action: 'login', username: 'anupam', password: 'nope' }),
    }));
    if (rr.statusCode === 429) { limited = i + 1; break; }
  }
  check('brute force is throttled', limited !== null && limited <= 14, 'blocked on attempt ' + limited);

  console.log('\n── token integrity ──────────────────────────────────────────────');
  const forged = liveToken.split('.')[0] + '.deadbeefdeadbeef';
  r = await content.handler(ev('PUT', { headers: { authorization: 'Bearer ' + forged },
    body: JSON.stringify({ which: 'draft', content: { hero: { h1First: 'Hacked' } } }) }));
  check('forged signature rejected', r.statusCode === 401, body(r).error);
  const tampered = Buffer.from(JSON.stringify({ sub: 'admin', exp: Date.now() + 99999 })).toString('base64url') +
                   '.' + liveToken.split('.')[1];
  r = await content.handler(ev('PUT', { headers: { authorization: 'Bearer ' + tampered },
    body: JSON.stringify({ which: 'draft', content: {} }) }));
  check('tampered payload rejected', r.statusCode === 401);
  const expired = Buffer.from(JSON.stringify({ sub: 'admin', exp: Date.now() - 1000 })).toString('base64url') +
                  '.' + liveToken.split('.')[1];
  r = await content.handler(ev('PUT', { headers: { authorization: 'Bearer ' + expired },
    body: JSON.stringify({ which: 'draft', content: {} }) }));
  check('expired session rejected', r.statusCode === 401);
  r = await content.handler(ev('PUT', { body: JSON.stringify({ which: 'draft', content: {} }) }));
  check('missing token rejected', r.statusCode === 401);

  console.log('\n── content write / read ─────────────────────────────────────────');
  const doc = { which: 'draft', content: { hero: { h1First: 'Anupam', statement: 'Edited' } },
                design: { light: { bg: '#ffffff' } }, cases: null };
  r = await content.handler(ev('PUT', { headers: liveHdr, body: JSON.stringify(doc) }));
  check('authenticated write accepted', r.statusCode === 200 && body(r).ok === true, JSON.stringify(body(r)).slice(0, 90));
  r = await content.handler(ev('GET', { headers: {}, queryStringParameters: { which: 'draft' } }));
  check('draft read without a token refused', r.statusCode === 401, body(r).error);
  r = await content.handler(ev('GET', { headers: liveHdr, queryStringParameters: { which: 'draft' } }));
  check('draft read with a token works', r.statusCode === 200 && body(r).content.hero.statement === 'Edited');
  r = await content.handler(ev('PUT', { headers: liveHdr,
    body: JSON.stringify({ which: 'published', content: { hero: { h1First: 'Live' } } }) }));
  check('publish write accepted', r.statusCode === 200);
  r = await content.handler(ev('GET', { headers: {}, queryStringParameters: { which: 'published' } }));
  check('published read is public (the live site needs it)',
        r.statusCode === 200 && body(r).content.hero.h1First === 'Live');
  r = await content.handler(ev('GET', { headers: {}, queryStringParameters: { which: 'published' } }));
  check('published response carries CORS', !!r.headers['Access-Control-Allow-Origin']);

  console.log('\n── input validation ─────────────────────────────────────────────');
  r = await content.handler(ev('PUT', { headers: liveHdr,
    body: JSON.stringify({ which: 'draft', content: { notASection: { x: 1 } } }) }));
  check('unknown content section rejected', r.statusCode === 400, body(r).error);
  r = await content.handler(ev('PUT', { headers: liveHdr,
    body: JSON.stringify({ which: 'draft', content: { hero: 'not-an-object' } }) }));
  check('malformed section rejected', r.statusCode === 400, body(r).error);
  r = await content.handler(ev('PUT', { headers: liveHdr,
    body: JSON.stringify({ which: 'nope', content: {} }) }));
  check('unknown bucket falls back to a safe one', r.statusCode === 200 && body(r).which !== 'nope',
        'wrote to ' + body(r).which);
  r = await content.handler(ev('PUT', { headers: liveHdr, body: 'not json at all' }));
  check('non-JSON body handled without crashing', r.statusCode === 400 || r.statusCode === 200, 'HTTP ' + r.statusCode);
  r = await content.handler(ev('PUT', { headers: liveHdr,
    body: JSON.stringify({ which: 'draft', content: { hero: { x: 'y'.repeat(7 * 1024 * 1024) } } }) }));
  check('oversized payload rejected', r.statusCode === 400, body(r).error);

  console.log('\n── delete + methods ─────────────────────────────────────────────');
  r = await content.handler(ev('DELETE', { headers: liveHdr, queryStringParameters: { which: 'draft' } }));
  check('draft cleared', r.statusCode === 200 && body(r).cleared === 'draft');
  r = await content.handler(ev('GET', { headers: liveHdr, queryStringParameters: { which: 'draft' } }));
  check('cleared draft reads back empty', r.statusCode === 200 && body(r).content === null);
  r = await content.handler(ev('DELETE', { headers: {}, queryStringParameters: { which: 'draft' } }));
  check('delete requires auth', r.statusCode === 401);
  r = await content.handler(ev('PATCH', { headers: liveHdr }));
  check('unsupported method refused', r.statusCode === 405);
  r = await auth.handler(ev('PUT', {}));
  check('auth refuses non-POST/GET', r.statusCode === 405);
  r = await auth.handler(ev('OPTIONS', {}));
  check('preflight answered', r.statusCode === 204 && !!r.headers['Access-Control-Allow-Headers']);

  fs.rmSync(tmp, { recursive: true, force: true });
  const failed = results.filter(x => !x).length;
  console.log('\n════ ' + (results.length - failed) + '/' + results.length + ' backend checks passed ════');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
