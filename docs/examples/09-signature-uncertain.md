# 09 — Uncertain signature preserved

**Action:** Copy message  
**Outcome:** Success (uncertain signature kept)

## Situation

Closing lines might be a signature *or* substantive contact detail. v1 is
conservative: preserve when confidence is low.

## Expected clipboard

```markdown
Subject: Intro — River Labs
From: Sam Okonkwo <sam@riverlabs.example>
Date: Tue, 4 Aug 2026 13:22:00 +0200
To: Jacopo Lorenzetti <jacopo@example.com>

Jacopo,

Enjoyed the call. Direct line below if easier than email.

Sam Okonkwo
Partnerships, River Labs
+39 02 5555 0199
```

## Notes

- Do not strip the phone/name block when detection is uncertain.
- Clear corporate legal footers (“This email is confidential…”) remain
  candidates for removal when obviously boilerplate; see product definition
  §2.4.
