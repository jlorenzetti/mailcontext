<!--
  Public site (GitHub Pages). Source in this folder; built by
  scripts/build-site.py. Brand: docs/decisions/0007-brand-mark-and-ink-plate.md
-->

# Public site

Minimal landing for [mailcontext.com](https://mailcontext.com). Privacy is
rendered from [`docs/privacy.md`](../docs/privacy.md) at `/privacy`.

## Preview

```sh
python3 scripts/build-site.py
python3 -m http.server -d dist/pages
```

## Deploy

Push to `main` runs `.github/workflows/deploy-site.yml` (Pages source: GitHub
Actions). Custom domain: `site/CNAME` is `mailcontext.com`.

## Install CTA

`index.html` **Install for Chrome** points at
[GitHub Releases (latest)](https://github.com/jlorenzetti/mailcontext/releases/latest)
until the Chrome Web Store item is public. Then switch that `href` to the store
URL.
