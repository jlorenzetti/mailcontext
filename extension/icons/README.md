<!--
  Source of truth for MailContext icons.
-->

# Icons

One glyph, two brand rasters.

| Surface | Source | Treatment |
|---|---|---|
| Gmail More menus | CSS data-URI from `glyph.svg` | Outline, Gmail greys |
| Toolbar / `chrome://extensions` | `icon.svg` → 16/32/48 | Full-bleed ink plate |
| CWS / install dialog | `icon-store.svg` → 128 | 96×96 artwork, 16px transparent pad |

- `glyph.svg` — 24dp copy+mail mark
- `icon.svg` — full-bleed plate (toolbar weight)
- `icon-store.svg` — padded plate (store guide)
- `icon-16.png` / `icon-32.png` / `icon-48.png` / `icon-128.png`

Regenerate from the repo root:

```sh
./scripts/render-icons.sh
```
