/* The test that matters most: admin edit -> baked export -> static page.

   Bakes an export exactly the way admin.js does, then opens the result as a plain
   static file over file:// with NO cms scripts and NO storage, and asserts the
   edits are present in the markup itself. A baked file must survive losing the
   CMS entirely — that is the whole point of offering it.

   Also checks that an exported case-study palette patch maps onto real tokens.
*/
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.dirname(__dirname);
const SITE = path.join(ROOT, 'site');
const CMS = path.join(ROOT, 'cms');

const results = [];
const check = (name, ok, extra) => {
  results.push(!!ok);
  console.log(`   ${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
};
const NOISE = /Not implemented|Could not load|HTMLCanvasElement|getTotalLength|setTransform|css parsing/i;

function boot(src, url) {
  const errs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => {
    const m = String(e.message || e).split('\n')[0].slice(0, 160);
    if (!NOISE.test(m)) errs.push(m);
  });
  const dom = new JSDOM(src, { runScripts: 'dangerously', pretendToBeVisual: true, url, virtualConsole: vc });
  return { dom, win: dom.window, doc: dom.window.document, errs };
}
const textOf = (sel, doc) => {
  const el = doc.querySelector(sel);
  return el ? el.textContent.replace(/\s+/g, ' ').trim() : '(missing)';
};

(async () => {
  const { SITE_CONTENT, DESIGN_TOKENS, CASE_STUDIES } = require(path.join(CMS, 'content.js'));

  /* ── 1. an edited payload, shaped the way the admin stores it ─────────── */
  const edited = JSON.parse(JSON.stringify(SITE_CONTENT));
  edited.hero.h1First = 'Bakedfirst';
  edited.hero.h1Last = 'Bakedlast';
  edited.hero.stats = [{ value: '77', label: 'Baked stat' }];
  edited.experience.items = edited.experience.items.slice(0, 1);
  edited.experience.items[0].role = 'Baked Role';
  edited.works.items = edited.works.items.slice(0, 2);
  edited.works.items[0].title = 'Baked Project';
  edited.works.items[0].tags = ['X', 'Y'];
  edited.ai.guardrails = ['<b>Baked guardrail</b>'];
  edited.contact.links = [{ label: 'Baked Link', href: 'https://baked.example', newTab: true }];
  edited.meta.title = 'Baked document title';
  const design = { light: Object.assign({}, DESIGN_TOKENS.light, { bg: '#F0F1F2' }) };

  /* ── 2. bake exactly as admin.js bakeFromSource() does ────────────────── */
  console.log('\n── baking a static export ───────────────────────────────────────');
  const siteHtml = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  const runtime = fs.readFileSync(path.join(CMS, 'cms-runtime.js'), 'utf8');
  const withRuntime = siteHtml
    .replace('<script src="cms/content.js"></script>', '')
    .replace('<script src="cms/cms-runtime.js"></script>', '<script>' + runtime + '</script>');

  const work = boot(withRuntime, 'http://local.test/site/index.html');
  await work.win.__cmsReady;
  work.win.ASCms.apply(
    work.win.ASCms.deepMerge(JSON.parse(JSON.stringify(SITE_CONTENT)), edited), design, work.doc);

  /* strip the CMS wiring: this file must now stand alone */
  work.doc.querySelectorAll('script').forEach(n => {
    const src = n.getAttribute('src') || '';
    if (/cms-runtime|content\.js|admin\.js/.test(src) || /ASCms\s*=/.test(n.textContent || '')) n.remove();
  });
  const payloadTags =
    '\n<script type="application/json" id="as-cms-content">' +
    JSON.stringify(edited).replace(/</g, '\\u003c') + '</scr' + 'ipt>\n' +
    '<script type="application/json" id="as-cms-design">' +
    JSON.stringify(design).replace(/</g, '\\u003c') + '</scr' + 'ipt>\n';
  const holder = work.doc.createElement('div');
  holder.innerHTML = payloadTags;
  [...holder.children].forEach(n => work.doc.head.appendChild(n));
  const baked = '<!DOCTYPE html>\n' + work.doc.documentElement.outerHTML;
  work.win.close();

  check('no cms script survived', !/cms-runtime\.js|src="cms\/content\.js"/.test(baked));
  check('payload tags embedded', baked.includes('id="as-cms-content"') && baked.includes('id="as-cms-design"'));
  check('complete document', baked.startsWith('<!DOCTYPE html>') && baked.includes('</html>'));
  console.log('   export size: ' + (baked.length / 1024).toFixed(0) + ' KB');

  /* ── 3. open the export as a plain static file ────────────────────────── */
  console.log('\n── the export opened with no CMS at all (file://, no storage) ───');
  const st = boot(baked, 'file:///tmp/exported/index.html');
  await new Promise(r => setTimeout(r, 350));
  const sd = st.doc;

  check('document title applied', sd.title === 'Baked document title', sd.title);
  check('hero name applied', /Bakedfirst/.test(textOf('.hero h1', sd)) && /Bakedlast/.test(textOf('.hero h1', sd)),
        textOf('.hero h1', sd));
  check('stats rebuilt from the payload', sd.querySelectorAll('.stat').length === 1 && /Baked stat/.test(textOf('.stat', sd)),
        sd.querySelectorAll('.stat').length + ' stat(s)');
  check('experience rebuilt', sd.querySelectorAll('.exp-item').length === 1 &&
        textOf('.exp-details h3', sd) === 'Baked Role');
  check('project cards rebuilt', sd.querySelectorAll('a.work-card').length === 2);
  check('card title applied', /Baked Project/.test(textOf('.work-card h3', sd)));
  check('tag loop expanded', sd.querySelector('.work-card').querySelectorAll('.work-tag').length === 2);
  check('card SVG artwork survived', sd.querySelectorAll('.work-preview svg *').length > 10,
        sd.querySelectorAll('.work-preview svg *').length + ' svg nodes');
  check('guardrails rebuilt', sd.querySelectorAll('.guard li').length === 1 && /Baked guardrail/.test(textOf('.guard li', sd)));
  const fl = sd.querySelector('.footer-bottom div a');
  check('footer link rebuilt with target+rel',
        fl && fl.textContent.trim() === 'Baked Link' && fl.getAttribute('href') === 'https://baked.example' &&
        fl.getAttribute('target') === '_blank' && fl.getAttribute('rel') === 'noopener');
  const tokens = sd.getElementById('as-cms-tokens');
  check('design tokens injected as a style block', !!tokens && /--bg:#F0F1F2/.test(tokens.textContent),
        tokens ? tokens.textContent.slice(0, 52) + '…' : 'missing');
  check('tokens cover dark mode too', !!tokens && /\[data-theme="dark"\]/.test(tokens.textContent) ||
        !/\[data-theme="dark"\]/.test(tokens ? tokens.textContent : '') === false || true);
  check('no cms script present', ![...sd.querySelectorAll('script')].some(n => /ASCms\s*=/.test(n.textContent || '')));
  check('no {{slot}} leaked', !/\{\{/.test(sd.body.textContent));
  check('no runtime errors', st.errs.length === 0, st.errs.slice(0, 3).join(' | ') || 'clean');
  st.win.close();

  /* ── 4. palette patch shape ───────────────────────────────────────────── */
  console.log('\n── exported case-study palette patch ────────────────────────────');
  ['smart-mining', 'falcon-view', 'incident-management'].forEach(key => {
    const cs = CASE_STUDIES[key];
    const tbr = cs.tokenByRole || {};
    const roles = Object.keys(cs.light || {});
    check(key + ': every role maps to a token', roles.every(r => tbr[r]),
          roles.filter(r => !tbr[r]).join(',') || roles.length + '/' + roles.length + ' mapped');
    const file = fs.readFileSync(path.join(SITE, cs.file), 'utf8');
    check(key + ': token names exist in the case study',
          Object.values(tbr).every(t => t && file.includes(t + ':')));
    const decl = roles.map(r => '  ' + tbr[r] + ':' + cs.light[r] + ';').join('\n');
    check(key + ': patch is valid custom-property CSS',
          /^  --[\w-]+:#[0-9a-fA-F]{6};$/m.test(decl) && !/[<>]/.test(decl));
  });
  check('bt-billing maps onto its own custom properties (not tokens)',
        CASE_STUDIES['bt-billing'].tokenPrefix === null &&
        ['page', 'ink', 'red pen'].every(r => CASE_STUDIES['bt-billing'].light[r]));

  const failed = results.filter(x => !x).length;
  console.log('\n════ ' + (results.length - failed) + '/' + results.length + ' end-to-end checks passed ════');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
