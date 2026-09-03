# Test Report: Firestore Rules Print Request item resize expression budget

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-09-03-firestore-rules-print-request-item-resize-expression-budget-plan.md |
| Implementation | uncommitted working tree on `development` @ baseline `2b457e2aac18bf138f5459126587daf42ae46dee` |
| Overall | **passed_with_notes** |

---

## Summary

Portable JDK 21. Alignment unit tests 7/7. Focused resize Rules **22/22**. Full `npm run test:rules` **169/169**, exit 0. The previously failing customer interactive-upscale resize now **PASS**es without expression-budget denial. Some unrelated and some deny-path emulator logs still mention the 1000-expression limit; those cases remain permission-denied (`assertFails`).

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Typecheck | n/a | — | skip | No app TS |
| Lint | n/a | — | skip | Alignment test only; no lint run required for Rules |
| Unit tests | `npx tsx --test packages/shared/src/constants/printRequest/printRequestLimitSettingsRulesAlignment.test.ts` | 0 | pass | 7/7 |
| Build | n/a | — | skip | |
| Integration | n/a | — | skip | |
| E2E | n/a | — | skip | |
| Backend/rules focused | `$env:JAVA_HOME=...jdk-21.0.11+10`; `firebase emulators:exec --only firestore "npx tsx --test tests/firebase/printRequestItemResize.rules.test.ts"` | 0 | pass | 22/22 |
| Backend/rules full | same JAVA_HOME; `npm run test:rules` | 0 | pass | 169/169 |
| Diff hygiene | `git diff --check` | 0 | pass | |

---

## Failures (if any)

None.

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Typecheck / lint / app build | No Studio/Portal/Functions source changes |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Portal enhanced-item resize after DEV Rules deploy | **pass_with_notes** | Owner `OWNER DEV RULES QA: PASS WITH NOTE` 2026-09-03. Resize save, upscale state after reload, protected metadata, no permission error PASS. Separate Portal DPI badge after reload (~225 vs Studio ~300) recorded as **TD-033** — out of scope. |

---

## Notes

- Deny-path emulator logs may still cite expression-budget exhaustion; writes still fail closed. The original ALLOW no longer does.
- Test count rose from 159 to 169 because 10 parity cases were added to `printRequestItemResize.rules.test.ts`.
- Owner note: Portal DPI badge rehydrate/recalc after navigate away/return uses stale/original dimensions while Upscale ON; Studio correct. See TD-033.

---

## Signoff Readiness

- [x] Required automated checks pass
- [x] Manual DEV Rules smoke complete (PASS WITH NOTE)
- [ ] Ready for signoff phase — **await owner Signoff authorization** (TD-033 deferred; commit/push not authorized)

**Next step:** owner-authorized Signoff | do not implement TD-033 here
