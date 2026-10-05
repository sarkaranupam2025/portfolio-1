"""Assemble cms/content.js from the extracted defaults plus the schema.

    python3 build/extract_svgs.py      # card artwork   -> cms/_svgs.json
    node build/extract_content.js      # every string   -> cms/_content.json
    python3 build/gen_content.py       # palettes       -> cms/_data.json
    python3 build/make_content_js.py   # assemble       -> cms/content.js

content.js is generated; edit the generators or cms/_schema.part.js instead.
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CMS = os.path.join(ROOT, 'cms')

HEADER = """/* ══════════════════════════════════════════════════════════════════════════
   content.js — the site's content model, design tokens and case-study palettes.

   GENERATED FILE. Do not edit by hand; it is rebuilt from the live site:
       python3 build/extract_svgs.py
       node build/extract_content.js
       python3 build/gen_content.py
       python3 build/make_content_js.py

   What lives here:
     SITE_CONTENT    every editable string on the portfolio, as published
     DESIGN_TOKENS   the CSS custom properties behind :root and [data-theme=dark]
     CASE_STUDIES    each case study's dark palette and its light-mode counterpart
     CASE_LIGHT_FULL the complete dark->light token table for the tokenised three
     SCHEMA          the description admin.html builds its forms from
     TOKEN_GROUPS    how the design panel groups the tokens
     EXTRA_EDITABLE  model paths edited by bespoke UI rather than a schema field
   ══════════════════════════════════════════════════════════════════════════ */
"""

WINDOW_EXPORT = """
/* const does not create window properties, so publish them explicitly.
   Guarded so this file can also be require()d by the Node build and test scripts. */
if (typeof window !== 'undefined') {
  window.SITE_CONTENT = SITE_CONTENT;
  window.DESIGN_TOKENS = DESIGN_TOKENS;
  window.CASE_STUDIES = CASE_STUDIES;
  window.CASE_LIGHT_FULL = CASE_LIGHT_FULL;
  window.SCHEMA = SCHEMA;
  window.TOKEN_GROUPS = TOKEN_GROUPS;
  window.EXTRA_EDITABLE = EXTRA_EDITABLE;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SITE_CONTENT, DESIGN_TOKENS, CASE_STUDIES, CASE_LIGHT_FULL,
                     SCHEMA, TOKEN_GROUPS, EXTRA_EDITABLE };
}
"""


def j(obj):
    return json.dumps(obj, indent=2, ensure_ascii=False)


def main():
    for name in ('_content.json', '_data.json', '_svgs.json', '_schema.part.js'):
        if not os.path.exists(os.path.join(CMS, name)):
            raise SystemExit('missing cms/%s — run the extraction steps first' % name)

    content = json.load(open(os.path.join(CMS, '_content.json'), encoding='utf-8'))
    data = json.load(open(os.path.join(CMS, '_data.json'), encoding='utf-8'))
    schema = open(os.path.join(CMS, '_schema.part.js'), encoding='utf-8').read()

    # the project cards carry artwork, so they are assembled from _data.json
    works = data['worksSeed']
    content['works']['items'] = works

    cases = {}
    for k, v in data['cases'].items():
        cases[k] = {
            'file': v['file'],
            'tokenPrefix': v.get('tokenPrefix'),
            'tokenCount': v.get('tokenCount', 0),
            'dark': v['dark'],
            'light': v['light'],
            'tokenByRole': v.get('tokenByRole', {}),
        }
        if v.get('note'):
            cases[k]['note'] = v['note']

    parts = [
        HEADER,
        'const SITE_CONTENT = %s;\n' % j(content),
        'const DESIGN_TOKENS = %s;\n' % j(data['design']),
        'const CASE_STUDIES = %s;\n' % j(cases),
        schema,
        '\nconst CASE_LIGHT_FULL = %s;\n' % j(
            {k: v['lightFull'] for k, v in data['cases'].items() if v.get('lightFull')}),
        WINDOW_EXPORT,
    ]

    out = os.path.join(CMS, 'content.js')
    text = '\n'.join(parts)

    # fail rather than emit a broken model
    for token in ('SITE_CONTENT', 'DESIGN_TOKENS', 'CASE_STUDIES', 'SCHEMA',
                  'TOKEN_GROUPS', 'EXTRA_EDITABLE'):
        if ('const %s' % token) not in text and token not in text:
            raise SystemExit('generated content.js is missing %s' % token)

    open(out, 'w', encoding='utf-8').write(text)
    print('wrote %s  (%.1f KB)' % (out, os.path.getsize(out) / 1024))
    print('  content sections : %d' % len(content))
    print('  design tokens    : light %d / dark %d'
          % (len(data['design']['light']), len(data['design']['dark'])))
    print('  case studies     : %s' % ', '.join(cases))
    print('  work cards       : %d (with preview artwork)' % len(works))


if __name__ == '__main__':
    main()
