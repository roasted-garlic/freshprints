# Test Report: Portal account auth (#7–#9) + Owner delete user (#10)

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Plan | docs/workflow/plans/2026-07-20-portal-account-auth-settings-7-9-plan.md |
| Status | **passed** (automated checks passed; owner manual QA **PASS** 2026-07-20) |

---

## Automated checks

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Functions build | `npm --prefix functions run build` | 0 | PASS |
| Unit | `npx tsx --test functions/src/lib/portalAccountSettingsValidation.test.ts` | 0 | PASS (3) |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | PASS |
| Studio typecheck | `cd apps/studio; npx tsc --noEmit` | 2 | **Pre-existing** `ignoreDeprecations: "6.0"` → TS5103 on TS 5.9 (documented prior phases). No new file-level errors from ReadLints on touched Studio files. |
| Deploy Functions + rules | `firebase deploy --only functions:syncPortalAccountEmail,functions:requestPortalAccountDeletion,functions:cancelPortalAccountDeletionRequest,functions:ownerDeleteUser,firestore:rules --project fresh-prints-dev` | 0 | PASS — all four Functions created; rules released |

## Manual

| Checkpoint | Result | By | Date |
|------------|--------|-----|------|
| Combined #7–#10 + Notifications Back + Google Change email copy (no Sync) + Delete user modal width/theme/copy/list-scroll/**5-card** height | **PASS** | owner | 2026-07-20 |

See: `docs/workflow/reviews/2026-07-20-portal-account-auth-settings-7-10-manual-qa.md`

## Notes

- Soft-reload Portal after deploy for callables.
- Reload Studio for Test Data Delete user UI.
- Production not deployed.
- **2026-07-20 QA fix (#8 Google copy):** Owner rejected Google “change in Google + Sync” UX. Portal now shows cannot-change-in-app + new-account path; Sync button only for password accounts. `syncPortalAccountEmail` remains deployed for password verify-then-sync. See updated manual QA #8.
- **Related polish (PASS):** Notifications modal **Back to settings**; Google Change email honest copy without Sync (least resistance = new account).
- **Final polish (#10 modal):** Wider Delete user modal (~52rem / `modal-panel-lg`), theme-matched confirm label typography, copy-to-clipboard for `DELETE USER`, **list-only scroll**, visible height **5 cards** (owner **PASS** 2026-07-20). Soft-reload Studio. No Functions / no production.
