# 0004: Use the MIT license

- Status: Accepted
- Date: 2026-08-11

## Context

MailContext will be open source, free, and distributed Chrome Web Store first.
The license must maximize adoption frictionlessness for individuals and
organizations while remaining the familiar default for small web/Chrome tools.

## Decision

License the project under the **MIT License**.

## Rationale

MIT is the most widely recognized permissive license in the JavaScript and
browser-extension ecosystem. It minimizes legal review cost, encourages forks
and mentions, and avoids copyleft barriers that shrink corporate and hobbyist
uptake for a focused utility.

For a product whose success depends on being tried, installed, and talked
about, familiarity and permissiveness outweigh stronger copyleft protections.

## Consequences

- Anyone may use, modify, and redistribute, including in proprietary products,
  with attribution via the copyright and permission notice.
- The project does not gain patent-grant language (see Apache-2.0 alternative).
- Downstream products are not required to open-source their modifications.
- `LICENSE` at the repository root is the source of truth; store listings and
  README should state MIT.

## Alternatives considered

- **Apache-2.0:** equally adoption-friendly and adds an explicit patent grant
  plus notice-file norms. Slightly more ceremony; strong runner-up if patent
  clarity ever becomes a priority. Not chosen because MIT is simpler and more
  expected for this class of tool.
- **BSD-2-Clause / BSD-3-Clause:** similar effect to MIT with less mindshare in
  this ecosystem.
- **GPL-3.0 / AGPL-3.0:** protect reciprocal openness but deter many workplace
  and commercial trials; poor fit for maximizing reach of a clipboard utility.
- **MPL-2.0:** file-level copyleft middle ground; uncommon for small extensions
  and harder to explain without adoption benefit.
