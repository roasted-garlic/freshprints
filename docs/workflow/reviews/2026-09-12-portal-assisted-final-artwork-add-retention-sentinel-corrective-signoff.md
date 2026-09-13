# Signoff: Portal Assisted Final Artwork Add Retention Sentinel Corrective

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Signoff by | Signoff Agent |
| Goal | `portal-assisted-final-artwork-add-retention-sentinel-corrective` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Plan | `docs/workflow/plans/2026-09-12-portal-assisted-final-artwork-add-retention-sentinel-corrective-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-add-retention-sentinel-corrective-review.md` (`approved_with_changes`, owner-accepted) |
| Implementation Review | `docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-add-retention-sentinel-corrective-implementation-review.md` |
| Test Report | `docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-add-retention-sentinel-corrective-test-report.md` |
| DEV deployment | `docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-add-retention-sentinel-corrective-dev-deployment.md` |
| Owner DEV QA checklist | `docs/workflow/reviews/2026-09-12-portal-assisted-final-artwork-add-retention-sentinel-corrective-owner-dev-qa-checklist.md` |
| Related superseding QA | `portal-assisted-final-artwork-progress-and-readd-corrective` Signoff (**PASS**; overlapping path) |
| Final status | **approved_with_notes** |

---

## Owner DEV QA

The owner explicitly reported:

> **OWNER DEV QA: portal-assisted-final-artwork-add-retention-sentinel-corrective - PASS**

---

## Corrective stage completion

| Stage | Status |
|---|---|
| Plan | complete |
| Formal Review | complete (`approved_with_changes`; owner accepted + Implement authorized) |
| Implement | complete (incl. owner addendum: direct no-consent Assisted Add) |
| Test | complete (focused contracts + build/typecheck/lint/diff hygiene) |
| DEV deployment | complete (`customerAddAssistedApprovedProofToPrintRequest` on `fresh-prints-dev`; later progress/re-add revision superseded for live QA) |
| Owner DEV QA PASS | recorded |
| Signoff | **this artifact** |

Full gate chain confirmed:

**Plan → Formal Review → Implement → Test → DEV deployment → Owner DEV QA PASS → Signoff**

---

## Summary

Assisted approved/final artwork Add-to-Request no longer fails on illegal `FieldValue.delete()`
sentinels in a fresh `customerUploads` create. The product path is a **direct** Assisted Add (no
catalog-permission modal, no consent boolean). The callable bypasses
`buildCatalogIntakeConfirmationPatch` for Assisted copies, writes server-owned Assisted origin +
`catalogReviewStatus: not_eligible` without manufacturing customer consent/retention episodes, and
leaves ordinary upload/donation/Ask Again/Allow/Decline/Restore/staff-promotion helper contracts
unchanged.

Root cause (Formal Review): update-style delete sentinels
(`catalogRetentionStartedAt`, `studioIntakeHoldUntilShow`) were spread into a non-merge
`Transaction.set` for a new upload document. Fix: Assisted path no longer uses that helper or
fake Allow/Decline semantics.

---

## Notes (`approved_with_notes`)

1. **Direct Assisted Add-to-Request** — Portal starts Add with no `AssistedLibraryListingConsentModal` and sends no `catalogUseAcknowledged`.
2. **Idempotent add/re-add** — one upload / one request item / stable `printRequestIngest`; progress/re-add corrective closed empty-update re-add failures on overlapping path.
3. **No consent/retention sentinel fields on fresh Assisted path** — omit `catalogUseAcknowledged`, denial/follow-up, `catalogRetentionStartedAt`, `studioIntakeHoldUntilShow` on create; no fake Allow audit.
4. **Assisted origin / `not_eligible`** — server marks Assisted lineage; staff intake remains `not_eligible` until Add to Show advances Pending (existing queue contract).
5. **No automatic Design creation/publication** — allocation/staff intake does not auto-create or publish a Design.
6. **Final-source authority** — download/Add prefer `finalSource` when present; approved proof remains fallback.
7. **Sizing, quantity, request-count** — existing pixel sizing, qty 1, and request limit behavior retained.
8. **Maintenance and ownership protections** — `assertPortalMaintenanceAllowsCustomerMutation` and customer ownership checks remain authoritative.
9. **Ordinary regressions unchanged** — customer upload, donation, Ask Again / Allow / Decline, Restore, and staff promotion retain prior helper/update semantics (shared helper not rewritten for those callers).
10. **Production untouched** — no staging, commit, push, freeze, parent M0, App Hosting publish, or production deploy in this child’s closure.
11. **Deploy notes** — Node.js 20 / `firebase-functions` deprecation warnings remain documented baseline; Portal QA path remains localhost → `fresh-prints-dev`.

---

## Evidence highlights

| Check | Result |
|---|---|
| Focused Assisted/sentinel contracts | **22/22** |
| Related lineage/eligibility | **28/28** |
| Functions build | **PASS** |
| Portal typecheck | **PASS** |
| Targeted ESLint | **PASS** |
| `git diff --check` | **PASS** (line-ending warnings only) |
| DEV Function | `customerAddAssistedApprovedProofToPrintRequest` (`fresh-prints-dev`); sentinel deploy `…-00036-gib`; live QA revision after progress/re-add `…-00037-juk` |
| Owner DEV QA | **PASS** (explicit sentinel checkpoint) |

---

## Deferred / parent

- Pre-freeze remaining before parent M0/freeze prep: **`assisted-creation-multi-proof-selection` only**
- Deferred non-M0 parallel (not closed here): `portal-post-queue-items-and-submit-nudge-corrective` (Plan/Review ready; Implement not authorized) — not listed as a parent pre-freeze blocker for this closure

---

## Open Blockers (this child)

- [x] None

---

## Verdict

**approved_with_notes** — gates complete; Owner DEV QA PASS recorded; production untouched.

---

## Workflow Complete

- [x] Owner DEV QA PASS recorded
- [x] Plan → Formal Review → Implement → Test → DEV deployment → Owner DEV QA → Signoff
- [x] Signoff recorded as `approved_with_notes`
- [x] `ROADMAP.md` + `.cursor/workflow/state.md` updated
- [x] `references/project-chatgpt-handoff/` — **not present**; N/A
- [x] No staging / commit / push / freeze / parent M0 / production

**Recommended next action:** Apply multi-proof Plan amendment (Classification B), then owner accept + authorize Implement.
