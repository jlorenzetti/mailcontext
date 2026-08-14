# Chrome Web Store listing

Listing text and assets. Contract: [Product Definition v1](product-definition-v1.md).
Homepage: [mailcontext.com](https://mailcontext.com) ([`site/`](../site/)).
Until Pages + DNS serve HTTPS, CWS may use the GitHub URLs below.

## Item

| Field | Value |
|---|---|
| Name | MailContext |
| Summary (≤132 chars) | Copy a Gmail message or thread as clean Markdown—ready to paste into AI, docs, chat, or notes. |
| Category | Productivity / Tools |
| Language | English |

Manifest `description` is a shorter form of the summary.

## Description

```text
Email, copied right.

MailContext copies one Gmail message—or an entire thread—as clean, compact
Markdown you can paste into an AI assistant, a doc, chat, or notes.

How to use
• Open a conversation in Gmail
• Thread More (⋮) → Copy thread
• Message More (⋮) → Copy message
• Or Alt+Shift+T / Alt+Shift+M (on macOS Alt is Option; remap in chrome://extensions/shortcuts if needed)

What you get
• Lean headers (Subject, From, Date, To, Cc when present—never Bcc)
• Attachment names, not files
• Honest failure if a copy cannot complete (clipboard unchanged)
• Local processing only: no MailContext account, backend, or analytics

Free and open source (MIT): https://github.com/jlorenzetti/mailcontext
```

## Single purpose

Copy the open Gmail message or conversation as lean Markdown to the clipboard.

## Permission justifications

| Permission | Justification |
|---|---|
| Host `mail.google.com` | Read the open conversation via Gmail print view and Show original so Copy message / Copy thread can run. No other hosts. |
| `clipboardWrite` | Write the Markdown result after a successful copy. Failures do not overwrite the clipboard. |
| `offscreen` | Host a short-lived extension page that parses print HTML and writes the clipboard so Copy still works if the user switches away from Gmail during extraction. |
| `storage` | Cache Gmail’s short-lived `ik` session key in `chrome.storage.session` for Show original header enrichment. Not used for analytics or mail bodies. |

## Privacy

See [privacy.md](privacy.md). Store disclosures follow the Chrome Web Store
[User Data](https://developer.chrome.com/docs/webstore/user_data) and
[Limited Use](https://developer.chrome.com/docs/webstore/program-policies/limited-use)
policies. Remote code: none.

Privacy policy URL:
`https://mailcontext.com/privacy`

Fallback until the domain is live:
`https://github.com/jlorenzetti/mailcontext/blob/main/docs/privacy.md`

## Graphic assets

| Asset | File |
|---|---|
| Store / install icon | `extension/icons/icon-128.png` (from `icon-store.svg`; 96×96 + 16px pad) |
| Small promo tile 440×280 | [`store/small-tile-440x280.png`](../store/small-tile-440x280.png) |
| Screenshot 1 | [`store/screenshots/01-copy-message-menu.png`](../store/screenshots/01-copy-message-menu.png) |
| Screenshot 2 | [`store/screenshots/02-paste-result.png`](../store/screenshots/02-paste-result.png) |

## Package

```sh
./scripts/pack-extension.sh
```

Produces `dist/mailcontext-<manifest-version>.zip` (gitignored) with
`manifest.json` at the archive root. Version: `extension/manifest.json`.

Brand: [0007](decisions/0007-brand-mark-and-ink-plate.md).
