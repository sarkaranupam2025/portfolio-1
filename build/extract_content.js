/* Extract cms/_content.json from site/index.html.

   The CMS defaults must be exactly what the site already says, so they are read
   out of the shipped markup rather than retyped. Rich-text fields keep their
   inline HTML (<span class="hl">, <b>, <span class="it">, <br>) because that
   emphasis is part of the design.

   <template data-cms-template> blocks are skipped: they hold {{placeholder}}
   skeletons, and jsdom keeps template content out of querySelectorAll anyway. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.dirname(__dirname);
const SITE = path.join(ROOT, 'site');
const CMS = path.join(ROOT, 'cms');

const dom = new JSDOM(fs.readFileSync(path.join(SITE, 'index.html'), 'utf8'));
const d = dom.window.document;

const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
const rich = (el) => (el ? el.innerHTML.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim() : '');
const all = (sel) => [...d.querySelectorAll(sel)];
const cms = (sel) => d.querySelector('[data-cms="' + sel + '"]');

const c = {};

/* ── meta ─────────────────────────────────────────────────────────────── */
c.meta = {
  title: txt(d.querySelector('title')),
  description: d.querySelector('meta[name="description"]').getAttribute('content'),
  lang: d.documentElement.getAttribute('lang'),
};

/* ── header ───────────────────────────────────────────────────────────── */
c.header = {
  logoName: txt(cms('header.logoName')),
  logoRole: txt(cms('header.logoRole')),
  nav: all('nav[aria-label="Primary"] .nav-link').map(a => ({
    label: txt(a), href: a.getAttribute('href'),
  })),
  navMobile: all('#mobileNav a').map(a => ({
    label: a.childNodes[0].textContent.trim(),
    sub: txt(a.querySelector('small')),
    href: a.getAttribute('href'),
  })),
  themeLabelDark: txt(d.getElementById('themeToggle')),
};

/* ── hero ─────────────────────────────────────────────────────────────── */
const eyebrows = all('.hero-top .eyebrow');
c.hero = {
  eyebrowLeft: txt(eyebrows[0]),
  eyebrowRight: txt(eyebrows[1]),
  h1First: txt(cms('hero.h1First')),
  h1Last: txt(cms('hero.h1Last')),
  statement: rich(cms('hero.statement')),
  stats: all('.hero-stats .stat').map(s => ({
    value: txt(s.querySelector('b')), label: txt(s.querySelector('span')),
  })),
  scrollCue: rich(cms('hero.scrollCue')),
};

/* ── section furniture (label number + name, heading, standfirst) ──────── */
const SECTION = { philosophy: '#philosophy', experience: '#experience',
                  works: '#works', ai: '#ai-practices' };
const furniture = (key) => ({
  labelNum: txt(cms(key + '.labelNum')),
  labelText: txt(cms(key + '.labelText')),
  heading: rich(d.querySelector(SECTION[key] + ' .section-head h2')),
  lede: rich(d.querySelector(SECTION[key] + ' .lede')),
});

/* ── philosophy ───────────────────────────────────────────────────────── */
c.philosophy = Object.assign(furniture('philosophy'), {
  tenets: all('#philosophy .tenet').map(t => ({
    n: txt(t.querySelector('.n')),
    title: txt(t.querySelector('h3')),
    body: rich(t.querySelector('div > p')),
  })),
  kicker: rich(cms('philosophy.kicker')),
});

/* ── experience ───────────────────────────────────────────────────────── */
c.experience = Object.assign(furniture('experience'), {
  items: all('#experience .exp-item').map(e => ({
    year: txt(e.querySelector('.exp-year')),
    role: txt(e.querySelector('.exp-details h3')),
    org: txt(e.querySelector('.exp-org')),
    body: rich(e.querySelector('.exp-details p')),
    location: txt(e.querySelector('.exp-loc')),
    scope: txt(e.querySelector('.exp-scope')),
  })),
});

/* ── works (the cards themselves come from gen_content.py) ────────────── */
c.works = Object.assign(furniture('works'), {
  shelfLabel: txt(cms('works.shelfLabel')),
  frames: all('#works .frame').map(f => ({
    n: txt(f.querySelector('.n')),
    title: rich(f.querySelector('h3')),
    body: rich(f.querySelector('p')),
  })),
  footnote: rich(cms('works.footnote')),
});

/* ── ai practices ─────────────────────────────────────────────────────── */
c.ai = Object.assign(furniture('ai'), {
  pipelineLabel: txt(cms('ai.pipelineLabel')),
  pipeline: all('#ai-practices .stage').map(s => ({
    n: txt(s.querySelector('.idx')),
    title: txt(s.querySelector('h3')),
    ai: rich(s.querySelector('.split .ai span')),
    human: rich(s.querySelector('.split .hu span')),
  })),
  pipelineKey: all('#ai-practices .pipeline-key span').map(s => rich(s)),
  practicesLabel: txt(cms('ai.practicesLabel')),
  practices: all('#ai-practices .practice').map(p => ({
    n: txt(p.querySelector('.n')),
    title: txt(p.querySelector('h3')),
    what: rich(p.querySelectorAll('.row span')[0]),
    withWhat: rich(p.querySelectorAll('.row span')[1]),
    proof: rich(p.querySelector('.proof')),
  })),
  guardHeading: rich(cms('ai.guardHeading')),
  guardrails: all('#ai-practices .guard li').map(li => rich(li)),
  fillIn: rich(cms('ai.fillIn')),
});

/* ── contact ──────────────────────────────────────────────────────────── */
c.contact = {
  heading: rich(cms('contact.heading')),
  email: txt(cms('contact.email')),
  emailHref: d.querySelector('.contact-link').getAttribute('href'),
  sub: rich(cms('contact.sub')),
  copyright: rich(cms('contact.copyright')),
  credential: txt(cms('contact.credential')),
  links: all('.footer-bottom div a').map(a => ({
    label: txt(a), href: a.getAttribute('href'),
    newTab: a.getAttribute('target') === '_blank',
  })),
};

/* ── sanity: nothing came back empty that shouldn't have ──────────────── */
const flat = [];
(function walk(o, p) {
  for (const k of Object.keys(o)) {
    const v = o[k], kp = p ? p + '.' + k : k;
    if (v && typeof v === 'object') walk(v, kp);
    else flat.push([kp, v]);
  }
})(c, '');
const empties = flat.filter(([, v]) => v === '' || v === undefined);
console.log('leaf fields: %d | empty: %d', flat.length, empties.length);
if (empties.length) console.log('   ', empties.map(e => e[0]).join(', '));
console.log('counts -> nav %d, stats %d, tenets %d, experience %d, frames %d, stages %d, practices %d, guardrails %d',
  c.header.nav.length, c.hero.stats.length, c.philosophy.tenets.length, c.experience.items.length,
  c.works.frames.length, c.ai.pipeline.length, c.ai.practices.length, c.ai.guardrails.length);

fs.mkdirSync(CMS, { recursive: true });
fs.writeFileSync(path.join(CMS, '_content.json'), JSON.stringify(c, null, 2));
console.log('wrote cms/_content.json', (fs.statSync(path.join(CMS, '_content.json')).size / 1024).toFixed(1), 'KB');
if (empties.length) process.exitCode = 1;
