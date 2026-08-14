<!--
  MailContext technical discovery — evidence for the MVP extraction path.
  Locked decisions: mvp-scope-v1.md.
-->

# Technical discovery v1

Spike evidence for which **local** Gmail signals support Copy thread / Copy
message. Outcome locked in [MVP Scope](mvp-scope-v1.md). Product constraints:
[Product Definition §5](product-definition-v1.md#5-architecture-constraints).

## Goal

Decide, with spike evidence, which **local** Gmail signals can support:

1. **Copy thread** — complete, honest, lean Markdown;
2. **Copy message** — unambiguous single-message targeting;
3. success / notice / failure without silent partial pastes;
4. Chromium extension permissions as narrow as practical.

Out of scope here: final framework choice, build tooling, Firefox day-one,
store listing copy.

## Method

1. Record product-derived questions.
2. Spike Gmail web (reading view + print view) and capture **anonymized** structural notes (no private bodies in git).
3. Cross-check with public prior-art implementations that already use print view.
4. Compare candidate architectures against §5 constraints.
5. Recommend an MVP extraction approach and open follow-ups.

### Spike environment

| Field | Value |
|---|---|
| Date | 11 August 2026 |
| Browser | Cursor IDE browser |
| Gmail UI language | Italian (`lang=it`) |
| Account path | `/mail/u/1/` |
| Thread fixture | Open multi-message conversation (2 print `table.message` blocks) |
| Blockers cleared | Re-auth completed by user before resume |
| Privacy | Findings below are structural only; no message bodies or addresses committed |

## Questions to answer

| ID | Question | Status |
|---|---|---|
| Q1 | What does print view render for a multi-message thread? | **Answered (live)** — HTML with `table.message` per message; From as bold name + email (often unlabeled); localized absolute datetime; recipient labels locale-dependent (`A:`, `Rispondi a:`); bodies in message tables |
| Q2 | Does print view expand collapsed / trimmed content? | **Answered (live)** — `.kv` collapse: print includes hidden messages. **`.kQ` “N more”:** Airbnb 10-message thread — reading showed 1 `adn` + `.kQ.adv` “7”; print returned **10** `table.message`. **Trimmed content:** Agent thread `div.ajR` “Mostra contenuti abbreviati” grew live body 400→3219 chars; print already had full thread HTML. Bodies: print-first. Live expand still needed for `permmsgid` enrichment |
| Q3 | Can RFC 5322 `Date` be read from print view? | **Answered** — not from print. **Yes** from Show original (`view=om&ik=&permmsgid=`): RFC `Date:` with offset. Print keeps localized absolute datetime as fallback |
| Q4 | Are attachment **names** present in print view? | **Answered (live)** — yes: print HTML includes attachment hrefs (`view=att` / `attid`) and filename text; reading view exposes `span.aV3` + `[download_url]`. Confirmed on a PDF attachment thread |
| Q5 | Is print view whole-thread only? How can **Copy message** select one message? | **Answered (live)** — thread print is default; **single-message print** works with `&msg=<data-legacy-message-id>` → exactly one `table.message` |
| Q6 | Print entry points / invasiveness? | **Answered** — same-origin `fetch` to `view=pt` (no print dialog). Toolbar also exposes **Stampa tutto**; message menu has **Stampa** / **Mostra originale** |
| Q7 | Locale-stable vs string-dependent signals? | **Answered (partial)** — stable: `data-legacy-thread-id`, `data-legacy-message-id`, `data-message-id`, `table.message`, account index in path. Fragile: aria-labels (`Altre opzioni…`), recipient labels (`A:`, `Da:` / `From:`), date wording |
| Q8 | Failure signals? | **Answered (partial)** — hash-style URL id → HTTP 400 empty parse; login HTML detectable; subject/title mismatch needs careful normalization (title contains subject but is not equal); zero `table.message` |
| Q9 | Narrowest permissions? | **Answered** — `https://mail.google.com/*` + `clipboardWrite` + `storage` (`ik`) + `offscreen` (parse/clipboard) |

## Spike checklist

Reading view:

- [x] Open a short thread (2–3 messages)
- [x] Note per-message More menu affordances
- [x] Note collapsed-message and “trimmed content” controls if present (none on this fixture; toolbar has **Espandi tutto**)
- [x] Inspect message ids / data attributes

Print view:

- [x] Fetch print for the same thread (`view=pt`)
- [x] Count messages vs reading view (2 `table.message`; reading showed 1 expanded `div.a3s` / mixed `div.gs`)
- [x] List metadata fields visible per message
- [x] Check quoted history / signature presentation (no `gmail_quote` / blockquote on this fixture)
- [x] Check attachment name presentation (PDF fixture: live `span.aV3` + print `att` links)
- [x] Capture URL pattern and document structure
- [x] Compare collapsed reading view vs print message count (`.kv` present; print had more messages)
- [x] Repeat on a thread with “show N more” (`.kQ`) / trimmed content

## Findings

### Reading view (live)

- Subject: single visible `h2.hP` with **`data-legacy-thread-id`** (16-char hex). Prefer this over the hash fragment id (`Qgrc…`, 35 chars), which is **not** interchangeable for print fetch.
- Account index from path (`/u/1/`) is required in print URLs.
- Expanded message root: `div.adn` carries **`data-legacy-message-id`** (16-char hex) and **`data-message-id`** (e.g. `#msg…`, length 26).
- Sender: `span.gD` with `name` + `email` attributes.
- Date: `span.g3` text and `title` — localized absolute pattern like `D L YYYY, HH:mm` (Italian month abbrev); **no timezone offset**.
- UX anchors (Italian UI):
  - Thread: **Altre opzioni email** (`data-tooltip` “Altro”) — menu includes Inoltra tutto, Tasks, etc.
  - Message: **Altre opzioni messaggio** — menu includes Stampa, Scarica il messaggio, **Mostra originale**.
  - Toolbar: **Espandi tutto**, **Stampa tutto**.
- `ik` session key: **not found** in page HTML/links on this load; print fetch still succeeded **without** `ik`.

### Print view (live)

- URL (thread):  
  `https://mail.google.com/mail/u/<n>/?view=pt&search=all&th=<data-legacy-thread-id>`
- URL (one message): same + `&msg=<data-legacy-message-id>` → **one** `table.message`.
- Using the hash fragment id as `th` → **HTTP 400**, not usable.
- Document: HTML with `maincontent`, multiple tables, messages marked `class="message"`.
- Per message (Italian print):
  - From often **unlabeled** (bold display name + email in angle form);
  - Absolute datetime line (~30 chars, includes localized “at/alle”-style words in pattern `D L YYYY … HH:mm`);
  - Labeled recipients: e.g. `A:`, `Rispondi a:` (locale-specific);
  - **No** RFC 5322 `Date:` header in the print HTML.
- Title: contains the open subject after normalization checks (`includes`), but is **not** string-equal to `h2.hP` text (extra dash-separated segments). Identity checks must normalize, not require exact equality.
- Trusted Types: in-page `DOMParser.parseFromString` on fetched HTML was blocked (`TrustedHTML`); extension parsing should use an isolated parse path (e.g. background/`DOMParser` in extension page, or regex/DOM in a world without Trusted Types). Worth validating in the first code spike.

### Attachments (live)

- Reading view: filename in `span.aV3`; capability via `[download_url]`.
- Print view: multiple `view=att` / `attid` hrefs; filename extensions visible in
  HTML; Italian “Allegat…” labeling present.
- Spike parser should prefer print `a[href*=view=att]` text, with live chips as
  a supplement when print omits names.

### Collapse vs print (live)

On the Agent Conversation fixture:

| Signal | Reading DOM | Print `view=pt` |
|---|---|---|
| Expanded body (`div.a3s`) | 1 | — |
| Message roots (`div.gs`) | 2 | — |
| Collapsed affordance (`.kv`) | 1 | — |
| `table.message` | — | **2** |

Print included the message that reading view had not fully expanded. This is
the core completeness argument for print-first **Copy thread**.

### `.kQ` super-collapse (live)

Fixture: Airbnb booking thread (10 messages), subject
`RE: Prenotazione per Ca’ Franchi Piano 1…`.

| Signal | Before expand | After `.kQ` click + Espandi tutto | Print |
|---|---|---|---|
| `div.adn` | 1 | **10** | — |
| `.kQ.adv` count | **7** | 0 | — |
| `.kv` | 2 | 0 | — |
| `table.message` | — | — | **10** |

Click target for the middle bar: `span.adx[role="button"]` inside `.kQ.adv`
(visible digit). Empty flanking `.kQ` nodes are chrome, not controls.

**Implication:** print already returns the full thread; expanding `.kQ` then
**Espandi tutto** is for aligning live `data-message-id` / `permmsgid` with
print messages (Show original enrichment), not for body completeness.

### Trimmed content (live)

Fixture: Agent Conversation thread. Control:
`div.ajR[role="button"][aria-expanded="false"]` —
aria-label **Mostra contenuti abbreviati** (IT) / trimmed content (EN).

| State | Live `div.a3s` text length |
|---|---|
| Collapsed | ~400 |
| After click (`aria-expanded="true"`) | ~3219 |

Print `view=pt` for the same thread already included the full message HTML
(~7.5KB / 2 messages). Reading-view trim does **not** truncate print bodies.

### Show original / RFC headers (live)

Opened **Mostra originale** for the attachment fixture. URL shape:

`/mail/u/<n>/?ik=<session>&view=om&permmsgid=msg-f:<…>`

- `permmsgid` matches reading-view `data-message-id` with the leading `#` stripped
  (`#msg-f:…` → `msg-f:…`).
- Raw MIME includes locale-stable `From:`, `To:`, `Date:`, etc.
- `Date` is true RFC 5322 with timezone offset (`L, DD L DDDD DD:DD:DD +DDDD`).
- Naïve `fetch` of `view=om` **without** `ik` returns 404; `ik` is required.
- `ik` appears in some in-page links (e.g. attachment `view=att` hrefs) and in the
  Show original URL once opened; discovery must treat `ik` as a session key to
  find reliably.
- Cold-start accounts may lack `ik` in DOM/print until after network activity;
  continuous Performance observation plus a short post-print retry recovered
  reliably in live retests.

**Product implication:** for technical metadata (especially `Date`), Show
original is more faithful than print. Print remains better for lean body +
attachment filenames + thread assembly. A clean hybrid is:

1. print → body, attachments, message list;
2. show-original (`view=om`) → From / To / Cc / Date (pass through).

## Recommendation

1. **MVP extraction: Hybrid (C)** with print view as the completeness source for bodies/attachments.
2. **Copy thread / message:** keep `view=pt` (+ `msg=`) for content.
3. **Headers:** prefer Show original RFC fields when `ik` + `permmsgid` are available; fall back to print header parse.
4. **Dates:** RFC 5322 from Show original when possible; otherwise absolute print datetime on its own `Date:` line (never glued to `From:`).
5. **Attachments:** filenames from print `table.att` / live chips; never bytes in v1.
6. **Permissions:** `https://mail.google.com/*` + clipboard write + storage + offscreen.
7. **Code:** Chromium MV3 under [`extension/`](../extension/).

## Follow-ups (post-discovery)

1. Paste-check against golden examples on real accounts before each public build.
2. Harden quote/signature cleanup on diverse mail (backlog).
3. Revisit `ik` discovery only if cold-start regressions reappear.
4. Automated tests when the extraction path is sticky.
