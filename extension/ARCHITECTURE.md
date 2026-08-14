<!--
  Module map for the MailContext Chromium MV3 extension.
-->

# Extension architecture

Lean map of responsibilities. Observable copy behavior must not change when
modules move; prefer small files with one job over a second prototype.

## Pipeline

```
Gmail reading view
  → identity (cheap, in tab)
  → print fetch (service worker) + parse (offscreen DOMParser)
  → enrich Show original only for small threads (≤20); else print headers
  → format + clipboard (offscreen)
```

Long threads skip reading-view harvest so Gmail does not freeze. Show original
still runs for single-message copy and for short threads.

## Modules

| File | Responsibility |
|---|---|
| `background.js` | Command relay; print fetch; batched `view=om`; offscreen orchestration |
| `content.js` | Orchestrate copy; harvest only for short threads; format + toast |
| `lib/identity.js` | Account, thread, subject, message roots, target message |
| `lib/session.js` | Discover / cache / retry `ik` (Performance + print + storage) |
| `lib/print.js` | Print URL + fetch (used from SW) |
| `lib/parse.js` | Print HTML → structured thread (loaded in offscreen) |
| `lib/original.js` | `view=om` header-prefix parse (SW via importScripts) |
| `lib/expand.js` | Brief expand/collapse harvest for short threads only |
| `lib/enrich.js` | Match ids; SW om headers; skip om on long threads |
| `lib/format.js` | Structured model → lean Markdown |
| `lib/clipboard.js` | Ask the service worker to write clipboard text |
| `lib/ui.js` | More (⋮) injection + snackbar toast |
| `offscreen.html` / `offscreen.js` | Clipboard write + print DOMParser |
| `popup.html` | Toolbar help (how to use; not a copy control) |
| `content.css` | Toast / menu item styles (copy+mail glyph) |
| `icons/` | Brand PNGs + SVG sources ([README](icons/README.md)) |

Namespaces attach to `globalThis.MailContext` (`MC.identity`, `MC.print`, …).
Content scripts load in `manifest.json` order; `content.js` last.

## Intentional non-goals here

- TypeScript / bundler (optional later)
- Shared package split outside `extension/`
- Automated DOM fixture suite (see MVP backlog)
