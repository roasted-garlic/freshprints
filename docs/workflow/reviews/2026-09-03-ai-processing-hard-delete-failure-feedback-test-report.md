# Test Report: AI Processing hard-delete failure feedback

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-09-03-ai-processing-hard-delete-failure-feedback-plan.md |
| Implementation | session `ai-processing-hard-delete-failure-feedback` on `development` |
| Overall | **passed_with_notes** |

---

## Summary

Automated unit + Option B contract tests **passed** (12). Owner manual smoke: refused delete now shows  
`Design was promoted from a customer upload (sourceCustomerUpload provenance).`  
UI fix verified. Design remains undeletable via Option B by intentional policy (not a regression of this goal).

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Typecheck | — | — | skip | No dedicated studio typecheck script; narrow TS change |
| Lint | — | — | skip | Not run for this hotfix |
| Unit tests | `npx tsx --test apps/studio/src/renderer/src/features/ai-review/utils/resolveHardDeleteTotalFailureMessage.test.ts apps/studio/src/renderer/src/features/ai-review/utils/optionBPermanentDeleteUi.contract.test.ts` | 0 | pass | 12 pass / 0 fail |
| Build | — | — | skip | Not required by plan |
| Integration | — | — | skip | N/A |
| E2E | — | — | skip | N/A |
| Backend/rules | — | — | skip | No backend changes |

---

## Failures (if any)

None.

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Typecheck / lint / build | Plan scoped to targeted unit/contract + manual smoke |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| AI Processing hard-delete refusal shows error in dialog | pass_with_notes | Owner saw provenance blocker text; design still blocked by policy |

### Manual Test Checkpoint

**Feature / area:** AI Processing permanent delete failure feedback  
**Why automated tests are insufficient:** Dialog wiring + callable refusal needs live Studio UI  
**Environment:** local Studio (`npm run dev:studio`) / owner account  
**Prerequisites:** At least one design on Processing, Needs Review, or Rejected that delete may refuse (or any; success path also OK to verify)

### Steps
1. Open AI Processing → select the stuck design (or any) → preview **⋯** → **Delete**. → **Expected:** Confirm dialog opens with phrase field.
2. Type `DELETE UNAPPROVED DESIGNS` → click **Permanently delete**. → **Expected:** If server refuses, dialog **stays open** and shows a red error with the refusal reason (not blank). If delete succeeds, dialog closes and design leaves the list.
3. On refusal, click **Cancel**. → **Expected:** Dialog closes; design still present.

### Pass criteria
- [ ] Refusal no longer looks like “nothing happened”
- [ ] Successful delete still works when eligible

### Please reply with
- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

---

## Recommendations

None for CI; consider reusing this helper if Design Library hard-delete (unapproved) gains a similar path later.

---

## Signoff Readiness
- [x] All required automated checks pass OR failures documented
- [x] Manual tests complete OR checkpoint pending
- [x] Ready for signoff phase

**Next step:** signoff
