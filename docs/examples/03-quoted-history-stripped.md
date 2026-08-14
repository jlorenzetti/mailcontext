# 03 — Quoted history stripped

**Action:** Copy message  
**Outcome:** Success

## Situation

Latest reply in Gmail includes the usual inline quoted prior message. Copy
message must keep only the newly authored text.

## Source (conceptual)

```text
Thanks — I'll take the 15:00 slot.

On Mon, 27 Jul 2026 at 14:32, Andrea Conti <andrea@example.com> wrote:
> The backup runs every day at 03:00 UTC.
> ...
```

## Expected clipboard

```markdown
Subject: Scheduled maintenance recovery point
From: Jacopo Lorenzetti <jacopo@example.com>
Date: Tue, 27 Jul 2026 15:06:00 +0200
To: Andrea Conti <andrea@example.com>

Thanks — I'll take the 15:00 slot.
```
