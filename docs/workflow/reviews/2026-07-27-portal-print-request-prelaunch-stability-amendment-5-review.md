# Portal Print Request Pre-Launch Stability — Amendment 5 (Section 23) Formal Review

- **Date:** 2026-07-27
- **Reviewer:** Review Agent (independent context, focused on Section 23 only)
- **Scope:** Plan Section 23 (Amendment 5) — Studio timer diagnostic tooling (23.1), the ADR-FP-122
  capacity-uniqueness policy reversal (23.2), the show-switch stale-error fix (23.3), and the
  post-wipe audit tooling (23.4). Reviewed the already-implemented change against the owner's exact
  decision (obtained mid-session, not assumed).

---

## 1. Verdict

**`approved_with_changes`**

---

## 2. Callable change — `functions/src/queuePortalPrintRequestToShow.ts`

**CONFIRMED correct**, via full independent read.

- Pre-transaction uniqueness throw genuinely removed: `existingOnShowQty` computed (with an
  ADR-FP-122 explanatory comment), no `if (existingOnShowQty > 0)` gate anywhere in the file.
- In-transaction re-verification throw genuinely removed: `freshCustomerOnShowQty` computed, no
  `if (freshCustomerOnShowQty > 0)` gate.
- Both variables still feed the unchanged cap math: `existingOnShowQty` →
  `remainingPerShowCustomerCap`/`planPortalShowQueueFit` (pre-transaction) and
  `wouldExceedPerShowCustomerCap` (second pre-transaction check); `freshCustomerOnShowQty` →
  `capRemaining`/`batchQuantity > capRemaining` (in-transaction).
- The separate per-request one-show structural invariant (`hasExistingAllocation`/
  `freshRequestHasAllocation`, "This request is already tied to a show...") remains fully intact and
  unrelated to the removed rule.
- `packages/shared/src/utils/printRequestPerShowCustomerCap.ts`'s `wouldExceedPerShowCustomerCap`
  (`existingOnShowQty + newRequestQty > cap`) and `portalShowQueueFit.ts`'s
  `remainingPerShowCustomerCap`/`planPortalShowQueueFit` confirmed **zero diff** — the boundary math
  itself was never touched, matching the owner's exact examples (23+2=25 allow, 23+3=26 block,
  25+1=26 block).

---

## 3. Test coverage

**CONFIRMED, all pass.**

- `printRequestPerShowCustomerCap.test.ts`'s new ADR-FP-122 describe block covers the owner's exact
  boundary set plus a no-double-counting proof — 13 tests, 0 fail.
- `queuePortalPrintRequestToShow.test.ts` (new) — legitimate, explicitly-supplementary
  source-presence proof — 6 tests, 0 fail.
- Combined run across all new/modified test files: 24 tests, 0 fail, 0 cancelled.

---

## 4. Show-switch stale-error fix

**CONFIRMED correct, with the actual race genuinely modeled**, not simplified.

- `useQueuePrintRequestToShow.ts`'s `error` is `{ showId, message } | null`; a monotonic generation
  counter bumped by `clearError()` and captured per-dispatch prevents a stale rejection from setting
  a stale error.
- `PortalQueueToShowModal.tsx`'s `ShowPicker.onSelect` clears both `actionError` and calls
  `clearError()` before switching the selected show; `handleConfirmAcknowledgment`'s catch block no
  longer duplicates the message into the unscoped `actionError` (confirmed this was deliberate, with
  an explanatory comment); render-time defense-in-depth only shows `submitError` when its scoped show
  id matches the currently effective selection.
- `useQueuePrintRequestToShow.test.ts` (new) genuinely models the exact race described: Show A
  dispatches, `clearError()` fires (simulating the switch to Show B) **before** Show A's rejection
  arrives, then the late rejection is proven to be a no-op — 5 tests, 0 fail.

---

## 5. Documentation

**One gap found, resolved directly:** `docs/architecture/DATA_MODEL.md` (a second location, line
~1816, in the `settings/printRequestLimits` section) still described the queue check as "capacity +
one request per customer per show" — corrected to describe the actual current behavior (cumulative
allocated quantity across however many separate requests, per ADR-FP-122). No `ADR-FP-122` numbering
collision found anywhere in the docs tree.

---

## 6. Studio timer / wipe-audit tooling

**CONFIRMED read-only and correctly failing without credentials** — `compare-deployed-firestore-rules.mjs`
and `audit-post-wipe-capacity-state.mjs` contain no create/update/delete/write calls; both exit
non-zero with an explicit, actionable credential error when run without Application Default
Credentials, which is correct behavior in this environment, not a defect.

**One minor test-fidelity nit, resolved directly:** `tests/firebase/studioProductionTimer.rules.test.ts`'s
batch write omitted `printPausedAt: deleteField()`, which the real `startShowPrinting` batch includes
— confirmed this omission did not change any of the test's six pass/fail outcomes (the field is in
the Rules allowlist as optional either way), but corrected for exactness since the file's own
docstring claims to reproduce the write precisely.

Java is confirmed absent in this environment (`java: command not found`), so this Rules-emulator test
cannot be executed here — an accepted, documented limitation, not a defect in the test itself, which
is syntactically valid and follows the repo's established Rules-emulator test convention exactly.

---

## 7. Verification — independently re-run

- `npm run typecheck --workspace @fresh-prints/portal` — exit 0.
- `cd functions && npm run build` — exit 0.
- `npx tsx --test` on all new/modified test files — 24 pass, 0 fail, 0 cancelled.
- `npm run lint` — exactly 41 pre-existing problems (31 errors, 10 warnings), none new in any of the
  six touched/new files for this amendment.
- `git diff --check` — exit 0.

---

## 8. Blocking findings

None.

## 9. Answer to the required key question

**Does the shipped change implement exactly what the owner decided, with nothing extra and nothing
missing, and no regression to the per-request one-show invariant?** Yes. The customer-uniqueness gate
is removed at both enforcement points while the cap math and the unrelated per-request one-show
structural invariant are byte-for-byte untouched (confirmed via zero-diff on the shared math files and
unchanged strings/checks in the callable). All new tests are genuine and pass. The stale-error fix
correctly implements a generation-scoped, per-show error contract with a properly-modeled supersession
race. The two items keeping this from an unconditional `approved` were both cosmetic documentation/
test-exactness gaps, both resolved directly in this pass.
