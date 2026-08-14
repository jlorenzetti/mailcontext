<!--
  Promo and listing graphics (not shipped inside the extension zip).
  Affinity / design-tool sources stay local (gitignored); commit SVG/PNG only.
-->

# Store graphics

- `small-tile.svg` — 440×280 promo master (ink plate + glyph + name)
- `small-tile-440x280.png` — store promo tile
- `github-social.svg` / `github-social-1280x640.png` — GitHub social preview
  (1280×640, 2:1, 40px inset)
- `screenshots/` — listing screenshots (1280×800)

| File | Content |
|---|---|
| `screenshots/01-copy-message-menu.png` | Gmail More → Copy message + toast |
| `screenshots/02-paste-result.png` | Pasted lean Markdown in an editor |

Regenerate tile/icons from the repo root: `./scripts/render-icons.sh`

Listing copy: [docs/cws-listing.md](../docs/cws-listing.md).
