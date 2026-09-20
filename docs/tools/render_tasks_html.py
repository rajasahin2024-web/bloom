#!/usr/bin/env python3
"""Render Bloom-Dev-Tasks-InDepth.md -> Bloom-Dev-Tasks-InDepth.html with the house style."""
import html, re, sys

SRC = "Bloom-Dev-Tasks-InDepth.md"
OUT = "Bloom-Dev-Tasks-InDepth.html"

CSS = """:root{ --navy:#0b2a4a; --teal:#0f8a8a; --ink:#1a2433; --mut:#5b6b7f; --line:#e3e9f0; --soft:#f4f8fb; --amber:#8a5a00; --amberbg:#fdf6e7; }
  *{ box-sizing:border-box; }
  body{ font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; color:var(--ink); margin:0; background:#fff; line-height:1.6; font-size:14.5px; }
  .page{ max-width:960px; margin:0 auto; padding:48px 44px; }
  h1{ font-size:28px; letter-spacing:-.5px; margin:0 0 10px; color:var(--navy); line-height:1.2; border-bottom:4px solid var(--navy); padding-bottom:18px; }
  h2{ font-size:19px; color:var(--navy); margin:32px 0 8px; padding-top:12px; border-top:1px solid var(--line); }
  h3{ font-size:15.5px; color:var(--navy); margin:20px 0 6px; }
  h4{ font-size:14px; color:var(--teal); margin:16px 0 4px; }
  p{ margin:7px 0; }
  ul,ol{ margin:6px 0 6px 4px; padding-left:20px; }
  li{ margin:4px 0; }
  table{ width:100%; border-collapse:collapse; margin:12px 0; font-size:12.8px; }
  th{ text-align:left; background:var(--navy); color:#fff; padding:8px 10px; font-weight:600; }
  td{ padding:7px 10px; border-bottom:1px solid var(--line); vertical-align:top; }
  tr:nth-child(even) td{ background:var(--soft); }
  code{ background:#eef2f6; padding:1px 6px; border-radius:5px; font-size:12.5px; font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; }
  blockquote{ margin:12px 0; padding:10px 16px; border-left:4px solid var(--teal); background:var(--soft); border-radius:0 8px 8px 0; }
  blockquote p{ margin:0; }
  .need{ background:var(--amberbg); border:1px solid #ecd9a8; border-radius:8px; padding:12px 16px; margin:12px 0; font-size:13px; }
  .need b{ color:var(--amber); }
  .footer-note{ margin-top:36px; padding-top:14px; border-top:1px solid var(--line); color:var(--mut); font-size:12.5px; }
  @media print{ body{ font-size:12px } .page{ padding:20px } h2{ page-break-after:avoid } table{ page-break-inside:avoid } }"""

def inline(t):
    t = html.escape(t)
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', t)
    t = re.sub(r'(?<!\w)\*([^*\n]+)\*(?!\w)', r'<i>\1</i>', t)
    t = t.replace('&#x27;', "'")
    return t

def render(lines):
    out, i = [], 0
    while i < len(lines):
        line = lines[i]
        s = line.strip()
        if not s:
            i += 1; continue
        if s == '---':
            i += 1; continue
        m = re.match(r'^(#{1,4})\s+(.*)', s)
        if m:
            lvl = len(m.group(1))
            out.append(f'<h{lvl}>{inline(m.group(2))}</h{lvl}>')
            i += 1; continue
        if s.startswith('>'):
            buf = []
            while i < len(lines) and lines[i].strip().startswith('>'):
                buf.append(lines[i].strip()[1:].strip()); i += 1
            out.append('<blockquote><p>' + inline(' '.join(buf)) + '</p></blockquote>')
            continue
        if s.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                rows.append(lines[i].strip()); i += 1
            cells = [ [c.strip() for c in r.strip('|').split('|')] for r in rows ]
            html_rows = []
            for ri, row in enumerate(cells):
                if ri == 1 and all(re.match(r'^:?-{2,}:?$', c) for c in row):
                    continue
                tag = 'th' if ri == 0 else 'td'
                html_rows.append('<tr>' + ''.join(f'<{tag}>{inline(c)}</{tag}>' for c in row) + '</tr>')
            out.append('<table>' + ''.join(html_rows) + '</table>')
            continue
        if re.match(r'^[-*]\s+', s):
            items = []
            while i < len(lines) and re.match(r'^[-*]\s+', lines[i].strip()):
                items.append(re.sub(r'^[-*]\s+', '', lines[i].strip())); i += 1
            out.append('<ul>' + ''.join(f'<li>{inline(x)}</li>' for x in items) + '</ul>')
            continue
        if re.match(r'^\d+\.\s+', s):
            items = []
            while i < len(lines) and re.match(r'^\d+\.\s+', lines[i].strip()):
                items.append(re.sub(r'^\d+\.\s+', '', lines[i].strip())); i += 1
            out.append('<ol>' + ''.join(f'<li>{inline(x)}</li>' for x in items) + '</ol>')
            continue
        # paragraph — merge following continuation lines (bolded pseudo-headings stay inline)
        buf = [s]; i += 1
        while i < len(lines) and lines[i].strip() and not re.match(r'^(#{1,4}\s|\||>|-{3,}$|[-*]\s|\d+\.\s)', lines[i].strip()):
            buf.append(lines[i].strip()); i += 1
        para = ' '.join(buf)
        if para.startswith('*') and para.endswith('*') and para.count('*') == 2:
            out.append(f'<p class="footer-note">{inline(para.strip("*"))}</p>')
        else:
            out.append(f'<p>{inline(para)}</p>')
    return '\n'.join(out)

def main():
    lines = open(SRC).read().split('\n')
    body = render(lines)
    title = "Development Tasks (In-Depth) — Bloom Academy IELTS Platform"
    doc = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>
  {CSS}
</style>
</head>
<body><div class="page">
{body}
</div></body>
</html>
'''
    open(OUT, 'w').write(doc)
    print(f'wrote {OUT} ({len(doc)} bytes)')

if __name__ == '__main__':
    main()
