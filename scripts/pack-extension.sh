#!/usr/bin/env bash
# Build a Chrome Web Store zip with manifest.json at the archive root.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
version="$(python3 -c "import json; print(json.load(open('$root/extension/manifest.json'))['version'])")"
out_dir="$root/dist"
out="$out_dir/mailcontext-${version}.zip"

mkdir -p "$out_dir"
rm -f "$out"

(
  cd "$root/extension"
  zip -r "$out" \
    manifest.json \
    background.js \
    content.js \
    content.css \
    offscreen.html \
    offscreen.js \
    popup.html \
    lib \
    icons/icon.svg \
    icons/icon-store.svg \
    icons/glyph.svg \
    icons/icon-16.png \
    icons/icon-32.png \
    icons/icon-48.png \
    icons/icon-128.png \
    -x '*/.DS_Store'
)

echo "Wrote $out"
unzip -l "$out"
