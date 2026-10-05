# Anupam Sarkar — portfolio, case studies and CMS

A static portfolio site, four long-form case studies with real dark/light themes,
and a content management system that needs no server.

```
site/     the published site — index.html plus four case studies
cms/      the admin panel, its content model, and the runtime that applies it
backend/  optional serverless functions for real authentication
build/    the generators, the palette applier and the test suite
download/ ready-to-send single-file builds
```

Open **`site/index.html`** to see the portfolio.
Open **`cms/admin.html`** to edit it.

---

## The site

| File | What it is |
|---|---|
| `site/index.html` | Portfolio: hero, philosophy, experience, four clickable project cards, AI Practices, contact |
| `site/smart-mining-case-study.html` | Smart Mining Management System — STAR format, zero-to-one |
| `site/falcon-view-case-study.html` | Falcon View — smart hospital management, role-aware |
| `site/incident-management-case-study.html` | Incident Management System for Microsoft Teams |
| `site/bt-billing-case-study.html` | BT Business Billing — "From the Notebook" |

All five pages share one theme preference (`localStorage['as-theme']`), applied by
an inline script before first paint so there is no flash, and synced across open
tabs. Case studies carry a **← Index** link back to the portfolio.

`download/anupam-sarkar-portfolio-ALL-IN-ONE.html` is the same portfolio with all
four case studies embedded (gzip + base64) in one 3.4 MB file. Clicking a card
inflates the study into a Blob and opens it in a new tab — or in an in-page reader
if the popup is blocked — so it works offline with nothing else on disk.

### How the case-study themes work

Three of the studies were "dark-committed": their palettes live in `:root`
variables, but ~700 further colours were hard-coded inline inside the SVG
diagrams, which variables cannot reach. So every colour literal was **tokenised**
into a custom property. Dark mode re-declares each token at its original value —
which is why dark mode is provably identical to the source files — and light mode
re-declares the whole set, so the diagrams flip with the page.

BT was authored light and had a "DARK STUDIO RE-THEME" painted over it, so its
light mode restores the paper palette and neutralises the desk layer instead.

Product screenshots are never inverted.

---

## The CMS

`cms/admin.html` — sign in with the seeded credentials:

```
username  asarkar57
password  123!@#Aps
```

They are printed on the login screen until you change them, under
**Settings & security → Admin account**.

The admin edits every string on the portfolio (schema-driven forms, rich text with
the site's own emphasis classes), all 30 design tokens for light and dark with
per-token contrast checking, the four case-study palettes, card artwork, and
revision history. Publishing produces either a ~2 KB `content.json` diff or a
fully baked standalone `index.html`.

> **Read this before relying on the password.** With no backend the admin is a
> static file anyone can download, so these credentials stop accidental edits and
> casual visitors — they are not access control. `backend/` adds PBKDF2-SHA256
> server-side verification, HMAC sessions, rate limiting and shared storage;
> pointing the admin at it is a settings change, not a rewrite.
> See `cms/README.md` and `backend/README.md`.

`site/index.html` is annotated with `data-cms` markers and `<template>` blocks for
this. With nothing published the runtime stands aside and the baked copy renders —
the page is complete with JavaScript disabled.

---

## Running it locally

```bash
python3 -m http.server 8000
```

* <http://localhost:8000/site/index.html> — the portfolio
* <http://localhost:8000/cms/admin.html> — the admin

Serving over http is worth doing: `content.json` and the admin's live preview both
use `fetch()`, which browsers block from `file://`. Everything else works from the
filesystem, and the baked export always works.

The test suite needs jsdom:

```bash
cd build && npm install
```

---

## Tests — 235 checks

```bash
cd build
node cmstest.js       # 28  the site with and without published content
node admintest.js     # 70  gate, every panel, edit, reorder, save, publish, export
node credtest.js      # 28  the credential lifecycle, against real SHA-256
node e2e_bake.js      # 28  edit -> baked export -> static page with no CMS at all
node backendtest.js   # 48  auth, tokens, rate limiting, input validation
node bundletest.js    # 26  the all-in-one file: payloads, UI, lightweight build
node bundle_e2e.js    # 13  decode chain, card click, popup fallback, save-as
node coverage.js      #  7  every leaf of the content model is reachable from the admin
```

```bash
python3 verify_cases.py        # the shipped case studies vs their sources
python3 apply_case_palette.py --list
```

`verify_cases.py` is the one to run after touching a case study: it proves every
dark token still maps to an original colour literal, that no colour literal
survives outside the injected block, that visible text and all 38 embedded
screenshots are byte-identical, and that any admin palette patch sits after the
generated block so it wins the cascade.

---

## Publishing to GitHub

The repository is configured for `sarkaranupam2025/Anupam-Portfolio-`. From the
project root:

```bash
bash push-to-github.sh                                          # uses that URL
bash push-to-github.sh https://github.com/you/some-repo.git     # or any other
```

It initialises git if needed, commits, and pushes to `main`. GitHub no longer
accepts account passwords over HTTPS, so when prompted paste a **Personal Access
Token** (github.com → Settings → Developer settings → Fine-grained tokens →
repository access: just that repo → Contents: **Read and write**).

If the repository does not exist yet, create it first and **don't** add a README,
`.gitignore` or licence — an empty remote makes the first push clean.

Two remotes are preconfigured, so you can push to either:

```bash
git push -u origin main          # Anupam-Portfolio-
git push -u portfolio-1 main     # portfolio-1
```

---

## Deploying

**GitHub Pages** — Settings → Pages → deploy from branch, root, `/main`. The site
lands at `https://sarkaranupam2025.github.io/portfolio-1/site/`. `site/.nojekyll`
is already there.

To serve the portfolio at the domain root instead, move the contents of `site/` to
the repository root and change `CONFIG.sitePath` in `cms/admin.js` from
`../site/index.html` to `index.html`.

**Netlify / Vercel / Cloudflare Pages** — set the publish directory to `site/`.
Copy `cms/` alongside it if you want the admin online too, and put it behind
host-level auth (see `backend/README.md`). Add the two functions in `backend/` for
real authentication.

**Anywhere else** — they are static files. Upload `site/` and you are done.

---

## Regenerating

`cms/content.js` is generated from the live files so the admin always starts from
exactly what the site says. After editing the site by hand:

```bash
cd build
python3 extract_svgs.py       # card artwork   -> cms/_svgs.json
node extract_content.js       # every string   -> cms/_content.json
python3 gen_content.py        # palettes       -> cms/_data.json
python3 make_content_js.py    # assemble       -> cms/content.js
```

Rebuild the single-file downloads:

```bash
python3 build_download.py && python3 package.py
```

Apply an admin-exported palette patch to a case study:

```bash
python3 apply_case_palette.py smart-mining palette-smart-mining.css
python3 apply_case_palette.py smart-mining --remove   # byte-identical restore
```

The schema — which fields exist, with what labels, types, hints and limits — lives
in `cms/_schema.part.js`. Add a field there and it appears in the admin, in
validation and in the export at the same time; `coverage.js` then proves it is
reachable.

---

## Still to fill in

* **LinkedIn URL** — `site/index.html` points at `https://www.linkedin.com/`.
  Search for `linkedin.com/`, or edit it in the admin under Contact & footer.
* **AI Practices** — the section is built and wired into both navs, but its copy is
  placeholder. 44 spans carry `class="todo"` and render with an amber dashed
  highlight; the admin counts them, dots the sidebar panel, and warns at publish.
* **Siemens `#NextWork`** is not linked. Add a card in the admin, or copy one
  `<a class="work-card">` block.
