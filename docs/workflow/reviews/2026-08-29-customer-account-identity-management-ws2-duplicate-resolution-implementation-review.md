# Implementation Review: Customer Account Identity WS2 Duplicate Resolution

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Goal | `customer-account-identity-management-ws2-duplicate-resolution` |
| Verdict | **approved_with_notes** |

---

## Checklist (owner-required)

| # | Requirement | Result |
|---|-------------|--------|
| 1 | Username transfer txn has no release/claim gap | **pass** — placeholder assigned, desired reassigned, survivor old deleted in one txn |
| 2 | Survivor old username cleanup safe | **pass** — `appendUsernameHistory` + reservation delete |
| 3 | Placeholder preserves invariants | **pass** — `validateCustomerUsername` on `dupe-src-*` |
| 4 | Stale preview rejection | **pass** — checksum + consume + reservation re-read |
| 5 | Source/survivor same ID rejected | **pass** — preview + verification |
| 6 | Tombstoned/merged/locked fail closed | **pass** — eligibility + txn guards |
| 7 | Continuable blocks rechecked on Apply | **pass** |
| 8 | Source disable cannot strand working request | **pass** — source continuable blocks |
| 9 | Propagation targets survivor only | **pass** |
| 10 | Source history untouched | **pass** — no WS3 writes |
| 11 | No WS3 ownership changes in diff | **pass** |
| 12 | Activity metadata safe | **pass** — IDs/usernames/modes only |
| 13 | WS2 permissions owner-only | **pass** |
| 14 | Admin `updateCustomer` unchanged | **pass** |

---

## Notes

- Automated tests cover verification, continuable blockers, placeholder username, and Studio permission contract.
- Full Firestore transaction integration tests not added (consistent with WS1 hard-delete pattern); DEV QA required for primary email/password → Google scenario.
- `applyCustomerAccountDisableInternal` extracted for post-transfer disable without rolling back transfer.
- Production deploy **not authorized**.

---

## DEV deploy allowlist (owner approval required)

Deploy to **`fresh-prints-dev` only**:

| Artifact | Scope |
|----------|-------|
| Cloud Functions | `previewDuplicateAccountResolution`, `transferCustomerUsername` |
| Studio dev build | `ResolveDuplicateAccountWizard` + service wiring |

**Not required for WS2 unless preview collection rules change:** Firestore rules, indexes, Portal, Firebase Auth config.

---

## DEV deploy (2026-08-29)

| Field | Value |
|-------|-------|
| Project | `fresh-prints-dev` |
| Branch | `development` |
| Authorization | Owner-approved DEV-only scope |
| Command | `firebase deploy --only functions:previewDuplicateAccountResolution,functions:transferCustomerUsername --project fresh-prints-dev` |
| Result | **success** (exit 0) |
| Functions created | `previewDuplicateAccountResolution`, `transferCustomerUsername` (Gen2, `us-central1`, nodejs20) |
| Rules / indexes / other Functions | **not deployed** |
| Production | **unchanged** |

Verified via `firebase functions:list --project fresh-prints-dev` — both callables present as v2 callable in `us-central1`.

---

## Studio WS2 verification (2026-08-29, post-Modal corrective)

| Check | Command / scope | Result |
|-------|-----------------|--------|
| Studio typecheck (repo norm) | `npx tsc --noEmit` from `apps/studio/` | **Fails overall** due to pre-existing unrelated branch errors (documented; out of WS2 scope) |
| WS2-path typecheck inspection | Filter output for `ResolveDuplicateAccountWizard.tsx`, `customerIdentityManagementService.ts`, `UserManagementPage.tsx`, `permissionService.ts` | **No errors** after Button `variant="secondary"` corrective |
| Scoped contract test | `customerIdentityManagement.contract.test.ts` | **14 pass context: 2 tests pass** |
| Scoped ESLint | Four WS2 Studio files above | **pass** (exit 0) |

Corrective diff: replaced invalid `ButtonVariant` value `"outline"` with `"secondary"` in WS2 wizard + Users page entry button only.

Workflow remains at **owner DEV QA checkpoint** (no redeploy; Functions unchanged).

---

## Future duplicate prevention (read-only, WS2)

WS2 fixes existing duplicates only. Separate email/password and Google accounts can still be created today because Portal registration (`registerCustomer`) provisions a new `customers` doc + username reservation per successful Auth signup without cross-provider deduplication. Firebase Auth does not link providers automatically. **No Auth or Portal bootstrap changes were made in WS2.**

---

## Next step

Owner DEV deploy authorization → owner DEV QA on primary scenario → Test signoff gate.
