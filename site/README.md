# Anupam Sarkar — portfolio + case studies

Five self-contained HTML files. No build step, no dependencies — open `index.html`
in a browser, or drop the whole folder on any static host (Netlify, Vercel,
GitHub Pages, S3).

```
index.html                            portfolio (rewritten, 4 clickable projects)
                                      sections: 01 Philosophy · 02 Experience ·
                                      03 Works · 04 AI Practices · Contact
smart-mining-case-study.html          Smart Mining Management System  (STAR)
falcon-view-case-study.html           Falcon View — smart hospital management
incident-management-case-study.html   Incident Management System for MS Teams
bt-billing-case-study.html            BT Business Billing — "From the Notebook"
```

## The AI Practices section is a shell

Section 04 is built and wired into both navs (desktop + mobile), but its copy is
placeholder. 44 spans carry `class="todo"` and render with an amber dashed
highlight so nothing ships half-written by accident:

* **The augmented pipeline** — 5 stages, each split into what AI does (`AI`) and
  what stays human (`YOU`). Scrolls horizontally, stacks on mobile.
* **Practices & proof points** — 6 cards, each with `Do` / `With` / the number it moved.
* **Where I don't use AI** — 3 guardrails, numbered automatically.

To fill it in: search `index.html` for `class="todo"`, replace the inner text, and
drop the `.todo` class from each span once it holds real copy. Delete the
`<p class="fill-in">` reminder when you're done. Add or remove `.stage` /
`.practice` blocks freely — the grid and the numbering adapt.

After editing `site/index.html`, rebuild the downloads:

```
cd build && python3 build_download.py
```

## Editing the site: the CMS

`cms/admin.html` is a full content manager for `index.html` — copy, design tokens,
case-study palettes, card artwork, revisions, and two publishing modes (a small
`content.json`, or a fully baked standalone `index.html`).

Sign in with the seeded credentials:

```
username  asarkar57
password  123!@#Aps
```

Then change them under **Settings & security → Admin account**. Read
`cms/README.md` before relying on them: with no backend, a static-site password
stops accidental edits, not an attacker.

`index.html` carries `data-cms` markers and `<template>` blocks for this, and
loads `cms/content.js` + `cms/cms-runtime.js`. With nothing published the runtime
stands aside and the baked copy renders — the page is complete with JS disabled.

## Dark / light mode

All five pages share one preference, stored in `localStorage` under the key
`as-theme`. Flip the theme anywhere and it applies everywhere, including pages
already open in other tabs.

| Page | Default | Light mode is |
|---|---|---|
| `index.html` | follows your OS | the native theme |
| Smart Mining | dark | a hand-tuned paper palette |
| Falcon View | dark | a hand-tuned paper palette |
| Incident Management | dark | a hand-tuned paper palette |
| BT Billing | dark (the "studio desk") | the original notebook paper it was authored on |

The toggle sits in the top-right of every case study, next to a **← Index** link
back to the portfolio. Theme is applied by an inline script in `<head>` before
first paint, so there is no flash of the wrong theme.

### How the case-study themes work

Three of the case studies were "dark-committed": their palettes live in `:root`
variables, but ~700 additional colours were hard-coded inline inside the SVG
diagrams (`fill="#141418" stroke="#37373f"`), which variables alone can't reach.

So every colour literal was **tokenised** into a CSS custom property. The dark
table re-declares each token at its original value — which is why dark mode is
pixel-identical to the file you sent — and the light table re-declares the whole
set at once, so the diagrams flip along with the page. SVG presentation
attributes accept `var()` in every modern browser (Chrome 85+, Safari 16.4+,
Firefox 128+).

BT needed different treatment: it was authored light and then had a
"DARK STUDIO RE-THEME" layer painted over it, so light mode re-asserts the paper
palette and neutralises the desk layer, keeping the re-theme's neutral upgrades
(one type family, 12px floor, monoline icons).

Product screenshots are never inverted — they stay exactly as authored.

## What was verified

* dark mode renders identically to your originals (every token maps back to an
  original colour literal; visible text and all 38 embedded screenshots
  byte-identical)
* every inline SVG (105 of them) parses, and none paints light ink on a
  saturated fill in light mode
* all text/background pairs the pages actually use clear **4.5:1** in light mode;
  white chip labels clear 4.55:1 at worst
* all inline JavaScript passes `node --check`, and the theme toggle, mobile nav,
  scroll reveals and all four card links were exercised in a headless DOM
* only the two agreed copy edits were made: `A7 · Framework` → `A7 · Works`
  (Smart Mining) and `KPI framework` → `KPI Works` (Falcon View)

## Still to fill in

* **LinkedIn URL** — `index.html` currently points at `https://www.linkedin.com/`.
  Search for `linkedin.com/` and put your profile slug in.
* **Portfolio domain** — the footer "Portfolio" link was removed as self-referential;
  add it back if this lives at a different URL than the portfolio.
* The Siemens `#NextWork` case study isn't linked (you sent four). To add it as a
  fifth card, drop the file in this folder and copy one `<a class="work-card">`
  block in the Works section.
