# Test report: print-request item resize permission (requestCountApplied Rules)

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Plan | `docs/workflow/plans/2026-07-31-production-portal-request-item-resize-permission-plan.md` |
| Status | **passed** (automated); production Rules deploy + owner QA pending |

---

## Commands run

| Command | Exit | Result |
|---------|-----:|--------|
| `npx tsx --test packages/shared/src/constants/printRequest/printRequestLimitSettingsRulesAlignment.test.ts` | 0 | 4/4 pass (incl. new `requestCountApplied` alignment) |
| `npm run test:rules` (portable Temurin 21 `JAVA_HOME`) | 0 | **56/56** pass across catalog, completion, timer, **and** new `printRequestItemResize` suite |

## Failing-before evidence

- Production symptom (Studio + Portal): size autosave → `permission-denied` after Wave C stamps `requestCountApplied`.
- Pre-change `firestore.rules` `printRequestItemRequiredFieldsValid` `keys().hasOnly` omitted `requestCountApplied` (verified during Plan inventory; local file matched 2026-07-30 prod rules blob).

## Passing-after coverage (new emulator file)

`tests/firebase/printRequestItemResize.rules.test.ts`:

- Staff size update with marker present → allow
- Customer size update with marker present → allow
- Marker absent → allow
- Upload item without marker → allow
- Staff/customer flipping marker → deny
- Customer update when parent `queued` → deny
- Customer quantity change on client path → deny

## Not run (N/A)

- Portal/Studio typecheck / build — no runtime app code required for this fix
- Functions build — Function unchanged
- Production Rules deploy — **human checkpoint**
- Owner Studio/Portal QA — after prod Rules deploy

## Honest notes

- Emulator deny logs include expected `PERMISSION_DENIED` noise from assertFails cases.
- Production fix is incomplete until Rules are deployed to `fresh-prints-prod`.
