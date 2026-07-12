# Test Report: Portal Customer Artwork Upload — Sub-phase G

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Plan | `docs/workflow/plans/2026-07-12-portal-customer-artwork-upload-subphase-g-plan.md` |
| Environment | `fresh-prints-dev` |
| Automated result | **passed** |
| Overall G / parent | **pending_manual_e2e** (hard gate) |

---

## Deployment evidence

| Step | Project | Result |
|------|---------|--------|
| Verified active project | `fresh-prints-dev` (current) | Confirmed before deploy |
| `firebase deploy --only functions:cleanupAbandonedCustomerUploads --project fresh-prints-dev` | fresh-prints-dev | Success — create |
| `firebase deploy --only functions:wipeOperationalTestData --project fresh-prints-dev` | fresh-prints-dev | Success — update (customerUploads target) |

Production: **not** deployed. Wipe allowlist: **`["fresh-prints-dev"]` only** (verified in smoke).

---

## Commands Run

| Command | Exit | Notes |
|---------|------|-------|
| `npx tsx --test packages/shared/src/utils/operationalWipeTargets.test.ts` | 0 | 14/14 PASS |
| `npm run build` (functions) | 0 | tsc clean |
| Deploys above | 0 | See deployment evidence |
| `node functions/scripts/smoke-customer-upload-subphase-g.mjs` | 0 | **6/6 PASS** (`mrhwvzm8`) |

---

## Smoke summary (`mrhwvzm8`)

1. Target project is `fresh-prints-dev`
2. Wipe allowlist is dev-only; `customerUploads` target present
3. Wipe plan expansion includes customer upload collections + Storage prefix
4. Helper cannot call cleanup (permission-denied)
5. Owner `cleanupAbandonedCustomerUploads` dryRun succeeds (`sourceObjectsDeleted: 0`)

Full destructive wipe of all `customer-uploads/` on dev was **not** run (fixture-scoped policy); expansion + allowlist covered by unit + smoke.

---

## Manual E2E

**Initial owner result:** **FAIL** (7 issues) — do not sign off.

**Remediation:** plan/review approved; automated remediation **passed_with_notes** — see  
`docs/workflow/reviews/2026-07-12-portal-customer-artwork-upload-manual-e2e-remediation-test-report.md`

**Required retest before G / parent signoff:**  
`docs/workflow/reviews/2026-07-12-portal-customer-artwork-upload-manual-e2e-remediation-manual-checkpoint.md`

---

## Verdict (automated)

**passed** (G smoke) — then manual **FAIL** → remediation automated green → **await retest**. Do not sign off G or parent until retest PASS / PASS WITH NOTES.
