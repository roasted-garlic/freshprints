# Test Report: ADR-FP-086 promote purge + Portal account artwork

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Tester | Test Agent |
| Plan | `docs/workflow/plans/2026-07-14-adr086-promote-purge-portal-account-artwork-plan.md` |
| Implementation | Session `adr086-promote-purge-portal-account-artwork` |
| Overall | **passed** |

---

## Summary

Automated checks for promote cool-off eligibility, Functions build, and Portal typecheck passed. Dev deploy of `purgePromotedDonationFullSize`, `promoteCustomerUploadToAiReview`, and Firestore indexes succeeded. Manual Studio + Portal verification: **PASS** (owner, 2026-07-14).

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Unit tests | `npx tsx --test packages/shared/src/utils/promotedDonationFullSizeRetention.test.ts` | 0 | pass | 2/2 |
| Build (functions) | `npm run build` in `functions/` | 0 | pass | tsc |
| Typecheck (portal) | `npm run typecheck` in `apps/portal` | 0 | pass | |
| Lint (portal touched) | `npx eslint` on account artwork files | 1 | pass_with_notes | `@next/next/no-img-element` rule definition missing in flat config (pre-existing eslint-disable pattern; not a code defect) |
| Deploy (dev) | `firebase deploy --only functions:purgePromotedDonationFullSize,functions:promoteCustomerUploadToAiReview,firestore:indexes --project fresh-prints-dev` | 0 | pass | create + update + indexes |
| Integration | — | — | skip | No emulator suite for this callable |
| E2E | — | — | skip | Manual UI checkpoint covers |

---

## Failures (if any)

None blocking. ESLint rule-definition noise on `@next/next/no-img-element` only.

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Integration / E2E | Not configured for this path; manual Studio + Portal smoke instead |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Studio Retention → Promoted donation dry run / real | **PASS** | Owner reply 2026-07-14 |
| Portal `/dashboard` Reusable vs Past uploads + add from Reusable | **PASS** | Owner reply 2026-07-14 |

---

## Manual Test Checkpoint

**Feature / area:** ADR-FP-086 promote donation purge + Portal account artwork  
**Why automated tests are insufficient:** Callable dry-run against live data + Portal UI composition  
**Environment:** `fresh-prints-dev` (Studio + Portal local or hosted against dev)  
**Prerequisites:** Owner/admin Studio login; Portal customer with favorites and/or prior catalog requests and past uploads

### Steps

1. Studio → **Test Data Reset** → **Retention maintenance** → **Promoted donation full-size purge** → dry run  
   → **Expected:** Counts/candidates without deleting; no errors  
2. (Optional if eligible rows exist) Run without dry run  
   → **Expected:** Eligible cooled promotes purged; thumbs/previews remain  
3. Portal → `/dashboard` Artwork  
   → **Expected:** **Reusable** (favorites + prior catalog) and **Past uploads** sections  
4. Open a Reusable tile → Add to request  
   → **Expected:** Existing add-to-request flow works  
5. Past uploads tile  
   → **Expected:** Lightbox only (not re-addable)

### Pass criteria

- [x] Promoted donation purge dry run works in Studio
- [x] Dashboard shows both sections with correct empty/filled states
- [x] Reusable can open details and add to a request
- [x] Past uploads remain history/lightbox only

### Owner reply

`PASS` — 2026-07-14

---

## Recommendations

- Optional follow-up: Cloud Scheduler for retention callables (still queued on ROADMAP)

---

## Signoff Readiness

- [x] All required automated checks pass OR failures documented
- [x] Manual tests complete OR checkpoint pending
- [x] Ready for signoff phase

**Next step:** signoff-phase
