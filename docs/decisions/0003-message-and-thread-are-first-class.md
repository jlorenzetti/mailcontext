# 0003: Treat message and thread copying as peer actions

- Status: Accepted
- Date: 2026-07-28

## Context

Many related tools treat the entire thread as the primary export unit. The
original workflow requires both granularities frequently: sometimes only the
newly received message matters; other times the full decision history is
essential.

Exporting a thread and deleting unwanted messages is not an acceptable
substitute for a precise message action.

## Decision

**Copy message** and **Copy thread** are first-class, equally supported product
actions.

Each should be discoverable, fast, keyboard-accessible, and held to the same
reliability standard.

## Rationale

The two actions correspond to distinct, recurring user intents. Giving them
equal status differentiates MailContext and prevents the full-thread data model
from distorting the single-message experience.

## Consequences

- The product must unambiguously identify the target message.
- Cleanup semantics may differ: quoted history is generally redundant in a
  thread and optional in a single-message copy.
- UX, shortcuts, validation, fixtures, and success metrics must cover both
  actions.
- Architecture must not make one action a fragile derivative of the other.

## Alternatives considered

- **Thread only:** simpler surface, but fails a core job and causes manual
  cleanup.
- **Message only:** misses the need for complete conversational context.
- **Thread plus “last N” setting:** does not provide precise selection and adds
  configuration to a common task.
