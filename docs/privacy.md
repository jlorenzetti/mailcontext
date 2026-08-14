<!--
  Public privacy policy for MailContext.
-->

# Privacy policy

**Last updated:** 14 August 2026  
**Product:** [MailContext on GitHub](https://github.com/jlorenzetti/mailcontext)

MailContext is a Chrome extension that copies a Gmail message or thread as
lean Markdown onto your clipboard. It is local-first: there is no MailContext
account, backend, analytics, or advertising.

## Limited Use

MailContext complies with the Chrome Web Store
[Limited Use](https://developer.chrome.com/docs/webstore/program-policies/limited-use)
requirements. Email content and related identifiers accessed to provide Copy
are used only for that user-facing feature. They are not sold, not used for
advertising, and not transferred to MailContext servers (there are none).

## What MailContext accesses

On `mail.google.com` only, while the extension’s content script is loaded
(when you open or navigate Gmail in that tab), MailContext may:

- observe the page enough to inject **Copy message** / **Copy thread** into
  Gmail More menus and to detect whether a conversation is open;
- watch same-origin Gmail network/resource URLs in the page (and may read a
  short-lived session key `ik` from them) so Show original header enrichment
  can work when you later copy;
- store that `ik` value in `chrome.storage.session`.

When you invoke **Copy message** or **Copy thread**, it additionally:

- reads identity attributes for the open conversation / target message;
- fetches Gmail print view (`view=pt`) and, when applicable, Show original
  (`view=om`) using your existing Gmail session;
- writes the resulting Markdown to the clipboard.

That processing involves personal communications, email addresses, and
session/authentication material (`ik`). It does not read other websites. It
does not copy `Bcc`.

## What is transmitted

Email content is not sent to MailContext servers — there are none. Network
requests are same-origin Gmail fetches required for extraction. Pasting the
clipboard into another app (AI assistant, docs, chat) is your action and
outside this policy.

## What is retained

Clipboard history may be kept by the operating system or third-party clipboard
managers. MailContext does not persist message bodies. The `ik` cache lives in
session storage and is not a copy of your mail.

## Permissions

| Permission | Why |
|---|---|
| `https://mail.google.com/*` | Extract the open conversation via Gmail’s own views |
| `clipboardWrite` | Place Markdown on the clipboard |
| `offscreen` | Parse print HTML and write the clipboard from an extension page |
| `storage` | Cache the Gmail `ik` session key |

## Chrome Web Store disclosures

When completing the store privacy questionnaire, declare processing that
matches this policy—at minimum personal communications / email content,
identifiers such as email addresses, and authentication or session
information for `ik`—even though processing stays on-device.

## Changes

If data handling changes, this policy will be updated and (for Chrome Web Store
users) disclosed as required by store policy.

## Contact

Open an issue on
[github.com/jlorenzetti/mailcontext](https://github.com/jlorenzetti/mailcontext),
or use the support URL listed on the Chrome Web Store item.
