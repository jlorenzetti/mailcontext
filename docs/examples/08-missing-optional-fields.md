# 08 — Missing optional fields

**Action:** Copy message  
**Outcome:** Success

## Situation

No Cc (and no Bcc). Omit the `Cc:` line entirely; do not emit placeholders.

## Expected clipboard

```markdown
Subject: Office closed Friday
From: HR Desk <hr@example.com>
Date: Thu, 6 Aug 2026 10:00:00 +0200
To: Jacopo Lorenzetti <jacopo@example.com>

The Rome office is closed this Friday. Remote work as usual.
```
