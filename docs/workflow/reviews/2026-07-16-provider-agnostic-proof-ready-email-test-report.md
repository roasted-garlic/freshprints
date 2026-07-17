# Test Report: Provider-Agnostic Proof-Ready Email

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Tester | Test Agent |
| Plan | `docs/workflow/plans/2026-07-16-provider-agnostic-proof-ready-email-plan.md` |
| Implementation | Local managed-phase implementation; commit pending |
| Overall | **pending_manual** |

---

## Summary

Functions compilation, targeted lint, Studio Vite/Electron build, 38 email/rules/permission/Assisted tests, and diff whitespace checks pass. Full lint and Studio standalone typecheck retain documented unrelated/config failures; neither reports an email implementation regression. Live Resend delivery and owner-only Studio behavior require an approved dev deploy and human manual QA.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Functions typecheck/build | `npm --prefix functions run build` | 0 | pass | Includes both new exports, provider adapter, outbox worker, and shared contracts. |
| Studio typecheck (documented command) | `npx tsc --noEmit` from `apps/studio` | 2 | fail (pre-existing config) | `tsconfig.json(22,27): Invalid value for --ignoreDeprecations`. |
| Studio typecheck (config override) | `npx tsc --noEmit --ignoreDeprecations 5.0` from `apps/studio` | 2 | fail (unrelated) | Reached known errors in AI review, Assisted preview typing, customer uploads, print requests, staff inbox, and user audit files; no changed email/Select/permission file error. |
| Targeted lint | `npx eslint` over changed Functions/shared/Studio source files | 0 | pass | No warnings/errors. |
| Full lint | `npm run lint` | 1 | fail (unrelated) | 16 existing errors + 7 warnings: missing Next rule plugin, existing hooks/unused/control-regex/CommonJS issues. No changed email source finding. |
| Unit/integration tests | `npx tsx --test` over email provider/rules/permission tests and four Assisted test files | 0 | pass | 38 tests pass; mock transport only, no live email. |
| Studio build | `npx vite build` from `apps/studio` | 0 | pass | Renderer, Electron main, and preload built; existing chunk-size/circular-chunk warnings only. |
| Backend/rules alignment | Included in targeted test command | 0 | pass | Owner-only provider settings and deny-all delivery jobs verified against `firestore.rules`. |
| Diff hygiene | `git diff --check` | 0 | pass | Line-ending conversion warnings only. |
| Portal build/typecheck | Not run | n/a | skip | No Portal code changed. |
| Live E2E email | Not run | n/a | pending | Requires dev deployment, Resend, real inbox, and human approval. |

---

## Failures

### Studio configured typecheck
- **Command:** `npx tsc --noEmit`
- **Output excerpt:**
```txt
tsconfig.json(22,27): error TS5103: Invalid value for '--ignoreDeprecations'.
```
- **In scope to fix:** no
- **Action taken:** Re-ran with `--ignoreDeprecations 5.0`; compiler reached only existing unrelated errors and no changed email file error.

### Full repository lint
- **Command:** `npm run lint`
- **Output excerpt:**
```txt
23 problems (16 errors, 7 warnings)
```
- **In scope to fix:** no
- **Action taken:** Targeted lint over every changed source file passed. Full failures are in unchanged Portal, Studio, and Functions files/configuration.

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Portal typecheck/build | No Portal implementation change. |
| Production deploy/test | Explicitly excluded and requires separate human approval. |
| Dev deploy/live Resend E2E | Human checkpoint required before Firebase deployment or shared configuration changes. |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Owner-only Email Providers Settings | pending | Verify owner sees/saves; admin/helper cannot read section or callable. |
| Invitation regression | pending | Team and customer invitations still send via Resend and preserve result UX. |
| First/revised proof notices | pending | One email per distinct proof; proof submission remains successful on delivery failure. |
| Sender and CTA | pending | Confirm sender and dev CTA route/host in a real inbox. |
| Duplicate/retry behavior | pending | Confirm replay does not create another logical delivery. |

Manual test instructions:
`docs/workflow/reviews/2026-07-16-provider-agnostic-proof-ready-email-manual-checkpoint.md`

---

## Recommendations

- Obtain explicit approval for the selective `fresh-prints-dev` Functions/rules deploy.
- Do not change `RESEND_API_KEY` or sender parameters unless owner verification shows configuration is missing; any change requires explicit approval.
- Add emulator-backed worker/job transition tests in a future test-infrastructure phase if Firebase emulator CI becomes available.

---

## Signoff Readiness
- [x] Required automated checks pass or unrelated failures are documented
- [ ] Manual tests complete
- [ ] Ready for signoff phase

**Next step:** manual-test-checkpoint
