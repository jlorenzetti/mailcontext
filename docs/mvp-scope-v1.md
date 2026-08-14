<!--
  MailContext MVP Scope v1 — first shippable slice.
-->

# MVP Scope v1

What ships, what waits, and which bars must pass before Chrome Web Store
packaging. Product contract: [Product Definition v1](product-definition-v1.md).
Evidence: [technical discovery](technical-discovery-v1.md),
[`extension/`](../extension/).

> Copy one message or the whole thread—clean, complete, and ready to paste.

## Architecture (locked)

| Choice | Decision |
|---|---|
| Client | Chromium extension, Manifest V3 |
| Surface | Gmail web, desktop reading view (`mail.google.com`) |
| Day-one browsers | Chrome first; Edge acceptable if identical MV3 path |
| Firefox | Out of MVP |
| Extraction | Hybrid: reading DOM identity + `view=pt` bodies; `view=om` RFC headers for single-message copy and short threads (≤20 messages) when `ik` + `permmsgid` are available; longer threads keep print headers |
| Processing | Local-only; no MailContext backend |
| Codebase | Evolve [`extension/`](../extension/) — do not greenfield a second prototype ([0006](decisions/0006-promote-spike-to-mvp-base.md)) |

## In scope

### Actions and UX

- **Copy message** and **Copy thread** as peers
- Entries in Gmail More (⋮) menus (thread + per-message); classic and Material menus
- Distinct keyboard shortcuts: `Alt+Shift+T` (thread) / `Alt+Shift+M` (message)
  on all platforms (`Alt` is ⌥ Option on macOS). Remap via
  `chrome://extensions/shortcuts` if needed.
- Transient success / notice / failure feedback (Gmail-like snackbar;
  Material `LENGTH_LONG` = 2750 ms, no action)
- No mandatory preview or settings sheet

### Output

- Default lean Markdown per Product Definition §2 and [golden examples](examples/README.md)
- Headers: Subject (thread: first message only), From, Date, To, Cc if present; never Bcc
- Date: RFC 5322 from Show original when enrichment succeeds; else absolute print/UI datetime
- Attachment **names** when present; never bytes
- Strip duplicated quoted history; conservative signature handling
- Inter-message `---` in threads

### Honesty

- Failure leaves clipboard unchanged
- Print-first completeness for collapsed (`.kv` / `.kQ`) and trimmed (`div.ajR`) content when print returns the full set
- Missing `From` / `Date` after parse → **Failure** (do not copy)
- Header source (Show original vs print) is not shown in the snackbar; diagnostics stay in the console
- Do not invent missing header fields

### Distribution

- Open source **MIT**, free
- Chrome Web Store as first public channel
- Unpacked load remains the developer path

## Out of MVP

- Firefox / Safari / mobile Gmail
- Local preview, options UI, accounts sync, cloud processing
- Non-Gmail providers; compose / reply generation; delivery into third-party apps
- JSON / machine envelopes as default
- Aggressive marketing-chrome cleanup (e.g. Airbnb footers) — backlog after ship bar
- Automated fixture suite and CI packaging — start after scope freeze, not as blockers to coding

## Acceptance bar (ship)

Must be true on a small real-account corpus (≤10 threads, including at least one
with `.kQ` or collapse and one without attachments):

1. **Happy path:** Copy message and Copy thread succeed from More menus on Chrome.
2. **Completeness:** Thread copy message count matches print `table.message` count for the open conversation.
3. **Headers:** RFC `Date:` when `ik` discovery succeeds; otherwise absolute date on its own line.
4. **Honesty:** Forced failure paths (not on thread / fetch fail) do not overwrite the clipboard.
5. **Local-only:** No network calls except same-origin Gmail fetches required for extraction.
6. **Permissions:** Host limited to `https://mail.google.com/*`, plus
   `clipboardWrite`, `storage`, and `offscreen` as declared in the manifest.

Paste quality vs golden examples is assessed at release time; it is not a
reason to reopen architecture.

## Non-goals for this phase

- Perfect lean output on every marketing template
- Pixel-perfect menu icons across every Gmail experiment
- Cross-browser parity
