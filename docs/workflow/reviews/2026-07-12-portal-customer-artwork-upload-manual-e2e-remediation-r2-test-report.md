# Test Report: Portal Customer Artwork Upload — Manual E2E Remediation Round 2

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Plan | `docs/workflow/plans/2026-07-12-portal-customer-artwork-upload-manual-e2e-remediation-r2-plan.md` |
| Review | approved |
| Environment | `fresh-prints-dev` |
| Automated result | **passed_with_notes** |
| Overall G / parent | **pending_manual_e2e_retest** |

---

## Root causes → fixes

| # | Root cause | Fix |
|---|------------|-----|
| 1 Duplicate permissions | Client `setDoc` for upload items vs Admin-only create model | `duplicatePortalPrintRequestItem` callable (Admin SDK); Portal routes all duplicates through it |
| 2 Wipe blank | `lastResult.targets` / `.deleted` unguarded on re-render | Safe array/object guards in `TestDataResetPage` |
| 3 Inbox sound replay | In-memory dedupe + hydrate race | `staffInboxAlertDeliveries` + subscription-ready gate; one sound per batch |
| 4 Upload stages/speed | Coarse labels; no Storage progress; opaque waits | Resumable upload %; Queued→…→Ready stages; keep finalize concurrency ≤ 3; timing `console.info` |
| 5–6 Studio intake | `isLoading` unmounted list on every mutation | Live `onSnapshot` list; keyed pending labels; local row remove; no full-page reload |

---

## Deployment (`fresh-prints-dev`)

| Resource | Result |
|----------|--------|
| `duplicatePortalPrintRequestItem` | Created |
| `firestore.rules` (deliveries + existing upload rules) | Released |

Production: **not** deployed. Wipe allowlist unchanged (dev only).

---

## Commands

| Command | Exit | Notes |
|---------|------|-------|
| Shared unit tests (wipe + r2 contracts) | 0 | 20/20 PASS |
| `npm --prefix functions run build` | 0 | PASS |
| Portal typecheck + build | 0 | PASS |
| Studio `vite build` | 0 | PASS |
| Firebase deploy functions+rules | 0 | PASS |
| G smoke script | skipped | Harness blocked Node smoke in this session; deploy + units green |

---

## Performance notes (issue 4)

Inherent cost remains: Storage upload → Function download → Sharp validate/trim/upscale → 3 derivatives. Client no longer hides stages or blocks sibling visibility after Ready. Finalize still capped at **3** concurrent. Dev timing logs: `[customer-upload] source upload complete` / `finalize complete` (ids + ms only).

---

## Manual retest

`docs/workflow/reviews/2026-07-12-portal-customer-artwork-upload-manual-e2e-remediation-r2-manual-checkpoint.md`

---

## Verdict

**passed_with_notes** — stop for owner manual retest. Do not sign off G/parent until PASS / PASS WITH NOTES.
