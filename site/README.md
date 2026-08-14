<!--
  Public site (GitHub Pages). Source in this folder; built by
  scripts/build-site.py. Brand: docs/decisions/0007-brand-mark-and-ink-plate.md
-->

# Public site

Minimal landing for [mailcontext.com](https://mailcontext.com). Privacy is
rendered from [`docs/privacy.md`](../docs/privacy.md) at `/privacy`.

| File | Role |
|---|---|
| `index.html` | Home; JSON-LD `SoftwareApplication`; `{{version}}` from the manifest |
| `_privacy.template.html` | `/privacy` layout |
| `og.svg` / `og.png` | Open Graph 1200×630, from `store/small-tile.svg` |
| `robots.txt` | Crawlers |
| `sitemap.xml` | `/` and `/privacy/` |

Preview:

```sh
python3 scripts/build-site.py
python3 -m http.server -d dist/pages
```

Push to `main` deploys via `.github/workflows/deploy-site.yml`.
