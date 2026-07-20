# Test Report: Simple request-per-show limit (ADR-FP-102)

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-07-19-simple-request-per-show-limit-plan.md |
| Implementation | Session implement after owner APPROVE IMPLEMENT WITH NOTES |
| Overall | **passed_with_notes** |

---

## Summary

Automated unit tests (38/38), Functions `tsc` build, and Portal `tsc --noEmit` passed. Functions + Firestore rules soft-deployed to **fresh-prints-dev**. Cap A daily-quota callable deleted. Manual QA on Portal (soft-reload) is required before signoff.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Unit tests | `npx tsx --test` on settings, working max, queue fit, per-show cap, quota copy, queue validation, rules alignment | 0 | pass | 38 tests |
| Functions build | `npm run build` in `functions/` | 0 | pass | |
| Portal typecheck | `npm run typecheck` in `apps/portal` | 0 | pass | |
| Lint | — | — | skip | Not run for this batch |
| Integration / E2E | — | — | skip | None dedicated |
| Backend deploy | `firebase deploy` functions (scoped) + `firestore:rules`; delete `getPrintRequestDailyDesignQuota` | 0 | pass | `fresh-prints-dev` only |

---

## Failures (if any)

None in automated checks.

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Lint | Not required for this pass; recommend optional later |
| E2E | No dedicated suite; covered by manual QA |
| Studio typecheck | Not run; Studio settings UI changed — covered by manual QA |

---

## Soft deploy (`fresh-prints-dev`)

| Item | Status |
|------|--------|
| Firestore rules (`printRequestLimits` signed-in read) | Released |
| Deleted `getPrintRequestDailyDesignQuota` | Deleted |
| Updated callables (queue, add, qty, remove, clear, create, duplicate, upload attach, assisted, settings) | Updated |
| Upload quota charge skip (`createCustomerUploadBatch`, `finalizeCustomerUpload`, `finalizeCustomerUploadZip`) | Updated 2026-07-19 — print-request no day charge; donation images/day only |
| Portal | Soft-reload local Portal against `fresh-prints-dev` (no App Hosting deploy this session) |
| Production | **Not deployed** |

Note: Full `firebase deploy --only functions` aborted on pre-existing orphan remote functions (`ensurePortalWorkingPrintRequest`, `customerDownloadAssistedCreationApprovedProof`). Scoped deploy of changed functions used instead.

### Follow-up (2026-07-19 quota badge UX)

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Format + charge tests | `npx tsx --test` formatCustomerUploadDailyQuota + customerUploadDailyQuota | 0 | pass (10) |
| Functions build | `npm run build` in `functions/` | 0 | pass |
| Scoped deploy | `createCustomerUploadBatch`, `finalizeCustomerUpload`, `finalizeCustomerUploadZip` | 0 | pass |

Manual QA checklist updated for new badge copy (request room / donate images-day only).

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Plan §13 checklist + UX polish | **PASS WITH NOTES** | Owner 2026-07-20: call work PASSED. Note: Functions one-request-per-show uniqueness still enforced; Portal callouts are spots-exhausted (used L). |

Manual test instructions: `docs/workflow/reviews/2026-07-19-simple-request-per-show-limit-manual-qa.md`

---

## Recommendations

- Optionally decide product intent: keep Functions one-request-per-show (ADR-FP-102) vs allow multiple requests under L.
- Optionally clean orphan remote Functions in a later hygiene pass (out of scope).

---

## Signoff Readiness

- [x] All required automated checks pass OR failures documented
- [x] Manual tests complete OR checkpoint pending ← **PASS WITH NOTES 2026-07-20**
- [x] Ready for signoff phase

**Next step:** signoff (complete)
