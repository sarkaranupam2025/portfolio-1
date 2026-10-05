"""Apply an admin-exported palette patch to a case study.

The admin edits case-study colours and exports a small CSS file. This injects it
as a clearly-marked block placed *after* the generated theme block, so it wins the
cascade. Re-running replaces the previous patch and touches nothing else in the
1.5 MB document; --remove restores the file byte-for-byte.

    python3 build/apply_case_palette.py smart-mining palette-smart-mining.css
    python3 build/apply_case_palette.py --list
    python3 build/apply_case_palette.py smart-mining --remove
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')

FILES = {
    'smart-mining': 'smart-mining-case-study.html',
    'falcon-view': 'falcon-view-case-study.html',
    'incident-management': 'incident-management-case-study.html',
    'bt-billing': 'bt-billing-case-study.html',
}
MARK_OPEN = '<style data-injected="cms-palette">'
MARK_CLOSE = '</style>'


def current(path):
    s = open(path, encoding='utf-8').read()
    # the block is inserted with a leading and a trailing newline; match both so
    # that an apply/remove round trip leaves the file byte-identical
    m = re.search(r'\n?' + re.escape(MARK_OPEN) + r'.*?' + re.escape(MARK_CLOSE) + r'\n?', s, re.S)
    return s, (m.span() if m else None)


def validate(patch):
    """A palette patch may only declare custom properties inside the light-mode
    selector. Refuse anything that could touch layout or content."""
    body = re.sub(r'/\*.*?\*/', '', patch, flags=re.S)
    stray = []
    for line in body.split('\n'):
        t = line.strip()
        if not t:
            continue
        if t.startswith('html[data-theme') or t in ('}', '{'):
            continue
        if re.match(r'^--[\w-]+\s*:\s*[^;]+;\s*(/\*.*)?$', t):
            continue
        stray.append(t)
    if stray:
        raise SystemExit('refusing to apply — these lines are not custom-property declarations:\n  '
                         + '\n  '.join(stray[:8]))
    tokens = re.findall(r'(--[\w-]+)\s*:', body)
    if not tokens:
        raise SystemExit('the patch declares no custom properties; nothing to do')
    return tokens


def apply(key, css_path):
    if key not in FILES:
        raise SystemExit('unknown case study %r — try --list' % key)
    path = os.path.join(SITE, FILES[key])
    if not os.path.exists(path):
        raise SystemExit('no such file: ' + path)
    patch = open(css_path, encoding='utf-8').read()
    tokens = validate(patch)

    src, span = current(path)
    block = (MARK_OPEN + '\n/* Applied by build/apply_case_palette.py from '
             + os.path.basename(css_path) + '. Edit colours in admin.html, then re-run. */\n'
             + patch.strip() + '\n' + MARK_CLOSE + '\n')

    if span:
        out = src[:span[0]] + block + src[span[1]:]
        action = 'replaced the existing patch'
    else:
        anchor = re.search(r'<style data-injected="theme-[^"]*">.*?</style>', src, re.S)
        if not anchor:
            raise SystemExit('no generated theme block found — has this file been through the theming build?')
        out = src[:anchor.end()] + '\n' + block + src[anchor.end():]
        action = 'inserted after the generated theme block'

    open(path, 'w', encoding='utf-8').write(out)
    print('%-22s %s' % (key, action))
    print('  %d custom properties from %s' % (len(tokens), os.path.basename(css_path)))
    print('  %s  %d -> %d bytes' % (FILES[key], len(src), len(out)))


def remove(key):
    if key not in FILES:
        raise SystemExit('unknown case study %r — try --list' % key)
    path = os.path.join(SITE, FILES[key])
    src, span = current(path)
    if not span:
        print('%-22s no patch present' % key)
        return
    out = src[:span[0]] + src[span[1]:]
    open(path, 'w', encoding='utf-8').write(out)
    print('%-22s patch removed (%d -> %d bytes)' % (key, len(src), len(out)))


def listing():
    print('case studies:')
    for k, v in FILES.items():
        p = os.path.join(SITE, v)
        if not os.path.exists(p):
            print('  %-22s %-40s missing' % (k, v))
            continue
        state = 'patched' if current(p)[1] else 'no patch'
        print('  %-22s %-40s %s' % (k, v, state))


def main(argv):
    if not argv or argv[0] in ('--list', '-l'):
        listing()
        return
    key = argv[0]
    if len(argv) > 1 and argv[1] == '--remove':
        remove(key)
        return
    if len(argv) < 2:
        raise SystemExit('usage: apply_case_palette.py <case> <patch.css> | <case> --remove | --list')
    apply(key, argv[1])


if __name__ == '__main__':
    main(sys.argv[1:])
