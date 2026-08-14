#!/usr/bin/env python3
"""Assemble the GitHub Pages artifact in dist/pages.

Copies static files from site/, adds the brand favicon, and renders
/privacy from docs/privacy.md so the policy stays a single source.

Markdown conversion is a stdlib subset (headings, emphasis, links, code,
lists, tables) so the script runs without pip.
"""

from __future__ import annotations

import html
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
OUT = ROOT / "dist" / "pages"
TEMPLATE = SITE / "_privacy.template.html"
PRIVACY_MD = ROOT / "docs" / "privacy.md"
ICON = ROOT / "extension" / "icons" / "icon.svg"

STATIC = ("index.html", "404.html", "styles.css", "CNAME", ".nojekyll")

INLINE = re.compile(
    r"(`[^`]+`)"
    r"|(\*\*[^*]+\*\*)"
    r"|(\[[^\]]+\]\([^)]+\))"
)


def inline(text: str) -> str:
    """Escape text and render inline code, bold, and links."""
    parts: list[str] = []
    pos = 0
    for match in INLINE.finditer(text):
        parts.append(html.escape(text[pos : match.start()]))
        raw = match.group(0)
        if raw.startswith("`"):
            parts.append(f"<code>{html.escape(raw[1:-1])}</code>")
        elif raw.startswith("**"):
            parts.append(f"<strong>{html.escape(raw[2:-2])}</strong>")
        else:
            label, url = re.fullmatch(r"\[([^\]]+)\]\(([^)]+)\)", raw).groups()
            parts.append(
                f'<a href="{html.escape(url, quote=True)}">{html.escape(label)}</a>'
            )
        pos = match.end()
    parts.append(html.escape(text[pos:]))
    return "".join(parts)


def fold(lines: list[str]) -> str:
    """Join wrapped Markdown lines; two trailing spaces become <br>."""
    chunks: list[str] = []
    buf = lines[0].rstrip()
    for line in lines[1:]:
        nxt = line.strip()
        if buf.endswith("  "):
            chunks.append(inline(buf[:-2]))
            buf = nxt
        else:
            buf = f"{buf} {nxt}"
    chunks.append(inline(buf))
    return "<br>\n".join(chunks)


def table_html(lines: list[str]) -> str:
    """Render a pipe table; skip the alignment separator row."""
    rows = []
    for line in lines:
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        rows.append(cells)
    body = rows[1:]
    if body and all(re.fullmatch(r":?-{3,}:?", c.replace(" ", "")) for c in body[0]):
        body = body[1:]
    head = "".join(f"<th>{inline(c)}</th>" for c in rows[0])
    body_html = "".join(
        "<tr>" + "".join(f"<td>{inline(c)}</td>" for c in row) + "</tr>"
        for row in body
    )
    return (
        "<table>\n<thead>\n<tr>"
        f"{head}</tr>\n</thead>\n<tbody>\n{body_html}\n</tbody>\n</table>"
    )


def list_html(lines: list[str]) -> str:
    """Render a hyphen list, including wrapped continuation lines."""
    items: list[list[str]] = []
    current: list[str] | None = None
    for line in lines:
        if line.startswith("- "):
            if current is not None:
                items.append(current)
            current = [line[2:]]
        elif current is not None:
            current.append(line.strip())
        else:
            current = [line]
    if current is not None:
        items.append(current)
    lis = "".join(f"<li>{fold(item)}</li>\n" for item in items)
    return f"<ul>\n{lis}</ul>"


def markdown_html(src: str) -> str:
    """Convert the privacy-policy Markdown subset to HTML fragments."""
    src = re.sub(r"^<!--.*?-->\s*", "", src, count=1, flags=re.S)
    src = re.sub(r"^# Privacy policy\s*", "", src, count=1)
    blocks: list[list[str]] = []
    current: list[str] = []
    for line in src.splitlines():
        if line.strip() == "":
            if current:
                blocks.append(current)
                current = []
        else:
            current.append(line)
    if current:
        blocks.append(current)

    out: list[str] = []
    for block in blocks:
        first = block[0]
        if first.startswith("## "):
            out.append(f"<h2>{inline(first[3:].strip())}</h2>")
        elif first.startswith("|"):
            out.append(table_html(block))
        elif first.startswith("- "):
            out.append(list_html(block))
        else:
            out.append(f"<p>{fold(block)}</p>")
    return "\n".join(out)


def privacy_html() -> str:
    """Convert docs/privacy.md to HTML, dropping the file header comment."""
    return markdown_html(PRIVACY_MD.read_text(encoding="utf-8"))


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    for name in STATIC:
        shutil.copy2(SITE / name, OUT / name)

    shutil.copy2(ICON, OUT / "favicon.svg")

    template = TEMPLATE.read_text(encoding="utf-8")
    if "{{content}}" not in template:
        sys.exit("privacy template missing {{content}}")
    privacy_dir = OUT / "privacy"
    privacy_dir.mkdir()
    (privacy_dir / "index.html").write_text(
        template.replace("{{content}}", privacy_html()),
        encoding="utf-8",
    )

    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
