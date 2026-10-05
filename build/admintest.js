/* Functional test for cms/admin.html.

   Runs the real admin in jsdom: signs in with the seeded credentials, walks every
   panel, edits a field, reorders a list, saves a draft, publishes, checks the
   revision and both exports. */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.dirname(__dirname);
const CMS = path.join(ROOT, 'cms');

const inline = (f) => '<script>' + fs.readFileSync(path.join(CMS, f), 'utf8') + '</script>';
let html = fs.readFileSync(path.join(CMS, 'admin.html'), 'utf8')
  .replace('<script src="content.js"></script>', inline('content.js'))
  .replace('<script src="admin.js"></script>', inline('admin.js'));
if (/src="(admin|content)\.js"/.test(html)) throw new Error('could not inline the admin scripts');

const results = [];
const check = (name, ok, extra) => {
  results.push(!!ok);
  console.log(`   ${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
};
/* jsdom implements neither Window.scrollTo nor the canvas/SVG geometry APIs */
const NOISE = /Not implemented|Could not load|HTMLCanvasElement|getTotalLength|setTransform|css parsing/i;

(async () => {
  const errs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => {
    const m = String(e.message || e).split('\n')[0].slice(0, 170);
    if (!NOISE.test(m)) errs.push(m);
  });
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true,
    url: 'https://local.test/cms/admin.html',       /* secure context -> WebCrypto */
    virtualConsole: vc,
  });
  const win = dom.window;
  win.fetch = () => Promise.reject(new Error('offline in test'));
  win.scrollTo = () => {};
  win.HTMLAnchorElement.prototype.click = function () { win.__lastDownload = this.download; };
  win.URL.createObjectURL = () => 'blob:stub';
  win.URL.revokeObjectURL = () => {};

  const doc = win.document;
  const $ = (s, r) => (r || doc).querySelector(s);
  const $$ = (s, r) => [...(r || doc).querySelectorAll(s)];
  const click = (el) => el.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
  const type = (el, v) => {
    el.value = v;
    el.dispatchEvent(new win.Event('input', { bubbles: true }));
    el.dispatchEvent(new win.Event('change', { bubbles: true }));
  };
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const submit = () => $('#gateForm').dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));

  console.log('\n── gate ─────────────────────────────────────────────────────────');
  await wait(500);
  const CREDS = win.ASCmsAdmin.DEFAULT_CREDENTIALS;
  check('gate visible on load', !$('#gate').classList.contains('hide'));
  check('credentials seeded on first run', !$('#gateLogin').hidden && $('#gateSetup').hidden, $('#gateTitle').textContent);
  check('username prefilled', $('#loginUser').value === CREDS.username, $('#loginUser').value);
  check('both username and password fields present', !!$('#loginUser') && !!$('#loginPw'));
  check('an honest security warning is shown',
        /not access control|Insecure context/i.test($('#gateNote').textContent));

  type($('#loginPw'), 'wrong-password');
  submit(); await wait(300);
  check('wrong password rejected', /Wrong username or password/i.test($('#gateMsg').textContent), $('#gateMsg').textContent);
  check('still locked out', !$('#app').classList.contains('on'));

  type($('#loginUser'), CREDS.username);
  type($('#loginPw'), CREDS.password);
  submit(); await wait(900);
  check('seeded credentials sign in', $('#gate').classList.contains('hide') && $('#app').classList.contains('on'));
  const rec = JSON.parse(win.localStorage.getItem('as-cms-auth') || '{}');
  check('password stored as salt+hash, never plaintext',
        !!rec.salt && !!rec.hash && !JSON.stringify(rec).includes(CREDS.password), 'weak=' + !!rec.weak);
  check('top bar shows the signed-in user', /asarkar57/.test($('#backendLabel').textContent), $('#backendLabel').textContent);

  const Admin = win.ASCmsAdmin;

  console.log('\n── chrome ───────────────────────────────────────────────────────');
  check('sidebar built', $$('#side .side-link').length === 15, $$('#side .side-link').length + ' links');
  check('panels grouped', $$('#side .side-group').length === 3);
  check('placeholder panels flagged', $$('#side .side-link.flagged').length > 0,
        $$('#side .side-link.flagged').map(b => b.dataset.panel).join(','));
  check('starts on a content panel', $$('#main .panel.on').length === 1);
  check('backend label reports local storage', /this browser/.test($('#backendLabel').textContent));

  console.log('\n── editing ──────────────────────────────────────────────────────');
  Admin.go('hero'); await wait(80);
  check('hero fields rendered', $$('#main .field').length >= 6, $$('#main .field').length + ' fields');
  const eyebrow = $$('#main .field input[type=text]')[0];
  type(eyebrow, 'Edited eyebrow'); await wait(80);
  check('edit marks the state dirty', $('#stateText').textContent === 'Unsaved changes');
  check('edit reaches the model', Admin.State.content.hero.eyebrowLeft === 'Edited eyebrow');
  check('rich field renders as an editor', !!$('#main .rt-area[contenteditable]'));
  check('rich toolbar present', $$('#main .rt-bar button').length >= 6, $$('#main .rt-bar button').length + ' buttons');
  check('rich Source toggle present', $$('#main .rt-bar button').some(b => /Source/.test(b.textContent)));

  Admin.go('experience'); await wait(80);
  check('experience lists 5 roles', $$('#main .item').length === 5, $$('#main .item').length + ' items');
  const first = $$('#main .item')[0].querySelector('.name').textContent;
  click($$('#main .item')[0].querySelectorAll('.icon-btn')[1]);   /* move down */
  await wait(80);
  check('reorder moved the item', $$('#main .item')[1].querySelector('.name').textContent === first,
        'now first: ' + $$('#main .item')[0].querySelector('.name').textContent);
  click($$('#main .item')[0].querySelectorAll('.icon-btn')[0]);   /* move back up */
  await wait(80);

  Admin.go('projects'); await wait(80);
  check('project cards panel lists 4', $$('#main .item').length === 4, $$('#main .item').length + ' cards');
  check('tag chip editor present', $$('#main .state-pill').length >= 3, $$('#main .state-pill').length + ' chips');

  Admin.go('ai'); await wait(80);
  check('AI practices lists every repeatable', $$('#main .item').length >= 14,
        $$('#main .item').length + ' items (5 stages + 3 keys + 6 practices + 3 guardrails)');

  console.log('\n── every panel renders clean ────────────────────────────────────');
  for (const id of ['hero', 'philosophy', 'experience', 'works', 'projects', 'ai', 'contact',
                    'header', 'meta', 'design', 'cases', 'media', 'publish', 'revisions', 'settings']) {
    const before = errs.length;
    Admin.go(id); await wait(80);
    const ok = $$('#main .panel.on').length === 1 && $('#main').textContent.length > 40 && errs.length === before;
    check('panel: ' + id.padEnd(11), ok,
          ok ? $('#main').textContent.length + ' chars' : (errs[before] || 'did not render'));
  }

  console.log('\n── design system ────────────────────────────────────────────────');
  Admin.go('design'); await wait(100);
  check('token editors rendered', $$('#main .token').length >= 20, $$('#main .token').length + ' tokens');
  check('colour pickers present', $$('#main input[type=color]').length >= 12);
  check('contrast badges computed', $$('#main .contrast').length >= 12, $$('#main .contrast').length + ' badges');
  check('contrast verdicts are labelled', $$('#main .contrast').some(b => /AA|fails/.test(b.textContent)));
  type($('#main input[type=color]'), '#123456'); await wait(60);
  check('editing a token updates the model', Object.values(Admin.State.design.light).includes('#123456'));

  console.log('\n── case palettes ────────────────────────────────────────────────');
  Admin.go('cases'); await wait(100);
  check('four case studies listed', $$('#main .card').length >= 4, $$('#main .card').length + ' cards');
  check('dark+light swatch pairs', $$('#main .token .sw').length >= 40, $$('#main .token .sw').length + ' swatches');
  check('per-case export buttons', $$('#main .btn-sm').length >= 4);

  console.log('\n── save, publish, revisions ─────────────────────────────────────');
  click($('#btnSave')); await wait(250);
  check('draft saved to localStorage', !!win.localStorage.getItem('as-cms-draft'));
  check('state returns to Saved', $('#stateText').textContent === 'Saved', $('#stateText').textContent);
  const draft = JSON.parse(win.localStorage.getItem('as-cms-draft'));
  check('draft stores a diff, not the whole model',
        !!(draft && draft.hero && draft.hero.eyebrowLeft === 'Edited eyebrow' && !draft.philosophy),
        'changed keys=' + JSON.stringify(Object.keys(draft || {})) + ' · ' + JSON.stringify(draft).length +
        ' bytes vs ' + JSON.stringify(Admin.State.content).length + ' full');
  check('design diff stored separately', win.localStorage.getItem('as-cms-draft-design') !== null);

  click($('#btnPublish')); await wait(150);
  check('publish modal opens', $('#modal').classList.contains('on'));
  check('publish modal offers both export modes',
        /content\.json/.test($('#modalCard').textContent) && /baked/i.test($('#modalCard').textContent));
  check('publish modal warns about placeholders', /placeholder/i.test($('#modalCard').textContent));
  click($$('#modalCard button').find(b => /^1 ·/.test(b.textContent)));
  await wait(450);
  check('published content written', !!win.localStorage.getItem('as-cms-content'));
  check('revision snapshot taken', JSON.parse(win.localStorage.getItem('as-cms-revisions') || '[]').length === 1);
  check('modal closed after publishing', !$('#modal').classList.contains('on'));

  Admin.go('revisions'); await wait(250);
  check('revision listed', $$('#main table.rows tbody tr').length === 1);
  check('revision actions offered', $$('#main table.rows .btn-sm').length >= 3);

  console.log('\n── exports ──────────────────────────────────────────────────────');
  Admin.go('publish'); await wait(150);
  click($$('#main .btn-sm').find(b => /content\.json/.test(b.textContent))); await wait(250);
  check('content.json downloadable', win.__lastDownload === 'content.json', String(win.__lastDownload));
  Admin.go('cases'); await wait(150);
  click($$('#main .btn-sm').find(b => /Export CSS/.test(b.textContent))); await wait(250);
  check('palette patch downloadable', /^palette-.*\.css$/.test(String(win.__lastDownload)), String(win.__lastDownload));

  console.log('\n── settings ─────────────────────────────────────────────────────');
  Admin.go('settings'); await wait(200);
  const accountCard = $$('#main .card').find(c => /Admin account/.test(($('header h2', c) || {}).textContent || ''));
  check('account card present', !!accountCard);
  check('four credential fields', $$('input', accountCard).length === 4,
        $$('input', accountCard).map(i => i.placeholder).join(' | '));
  check('still-on-defaults warning shown', /seeded default credentials/i.test(accountCard.textContent));
  check('diagnostics report the signed-in user', /asarkar57/.test($('#main').textContent));

  console.log('\n── theme ────────────────────────────────────────────────────────');
  click($('#btnTheme')); await wait(80);
  check('admin theme toggles', doc.documentElement.getAttribute('data-theme') === 'dark');
  check('theme choice persisted', JSON.parse(win.localStorage.getItem('as-cms-admin-theme')) === 'dark');

  console.log('\n── errors ───────────────────────────────────────────────────────');
  check('no runtime errors', errs.length === 0, errs.slice(0, 4).join(' | ') || 'clean');

  const failed = results.filter(x => !x).length;
  console.log('\n════ ' + (results.length - failed) + '/' + results.length + ' admin checks passed ════');
  win.close();
  process.exit(failed ? 1 : 0);
})();
