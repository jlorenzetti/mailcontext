# Prior-art snapshot

Competitive context for positioning. Not exhaustive; tools change over time.

## Direct and adjacent tools

| Tool | Relevance to MailContext |
|---|---|
| [Copy Gmail Thread for AI](https://github.com/moekoelueker/copy-gmail-thread-for-ai) | Strong reference for completeness checks, attachment attribution, local processing, keyboard use, and structurally rigorous output. Its XML/Markdown envelope is deliberately heavier than MailContext's default direction. |
| [Gmail Thread → Markdown](https://chromewebstore.google.com/detail/gmail-thread-%E2%86%92-markdown/gcafbcnbpkhgnckjbjlfjfjnemkkcikd) | Close to the core thread-to-Markdown workflow, including expansion, metadata, cleanup, preview, and clipboard-oriented use. |
| [Gmail Thread Extractor](https://github.com/nitzanpap/gmail-thread-extract) | Open-source reference for multiple output formats, thread ranges, configurable cleanup, preview, clipboard, and browser support. |
| [Gmail Thread to Markdown — PAPAYA](https://chromewebstore.google.com/detail/gmail-thread-to-markdown/fobdiklhmgmobinkikeplbbociabnkfm) | Direct evidence of the open-thread-to-clean-Markdown concept, with limited public technical detail in the prior review. |
| [Web2MD](https://web2md.org/) | General web-to-Markdown product with Gmail support and direct AI-oriented workflows. It demonstrates the possibility of treating Gmail as an adapter inside a broader context tool. |
| [Gmail2Obsidian](https://github.com/Emaj7th/Gmail2Obsidian) | Adjacent local Gmail-to-structured-Markdown workflow focused on archiving in Obsidian rather than frictionless context copying. |

## Positioning

The broad idea is not new:

> Open a Gmail thread, extract messages, clean duplicated quotes and signatures,
> preserve useful metadata, and export the result as Markdown.

Several independent tools cover meaningful portions of that workflow. The
opportunity for MailContext is therefore not category invention, but a distinct
execution:

- one message and one thread as equally immediate operations;
- lean, natural output rather than a machine-first envelope;
- high confidence without diagnostic clutter in successful output;
- a polished, repeated-use experience;
- strict local-first privacy.

## Lessons

- **Completeness matters.** Prior tools show that silent partial extraction is a
  material risk.
- **Collapsed content matters.** A full thread action must actively account for
  messages and content Gmail has not rendered in the obvious reading state.
- **Cleanup needs controls.** Signature and quote removal improve output but can
  remove useful information.
- **Attachments need honest representation.** Names, ownership, content, and
  omissions should not be conflated.
- **Local processing is differentiating.** Email sensitivity makes server-side
  conversion a meaningful product trade-off.
- **Clipboard is only one export mechanism, but it is the core one.** Downloads,
  JSON, and direct integrations should not complicate the main action.

Working name rationale: [ADR 0001](decisions/0001-mailcontext-name.md).
