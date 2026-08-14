# 0006: Promote the Chromium MV3 spike to the MVP codebase

- Status: Accepted
- Date: 2026-08-12

## Context

[Product Definition v1](../product-definition-v1.md) and
[technical discovery](../technical-discovery-v1.md) are validated enough to
freeze an MVP. [0005](0005-chromium-mv3-spike.md) produced a working unpacked
extension under `extension/` that already implements the hybrid extraction
path, More-menu actions, honesty feedback, and `ik` enrichment.

The remaining question is whether MVP work should start from a new scaffold
(new language, bundler, dual tree) or continue from the spike.

## Decision

**Evolve `extension/` into the MVP product.** Do not create a parallel greenfield
prototype. Chromium Manifest V3 remains the day-one stack; Firefox stays out of
MVP ([mvp-scope-v1](../mvp-scope-v1.md)).

Optional later upgrades (TypeScript, minimal bundler, automated tests) are
allowed as incremental migrations inside the same product tree—not as a rewrite
gate before MVP coding.

## Rationale

- The spike already cleared the highest-risk unknowns (print completeness,
  Show original headers, menu injection, collapse/trim, `ik` cold-start).
- A second skeleton would delay packaging without reducing product risk.
- Keeping one tree preserves lean process and avoids divergent behavior.

## Consequences

- MVP scope and acceptance bars apply to `extension/`.
- Refactors must preserve observable copy behavior unless Product Definition or
  MVP scope changes.
- Packaging, store listing, and tests attach to this codebase.
- Introducing TypeScript/bundler requires a short follow-up ADR only if it
  changes contributor workflow or release mechanics.

## Alternatives considered

- **Greenfield TypeScript/React scaffold:** stronger tooling, but premature;
  re-proves solved pipeline risks and slows CWS path.
- **Bookmarklet / userscript MVP:** weaker distribution and store story.
- **Multi-browser MVP:** dilutes focus; discovery did not require Firefox for
  day one.
