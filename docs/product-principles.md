# Product principles

These principles guide product and technical decisions. They are ordered by
importance only where a trade-off makes them conflict.

## 1. Lean by default

Include information that helps a human or model understand the email. Omit
transport details, internal identifiers, duplicated content, presentation
artifacts, and structural wrappers that do not improve the ordinary paste
workflow.

Lean does not mean lossy. A shorter result is valuable only when the removed
content is genuinely redundant or intentionally excluded.

## 2. Human-readable is the interchange format

The default output should look like something a careful person could have
written directly into the destination. It should be easy to review, redact,
edit, and understand without MailContext.

Strict machine-readable formats may become optional exports, but they should
not shape or burden the default experience.

## 3. One message and the whole thread are peers

Neither action is an advanced version of the other. Both should be prominent,
fast, and reliable. A user should never have to export a thread and manually
delete messages just to copy the current one.

## 4. Precision over optimistic success

MailContext should not silently put a plausible but incomplete result on the
clipboard. When message expansion, header extraction, deduplication, or
truncation is uncertain, the user should receive an actionable warning.

Checks belong in the product; diagnostic overhead does not belong in the normal
copied output.

## 5. The common path is immediate

The ordinary action should not require a preview, wizard, or configuration
screen. Advanced controls should remain accessible without slowing down the
default flow.

## 6. Local-first and private

Email content is often personal, contractual, medical, or commercially
sensitive. The default architecture should process content locally and should
not require an account, analytics, or transmission to a MailContext service.

Any future feature that sends content elsewhere must be explicit and
separately consented to.

## 7. Destination-agnostic

AI assistants motivate the product but do not define its boundaries. Output
should remain useful in documents, chats, notes, trackers, CRMs, and other
emails. Avoid proprietary destination syntax in the default format.

## 8. Progressive control

Defaults should work for most messages. When they do not, users should be able
to inspect and selectively include or exclude signatures, quoted history,
boilerplate, disclaimers, and attachment information.

## 9. Native-feeling, not invasive

MailContext should feel at home in the email interface while remaining visually
discreet. Its controls must be discoverable, accessible, and unambiguous
without competing with the act of reading email.

## 10. Honest about platform dependence

Email clients and their document structures change. The product should detect
unsupported states, test across interface languages and layouts, and expose
failures clearly rather than pretending extraction is permanently solved.
