<!--
  Golden example: collapsed reading view with print-first completeness.
-->

# 10 — Collapsed thread, print-complete

**Action:** Copy thread  
**Outcome:** Success

## Situation

Gmail’s reading view shows a collapsed thread (e.g. `.kQ` / “N messages”).
Print view (`view=pt`) still returns every message. MailContext uses print as
the completeness source: Copy thread succeeds with the full set even if the
reading pane was never fully expanded.

Live expand is used only when needed for Show original enrichment on short
threads—not as the gate for thread completeness.

## Expected clipboard

One Markdown block per print `table.message`, in chronological order, with
`Subject:` on the first message only and `---` between messages. Exact body
text depends on the fixture; message **count** must match print.

## Expected UI

`N messages copied` (where N equals the print message count).

## Non-goals for this case

- Do not fail solely because reading-view expand did not run or did not expose
  every `permmsgid`.
- Do not paste only the visible reading-view messages under Success when print
  has more.
- No diagnostic XML/JSON on the clipboard by default.
