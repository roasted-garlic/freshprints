# DEV Deployment Checkpoint: VCP Persistence Corrective

| Field | Value |
|---|---|
| Date | 2026-09-06 |
| Project | `fresh-prints-dev` |
| Base commit | `75c8a9ffb05bf5c54bec6d8fe972df7db32a3064` |
| Deployment result | **PASS — exactly two authorized Functions** |
| Processing/fixture verification | Not run; separately authorized checkpoint required |

## Source preflight

- Branch: `development`.
- Reviewed application diff remained limited to the shared prompt helper and its focused tests.
- No unexpected application source drift was found.
- `git diff --check`: PASS.
- Focused validation baseline remained 51 passed / 0 failed.
- No commit or push occurred.

## Exact deployment

Command:

`firebase deploy --only functions:enqueueAiEnrichment,functions:testAiEnrichmentSemanticReviewPlayground --project fresh-prints-dev`

Only the following were deployed:

| Function | State | Revision | Firebase source hash | Updated |
|---|---|---|---|---|
| `enqueueAiEnrichment` | ACTIVE | `enqueueaienrichment-00106-gig` | `c994dbe6d898490a8090eaa7815209c231eb6c7b` | `2026-09-06T13:22:01.274986831Z` |
| `testAiEnrichmentSemanticReviewPlayground` | ACTIVE | `testaienrichmentsemanticreviewplayground-00007-deg` | `c994dbe6d898490a8090eaa7815209c231eb6c7b` | `2026-09-06T13:22:01.419530984Z` |

Target confirmation: `fresh-prints-dev`, `us-central1`. Both Functions carry the same Firebase
source hash for the reviewed shared prompt-contract implementation.

Deployment warnings were limited to the pre-existing Node.js 20 deprecation notice and outdated
`firebase-functions` package notice. No additional Function was deployed.

## Safety readback

- `semanticReviewerEnabled`: **false** (field absent; runtime loader default is false).
- `catalogAutonomousLiveEnabled`: **false**.
- Catalog workflow mode: `shadow`.
- Settings mutated: **NO**.
- Designs processed: **NO**.
- Fixtures rerun: **NO**.
- Pass 1 AI calls: **NO**.
- Pass 2 AI calls: **NO**.
- Catalog data changed: **NO**.
- Firestore Rules deployed: **NO**.
- Storage Rules deployed: **NO**.
- Indexes deployed: **NO**.
- Migration/backfill: **NO**.
- Gate C executed: **NO**.
- Production touched: **NO**.

## Stop boundary

This checkpoint verifies deployment integrity only. The corrective is not runtime-signed off until
a separately authorized normal Processing run proves `aiAnalysis.visualContextProfile` persistence.

`[NEEDS OWNER AUTHORIZATION: ONE POST-CORRECTIVE Y2 PASS 1 VERIFICATION RUN]`

Recommended next authorization: one normal Processing rerun of `Y2IQuCgAPgnqrBIeJuap` with
Semantic Reviewer still OFF, solely to verify current v38 Processing persists
`aiAnalysis.visualContextProfile`. Do not process it under this checkpoint.
