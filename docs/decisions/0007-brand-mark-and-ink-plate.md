# 0007: Brand mark and ink plate

- Status: Accepted
- Date: 2026-08-13

## Context

Chrome Web Store packaging needs a toolbar/store icon and Gmail More-menu
glyphs. The product is a Gmail clipboard utility (“Email, copied right.”).
Markdown is the default output; AI paste is the launch wedge. Neither should
own the mark.

## Decision

- **Glyph:** Material `content_copy` with a top envelope flap (copy + mail).
- **Menus:** outline glyph in Gmail greys; same mark for Copy message and
  Copy thread.
- **Toolbar / CWS / management page:** rounded ink plate `#1E3A4C` with
  glyph `#F4F7F8`.
- Do not use Markdown azure, Gmail red, or AI purple/sparkle.

## Rationale

The kebab already reads as a Gmail command; the flap distinguishes MailContext
without naming the format. A dark ink plate reads as a utility, stays
destination-agnostic, and remains legible at 16px. Azure from Markdown docs
would brand the vehicle; teal-as-magic would brand the wedge.

## Consequences

- Source: [`extension/icons/`](../../extension/icons/).
- Store listing assets use the same plate ([`store/`](../../store/)).
- Recolor the menu glyph only to match Gmail sibling icons, not the plate.

## Alternatives considered

- **Markdown azure** (Markdown Guide / CommonMark accent): format-first; crowded
  among converter extensions.
- **Saturated teal for “AI/magic”:** contradicts destination-agnostic output.
- **Bare grey outline as the store icon:** disappears in the Chrome toolbar.
- **Distinct icons for message vs thread:** Gmail does not split peer actions
  that way; labels already do.
