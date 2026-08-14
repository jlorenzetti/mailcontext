# 07 — Attachments present (names on by default)

**Action:** Copy message  
**Outcome:** Success

## Situation

Message has `agenda.pdf` and `budget.xlsx`. Filenames are metadata; file bytes
are never copied.

## Expected clipboard

```markdown
Subject: Monday planning pack
From: Elena Rossi <elena@example.com>
Date: Fri, 8 Aug 2026 08:15:00 +0200
To: Jacopo Lorenzetti <jacopo@example.com>
Attachments: agenda.pdf, budget.xlsx

Hi Jacopo,

Agenda and budget draft are attached. See you at 10:00.
```

## Notice variant

If attachments exist but names cannot be read: same body/headers without the
`Attachments:` line. v1 shows ordinary success (no snackbar notice).
