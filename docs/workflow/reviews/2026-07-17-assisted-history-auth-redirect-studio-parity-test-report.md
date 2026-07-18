# Test Report: Assisted History, Auth Return, and Studio Parity

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Tester | Test Agent |
| Plan | `docs/workflow/plans/2026-07-17-assisted-history-auth-redirect-studio-parity-plan.md` |
| Implementation | Local uncommitted worktree |
| Overall | **pending_manual** |

---

## Summary

Focused history-numbering and redirect-security tests pass (9/9), Portal typecheck passes, all changed TypeScript/TSX files pass targeted lint, and the Studio Vite/Electron renderer build passes. Full-repo lint and Studio whole-project TypeScript checks remain failed on pre-existing/out-of-scope files; the Portal production build could not acquire `.next/trace` while the owner’s Portal dev server was running.

Manual authenticated and visual QA is required before signoff.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Unit tests | `npx tsx --test "packages/shared/src/utils/assistedCreationHistory.test.ts" "apps/portal/features/auth/utils/portalReturnUrl.test.ts"` | 0 | pass | 9 tests, 2 suites; includes mixed proof/revision cycles and hostile redirect inputs. |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | pass | Re-run after redirect utility lint fix. |
| Changed-file lint | `npx eslint [changed TS/TSX files] --max-warnings 0` | 0 | pass | Shared history, Portal auth/display, and Studio assisted-detail files pass. |
| Full lint | `npm run lint` | 1 | fail_documented | Existing repo errors include missing `@next/next/no-img-element` rule, unrelated no-control-regex/require issues, and unrelated warnings. The one new `portalReturnUrl.ts` no-control-regex issue was fixed; targeted lint then passed. |
| Studio Vite build | `npx vite build` from `apps/studio` | 0 | pass | Renderer, Electron main, and preload built; existing chunk warnings only. |
| Studio typecheck (documented command) | `npm exec tsc -- --noEmit` from `apps/studio` | 2 | fail_documented | Installed TypeScript 5.9.3 rejects existing `ignoreDeprecations: "6.0"` configuration before checking source. |
| Studio typecheck (compatible compiler) | `npx --package typescript@6 tsc --noEmit` from `apps/studio` | 2 | fail_documented | After one in-scope proof-preview typing fix, remaining errors are in unrelated AI review, customer uploads, print requests, staff inbox, and user audit files; no error remains in the changed Assisted component. |
| Portal production build | `npm run build:portal` | 1 | blocked | `EPERM` opening `apps/portal/.next/trace`; owner’s `npm run dev:portal` is actively using `.next`. Dev server was not stopped. Portal typecheck passed. |
| Backend/rules | not run | n/a | skip | No Functions/rules/backend changes. |
| E2E | not configured | n/a | skip | Auth and visual behavior covered by manual checkpoint. |

---

## Failures

### Full-repo lint baseline

- **Command:** `npm run lint`
- **Output excerpt:**
  ```text
  Definition for rule '@next/next/no-img-element' was not found
  @typescript-eslint/no-unused-vars in catalogStorageService.ts
  no-control-regex in unrelated Studio/Functions files
  ```
- **In scope to fix:** no, except the new redirect utility issue.
- **Action taken:** Replaced the new control-character regex with code-point validation and reran targeted lint successfully. Existing unrelated failures were left untouched.

### Studio whole-project typecheck baseline/config mismatch

- **Command:** documented TypeScript command and a TypeScript 6 compatibility run.
- **Output excerpt:**
  ```text
  TypeScript 5.9.3: Invalid value for '--ignoreDeprecations'
  TypeScript 6: unrelated missing fields / optional-string errors in existing modules
  ```
- **In scope to fix:** only errors in the changed Assisted component.
- **Action taken:** Fixed proof-preview optional-note inference. Re-run has no errors in the changed component; unrelated failures remain documented.

### Portal production build file lock

- **Command:** `npm run build:portal`
- **Output excerpt:**
  ```text
  EPERM: operation not permitted, open '...\apps\portal\.next\trace'
  ```
- **In scope to fix:** no.
- **Action taken:** Confirmed an owner Portal dev server is active. It was not stopped or disrupted. Re-run after the owner stops the dev server.

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Functions build | No Functions change. |
| Firestore/Storage rules tests | No rules change. |
| Automated E2E | No configured suite; real Firebase login and visual comparison require manual QA. |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| History proof/revision numbering | pending | Verify Studio newest-first labels still use chronological sequence numbers and Portal matches Proofs. |
| Post-login return URL | pending | Verify email/password, Google, and first-time Google profile completion. |
| Studio/Portal visual parity | pending | Verify Overview / Proofs / History structure plus preserved staff controls and themes. |

Manual test instructions: `docs/workflow/reviews/2026-07-17-assisted-history-auth-redirect-studio-parity-manual-qa.md`

---

## Recommendations

- Re-run `npm run build:portal` after the Portal dev server is stopped.
- Address the repository-wide ESLint plugin/config baseline and existing Studio TypeScript 6 errors in a separate scoped workflow.
- Do not broaden this phase into those unrelated failures.

---

## Signoff Readiness

- [x] Required automated checks passed where runnable, or failures/blockers are documented.
- [ ] Manual tests complete.
- [ ] Ready for signoff phase.

**Next step:** manual-test-checkpoint
