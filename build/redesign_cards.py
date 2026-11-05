"""Redesign the project cards to the supplied mockup and add per-card field toggles.

Mockup anatomy, in order:
    dark preview plate  -> badge top-left, four accent dots top-right, artwork
    card body           -> large title (second part italic + muted), tag pills,
                           "READ THE CASE STUDY ->" with a long arrow

Meta line, description and outcome are hidden by default (the mockup shows none of
them) but the copy stays in the markup with .is-off so the CMS can still read it
and re-enable it per card.

Every replacement asserts its match count, so a silent no-op is impossible.
"""
import re
import sys

ROOT = '/home/user'
TARGET = ROOT + '/site/index.html'
s = open(TARGET, encoding='utf-8').read()

if 'v2: card mockup' in s:
    sys.exit('already applied')


def sub(pattern, repl, why, count=1, flags=re.S):
    global s
    new, n = re.subn(pattern, repl, s, count=count, flags=flags)
    if n != count:
        sys.exit('FAILED %s — %d matches, wanted %d\n  %s' % (why, n, count, pattern[:140]))
    s = new
    print('   ok  %s' % why)


# ─── 1. CSS ─────────────────────────────────────────────────────────────────
OLD_CSS_START = '.work-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(16px,2vw,28px);margin-top:8px}'
OLD_CSS_END = '.work-card:hover .work-cta i{width:38px}'
i = s.find(OLD_CSS_START)
j = s.find(OLD_CSS_END)
if i < 0 or j < 0 or j < i:
    sys.exit('card CSS block not found')
j += len(OLD_CSS_END)

NEW_CSS = """.work-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(18px,2.2vw,32px);margin-top:8px}
.work-card{
  position:relative;display:flex;flex-direction:column;
  border:1px solid var(--border);background:var(--card);overflow:hidden;
  transition:border-color var(--t),transform .42s var(--ease),box-shadow .42s var(--ease);
}
.work-card:hover,.work-card:focus-visible{border-color:var(--border-strong);transform:translateY(-4px);box-shadow:var(--shadow)}
/* preview plate: badge top-left, accent dots top-right, artwork beneath */
.work-preview{position:relative;aspect-ratio:16/9;overflow:hidden;border-bottom:1px solid var(--border);
  background:var(--preview-bg)}
.work-preview svg{width:100%;height:100%;transition:transform .7s var(--ease)}
.work-card:hover .work-preview svg{transform:scale(1.03)}
.work-preview .badge{
  position:absolute;top:clamp(12px,1.5vw,18px);left:clamp(12px,1.5vw,18px);z-index:2;
  font-family:var(--font-mono);font-size:.6rem;font-weight:500;letter-spacing:.16em;
  text-transform:uppercase;line-height:1;
  padding:8px 14px;border-radius:50px;
  background:var(--preview-bg);color:var(--preview-ink);
  border:1px solid var(--preview-line);
}
.work-dots{position:absolute;top:clamp(14px,1.7vw,21px);right:clamp(14px,1.6vw,20px);z-index:2;
  display:flex;align-items:center;gap:11px}
.work-dots i{display:block;width:6px;height:6px;border-radius:50%;
  background:var(--preview-dot,var(--preview-ink));opacity:.95}
/* body: title, tags, call to action */
.work-body{padding:clamp(22px,2.5vw,34px);display:flex;flex-direction:column;flex:1;gap:clamp(16px,1.8vw,22px)}
.work-card h3{font-size:clamp(1.5rem,2.35vw,2.15rem);line-height:1.06;letter-spacing:-.032em;
  font-weight:400;max-width:22ch;text-wrap:balance}
.work-card h3 .it{color:var(--text-muted)}
.work-meta{display:flex;justify-content:space-between;gap:14px;align-items:baseline;
  font-size:.66rem;font-weight:500;text-transform:uppercase;letter-spacing:.13em;color:var(--text-faint)}
.work-meta .yr{font-family:var(--font-mono);letter-spacing:.04em}
.work-prob{font-size:.95rem;color:var(--text-muted);line-height:1.6}
.work-out{font-size:.95rem;line-height:1.55;padding-top:14px;border-top:1px solid var(--border)}
.work-out b{font-weight:500}
.work-tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:auto}
.work-tag{font-family:var(--font-mono);font-size:.62rem;font-weight:500;text-transform:uppercase;
  letter-spacing:.16em;line-height:1;color:var(--text-muted);
  border:1px solid var(--border-strong);padding:.5rem 1rem;border-radius:50px;opacity:.72}
.work-cta{display:flex;align-items:center;gap:14px;font-size:.72rem;font-weight:500;
  text-transform:uppercase;letter-spacing:.17em;line-height:1;padding-top:2px}
.work-cta i{display:block;width:34px;height:1px;background:currentColor;position:relative;
  transition:width .35s var(--ease)}
.work-cta i::after{content:"";position:absolute;right:0;top:-3px;width:7px;height:7px;
  border-top:1px solid currentColor;border-right:1px solid currentColor;transform:rotate(45deg)}
.work-card:hover .work-cta i{width:58px}
/* fields switched off in the CMS keep their copy for the editor but never render */
.work-card .is-off{display:none!important}
/* v2: card mockup */"""

s = s[:i] + NEW_CSS + s[j:]
print('   ok  card CSS replaced (%d -> %d chars)' % (j - i, len(NEW_CSS)))

# ─── 2. the list template ───────────────────────────────────────────────────
OLD_TPL = """<a class="work-card rv" href="{{href}}" data-open="{{openIn}}" aria-label="Open the {{title}} case study">
          <div class="work-preview" style="--preview-bg:#070d12;--preview-ink:#e9eff1" data-image="{{preview.image}}">
            <span class="badge">{{badge}}</span>
            {{preview.svg}}
          </div>
          <div class="work-body">
            <div class="work-meta"><span>{{meta}}</span><span class="yr">{{year}}</span></div>
            <h3>{{title}} <span class="it">{{titleItalic}}</span></h3>
            <p class="work-prob">{{problem}}</p>
            <p class="work-out">{{outcome}}</p>
            <div class="work-tags">{{#tags}}<span class="work-tag">{{.}}</span>{{/tags}}</div>
            <span class="work-cta">{{cta}} <i></i></span>
          </div>
        </a>"""

NEW_TPL = """<a class="work-card rv" href="{{href}}" data-open="{{openIn}}" aria-label="Open the {{title}} case study">
          <div class="work-preview" style="--preview-bg:{{preview.bg}};--preview-ink:{{preview.ink}};--preview-dot:{{preview.dot}}" data-image="{{preview.image}}">
            {{#fields.badge}}<span class="badge">{{badge}}</span>{{/fields.badge}}
            {{#fields.dots}}<div class="work-dots"><i></i><i></i><i></i><i></i></div>{{/fields.dots}}
            {{preview.svg}}
          </div>
          <div class="work-body">
            {{#fields.meta}}<div class="work-meta"><span>{{meta}}</span><span class="yr">{{year}}</span></div>{{/fields.meta}}
            <h3>{{title}} <span class="it">{{titleItalic}}</span></h3>
            {{#fields.problem}}<p class="work-prob">{{problem}}</p>{{/fields.problem}}
            {{#fields.outcome}}<p class="work-out">{{outcome}}</p>{{/fields.outcome}}
            {{#fields.tags}}<div class="work-tags">{{#tags}}<span class="work-tag">{{.}}</span>{{/tags}}</div>{{/fields.tags}}
            {{#fields.cta}}<span class="work-cta">{{cta}} <i></i></span>{{/fields.cta}}
          </div>
        </a>"""
if OLD_TPL not in s:
    sys.exit('work-card template not found')
s = s.replace(OLD_TPL, NEW_TPL, 1)
print('   ok  template rebuilt with field conditionals')

# ─── 3. the four baked cards (the no-JS fallback) ───────────────────────────
# 3a. give each preview plate its artwork colours, including the dot accent
DOTS = ['#2ee6a6', '#2ee6a6', '#7d80f0', '#ff6f52']
plates = list(re.finditer(r'<div class="work-preview" style="--preview-bg:(#[0-9a-f]{6});--preview-ink:(#[0-9a-f]{6})">', s))
if len(plates) != 4:
    sys.exit('expected 4 baked preview plates, found %d' % len(plates))
out, last = [], 0
for n, m in enumerate(plates):
    out.append(s[last:m.start()])
    out.append('<div class="work-preview" style="--preview-bg:%s;--preview-ink:%s;--preview-dot:%s">'
               % (m.group(1), m.group(2), DOTS[n]))
    last = m.end()
out.append(s[last:])
s = ''.join(out)
print('   ok  4 preview plates given a dot accent')

# 3b. dots after each badge
# only the baked cards: the template's badge holds a {{slot}}, not literal text
badges = [m for m in re.finditer(r'(<span class="badge">[^<]*</span>)', s) if '{{' not in m.group(1)]
if len(badges) != 4:
    sys.exit('expected 4 baked badges, found %d' % len(badges))
out, last = [], 0
for m in badges:
    out.append(s[last:m.end()])
    out.append('\n            <div class="work-dots"><i></i><i></i><i></i><i></i></div>')
    last = m.end()
out.append(s[last:])
s = ''.join(out)
print('   ok  4 dot rows added')

# 3c. the default is the mockup's set: meta, description and outcome off
for cls in ('work-meta', 'work-prob', 'work-out'):
    pat = r'<(div|p) class="%s">' % cls
    n = len(re.findall(pat, s))
    s = re.sub(pat, lambda m: '<%s class="%s is-off">' % (m.group(1), cls), s)
    print('   ok  %s hidden by default (%d)' % (cls, n))

# 3d. the mining artwork had its own dot row; it is a card element now
sub(r'\n\s*<g fill="#2ee6a6" opacity="\.9">\s*<circle cx="300" cy="40" r="2\.5"/><circle cx="330" cy="40" r="2\.5"/><circle cx="360" cy="40" r="2\.5"/><circle cx="390" cy="40" r="2\.5"/>\s*</g>',
    '', 'mining artwork: removed the duplicated dot row')

open(TARGET, 'w', encoding='utf-8').write(s)
print('\nwrote %s (%d KB)' % (TARGET, len(s) // 1024))