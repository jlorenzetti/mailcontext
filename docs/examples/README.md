# Golden examples

Fixtures for the [Product Definition v1](../product-definition-v1.md) output
contract. Each file: scenario + expected clipboard on success (unless noted).

## Corpus index

| ID | Scenario | Action |
|---|---|---|
| [01](01-simple-message.md) | Single plain message | Copy message |
| [02](02-short-thread.md) | Two-message thread | Copy thread |
| [03](03-quoted-history-stripped.md) | Reply with quoted history | Copy message |
| [04](04-forwarded-message.md) | Forward as authored content | Copy message |
| [05](05-long-recipients.md) | Many To/Cc addresses | Copy message |
| [06](06-links-lists-table.md) | Links, lists, simple table | Copy message |
| [07](07-attachments-named.md) | Attachment filenames in metadata | Copy message |
| [08](08-missing-optional-fields.md) | No Cc | Copy message |
| [09](09-signature-uncertain.md) | Ambiguous signature → keep | Copy message |
| [10](10-collapsed-thread-print-complete.md) | Collapsed reading view; print complete | Copy thread → **Success** |

## Conventions

- `Expected clipboard` blocks are normative for v1 defaults.
- `Date:` values in examples illustrate **RFC 5322 pass-through** when that
  header is available; if only Gmail’s absolute UI date is available,
  pass that string through unchanged instead.
- UI-only outcomes (notices, failures) are stated in prose, not pasted into the
  clipboard body.
