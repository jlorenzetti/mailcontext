# 0005: Start implementation as a Chromium MV3 extension spike

- Status: Accepted
- Date: 2026-08-11

## Context

Product Definition v1 and technical discovery v0.3 require a local Gmail client
that fetches print view HTML, parses lean Markdown, and writes the clipboard.
A thin spike is needed before broader tooling or multi-browser support.

## Decision

Implement the first code as an unpacked **Chrome Manifest V3** extension under
`extension/`, following the hybrid extraction approach in
[technical-discovery-v1.md](../technical-discovery-v1.md).

## Rationale

Discovery already assumes a Chromium content script with same-origin Gmail
access and clipboard write. MV3 is the current Chrome Web Store baseline.
Keeping the spike unpacked and dependency-free minimizes ceremony while proving
identity → print fetch → parse → clipboard.

## Consequences

- First runnable artifact lives in `extension/`.
- Firefox and packaging tooling remain out of scope until the spike validates
  the pipeline on real threads.
- Menu injection targets native Gmail More (⋮) menus (thread + message);
  temporary nearby buttons were removed once that path worked.

## Alternatives considered

- **Bookmarklet / DevTools script:** faster to paste, but not a path to CWS or
  polished peer actions.
- **Userscript manager:** extra install friction; weaker product packaging.
- **Framework-heavy scaffold (React, bundlers) first:** premature before print
  parse reliability is proven.
