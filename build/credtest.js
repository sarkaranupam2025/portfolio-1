/* The credential lifecycle: seeded defaults -> sign in -> change username and
   password -> the old pair stops working -> the new pair works.

   jsdom has no crypto.subtle, so it is backed with Node's here: that exercises the
   real SHA-256 path rather than the insecure-context fallback. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.dirname(__dirname);
const CMS = path.join(ROOT, 'cms');
const inline = (f) => '<script>' + fs.readFileSync(path.join(CMS, f), 'utf8') + '</script>';
const html = fs.readFileSync(path.join(CMS, 'admin.html'), 'utf8')
  .replace('<script src="content.js"></script>', inline('content.js'))
  .replace('<script src="admin.js"></script>', inline('admin.js'));

const results = [];
const check = (n, ok, extra) => {
  results.push(!!ok);
  console.log(`   ${ok ? 'PASS' : 'FAIL'}  ${n}${extra ? '  — ' + extra : ''}`);
};
const NOISE = /Not implemented|Could not load|css parsing/i;

(async () => {
  const errs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => {
    const m = String(e.message || e).split('\n')[0].slice(0, 150);
    if (!NOISE.test(m)) errs.push(m);
  });

  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true,
    url: 'https://local.test/cms/admin.html', virtualConsole: vc,
    beforeParse(w) {
      w.crypto = w.crypto || {};
      w.crypto.subtle = {
        digest: async (alg, data) => new Uint8Array(
          crypto.createHash(String(alg).toLowerCase().replace('-', '')).update(Buffer.from(data)).digest()),
      };
      w.crypto.getRandomValues = (a) => { a.set(crypto.randomBytes(a.length)); return a; };
      w.TextEncoder = TextEncoder;   /* jsdom does not expose it globally */
    },
  });
  const win = dom.window, doc = win.document;
  win.fetch = () => Promise.reject(new Error('offline'));
  win.scrollTo = () => {};
  const $ = (s, r) => (r || doc).querySelector(s);
  const $$ = (s, r) => [...(r || doc).querySelectorAll(s)];
  const type = (el, v) => { el.value = v; el.dispatchEvent(new win.Event('input', { bubbles: true })); };
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const submit = () => $('#gateForm').dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
  const record = () => JSON.parse(win.localStorage.getItem('as-cms-auth') || '{}');

  await wait(500);
  const A = () => win.ASCmsAdmin;
  const CREDS = A().DEFAULT_CREDENTIALS;

  console.log('\n── seeded defaults, real SHA-256 ────────────────────────────────');
  check('the brief\'s credentials are the seeded ones',
        CREDS.username === 'asarkar57' && CREDS.password === '123!@#Aps',
        CREDS.username + ' / ' + CREDS.password.length + ' chars');
  check('WebCrypto path active (not the weak fallback)', record().weak === false, 'weak=' + record().weak);
  check('not running in the degraded last-resort mode', record().degraded !== true);
  check('hash is 64 hex chars (SHA-256)', /^[0-9a-f]{64}$/.test(record().hash || ''),
        String(record().hash).slice(0, 20) + '…');
  check('salt is 32 hex chars and random', /^[0-9a-f]{32}$/.test(record().salt || ''), record().salt);
  check('username stored for comparison', record().username === CREDS.username);
  check('plaintext password absent from storage', !JSON.stringify(record()).includes(CREDS.password));

  type($('#loginUser'), CREDS.username);
  type($('#loginPw'), 'not-the-password');
  submit(); await wait(400);
  check('wrong password rejected', !$('#app').classList.contains('on'), $('#gateMsg').textContent);
  type($('#loginUser'), 'someone-else');
  type($('#loginPw'), CREDS.password);
  submit(); await wait(400);
  check('wrong username rejected with the right password', !$('#app').classList.contains('on'));
  type($('#loginUser'), 'ASARKAR57');
  type($('#loginPw'), CREDS.password);
  submit(); await wait(400);
  check('username is case-sensitive', !$('#app').classList.contains('on'));

  type($('#loginUser'), CREDS.username);
  type($('#loginPw'), CREDS.password);
  submit(); await wait(900);
  check('seeded credentials sign in', $('#app').classList.contains('on'));

  console.log('\n── changing username and password ───────────────────────────────');
  A().go('settings'); await wait(250);
  const accountCard = $$('#main .card').find(c => /Admin account/.test(($('header h2', c) || {}).textContent || ''));
  check('account card found', !!accountCard);
  const inputs = $$('input', accountCard);
  const [userNow, pw1, userNew, pw2] = inputs;
  check('four credential fields', inputs.length === 4,
        inputs.map(i => i.placeholder).join(' | '));
  check('current username prefilled', userNow.value === CREDS.username, userNow.value);
  check('still-on-defaults warning shown', /seeded default credentials/i.test(accountCard.textContent));

  const before = record();
  type(userNow, CREDS.username);
  type(pw1, CREDS.password);
  type(userNew, 'anupam.sarkar');
  type(pw2, 'a-much-stronger-passphrase');
  click($$('.btn-primary', accountCard).find(b => /Update credentials/.test(b.textContent)));
  await wait(800);

  function click(el) { el.dispatchEvent(new win.MouseEvent('click', { bubbles: true })); }
  const after = record();
  check('username changed', after.username === 'anupam.sarkar', after.username);
  check('no longer flagged as seeded', after.seeded === false);
  check('new password hashed, not stored', !JSON.stringify(after).includes('a-much-stronger-passphrase'));
  check('hash rotated with the password', after.hash !== before.hash);
  check('salt rotated', after.salt !== before.salt && /^[0-9a-f]{32}$/.test(after.salt));

  console.log('\n── the old pair must stop working ───────────────────────────────');
  /* btnLock drops the session then reloads; jsdom does not implement reload, so do
     the same two things and re-run the gate init that a reload would */
  A().Store.logout();
  $('#app').classList.remove('on');
  $('#gate').classList.remove('hide');
  await A().Gate.init();
  await wait(300);
  check('session cleared and gate shown again',
        !$('#app').classList.contains('on') && !win.localStorage.getItem('as-cms-session'));
  check('login form now prefills the NEW username', $('#loginUser').value === 'anupam.sarkar', $('#loginUser').value);

  type($('#loginUser'), CREDS.username);
  type($('#loginPw'), CREDS.password);
  submit(); await wait(400);
  check('old username + old password rejected', !$('#app').classList.contains('on'), $('#gateMsg').textContent);
  type($('#loginUser'), 'anupam.sarkar');
  type($('#loginPw'), CREDS.password);
  submit(); await wait(400);
  check('new username + old password rejected', !$('#app').classList.contains('on'));
  type($('#loginUser'), 'anupam.sarkar');
  type($('#loginPw'), 'a-much-stronger-passphrase');
  submit(); await wait(900);
  check('new credentials sign in', $('#app').classList.contains('on'));

  A().go('settings'); await wait(250);
  const card2 = $$('#main .card').find(c => /Admin account/.test(($('header h2', c) || {}).textContent || ''));
  check('account card now reports custom credentials',
        /custom credentials/.test($('header .state-pill', card2).textContent),
        $('header .state-pill', card2).textContent.trim());
  check('the defaults warning is gone', !/still on the/i.test(card2.textContent));

  console.log('\n── errors ───────────────────────────────────────────────────────');
  check('no runtime errors', errs.length === 0, errs.slice(0, 3).join(' | ') || 'clean');

  const failed = results.filter(x => !x).length;
  console.log('\n════ ' + (results.length - failed) + '/' + results.length + ' credential checks passed ════');
  win.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
