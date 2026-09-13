# Population Script — Test Report

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `portal-staff-artwork-neutral-projection-corrective` |
| Scope | Bounded DEV portal projection population script + corrective revalidation |
| Environment | Local validation; DEV dry-run recorded separately |

## Commands and results

| Check | Command | Result |
|---|---|---|
| Focused script tests | `npx --no-install tsx --test functions/scripts/backfill-portal-print-request-items-dev.test.ts` | **PASS** 20/20 |
| Projection + trigger + sizing + script | `npx --no-install tsx --test packages/shared/src/utils/portalPrintRequestItemProjection.test.ts functions/src/onPrintRequestItemPortalProjectionWritten.contract.test.ts functions/src/updatePortalStaffArtworkPrintRequestItemSize.contract.test.ts functions/scripts/backfill-portal-print-request-items-dev.test.ts` | **PASS** 24/24 |
| Functions build | `npm run build` (from `functions/`) | **PASS** exit 0 |
| Portal typecheck | `npx tsc --noEmit -p apps/portal/tsconfig.json` | **PASS** exit 0 |
| Targeted ESLint | `npx eslint` on the two new script files `--max-warnings 0` | **PASS** exit 0 |
| Diff check | `git diff --check` on new script files + workflow state | **PASS** exit 0 |

## Coverage mapped to required proofs

1. DEV project accepted
2. Missing project rejected
3. Non-DEV project rejected
4. Dry-run default
5. Only exact `APPLY=1` enables mutation path
6. `VERIFY=1` cannot combine with apply
7. `PAGE_LIMIT` default 200
8. `PAGE_LIMIT > 200` rejected
9. `PAGE_LIMIT < 1` rejected
10. Deterministic `__name__` ordering
11. Cursor resume
12. One-page bound
13. CREATE classification
14. UPDATE classification
15. ALREADY_CORRECT classification
16. Idempotent repeat
17. Shared mapper used
18. Staff Artwork private fields cannot cross
19. Catalog Design projection remains valid
20. Customer Upload projection remains valid
21. Malformed row fails closed for future apply
22. Dry-run performs zero writes
23. Canonical documents are never written
24. No `staffArtworks` read exists
25. No Storage read exists

## Not claimed

- Portal production build was **not** claimed green. Existing Windows `.next/trace` EPERM baseline remains documented; `.next` was not deleted to force a green result.

## Disposition

Automated gates for the population script and corrective revalidation are **PASS**. APPLY remains unauthorized until the owner checkpoint.

## Follow-up (2026-09-12 APPLY + cutover)

After owner APPLY authorization:

| Check | Result |
|---|---|
| Pre-apply dry-run revalidation | scanned 110 / create 110 / errors 0 — matched reviewed dry-run |
| APPLY (`PAGE_LIMIT=200`) | scanned 110 / create 110 / **actualWrites 110** / errors 0 |
| Post-apply dry-run | alreadyCorrect 110 / create 0 / update 0 / errors 0 / actualWrites 0 |
| VERIFY=1 | alreadyCorrect 110 / errors 0 / exit 0 |
| Staff Artwork rules contract | 2/2 PASS |
| Staff Artwork Firestore emulator suite | 6/6 PASS |
| Staff Artwork Storage emulator suite | 1/1 PASS |
| Firestore Rules deploy to `fresh-prints-dev` | PASS |
| Storage Rules deploy to `fresh-prints-dev` | PASS |

Owner DEV QA and Signoff remain pending. Production untouched.
