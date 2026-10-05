/* Verify the downloadable single-file builds.

   1. every embedded payload round-trips (base64 -> gunzip -> byte-identical file)
   2. the bundle UI exists and the card click handlers are wired
   3. the lightweight build has no payloads and keeps plain relative links
   4. neither build references the cms/ folder, which does not ship beside them
*/
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.dirname(__dirname);
const SITE = path.join(ROOT, 'site');
const OUT = path.join(ROOT, 'download');

const results = [];
const check = (n, ok, extra) => {
  results.push(!!ok);
  console.log(`   ${ok ? 'PASS' : 'FAIL'}  ${n}${extra ? '  — ' + extra : ''}`);
};
const NOISE = /Not implemented|Could not load|HTMLCanvasElement|getTotalLength|setTransform|css parsing/i;

const bundlePath = path.join(OUT, 'anupam-sarkar-portfolio-ALL-IN-ONE.html');
const lightPath = path.join(OUT, 'anupam-sarkar-portfolio.html');
if (!fs.existsSync(bundlePath) || !fs.existsSync(lightPath)) {
  console.error('downloads missing — run: python3 build/build_download.py');
  process.exit(2);
}
const bundle = fs.readFileSync(bundlePath, 'utf8');

console.log('\n── 1. embedded payloads round-trip ──────────────────────────────');
const tags = [...bundle.matchAll(/<script type="text\/plain" data-case='([^']*)'>([\s\S]*?)<\/script>/g)];
check('four payloads embedded', tags.length === 4, tags.length + ' found');
for (const [, metaRaw, data] of tags) {
  const meta = JSON.parse(metaRaw);
  const buf = zlib.gunzipSync(Buffer.from(data.trim(), 'base64'));
  const orig = fs.readFileSync(path.join(SITE, meta.file));
  check(meta.file + ' is byte-identical', buf.equals(orig) && buf.length === meta.bytes,
        (buf.length / 1024).toFixed(0) + ' KB unpacked from ' + (data.length / 1024).toFixed(0) + ' KB base64');
}
check('payload scripts are inert (type=text/plain)',
      tags.length === (bundle.match(/type="text\/plain" data-case=/g) || []).length);

console.log('\n── 2. bundle UI ─────────────────────────────────────────────────');
(async () => {
  const errs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => {
    const m = String(e.message || e).split('\n')[0].slice(0, 150);
    if (!NOISE.test(m)) errs.push(m);
  });
  const dom = new JSDOM(bundle, { runScripts: 'dangerously', pretendToBeVisual: true,
    url: 'file:///tmp/anupam-sarkar-portfolio-ALL-IN-ONE.html', virtualConsole: vc });
  await new Promise(r => setTimeout(r, 500));
  const doc = dom.window.document;

  const fab = doc.querySelector('.as-bundle-fab');
  check('floating badge rendered', !!fab, fab ? '"' + fab.textContent.replace(/\s+/g, ' ').trim() + '"' : '');
  check('overlay has a row per study', doc.querySelectorAll('.as-bundle-row').length === 4);
  check('Open buttons', doc.querySelectorAll('[data-open]').length === 4);
  check('Save .html buttons', doc.querySelectorAll('[data-save]').length === 4);
  fab.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  check('badge opens the overlay', doc.querySelector('.as-bundle').classList.contains('on'));
  doc.querySelector('.as-bundle-close').dispatchEvent(new dom.window.Event('click', { bubbles: true }));
  check('close button works', !doc.querySelector('.as-bundle').classList.contains('on'));

  const cards = [...doc.querySelectorAll('a.work-card')];
  check('four project cards', cards.length === 4);
  check('every card points at an embedded study',
        cards.every(c => fs.existsSync(path.join(SITE, c.getAttribute('href')))),
        cards.map(c => c.getAttribute('href')).join(', '));
  check('lede rewritten for the bundle', /embedded in this single file/.test(doc.querySelector('#works .lede').textContent));
  check('shelf note added', /Single-file build/.test(doc.body.textContent));
  check('no cms/ references (would 404 standalone)', !/src="cms\//.test(bundle));
  check('theme toggle works', (() => {
    const b = doc.getElementById('themeToggle');
    const before = doc.documentElement.getAttribute('data-theme');
    b.dispatchEvent(new dom.window.Event('click', { bubbles: true }));
    return before !== doc.documentElement.getAttribute('data-theme');
  })());
  check('no runtime errors', errs.length === 0, errs.slice(0, 3).join(' | ') || 'clean');
  dom.window.close();

  console.log('\n── 3. lightweight build ─────────────────────────────────────────');
  const light = fs.readFileSync(lightPath, 'utf8');
  check('size is small', light.length < 200 * 1024, (light.length / 1024).toFixed(0) + ' KB');
  check('no embedded payloads', (light.match(/data-case=/g) || []).length === 0);
  check('no bundle script', !light.includes('single-file bundle'));
  check('no cms/ references', !/src="cms\//.test(light));
  const d2 = new JSDOM(light, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://local.test/' });
  await new Promise(r => setTimeout(r, 350));
  const doc2 = d2.window.document;
  check('cards are plain relative links',
        [...doc2.querySelectorAll('a.work-card')].every(c => /^[a-z0-9-]+\.html$/.test(c.getAttribute('href'))));
  check('no floating badge', !doc2.querySelector('.as-bundle-fab'));
  check('theme toggle works', (() => {
    const b = doc2.getElementById('themeToggle');
    const before = doc2.documentElement.getAttribute('data-theme');
    b.dispatchEvent(new d2.window.Event('click', { bubbles: true }));
    return before !== doc2.documentElement.getAttribute('data-theme');
  })());
  d2.window.close();

  const failed = results.filter(x => !x).length;
  console.log('\n════ ' + (results.length - failed) + '/' + results.length + ' bundle checks passed ════');
  process.exit(failed ? 1 : 0);
})();
