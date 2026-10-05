// ══════════════════════════════════════════════════════════════════════════
//  SCHEMA — drives every form in admin.html. One description of the content
//  model, so adding a field here adds it to the admin, the validation and the
//  export at the same time.
//
//  field types: text | rich | textarea | url | email | color | number | select
//  rich = inline HTML allowed; the admin gives it a mini formatting toolbar
//       (Bold, Italic, Highlight, Muted) that emits the site's own classes.
// ══════════════════════════════════════════════════════════════════════════
const SCHEMA = {
  meta: {
    label: 'SEO & document', icon: 'doc',
    fields: [
      { k: 'title', label: 'Browser title', type: 'text', max: 70,
        hint: 'Shown in the tab and in search results. Aim for 50–60 characters.' },
      { k: 'description', label: 'Meta description', type: 'textarea', max: 170,
        hint: 'The snippet under your name in search results. 140–160 characters.' },
      { k: 'lang', label: 'Language code', type: 'text', hint: 'BCP-47, e.g. en or en-GB.' },
    ],
  },

  header: {
    label: 'Header & navigation', icon: 'nav',
    fields: [
      { k: 'logoName', label: 'Logo — name', type: 'text' },
      { k: 'logoRole', label: 'Logo — role line', type: 'text',
        hint: 'The muted text after your name. Leave empty to drop it.' },
      { k: 'themeLabelDark', label: 'Theme button label (light mode)', type: 'text',
        hint: 'What the toggle reads while the page is light. It flips automatically in dark.' },
    ],
    arrays: [
      { k: 'nav', label: 'Desktop navigation', singular: 'link', max: 6,
        itemLabel: (it) => it.label || 'Untitled link',
        fields: [
          { k: 'label', label: 'Label', type: 'text' },
          { k: 'href', label: 'Target', type: 'text',
            hint: 'An anchor like #works, or any URL.' },
        ] },
      { k: 'navMobile', label: 'Mobile menu', singular: 'item', max: 6,
        itemLabel: (it) => it.label || 'Untitled item',
        fields: [
          { k: 'label', label: 'Label', type: 'text' },
          { k: 'sub', label: 'Subtitle', type: 'text', hint: 'The small line under the label.' },
          { k: 'href', label: 'Target', type: 'text' },
        ] },
    ],
  },

  hero: {
    label: 'Hero', icon: 'hero',
    fields: [
      { k: 'eyebrowLeft', label: 'Eyebrow — left', type: 'text' },
      { k: 'eyebrowRight', label: 'Eyebrow — right', type: 'text' },
      { k: 'h1First', label: 'Name — line 1', type: 'text', hint: 'The huge lockup breaks between the two lines.' },
      { k: 'h1Last', label: 'Name — line 2', type: 'text',
        hint: 'The styled period after this is fixed, so leave it out of the text.' },
      { k: 'statement', label: 'Statement', type: 'rich',
        hint: 'Highlight the phrase you want a reader to keep. Two highlights is plenty.' },
      { k: 'scrollCue', label: 'Scroll cue', type: 'rich' },
    ],
    arrays: [
      { k: 'stats', label: 'Stats', singular: 'stat', max: 4,
        itemLabel: (it) => it.value || 'Empty stat',
        fields: [
          { k: 'value', label: 'Figure', type: 'text', hint: 'Short: 13+, 340k, 4.' },
          { k: 'label', label: 'Caption', type: 'text' },
        ] },
    ],
  },

  philosophy: {
    label: '01 · Philosophy', icon: '01',
    fields: [
      { k: 'labelNum', label: 'Section number', type: 'text', hint: 'The bold figure in the gutter: 01.' },
      { k: 'labelText', label: 'Section name', type: 'text', hint: 'Philosophy.' },
      { k: 'heading', label: 'Heading', type: 'rich' },
      { k: 'lede', label: 'Standfirst', type: 'rich' },
      { k: 'kicker', label: 'Closing line', type: 'rich' },
    ],
    arrays: [
      { k: 'tenets', label: 'Tenets', singular: 'tenet', max: 6,
        itemLabel: (it) => it.title || 'Untitled tenet',
        fields: [
          { k: 'n', label: 'Number', type: 'text', hint: 'Shown in the gutter: 01, 02…' },
          { k: 'title', label: 'Title', type: 'text' },
          { k: 'body', label: 'Body', type: 'rich' },
        ] },
    ],
  },

  experience: {
    label: '02 · Experience', icon: '02',
    fields: [
      { k: 'labelNum', label: 'Section number', type: 'text' },
      { k: 'labelText', label: 'Section name', type: 'text' },
      { k: 'heading', label: 'Heading', type: 'rich' },
      { k: 'lede', label: 'Standfirst', type: 'rich' },
    ],
    arrays: [
      { k: 'items', label: 'Roles', singular: 'role', max: 12,
        itemLabel: (it) => [it.year, it.role].filter(Boolean).join(' · ') || 'Untitled role',
        fields: [
          { k: 'year', label: 'Years', type: 'text', hint: 'e.g. 2024 — Present' },
          { k: 'role', label: 'Role', type: 'text' },
          { k: 'org', label: 'Organisation & unit', type: 'text' },
          { k: 'body', label: 'What you did', type: 'rich',
            hint: 'Highlight the number. One or two sentences beats a paragraph.' },
          { k: 'location', label: 'Location', type: 'text' },
          { k: 'scope', label: 'Scope chip', type: 'text', hint: 'The mono line under the location.' },
        ] },
    ],
  },

  works: {
    label: '03 · Works', icon: '03',
    fields: [
      { k: 'labelNum', label: 'Section number', type: 'text' },
      { k: 'labelText', label: 'Section name', type: 'text' },
      { k: 'heading', label: 'Heading', type: 'rich' },
      { k: 'lede', label: 'Standfirst', type: 'rich' },
      { k: 'shelfLabel', label: 'Models shelf — eyebrow', type: 'text' },
      { k: 'footnote', label: 'Models shelf — footnote', type: 'rich' },
    ],
    arrays: [
      { k: 'frames', label: 'Reusable models', singular: 'model', max: 6,
        itemLabel: (it) => (it.title || '').replace(/<[^>]+>/g, '') || 'Untitled model',
        fields: [
          { k: 'n', label: 'Number', type: 'text', hint: 'F.01, F.02…' },
          { k: 'title', label: 'Title', type: 'rich' },
          { k: 'body', label: 'Body', type: 'rich' },
        ] },
    ],
    // project cards live in their own panel because they carry a preview asset
    projectsPanel: true,
  },

  projects: {
    label: 'Project cards', icon: 'cards', panel: 'works',
    arrays: [
      { k: 'items', label: 'Case studies', singular: 'project', max: 8, source: 'works.items',
        itemLabel: (it) => (it.title || '').replace(/<[^>]+>/g, '') || 'Untitled project',
        fields: [
          { k: 'title', label: 'Title', type: 'text' },
          { k: 'titleItalic', label: 'Title — italic part', type: 'text',
            hint: 'Rendered in the muted italic that finishes each title.' },
          { k: 'href', label: 'Case-study file', type: 'text',
            hint: 'Relative filename, e.g. bt-billing-case-study.html' },
          { k: 'meta', label: 'Meta — left', type: 'text', hint: 'Sector or product type.' },
          { k: 'year', label: 'Meta — right', type: 'text', hint: 'Your role or the year.' },
          { k: 'problem', label: 'The problem', type: 'textarea' },
          { k: 'outcome', label: 'The outcome', type: 'rich',
            hint: 'Bold the number: <b>58%</b> is the house style here.' },
          { k: 'cta', label: 'Call to action', type: 'text' },
          { k: 'badge', label: 'Preview badge', type: 'text' },
          { k: 'openIn', label: 'Opens in', type: 'select',
            options: [['new-tab', 'A new tab'], ['same-tab', 'The same tab']] },
        ] },
    ],
  },

  ai: {
    label: '04 · AI Practices', icon: '04',
    fields: [
      { k: 'labelNum', label: 'Section number', type: 'text' },
      { k: 'labelText', label: 'Section name', type: 'text' },
      { k: 'heading', label: 'Heading', type: 'rich' },
      { k: 'lede', label: 'Standfirst', type: 'rich' },
      { k: 'pipelineLabel', label: 'Pipeline — eyebrow', type: 'text' },
      { k: 'practicesLabel', label: 'Practices — eyebrow', type: 'text' },
      { k: 'guardHeading', label: 'Guardrails — heading', type: 'rich' },
      { k: 'fillIn', label: 'Placeholder reminder', type: 'rich',
        hint: 'Delete this once every amber placeholder is filled — it only exists to stop the page shipping half-written.' },
    ],
    arrays: [
      { k: 'pipeline', label: 'Pipeline stages', singular: 'stage', max: 8,
        itemLabel: (it) => it.title || 'Untitled stage',
        fields: [
          { k: 'n', label: 'Number', type: 'text', hint: 'S.01, S.02…' },
          { k: 'title', label: 'Stage', type: 'text', hint: 'Research, Synthesis, Ideation…' },
          { k: 'ai', label: 'AI does', type: 'rich' },
          { k: 'human', label: 'You keep', type: 'rich' },
        ] },
      { k: 'pipelineKey', label: 'Pipeline key', singular: 'key item', max: 3,
        itemLabel: (it, i) => 'Key ' + (i + 1),
        fields: [{ k: '$self', label: 'Text', type: 'rich' }] },
      { k: 'practices', label: 'Practices', singular: 'practice', max: 9,
        itemLabel: (it) => it.title || 'Untitled practice',
        fields: [
          { k: 'n', label: 'Number', type: 'text', hint: 'P.01, P.02…' },
          { k: 'title', label: 'Name', type: 'text' },
          { k: 'what', label: 'Do — what you do', type: 'rich' },
          { k: 'withWhat', label: 'With — tooling', type: 'rich' },
          { k: 'proof', label: 'Proof point', type: 'rich', hint: 'The number it moved.' },
        ] },
      { k: 'guardrails', label: 'Guardrails', singular: 'guardrail', max: 6,
        itemLabel: (it, i) => (it || '').replace(/<[^>]+>/g, '').slice(0, 42) || 'Guardrail ' + (i + 1),
        fields: [{ k: '$self', label: 'Text', type: 'rich' }] },
    ],
  },

  contact: {
    label: 'Contact & footer', icon: 'mail',
    fields: [
      { k: 'heading', label: 'Heading', type: 'rich' },
      { k: 'email', label: 'Email address', type: 'email' },
      { k: 'emailHref', label: 'Email link', type: 'text',
        hint: 'Usually mailto: followed by the same address.' },
      { k: 'sub', label: 'Availability line', type: 'rich' },
      { k: 'copyright', label: 'Copyright', type: 'rich',
        hint: 'The year is replaced with the current year automatically at runtime.' },
      { k: 'credential', label: 'Credential', type: 'text' },
    ],
    arrays: [
      { k: 'links', label: 'Footer links', singular: 'link', max: 5,
        itemLabel: (it) => it.label || 'Untitled link',
        fields: [
          { k: 'label', label: 'Label', type: 'text' },
          { k: 'href', label: 'URL', type: 'url' },
          { k: 'newTab', label: 'Open in a new tab', type: 'select',
            options: [[true, 'Yes'], [false, 'No']] },
        ] },
    ],
  },
};

/* Paths edited by bespoke UI rather than a generated form field:
     works.items.[].tags           -> the chip editor on the Project cards panel
     works.items.[].preview.*      -> the Media panel (SVG source / image upload)
     works.items.[].id             -> internal, assigned when a card is created
   Declared here so build/coverage.js can prove every leaf of the model is
   reachable from the admin, including the ones with no schema field. */
const EXTRA_EDITABLE = [
  'works.items.[].tags.[]',
  'works.items.[].preview.type',
  'works.items.[].preview.svg',
  'works.items.[].preview.image',
  'works.items.[].id',
];

// which design tokens get a colour picker vs a text field
const TOKEN_GROUPS = [
  { label: 'Surfaces & ink', keys: ['bg', 'card', 'text', 'text_muted', 'text_faint',
                                    'border', 'border_strong', 'hover_bg', 'header_bg', 'shadow'] },
  { label: 'Typography', keys: ['font_main', 'font_mono'] },
  { label: 'Motion & shape', keys: ['ease', 't'] },
  { label: 'Card previews', keys: ['preview_bg', 'preview_ink', 'preview_line'] },
];
