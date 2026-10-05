/* ══════════════════════════════════════════════════════════════════════════
   cms-runtime.js — applies CMS content to the portfolio at load time.

   The page ships with all copy baked into the HTML, so it is complete with
   JavaScript disabled. This script is a progressive enhancement: when a
   published content payload exists it overlays it.

   Source precedence
     1. <script type="application/json" id="as-cms-content">   (baked export)
     2. ./content.json                                         (fetched, if served over http)
     3. nothing — the baked HTML stands as published

   Markers in the HTML
     data-cms="hero.statement"            element content, innerHTML
     data-cms-attr="href:works.items.0.href"   attribute <- value
     data-cms-list="works.items"          container re-rendered from a template
     <template data-cms-template>         the row markup, with {{key}} slots

   The main page script waits for window.__cmsReady before wiring scrollspy and
   the reveal observer, so both see the final DOM.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var KEY = 'as-cms-content';          /* published content   */
  var DKEY = 'as-cms-design';          /* published tokens    */
  var ATTR = 'data-cms-attr';
  var LIST = 'data-cms-list';

  /* ── tiny helpers ─────────────────────────────────────────────────────── */
  function get(obj, path) {
    return String(path).split('.').reduce(function (o, k) {
      return (o === null || o === undefined) ? undefined : o[k];
    }, obj);
  }
  function set(obj, path, value) {
    var parts = String(path).split('.');
    var last = parts.pop();
    var target = parts.reduce(function (o, k) {
      if (o[k] === null || typeof o[k] !== 'object') o[k] = /^\d+$/.test(k) ? [] : {};
      return o[k];
    }, obj);
    target[last] = value;
    return obj;
  }
  function deepMerge(base, over) {
    if (over === null || over === undefined) return base;
    if (Array.isArray(base) || Array.isArray(over)) {
      return over === undefined ? base : over;
    }
    if (typeof base !== 'object' || typeof over !== 'object') {
      return over === undefined ? base : over;
    }
    var out = {};
    Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    Object.keys(over).forEach(function (k) {
      out[k] = (k in base) ? deepMerge(base[k], over[k]) : over[k];
    });
    return out;
  }
  function readStore(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function escapeAttr(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ── where does content come from? ────────────────────────────────────── */
  function fromBakedTag() {
    var el = document.getElementById('as-cms-content');
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch (e) { return null; }
  }
  function bakedDesign() {
    var el = document.getElementById('as-cms-design');
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch (e) { return null; }
  }
  function fromFetch() {
    /* no fetch (file://, or an older engine) is not an error: the baked HTML stands */
    if (typeof fetch !== 'function') return Promise.resolve(null);
    if (location.protocol === 'file:') return Promise.resolve(null);
    return fetch('content.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function load() {
    var baked = fromBakedTag();
    var local = readStore(KEY);
    if (!baked && !local && typeof Promise !== 'function') return Promise.resolve({});
    if (baked || local) {
      return Promise.resolve({ content: baked || null, local: local, remote: null });
    }
    return fromFetch().then(function (remote) {
      return { content: null, local: local, remote: remote };
    });
  }

  /* ── design tokens ────────────────────────────────────────────────────── */
  function applyTokens(design, doc) {
    if (!design) return;
    var target = doc || document;
    /* Both modes are written as one <style> block rather than as inline styles on
       <html>. Inline styles do survive a "serialise the DOM" export, but they also
       outrank the [data-theme="dark"] rule — so dark mode would keep light tokens
       and an exported page would be unreadable after a theme flip. */
    var parts = [];
    ['light', 'dark'].forEach(function (mode) {
      var set2 = design[mode];
      if (!set2 || !Object.keys(set2).length) return;
      var css = Object.keys(set2).map(function (k) {
        return '--' + k.replace(/_/g, '-') + ':' + set2[k] + ';';
      }).join('');
      parts.push(mode === 'light' ? ':root{' + css + '}' : '[data-theme="dark"]{' + css + '}');
    });
    if (!parts.length) return;
    var id = 'as-cms-tokens';
    var style = target.getElementById(id) || target.createElement('style');
    style.id = id;
    style.setAttribute('data-cms', 'tokens');
    style.textContent = parts.join('\n');
    target.head.appendChild(style);
    var legacy = target.getElementById('as-cms-tokens-dark');
    if (legacy) legacy.remove();
  }

  /* ── simple (non-list) fields ─────────────────────────────────────────── */
  function applyFields(content, doc) {
    var n = 0;
    doc.querySelectorAll('[data-cms]').forEach(function (el) {
      if (el.closest('[' + LIST + ']')) return;          /* owned by a template */
      var v = get(content, el.getAttribute('data-cms'));
      if (v === undefined || v === null) return;
      el.innerHTML = String(v);
      n++;
    });
    doc.querySelectorAll('[' + ATTR + ']').forEach(function (el) {
      el.getAttribute(ATTR).split(';').forEach(function (pair) {
        var i = pair.indexOf(':');
        if (i < 0) return;
        var attr = pair.slice(0, i).trim();
        var v = get(content, pair.slice(i + 1).trim());
        if (v === undefined || v === null || v === '') return;
        if (attr === 'textContent') { el.textContent = String(v); return; }
        el.setAttribute(attr, String(v));
        n++;
      });
    });
    return n;
  }

  /* ── list rendering ───────────────────────────────────────────────────── */
  function fillTemplate(html, item, index) {
    /* {{#list}}row markup{{/list}} — repeat a fragment per array item, {{.}} = the item */
    html = html.replace(/\{\{#\s*([A-Za-z0-9_.]+)\s*\}\}([\s\S]*?)\{\{\/\s*\1\s*\}\}/g,
      function (_, key, row) {
        var arr = get(item, key);
        if (!Array.isArray(arr)) return '';
        return arr.map(function (v) {
          return row.replace(/\{\{\s*\.\s*\}\}/g, function () {
            return v === null || v === undefined ? '' : String(v);
          });
        }).join('');
      });
    return html.replace(/\{\{\s*([$A-Za-z0-9_.\[\]]+)\s*\}\}/g, function (_, key) {
      if (key === '$index') return String(index + 1);
      if (key === '$self') return item === null || typeof item !== 'object' ? String(item) : '';
      var v = key.indexOf('[') > -1
        ? key.replace(/\[(\d+)\]/g, '.$1').split('.').reduce(function (o, k) {
            return (o === null || o === undefined) ? undefined : o[k];
          }, item)
        : get(item, key);
      if (v === undefined || v === null) return '';
      if (typeof v === 'boolean') return v ? 'true' : 'false';
      if (typeof v === 'object') return JSON.stringify(v);
      return String(v);
    });
  }

  /* attributes whose placeholder must be escaped rather than injected as HTML */
  function renderList(container, items, doc) {
    var tpl = container.querySelector('template[' + 'data-cms-template' + ']');
    if (!tpl) return 0;
    var html = tpl.innerHTML;
    var frag = (doc || document).createDocumentFragment();
    (items || []).forEach(function (item, i) {
      var holder = (doc || document).createElement('div');
      holder.innerHTML = fillTemplate(html, item, i).trim();
      while (holder.firstChild) frag.appendChild(holder.firstChild);
    });
    /* keep the template, replace everything else */
    Array.prototype.slice.call(container.children).forEach(function (c) {
      if (c.tagName !== 'TEMPLATE') container.removeChild(c);
    });
    container.appendChild(frag);
    return (items || []).length;
  }

  /* A container may be named after the admin panel that edits it rather than
     where the data actually lives. projects.items is edited in its own panel
     but stored under works.items. */
  var LIST_ALIASES = { 'projects.items': 'works.items' };

  function applyLists(content, doc) {
    var rendered = 0;
    doc.querySelectorAll('[' + LIST + ']').forEach(function (container) {
      var path = container.getAttribute(LIST);
      var items = get(content, path);
      if (!Array.isArray(items) && LIST_ALIASES[path]) items = get(content, LIST_ALIASES[path]);
      if (!Array.isArray(items)) return;
      rendered += renderList(container, items, doc);
    });
    return rendered;
  }

  /* ── the works list needs one special case: conditional target ────────── */
  function postProcess(doc) {
    /* footer links: boolean "open in new tab" becomes target/rel */
    doc.querySelectorAll('[data-newtab]').forEach(function (a) {
      if (a.getAttribute('data-newtab') === 'true') {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener');
      }
      a.removeAttribute('data-newtab');
    });
    doc.querySelectorAll('a.work-card[data-open]').forEach(function (a) {
      if (a.getAttribute('data-open') === 'same-tab') a.removeAttribute('target');
      else a.setAttribute('target', '_blank');
      a.removeAttribute('data-open');
    });
    /* preview images replace the SVG when one is supplied */
    doc.querySelectorAll('.work-preview[data-image]').forEach(function (p) {
      var src = p.getAttribute('data-image');
      p.removeAttribute('data-image');
      if (!src) return;
      var svg = p.querySelector('svg');
      if (svg) svg.style.display = 'none';
      var img = (doc || document).createElement('img');
      img.src = src; img.alt = '';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;inset:0';
      p.appendChild(img);
    });
  }

  /* ── public API (the admin uses the same functions for live preview) ──── */
  window.ASCms = {
    apply: function (content, design, doc) {
      var target = doc || document;
      applyTokens(design, target);
      var a = applyFields(content, target);
      var b = applyLists(content, target);
      postProcess(target);
      return { fields: a, listItems: b };
    },
    applyTokens: applyTokens,
    fillTemplate: fillTemplate,
    get: get, set: set, deepMerge: deepMerge, escapeAttr: escapeAttr,
    KEYS: { content: KEY, design: DKEY },
  };

  /* ── live preview channel ─────────────────────────────────────────────
     admin.html posts the working draft here so the preview iframe updates as
     you type. Works cross-origin, which a direct contentWindow call would not. */
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.type !== 'as-cms-preview') return;
    var merged = deepMerge(window.SITE_CONTENT || {}, d.content || {});
    try { ASCms.apply(merged, d.design); } catch (err) { /* preview only */ }
  });

  /* ── boot ─────────────────────────────────────────────────────────────── */
  window.__cmsReady = load().then(function (res) {
    var content = res.local || res.remote || res.content;
    var design = readStore(DKEY) || bakedDesign();
    if (!content && !design) return { applied: false, reason: 'no published content' };
    var base = window.SITE_CONTENT || {};
    var merged = content ? deepMerge(base, content) : base;
    var stats = window.ASCms.apply(merged, design);
    document.documentElement.setAttribute('data-cms', content ? 'on' : 'tokens-only');
    return { applied: true, source: res.local ? 'local' : (res.remote ? 'content.json' : 'baked'), stats: stats };
  }).catch(function (err) {
    return { applied: false, reason: String(err && err.message || err) };
  });
})();
