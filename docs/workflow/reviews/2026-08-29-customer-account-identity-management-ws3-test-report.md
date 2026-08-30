# Test Report: Customer Account Identity WS3 Full Account Merge

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Goal | `customer-account-identity-management-ws3-full-account-merge` |
| Verdict | **passed_with_notes** |
| Production | **NOT AUTHORIZED** |

---

## Automated checks

| Check | Command | Result |
|-------|---------|--------|
| Functions build | `cd functions && npm run build` | **pass** |
| Merge policy tests | `npx tsx --test functions/src/lib/customerAccountMerge.test.ts` | **12/12 pass** (includes stage-order regression) |
| Directory visibility | `npx tsx --test apps/studio/.../customerDirectoryVisibility.test.ts` | **4/4 pass** |
| Identity contracts | `npx tsx --test apps/studio/.../customerIdentityManagement.contract.test.ts` | **2/2 pass** |
| Identity activity mapper | `npx tsx --test apps/studio/.../customerIdentityActivityAudit.test.ts` | **1/1 pass** (post-QA Studio polish) |
| Studio-wide typecheck | project `tsc` | **not run** — unrelated branch debt noted in WS2/WS3 reviews |
| Emulator merge E2E | — | **not available** — deferred |

---

## Owner DEV QA

| Result | **PASS** |
|--------|----------|
| Environment | `fresh-prints-dev` + local Studio |
| Record | `docs/workflow/reviews/2026-08-29-customer-account-identity-management-ws3-dev-qa.md` |

Owner confirms after corrective redeploy:

- Transfer Username working
- Merge Accounts completed successfully
- Merge result UI reported success (Studio polish applied after first PASS)
- Source in **Merged** lifecycle; survivor canonical
- Operational history consolidated onto survivor

---

## QA corrective regression context (retained)

Initial merge Apply failed: job acquired `identityOperationLock` then `validate_preview` treated own locks as blocking. Corrective: stage order swap, lock release on failure, DEV-only `applyCustomerAccountMerge` redeploy, stale lock cleanup. Owner retry **PASS**.

---

## Notes / follow-ups

- Full fixture matrix (A–R) not exhaustively documented row-by-row; owner acceptance is holistic PASS on primary fixtures
- Converted CR→IR pair and UID-differing storage pair remain recommended before production promotion
- No production deploy performed

---

## Verdict

**passed_with_notes** — sufficient for WS3 DEV signoff.
