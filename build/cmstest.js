/* Verify site/index.html against the CMS runtime.

   Mode A  nothing published: the runtime must stand aside and the baked HTML must
           render exactly as authored (correct counts, no template leakage).
   Mode B  published content in localStorage: the runtime must re-render every list
           from its template and overlay every field, with no {{slots}} left.

   Scripts are inlined because jsdom will not fetch relative <script src>. */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.dirname(__dirname);
const SITE = path.join(ROOT, 'site');
const CMS = path.join(ROOT, 'cms');

const indexSrc = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
const contentJs = fs.readFileSync(path.join(CMS, 'content.js'), 'utf8');
const runtimeJs = fs.readFileSync(path.join(CMS, 'cms-runtime.js'), 'utf8');

const page = indexSrc
  .replace('<script src="cms/content.js"></script>', '<script>' + contentJs + '</script>')
  .replace('<script src="cms/cms-runtime.js"></script>', '<script>' + runtimeJs + '</script>');
if (page === indexSrc) throw new Error('could not inline the cms scripts — have the paths changed?');

const results = [];
const check = (name, ok, extra) => {
  results.push(!!ok);
  console.log(`   ${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
};

/* textContent of the document, ignoring inert <template> contents */
const textOf = (node) => {
  const c = (node.body || node).cloneNode(true);
  c.querySelectorAll('script,style,template').forEach(n => n.remove());
  return (c.textContent || '').replace(/\s+/g, ' ').trim();
};

async function boot(label, seed) {
  const errs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => {
    const m = String(e.message || e).split('\n')[0].slice(0, 160);
    if (!/Not implemented|Could not load|css parsing/i.test(m)) errs.push(m);
  });
  const dom = new JSDOM(page, {
    runScripts: 'dangerously', pretendToBeVisual: true,
    url: 'http://local.test/index.html', virtualConsole: vc,
    beforeParse(w) { if (seed) Object.keys(seed).forEach(k => w.localStorage.setItem(k, seed[k])); },
  });
  const ready = await dom.window.__cmsReady;
  await new Promise(r => setTimeout(r, 200));
  console.log(`\n=== ${label}`);
  console.log('   __cmsReady:', JSON.stringify(ready));
  check('no runtime errors', errs.length === 0, errs.slice(0, 3).join(' | ') || 'clean');
  return dom;
}

(async () => {
  /* ── Mode A ───────────────────────────────────────────────────────────── */
  const a = await boot('Mode A — nothing published (baked HTML only)', null);
  const da = a.window.document;
  check('runtime stood aside', da.documentElement.getAttribute('data-cms') === null);
  check('project cards intact', da.querySelectorAll('a.work-card').length === 4,
        da.querySelectorAll('a.work-card').length + ' cards');
  check('experience rows intact', da.querySelectorAll('.exp-item').length === 5);
  check('tenets intact', da.querySelectorAll('.tenet').length === 3);
  check('pipeline stages intact', da.querySelectorAll('.stage').length === 5);
  check('practice cards intact', da.querySelectorAll('.practice').length === 6);
  check('footer links intact', da.querySelectorAll('.footer-bottom div a').length === 3);
  check('templates present but inert', da.querySelectorAll('template[data-cms-template]').length === 10,
        da.querySelectorAll('template[data-cms-template]').length + ' templates');
  check('no {{slot}} visible', !/\{\{/.test(da.body.textContent));
  check('card artwork rendered', da.querySelectorAll('.work-preview svg *').length > 100,
        da.querySelectorAll('.work-preview svg *').length + ' svg nodes');

  /* the mockup anatomy, as baked */
  check('card title is not duplicated', !/Management System Management System/.test(textOf(da)),
        textOf(da.querySelector('.work-card h3')));
  check('badge on the plate', da.querySelectorAll('.work-preview .badge').length === 4);
  check('four accent dots per plate', da.querySelectorAll('.work-dots i').length === 16,
        da.querySelectorAll('.work-dots').length + ' rows');
  check('meta, description and outcome hidden by default',
        da.querySelectorAll('.work-meta.is-off').length === 4 &&
        da.querySelectorAll('.work-prob.is-off').length === 4 &&
        da.querySelectorAll('.work-out.is-off').length === 4);
  check('tags and call to action show by default',
        da.querySelectorAll('.work-tag').length >= 6 && da.querySelectorAll('.work-cta').length === 4);
  const textA = textOf(da);
  a.window.close();

  /* ── Mode B ───────────────────────────────────────────────────────────── */
  const { SITE_CONTENT } = require(path.join(CMS, 'content.js'));
  const edited = JSON.parse(JSON.stringify(SITE_CONTENT));
  edited.hero.h1First = 'Testfirst';
  edited.hero.h1Last = 'Testlast';
  edited.hero.stats = [{ value: '99', label: 'Edited stat' }];
  edited.experience.items = edited.experience.items.slice(0, 2);
  edited.experience.items[0].role = 'Edited Role';
  edited.works.items[0].title = 'Edited Project';
  edited.works.items[0].tags = ['One', 'Two', 'Three', 'Four'];
  edited.works.items[0].openIn = 'same-tab';
  /* flip this card's visible fields: dots off, meta and description on, outcome off */
  edited.works.items[0].fields = { badge: true, dots: false, meta: true,
                                   problem: true, outcome: false, tags: true, cta: true };
  edited.works.items = edited.works.items.slice(0, 3);
  edited.ai.guardrails = ['<b>Only one guardrail now</b>'];
  edited.contact.links = [{ label: 'Edited Link', href: 'https://example.com', newTab: true }];
  edited.meta.title = 'Edited document title';

  const b = await boot('Mode B — published content applied', { 'as-cms-content': JSON.stringify(edited) });
  const db = b.window.document;
  check('runtime reports applied', db.documentElement.getAttribute('data-cms') === 'on');
  check('document title applied', db.title === 'Edited document title', db.title);
  check('hero name applied', /Testfirst/.test(textOf(db.querySelector('.hero h1'))) &&
        /Testlast/.test(textOf(db.querySelector('.hero h1'))), textOf(db.querySelector('.hero h1')));
  check('stats re-rendered', db.querySelectorAll('.stat').length === 1,
        db.querySelectorAll('.stat').length + ' stat(s)');
  check('experience list rebuilt', db.querySelectorAll('.exp-item').length === 2);
  check('first role applied', textOf(db.querySelector('.exp-details h3')) === 'Edited Role');
  check('project cards rebuilt (projects.items -> works.items alias)',
        db.querySelectorAll('a.work-card').length === 3,
        db.querySelectorAll('a.work-card').length + ' cards');
  check('card title applied', /Edited Project/.test(textOf(db.querySelector('.work-card h3'))));
  const tags = [...db.querySelectorAll('.work-card')][0].querySelectorAll('.work-tag');
  check('{{#tags}} loop expanded', tags.length === 4, tags.length + ' tags');
  check('openIn=same-tab honoured', !db.querySelector('a.work-card').hasAttribute('target'));

  /* per-card field visibility, driven by the payload */
  const c0 = db.querySelector('a.work-card');
  check('field toggle: description switched on', !!c0.querySelector('.work-prob'));
  check('field toggle: meta line switched on', !!c0.querySelector('.work-meta'));
  check('field toggle: accent dots switched off', !c0.querySelector('.work-dots'));
  check('field toggle: outcome stays off', !c0.querySelector('.work-out'));
  check('field toggle: title always renders', /Edited Project/.test(textOf(c0.querySelector('h3'))),
        textOf(c0.querySelector('h3')));
  check('field toggle is per card', !!db.querySelectorAll('a.work-card')[1].querySelector('.work-dots'));
  check('guardrails rebuilt', db.querySelectorAll('.guard li').length === 1);
  const fl = db.querySelector('.footer-bottom div a');
  check('footer link rebuilt with target+rel',
        fl.textContent.trim() === 'Edited Link' && fl.getAttribute('href') === 'https://example.com' &&
        fl.getAttribute('target') === '_blank' && fl.getAttribute('rel') === 'noopener');
  check('card artwork survived the rebuild', db.querySelectorAll('.work-preview svg *').length > 50,
        db.querySelectorAll('.work-preview svg *').length + ' svg nodes');
  check('no {{slot}} visible', !/\{\{/.test(db.body.textContent));
  check('baked fallbacks replaced, not duplicated',
        db.querySelectorAll('.exp-item').length === 2 && db.querySelectorAll('.stage').length === 5);
  check('text actually changed', textOf(db) !== textA,
        textA.length + ' -> ' + textOf(db).length + ' chars');
  b.window.close();

  const failed = results.filter(x => !x).length;
  console.log('\n════ ' + (results.length - failed) + '/' + results.length + ' runtime checks passed ════');
  process.exit(failed ? 1 : 0);
})();
