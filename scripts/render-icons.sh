#!/usr/bin/env bash
# Rasterize MailContext brand SVGs to PNG sizes used by Chrome / CWS.
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

echo "Wrote $icons/icon-{16,32,48}.png (full-bleed), $icons/icon-128.png (store pad), and $store/small-tile-440x280.png"
