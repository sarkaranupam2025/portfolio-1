"""Generate cms/_data.json — palettes, tokens and card data read out of the real
files, never retyped, so the admin starts from exactly what the site does.

  * card preview SVGs      <- cms/_svgs.json   (build/extract_svgs.py)
  * case-study palettes    <- the injected token tables in site/*.html
  * design tokens          <- site/index.html :root and [data-theme=dark]
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')
CMS = os.path.join(ROOT, 'cms')

CASES = [
    ('smart-mining', 'smart-mining-case-study.html', 'mining'),
    ('falcon-view', 'falcon-view-case-study.html', 'falcon'),
    ('incident-management', 'incident-management-case-study.html', 'incident'),
]

# the dark literal behind each named role, per case study
MINING_ROLES = {
    'page ground': '#070d12', 'section surface': '#0c161d', 'raised': '#122029',
    'hairline': '#1d3240', 'primary text': '#e9eff1', 'secondary text': '#93a7b1',
    'green': '#2ee6a6', 'cyan': '#36d3e2', 'blue': '#4d8dff',
    'violet': '#8b7bff', 'critical': '#ff4f62', 'ok': '#4dd69c',
}
FALCON_ROLES = {
    'page ground': '#070d12', 'section surface': '#0c161d', 'raised': '#122029',
    'hairline': '#1d3240', 'primary text': '#e9eff1', 'secondary text': '#93a7b1',
    'green': '#2ee6a6', 'cyan': '#36d3e2', 'blue': '#4d8dff',
    'warning': '#ffb84d', 'critical': '#ff4f62', 'dim': '#5f7682',
}
INCIDENT_ROLES = {
    'page ground': '#08080a', 'section surface': '#0e0e11', 'raised': '#141418',
    'hairline': '#26262d', 'primary text': '#f5f5f4', 'secondary text': '#a8a8b0',
    'accent': '#7d80f0', 'cyan': '#54c8e8', 'red': '#f0584f',
    'green': '#3ed492', 'amber': '#f2a93a', 'strong line': '#37373f',
}
ROLES = {'smart-mining': MINING_ROLES, 'falcon-view': FALCON_ROLES,
         'incident-management': INCIDENT_ROLES}

# short names used in the admin UI
ROLE_NAMES = {
    'page ground': 'page', 'section surface': 'surface', 'raised': 'raised',
    'hairline': 'line', 'primary text': 'ink', 'secondary text': 'ink 2',
}

# BT was authored light then had a dark studio layer painted over it, so its two
# palettes are declared here rather than read out of a token table
BT_DARK = {
    'page': '#16140f', 'surface': '#1d1a14', 'raised': '#f4eede', 'line': '#3a352a',
    'ink': '#ece3cf', 'ink 2': '#cabfa6', 'ink 3': '#9c917a',
    'red pen': '#ff6f52', 'blue pen': '#79b4f0', 'sticky': '#fde88a',
}
BT_LIGHT = {
    'page': '#f5f0e3', 'surface': '#ede7d4', 'raised': '#fffdf6', 'line': '#c4b89e',
    'ink': '#1a1410', 'ink 2': '#3d342a', 'ink 3': '#6b5d4d',
    'red pen': '#c8341d', 'blue pen': '#1f4c8f', 'sticky': '#ffe066',
}
BT_NOTE = ('BT was authored light and had a dark studio layer painted over it, so its '
           'light mode re-asserts the paper palette rather than remapping tokens.')


def theme_block(fname, pref):
    s = open(os.path.join(SITE, fname), encoding='utf-8').read()
    m = re.search(r'<style data-injected="theme-%s">(.*?)</style>' % pref, s, re.S)
    if not m:
        raise SystemExit('%s: no generated theme block — run build_cases.py first' % fname)
    return m.group(1)


def light_palette(fname, pref):
    """dark literal -> light literal, for every token the page uses."""
    inj = theme_block(fname, pref)
    dark = dict(re.findall(r'(--%s-c\d+):(#[0-9a-fA-F]{6});' % pref,
                           inj.split('html[data-theme="light"]')[0]))
    light = dict(re.findall(r'(--%s-c\d+):(#[0-9a-fA-F]{6});' % pref,
                            inj.split('html[data-theme="light"]{')[1]))
    missing = [t for t in dark if t not in light]
    if missing:
        raise SystemExit('%s: %d tokens have no light value (%s…)'
                         % (fname, len(missing), missing[0]))
    return {v.lower(): light[k].lower() for k, v in dark.items()}


def token_by_role(fname, pref, roles):
    """role -> the CSS custom property that carries it, so a palette edit can be
    exported as a patch against the real token names."""
    inj = theme_block(fname, pref)
    dark_toks = dict(re.findall(r'(--%s-c\d+):(#[0-9a-fA-F]{6});' % pref,
                                inj.split('html[data-theme="light"]')[0]))
    out = {}
    for role, hexval in roles.items():
        out[ROLE_NAMES.get(role, role)] = next(
            (t for t, v in dark_toks.items() if v.lower() == hexval.lower()), None)
    return out


def index_tokens():
    s = open(os.path.join(SITE, 'index.html'), encoding='utf-8').read()
    root = re.search(r':root\{(.*?)\n\}', s, re.S).group(1)
    dark = re.search(r'\[data-theme="dark"\]\{(.*?)\n\}', s, re.S).group(1)

    def grab(block):
        return {k[2:].replace('-', '_'): v.strip()
                for k, v in re.findall(r'(--[a-z0-9-]+)\s*:\s*([^;]+);', block)}
    return grab(root), grab(dark)


def work_cards():
    """Card copy and artwork, read from the real cards (not the CMS templates)."""
    svgs = json.load(open(os.path.join(CMS, '_svgs.json'), encoding='utf-8'))
    s = open(os.path.join(SITE, 'index.html'), encoding='utf-8').read()
    s = re.sub(r'<template data-cms-template>.*?</template>', '', s, flags=re.S)

    def g(pat, body, flags=re.S):
        m = re.search(pat, body, flags)
        return m.group(1).strip() if m else ''

    out = []
    for href, body in re.findall(r'<a class="work-card[^"]*" href="([^"]+)"[^>]*>(.*?)</a>', s, re.S):
        key = os.path.basename(href).replace('.html', '')
        if key not in svgs:
            raise SystemExit('card %s has no entry in cms/_svgs.json — run extract_svgs.py' % key)
        italic = re.search(r'<h3>.*?<span class="it">(.*?)</span>', body, re.S)
        out.append({
            'id': key,
            'title': re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', g(r'<h3>(.*?)</h3>', body))),
            'titleItalic': italic.group(1).strip() if italic else '',
            'href': href,
            'meta': g(r'<div class="work-meta"><span>(.*?)</span>', body),
            'year': g(r'<span class="yr">(.*?)</span>', body),
            'problem': re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', g(r'<p class="work-prob">(.*?)</p>', body))),
            'outcome': g(r'<p class="work-out">(.*?)</p>', body),
            'tags': [t.strip() for t in re.findall(r'<span class="work-tag">(.*?)</span>', body, re.S)],
            'cta': re.sub(r'\s*<i>.*', '', g(r'<span class="work-cta">(.*?)</span>', body)).strip(),
            'badge': svgs[key]['badge'],
            'preview': {'type': 'svg', 'svg': svgs[key]['svg'], 'image': ''},
            'openIn': 'new-tab',
        })
    return out


def main():
    root_t, dark_t = index_tokens()

    cases = {}
    for key, fname, pref in CASES:
        pal = light_palette(fname, pref)
        roles = ROLES[key]
        cases[key] = {
            'file': fname,
            'tokenPrefix': pref,
            'tokenCount': len(pal),
            'dark': dict(roles),
            'light': {ROLE_NAMES.get(r, r): pal[h.lower()]
                      for r, h in roles.items() if h.lower() in pal},
            'tokenByRole': token_by_role(fname, pref, roles),
            'lightFull': pal,
        }
    cases['bt-billing'] = {
        'file': 'bt-billing-case-study.html', 'tokenPrefix': None, 'tokenCount': 0,
        'dark': BT_DARK, 'light': BT_LIGHT, 'lightFull': {}, 'note': BT_NOTE,
    }

    works = work_cards()
    data = {
        '_generated': 'by build/gen_content.py — edit the generator, not this file',
        'design': {'light': root_t, 'dark': dark_t},
        'cases': cases,
        'worksSeed': works,
    }
    os.makedirs(CMS, exist_ok=True)
    out = os.path.join(CMS, '_data.json')
    json.dump(data, open(out, 'w'), indent=1, ensure_ascii=False)

    print('works parsed : %s' % ', '.join(w['id'] for w in works))
    for k, v in cases.items():
        mapped = sum(1 for t in v.get('tokenByRole', {}).values() if t)
        print('  %-22s %2d roles, %2d light, %2d/%d mapped to tokens'
              % (k, len(v['light']), len(v['lightFull']), mapped, len(v['light'])))
    print('design tokens: light %d, dark %d' % (len(root_t), len(dark_t)))
    print('wrote %s  (%d KB)' % (out, os.path.getsize(out) // 1024))


if __name__ == '__main__':
    main()
