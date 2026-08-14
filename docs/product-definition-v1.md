<!--
  MailContext Product Definition v1 — product contract (promise, output, UX).
  Ship boundaries: mvp-scope-v1.md.
-->

# Product Definition v1

Who it is for, what the clipboard must contain, how Copy message / Copy thread
work, and which bars the product must clear. Ship slice:
[MVP Scope v1](mvp-scope-v1.md).

Also: [golden examples](examples/README.md),
[principles](product-principles.md), [prior art](prior-art.md),
[reliability / privacy](reliability-and-privacy.md),
[open questions](open-questions.md).

---

## 1. Product positioning

### Initial user and priority problem

**Initial user:** people who repeatedly move email into another working
context—especially AI assistants, issues, docs, chats, and notes—and care about
accuracy, speed, and privacy.

**Priority problem:** turning a Gmail message or thread into clean, paste-ready
context still requires manual selection, Markdown cleanup, header assembly, and
quote stripping. Friction compounds with daily use.

AI paste is the strongest launch wedge. Destination-agnostic output remains the
design rule ([principle 7](product-principles.md)).

### Category and alternatives

**Category:** Gmail clipboard utility for lean, human-readable email context.

**Not:** AI reply generator, mailbox analyzer, knowledge-base sync, or general
web clipper.

**Position against** (see [prior art](prior-art.md)):

| Alternative | Gap MailContext targets |
|---|---|
| Manual copy / print / forward | Slow, noisy, incomplete headers |
| Thread-to-Markdown extensions | Often thread-first; heavier or less polished defaults |
| Strict XML/JSON envelopes | Useful for machines; poor everyday paste |
| Broad web-to-Markdown tools | Gmail is an adapter, not the product |

### Primary promise

> Copy one message or the whole thread—clean, complete, and ready to paste.

### Demonstrable differentiators

1. **Lean human-readable Markdown** — metadata + content; no XML/JSON wrappers
   or diagnostic clutter in the default clipboard result.
2. **Message and thread as peers** — both one-click, equally reliable.
3. **Honest completion** — never report success for a silently incomplete
   extraction; warnings live in UI feedback, not in the paste by default.
4. **Local-first** — email content stays on the device unless the user pastes
   elsewhere.

### Tagline and short description

| Field | Text |
|---|---|
| Tagline | Email, copied right. |
| Short description | Copy a Gmail message or thread as clean Markdown—ready to paste into AI, docs, chat, or notes. |

### First-release boundaries

**In:**

- Gmail on the web, desktop reading view;
- Chromium-based browsers first (Chrome / Edge); Firefox only if discovery
  shows comparable feasibility without diluting the MVP;
- **Copy message** and **Copy thread**;
- default lean Markdown on the clipboard;
- explicit success, warning, and failure feedback;
- local processing only;
- distribution intent: **open source (MIT)**, **free**, **Chrome Web Store
  first**.

**Out of v1:**

- compose, reply generation, search, sync, accounts, cloud processing;
- non-Gmail providers;
- direct delivery to third-party apps;
- JSON / machine envelopes as default;
- binary attachment content in the clipboard;
- local preview / advanced option panels (paste destination is the review);
- mobile Gmail app / Gmail iOS·Android WebView as primary surfaces.

---

## 2. Output specification

Canonical default format for clipboard success. Exact parser implementation is
deferred; behavior is fixed by this contract and the [golden examples](examples/README.md).

### 2.1 Canonical shapes

**Copy message**

```markdown
Subject: <subject>
From: <name> <<email>>
Date: <source date>
To: <recipients>
Cc: <recipients>          # omit entire line if empty / unavailable
Attachments: <names>      # omit entire line if none

<body>
```

**Copy thread**

```markdown
Subject: <subject>
From: <name> <<email>>
Date: <source date>
To: <recipients>
Cc: <recipients>          # omit if empty
Attachments: <names>      # omit if none

<body>

---

From: ...
Date: ...
To: ...

<body>
```

Rules:

- `Subject:` appears once, on the **first** message only—same header family as
  `From` / `Date` / `To`, not a thread title. Later messages omit it as
  redundancy avoidance (like stripping quoted prior history), not because
  subject has a different status.
- Messages are chronological (oldest → newest).
- Separator between messages is a line containing only `---`.
- Blank line after each message’s metadata block, before its body.
- Blank line before `---` and after `---` (as in the examples).

### 2.2 Metadata order and defaults

| Field | Message | Thread | Notes |
|---|---|---|---|
| `Subject` | yes | first message only | Omit on later messages (redundancy) |
| `From` | yes | per message | `Display Name <email@domain>` when both exist |
| `Date` | yes | per message | Pass through from source (see §2.3) |
| `To` | yes | per message | Omit line only if truly unavailable |
| `Cc` | if present | if present | Omit line when empty |
| `Bcc` | no (v1) | no (v1) | Rare in received mail; revisit later |
| `Attachments` | if present | if present | Filenames only; omit line when none |

**Missing fields:** omit the line. Do not invent placeholders like `(unknown)`.
If `From` or `Date` cannot be established for a message that is otherwise
included, treat as **failure** (see §2.7)—do not emit a headless body
pretending completeness.

**Long recipient lists:** keep all addresses in `To` / `Cc`, comma-separated on
one line. Do not truncate with `+N others` in v1 default output.

### 2.3 Date format

Do **not** invent a MailContext house style. Prefer the most faithful local
source, passed through unchanged:

1. **Best:** the message’s own `Date` header value (RFC 5322), when available
   locally—e.g. `Tue, 27 Jul 2026 14:32:00 +0200`.
2. **Fallback:** Gmail’s absolute rendered datetime for that message, copied as
   shown (no re-parsing into another pattern).
3. **Never:** relative UI strings (`2 hours ago`, `Yesterday`) as the sole
   clipboard date—resolve to (1) or (2), or fail if neither is available.

Honesty beats uniformity: identical messages should yield the same date string
from the same source state, not a normalized translation MailContext made up.

### 2.4 Body cleanup rules

| Content | Default |
|---|---|
| Authored paragraphs, emphasis, lists | Preserve |
| Links | `[label](url)` when label ≠ url; bare url otherwise |
| Author-written block quotes | Preserve |
| Duplicated quoted history | **Remove** |
| Forwarded message blocks that are the authored content | Preserve as readable quoted/forward structure (see examples) |
| Simple tables | Preserve as Markdown tables when still readable; otherwise flatten to lines |
| Decorative / tracking images | Remove |
| Meaningful inline images | Omit binary; no placeholders in v1 |
| Signatures | Remove when clearly boilerplate; **preserve when uncertain** |
| Legal disclaimers / confidentiality footers | Remove when clearly boilerplate; preserve when uncertain |
| Gmail UI chrome, labels, internal IDs | Never include |

**Copy message** means “what this sender wrote in this message,” not the
embedded prior thread. Quoted history is removed by default.

**Copy thread** represents each logical message once. Strip in-body quotes that
duplicate earlier messages already present as their own entries.

### 2.5 Attachments

- Default clipboard: include **filenames** when attachments are present, as an
  `Attachments:` metadata line after `Cc` / `To` (same lean pattern as other
  headers—not an envelope or wrapper format).
- Never include file bytes or extracted attachment bodies in v1.
- Never imply file contents were copied when only names were listed.
- If attachments exist but names cannot be determined → still **Success**; omit
  the `Attachments:` line. No snackbar notice in v1 (optional later).

### 2.6 Markdown subset (v1)

Allowed: paragraphs, soft line breaks where intentional, `**bold**`, `*italic*`,
ordered/unordered lists, links, simple tables, thematic `---` **only** as the
inter-message separator in threads (avoid decorative horizontal rules inside
bodies when possible).

Disallowed in default output: HTML blocks, raw XML/JSON envelopes, CDATA,
front matter, proprietary AI prompt wrappers.

### 2.7 Success, warning, and failure

| Outcome | Clipboard | UI |
|---|---|---|
| **Success** | Full requested context, validated | e.g. `Message copied` / `8 messages copied` |
| **Success with notice** | Usable result | Reserved for rare cases; v1 does **not** snackbar-notice print-header fallback or missing attachment names (console diagnostics only) |
| **Failure** | Unchanged (do not overwrite with partial junk) | Clear error: what failed and what to try |

When cleanup confidence is low (signature/disclaimer boundaries), **preserve**
the disputed content and succeed. Do not block the happy path on a review UI.

Hard failure triggers (non-exhaustive):

- target message ambiguous;
- `From` or `Date` cannot be established for an included message;
- print view empty, wrong thread, or message count / identity checks fail;
- unsupported Gmail layout or view.

Collapsed or trimmed content in the **reading** pane is not itself a failure
when print view returns the full conversation (see MVP Scope; golden
[example 10](examples/10-collapsed-thread-print-complete.md)).

Warnings belong in product feedback when used, **not** in the default clipboard
payload. Header enrichment source is not a clipboard concern.

---

## 3. UX of the two actions

### 3.1 Placement in Gmail (v1 direction)

Native overflow menus, pending DOM validation:

- **Copy thread:** item in the thread **More** menu (kebab / `⋮`), i.e. the
  control Gmail exposes for conversation-level actions (e.g. aria-label along
  the lines of “More email options” / localized equivalent).
- **Copy message:** item in that message’s **More** menu (kebab / `⋮`), i.e.
  the per-message overflow (e.g. “More message options” / localized
  equivalent), so the target message is unambiguous.

Hover-only targeting is rejected for v1: fragile and inaccessible. Extra
toolbar icons are unnecessary if the kebab entries are discoverable and
keyboard-reachable.

### 3.2 Target identification

**Copy message** always copies the message whose control was invoked, or—when
using the message shortcut—the uniquely focused / uniquely expanded message in
the open conversation. If more than one message could be the target, **fail**
instead of guessing.

**Copy thread** always means the fully open conversation in the current view.

### 3.3 One-click happy path

1. User opens a Gmail conversation.
2. User activates **Copy message** or **Copy thread**.
3. MailContext extracts, cleans, validates.
4. On success, result is on the clipboard; transient confirmation appears.
5. User pastes elsewhere.

No mandatory preview, modal wizard, or settings detour.

### 3.4 Shortcuts

Distinct shortcuts for message vs thread:

| Action | Binding |
|---|---|
| Copy thread | `Alt+Shift+T` |
| Copy message | `Alt+Shift+M` |

On macOS, Chrome maps `Alt` to the **⌥ Option** key—same physical chord. The
manifest uses `Alt+…` on all platforms for broader Chromium compatibility
(the `Option+…` token is rejected on some older builds). Users can remap at
`chrome://extensions/shortcuts`. Note: on Windows, bare `Alt+Shift` may switch
input language—full chords with T/M are the intended bindings.

Requirements: two distinct bindings; discoverable; operable without pointer.

### 3.5 Feedback after copy

| Case | Example feedback |
|---|---|
| Message success | `Message copied` |
| Thread success | `N messages copied` |
| Thread in progress (slow only) | `Copying…` |
| Failure | `Couldn't copy thread · …` (actionable) |

`Copying…` is deferred (~2 s) and only for **Copy thread**, so fast paths
skip the flicker. Copy message never shows an in-progress toast.

v1 does not use snackbar notices for print-header fallback or missing
attachment names.

Feedback must be available to assistive tech, not color-only, and dismiss
without blocking reading. Status-only snackbars (no Undo) use Material
`LENGTH_LONG` (**2750 ms**)—not Gmail archive toasts that keep Annulla ~10 s.

### 3.6 Preview and advanced options

**Out of v1.** A local preview panel would re-check what the user can already
verify by pasting into the destination, and would weigh down a product whose
strength is one obvious action.

v1 has no advanced toggle sheet. Conservative defaults (§2.4–§2.5) carry the
common path. Settings or progressive controls can return later if real usage
proves they are needed—not as launch scaffolding.

### 3.7 Collapsed threads, truncation, errors

| Situation | Behavior |
|---|---|
| Collapsed / trimmed reading view | Print-first completeness; succeed when print returns the full set |
| Print empty / wrong thread / incomplete headers | **Failure**; clipboard unchanged |
| Partial header ambiguity (`From` / `Date`) | **Failure**; never invent headers |
| Unsupported view (e.g. list-only) | **Failure** with guidance to open the conversation |

### 3.8 Accessibility and localized Gmail

- Controls must work with keyboard and screen readers.
- Extraction must not depend on English-visible Gmail strings alone; test at
  least one non-English UI language before calling extraction “done.”
- Labels/icons must remain understandable in dense Gmail chrome without
  competing with reading ([principle 9](product-principles.md)).

### 3.9 End-to-end flows

#### Flow A — Copy message

```text
Open thread → message More (⋮) → Copy message (or shortcut)
  → validate identity + body + headers
  → Success: clipboard + “Message copied”
  → Failure: clipboard unchanged + actionable error
```

#### Flow B — Copy thread

```text
Open conversation → thread More (⋮) → Copy thread (or shortcut)
  → fetch/parse print view (completeness source)
  → optional Show original enrichment on short threads
  → build chronological lean Markdown
  → Success: clipboard + “N messages copied”
  → Failure if print/identity/headers cannot be trusted
```

---

## 4. Acceptance bar (MVP)

1. **Golden corpus:** examples in `docs/examples/` match this contract.
2. **One-click path:** menu/shortcut → clipboard; no preview on the happy path.
3. **Honesty:** print-first for collapsed reading views (example 10); missing
   `From`/`Date` or bad print → failure.
4. **Peer actions:** message and thread are both primary.
5. **Privacy:** local-only processing for the default path.
6. **Positioning:** short description and differentiators stay true vs
   [prior art](prior-art.md).

Quantitative targets (time-to-paste, cleanup rate, etc.): [open questions](open-questions.md).

---

## 5. Architecture constraints

| Constraint | Implication |
|---|---|
| Completeness over optimism | Detect collapse, trim, and count mismatches |
| Message + thread peers | Per-message targeting is first-class in UI injection |
| Lean clipboard | Transport/debug must not leak into paste |
| Local-first | No account or server-side email processing by default |
| Locale-robust extraction | Do not rely solely on English UI strings |
| Narrow permissions | Smallest browser permission set that still meets honesty bars |
| Failure visibility | Enough signal for success, notice, and failure |

Extraction stack (print + Show original hybrid) is locked in
[MVP Scope](mvp-scope-v1.md). Residuals: [open questions](open-questions.md).
