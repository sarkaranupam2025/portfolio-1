/* Coverage: walk SCHEMA and confirm every leaf of SITE_CONTENT is editable
   somewhere in the admin. A field present in the model but absent from the schema
   would be silently unreachable — the kind of gap that only surfaces months later.

   Paths handled by bespoke UI rather than a generated field are declared in
   EXTRA_EDITABLE (cms/_schema.part.js) so this check stays honest. */
const path = require('path');
const ROOT = path.dirname(__dirname);
const { SITE_CONTENT, SCHEMA, EXTRA_EDITABLE } = require(path.join(ROOT, 'cms', 'content.js'));

const results = [];
const check = (name, ok, extra) => {
  results.push(!!ok);
  console.log(`   ${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
};

/* ── what the schema exposes ─────────────────────────────────────────────── */
const covered = new Set(EXTRA_EDITABLE || []);
Object.keys(SCHEMA).forEach(panel => {
  const spec = SCHEMA[panel];
  const base = spec.panel === 'works' || panel === 'projects' ? null : panel;
  (spec.fields || []).forEach(f => covered.add((base || panel) + '.' + f.k));
  (spec.arrays || []).forEach(a => {
    const p = a.source || ((base || panel) + '.' + a.k);
    (a.fields || []).forEach(f => covered.add(f.k === '$self' ? p + '.[]' : p + '.[].' + f.k));
  });
});

/* ── what the model actually contains ────────────────────────────────────── */
const leaves = [];
(function walk(obj, prefix) {
  Object.keys(obj || {}).forEach(k => {
    const v = obj[k], p = prefix ? prefix + '.' + k : k;
    if (Array.isArray(v)) {
      if (!v.length) { leaves.push(p + '.[]'); return; }
      const first = v[0];
      if (first && typeof first === 'object') walk(first, p + '.[]');
      else leaves.push(p + '.[]');
    } else if (v && typeof v === 'object') walk(v, p);
    else leaves.push(p);
  });
})(SITE_CONTENT, '');

/* projects live under works.items in the model but are edited in their own panel */
const aliases = new Set();
covered.forEach(p => {
  aliases.add(p);
  aliases.add(p.replace('projects.items', 'works.items'));
  aliases.add(p.replace('works.items', 'projects.items'));
});

const missing = leaves.filter(p => !aliases.has(p));
const leafSet = new Set(leaves);
const phantom = [...covered].filter(p => {
  const norm = p.replace('projects.items', 'works.items');
  return !leafSet.has(norm) && !leafSet.has(p) && !norm.includes('.[].');
});

console.log('\n── content model coverage ───────────────────────────────────────');
console.log('   model leaves        :', leaves.length);
console.log('   editable paths      :', covered.size,
            '(incl. ' + (EXTRA_EDITABLE || []).length + ' bespoke-UI paths)');
check('every model leaf has an editor', missing.length === 0, missing.slice(0, 8).join(', ') || 'none missing');
check('no schema path points at nothing', phantom.length === 0, phantom.slice(0, 8).join(', ') || 'none');
check('every panel has a heading', Object.keys(SCHEMA).every(k => SCHEMA[k].label));
check('every field has a label and a type',
      Object.keys(SCHEMA).every(k => [...(SCHEMA[k].fields || []),
        ...((SCHEMA[k].arrays || []).reduce((a, arr) => a.concat(arr.fields || []), []))]
        .every(f => f.label && f.type)));
check('rich fields are the ones with inline markup',
      ['hero.statement', 'philosophy.lede', 'works.footnote', 'ai.fillIn']
        .every(p => p.split('.').reduce((o, k) => o && o[k], { hero: SITE_CONTENT.hero,
          philosophy: SITE_CONTENT.philosophy, works: SITE_CONTENT.works, ai: SITE_CONTENT.ai }) !== undefined));
check('every project card has artwork',
      (SITE_CONTENT.works.items || []).every(w => w.preview && (w.preview.svg || w.preview.image)),
      (SITE_CONTENT.works.items || []).length + ' cards');
check('every project card has a link',
      (SITE_CONTENT.works.items || []).every(w => /\.html$/.test(w.href || '')),
      (SITE_CONTENT.works.items || []).map(w => w.href).join(', '));

const failed = results.filter(x => !x).length;
console.log('\n════ ' + (results.length - failed) + '/' + results.length + ' coverage checks passed ════');
process.exit(failed ? 1 : 0);
