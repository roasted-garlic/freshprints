# Dev Deploy Record: Amendment 9 P3

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Approval phrase | `APPROVE DEV FUNCTIONS DEPLOY: AMENDMENT 9 P3` |
| Project | `fresh-prints-dev` only |
| Source HEAD | `c80ebda` (includes P3 `c3d3c45` + P1 `dab3c44` + combined QA docs) |
| Implementation commit | `c3d3c45` |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| PR | #40 — open / unmerged |
| Exit code | **0** (retry after discovery timeout) |
| Region | `us-central1` |

---

## Attempts

1. First deploy: exit **1** — discovery timeout (`User code failed to load… Timeout after 10000`). No remote Functions updated.
2. Retry with `FUNCTIONS_DISCOVERY_TIMEOUT=60`: exit **0** — Deploy complete.

## Command executed (successful)

```bash
FUNCTIONS_DISCOVERY_TIMEOUT=60 firebase deploy --only functions:enqueueAiEnrichment,functions:testAiEnrichmentPlayground,functions:testAiEnrichmentTagRerank,functions:updateAiEnrichmentSettings --project fresh-prints-dev
```

(Windows PowerShell: `$env:FUNCTIONS_DISCOVERY_TIMEOUT=60; firebase deploy …`)

## Results

| Function | Operation |
|----------|-----------|
| `enqueueAiEnrichment` | Updated |
| `testAiEnrichmentPlayground` | Updated |
| `testAiEnrichmentTagRerank` | Updated |
| `updateAiEnrichmentSettings` | Updated |

## Not deployed

- Rules / indexes / Storage
- Production
- P4 catalog publication Functions
- Other Functions
- PR merge
- App Hosting
- Stage 1b

---

## Next

Owner runs combined 45-design QA:

`docs/workflow/reviews/2026-08-07-amendment-9-p3-p1-combined-manual-qa.md`

Cloud Logging filter after AI jobs:

`jsonPayload.message="ai-pipeline" AND jsonPayload.event=~taxonomy-`

Expect warm-instance: one `taxonomy-cache-miss` + `taxonomy-load-success`, then hits within 15 minutes.
