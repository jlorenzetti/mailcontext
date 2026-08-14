# Contributing to MailContext

MailContext is in **MVP implementation**: product definition and discovery are
frozen enough to ship a first Chromium build. Evolve [`extension/`](extension/);
do not start a parallel prototype ([0006](docs/decisions/0006-promote-spike-to-mvp-base.md)).

## Before proposing a change

Classify it as one of the following:

- **Established direction:** already in
  [Product Definition v1](docs/product-definition-v1.md) or
  [MVP Scope v1](docs/mvp-scope-v1.md).
- **Hypothesis:** needs user or technical validation.
- **Decision:** meaningful alternatives or long-term consequences → add an ADR.
- **Research note:** evidence about users, competitors, browsers, or email.
- **MVP code change:** behavior in [`extension/`](extension/) — preserve the
  acceptance bar in MVP Scope unless the scope document changes first.
  Module map: [ARCHITECTURE.md](extension/ARCHITECTURE.md).
  Store listing / privacy copy: [cws-listing.md](docs/cws-listing.md).

Update the narrowest relevant document. Prefer Product Definition / golden
examples for promise, output, or UX; MVP Scope for ship boundaries; ADRs for
directional choices.

## Documentation conventions

- Observable behavior over implementation trivia.
- Requirements stay technology-agnostic unless an ADR chose the stack.
- Distinguish facts from assumptions and open questions.
- Synthetic email examples only (`example.com`); see [examples/README.md](docs/examples/README.md).
- English.

## Decision records

Copy `docs/decisions/0000-template.md`, assign the next number, and keep status
accurate.

## Code

- Day-one stack: Chromium MV3 under `extension/` (see MVP Scope and 0006).
- Prefer small, honest changes that keep Copy message / Copy thread reliable.
- No private fixtures or real mailbox dumps in git.
