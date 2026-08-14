# MailContext extension

Unpacked Chromium MV3 extension. Ship bar:
[MVP Scope v1](../docs/mvp-scope-v1.md). Module map:
[ARCHITECTURE.md](ARCHITECTURE.md).

Pipeline:

`open Gmail thread → identity → SW print+parse → optional om (short threads) → clipboard`

## Install (Chrome / Edge)

End users: [Chrome Web Store](https://chromewebstore.google.com/detail/mailcontext/pgfpfclbekccjjbmmmllpeeimoillomc).

This folder is the unpacked developer path:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select this `extension/` folder
4. Open [Gmail](https://mail.google.com) and reload the tab (or hit **Reload** on the extension)

## Use

With a conversation open:

- **Copy thread** — thread More (⋮) → *Copy thread*
- **Copy message** — message More (⋮) → *Copy message*
- Shortcuts (`chrome://extensions/shortcuts` if they conflict):
  - `Alt+Shift+T` — copy thread
  - `Alt+Shift+M` — copy focused/expanded message  
  On macOS, `Alt` is **⌥ Option**. Remap at `chrome://extensions/shortcuts` if needed.
Toast feedback reports success or failure. Failures do not overwrite the
clipboard.

## Scope

In (MVP): hybrid extraction (print + Show original when possible), More-menu
actions, lean Markdown, local-only processing. Details:
[Product Definition v1](../docs/product-definition-v1.md).

Icons: [icons/](icons/). Store listing copy:
[docs/cws-listing.md](../docs/cws-listing.md). Ship criteria:
[MVP Scope — Acceptance bar](../docs/mvp-scope-v1.md#acceptance-bar-ship).

## Privacy

Email content stays in the browser session and clipboard. No MailContext
backend, analytics, or OAuth. `Bcc` from Show original is intentionally not
copied. Policy: [mailcontext.com/privacy](https://mailcontext.com/privacy).
