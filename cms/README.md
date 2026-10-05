# CMS — how it fits together

A content management system for a site that has no server. Everything is plain
files; publishing means writing files back.

```
site/index.html          the portfolio, annotated with data-cms markers
site/*.html              the four case studies (untouched by the CMS)

cms/admin.html           the admin UI — open this
cms/admin.js             the app (login, panels, export, revisions)
cms/content.js           GENERATED: the content model, tokens, palettes, schema
cms/cms-runtime.js       applies published content to site/index.html at load

backend/                 optional serverless auth + storage (see backend/README.md)
build/                   the generators and the test suite
```

Open **`cms/admin.html`** in a browser.

### Signing in

The gate takes a **username and password**. On first run the admin seeds these
defaults so the panel is usable immediately:

```
username  asarkar57
password  123!@#Aps
```

The username is prefilled and the login screen prints both until you change
them. To change: **Settings & security → Admin account** — you can replace the
username, the password, or both (it asks for the current pair first). The
"seeded default credentials" warning clears as soon as you do.

> The admin is deliberately **not linked from the public site**. Reach it by URL:
> `your-domain.com/cms/admin.html`. Linking it advertises the door.

> **Those defaults are not secret.** They are written in this file and in
> `admin.js` (`DEFAULT_CREDENTIALS`), and with no backend the whole admin is a
> publicly downloadable static file. Change them, and read *Security, plainly*
> below for what a static-site password can and cannot do.

---

## The two publishing modes

The site ships with all copy baked into `index.html`, so it is complete and
correct with JavaScript disabled. The CMS is an overlay, and you choose how the
overlay is delivered:

**Runtime mode — `content.json`**
Download `content.json` and drop it in `site/`. `index.html` is untouched; it
fetches the JSON at load and applies only the keys present. Small diffs, clean
history. Needs `http://` — browsers block `fetch()` from `file://`.

**Baked mode — a new `index.html`**
Downloads a complete `index.html` with your content written into the markup, the
CMS scripts removed, and the payload embedded as JSON tags. No fetch, no
dependency, works from the filesystem, and is what you want for an archive copy
or a host with no JS.

Both come from the same **Publish…** dialog, so you can ship one and keep the
other as a backup.

### What gets stored

Only what differs from the shipped defaults. A typical edit produces a ~2 KB
`content.json` rather than a ~45 KB dump of the whole model, and rebuilding
`content.js` later won't silently overwrite your changes.

---

## What you can edit

**Content** — nine panels covering every string on the page: SEO, header & both
navs, hero, the three philosophy tenets, experience, the Works section, project
cards, AI Practices, contact & footer. Repeating blocks (roles, cards, stages,
practices, guardrails, nav links, footer links) can be added, duplicated,
reordered and deleted.

Rich-text fields get a small toolbar that emits the site's own classes —
`<b>`, `.it`, `.hl`, `.mut` — plus a **Source** button, so the HTML is never
hidden behind the UI.

**Design system** — every CSS custom property behind `:root` and
`[data-theme="dark"]`, with colour pickers, a live swatch, and a contrast badge
computed against `--bg` and `--card` for the mode you're editing. Below it, a
contrast table checks the six text/background pairs the page actually uses.

**Case-study palettes** — each case study's dark palette beside its light-mode
counterpart. Editing here does **not** rewrite the 1.5 MB case studies from the
browser; it exports a small CSS patch:

```bash
python3 build/apply_case_palette.py smart-mining palette-smart-mining.css
```

The patch is injected as a marked block after the generated theme block, so it
wins the cascade. Re-running replaces the previous patch and touches nothing
else; `--remove` restores the file byte-for-byte.

**Media** — project-card artwork, either inline SVG or an uploaded image embedded
as a data URI (drag-and-drop, with a size budget warning because data URIs add
directly to page weight). There's a weight report at the bottom.

**Revisions** — every publish takes a snapshot. Load one back into the draft,
download it, delete it, or export/import the whole history. Snapshots live in
the browser, so export anything you want to keep.

---

## Security, plainly

With no backend, the username is stored in plaintext (it is not a secret — the
login form prefills it) and the password as a salted SHA-256 hash in your
browser. **Anyone who downloads `admin.html` can read it and could bypass the
gate.** It prevents accidental edits and keeps casual visitors out — it is not
access control, and the admin says so on the login screen and in Settings.

One consequence worth knowing: opened from `file://` the browser hides WebCrypto,
so the hash degrades to a non-cryptographic digest and the login screen tells you
so in red. Serve over `https://` or `localhost` for real hashing.

For real authentication, deploy `backend/` and set the API base URL in Settings.
That is a configuration change; the UI is identical either way. See
`backend/README.md`.

Two consequences of a static admin worth knowing: edits live in *your* browser
until you publish and upload, and the public can download the admin's code (not
your content — content only exists in `content.json` once you put it there).

---

## Regenerating the content model

`content.js` is generated, never hand-edited. It is built from the live files so
the admin always starts from exactly what the site says:

```bash
node build/extract_svgs.py 2>/dev/null || python3 build/extract_svgs.py   # card artwork
node build/extract_content.js          # every string in site/index.html
python3 build/gen_content.py           # palettes + tokens from the case studies
python3 build/make_content_js.py       # assemble cms/content.js
```

Run this after you change the site by hand. The schema — which fields exist,
their labels, types, hints and limits — lives in `cms/_schema.part.js`; add a
field there and it appears in the admin, in validation and in the export at once.

---

## Tests

```bash
node build/cmstest.js       # the site with and without published content
node build/admintest.js     # 59 checks: gate, every panel, edit, save, publish, export
node build/e2e_bake.js      # 22 checks: edit -> baked export -> static page with no CMS
node build/backendtest.js   # 28 checks: auth, tokens, rate limiting, validation
```

The end-to-end one is the important test: it bakes an export exactly as the admin
does, then opens it as a plain static file over `file://` with no CMS scripts and
no storage, and asserts the edits are in the markup.

---

## Known limits

* `content.json` needs `http://`. Open the site from the filesystem and the
  fetch is blocked — use baked mode there.
* The live preview iframe only works over `http://` too (same reason). Editing
  still works from `file://`; you just won't see the preview until you serve it.
  A one-liner is enough: `python3 -m http.server` from the project root.
* Data-URI images bloat every page that carries them. The Media panel warns above
  400 KB; remote images are disabled in `CONFIG` unless you explicitly allow them.
* Revisions are stored in the browser and are dropped if the archive would exceed
  ~4 MB — oldest first.
* The admin edits the portfolio. Case-study *copy* is not editable from it; only
  their palettes are, via the CSS patch.
