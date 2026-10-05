/* End-to-end proof for the all-in-one bundle: click a card and confirm the blob
   that opens in the new tab is byte-identical to the case study on disk.

   jsdom implements neither DecompressionStream nor URL.createObjectURL, so both
   are supplied from Node — they are the same Web APIs a browser provides, so the
   shipped code path runs unchanged. */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.dirname(__dirname);
const SITE = path.join(ROOT, 'site');
const bundlePath = path.join(ROOT, 'download', 'anupam-sarkar-portfolio-ALL-IN-ONE.html');
const bundle = fs.readFileSync(bundlePath, 'utf8');

const results = [];
const check = (n, ok, extra) => {
  results.push(!!ok);
  console.log(`   ${ok ? 'PASS' : 'FAIL'}  ${n}${extra ? '  — ' + extra : ''}`);
};

/* the decode chain, copied verbatim from the shipped bundle script */
function b64ToBytes(b64) {
  const bin = atob(b64), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const gunzip = (bytes) => new Response(
  new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();

const payloadOf = (file) => {
  const esc = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = bundle.match(new RegExp(
    '<script type="text/plain" data-case=\'[^\']*"file":\\s*"' + esc + '"[^\']*\'>([\\s\\S]*?)</script>'));
  return m ? m[1].trim() : null;
};

(async () => {
  console.log('\n── 1. decode chain, native Web APIs ─────────────────────────────');
  check('DecompressionStream available in this engine', typeof DecompressionStream === 'function');
  const files = ['smart-mining-case-study.html', 'falcon-view-case-study.html',
                 'incident-management-case-study.html', 'bt-billing-case-study.html'];
  for (const f of files) {
    const text = await gunzip(b64ToBytes(payloadOf(f)));
    check('decodes to ' + f, text === fs.readFileSync(path.join(SITE, f), 'utf8'),
          (Buffer.byteLength(text) / 1024).toFixed(0) + ' KB');
  }

  console.log('\n── 2. clicking a card opens the real study ──────────────────────');
  const errs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => {
    const m = String(e.message || e).split('\n')[0].slice(0, 150);
    if (!/Not implemented|Could not load|css parsing/i.test(m)) errs.push(m);
  });
  const dom = new JSDOM(bundle, { runScripts: 'dangerously', pretendToBeVisual: true,
    url: 'file:///tmp/anupam-sarkar-portfolio-ALL-IN-ONE.html', virtualConsole: vc });
  const win = dom.window;
  win.DecompressionStream = DecompressionStream;
  win.Blob = Blob;
  win.Response = Response;
  win.atob = atob;
  const store = new Map();
  win.URL.createObjectURL = (b) => { const u = 'blob:local/' + store.size; store.set(u, b); return u; };
  win.URL.revokeObjectURL = (u) => store.delete(u);
  const readBlob = async (u) => await store.get(u).text();

  let opened = null;
  win.open = (u) => { opened = u; return { closed: false }; };
  await new Promise(r => setTimeout(r, 450));

  for (const card of [...win.document.querySelectorAll('a.work-card')]) {
    const file = card.getAttribute('href');
    opened = null;
    const ev = new win.MouseEvent('click', { bubbles: true, cancelable: true });
    card.dispatchEvent(ev);
    await new Promise(r => setTimeout(r, 1300));
    const back = opened ? await readBlob(opened) : null;
    check('card -> new tab: ' + file,
          ev.defaultPrevented && !!opened && back === fs.readFileSync(path.join(SITE, file), 'utf8') &&
          !card.hasAttribute('aria-busy'),
          opened ? (back.length / 1024).toFixed(0) + ' KB, identical' : 'no blob produced');
  }

  console.log('\n── 3. popup blocked -> in-page reader ───────────────────────────');
  win.open = () => null;
  const card = win.document.querySelectorAll('a.work-card')[1];
  card.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
  await new Promise(r => setTimeout(r, 1400));
  const readerEl = win.document.getElementById('asReader');
  const frame = readerEl && readerEl.querySelector('iframe');
  const src = frame ? frame.getAttribute('src') : null;
  const want = fs.readFileSync(path.join(SITE, card.getAttribute('href')), 'utf8');
  check('reader opens with the study loaded',
        !!readerEl && readerEl.classList.contains('on') && !!src && (await readBlob(src)) === want);
  readerEl.querySelector('.as-reader-x').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  check('reader closes and clears the iframe',
        !readerEl.classList.contains('on') && frame.getAttribute('src') === 'about:blank');

  console.log('\n── 4. saving a study back out ───────────────────────────────────');
  let anchor = null;
  const origAppend = win.document.body.appendChild.bind(win.document.body);
  win.document.body.appendChild = (el) => { if (el.tagName === 'A' && el.download) anchor = el; return origAppend(el); };
  win.HTMLAnchorElement.prototype.click = function () {};
  win.document.querySelector('.as-bundle-fab').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  win.document.querySelector('[data-save="bt-billing-case-study.html"]')
     .dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 1800));
  check('downloads a standalone .html',
        !!anchor && anchor.download === 'bt-billing-case-study.html' &&
        (await readBlob(anchor.href)) === fs.readFileSync(path.join(SITE, 'bt-billing-case-study.html'), 'utf8'),
        anchor ? anchor.download : 'no download produced');

  check('no runtime errors', errs.length === 0, errs.slice(0, 3).join(' | ') || 'clean');
  win.close();

  const failed = results.filter(x => !x).length;
  console.log('\n════ ' + (results.length - failed) + '/' + results.length + ' bundle e2e checks passed ════');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
