# DEV QA — Studio smoke corrective A–E

| Field | Value |
|-------|-------|
| Date | 2026-08-12 |
| Branch | `hotfix/studio-smoke-corrective-a-e` |
| Implementation commit | `13e0af88f843571e3f49eae07899c38a23c90fd4` |
| Docs tip (QA launch instructions) | `dac02848be4a1443b42ed43c0ffa92038ed2efe9` |
| Base | `origin/production` `15c6492322157bf972168635787c8244898bfd9e` |
| Environment | **fresh-prints-dev** |
| Worktree | `c:\coding\fresh-prints-wt-smoke-ae` |
| **Owner DEV QA result** | **PASS** (2026-08-12) |

## Delivery note (resolved)

Prior false-negative QA used main checkout `C:\coding\fresh-prints` @ `76205da` / Studio 1.0.2 (no A–E sources). Corrective QA used worktree `c:\coding\fresh-prints-wt-smoke-ae` @ `13e0af8` via `npm run dev:studio` with DEV Firebase/Algolia.

## DEV backend (deployed before PASS)

1. Firestore Rules (`settings/showQueue` → owner/admin write) — **deployed** to `fresh-prints-dev`
2. Functions: `promoteCustomerUploadToAiReview`, `retryCustomerUploadProcessing`, `enqueueAiEnrichment`, `resetAiEnrichmentForProcessing` — **deployed**
3. No Storage deploy; no Algolia settings mutation

## Owner QA checklist — PASS

### A/B — Design Library (ready catalog)

- [x] Full-catalog tag counts correct before Load More
- [x] Counts independent of hydrated Firestore browse pages
- [x] Load More reflects active filtered result source
- [x] Exhausted filtered sets: no stale Load More
- [x] Full-library search/filter behavior remains correct

### D — AI tags (D8-A)

- [x] Manually assigned tags survive AI Processing and AI Review
- [x] Exact duplicate AI tags suppressed
- [x] Alias-equivalent duplicates suppressed
- [x] Human tags remain when AI Review opened and saved
- [x] Genuinely additional AI tags still suggested
- [x] D8-A behavior acceptable

### E — Helper account

- [x] Send to AI Processing for eligible uploads
- [x] Full AI Review / image-processing workflow
- [x] Edit / review / approve / reject as intended
- [x] No permission-denied on allowed actions
- [x] Helper remains non-admin
- [x] No Show Queue Settings for helper
- [x] Owner/Admin behavior intact

### C — Imports

- [x] Documentation-only as approved

### Regression

- [x] Owner/Admin Show Queue Settings works
- [x] Owner/Admin AI Review unchanged
- [x] Customer permissions unchanged (no issues reported)

## Pass criteria

**PASS** — owner 2026-08-12. Proceed to production promotion checkpoint (PR only; no production deploy / no Studio 1.0.4 until separate owner authorization).
