#!/usr/bin/env bash
# Rasterize MailContext brand SVGs to PNG sizes used by Chrome / CWS / OG.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
rsvg="${RSVG_CONVERT:-rsvg-convert}"

if ! command -v "$rsvg" >/dev/null 2>&1; then
  echo "rsvg-convert not found. Install librsvg or set RSVG_CONVERT." >&2
  exit 1
fi

icons="$root/extension/icons"
store="$root/store"

# Full-bleed for toolbar / management page.
for size in 16 32 48; do
  "$rsvg" -w "$size" -h "$size" "$icons/icon.svg" -o "$icons/icon-${size}.png"
done

# Padded artwork for CWS / install dialog.
"$rsvg" -w 128 -h 128 "$icons/icon-store.svg" -o "$icons/icon-128.png"

"$rsvg" -w 440 -h 280 "$store/small-tile.svg" -o "$store/small-tile-440x280.png"

python3 - "$root" <<'PY'
"""Wrap store/small-tile.svg into OG (1200x630) and GitHub social (1280x640)."""
from pathlib import Path
import re
import sys

root = Path(sys.argv[1])
tile = (root / "store/small-tile.svg").read_text(encoding="utf-8")
match = re.search(r"<svg\b[^>]*>(.*)</svg>\s*\Z", tile, re.S | re.I)
if not match:
    sys.exit("could not parse store/small-tile.svg")
inner = match.group(1)
ink = "#1E3A4C"
tile_w, tile_h = 440, 280


def wrap(path: Path, canvas_w: int, canvas_h: int, inset: int, comment: str) -> None:
    """Height/width-fit the tile in the canvas, centered, with optional inset."""
    inner_w = canvas_w - 2 * inset
    inner_h = canvas_h - 2 * inset
    scale = min(inner_w / tile_w, inner_h / tile_h)
    w = tile_w * scale
    h = tile_h * scale
    x = (canvas_w - w) / 2
    y = (canvas_h - h) / 2
    path.write_text(
        f"""<?xml version="1.0" encoding="UTF-8"?>
<!--
  {comment}
-->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {canvas_w} {canvas_h}" width="{canvas_w}" height="{canvas_h}">
  <rect width="{canvas_w}" height="{canvas_h}" fill="{ink}" />
  <svg
    viewBox="0 0 {tile_w} {tile_h}"
    x="{x:.3f}"
    y="{y:.3f}"
    width="{w:.3f}"
    height="{h:.3f}"
    fill-rule="evenodd"
    stroke-linecap="round"
    stroke-linejoin="round"
  >{inner}
  </svg>
</svg>
""",
        encoding="utf-8",
    )
    print(f"Wrote {path}")


wrap(
    root / "site/og.svg",
    1200,
    630,
    0,
    "Open Graph 1200x630 from store/small-tile.svg.",
)
wrap(
    root / "store/github-social.svg",
    1280,
    640,
    40,
    "GitHub social preview 1280x640 from store/small-tile.svg.",
)
PY

"$rsvg" -w 1200 -h 630 "$root/site/og.svg" -o "$root/site/og.png"
"$rsvg" -w 1280 -h 640 "$store/github-social.svg" -o "$store/github-social-1280x640.png"

echo "Wrote $icons/icon-{16,32,48}.png (full-bleed), $icons/icon-128.png (store pad), $store/small-tile-440x280.png, $root/site/og.png, and $store/github-social-1280x640.png"
