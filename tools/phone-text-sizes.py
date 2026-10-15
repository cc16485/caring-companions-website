"""Phone readability pass for mo-care.com.
Every px font-size under 17px on a page that loads assets/site.css is wrapped as
  max(Npx, var(--fs-read, 0px))   running text (paragraphs, list items, long copy)
  max(Npx, var(--fs-head, 0px))   small headings, so a card title stays above its 17px text
  max(Npx, var(--fs-min, 0px))    everything else (labels, captions, buttons, chips)
The two variables are only defined on phones (site.css), so on tablets and desktop
max(Npx, 0px) = Npx and nothing changes. Text greys are darkened everywhere."""
import os, re, sys, collections
ROOT = sys.argv[1]
SKIP_DIRS = ('internal', 'docs', 'email-assets', 'tests', '.git', 'supabase', 'tools', '.claude')
READ_TAGS = {'p', 'li', 'dd', 'blockquote', 'td', 'input', 'textarea', 'select', 'figcaption'}
stats = collections.Counter()

GREYS = {'#55677a': '#45566a', '#66736b': '#4f5b54', '#9aa69e': '#4f5b54', '#a3ada6': '#4f5b54', '#a99f89': '#7a6f58'}
def darken(text):
    def rep(m):
        new = GREYS.get(m.group(2).lower())
        if not new: return m.group(0)
        stats['grey'] += 1
        return m.group(1) + new
    # only text colour (color: / --muted vars), never background or border
    return re.sub(r'((?<![-\w])color\s*:\s*|--muted(?:-label)?\s*:\s*)(#[0-9a-fA-F]{6})\b', rep, text)

def is_label(decls):
    d = decls.lower().replace(' ', '')
    if 'text-transform:uppercase' in d: return True
    m = re.search(r'letter-spacing:([0-9.]+)(em|px)', d)
    return bool(m and ((m.group(2) == 'em' and float(m.group(1)) >= 0.04) or (m.group(2) == 'px' and float(m.group(1)) >= 0.6)))

def lh(decls):
    m = re.search(r'line-height\s*:\s*([0-9.]+)(px)?\s*(;|$|!)', decls)
    if not m: return 0
    return 0 if m.group(2) else float(m.group(1))

def fixed_box(decls):
    d = decls.replace(' ', '')
    return bool(re.search(r'(^|;|\s)(min-)?width:\d', d) and re.search(r'(^|;|\s)(min-)?height:\d', d))

def wrap(decls, kind_fn):
    def rep(m):
        size = float(m.group(2))
        if size >= 17: return m.group(0)
        kind = kind_fn(size)
        if kind is None: return m.group(0)
        if kind == 'min' and size >= 15: return m.group(0)
        stats[kind] += 1
        return f'{m.group(1)}max({m.group(2)}px, var(--fs-{kind}, 0px))'
    return re.sub(r'((?<![-\w])font-size\s*:\s*)([0-9.]+)px', rep, decls)

def bold(decls):
    m = re.search(r'font-weight\s*:\s*(\d+|bold)', decls)
    return bool(m and (m.group(1) == 'bold' or int(m.group(1)) >= 600))

def classify(running, decls, size, heading=False):
    if fixed_box(decls): return None              # numbers in circles, badges with a set box
    if is_label(decls): return 'min'
    if heading and size >= 13: return 'head'
    if running and size >= 12.5: return 'read'
    return 'min'

def do_inline(text):
    pat = re.compile(r'<([a-zA-Z][\w-]*)((?:[^<>"\']|"[^"]*"|\'[^\']*\')*?\s)style\s*=\s*(["\'])(.*?)\3', re.S)
    def rep(m):
        tag, decls = m.group(1).lower(), m.group(4)
        heading = re.match(r'^h[1-6]$', tag) is not None or (tag == 'p' and bold(decls) and lh(decls) < 1.45)
        running = tag in READ_TAGS or (tag in ('div', 'span', 'label') and lh(decls) >= 1.45)
        new = wrap(decls, lambda s: classify(running, decls, s, heading))
        return m.group(0)[:m.start(4) - m.start(0)] + new + m.group(0)[m.end(4) - m.start(0):]
    return pat.sub(rep, text)

READISH = re.compile(r'[.#][\w-]*(sub|lead|desc|intro|body|copy|blurb|answer|para|story)\b', re.I)
def do_css(css):
    # selectors that set a reading line-height in any rule count as running text in all their rules
    tall = set()
    for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', css):
        if lh(m.group(2)) >= 1.45: tall.update(s.strip() for s in m.group(1).split(','))
    def rep(m):
        sel, decls = m.group(1), m.group(2)
        if sel.strip().startswith('@') or 'font-size' not in decls: return m.group(0)
        last = [s.strip().split()[-1] if s.strip() else '' for s in sel.split(',')]
        tagish = any(re.match(r'^(p|li|dd|blockquote|td|input|textarea|select)\b', re.sub(r'^[>+~]', '', l)) for l in last)
        sels = [s.strip() for s in sel.split(',')]
        heading = all(re.search(r'(^|[\s>])h[1-6]\b[^\s]*$', s) for s in sels if s)
        running = tagish or lh(decls) >= 1.45 or any(s in tall for s in sels) or any(READISH.search(l) for l in last)
        return sel + '{' + wrap(decls, lambda s: classify(running, decls, s, heading)) + '}'
    return re.sub(r'([^{}]+)\{([^{}]*)\}', rep, css)

def do_html(text):
    text = re.sub(r'(<style[^>]*>)(.*?)(</style>)', lambda m: m.group(1) + do_css(m.group(2)) + m.group(3), text, flags=re.S | re.I)
    return do_inline(text)

changed = 0
for r, ds, fs in os.walk(ROOT):
    rel = os.path.relpath(r, ROOT)
    if rel.split(os.sep)[0] in SKIP_DIRS: continue
    for f in fs:
        p = os.path.join(r, f)
        if f.endswith('.html'):
            t = open(p, encoding='utf-8').read()
            n = darken(t)
            if 'assets/site.css' in t: n = do_html(n)
        elif p == os.path.join(ROOT, 'assets', 'site.css'):
            t = open(p, encoding='utf-8').read(); n = do_css(darken(t))
        else: continue
        if n != t:
            open(p, 'w', encoding='utf-8').write(n); changed += 1
print('files changed', changed, dict(stats))
