# Reliability and privacy

Reliability and privacy are product properties, not implementation details.
This document records the expectations any future architecture must satisfy.

## Reliability principle

MailContext should fail visibly when it cannot establish that the requested
message or thread was captured correctly.

The product may use sophisticated internal checks, but a successful clipboard
result should contain only the requested email context. Diagnostics stay in the
interface unless the user explicitly exports them.

## Conditions worth validating

For a full thread:

- print view supplies the message set used for completeness;
- the extracted subject matches the open conversation;
- message count and ordering are plausible against print;
- each message can be associated with headers and body from print (and
  optional Show original enrichment);
- attachment names are associated with the correct message when present;
- the Gmail view did not change mid-extraction in a way that invalidates
  identity.

For one message:

- the target message is unambiguous;
- the body belongs to that message;
- the selected headers belong to the same message;
- quoted-history boundaries are sufficiently reliable;
- truncation, clipping, or unsupported content is reported.

The precise verification method remains an architectural question.

## Failure behavior

Potential outcomes should be distinguishable:

- **Success:** the requested context was copied and validated.
- **Success with notice:** reserved; v1 does not snackbar-notice optional gaps
  such as missing attachment names or print-header fallback.
- **Failure:** the requested result was not copied because completeness or
  identity could not be established.

When cleanup confidence is low, prefer preserving content over blocking on a
review UI. Avoid “best effort” success that leaves the user unaware of missing
content.

## Privacy baseline

The default product should:

- process email content on the user's device;
- place output only on the clipboard or in an explicit local preview;
- require no MailContext account;
- send no email content, metadata, or attachment data to MailContext servers;
- avoid analytics that capture email content or sensitive page state;
- request the narrowest practical browser permissions;
- document what is read, retained, and transmitted in plain language.

## Clipboard and local data

Local processing is not equivalent to zero risk. Future design must consider:

- the operating system and third-party clipboard managers may retain history;
- previews and logs must not persist email content unintentionally;
- crash reporting must exclude page content and extracted text;
- debug tooling and test fixtures must use synthetic or properly sanitized
  messages;
- temporary attachment processing must have a defined lifetime and cleanup
  policy.

## External destinations

Pasting the result into an AI assistant, document, chat, or CRM is a deliberate
user action outside MailContext's control. Direct integrations, if ever added,
must make the destination and data transfer explicit and must not replace the
private local default.

## Threats to evaluate later

- prompt injection or misleading instructions inside untrusted email content;
- malicious links and unusual HTML;
- sender-controlled text imitating MailContext separators or metadata;
- compromised or over-privileged extension code;
- changes to Gmail markup that cause cross-message content mix-ups;
- accidental leakage through telemetry, logs, clipboard history, or previews.

Lean Markdown intentionally trades strict structural envelopes for readability.
The security implications of that trade-off should be evaluated for each
supported destination rather than ignored.
