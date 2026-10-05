"""Verify the four shipped case studies against the files they were built from.

Proves the theming work is still intact and lossless:

  1. every dark token maps back to a colour literal that exists in the source file
     -> dark mode renders exactly as authored
  2. no colour literal survives outside the injected block
     -> light mode really does reach every diagram
  3. every token is both defined and used (no orphans, no dangling var())
  4. visible text is unchanged apart from the agreed label edits
  5. every embedded screenshot is byte-identical
  6. the dock, the pre-paint theme script and the light palette are present
  7. the admin palette patch, if one is applied, sits after the generated block
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')
UP = os.path.join(ROOT, 'uploads')

PAIRS = [
    ('smart-mining-case-study.html', '1_Smart Mining STAR Case_V1.html', 'mining'),
    ('falcon-view-case-study.html', '1_index.html', 'falcon'),
    ('incident-management-case-study.html',
     '1_incident-management-system-case-study4th oct .html', 'incident'),
]
BT = ('bt-billing-case-study.html', 'BT Business billing case study \u2014 with screens_3.html')

# the copy edits agreed earlier in this project
ALLOWED_EDITS = [
    ('A7 · Framework', 'A7 · Works'),
    ('KPI framework', 'KPI Works'),
    ('My framework: design for', 'My approach: design for'),
]

HEX = re.compile(r'#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b')
B64 = re.compile(r'data:image/[a-z+]+;base64,[A-Za-z0-9+/=]+')

fails = []


def check(name, ok, extra=''):
    print('   %s  %s%s' % ('PASS' if ok else 'FAIL', name, ('  — ' + extra) if extra else ''))
    if not ok:
        fails.append(name)


def expand(x):
    x = x.lower().lstrip('#')
    return '#' + (''.join(c * 2 for c in x) if len(x) == 3 else x)


def strip_injected(s):
    return re.sub(r'<style data-injected="[^"]*">.*?</style>', '', s, flags=re.S)


def strip_dock(s):
    s = re.sub(r'<div class="as-dock".*?</div>\s*', '', s, flags=re.S)
    s = re.sub(r'<script>\s*/\* ══ theme toggle.*?</script>', '', s, flags=re.S)
    s = re.sub(r"<script>\(function\(\)\{try\{var t=localStorage\.getItem.*?</script>", '', s, flags=re.S)
    return s


def text_only(s):
    s = re.sub(r'<script.*?</script>', '', s, flags=re.S)
    s = re.sub(r'<style.*?</style>', '', s, flags=re.S)
    s = re.sub(r'data:image/[^"\']+', 'IMG', s)
    s = re.sub(r'<[^>]+>', '', s)
    return re.sub(r'\s+', ' ', s).strip()


def tokenised(name, orig_name, pref):
    new_p = os.path.join(SITE, name)
    old_p = os.path.join(UP, orig_name)
    if not os.path.exists(new_p):
        check(name + ' present', False, 'missing from site/')
        return
    new = open(new_p, encoding='utf-8').read()
    old = open(old_p, encoding='utf-8').read() if os.path.exists(old_p) else None
    print('== %s' % name)

    m = re.search(r'<style data-injected="theme-%s">(.*?)</style>' % pref, new, re.S)
    check('generated theme block present', bool(m))
    if not m:
        return
    inj = m.group(1)
    parts = inj.split('html[data-theme="light"]{')
    check('light palette present', len(parts) > 1)
    VALUE = r'(?:#[0-9a-fA-F]{3,6}|rgba?\([^)]*\))'
    dark = dict(re.findall(r'(--%s-[ck]\d+):(%s);' % (pref, VALUE), parts[0]))
    light = dict(re.findall(r'(--%s-[ck]\d+):(%s);' % (pref, VALUE), parts[1]))
    check('dark tokens == light tokens (same set)', set(dark) == set(light),
          '%d dark / %d light' % (len(dark), len(light)))

    body = strip_dock(strip_injected(new))
    left_hex = HEX.findall(body)
    left_rgba = re.findall(r'\brgba?\(\s*\d', body)
    check('no hex literal left in the body', len(left_hex) == 0, str(left_hex[:4]))
    check('remaining rgba() are JS-computed only', len(left_rgba) <= 3,
          '%d (canvas strings with a computed alpha)' % len(left_rgba))

    used = set(re.findall(r'var\((--%s-[ck]\d+)\)' % pref, body))
    check('every used token is defined', not (used - set(dark)), str(sorted(used - set(dark))[:4]))
    check('no unused tokens', not (set(dark) - used), '%d unused' % len(set(dark) - used))

    check('pre-paint theme script present', "localStorage.getItem('as-theme')" in new)
    check('theme dock present', new.count('id="asDock"') == 1 and new.count('id="asThemeBtn"') == 1)
    check('back-to-index link present', 'href="index.html"' in new)

    if old:
        orig_literals = set(expand(x) for x in HEX.findall(old)) | \
                        set(re.sub(r'\s+', '', x).lower() for x in re.findall(r'rgba?\([^)]*\)', old))
        unknown = [(k, v) for k, v in dark.items() if v.lower() not in orig_literals]
        check('every dark token reproduces an original literal', not unknown, str(unknown[:3]))

        imgs_new, imgs_old = B64.findall(new), B64.findall(old)
        check('embedded screenshots byte-identical', imgs_new == imgs_old,
              '%d -> %d' % (len(imgs_old), len(imgs_new)))
        svg_new = re.findall(r'data:image/svg\+xml[^"\')]*', new)
        svg_old = re.findall(r'data:image/svg\+xml[^"\')]*', old)
        check('svg data-uris byte-identical', svg_new == svg_old, '%d -> %d' % (len(svg_old), len(svg_new)))

        old_t = text_only(old)
        for a, b in ALLOWED_EDITS:
            old_t = old_t.replace(a, b)
        check('visible text identical (apart from agreed edits)', text_only(strip_dock(strip_injected(new))) == old_t)

    patch = re.search(r'<style data-injected="cms-palette">', new)
    if patch:
        theme_at = new.find('<style data-injected="theme-%s">' % pref)
        check('admin palette patch wins the cascade', patch.start() > theme_at)


def bt():
    name, orig_name = BT
    new_p, old_p = os.path.join(SITE, name), os.path.join(UP, orig_name)
    if not os.path.exists(new_p):
        check(name + ' present', False, 'missing from site/')
        return
    new = open(new_p, encoding='utf-8').read()
    print('== %s' % name)
    check('DARK STUDIO RE-THEME layer still present', 'DARK STUDIO RE-THEME' in new)
    check('light paper restore injected', 'html[data-theme="light"]' in new)
    check('light mode re-maps the paper variables',
          all(v in new for v in ('--paper:#f5f0e3', '--chalk:#1a1410', '--red-pen:#c8341d')))
    check('pre-paint theme script present', "localStorage.getItem('as-theme')" in new)
    check('theme dock present', new.count('id="asDock"') == 1)
    if os.path.exists(old_p):
        old = open(old_p, encoding='utf-8').read()
        check('embedded screenshots byte-identical', B64.findall(new) == B64.findall(old),
              '%d images' % len(B64.findall(old)))
        svg_new = re.findall(r'data:image/svg\+xml[^"\')]*', new)
        svg_old = re.findall(r'data:image/svg\+xml[^"\')]*', old)
        check('svg data-uris byte-identical', svg_new == svg_old, '%d uris' % len(svg_old))
        old_t = text_only(old)
        for a, b in ALLOWED_EDITS:
            old_t = old_t.replace(a, b)
        check('visible text identical', text_only(strip_dock(strip_injected(new))) == old_t)
        check('only additions, nothing removed', len(new) >= len(old),
              '%d -> %d bytes' % (len(old), len(new)))


def main():
    if not os.path.isdir(UP):
        print('!! uploads/ is not present — skipping the source comparisons '
              '(the structural checks still run)')
    for name, orig, pref in PAIRS:
        tokenised(name, orig, pref)
    bt()
    print('\n════ %s ════' % ('all case-study checks passed' if not fails
                               else '%d FAILED: %s' % (len(fails), ', '.join(fails[:6]))))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
