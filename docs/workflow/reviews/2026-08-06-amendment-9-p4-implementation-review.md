# Implementation Review: Amendment 9 P4 — Snapshot Publication Read Amplification Guard

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Reviewer | Independent Implementation Review |
| Plan | `docs/workflow/plans/2026-08-06-post-launch-catalog-and-processing-stability-amendment-9-p4-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-08-06-post-launch-catalog-and-processing-stability-amendment-9-p4-review.md` |
| Test report | `docs/workflow/reviews/2026-08-06-amendment-9-p4-test-report.md` |
| Verdict | **APPROVED** |

---

## Diff inspection summary

Inspected final Functions/docs diff against Plan R1–R5 and the Implementation Contract.

| Duty | Result |
|------|--------|
| 1. W2 event-driven without design write | **Pass** — `onPortalCatalogPublicationStateWritten` on `snapshotPublicationState/portal-catalog`; `deferredWakeNonce` |
| 2. Final dirty not stranded | **Pass** — wake requested **after** claim release; W2 drains; retry callable remains |
| 3. Eligibility persisted + checked | **Pass** — `nextEligiblePublishAt`; checked in `publishKind` lease txn + wait path |
| 4. Eligibility atomic with publishedGeneration | **Pass** — same `reference.set` after successful portal publish |
| 5. Portal passLimit=1 real | **Pass** — `PORTAL_PUBLICATION_PASS_LIMIT` in `runPortalAutomaticPublicationPass` |
| 6. Immediate multi-pass portal catch-up removed | **Pass** — portal branch no longer uses `PUBLICATION_PASS_LIMIT=3` serial success |
| 7. Catalog-reference unchanged timing | **Pass** — `DEBOUNCE_MS=15s` + legacy catch-up |
| 8. Claim vs timeout safe | **Pass** — portal claim 240s &lt; lease 600s; timeout 300s; Amendment 1 margins retained for catalog-reference |
| 9. W2 no infinite recursion | **Pass** — `decidePortalDeferredWakeAction` requires nonce advance while dirty |
| 10. Lease authoritative | **Pass** — unchanged lease mutex |
| 11. Classifier only neither-ready | **Pass** — P4-a |
| 12. Ready-boundary intact | **Pass** — tests |
| 13. Admin bypass explicit | **Pass** — `bypassMinInterval: true` on rebuild/drain |
| 14. Timing math vs Plan | **Pass with note** — 45@13s ≤6 (formula for ≤10 min); ≤5 proven at 10s pace |
| 15. Tests fail pre-P4 meaningfully | **Pass** — wiring/classifier/simulation assertions |
| 16. Logs sanitized | **Pass** — counts/reasons only |
| 17. No Stage 1b / P3 / feature cut | **Pass** |
| 18. No deploy/production | **Pass** |

---

## Required changes

None.

---

## Verdict rationale

Implementation matches the approved Plan after Formal Review corrections. Multi-instance safety, W2 wake-after-claim-release, and passLimit=1 are present in source (not only tests). Ready for commit/push and owner-gated Functions deploy — **not** Signoff until live QA.
