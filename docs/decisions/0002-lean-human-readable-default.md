# 0002: Default to lean, human-readable Markdown

- Status: Accepted
- Date: 2026-07-28

## Context

Existing email-export tools range from raw text to strict XML or JSON envelopes.
Machine-first structures can improve parsing and boundary guarantees, but they
also add visual and token overhead to the ordinary workflow of pasting email
into a human-like conversation or document.

## Decision

MailContext's default clipboard output will be lean, human-readable Markdown
with essential metadata and no proprietary structural wrapper.

Stricter machine-readable exports may be introduced as explicit alternatives,
not as the default.

## Rationale

The default result should:

- be immediately understandable and editable by a person;
- preserve useful formatting and links;
- use fewer characters and tokens than strict envelopes;
- paste cleanly into many destinations;
- resemble the careful result the user would otherwise construct manually.

## Consequences

- Reliability and completeness checks must happen inside the product.
- Warnings should appear in the interface rather than polluting successful
  output.
- The format needs documented conventions and adversarial testing.
- Stronger delimiters may still be necessary for specialized automation or
  security-sensitive destinations.

## Alternatives considered

- **XML envelope:** rigorous but verbose and unnatural in the primary workflow.
- **JSON:** useful for automation but awkward for direct reading and editing.
- **Plain text only:** portable but unnecessarily loses meaningful formatting
  and link destinations.
- **Raw HTML:** faithful to Gmail presentation but noisy, unsafe, and poorly
  suited to the target destinations.
