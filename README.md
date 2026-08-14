# MailContext

**Email, copied right.**

MailContext copies one Gmail message—or an entire thread—as clean, compact,
human-readable Markdown ready to paste anywhere.

## Product promise

> Copy one message or the whole thread—clean, complete, and ready to paste.

## Status

- Product contract: [Product Definition v1](docs/product-definition-v1.md)
- Ship slice: [MVP Scope v1](docs/mvp-scope-v1.md)
- Code: [`extension/`](extension/) (Chromium MV3)
- Privacy: [docs/privacy.md](docs/privacy.md)
- Store listing copy: [docs/cws-listing.md](docs/cws-listing.md)

License: **MIT**. Free; Chrome Web Store first.

## Try it

1. Chrome → `chrome://extensions` → Developer mode → **Load unpacked** →
   `extension/`
2. Open Gmail, reload the tab, open a conversation
3. Thread/message More (⋮) → **Copy thread** / **Copy message**  
   Shortcuts: `Alt+Shift+T` / `Alt+Shift+M` (on macOS, `Alt` is **⌥ Option**).
   Remap at `chrome://extensions/shortcuts` if needed.

## Repository layout

| Path | Role |
|---|---|
| `extension/` | Unpacked Chrome extension (load this folder) |
| `docs/` | Product, privacy, ADRs, golden examples |
| `store/` | Chrome Web Store graphic extras (not in the zip) |
| `scripts/` | Icon render + zip pack helpers |

## Documentation

See [docs/README.md](docs/README.md). Start with Product Definition, MVP Scope,
and [golden examples](docs/examples/README.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Evolve `extension/`; do not start a
parallel prototype.
