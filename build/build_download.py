"""Produce the downloadable single-file builds of the portfolio.

  download/anupam-sarkar-portfolio.html
      Lightweight (~64 KB). The project cards are normal relative links, so the
      four case-study files must sit beside it.

  download/anupam-sarkar-portfolio-ALL-IN-ONE.html
      Self-contained (~3.4 MB). All four case studies are embedded, gzip+base64,
      inside <script type="text/plain"> payloads. Clicking a card inflates the
      study into a Blob and opens it in a new tab; if the popup is blocked it opens
      in an in-page reader instead. Nothing is fetched, nothing is remote.

Both are built from site/index.html with the cms/ script tags stripped, because
the cms folder does not ship beside a download. All copy is baked into the markup
anyway, so nothing is lost.
"""
import base64
import gzip
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')
OUT = os.path.join(ROOT, 'download')

CASES = [
    ('smart-mining-case-study.html', 'Smart Mining Management System'),
    ('falcon-view-case-study.html', 'Falcon View — Smart Hospital Management'),
    ('incident-management-case-study.html', 'Incident Management System — Microsoft Teams'),
    ('bt-billing-case-study.html', 'BT Business Billing — From the Notebook'),
]

CMS_TAGS = re.compile(r'\n?<script src="cms/(?:content|cms-runtime|admin)\.js"></script>', re.I)

BUNDLE_JS = r"""
<script>
/* ══════════ single-file bundle: open / download the embedded case studies ══════════ */
(function () {
  'use strict';

  var nodes = document.querySelectorAll('script[type="text/plain"][data-case]');
  if (!nodes.length) return;                       /* lightweight build: links stay links */

  var payloads = [];
  Array.prototype.forEach.call(nodes, function (n) {
    var meta = JSON.parse(n.getAttribute('data-case'));   /* file, title, bytes */
    meta.data = n.textContent.trim();                     /* the gzip+base64 body */
    payloads.push(meta);
  });
  var byFile = {};
  payloads.forEach(function (p) { byFile[p.file] = p; });

  /* ── inflate base64 -> gzip -> text ─────────────────────────────────── */
  function b64ToBytes(b64) {
    var bin = atob(b64), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function gunzip(bytes) {
    if (typeof DecompressionStream === 'function') {
      return new Response(new Blob([bytes]).stream().pipeThrough(
        new DecompressionStream('gzip'))).text();
    }
    return Promise.reject(new Error('This browser cannot unpack the embedded case studies.'));
  }
  var cache = {};
  function inflate(file) {
    if (cache[file]) return cache[file];
    cache[file] = gunzip(b64ToBytes(byFile[file].data));
    return cache[file];
  }
  function blobUrl(file) {
    return inflate(file).then(function (text) {
      return URL.createObjectURL(new Blob([text], { type: 'text/html;charset=utf-8' }));
    });
  }

  /* Open in a new tab; if the browser blocks the popup, read it here instead. */
  function openStudy(file, btn) {
    var label = btn ? btn.textContent : null;
    if (btn) btn.textContent = 'Opening\u2026';
    return blobUrl(file).then(function (url) {
      var w = window.open(url, '_blank');
      if (!w || w.closed || typeof w.closed === 'undefined') reader(url, file);
      return url;
    }).catch(function (err) {
      alert(err.message || 'Could not open the embedded case study.');
    }).then(function () {
      if (btn) btn.textContent = label;
    });
  }

  /* ── in-page reader: a full-viewport iframe over the portfolio ───────── */
  function reader(url, file) {
    var host = document.getElementById('asReader');
    if (!host) {
      host = document.createElement('div');
      host.id = 'asReader';
      host.innerHTML =
        '<div class="as-reader-bar"><span class="as-reader-name"></span>' +
        '<button type="button" class="as-reader-x" aria-label="Close">&times; Close</button></div>' +
        '<iframe title="Case study" referrerpolicy="no-referrer"></iframe>';
      document.body.appendChild(host);
      host.querySelector('.as-reader-x').addEventListener('click', closeReader);
    }
    host.querySelector('.as-reader-name').textContent = file;
    host.querySelector('iframe').src = url;
    host.classList.add('on');
    document.body.style.overflow = 'hidden';
  }
  function closeReader() {
    var host = document.getElementById('asReader');
    if (!host) return;
    host.classList.remove('on');
    host.querySelector('iframe').src = 'about:blank';
    document.body.style.overflow = '';
  }

  /* ── the project cards now open from the bundle ─────────────────────── */
  document.querySelectorAll('a.work-card').forEach(function (card) {
    var file = (card.getAttribute('href') || '').split('/').pop();
    if (!byFile[file]) return;
    card.addEventListener('click', function (e) {
      e.preventDefault();
      card.setAttribute('aria-busy', 'true');
      openStudy(file).then(function () { card.removeAttribute('aria-busy'); });
    });
  });

  /* ── bundle index overlay: save any study as its own .html ──────────── */
  var css = document.createElement('style');
  css.textContent = [
    '.as-bundle-fab{position:fixed;right:clamp(12px,2vw,22px);bottom:clamp(12px,2vw,22px);z-index:300;',
    '  display:flex;align-items:center;gap:9px;padding:.6rem 1rem;border-radius:50px;cursor:pointer;',
    '  font-size:.68rem;font-weight:500;text-transform:uppercase;letter-spacing:.11em;',
    '  color:var(--text);background:var(--card);border:1px solid var(--border);',
    '  box-shadow:0 10px 30px rgba(0,0,0,.14);transition:transform .3s var(--ease),border-color .3s}',
    '.as-bundle-fab:hover{transform:translateY(-2px);border-color:var(--border-strong)}',
    '.as-bundle-fab b{font-family:var(--font-mono);font-weight:500;letter-spacing:0}',
    '.as-bundle{position:fixed;inset:0;z-index:400;display:grid;place-items:center;padding:24px;',
    '  background:rgba(0,0,0,.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);',
    '  opacity:0;pointer-events:none;transition:opacity .3s}',
    '.as-bundle.on{opacity:1;pointer-events:auto}',
    '.as-bundle-panel{width:min(620px,100%);max-height:82vh;overflow:auto;background:var(--bg);',
    '  border:1px solid var(--border);padding:clamp(22px,3vw,34px)}',
    '.as-bundle-panel h3{font-size:1.5rem;margin-bottom:6px}',
    '.as-bundle-panel p{font-size:.9rem;color:var(--text-muted);margin-bottom:22px}',
    '.as-bundle-row{display:flex;align-items:center;gap:14px;justify-content:space-between;',
    '  padding:14px 0;border-top:1px solid var(--border);flex-wrap:wrap}',
    '.as-bundle-row strong{font-weight:400;font-size:1rem;display:block}',
    '.as-bundle-row span{font-family:var(--font-mono);font-size:.7rem;color:var(--text-faint)}',
    '.as-bundle-row div:last-child{display:flex;gap:8px}',
    '.as-bundle-row button{border:1px solid var(--border);border-radius:50px;padding:.4rem .85rem;',
    '  font-size:.66rem;font-weight:500;text-transform:uppercase;letter-spacing:.1em;cursor:pointer;',
    '  color:var(--text-muted);transition:all .25s}',
    '.as-bundle-row button:hover{background:var(--text);color:var(--bg);border-color:var(--text)}',
    '.as-bundle-close{margin-top:22px;width:100%;border:1px solid var(--border);border-radius:50px;',
    '  padding:.7rem;font-size:.7rem;font-weight:500;text-transform:uppercase;letter-spacing:.12em;',
    '  cursor:pointer;color:var(--text-muted)}',
    '.as-bundle-close:hover{background:var(--hover-bg);color:var(--text)}',
    '@media (max-width:560px){.as-bundle-row div:last-child{width:100%}.as-bundle-row button{flex:1}}',
    '#asReader{position:fixed;inset:0;z-index:500;display:none;flex-direction:column;background:var(--bg)}',
    '#asReader.on{display:flex}',
    '.as-reader-bar{display:flex;align-items:center;justify-content:space-between;gap:14px;',
    '  padding:10px clamp(12px,2vw,20px);border-bottom:1px solid var(--border);flex:none}',
    '.as-reader-name{font-family:var(--font-mono);font-size:.72rem;color:var(--text-muted)}',
    '.as-reader-x{border:1px solid var(--border);border-radius:50px;padding:.4rem .9rem;cursor:pointer;',
    '  font-size:.68rem;font-weight:500;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted)}',
    '.as-reader-x:hover{background:var(--text);color:var(--bg);border-color:var(--text)}',
    '#asReader iframe{flex:1;width:100%;border:0;background:#fff}'
  ].join('\n');
  document.head.appendChild(css);

  var totalKB = Math.round(payloads.reduce(function (a, p) { return a + p.bytes; }, 0) / 1024);

  var fab = document.createElement('button');
  fab.className = 'as-bundle-fab';
  fab.type = 'button';
  fab.innerHTML = 'All-in-one file <b>' + payloads.length + ' case studies &middot; ' +
                  (totalKB / 1024).toFixed(1) + ' MB</b>';
  document.body.appendChild(fab);

  var overlay = document.createElement('div');
  overlay.className = 'as-bundle';
  overlay.innerHTML =
    '<div class="as-bundle-panel" role="dialog" aria-modal="true" aria-label="Embedded case studies">' +
    '<h3>Everything is inside this one file</h3>' +
    '<p>The four case studies travel with this page \u2014 no server, no sibling files, no network. ' +
    'Open one in a new tab, or save it out as a standalone .html to share on its own.</p>' +
    payloads.map(function (p) {
      return '<div class="as-bundle-row"><div><strong>' + p.title + '</strong>' +
             '<span>' + p.file + ' &middot; ' + Math.round(p.bytes / 1024) + ' KB unpacked</span></div>' +
             '<div><button type="button" data-open="' + p.file + '">Open</button>' +
             '<button type="button" data-save="' + p.file + '">Save .html</button></div></div>';
    }).join('') +
    '<button type="button" class="as-bundle-close">Close</button></div>';
  document.body.appendChild(overlay);

  function setOpen(on) {
    overlay.classList.toggle('on', on);
    document.body.style.overflow = on ? 'hidden' : '';
    fab.setAttribute('aria-expanded', on ? 'true' : 'false');
  }
  fab.addEventListener('click', function () { setOpen(true); });
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay || e.target.classList.contains('as-bundle-close')) setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { setOpen(false); closeReader(); }
  });

  overlay.addEventListener('click', function (e) {
    var open = e.target.getAttribute && e.target.getAttribute('data-open');
    var save = e.target.getAttribute && e.target.getAttribute('data-save');
    if (open) { setOpen(false); openStudy(open, e.target); }
    if (save) {
      e.target.textContent = 'Saving\u2026';
      inflate(save).then(function (text) {
        var url = URL.createObjectURL(new Blob([text], { type: 'text/html;charset=utf-8' }));
        var a = document.createElement('a');
        a.href = url; a.download = save; document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 4000);
        e.target.textContent = 'Save .html';
      }).catch(function () { e.target.textContent = 'Save .html'; });
    }
  });

  var lede = document.querySelector('#works .lede');
  if (lede) {
    lede.innerHTML = 'Each case study is embedded in this single file \u2014 it opens in a new tab, ' +
      'works offline, and can be saved back out as its own .html. All four carry a dark/light ' +
      'switch in the top-right corner, and it remembers your choice across the site.';
  }
  var note = document.createElement('p');
  note.className = 'frame-note';
  note.innerHTML = 'Single-file build &mdash; ' + payloads.length + ' case studies embedded, ' +
                   (totalKB / 1024).toFixed(1) + ' MB unpacked. Nothing is loaded from the network.';
  var shelf = document.querySelector('#works .frame-note');
  if (shelf) shelf.parentNode.insertBefore(note, shelf);
})();
</script>
"""


def strip_cms(index):
    out, n = CMS_TAGS.subn('', index)
    print('   stripped %d cms script tag(s) for the standalone build' % n)
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    index = strip_cms(open(os.path.join(SITE, 'index.html'), encoding='utf-8').read())
    assert '</body>' in index
    assert 'cms/content.js' not in index, 'a cms script tag survived stripping'

    light_path = os.path.join(OUT, 'anupam-sarkar-portfolio.html')
    open(light_path, 'w', encoding='utf-8').write(index)

    payloads = []
    for fname, title in CASES:
        raw = open(os.path.join(SITE, fname), 'rb').read()
        payloads.append({
            'file': fname, 'title': title, 'bytes': len(raw),
            'data': base64.b64encode(gzip.compress(raw, 9)).decode('ascii'),
        })

    tags = ['\n<!-- ══ embedded case studies (gzip + base64) ══ -->']
    for p in payloads:
        meta = {k: p[k] for k in ('file', 'title', 'bytes')}
        tags.append('<script type="text/plain" data-case=\'%s\'>%s</script>'
                    % (json.dumps(meta), p['data']))
    bundle = index.replace('</body>', '\n'.join(tags) + BUNDLE_JS + '</body>', 1)

    bundle_path = os.path.join(OUT, 'anupam-sarkar-portfolio-ALL-IN-ONE.html')
    open(bundle_path, 'w', encoding='utf-8').write(bundle)

    for path in (light_path, bundle_path):
        print('%-52s %6.2f MB' % (os.path.basename(path), os.path.getsize(path) / 1048576))


if __name__ == '__main__':
    main()
