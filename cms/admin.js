/* ══════════════════════════════════════════════════════════════════════════
   admin.js — the CMS front end.

   Storage is behind one adapter, so this file works identically against:
     • localStorage  (default: nothing to install, edits stay in this browser)
     • an HTTP API   (set CONFIG.backendUrl: real auth, edits shared by everyone)
   Swapping backends touches CONFIG and nothing else — see backend/README.md.

   Everything is driven by SCHEMA in content.js: add a field there and it appears
   in the admin, in validation and in the export at the same time.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── configuration ─────────────────────────────────────────────────────── */
  var CONFIG = {
    backendUrl: null,               /* e.g. '/.netlify/functions' — null = local only */
    sitePath: '../site/index.html', /* what the live preview loads */
    maxRevisions: 24,
    maxImageKB: 400,                /* warn above this: data URIs bloat the page */
    allowRemoteImages: false,       /* keep false unless you accept remote hotlinks */
  };
  var K = {
    auth: 'as-cms-auth', draft: 'as-cms-draft', draftDesign: 'as-cms-draft-design',
    draftCases: 'as-cms-draft-cases', revs: 'as-cms-revisions',
    published: 'as-cms-content', publishedDesign: 'as-cms-design',
    theme: 'as-cms-admin-theme', session: 'as-cms-session',
  };

  /* ── tiny DOM helpers ──────────────────────────────────────────────────── */
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    (Array.isArray(kids) ? kids : kids === undefined || kids === null ? [] : [kids])
      .forEach(function (c) {
        if (c === null || c === undefined || c === false) return;
        el.appendChild(typeof c === 'string' || typeof c === 'number'
          ? document.createTextNode(String(c)) : c);
      });
    return el;
  }
  function clear(el) { while (el && el.firstChild) el.removeChild(el.firstChild); return el; }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ── path access + merge ───────────────────────────────────────────────
     Mirrored from cms-runtime.js on purpose: the admin must not depend on the
     site's runtime being loaded, and both sides must agree on merge semantics
     or a draft saved here would render differently on the page. */
  function getPath(obj, path) {
    return String(path).split('.').reduce(function (o, k) {
      return (o === null || o === undefined) ? undefined : o[k];
    }, obj);
  }
  function setPath(obj, path, value) {
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
    if (Array.isArray(base) || Array.isArray(over)) return over === undefined ? base : over;
    if (typeof base !== 'object' || typeof over !== 'object') return over === undefined ? base : over;
    var out = {};
    Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    Object.keys(over).forEach(function (k) {
      out[k] = (k in base) ? deepMerge(base[k], over[k]) : over[k];
    });
    return out;
  }
  var ASCms = { get: getPath, set: setPath, deepMerge: deepMerge };

  /* ── toasts & modal ────────────────────────────────────────────────────── */
  function toast(msg, kind) {
    var t = h('div', { class: 'toast' + (kind ? ' ' + kind : ''), text: msg });
    qs('#toasts').appendChild(t);
    requestAnimationFrame(function () { t.classList.add('on'); });
    setTimeout(function () {
      t.classList.remove('on');
      setTimeout(function () { t.remove(); }, 320);
    }, kind === 'err' ? 5200 : 2800);
  }
  var modalEl = qs('#modal'), modalCard = qs('#modalCard');
  function modal(title, bodyNodes, actions) {
    clear(modalCard);
    modalCard.appendChild(h('h2', { text: title }));
    (Array.isArray(bodyNodes) ? bodyNodes : [bodyNodes]).forEach(function (n) {
      if (n) modalCard.appendChild(n);
    });
    var row = h('div', { class: 'btn-row', style: { justifyContent: 'flex-end' } });
    (actions || []).forEach(function (a) {
      row.appendChild(h('button', {
        class: 'btn' + (a.kind ? ' ' + a.kind : ''), text: a.label,
        onclick: function () { if (!a.keepOpen) closeModal(); if (a.onClick) a.onClick(); },
      }));
    });
    modalCard.appendChild(row);
    modalEl.classList.add('on');
  }
  function closeModal() { modalEl.classList.remove('on'); }
  modalEl.addEventListener('click', function (e) { if (e.target === modalEl) closeModal(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modalEl.classList.contains('on')) closeModal();
  });

  /* ── storage adapter ───────────────────────────────────────────────────── */
  function lsGet(key, fallback) {
    try { var v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
    catch (e) { return fallback; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { toast('Could not save — browser storage is full or blocked.', 'err'); return false; }
  }
  function lsDel(key) { try { localStorage.removeItem(key); } catch (e) {} }

  function api(path, opts) {
    var session = lsGet(K.session, null);
    return fetch(CONFIG.backendUrl.replace(/\/$/, '') + path, {
      method: (opts && opts.method) || 'GET',
      headers: Object.assign({ 'Content-Type': 'application/json' },
        session ? { Authorization: 'Bearer ' + session.token } : {},
        (opts && opts.headers) || {}),
      body: opts && opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.error || ('HTTP ' + r.status)); e.status = r.status; throw e; }
        return j;
      });
    });
  }

  var Store = {
    get remote() { return !!CONFIG.backendUrl; },
    label: function () { return CONFIG.backendUrl ? 'server' : 'this browser'; },

    /* one predicate for both backends: has an admin password been set? */
    configured: function () {
      if (CONFIG.backendUrl) {
        return api('/auth').then(function (r) { return !!r.configured; }).catch(function () { return false; });
      }
      var rec = lsGet(K.auth, null);
      return Promise.resolve(!!(rec && rec.hash));
    },
    loadAuth: function () {
      return CONFIG.backendUrl
        ? api('/auth').then(function (r) { return r; }).catch(function () { return null; })
        : Promise.resolve(lsGet(K.auth, null));
    },
    changePassword: function (current, next, username, nextUsername) {
      if (CONFIG.backendUrl) {
        return api('/auth', { method: 'POST', body: { action: 'change',
          password: current, newPassword: next, username: username, newUsername: nextUsername } });
      }
      return Auth.verify(current, username).then(function (ok) {
        if (!ok) throw new Error('Current username or password is wrong');
        return Store.setup(next, nextUsername);
      });
    },
    /* On first run, seed the credentials from DEFAULT_CREDENTIALS so the panel is
       usable straight away. Returns true if it seeded. */
    seed: function () {
      if (CONFIG.backendUrl) return Promise.resolve(false);
      if (lsGet(K.auth, null)) return Promise.resolve(false);
      return Auth.hash(DEFAULT_CREDENTIALS.password).then(function (rec) {
        rec.username = DEFAULT_CREDENTIALS.username;
        rec.seeded = true;
        rec.createdAt = Date.now();
        lsSet(K.auth, rec);
        return true;
      }).catch(function (err) {
        /* last resort: an unhashed marker record, so the gate still opens and the
           admin is never bricked. Flagged, and the login screen says so. */
        lsSet(K.auth, { username: DEFAULT_CREDENTIALS.username, hash: Auth.weakHash(DEFAULT_CREDENTIALS.password),
                        salt: 'none', weak: true, degraded: true, seeded: true,
                        error: String(err && err.message || err), createdAt: Date.now() });
        return true;
      });
    },
    setup: function (password, username) {
      if (CONFIG.backendUrl) {
        return api('/auth', { method: 'POST',
          body: { action: 'setup', password: password, username: username } });
      }
      return Auth.hash(password).then(function (rec) {
        rec.username = username || DEFAULT_CREDENTIALS.username;
        rec.seeded = false;
        rec.createdAt = Date.now();
        lsSet(K.auth, rec);
        return rec;
      });
    },
    login: function (password, username) {
      if (CONFIG.backendUrl) {
        return api('/auth', { method: 'POST',
          body: { action: 'login', password: password, username: username } })
          .then(function (r) { lsSet(K.session, { token: r.token }); return r; });
      }
      return Auth.verify(password, username).then(function (ok) {
        if (!ok) throw new Error('Wrong username or password');
        lsSet(K.session, { local: true, at: Date.now(), user: username });
        return { ok: true };
      });
    },
    logout: function () { lsDel(K.session); },
    session: function () { return lsGet(K.session, null); },

    /* content + design + case palettes, as one document */
    load: function (which) {
      var local = {
        draft: { content: lsGet(K.draft, null), design: lsGet(K.draftDesign, null), cases: lsGet(K.draftCases, null) },
        published: { content: lsGet(K.published, null), design: lsGet(K.publishedDesign, null), cases: null },
      };
      if (!CONFIG.backendUrl) return Promise.resolve(local[which] || local.draft);
      return api('/content?which=' + which).then(function (r) {
        return { content: r.content || null, design: r.design || null, cases: r.cases || null };
      }).catch(function () { return local[which] || local.draft; });
    },
    save: function (which, doc) {
      if (!CONFIG.backendUrl) {
        var ok = true;
        if (which === 'draft') {
          ok = lsSet(K.draft, doc.content) && ok;
          ok = lsSet(K.draftDesign, doc.design) && ok;
          ok = lsSet(K.draftCases, doc.cases) && ok;
        } else {
          ok = lsSet(K.published, doc.content) && ok;
          ok = lsSet(K.publishedDesign, doc.design) && ok;
        }
        return Promise.resolve(ok ? { ok: true } : { ok: false });
      }
      return api('/content', { method: 'PUT', body: { which: which, content: doc.content, design: doc.design, cases: doc.cases } });
    },
    revisions: function () { return Promise.resolve(lsGet(K.revs, [])); },
    pushRevision: function (rev) {
      return Store.revisions().then(function (list) {
        list.unshift(rev);
        /* keep the newest N, and never let the archive exceed ~4 MB */
        list = list.slice(0, CONFIG.maxRevisions);
        var bytes = JSON.stringify(list).length;
        while (bytes > 4 * 1024 * 1024 && list.length > 3) { list.pop(); bytes = JSON.stringify(list).length; }
        lsSet(K.revs, list);
        return list;
      });
    },
  };

  /* ── credentials ─────────────────────────────────────────────────────────
     These are seeded on first run so the panel is usable immediately, and they
     are shown on the login screen until they are changed.

     Be clear about what that buys you: with no backend, the admin is a static
     file anyone can download, so these credentials keep out casual visitors and
     prevent accidental edits — they are not access control. Deploy backend/ and
     set CONFIG.backendUrl for a password that is actually verified somewhere.  */
  var DEFAULT_CREDENTIALS = { username: 'asarkar57', password: '123!@#Aps' };

  /* ── password hashing (WebCrypto, salted SHA-256) ──────────────────────── */
  var Auth = {
    available: function () { return !!(window.crypto && crypto.subtle && crypto.subtle.digest); },
    /* UTF-8 bytes without relying on a global TextEncoder, which is missing in
       some embedded webviews and older engines. */
    utf8: function (str) {
      var bin = unescape(encodeURIComponent(String(str)));
      var out = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xff;
      return out;
    },
    randomSalt: function () {
      var a = new Uint8Array(16);
      if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
      else for (var i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256);
      return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    },
    hash: function (password, salt) {
      salt = salt || Auth.randomSalt();
      if (!Auth.available()) {
        /* no WebCrypto (insecure context): fall back to a plain digest so the
           admin still works, and say so loudly in the UI */
        return Promise.resolve({ salt: salt, hash: Auth.weakHash(salt + ':' + password), weak: true });
      }
      return crypto.subtle.digest('SHA-256', Auth.utf8(salt + ':' + password))
        .then(function (buf) {
          return {
            salt: salt, weak: false,
            hash: Array.prototype.map.call(new Uint8Array(buf),
              function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''),
          };
        })
        .catch(function () {
          /* digest refused (some insecure contexts): degrade rather than lock
             the admin out, and label the record so the UI can warn */
          return { salt: salt, hash: Auth.weakHash(salt + ':' + password), weak: true };
        });
    },
    verify: function (password, username) {
      var rec = lsGet(K.auth, null);
      if (!rec) return Promise.resolve(false);
      /* the username is checked first and case-sensitively; it is not a secret,
         but a wrong one should not reach the hash comparison */
      if (rec.username !== undefined && username !== undefined && rec.username !== username) {
        return Promise.resolve(false);
      }
      return Auth.hash(password, rec.salt).then(function (out) { return out.hash === rec.hash; });
    },
    /* the stored username, for prefilling the login form (not a secret) */
    username: function () {
      var rec = lsGet(K.auth, null);
      return rec && rec.username ? rec.username : '';
    },
    weakHash: function (s) {           /* FNV-1a, clearly labelled as not security */
      var hsh = 0x811c9dc5;
      for (var i = 0; i < s.length; i++) { hsh ^= s.charCodeAt(i); hsh = (hsh * 0x01000193) >>> 0; }
      return 'weak-' + hsh.toString(16);
    },
  };

  /* ── colour helpers (contrast checking in the design panel) ────────────── */
  function hexToRgb(hex) {
    hex = String(hex).replace('#', '').trim();
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  function relLum(rgb) {
    var a = rgb.map(function (v) {
      v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  function contrast(fg, bg) {
    var a = hexToRgb(fg), b = hexToRgb(bg);
    if (!a || !b) return null;
    var l1 = relLum(a), l2 = relLum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
  function contrastBadge(fg, bg, label) {
    var r = contrast(fg, bg);
    if (r === null) return h('span', { class: 'contrast', text: label || '—' });
    var cls = r >= 4.5 ? 'pass' : r >= 3 ? 'warn' : 'fail';
    var tag = r >= 4.5 ? 'AA' : r >= 3 ? 'AA large' : 'fails';
    return h('span', { class: 'contrast ' + cls, text: r.toFixed(2) + ':1 · ' + tag,
      title: (label || fg) + ' on ' + bg });
  }

  /* ── download helper ───────────────────────────────────────────────────── */
  function download(filename, text, mime) {
    var blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = h('a', { href: url, download: filename });
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 3000);
    toast('Downloaded ' + filename, 'ok');
  }
  function readFile(file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(fr.result); };
      fr.onerror = function () { rej(fr.error); };
      fr.readAsText(file);
    });
  }
  function readDataUrl(file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(fr.result); };
      fr.onerror = function () { rej(fr.error); };
      fr.readAsDataURL(file);
    });
  }
  function bytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(0) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
  }
  function when(ts) {
    var d = new Date(ts);
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) + ' ' +
           d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  /* ══════════════════════════════════════════════════════════════════════
     STATE
     ══════════════════════════════════════════════════════════════════════ */
  var State = {
    content: null, design: null, cases: null,
    baseline: null,            /* what is published right now, for the dirty check */
    dirty: false, activePanel: 'hero', previewOn: true, previewDoc: null,
  };

  function defaults() {
    return {
      content: clone(window.SITE_CONTENT),
      design: clone(window.DESIGN_TOKENS),
      cases: clone(window.CASE_STUDIES),
    };
  }
  function mergeState(saved) {
    var d = defaults();
    if (saved && saved.content) d.content = ASCms.deepMerge(d.content, saved.content);
    if (saved && saved.design) d.design = ASCms.deepMerge(d.design, saved.design);
    if (saved && saved.cases) d.cases = ASCms.deepMerge(d.cases, saved.cases);
    return d;
  }
  function markDirty() {
    State.dirty = JSON.stringify(currentDoc()) !== JSON.stringify(State.baseline);
    paintState();
  }
  function currentDoc() {
    return { content: State.content, design: State.design, cases: State.cases };
  }
  function paintState() {
    var pill = qs('#statePill'), text = qs('#stateText');
    pill.className = 'state-pill' + (State.dirty ? ' dirty' : ' saved');
    text.textContent = State.dirty ? 'Unsaved changes' : 'Saved';
  }

  /* push the draft into the preview iframe */
  var previewTimer = null;
  function refreshPreview() {
    if (!State.previewOn) return;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(function () {
      var frame = qs('#previewFrame');
      if (!frame || !frame.contentWindow) return;
      try {
        frame.contentWindow.postMessage({
          type: 'as-cms-preview',
          content: State.content, design: State.design,
        }, '*');
      } catch (e) { /* frame not ready yet */ }
    }, 220);
  }

  /* ══════════════════════════════════════════════════════════════════════
     FIELD RENDERERS
     ══════════════════════════════════════════════════════════════════════ */
  function bind(el, get, set, opts) {
    opts = opts || {};
    var evt = opts.evt || 'input';
    el.addEventListener(evt, function () {
      set(el);
      markDirty(); refreshPreview();
      if (opts.onAfter) opts.onAfter(el);
    });
    if (opts.evt && opts.evt !== 'change') el.addEventListener('change', function () { set(el); markDirty(); refreshPreview(); });
    return el;
  }

  function counterFor(input, max, countEl) {
    function paint() {
      var n = ('value' in input && input.tagName !== 'DIV')
        ? String(input.value || '').length
        : String(input.textContent || '').length;
      countEl.textContent = max ? n + ' / ' + max : String(n);
      countEl.classList.toggle('over', !!max && n > max);
    }
    input.addEventListener('input', paint); paint();
  }

  /* rich text: contenteditable with the site's own emphasis classes, plus a
     source view so nothing is ever hidden behind the toolbar */
  function richField(value, onChange) {
    var area = h('div', { class: 'rt-area', contenteditable: 'true', spellcheck: 'true' });
    area.innerHTML = value || '';
    var src = h('textarea', { class: 'rt-area raw', rows: '5', spellcheck: 'false' });
    src.style.display = 'none';
    var raw = false;
    var dirtyTimer = null;

    function emit() {
      clearTimeout(dirtyTimer);
      dirtyTimer = setTimeout(function () { onChange(raw ? src.value : area.innerHTML); }, 180);
    }
    area.addEventListener('input', emit);
    area.addEventListener('blur', function () { onChange(area.innerHTML); });
    src.addEventListener('input', emit);

    function wrap(cls) {
      area.focus();
      var sel = window.getSelection();
      if (!sel.rangeCount || sel.isCollapsed) { toast('Select the words to emphasise first.'); return; }
      var range = sel.getRangeAt(0);
      var span = document.createElement('span');
      span.className = cls;
      try { range.surroundContents(span); }
      catch (e) {
        var frag = range.extractContents();
        span.appendChild(frag); range.insertNode(span);
      }
      sel.removeAllRanges();
      var r2 = document.createRange(); r2.selectNodeContents(span); sel.addRange(r2);
      emit();
    }
    function btn(label, title, fn, klass) {
      return h('button', { type: 'button', text: label, title: title, class: klass || '',
        onmousedown: function (e) { e.preventDefault(); }, onclick: fn });
    }
    var srcBtn = btn('Source', 'Show and edit the raw HTML', function () {
      raw = !raw;
      if (raw) { src.value = area.innerHTML; area.style.display = 'none'; src.style.display = 'block'; src.focus(); }
      else { area.innerHTML = src.value; src.style.display = 'none'; area.style.display = 'block'; }
      srcBtn.classList.toggle('on', raw);
    });
    var bar = h('div', { class: 'rt-bar' }, [
      btn('B', 'Bold — <b>', function () { document.execCommand('bold'); emit(); }),
      btn('I', 'Italic — the house style for a trailing word', function () { wrap('it'); }),
      btn('HL', 'Highlight — the accent phrase', function () { wrap('hl'); }),
      btn('Mute', 'Muted text', function () { wrap('mut'); }),
      h('span', { class: 'sep' }),
      btn('↵', 'Line break', function () { area.focus(); document.execCommand('insertHTML', false, '<br>'); emit(); }),
      btn('⌫', 'Clear formatting from the selection', function () {
        area.focus(); document.execCommand('removeFormat');
        var sel = window.getSelection();
        if (sel.rangeCount) {
          var node = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentNode);
          while (node && node !== area) {
            if (node.classList && /^(hl|it|mut|todo)$/.test(node.className)) {
              var parent = node.parentNode;
              while (node.firstChild) parent.insertBefore(node.firstChild, node);
              parent.removeChild(node);
              break;
            }
            node = node.parentNode;
          }
        }
        emit();
      }),
      srcBtn,
    ]);
    return h('div', {}, [bar, area, src]);
  }

  function fieldFor(spec, get, set) {
    var value = get();
    var wrapEl = h('div', { class: 'field' });
    var labelRow = h('label', {}, [h('span', { text: spec.label })]);
    if (spec.k !== '$self') labelRow.appendChild(h('span', { class: 'path', text: spec.k }));
    if (spec.max) labelRow.appendChild(h('span', { class: 'count' }));
    wrapEl.appendChild(labelRow);

    var input;
    if (spec.type === 'rich') {
      input = richField(value, function (v) { set(v); markDirty(); refreshPreview(); });
    } else if (spec.type === 'textarea') {
      input = bind(h('textarea', { rows: '4', spellcheck: 'true' }), null, null, {});
      input.value = value || '';
      input.addEventListener('input', function () { set(input.value); markDirty(); refreshPreview(); });
    } else if (spec.type === 'select') {
      input = h('select', {});
      (spec.options || []).forEach(function (o) {
        var opt = h('option', { value: String(o[0]), text: o[1] });
        if (String(value) === String(o[0])) opt.selected = true;
        input.appendChild(opt);
      });
      input.addEventListener('change', function () {
        var raw = input.value;
        set(raw === 'true' ? true : raw === 'false' ? false : raw);
        markDirty(); refreshPreview();
      });
    } else {
      input = h('input', { type: spec.type === 'number' ? 'number' : (spec.type === 'url' ? 'url'
        : spec.type === 'email' ? 'email' : spec.type === 'color' ? 'color' : 'text'),
        spellcheck: spec.type === 'text' ? 'true' : 'false' });
      input.value = value === undefined || value === null ? '' : String(value);
      input.addEventListener('input', function () {
        set(spec.type === 'number' ? Number(input.value) : input.value);
        markDirty(); refreshPreview();
        validate();
      });
    }
    wrapEl.appendChild(input);
    if (spec.hint) wrapEl.appendChild(h('p', { class: 'hint', text: spec.hint }));
    wrapEl.appendChild(h('p', { class: 'err' }));

    if (spec.max) {
      /* for rich fields the editable surface is the contenteditable div, not the
         hidden source textarea */
      var surface = spec.type === 'rich' ? qs('.rt-area[contenteditable]', wrapEl) : input;
      counterFor(surface, spec.max, qs('.count', labelRow));
    }

    function validate() {
      var bad = null;
      var v = spec.type === 'rich' ? (qs('.rt-area', wrapEl) || {}).innerHTML || '' : (input.value || '');
      var plain = String(v).replace(/<[^>]*>/g, '');
      if (spec.required && !plain.trim()) bad = 'Required.';
      else if (spec.max && plain.length > spec.max) bad = 'Over the ' + spec.max + ' character guideline by ' + (plain.length - spec.max) + '.';
      else if (spec.type === 'url' && plain && !/^(https?:|mailto:|#|\.?\/)/.test(plain)) bad = 'That does not look like a URL.';
      else if (spec.type === 'email' && plain && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(plain)) bad = 'That does not look like an email address.';
      wrapEl.classList.toggle('invalid', !!bad);
      qs('.err', wrapEl).textContent = bad || '';
      return !bad;
    }
    wrapEl._validate = validate;
    validate();
    return wrapEl;
  }

  /* path-based accessors over State.content */
  function getter(path) { return function () { return ASCms.get(State.content, path); }; }
  function setter(path) {
    return function (v) { ASCms.set(State.content, path, v); };
  }

  /* ══════════════════════════════════════════════════════════════════════
     PANELS
     ══════════════════════════════════════════════════════════════════════ */
  var PANELS = [
    { group: 'Content', items: [
      { id: 'hero', label: 'Hero', ic: '◈' },
      { id: 'philosophy', label: 'Philosophy', ic: '01' },
      { id: 'experience', label: 'Experience', ic: '02' },
      { id: 'works', label: 'Works', ic: '03' },
      { id: 'projects', label: 'Project cards', ic: '▤' },
      { id: 'ai', label: 'AI Practices', ic: '04' },
      { id: 'contact', label: 'Contact & footer', ic: '✉' },
      { id: 'header', label: 'Header & nav', ic: '≡' },
      { id: 'meta', label: 'SEO & document', ic: '¶' },
    ]},
    { group: 'Design', items: [
      { id: 'design', label: 'Design system', ic: '◐' },
      { id: 'cases', label: 'Case-study palettes', ic: '◑' },
      { id: 'media', label: 'Media', ic: '▣' },
    ]},
    { group: 'Ship', items: [
      { id: 'publish', label: 'Publish & export', ic: '↑' },
      { id: 'revisions', label: 'Revisions', ic: '↺' },
      { id: 'settings', label: 'Settings & security', ic: '⚙' },
    ]},
  ];

  function buildSidebar() {
    var side = clear(qs('#side'));
    PANELS.forEach(function (g) {
      var box = h('div', { class: 'side-group' }, [h('h2', { text: g.group })]);
      g.items.forEach(function (it) {
        box.appendChild(h('button', {
          class: 'side-link' + (State.activePanel === it.id ? ' on' : ''),
          'data-panel': it.id, type: 'button',
          onclick: function () { go(it.id); },
        }, [h('span', { class: 'ic', text: it.ic }), h('span', { text: it.label }),
            h('span', { class: 'dot', title: 'Has unfilled placeholders' })]));
      });
      side.appendChild(box);
    });
    flagPlaceholderPanels();
  }

  /* show a dot on any panel whose content still contains an amber placeholder */
  function flagPlaceholderPanels() {
    var byPanel = { hero: 'hero', philosophy: 'philosophy', experience: 'experience',
      works: 'works', projects: 'works.items', ai: 'ai', contact: 'contact',
      header: 'header', meta: 'meta' };
    qsa('.side-link').forEach(function (b) {
      var id = b.getAttribute('data-panel');
      var path = byPanel[id];
      if (!path) return;
      var sub = ASCms.get(State.content, path);
      var hasTodo = /class="todo"|class=\\"todo\\"/.test(JSON.stringify(sub || ''));
      b.classList.toggle('flagged', hasTodo);
    });
  }

  function go(id) {
    State.activePanel = id;
    qsa('.side-link').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-panel') === id);
    });
    render();
    qs('#main').scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── generic schema-driven content panel ───────────────────────────────── */
  function contentPanel(key) {
    var spec = SCHEMA[key];
    var main = clear(qs('#main'));
    main.appendChild(h('div', { class: 'panel on' }, [
      h('div', { class: 'panel-head' }, [
        h('div', {}, [h('h1', { text: spec.label }),
          h('p', { text: PANEL_COPY[key] || '' })]),
      ]),
      schemaCard(key, spec),
    ]));
    if (key === 'works') main.firstChild.appendChild(projectsShelfNote());
    return main;
  }

  var PANEL_COPY = {
    meta: 'What search engines and browser tabs show. These do not appear on the page itself.',
    header: 'The fixed bar and the mobile menu. Targets are anchors such as #works, or any URL.',
    hero: 'The first screen. Two highlights in the statement is the most this layout can carry.',
    philosophy: 'Three or four tenets is the shape this layout was drawn for.',
    experience: 'Newest first. The scope chip is the mono line under the location.',
    works: 'The section around the project cards. The cards themselves are edited in Project cards.',
    projects: 'Each card links to a case study. The preview artwork is edited under Media.',
    ai: 'Structure and placeholders are in place — replace every amber span with your own copy.',
    contact: 'The closing screen and the footer strip.',
  };

  function schemaCard(key, spec) {
    var body = h('div', { class: 'body' });
    (spec.fields || []).forEach(function (f) {
      var path = key === 'projects' ? 'works.items' : key + '.' + f.k;
      body.appendChild(fieldFor(f, getter(path), setter(path)));
    });
    (spec.arrays || []).forEach(function (a) {
      var path = a.source || (key + '.' + a.k);
      body.appendChild(h('label', {
        style: { display: 'block', fontSize: '11.5px', fontWeight: '600', textTransform: 'uppercase',
                 letterSpacing: '.09em', color: 'var(--muted)', margin: '22px 0 10px' },
        text: a.label,
      }));
      body.appendChild(listEditor(path, a));
    });
    return h('div', { class: 'card' }, [
      h('header', {}, [h('h2', { text: spec.label }), h('span', { class: 'spacer' }),
        h('span', { class: 'mono muted', style: { fontSize: '11px' }, text: key })]),
      body,
    ]);
  }

  /* ── repeatable item editor ────────────────────────────────────────────── */
  function listEditor(path, arraySpec) {
    var host = h('div', { class: 'items' });

    function items() {
      var v = ASCms.get(State.content, path);
      if (!Array.isArray(v)) { v = []; ASCms.set(State.content, path, v); }
      return v;
    }
    function paint() {
      clear(host);
      var arr = items();
      if (!arr.length) {
        host.appendChild(h('div', { class: 'empty', text: 'Nothing here yet — add the first ' + (arraySpec.singular || 'item') + '.' }));
      }
      arr.forEach(function (item, i) {
        host.appendChild(itemRow(i));
      });
      host.appendChild(h('div', { class: 'btn-row', style: { marginTop: '4px' } }, [
        h('button', { class: 'btn', type: 'button', text: '+ Add ' + (arraySpec.singular || 'item'),
          disabled: arraySpec.max && arr.length >= arraySpec.max,
          onclick: function () {
            var blank = {};
            (arraySpec.fields || []).forEach(function (f) {
              blank[f.k === '$self' ? '$self' : f.k] = f.type === 'select' && Array.isArray(f.options) && f.options.length ? f.options[0][0] : '';
            });
            if (arraySpec.k === 'items' && path === 'works.items') {
              blank = { id: 'project-' + Date.now().toString(36), title: '', titleItalic: '', href: '',
                meta: '', year: '', problem: '', outcome: '', tags: [], cta: 'Read the case study',
                badge: '', preview: { type: 'svg', svg: '', image: '' }, openIn: 'new-tab' };
            }
            arr.push(blank); markDirty(); refreshPreview(); paint(); flagPlaceholderPanels();
          } }),
        arraySpec.max ? h('span', { class: 'mono muted', style: { fontSize: '11px', alignSelf: 'center' },
          text: arr.length + ' / ' + arraySpec.max }) : null,
      ]));
    }

    function itemRow(i) {
      var arr = items();
      var item = arr[i];
      var row = h('div', { class: 'item' });
      var name = arraySpec.itemLabel
        ? (arraySpec.fields && arraySpec.fields.length === 1 && arraySpec.fields[0].k === '$self'
            ? String(item || '').replace(/<[^>]+>/g, '').slice(0, 46)
            : arraySpec.itemLabel(item, i))
        : (arraySpec.singular || 'Item') + ' ' + (i + 1);
      var head = h('div', { class: 'item-head', onclick: function (e) {
        if (e.target.closest('.icon-btn')) return;
        row.classList.toggle('open');
      } }, [
        h('span', { class: 'grip', text: '⋮⋮' }),
        h('span', { class: 'idx', text: String(i + 1).padStart(2, '0') }),
        h('span', { class: 'name', text: name || 'Untitled' }),
        h('span', { class: 'acts' }, [
          h('button', { class: 'icon-btn', type: 'button', title: 'Move up', text: '↑', disabled: i === 0,
            onclick: function () { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); markDirty(); refreshPreview(); paint(); } }),
          h('button', { class: 'icon-btn', type: 'button', title: 'Move down', text: '↓', disabled: i === arr.length - 1,
            onclick: function () { arr.splice(i + 1, 0, arr.splice(i, 1)[0]); markDirty(); refreshPreview(); paint(); } }),
          h('button', { class: 'icon-btn', type: 'button', title: 'Duplicate', text: '⧉',
            onclick: function () { arr.splice(i + 1, 0, clone(item)); markDirty(); refreshPreview(); paint(); } }),
          h('button', { class: 'icon-btn danger', type: 'button', title: 'Delete', text: '✕',
            onclick: function () {
              modal('Delete this ' + (arraySpec.singular || 'item') + '?',
                h('p', { text: '“' + (name || 'Untitled') + '” will be removed. You can restore it from Revisions until you clear history.' }),
                [{ label: 'Cancel' }, { label: 'Delete', kind: 'btn-danger', onClick: function () {
                  arr.splice(i, 1); markDirty(); refreshPreview(); paint(); flagPlaceholderPanels();
                  toast('Deleted', 'ok');
                } }]);
            } }),
        ]),
      ]);
      var bodyEl = h('div', { class: 'item-body' });
      (arraySpec.fields || []).forEach(function (f) {
        var p = path + '.' + i + (f.k === '$self' ? '' : '.' + f.k);
        bodyEl.appendChild(fieldFor(f,
          f.k === '$self' ? function () { return arr[i]; } : getter(p),
          f.k === '$self' ? function (v) { arr[i] = v; } : setter(p)));
      });
      row.appendChild(head); row.appendChild(bodyEl);
      if (i === 0) row.classList.add('open');
      return row;
    }

    paint();
    host._repaint = paint;
    return host;
  }

  /* the Works panel also shows a shortcut into the card editor */
  function projectsShelfNote() {
    return h('div', { class: 'notice info' }, [
      h('span', { class: 'ico', text: 'i' }),
      h('div', { html: 'The four project cards carry their own editor — artwork, tags, link target and all. <b>Project cards</b> in the sidebar.' }),
    ]);
  }


  /* ══════════════════════════════════════════════════════════════════════
     TAGS (an array of short strings, edited as chips)
     ══════════════════════════════════════════════════════════════════════ */
  function tagsEditor(path) {
    var host = h('div', { class: 'field' });
    host.appendChild(h('label', {}, [h('span', { text: 'Tags' }),
      h('span', { class: 'path', text: path })]));
    var chips = h('div', { class: 'btn-row', style: { gap: '6px', marginBottom: '8px' } });
    var input = h('input', { type: 'text', placeholder: 'Add a tag and press Enter',
      style: { padding: '7px 11px', border: '1px solid var(--line-2)', borderRadius: 'var(--r)',
               background: 'var(--bg)', fontSize: '13px', width: '100%' } });

    function arr() {
      var v = ASCms.get(State.content, path);
      if (!Array.isArray(v)) { v = []; ASCms.set(State.content, path, v); }
      return v;
    }
    function paint() {
      clear(chips);
      var list = arr();
      if (!list.length) chips.appendChild(h('span', { class: 'muted', style: { fontSize: '12px' }, text: 'No tags yet.' }));
      list.forEach(function (t, i) {
        chips.appendChild(h('span', { class: 'state-pill', style: { gap: '6px' } }, [
          h('span', { text: t }),
          h('button', { type: 'button', text: '✕', title: 'Remove',
            style: { border: '0', background: 'none', cursor: 'pointer', color: 'inherit',
                     fontSize: '10px', padding: '0', lineHeight: '1' },
            onclick: function () { list.splice(i, 1); markDirty(); refreshPreview(); paint(); } }),
        ]));
      });
    }
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ',') return;
      e.preventDefault();
      var v = input.value.trim();
      if (!v) return;
      if (arr().length >= 6) { toast('Six tags is the most this card can hold.', 'err'); return; }
      arr().push(v); input.value = ''; markDirty(); refreshPreview(); paint();
    });
    host.appendChild(chips); host.appendChild(input);
    host.appendChild(h('p', { class: 'hint', text: 'Three or four reads best. Enter or comma to add.' }));
    paint();
    return host;
  }

  /* ══════════════════════════════════════════════════════════════════════
     PROJECT CARDS
     ══════════════════════════════════════════════════════════════════════ */
  function projectsPanel() {
    var main = clear(qs('#main'));
    var spec = SCHEMA.projects.arrays[0];
    var path = 'works.items';
    var panel = h('div', { class: 'panel on' });
    panel.appendChild(h('div', { class: 'panel-head' }, [
      h('div', {}, [h('h1', { text: 'Project cards' }),
        h('p', { text: 'Each card is a link to a case study. Drag-free reordering with the arrows; the preview artwork lives under Media.' })]),
      h('div', { class: 'btn-row' }, [
        h('button', { class: 'btn', type: 'button', text: 'Check every link', onclick: checkProjectLinks }),
      ]),
    ]));

    var host = h('div', { class: 'items' });
    function items() {
      var v = ASCms.get(State.content, path);
      if (!Array.isArray(v)) { v = []; ASCms.set(State.content, path, v); }
      return v;
    }
    function paint() {
      clear(host);
      var arr = items();
      if (!arr.length) host.appendChild(h('div', { class: 'empty', text: 'No project cards yet.' }));
      arr.forEach(function (item, i) { host.appendChild(cardRow(arr, item, i, paint)); });
      host.appendChild(h('div', { class: 'btn-row', style: { marginTop: '6px' } }, [
        h('button', { class: 'btn', type: 'button', text: '+ Add a project', onclick: function () {
          arr.push({ id: 'project-' + Date.now().toString(36), title: 'New project', titleItalic: '',
            href: '', meta: '', year: '', problem: '', outcome: '', tags: [],
            cta: 'Read the case study', badge: '',
            preview: { type: 'svg', svg: '', image: '' }, openIn: 'new-tab' });
          markDirty(); refreshPreview(); paint();
        } }),
      ]));
    }
    paint();
    panel.appendChild(host);
    main.appendChild(panel);
    return main;
  }

  function cardRow(arr, item, i, repaint) {
    var row = h('div', { class: 'item' + (i === 0 ? ' open' : '') });
    var title = String(item.title || 'Untitled project');
    row.appendChild(h('div', { class: 'item-head', onclick: function (e) {
      if (e.target.closest('.icon-btn')) return;
      row.classList.toggle('open');
    } }, [
      h('span', { class: 'grip', text: '⋮⋮' }),
      h('span', { class: 'idx', text: String(i + 1).padStart(2, '0') }),
      h('span', { class: 'name', text: title + (item.href ? '' : '  ·  no link yet') }),
      h('span', { class: 'acts' }, [
        h('button', { class: 'icon-btn', type: 'button', title: 'Move up', text: '↑', disabled: i === 0,
          onclick: function () { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); markDirty(); refreshPreview(); repaint(); } }),
        h('button', { class: 'icon-btn', type: 'button', title: 'Move down', text: '↓', disabled: i === arr.length - 1,
          onclick: function () { arr.splice(i + 1, 0, arr.splice(i, 1)[0]); markDirty(); refreshPreview(); repaint(); } }),
        h('button', { class: 'icon-btn', type: 'button', title: 'Duplicate', text: '⧉',
          onclick: function () { arr.splice(i + 1, 0, clone(item)); markDirty(); refreshPreview(); repaint(); } }),
        h('button', { class: 'icon-btn danger', type: 'button', title: 'Delete', text: '✕',
          onclick: function () {
            modal('Delete “' + title + '”?', h('p', { text: 'The card and its preview artwork will be removed from the draft.' }),
              [{ label: 'Cancel' }, { label: 'Delete', kind: 'btn-danger', onClick: function () {
                arr.splice(i, 1); markDirty(); refreshPreview(); repaint(); flagPlaceholderPanels(); toast('Card deleted', 'ok');
              } }]);
          } }),
      ]),
    ]));

    var body = h('div', { class: 'item-body' });
    var spec = SCHEMA.projects.arrays[0];
    spec.fields.forEach(function (f) {
      body.appendChild(fieldFor(f, function () { return item[f.k]; }, function (v) { item[f.k] = v; }));
    });
    body.appendChild(tagsEditor(path0(i)));
    body.appendChild(h('div', { class: 'notice', style: { marginTop: '4px' } }, [
      h('span', { class: 'ico', text: '↗' }),
      h('div', { html: 'Preview artwork is edited under <b>Media</b>. ' +
        (item.preview && item.preview.image ? 'This card currently uses an <b>uploaded image</b>.'
                                            : 'This card currently uses <b>inline SVG</b>.') }),
    ]));
    row.appendChild(body);
    function path0(idx) { return 'works.items.' + idx + '.tags'; }
    return row;
  }

  function checkProjectLinks() {
    var arr = ASCms.get(State.content, 'works.items') || [];
    var rows = arr.map(function (p) {
      return h('tr', {}, [
        h('td', { text: p.title || '—' }),
        h('td', { class: 'num', text: p.href || '(none)' }),
        h('td', {}, [h('a', { href: CONFIG.sitePath.replace('index.html', p.href || '#'),
          target: '_blank', rel: 'noopener', text: p.href ? 'Open' : '—',
          style: { fontSize: '12px' } })]),
      ]);
    });
    modal('Project links', [
      h('p', { text: 'These are resolved relative to site/. A 404 here means the file is missing or the name has a typo.' }),
      h('table', { class: 'rows' }, [
        h('thead', {}, [h('tr', {}, [h('th', { text: 'Card' }), h('th', { text: 'Target' }), h('th', { text: '' })])]),
        h('tbody', {}, rows),
      ]),
    ], [{ label: 'Close' }]);
  }

  /* ══════════════════════════════════════════════════════════════════════
     DESIGN SYSTEM
     ══════════════════════════════════════════════════════════════════════ */
  function isColour(v) {
    return typeof v === 'string' && (/^#[0-9a-fA-F]{3,8}$/.test(v.trim()) || /^rgba?\(/.test(v.trim()));
  }
  function toHex(v) {
    var rgb = hexToRgb(v);
    if (rgb) return '#' + rgb.map(function (c) { return ('0' + c.toString(16)).slice(-2); }).join('');
    var m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(String(v).trim());
    if (m) return '#' + [m[1], m[2], m[3]].map(function (c) {
      return ('0' + Number(c).toString(16)).slice(-2); }).join('');
    return null;
  }

  function designPanel() {
    var main = clear(qs('#main'));
    var panel = h('div', { class: 'panel on' });
    panel.appendChild(h('div', { class: 'panel-head' }, [
      h('div', {}, [h('h1', { text: 'Design system' }),
        h('p', { text: 'These are the CSS custom properties behind the portfolio. Changes apply to the preview immediately; publishing writes them into the exported file.' })]),
      h('div', { class: 'btn-row' }, [
        h('button', { class: 'btn', type: 'button', text: 'Reset to shipped values', onclick: function () {
          modal('Reset the design tokens?', h('p', { text: 'Light and dark values return to what the site shipped with. Your content is untouched.' }),
            [{ label: 'Cancel' }, { label: 'Reset', kind: 'btn-danger', onClick: function () {
              State.design = clone(window.DESIGN_TOKENS); markDirty(); refreshPreview(); render(); toast('Tokens reset', 'ok');
            } }]);
        } }),
      ]),
    ]));

    panel.appendChild(h('div', { class: 'notice warn' }, [
      h('span', { class: 'ico', text: '!' }),
      h('div', { html: 'Contrast is checked against <b>--bg</b> and <b>--card</b> for the mode you are editing. ' +
        'Anything below 4.5:1 fails WCAG AA for body text — the badge tells you which.' }),
    ]));

    ['light', 'dark'].forEach(function (mode) {
      var tokens = State.design[mode] || {};
      var card = h('div', { class: 'card' });
      card.appendChild(h('header', {}, [
        h('h2', { text: mode === 'light' ? 'Light mode' : 'Dark mode' }),
        h('span', { class: 'spacer' }),
        h('span', { class: 'mono muted', style: { fontSize: '11px' },
          text: Object.keys(tokens).length + ' tokens' }),
      ]));
      var bodyEl = h('div', { class: 'body' });
      var known = [];
      (window.TOKEN_GROUPS || []).forEach(function (g) { known = known.concat(g.keys); });

      var groups = (window.TOKEN_GROUPS || []).map(function (g) { return { label: g.label, keys: g.keys }; });
      groups.push({ label: 'Other', keys: Object.keys(tokens).filter(function (k) { return known.indexOf(k) === -1; }) });

      groups.forEach(function (g) {
        var present = g.keys.filter(function (k) { return tokens[k] !== undefined; });
        if (!present.length) return;
        bodyEl.appendChild(h('label', {
          style: { display: 'block', fontSize: '11.5px', fontWeight: '600', textTransform: 'uppercase',
                   letterSpacing: '.09em', color: 'var(--muted)', margin: '18px 0 10px' }, text: g.label }));
        var grid = h('div', { class: 'token-grid' });
        present.forEach(function (k) { grid.appendChild(tokenEditor(mode, k, tokens)); });
        bodyEl.appendChild(grid);
      });
      card.appendChild(bodyEl);
      panel.appendChild(card);
    });

    panel.appendChild(contrastCard());
    main.appendChild(panel);
    return main;
  }

  function tokenEditor(mode, key, tokens) {
    var value = tokens[key];
    var colour = isColour(value);
    var hex = colour ? toHex(value) : null;
    var box = h('div', { class: 'token' });
    var swatch = colour ? h('div', { class: 'sw' }, [h('i', { style: { background: value } })]) : null;
    if (swatch) box.appendChild(swatch);
    box.appendChild(h('div', { class: 'k', text: '--' + key.replace(/_/g, '-') }));

    var text = h('input', { type: 'text', value: String(value), spellcheck: 'false' });
    var row = h('div', { class: 'v' });
    if (hex) {
      var picker = h('input', { type: 'color', value: hex });
      picker.addEventListener('input', function () {
        tokens[key] = picker.value; text.value = picker.value;
        markDirty(); refreshPreview(); paintSwatch(); paintContrast();
      });
      row.appendChild(picker);
    }
    text.addEventListener('input', function () {
      tokens[key] = text.value;
      if (hex && /^#[0-9a-fA-F]{6}$/.test(text.value.trim()) && picker) picker.value = text.value.trim();
      markDirty(); refreshPreview(); paintSwatch(); paintContrast();
    });
    row.appendChild(text);
    box.appendChild(row);

    var badge = h('div', { style: { marginTop: '7px' } });
    box.appendChild(badge);
    function paintSwatch() {
      if (swatch && swatch.firstChild) swatch.firstChild.style.background = tokens[key];
    }
    function paintContrast() {
      clear(badge);
      if (!colour) {
        badge.appendChild(h('span', { class: 'contrast', text: 'not a colour' }));
        return;
      }
      var onBg = contrastBadge(tokens[key], tokens.bg || '#ffffff', '--' + key);
      badge.appendChild(onBg);
    }
    paintContrast();
    return box;
  }

  function contrastCard() {
    var card = h('div', { class: 'card' });
    card.appendChild(h('header', {}, [h('h2', { text: 'Contrast check' }), h('span', { class: 'spacer' }),
      h('span', { class: 'mono muted', style: { fontSize: '11px' }, text: 'live' })]));
    var body = h('div', { class: 'body' });
    function paint() {
      clear(body);
      ['light', 'dark'].forEach(function (mode) {
        var t = State.design[mode] || {};
        body.appendChild(h('label', { style: { display: 'block', fontSize: '11.5px', fontWeight: '600',
          textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--muted)', margin: '4px 0 8px' },
          text: mode + ' mode' }));
        var table = h('table', { class: 'rows' });
        var pairs = [['text', 'bg', 'Body text on the page'], ['text', 'card', 'Body text on a card'],
          ['text_muted', 'bg', 'Muted text on the page'], ['text_muted', 'card', 'Muted text on a card'],
          ['text_faint', 'card', 'Faint text on a card'], ['bg', 'text', 'Inverted (buttons)']];
        pairs.forEach(function (p) {
          if (!t[p[0]] || !t[p[1]]) return;
          table.appendChild(h('tr', {}, [
            h('td', { text: p[2] }),
            h('td', { class: 'num', text: '#' + p[0] + ' / #' + p[1] }),
            h('td', {}, [contrastBadge(t[p[0]], t[p[1]], p[2])]),
          ]));
        });
        body.appendChild(table);
      });
    }
    paint();
    card.appendChild(body);
    card._repaint = paint;
    return card;
  }

  /* ══════════════════════════════════════════════════════════════════════
     CASE-STUDY PALETTES
     ══════════════════════════════════════════════════════════════════════ */
  function casesPanel() {
    var main = clear(qs('#main'));
    var panel = h('div', { class: 'panel on' });
    panel.appendChild(h('div', { class: 'panel-head' }, [
      h('div', {}, [h('h1', { text: 'Case-study palettes' }),
        h('p', { text: 'Each case study has its own dark palette and its light-mode counterpart. Editing here produces a CSS patch you apply with build/apply_case_palette.py — the 1.5 MB case studies are never rewritten by the browser.' })]),
      h('div', { class: 'btn-row' }, [
        h('button', { class: 'btn', type: 'button', text: 'Export all patches', onclick: function () { exportCaseCss(true); } }),
      ]),
    ]));

    Object.keys(State.cases).forEach(function (key) {
      var cs = State.cases[key];
      var card = h('div', { class: 'card' });
      card.appendChild(h('header', {}, [
        h('h2', { text: key }),
        h('span', { class: 'mono muted', style: { fontSize: '11px' }, text: cs.file }),
        h('span', { class: 'spacer' }),
        h('span', { class: 'mono muted', style: { fontSize: '11px' },
          text: cs.tokenCount ? cs.tokenCount + ' tokens' : 'variable-based' }),
        h('button', { class: 'btn btn-sm', type: 'button', text: 'Export CSS',
          onclick: function () { exportCaseCss(false, key); } }),
      ]));
      var body = h('div', { class: 'body' });
      if (cs.note) body.appendChild(h('div', { class: 'notice', style: { marginBottom: '14px' } }, [
        h('span', { class: 'ico', text: 'i' }), h('div', { text: cs.note })]));

      var grid = h('div', { class: 'token-grid' });
      Object.keys(cs.light || {}).forEach(function (role) {
        var lightVal = cs.light[role];
        var darkVal = (cs.dark || {})[role] || '#000000';
        var box = h('div', { class: 'token' });
        box.appendChild(h('div', { class: 'sw', style: { display: 'flex', gap: '0' } }, [
          h('i', { style: { background: darkVal, borderRadius: '5px 0 0 5px' }, title: 'dark: ' + darkVal }),
          h('i', { id: 'sw-' + key + '-' + role, style: { background: lightVal, borderRadius: '0 5px 5px 0' },
             title: 'light: ' + lightVal }),
        ]));
        box.appendChild(h('div', { class: 'k', text: role }));
        var picker = h('input', { type: 'color', value: toHex(lightVal) || '#ffffff' });
        var text = h('input', { type: 'text', value: lightVal, spellcheck: 'false' });
        picker.addEventListener('input', function () {
          cs.light[role] = picker.value; text.value = picker.value;
          box.querySelector('.sw i:last-child').style.background = picker.value;
          markDirty(); paintBadge();
        });
        text.addEventListener('input', function () {
          cs.light[role] = text.value;
          if (/^#[0-9a-fA-F]{6}$/.test(text.value.trim())) picker.value = text.value.trim();
          box.querySelector('.sw i:last-child').style.background = text.value;
          markDirty(); paintBadge();
        });
        var badge = h('div', { style: { marginTop: '7px' } });
        function paintBadge() {
          clear(badge);
          badge.appendChild(contrastBadge(cs.light[role], '#ffffff', role + ' (light, on white)'));
        }
        paintBadge();
        box.appendChild(h('div', { class: 'v' }, [picker, text]));
        box.appendChild(badge);
        box.appendChild(h('div', { class: 'mono muted', style: { fontSize: '10px', marginTop: '5px' },
          text: 'dark ' + darkVal }));
        grid.appendChild(box);
      });
      body.appendChild(grid);
      card.appendChild(body);
      panel.appendChild(card);
    });
    main.appendChild(panel);
    return main;
  }

  /* BT is variable-driven rather than tokenised, so its roles map onto its own
     custom properties instead of generated token names. */
  var BT_VAR = {
    page: '--paper', surface: '--paper-2', raised: '--card', line: '--rule',
    ink: '--chalk', 'ink 2': '--chalk-2', 'ink 3': '--chalk-3',
    'red pen': '--red-pen', 'blue pen': '--blue-pen', sticky: '--note-yellow',
  };

  function caseCss(key) {
    var cs = State.cases[key];
    var out = ['/* ══ CMS palette patch — ' + key + ' ═════════════════════════════',
      '   Generated by admin.html. Apply it with:',
      '       python3 build/apply_case_palette.py ' + key + ' palette-' + key + '.css',
      '   Re-running replaces the previous patch and touches nothing else.',
      '   ═════════════════════════════════════════════════════════════ */', '',
      'html[data-theme="light"]{'];
    var emitted = 0;
    Object.keys(cs.light || {}).forEach(function (role) {
      var value = cs.light[role];
      if (!value) return;
      var target = cs.tokenPrefix
        ? (cs.tokenByRole || {})[role]
        : BT_VAR[role];
      if (!target) { out.push('  /* no mapping for “' + role + '” — skipped */'); return; }
      out.push('  ' + target + ':' + value + ';' + ' '.repeat(Math.max(1, 22 - target.length)) + '/* ' + role + ' */');
      emitted++;
    });
    out.push('}');
    out.push('');
    out.push('/* ' + emitted + ' of ' + Object.keys(cs.light || {}).length + ' roles mapped */');
    return out.join('\n') + '\n';
  }

  function exportCaseCss(all, onlyKey) {
    var keys = all ? Object.keys(State.cases) : [onlyKey];
    keys.forEach(function (k) {
      download('palette-' + k + '.css', caseCss(k), 'text/css');
    });
    if (all) toast('Exported ' + keys.length + ' palette patches', 'ok');
  }


  /* ══════════════════════════════════════════════════════════════════════
     MEDIA
     ══════════════════════════════════════════════════════════════════════ */
  function mediaPanel() {
    var main = clear(qs('#main'));
    var panel = h('div', { class: 'panel on' });
    panel.appendChild(h('div', { class: 'panel-head' }, [
      h('div', {}, [h('h1', { text: 'Media' }),
        h('p', { text: 'Preview artwork for the project cards. Images are embedded as data URIs so the site stays a set of self-contained files — which means they add directly to page weight, so keep them small.' })]),
    ]));

    panel.appendChild(h('div', { class: 'notice warn' }, [
      h('span', { class: 'ico', text: '!' }),
      h('div', { html: 'Budget: a card preview is displayed at roughly <b>640 × 360</b>. Export at that size, ' +
        'under <b>' + CONFIG.maxImageKB + ' KB</b>, as JPEG or WebP. Anything larger will bloat every page load.' }),
    ]));

    var items = ASCms.get(State.content, 'works.items') || [];
    items.forEach(function (p, i) {
      var path = 'works.items.' + i + '.preview';
      var prev = p.preview || (p.preview = { type: 'svg', svg: '', image: '' });
      var card = h('div', { class: 'card' });
      card.appendChild(h('header', {}, [
        h('h2', { text: p.title || ('Project ' + (i + 1)) }),
        h('span', { class: 'spacer' }),
        h('span', { class: 'mono muted', style: { fontSize: '11px' },
          text: prev.image ? 'image · ' + bytes(Math.round(prev.image.length * 0.75)) : 'inline SVG · ' + bytes((prev.svg || '').length) }),
      ]));
      var body = h('div', { class: 'body' });

      /* live preview of the artwork */
      var frame = h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px',
        overflow: 'hidden', background: 'var(--bg)', marginBottom: '14px' } });
      function paintFrame() {
        clear(frame);
        if (prev.image) {
          frame.appendChild(h('img', { src: prev.image, alt: '', style: { display: 'block', width: '100%' } }));
        } else if (prev.svg) {
          frame.appendChild(h('div', { html: prev.svg }));
          var svg = frame.querySelector('svg');
          if (svg) { svg.style.width = '100%'; svg.style.height = 'auto'; svg.style.display = 'block'; }
        } else {
          frame.appendChild(h('div', { class: 'empty', style: { border: '0' }, text: 'No artwork yet.' }));
        }
      }
      paintFrame();
      body.appendChild(frame);

      body.appendChild(h('div', { class: 'seg', style: { marginBottom: '12px' } }, [
        h('button', { type: 'button', class: prev.type === 'svg' ? 'on' : '', text: 'Inline SVG',
          onclick: function () { prev.type = 'svg'; markDirty(); refreshPreview(); render(); } }),
        h('button', { type: 'button', class: prev.type === 'image' ? 'on' : '', text: 'Uploaded image',
          onclick: function () { prev.type = 'image'; markDirty(); refreshPreview(); render(); } }),
      ]));

      if (prev.type === 'image') {
        var drop = h('div', { class: 'drop', text: prev.image ? 'Replace the image — click or drop a file here'
                                                              : 'Click or drop an image here' });
        var file = h('input', { type: 'file', accept: 'image/*', class: 'sr' });
        drop.appendChild(file);
        function take(f) {
          if (!f) return;
          if (!/^image\//.test(f.type)) { toast('That is not an image file.', 'err'); return; }
          if (f.size > CONFIG.maxImageKB * 1024) {
            toast(f.name + ' is ' + bytes(f.size) + ' — over the ' + CONFIG.maxImageKB + ' KB budget.', 'err');
          }
          readDataUrl(f).then(function (url) {
            prev.image = url; prev.type = 'image';
            markDirty(); refreshPreview(); render();
            toast('Image embedded (' + bytes(Math.round(url.length * 0.75)) + ')', 'ok');
          }).catch(function () { toast('Could not read that file.', 'err'); });
        }
        drop.addEventListener('click', function () { file.click(); });
        file.addEventListener('change', function () { take(file.files && file.files[0]); });
        ['dragenter', 'dragover'].forEach(function (ev) {
          drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); });
        });
        ['dragleave', 'drop'].forEach(function (ev) {
          drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); });
        });
        drop.addEventListener('drop', function (e) {
          take(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
        });
        body.appendChild(drop);
        body.appendChild(h('div', { class: 'btn-row', style: { marginTop: '10px' } }, [
          h('button', { class: 'btn', type: 'button', text: 'Paste an image URL', onclick: function () {
            modal('Image URL', [
              h('p', { text: 'Remote images make the page depend on another server. Only do this if you accept that.' }),
              (function () {
                var inp = h('input', { type: 'url', placeholder: 'https://…',
                  style: { width: '100%', padding: '9px 11px', border: '1px solid var(--line-2)',
                           borderRadius: 'var(--r)', background: 'var(--bg)' } });
                inp.id = 'imgUrlInput';
                return inp;
              })(),
            ], [
              { label: 'Cancel' },
              { label: 'Use this URL', kind: 'btn-primary', onClick: function () {
                var v = (qs('#imgUrlInput') || {}).value || '';
                if (!/^https?:\/\//.test(v)) { toast('That is not an http(s) URL.', 'err'); return; }
                if (!CONFIG.allowRemoteImages) { toast('Remote images are disabled in CONFIG. Set allowRemoteImages to true first.', 'err'); return; }
                prev.image = v; prev.type = 'image'; markDirty(); refreshPreview(); render();
              } },
            ]);
          } }),
          prev.image ? h('button', { class: 'btn btn-danger', type: 'button', text: 'Remove image',
            onclick: function () { prev.image = ''; prev.type = 'svg'; markDirty(); refreshPreview(); render(); } }) : null,
        ]));
      } else {
        body.appendChild(fieldFor({ k: 'svg', label: 'SVG source', type: 'textarea',
          hint: 'The whole <svg>…</svg> element. It scales to the card, so keep the viewBox and drop width/height.' },
          function () { return prev.svg; }, function (v) { prev.svg = v; paintFrame(); }));
        body.appendChild(h('div', { class: 'btn-row' }, [
          h('button', { class: 'btn', type: 'button', text: 'Format SVG', onclick: function () {
            prev.svg = String(prev.svg || '').replace(/>\s+</g, '>\n<').trim();
            markDirty(); render(); toast('Reformatted', 'ok');
          } }),
        ]));
      }
      card.appendChild(body);
      panel.appendChild(card);
    });

    /* weight report */
    var total = JSON.stringify(State.content).length;
    var imgBytes = 0;
    items.forEach(function (p) { if (p.preview && p.preview.image) imgBytes += p.preview.image.length; });
    panel.appendChild(h('div', { class: 'card' }, [
      h('header', {}, [h('h2', { text: 'Weight' })]),
      h('div', { class: 'body' }, [
        h('table', { class: 'rows' }, [
          h('tr', {}, [h('td', { text: 'content.json' }), h('td', { class: 'num', text: bytes(total) })]),
          h('tr', {}, [h('td', { text: 'Embedded images' }), h('td', { class: 'num', text: bytes(Math.round(imgBytes * 0.75)) })]),
          h('tr', {}, [h('td', { text: 'Inline SVG artwork' }), h('td', { class: 'num',
            text: bytes(items.reduce(function (a, p) {
              return a + ((p.preview && p.preview.svg && !p.preview.image) ? p.preview.svg.length : 0); }, 0)) })]),
        ]),
      ]),
    ]));
    main.appendChild(panel);
    return main;
  }

  /* ══════════════════════════════════════════════════════════════════════
     PUBLISH & EXPORT
     ══════════════════════════════════════════════════════════════════════ */
  function publishPayload() {
    /* store only what differs from the shipped defaults, so the file stays small
       and a future rebuild of content.js does not silently override your edits */
    var base = clone(window.SITE_CONTENT);
    return diffOf(base, State.content);
  }
  function diffOf(base, over) {
    var out = {};
    Object.keys(over || {}).forEach(function (k) {
      var ov = over[k], bv = base ? base[k] : undefined;
      if (ov && typeof ov === 'object' && !Array.isArray(ov)) {
        var inner = diffOf(bv || {}, ov);
        if (Object.keys(inner).length) out[k] = inner;
      } else if (JSON.stringify(ov) !== JSON.stringify(bv)) {
        out[k] = ov;
      }
    });
    return out;
  }
  function designDiff() { return diffOf(window.DESIGN_TOKENS, State.design); }
  function casesDiff() { return diffOf(window.CASE_STUDIES, State.cases); }

  function saveDraft(quiet) {
    var doc = { content: publishPayload(), design: designDiff(), cases: casesDiff() };
    return Store.save('draft', doc).then(function (r) {
      State.baseline = JSON.parse(JSON.stringify({ content: doc.content, design: doc.design, cases: doc.cases }));
      State.dirty = false; paintState(); flagPlaceholderPanels();
      if (!quiet) toast('Draft saved to ' + Store.label(), 'ok');
      return r;
    }).catch(function (e) { toast('Save failed: ' + e.message, 'err'); });
  }

  function publishFlow() {
    var todos = countTodos(State.content);
    modal('Publish changes', [
      h('p', { html: 'Publishing writes the draft to <b>' + Store.label() + '</b> and takes a revision snapshot. ' +
        'Then choose what to download — the site only changes once you put those files in place.' }),
      todos ? h('div', { class: 'notice warn' }, [h('span', { class: 'ico', text: '!' }),
        h('div', { html: '<b>' + todos + ' placeholder' + (todos === 1 ? '' : 's') + ' still unfilled.</b> ' +
          'They render with an amber dashed highlight on the live page.' })]) : null,
      h('div', { class: 'btn-row', style: { flexDirection: 'column', alignItems: 'stretch', gap: '8px' } }, [
        h('button', { class: 'btn', type: 'button', text: '1 · Publish to ' + Store.label(),
          onclick: function () { doPublish(); } }),
        h('button', { class: 'btn', type: 'button', text: '2 · Download content.json  (runtime mode)',
          onclick: function () { downloadRuntime(); } }),
        h('button', { class: 'btn', type: 'button', text: '3 · Download index.html  (baked, standalone)',
          onclick: function () { downloadBaked(); } }),
        h('button', { class: 'btn', type: 'button', text: '4 · Download case-study palette patches',
          onclick: function () { exportCaseCss(true); } }),
      ]),
      h('p', { class: 'hint', style: { marginTop: '14px', fontSize: '12px', color: 'var(--faint)' },
        text: 'Runtime mode keeps index.html untouched and loads content.json beside it (needs http://, not file://). ' +
              'The baked file needs no fetch at all and works from the filesystem.' }),
    ], [{ label: 'Close' }]);
  }

  function countTodos(obj) {
    return (JSON.stringify(obj).match(/class=\\?"todo\\?"/g) || []).length;
  }

  function doPublish() {
    var doc = { content: publishPayload(), design: designDiff(), cases: casesDiff() };
    Store.save('published', doc)
      .then(function () {
        return Store.pushRevision({
          at: Date.now(), label: 'Published',
          content: doc.content, design: doc.design, cases: doc.cases,
        });
      })
      .then(function (list) {
        /* keep the site's own localStorage in step so a local preview shows it */
        lsSet(K.published, doc.content);
        lsSet(K.publishedDesign, doc.design);
        State.baseline = JSON.parse(JSON.stringify(doc));
        State.dirty = false; paintState();
        toast('Published — ' + list.length + ' revision' + (list.length === 1 ? '' : 's') + ' stored', 'ok');
        closeModal();
        render();
      })
      .catch(function (e) { toast('Publish failed: ' + e.message, 'err'); });
  }

  function downloadRuntime() {
    var payload = {
      _generated: new Date().toISOString(),
      _note: 'Drop this file next to site/index.html. It overrides only the keys present here.',
      content: publishPayload(),
      design: designDiff(),
    };
    download('content.json', JSON.stringify(payload, null, 2), 'application/json');
  }

  /* fetch() reads the real source so formatting is preserved; the fallback path
     serialises the live DOM, which works from file:// too */
  function siteSource() {
    if (typeof fetch !== 'function') return Promise.reject(new Error('no fetch'));
    return fetch(CONFIG.sitePath + '?_=' + Date.now(), { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    });
  }

  function downloadBaked() {
    siteSource().then(function (src) {
      return bakeFromSource(src);
    }).catch(function () {
      return bakeFromLiveDom();
    }).then(function (html) {
      download('index.html', html, 'text/html');
    }).catch(function (e) {
      toast('Could not build the baked file: ' + e.message, 'err');
    });
  }

  function payloadTags() {
    return '\n<script type="application/json" id="as-cms-content">' +
      JSON.stringify(publishPayload()).replace(/</g, '\\u003c') + '</scr' + 'ipt>\n' +
      '<script type="application/json" id="as-cms-design">' +
      JSON.stringify(designDiff()).replace(/</g, '\\u003c') + '</scr' + 'ipt>\n';
  }

  function bakeFromSource(src) {
    var doc = new DOMParser().parseFromString(src, 'text/html');
    ASCms.apply(ASCms.deepMerge(clone(window.SITE_CONTENT), publishPayload()), State.design, doc);
    /* strip the CMS wiring: this file is now static */
    qsa('script[src*="cms-runtime"], script[src*="content.js"], script[src*="admin.js"]', doc)
      .forEach(function (n) { n.remove(); });
    var tag = doc.createElement('div');
    tag.innerHTML = payloadTags();
    Array.prototype.slice.call(tag.children).forEach(function (n) { doc.head.appendChild(n); });
    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
  }

  function bakeFromLiveDom() {
    var frame = qs('#previewFrame');
    if (!frame || !frame.contentDocument) throw new Error('preview unavailable');
    var doc = frame.contentDocument.cloneNode(true);
    qsa('script[src*="cms-runtime"], script[src*="content.js"], script[src*="admin.js"]', doc)
      .forEach(function (n) { n.remove(); });
    var tag = doc.createElement('div');
    tag.innerHTML = payloadTags();
    Array.prototype.slice.call(tag.children).forEach(function (n) { doc.head.appendChild(n); });
    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
  }

  function publishPanel() {
    var main = clear(qs('#main'));
    var panel = h('div', { class: 'panel on' });
    panel.appendChild(h('div', { class: 'panel-head' }, [
      h('div', {}, [h('h1', { text: 'Publish & export' }),
        h('p', { text: 'Two ways to ship: a small content.json the site fetches, or a fully baked index.html that needs no fetch at all.' })]),
      h('div', { class: 'btn-row' }, [
        h('button', { class: 'btn', type: 'button', text: 'Save draft', onclick: function () { saveDraft(); } }),
        h('button', { class: 'btn btn-primary', type: 'button', text: 'Publish…', onclick: publishFlow }),
      ]),
    ]));

    var todos = countTodos(State.content);
    panel.appendChild(h('div', { class: 'notice ' + (todos ? 'warn' : 'info') }, [
      h('span', { class: 'ico', text: todos ? '!' : 'i' }),
      h('div', { html: todos
        ? '<b>' + todos + ' placeholder' + (todos === 1 ? '' : 's') + ' remain.</b> Search the draft for <span class="mono">class="todo"</span> — the sidebar dots mark which panels.'
        : 'No placeholders left. The draft is ready to ship.' }),
    ]));

    var payload = publishPayload();
    panel.appendChild(h('div', { class: 'card' }, [
      h('header', {}, [h('h2', { text: 'What will be written' }), h('span', { class: 'spacer' }),
        h('span', { class: 'mono muted', style: { fontSize: '11px' },
          text: Object.keys(payload).length + ' changed sections · ' + bytes(JSON.stringify(payload).length) })]),
      h('div', { class: 'body' }, [
        h('table', { class: 'rows' }, [
          h('tr', {}, [h('td', { text: 'Content' }), h('td', { class: 'num', text: bytes(JSON.stringify(payload).length) }),
            h('td', { class: 'num', text: Object.keys(payload).join(', ') || 'no changes' })]),
          h('tr', {}, [h('td', { text: 'Design tokens' }), h('td', { class: 'num', text: bytes(JSON.stringify(designDiff()).length) }),
            h('td', { class: 'num', text: Object.keys(designDiff()).join(', ') || 'no changes' })]),
          h('tr', {}, [h('td', { text: 'Case palettes' }), h('td', { class: 'num', text: bytes(JSON.stringify(casesDiff()).length) }),
            h('td', { class: 'num', text: Object.keys(casesDiff()).join(', ') || 'no changes' })]),
        ]),
        h('div', { class: 'btn-row', style: { marginTop: '14px' } }, [
          h('button', { class: 'btn btn-sm', type: 'button', text: 'Download content.json', onclick: downloadRuntime }),
          h('button', { class: 'btn btn-sm', type: 'button', text: 'Download baked index.html', onclick: downloadBaked }),
          h('button', { class: 'btn btn-sm', type: 'button', text: 'Download the whole draft (.json)',
            onclick: function () {
              download('as-cms-draft.json', JSON.stringify({ content: State.content, design: State.design,
                cases: State.cases }, null, 2), 'application/json');
            } }),
        ]),
      ]),
    ]));

    panel.appendChild(h('div', { class: 'card' }, [
      h('header', {}, [h('h2', { text: 'Where the files go' })]),
      h('div', { class: 'body' }, [
        h('table', { class: 'rows' }, [
          h('tr', {}, [h('td', { text: 'content.json' }), h('td', { class: 'num', text: 'site/' }),
            h('td', { class: 'muted', text: 'Beside index.html. Needs http:// — browsers block the fetch from file://.' })]),
          h('tr', {}, [h('td', { text: 'index.html (baked)' }), h('td', { class: 'num', text: 'site/' }),
            h('td', { class: 'muted', text: 'Replaces the current file. Works from file:// and needs no fetch.' })]),
          h('tr', {}, [h('td', { text: 'palette-*.css' }), h('td', { class: 'num', text: 'anywhere' }),
            h('td', { class: 'muted', text: 'Applied by build/apply_case_palette.py, which rewrites the case study in place.' })]),
        ]),
      ]),
    ]));
    main.appendChild(panel);
    return main;
  }

  /* ══════════════════════════════════════════════════════════════════════
     REVISIONS
     ══════════════════════════════════════════════════════════════════════ */
  function revisionsPanel() {
    var main = clear(qs('#main'));
    var panel = h('div', { class: 'panel on' });
    panel.appendChild(h('div', { class: 'panel-head' }, [
      h('div', {}, [h('h1', { text: 'Revisions' }),
        h('p', { text: 'Every publish takes a snapshot. Snapshots live in this browser, so they survive a refresh but not a cleared cache — export anything you want to keep.' })]),
      h('div', { class: 'btn-row' }, [
        h('button', { class: 'btn', type: 'button', text: 'Snapshot the draft now', onclick: function () {
          Store.pushRevision({ at: Date.now(), label: 'Manual snapshot',
            content: publishPayload(), design: designDiff(), cases: casesDiff() })
            .then(function () { render(); toast('Snapshot stored', 'ok'); });
        } }),
        h('button', { class: 'btn', type: 'button', text: 'Export all', onclick: function () {
          Store.revisions().then(function (list) {
            download('as-cms-revisions.json', JSON.stringify(list, null, 2), 'application/json');
          });
        } }),
      ]),
    ]));

    var card = h('div', { class: 'card' });
    card.appendChild(h('header', {}, [h('h2', { text: 'History' })]));
    var body = h('div', { class: 'body' });
    Store.revisions().then(function (list) {
      if (!list.length) {
        body.appendChild(h('div', { class: 'empty', text: 'No revisions yet. Publish once and this fills up.' }));
      } else {
        var table = h('table', { class: 'rows' }, [
          h('thead', {}, [h('tr', {}, [h('th', { text: 'When' }), h('th', { text: 'Label' }),
            h('th', { text: 'Size' }), h('th', { text: '' })])]),
        ]);
        var tb = h('tbody');
        list.forEach(function (rev, i) {
          tb.appendChild(h('tr', {}, [
            h('td', { class: 'num', text: when(rev.at) }),
            h('td', { text: rev.label || '—' }),
            h('td', { class: 'num', text: bytes(JSON.stringify(rev.content || {}).length) }),
            h('td', {}, [h('div', { class: 'btn-row', style: { justifyContent: 'flex-end' } }, [
              h('button', { class: 'btn btn-sm', type: 'button', text: 'Load into draft',
                onclick: function () {
                  modal('Load this revision into the draft?',
                    h('p', { text: 'Your current draft is replaced by the snapshot from ' + when(rev.at) + '. Publish again to put it on the site.' }),
                    [{ label: 'Cancel' }, { label: 'Load', kind: 'btn-primary', onClick: function () {
                      State.content = ASCms.deepMerge(clone(window.SITE_CONTENT), rev.content || {});
                      if (rev.design) State.design = ASCms.deepMerge(clone(window.DESIGN_TOKENS), rev.design);
                      if (rev.cases) State.cases = ASCms.deepMerge(clone(window.CASE_STUDIES), rev.cases);
                      markDirty(); refreshPreview(); render(); toast('Revision loaded into the draft', 'ok');
                    } }]);
                } }),
              h('button', { class: 'btn btn-sm', type: 'button', text: 'Download',
                onclick: function () {
                  download('revision-' + new Date(rev.at).toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.json',
                    JSON.stringify(rev, null, 2), 'application/json');
                } }),
              h('button', { class: 'btn btn-sm btn-danger', type: 'button', text: 'Delete',
                onclick: function () {
                  var keep = list.filter(function (_, j) { return j !== i; });
                  lsSet(K.revs, keep); render(); toast('Revision deleted');
                } }),
            ]) ]),
          ]));
        });
        table.appendChild(tb);
        body.appendChild(table);
      }
      body.appendChild(h('div', { class: 'btn-row', style: { marginTop: '16px' } }, [
        h('button', { class: 'btn', type: 'button', text: 'Import revisions…', onclick: importRevisions }),
        list.length ? h('button', { class: 'btn btn-danger', type: 'button', text: 'Clear all history',
          onclick: function () {
            modal('Clear all revisions?', h('p', { text: 'This cannot be undone. Export first if you might want them.' }),
              [{ label: 'Cancel' }, { label: 'Clear', kind: 'btn-danger', onClick: function () {
                lsDel(K.revs); render(); toast('History cleared');
              } }]);
          } }) : null,
      ]));
    });
    card.appendChild(body);
    panel.appendChild(card);
    main.appendChild(panel);
    return main;
  }

  function importRevisions() {
    var input = h('input', { type: 'file', accept: '.json,application/json' });
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      if (!f) return;
      readFile(f).then(function (text) {
        var data = JSON.parse(text);
        var list = Array.isArray(data) ? data : [data];
        Store.revisions().then(function (existing) {
          lsSet(K.revs, list.concat(existing));
          render(); toast('Imported ' + list.length + ' revision' + (list.length === 1 ? '' : 's'), 'ok');
        });
      }).catch(function (e) { toast('Not a revisions file: ' + e.message, 'err'); });
    });
    input.click();
  }

  /* ══════════════════════════════════════════════════════════════════════
     SETTINGS & SECURITY
     ══════════════════════════════════════════════════════════════════════ */
  function settingsPanel() {
    var main = clear(qs('#main'));
    var panel = h('div', { class: 'panel on' });
    panel.appendChild(h('div', { class: 'panel-head' }, [
      h('div', {}, [h('h1', { text: 'Settings & security' })]),
    ]));

    /* security notice */
    panel.appendChild(h('div', { class: 'notice ' + (Store.remote ? 'info' : 'danger') }, [
      h('span', { class: 'ico', text: Store.remote ? 'i' : '!' }),
      h('div', { html: Store.remote
        ? 'Connected to <b>' + CONFIG.backendUrl + '</b>. The password is checked server-side and edits are shared by everyone who signs in.'
        : '<b>This is a static site with no server, so the password cannot be real security.</b> ' +
          'The hash lives in this file and in your browser; anyone who downloads the page can read the admin and could bypass the gate. ' +
          'It keeps casual visitors out and stops accidental edits — nothing more. For real access control, deploy the function in ' +
          '<span class="mono">backend/</span> and set <span class="mono">CONFIG.backendUrl</span>.' }),
    ]));

    /* backend */
    var backendInput = h('input', { type: 'url', value: CONFIG.backendUrl || '',
      placeholder: 'https://your-site.netlify.app/.netlify/functions',
      style: { width: '100%', padding: '9px 11px', border: '1px solid var(--line-2)',
               borderRadius: 'var(--r)', background: 'var(--bg)', fontFamily: 'var(--mono)', fontSize: '12px' } });
    panel.appendChild(h('div', { class: 'card' }, [
      h('header', {}, [h('h2', { text: 'Storage backend' }), h('span', { class: 'spacer' }),
        h('span', { class: 'state-pill', html: '<i></i>' + (Store.remote ? 'server' : 'this browser') })]),
      h('div', { class: 'body' }, [
        h('div', { class: 'field' }, [
          h('label', {}, [h('span', { text: 'API base URL' })]),
          backendInput,
          h('p', { class: 'hint', text: 'Leave empty to keep everything in this browser. The API needs /auth and /content — see backend/README.md.' }),
        ]),
        h('div', { class: 'btn-row' }, [
          h('button', { class: 'btn', type: 'button', text: 'Test the connection', onclick: function () {
            var url = backendInput.value.trim();
            if (!url) { toast('Enter a URL first.', 'err'); return; }
            fetch(url.replace(/\/$/, '') + '/auth').then(function (r) {
              toast(r.ok ? 'Reachable — HTTP ' + r.status : 'Responded with HTTP ' + r.status, r.ok ? 'ok' : 'err');
            }).catch(function (e) { toast('Not reachable: ' + e.message, 'err'); });
          } }),
          h('button', { class: 'btn btn-primary', type: 'button', text: 'Save & reconnect', onclick: function () {
            CONFIG.backendUrl = backendInput.value.trim() || null;
            lsSet('as-cms-config', { backendUrl: CONFIG.backendUrl });
            toast('Backend saved — reloading', 'ok');
            setTimeout(function () { location.reload(); }, 700);
          } }),
        ]),
      ]),
    ]));

    /* credentials */
    var rec = lsGet(K.auth, null) || {};
    var inp = function (type, placeholder) {
      return h('input', { type: type, placeholder: placeholder, autocomplete: 'off',
        style: { width: '100%', padding: '9px 11px', border: '1px solid var(--line-2)',
                 borderRadius: 'var(--r)', background: 'var(--bg)' } });
    };
    var userNow = inp('text', 'Current username'); userNow.value = rec.username || DEFAULT_CREDENTIALS.username;
    var pw1 = inp('password', 'Current password');
    var userNew = inp('text', 'New username (3+ characters)'); userNew.value = rec.username || DEFAULT_CREDENTIALS.username;
    var pw2 = inp('password', 'New password (8+ characters)');

    panel.appendChild(h('div', { class: 'card' }, [
      h('header', {}, [h('h2', { text: 'Admin account' }), h('span', { class: 'spacer' }),
        h('span', { class: 'state-pill', html: '<i></i>' + (rec.seeded ? 'default credentials' : 'custom credentials') })]),
      h('div', { class: 'body' }, [
        rec.seeded ? h('div', { class: 'notice warn' }, [
          h('span', { class: 'ico', text: '!' }),
          h('div', { html: 'You are still on the <b>seeded default credentials</b>. They were published in the ' +
            'project instructions, so treat them as known to everyone. Change both below — the warning clears ' +
            'as soon as you do.' })]) : null,
        h('div', { class: 'field' }, [h('label', {}, [h('span', { text: 'Current username' })]), userNow]),
        h('div', { class: 'field' }, [h('label', {}, [h('span', { text: 'Current password' })]), pw1]),
        h('div', { class: 'field' }, [h('label', {}, [h('span', { text: 'New username' })]), userNew]),
        h('div', { class: 'field' }, [h('label', {}, [h('span', { text: 'New password' })]), pw2,
          h('p', { class: 'hint', text: 'Leave the password fields as they are to change only the username, and vice versa.' })]),
        h('div', { class: 'btn-row' }, [
          h('button', { class: 'btn btn-primary', type: 'button', text: 'Update credentials', onclick: function () {
            var nu = (userNew.value || '').trim();
            var np = pw2.value || '';
            if (nu.length < 3) { toast('Username needs at least 3 characters.', 'err'); return; }
            if (np && np.length < 8) { toast('Use at least 8 characters for the password.', 'err'); return; }
            if (!np && nu === (rec.username || '')) { toast('Nothing to change.', 'err'); return; }
            if (!Auth.available()) {
              toast('WebCrypto is unavailable on this origin — serve over https:// or localhost to change credentials.', 'err');
              return;
            }
            /* an unchanged password field means "keep it", so read the current one */
            var targetPw = np || pw1.value;
            if (!targetPw) { toast('Enter your current password to confirm the change.', 'err'); return; }
            Store.changePassword(pw1.value, targetPw, (userNow.value || '').trim(), nu)
              .then(function () {
                pw1.value = ''; pw2.value = '';
                toast('Credentials updated — sign in with the new ones next time', 'ok');
                render();
              })
              .catch(function (e) { toast(e.message || 'Could not update credentials', 'err'); });
          } }),
          h('button', { class: 'btn', type: 'button', text: 'Sign out', onclick: function () {
            Store.logout(); location.reload();
          } }),
        ]),
        h('p', { class: 'hint', style: { marginTop: '14px' },
          text: 'Stored as a salted SHA-256 hash in this browser' +
                (Store.remote ? ' — or verified by your backend, if one is configured.' : '.') }),
      ]),
    ]));

    /* diagnostics */
    var diag = h('div', { class: 'body' });
    function paintDiag() {
      clear(diag);
      var rows = [
        ['Storage mode', Store.label()],
        ['Draft in storage', lsGet(K.draft, null) ? 'yes' : 'no'],
        ['Published in storage', lsGet(K.published, null) ? 'yes' : 'no'],
        ['Revisions stored', String((lsGet(K.revs, []) || []).length)],
        ['Draft size', bytes(JSON.stringify(publishPayload()).length)],
        ['Full content size', bytes(JSON.stringify(State.content).length)],
        ['Placeholders left', String(countTodos(State.content))],
        ['Signed in as', Auth.username() || '(none)'],
        ['Credentials', (lsGet(K.auth, null) || {}).seeded ? 'seeded defaults — change them' : 'custom'],
        ['WebCrypto', Auth.available() ? 'available' : 'unavailable (insecure context)'],
        ['fetch', typeof fetch === 'function' ? 'available' : 'unavailable'],
        ['Page origin', location.protocol + '//' + (location.host || 'file'),],
      ];
      var t = h('table', { class: 'rows' });
      rows.forEach(function (r) { t.appendChild(h('tr', {}, [h('td', { text: r[0] }), h('td', { class: 'num', text: r[1] })])); });
      diag.appendChild(t);
    }
    paintDiag();
    panel.appendChild(h('div', { class: 'card' }, [
      h('header', {}, [h('h2', { text: 'Diagnostics' }), h('span', { class: 'spacer' }),
        h('button', { class: 'btn btn-sm', type: 'button', text: 'Refresh', onclick: paintDiag })]),
      diag,
    ]));

    /* danger zone */
    panel.appendChild(h('div', { class: 'card', style: { borderColor: 'var(--danger)' } }, [
      h('header', {}, [h('h2', { text: 'Reset', style: { color: 'var(--danger)' } })]),
      h('div', { class: 'body' }, [
        h('div', { class: 'btn-row' }, [
          h('button', { class: 'btn btn-danger', type: 'button', text: 'Discard the draft', onclick: function () {
            modal('Discard the draft?', h('p', { text: 'Unsaved edits are lost. Published content and revisions are kept.' }),
              [{ label: 'Cancel' }, { label: 'Discard', kind: 'btn-danger', onClick: function () {
                lsDel(K.draft); lsDel(K.draftDesign); lsDel(K.draftCases); boot(true);
              } }]);
          } }),
          h('button', { class: 'btn btn-danger', type: 'button', text: 'Unpublish (revert the site to shipped content)', onclick: function () {
            modal('Unpublish?', h('p', { text: 'Removes the published content from storage, so the site falls back to the copy baked into index.html.' }),
              [{ label: 'Cancel' }, { label: 'Unpublish', kind: 'btn-danger', onClick: function () {
                lsDel(K.published); lsDel(K.publishedDesign); toast('Unpublished', 'ok'); boot(true);
              } }]);
          } }),
          h('button', { class: 'btn btn-danger', type: 'button', text: 'Erase everything for this site', onclick: function () {
            modal('Erase all CMS data?', h('p', { text: 'Draft, published content, revisions and the admin password are removed from this browser. Your files on disk are untouched.' }),
              [{ label: 'Cancel' }, { label: 'Erase', kind: 'btn-danger', onClick: function () {
                Object.keys(K).forEach(function (k) { lsDel(K[k]); });
                location.reload();
              } }]);
          } }),
        ]),
      ]),
    ]));

    main.appendChild(panel);
    return main;
  }


  /* ══════════════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════════════ */
  function render() {
    var id = State.activePanel;
    if (id === 'projects') return projectsPanel();
    if (id === 'design') return designPanel();
    if (id === 'cases') return casesPanel();
    if (id === 'media') return mediaPanel();
    if (id === 'publish') return publishPanel();
    if (id === 'revisions') return revisionsPanel();
    if (id === 'settings') return settingsPanel();
    if (id === 'preview') return previewPanel();
    if (SCHEMA[id]) return contentPanel(id);
    return contentPanel('hero');
  }

  function previewPanel() {
    var main = clear(qs('#main'));
    var panel = h('div', { class: 'panel on' });
    panel.appendChild(h('div', { class: 'panel-head' }, [
      h('div', {}, [h('h1', { text: 'Live preview' }),
        h('p', { text: 'The real page, driven by the draft. Edits appear as you type.' })]),
    ]));
    panel.appendChild(previewWidget());
    main.appendChild(panel);
    return main;
  }

  function previewWidget() {
    var wrap = h('div', { class: 'preview-wrap' });
    var width = '100%';
    var bar = h('div', { class: 'preview-bar' }, [
      h('span', { class: 'url', text: CONFIG.sitePath }),
      h('span', { class: 'spacer' }),
      h('div', { class: 'seg' }, [
        ['100%', 'Desktop'], ['820px', 'Tablet'], ['390px', 'Phone']].map(function (w) {
          return h('button', { type: 'button', class: w[0] === width ? 'on' : '', text: w[1],
            onclick: function (e) {
              width = w[0];
              qs('#previewFrame').style.width = w[0];
              qs('#previewFrame').style.margin = w[0] === '100%' ? '0' : '0 auto';
              qsa('.preview-bar .seg button').forEach(function (b) { b.classList.remove('on'); });
              e.currentTarget.classList.add('on');
            } });
        })),
      h('div', { class: 'seg' }, [
        h('button', { type: 'button', text: 'Light', onclick: function () { previewTheme('light'); } }),
        h('button', { type: 'button', text: 'Dark', onclick: function () { previewTheme('dark'); } }),
      ]),
      h('button', { class: 'btn btn-sm', type: 'button', text: 'Reload', onclick: loadPreview }),
      h('a', { class: 'btn btn-sm', href: CONFIG.sitePath, target: '_blank', rel: 'noopener', text: 'Open ↗' }),
    ]);
    var frame = h('iframe', { id: 'previewFrame', src: CONFIG.sitePath, title: 'Live preview of the portfolio' });
    frame.addEventListener('load', function () { setTimeout(pushDraft, 60); });
    wrap.appendChild(bar); wrap.appendChild(frame);
    return wrap;
  }

  function previewTheme(mode) {
    var frame = qs('#previewFrame');
    if (!frame || !frame.contentWindow) return;
    try {
      frame.contentWindow.postMessage({ type: 'as-cms-theme', mode: mode }, '*');
      frame.contentDocument.documentElement.setAttribute('data-theme', mode);
    } catch (e) { toast('Could not reach the preview frame.', 'err'); }
  }

  function loadPreview() {
    var frame = qs('#previewFrame');
    if (frame) frame.src = CONFIG.sitePath + '?_=' + Date.now();
  }

  function pushDraft() {
    var frame = qs('#previewFrame');
    if (!frame || !frame.contentWindow) return;
    /* same-origin: call the runtime directly; otherwise fall back to postMessage */
    try {
      if (frame.contentWindow.ASCms && frame.contentWindow.SITE_CONTENT) {
        frame.contentWindow.ASCms.apply(
          frame.contentWindow.ASCms.deepMerge(clone(frame.contentWindow.SITE_CONTENT), State.content),
          State.design, frame.contentDocument);
        frame.contentDocument.documentElement.setAttribute('data-cms', 'draft');
        return;
      }
    } catch (e) { /* cross-origin — use the channel below */ }
    frame.contentWindow.postMessage({ type: 'as-cms-preview', content: State.content, design: State.design }, '*');
  }

  /* ══════════════════════════════════════════════════════════════════════
     TOP BAR
     ══════════════════════════════════════════════════════════════════════ */
  function adminTheme(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    lsSet(K.theme, mode);
    var b = qs('#btnTheme');
    if (b) b.textContent = mode === 'dark' ? 'Light' : 'Dark';
  }
  function wireTopbar() {
    qs('#btnTheme').addEventListener('click', function () {
      adminTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
    qs('#btnSave').addEventListener('click', function () { saveDraft(); });
    qs('#btnPublish').addEventListener('click', publishFlow);
    qs('#btnLock').addEventListener('click', function () {
      Store.logout(); location.reload();
    });
    qs('#btnPreview').addEventListener('click', function () {
      go('preview');
    });
    qs('#backendLabel').textContent = Store.remote ? CONFIG.backendUrl : 'local storage';
    window.addEventListener('beforeunload', function (e) {
      if (State.dirty) { e.preventDefault(); e.returnValue = ''; }
    });
    document.addEventListener('keydown', function (e) {
      var mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 's') { e.preventDefault(); saveDraft(); }
      if (mod && e.shiftKey && e.key.toLowerCase() === 'p') { e.preventDefault(); publishFlow(); }
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     GATE
     ══════════════════════════════════════════════════════════════════════ */
  var Gate = {
    mode: 'login',
    init: function () {
      /* first run: seed the default credentials so the panel is usable at once */
      return Store.seed().then(function (seeded) {
        return Store.configured().then(function (isConfigured) {
          var needsSetup = !isConfigured;
          Gate.mode = needsSetup ? 'setup' : 'login';
          qs('#gateSetup').hidden = !needsSetup;
          qs('#gateLogin').hidden = needsSetup;
          qs('#gateTitle').textContent = needsSetup ? 'Create the admin account' : 'Sign in';
          qs('#gateSub').textContent = needsSetup
            ? 'First run — choose the username and password that guard this browser'
            : 'Content management for anupamsarkar.com';
          qs('#gateSubmit').textContent = needsSetup ? 'Create account' : 'Sign in';

          if (needsSetup) {
            qs('#setupUser').value = DEFAULT_CREDENTIALS.username;
            qs('#setupPw').value = DEFAULT_CREDENTIALS.password;
            qs('#setupPw2').value = DEFAULT_CREDENTIALS.password;
          } else {
            var known = Auth.username();
            if (known) qs('#loginUser').value = known;
            else qs('#loginUser').value = DEFAULT_CREDENTIALS.username;
            setTimeout(function () { (qs('#loginPw') || {}).focus && qs('#loginPw').focus(); }, 60);
          }
          Gate.paintNote(seeded);
        });
      });
    },

    paintNote: function (seeded) {
      var note = qs('#gateNote');
      var rec = lsGet(K.auth, null) || {};
      var lines = [];

      if (seeded || rec.seeded) {
        lines.push('<b>Default credentials are loaded</b> — username <span class="mono">' +
          DEFAULT_CREDENTIALS.username + '</span>, password <span class="mono">' +
          DEFAULT_CREDENTIALS.password + '</span>. Sign in, then change both under ' +
          'Settings &amp; security; this notice disappears once you do.');
      }
      if (!Auth.available()) {
        lines.push('<b>Insecure context.</b> This page was opened over <span class="mono">' +
          location.protocol + '</span>, so the browser hides WebCrypto and the password cannot be ' +
          'hashed properly. Serve over https:// or localhost for real hashing.');
      } else if (!Store.remote) {
        lines.push('<b>No server, so this is not access control.</b> The admin is a static file ' +
          'anyone can download and read. The password stops casual visitors and accidental edits — ' +
          'nothing more. For real authentication deploy <span class="mono">backend/</span> and set ' +
          '<span class="mono">CONFIG.backendUrl</span>.');
      } else {
        lines.push('Signed in against <b>' + CONFIG.backendUrl + '</b>, which verifies the password server-side.');
      }
      note.innerHTML = lines.map(function (l) { return '<p style="margin-bottom:9px">' + l + '</p>'; }).join('');
      note.style.color = '';
      if (!Auth.available()) note.style.color = 'var(--danger)';
    },

    msg: function (text, kind) {
      var el = qs('#gateMsg');
      el.textContent = text || '';
      el.className = 'gate-msg' + (kind ? ' ' + kind : '');
    },

    submit: function () {
      var btn = qs('#gateSubmit');
      btn.disabled = true;
      Gate.msg('');
      var run;
      if (Gate.mode === 'setup') {
        var u = (qs('#setupUser').value || '').trim();
        var a = qs('#setupPw').value, b = qs('#setupPw2').value;
        if (u.length < 3) run = Promise.reject(new Error('Username needs at least 3 characters.'));
        else if ((a || '').length < 8) run = Promise.reject(new Error('Use at least 8 characters for the password.'));
        else if (a !== b) run = Promise.reject(new Error('The two passwords do not match.'));
        else run = Store.setup(a, u);
      } else {
        run = Store.login(qs('#loginPw').value || '', (qs('#loginUser').value || '').trim());
      }
      run.then(function () {
        Gate.msg(Gate.mode === 'setup' ? 'Account created.' : 'Signed in.', 'ok');
        setTimeout(function () {
          qs('#gate').classList.add('hide');
          qs('#app').classList.add('on');
          boot(false);
        }, 260);
      }).catch(function (err) {
        Gate.msg(err.message || String(err), 'err');
        btn.disabled = false;
      });
    },
  };

  /* ══════════════════════════════════════════════════════════════════════
     BOOT
     ══════════════════════════════════════════════════════════════════════ */
  function boot(skipAuth) {
    /* a saved backend URL wins over the compiled-in default */
    var savedCfg = lsGet('as-cms-config', null);
    if (savedCfg && typeof savedCfg.backendUrl !== 'undefined') CONFIG.backendUrl = savedCfg.backendUrl || null;

    return Store.load('draft').then(function (draft) {
      return Store.load('published').then(function (pub) {
        var saved = (draft && (draft.content || draft.design)) ? draft : pub;
        var st = mergeState(saved);
        State.content = st.content; State.design = st.design; State.cases = st.cases;
        State.baseline = JSON.parse(JSON.stringify({
          content: publishPayload(), design: designDiff(), cases: casesDiff(),
        }));
        State.dirty = false;
        buildSidebar();
        wireTopbar();
        qs('#backendLabel').textContent = (Store.remote ? CONFIG.backendUrl : 'saved in ' + Store.label())
      + ' · ' + (Auth.username() || (lsGet(K.session, {}) || {}).user || 'admin');
        render();
        paintState();
        adminTheme(lsGet(K.theme, null) || 'light');
        if (saved === draft && draft && draft.content) toast('Draft restored — not yet published');
      });
    }).catch(function (e) {
      qs('#main').innerHTML = '';
      qs('#main').appendChild(h('div', { class: 'notice danger' }, [
        h('span', { class: 'ico', text: '!' }),
        h('div', { html: 'The admin could not start: <b>' + (e && e.message || e) + '</b><br>' +
          'Check that <span class="mono">content.js</span> and <span class="mono">cms-runtime.js</span> sit beside <span class="mono">admin.html</span>.' }),
      ]));
    });
  }

  /* ── start ─────────────────────────────────────────────────────────────── */
  if (!window.SITE_CONTENT || !window.SCHEMA) {
    document.addEventListener('DOMContentLoaded', function () {
      qs('#gate').innerHTML = '<div class="gate-card"><h1>Missing content model</h1>' +
        '<p class="sub">content.js did not load. It must sit in the same folder as admin.html.</p></div>';
    });
    return;
  }
  document.addEventListener('DOMContentLoaded', function () {
    qs('#gateForm').addEventListener('submit', function (e) {
      e.preventDefault();
      Gate.submit();
    });
    Gate.init();
  });

  window.ASCmsAdmin = { State: State, CONFIG: CONFIG, Store: Store, Auth: Auth, Gate: Gate,
    DEFAULT_CREDENTIALS: DEFAULT_CREDENTIALS, go: go, render: render, boot: boot,
    publishPayload: publishPayload, countTodos: countTodos };

})();
