"""Extract the four project-card preview SVGs from site/index.html.

Writes cms/_svgs.json, which gen_content.py folds into the content model so the
card artwork becomes editable data rather than hard-coded markup.
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'site', 'index.html')
DEST = os.path.join(ROOT, 'cms', '_svgs.json')


def main():
    s = open(SRC, encoding='utf-8').read()
    # ignore the CMS <template> skeleton; take the real (fallback) cards
    s = re.sub(r'<template data-cms-template>.*?</template>', '', s, flags=re.S)

    cards = re.findall(r'<a class="work-card[^"]*" href="([^"]+)"[^>]*>(.*?)</a>', s, re.S)
    if not cards:
        raise SystemExit('no project cards found in ' + SRC)

    out = {}
    for href, body in cards:
        svg = re.search(r'<svg\b.*?</svg>', body, re.S)
        badge = re.search(r'<span class="badge"[^>]*>(.*?)</span>', body, re.S)
        key = os.path.basename(href).replace('.html', '')
        out[key] = {
            'href': href,
            'badge': badge.group(1).strip() if badge else '',
            'svg': re.sub(r'\s+', ' ', svg.group(0)).strip() if svg else '',
        }

    for k, v in out.items():
        print('%-38s badge=%-28r svg=%d chars' % (k, v['badge'], len(v['svg'])))

    os.makedirs(os.path.dirname(DEST), exist_ok=True)
    json.dump(out, open(DEST, 'w'), indent=1)
    print('wrote %s  (%d KB)' % (DEST, os.path.getsize(DEST) // 1024))
    bad = sum(v['svg'].count('`') + v['svg'].count('${') for v in out.values())
    if bad:
        raise SystemExit('an SVG contains ` or ${ — it would break a JS template literal')


if __name__ == '__main__':
    main()
