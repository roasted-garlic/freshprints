# Plan: Firestore Rules Print Request item resize expression budget

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-09-03-firestore-rules-print-request-item-resize-expression-budget-review.md |
| Goal slug | `firestore-rules-print-request-item-resize-expression-budget` |
| Baseline HEAD | `2b457e2aac18bf138f5459126587daf42ae46dee` (`development` == `origin/development`) |

---

## Goal

Fix the single remaining Firestore Rules emulator failure where an otherwise-valid **customer** Print Request item size update, with interactive-upscale fields present and unchanged, exhausts the 1000-expression evaluation budget. Preserve the current allow/deny contract exactly. This is an authorization-performance refactor, not a product-policy change.

## Background

Previous managed goal `portal-modal-dont-show-again-and-import-smart-profile-presets` closed at this SHA. Full Rules suite was **158/159**. The remaining failure was deliberately deferred and is **not** a Smart Profile / Workstream B regression.

Product contracts that must not change (ADR-FP-075, ADR-FP-080 interactive amendment, ADR-FP-071):

- Manual saves require effective DPI ≥ 200 at the **product** layer (Portal/Studio `requireSavablePrintRequestItemSize`). Rules do **not** currently encode the 200 DPI floor; this plan must not add or remove it.
- 200–299 DPI remains warning-only at the product layer.
- Either side > 22 inches remains disallowed (`isOptionalPositiveStandardPrintInches`).
- Interactive Upscale / `artworkEnhanceMode` remains callable-owned; ordinary resize must not mutate it.
- Customers may mutate only the established Portal-editable item fields; quantity/delete remain Admin callables.
- Staff behavior, protected/server-maintained fields, catalog vs upload source semantics, and “designs never receive queue/printed lifecycle” remain unchanged.

### Baseline working tree

- Branch: `development`
- HEAD: `2b457e2aac18bf138f5459126587daf42ae46dee`
- Status: clean except intentional untracked `.worktrees/`

---

## Exact reproduction (this session — no source changes)

Portable JDK:

`C:\Users\Roasted Garlic\.local-jdk\jdk-21.0.11+10`

Command:

```powershell
$env:JAVA_HOME='C:\Users\Roasted Garlic\.local-jdk\jdk-21.0.11+10'
$env:PATH="$env:JAVA_HOME\bin;$env:PATH"
firebase emulators:exec --only firestore "npx tsx --test tests/firebase/printRequestItemResize.rules.test.ts"
```

Result:

| Item | Value |
|------|-------|
| Exit code | **1** |
| File | `tests/firebase/printRequestItemResize.rules.test.ts` |
| Tests in file | 12 |
| Pass | **11** |
| Fail | **1** |
| Failing subtest | `allows customer size update when interactive upscale fields are present and unchanged` |
| Emulator error | `PERMISSION_DENIED: Unable to evaluate the expression as the maximum of 1000 expressions to evaluate has been reached` for `update` @ **L1908** (and default-deny `match /{document=**}` @ L2730) |
| Contrast | Same file: customer resize **without** interactive-upscale fields **PASS**; staff resize **with** those fields present and unchanged **PASS** |

Full `npm run test:rules` was **not** re-run in this planning session. Prior closed-goal record remains **158/159** with this same unique failure. Implementation Test phase must run the full suite.

Note: several **deny** subtests also log the same 1000-expression message while `assertFails` still passes. Fail-closed is safe, but those denials may currently be budget exhaustion rather than the intended predicate. After the refactor, deny cases that are supposed to be semantic must complete evaluation (or fail a cheap discriminator) rather than relying on the budget.

---

## Root-cause audit (source trace)

### R1. Top-level match

`match /printRequestItems/{printRequestItemId}` in `firestore.rules` (starts ~L1893).

### R2. `allow update` selected

The collection’s `allow update` at **L1908**. Shape:

```
allow update: if isStaff() && <staff identity + full shape + optionalFieldUnchanged…>
  || isCustomer() && printRequestItemRequiredFieldsValid(...) && customerCanUpdatePrintRequestItem()
     && (upload identity || catalog + isReadyDesign)
```

The failing write is a **customer** update. `isStaff()` is false, so the staff AND-chain short-circuits after `isStaff()`. The customer OR-branch is then fully evaluated. Default-deny `match /{document=**}` @ L2730 (`if false`) also matches but is cheap.

### R3. Helper call chain (customer resize)

1. `isStaff()` → `callerIsActive()` / `callerRole()` / `callerUser()` (`users/{uid}` get) → **false**
2. `isCustomer()` → same user-get helpers → **true**
3. `printRequestItemRequiredFieldsValid(request.resource.data)` — 27-key `keys().hasOnly([...])` plus per-field type/range validators, including interactive-upscale optionals
4. `customerCanUpdatePrintRequestItem()`
   - `customerCanMutatePrintRequestItem()`
     - `customerOwnsPrintRequestById` → `exists` + `get` `printRequests/{id}` + `customerOwnsPrintRequestData` (nested `isCustomer()` again + `get` `customers/{id}`)
     - `get` parent again for `status` in `{draft, editing}`
     - `get` parent again for `isPrintRequestParked`
   - Identity equalities (`id`, `printRequestId`, `quantity`, `designId`/`sourceType`/`customerUploadId`/`titleSnapshot`, `addedBy`, `status`, `createdAt`)
   - `optionalFieldUnchanged` ×7: `printedAt`, `printedBy`, `completedAt`, `requestCountApplied`, `updatedBy`, `artworkEnhanceMode`, `preEnhancePrintWidthInches`, `preEnhancePrintHeightInches`
5. Source branch: `isCatalogPrintRequestItem` + `isReadyDesign(designId)` (`exists` + `get` `designs/{id}`)

### R4. Generic item shape

`printRequestItemRequiredFieldsValid` (~L950).

### R5. Resize-specific authorization

There is **no** dedicated resize helper today. Customer resize uses the **generic customer item update** helper `customerCanUpdatePrintRequestItem` (~L149), which locks quantity/identity/protected fields but does not itself restrict the write to size keys.

### R6. Interactive-upscale fields

- Shape: `isOptionalArtworkEnhanceMode`, `isOptionalPositiveStandardPrintInches` for `preEnhancePrintWidthInches` / `preEnhancePrintHeightInches` inside `printRequestItemRequiredFieldsValid`
- Immutability: `optionalFieldUnchanged("artworkEnhanceMode"|preEnhance*)` in **both** the staff AND-chain and `customerCanUpdatePrintRequestItem`

### R7. Source-specific fields

`isCatalogPrintRequestItem` / `isUploadPrintRequestItem` inside the shape validator **and** again on the `allow update` source OR. Catalog updates also require `isReadyDesign`.

### R8. Immutable / server-owned fields

Customer: equality locks + `optionalFieldUnchanged` for Wave C `requestCountApplied`, legacy `updatedBy`, print-completion timestamps, interactive-upscale metadata. Staff: overlapping `optionalFieldUnchanged` set (no printedAt trio on staff path; staff may change quantity).

### R9–R12. Duplicated / redundant evaluation

Yes:

- `isCustomer()` / `callerUser()` re-run (Rules functions are **not** memoized).
- Parent `printRequests/{id}` is `get`’d **three** times in `customerCanMutatePrintRequestItem`.
- Catalog/upload classifiers run in the shape validator and again in the `allow update` source OR.
- Interactive-upscale fields are type-checked on the **full after-image** even when unchanged, then immutability-checked again via `optionalFieldUnchanged`.
- Full 27-key `hasOnly` re-validates the entire document when only size keys changed.

### R13. Boolean ordering

Staff branch is first (good for staff allows: customer branch is skipped). Customer allows still pay `isStaff()` then the **full** customer validator. There is no cheap “size-only / portal-editable keys” discriminator before `printRequestItemRequiredFieldsValid`. Firestore `&&` / `||` short-circuit, so the missing cheap discriminator is the main ordering defect.

### R14–R15. Fixture vs Rules

The failing fixture is a **realistic worst case**, not an invalid schema: catalog item with `requestCountApplied`, `updatedBy`, `artworkEnhanceMode`, and both `preEnhance*` fields. Those keys are in the official allowlist. The failure is **Rules evaluation cost**, not a fixture that invented extra product fields.

### R16. Why absent interactive-upscale still passes

Fewer document keys → cheaper `keys().hasOnly`. Absent optional fields take the cheap `!(field in data)` arm in type helpers and `optionalFieldUnchanged`. That path stays under 1000; adding the three interactive fields (plus `updatedBy` already in the fixture) pushes the customer path over.

### R17. Smallest behavioral-equivalent refactor

Replace the customer half of `allow update` with a **transition allowlist** using `diff().affectedKeys().hasOnly(...)` for the fields customers may already change, failing that check **before** `printRequestItemRequiredFieldsValid`. Keep the staff branch unchanged.

Current customer-mutable field set (everything not equality-locked or `optionalFieldUnchanged` in `customerCanUpdatePrintRequestItem`):

- `printWidthInches`, `printHeightInches`, `sizeLabel`, `standardSizePresetKey`, `sortOrder`, `notes`, `updatedAt`

Portal production resize (`portalPrintRequestService.updatePrintRequestItem.size`) writes a subset: width, height, `sizeLabel`, optional `standardSizePresetKey` (including `deleteField()`), `updatedAt`. Quantity stays on the Cap A callable.

Including `sortOrder` and `notes` in the allowlist preserves today’s Rules writable set even though Portal resize does not use them.

---

## Scope

### In Scope

- `firestore.rules` customer `printRequestItems` update path efficiency
- Focused Rules tests in `tests/firebase/printRequestItemResize.rules.test.ts`
- Update Rules **alignment** unit tests that regex-pin `customerCanUpdatePrintRequestItem` (`packages/shared/src/constants/printRequest/printRequestLimitSettingsRulesAlignment.test.ts`)
- Full `npm run test:rules` in Test phase
- DEV `firestore:rules` inventory for a later owner-authorized deploy (not this prompt)

### Out of Scope

- Product sizing / 200 DPI floor / 22″ cap / Interactive Upscale behavior
- Weakening validation or broadening customer/staff permissions
- Functions, Storage Rules, indexes, migrations, Studio/Portal/Shared app logic (alignment test updates only)
- Smart Profiling; Show Queue batch-allocation performance
- Production deploy; any commit/push from this planning prompt

If another unrelated Rules inefficiency is found (staff deny paths that also log budget exhaustion), **document only** — do not expand this goal.

---

## Affected Areas

### Files / Modules (expected)

- `firestore.rules` — customer `printRequestItems` `allow update` branch + new/replaced helper(s)
- `tests/firebase/printRequestItemResize.rules.test.ts` — parity cases T1–T10 as needed
- `packages/shared/src/constants/printRequest/printRequestLimitSettingsRulesAlignment.test.ts` — pin the new customer allowlist instead of `quantity == quantity` / customer `optionalFieldUnchanged("artworkEnhanceMode"|"requestCountApplied")`

### Architecture Impact

- [x] Details: Authorization stays in Firestore Rules. No new modules, no layer violation. Same pattern as existing design/catalog expression-budget fast paths (`companionDenormOnlyUpdate`, `designArchiveStatusOnlyUpdate`, etc.): cheap `affectedKeys().hasOnly` before an expensive full-document validator.

### Security Impact

- [x] Details: Security-sensitive Rules change. Customer writable keys must remain the **same set**. Protected fields stay immutable because they are **absent from the allowlist** (stronger/cheaper than re-checking each with `optionalFieldUnchanged` after a 27-key `hasOnly`). Staff path unchanged. Default deny unchanged.

### Data Model Impact

- [x] None — no schema, status, or field changes.

### Backend Impact

- [x] Details: Firestore Rules only. No Functions, env, indexes, or Storage Rules.

### UI / UX Impact

- [x] None — no app UI. Portal already writes the size-only patch this path must allow.

### Migration Impact

- [x] None

---

## Chosen optimization approach

**Option F (narrow customer transition branch) + Option A (single affected-key set), with Option C ordering inside that helper.**

Implement a helper, e.g. `customerPrintRequestItemPortalEditableUpdate()`:

Mandatory evaluation order:

1. `isCustomer()` — cheap role fail for staff/unauthenticated
2. `request.resource.data.diff(resource.data).affectedKeys().hasOnly([ ...portal-editable keys... ])` — **must run before** parent gets / `printRequestItemRequiredFieldsValid`
3. `customerCanMutatePrintRequestItem()` — ownership, `draft|editing`, not parked (unchanged semantics)
4. Type/range checks **only for allowlisted fields** (reuse `isOptionalPositiveStandardPrintInches`, `isOptionalString`, `isOptionalNumber`; `updatedAt is timestamp`)
5. Existing source OR: upload identity **or** catalog + `isReadyDesign`

Wire:

```
allow update: if isStaff() && <existing staff chain unchanged>
  || customerPrintRequestItemPortalEditableUpdate();
```

Keep **staff branch first** so staff allows do not pay a new customer helper beyond a failing `isCustomer()` if the implementer inlines poorly. Prefer calling the new helper only on the customer OR-side so staff allows remain: `isStaff() && …` short-circuit, then the new helper (which starts with `isCustomer()`).

`customerCanUpdatePrintRequestItem()` should be **replaced** by the new helper (or reduced to a wrapper) so the expensive 27-key validator is **not** a fallback that re-runs on deny and recreates budget exhaustion. Do not keep `printRequestItemRequiredFieldsValid` on the customer update path.

Equivalence argument: if only allowlisted keys may change, unknown fields, identity, quantity, interactive-upscale metadata, `requestCountApplied`, `updatedBy`, and completion timestamps cannot change. Unchanged fields keep their persisted values; changed fields are type-checked. That is the same transition contract as today’s equality + `optionalFieldUnchanged` + full after-image `hasOnly`, without re-scoring the entire after-image allowlist.

`printRequestItemRequiredFieldsValid` remains on **create** and **staff update**.

Optional follow-up (only if Test phase still exceeds 1000): collapse the triple `get` of the parent request inside `customerCanMutatePrintRequestItem` into one `get`. Do not do that in the first patch unless required.

---

## Rejected alternatives

| Option | Why rejected |
|--------|----------------|
| Remove or skip interactive-upscale immutability | Forbidden — would allow callable-owned field mutation |
| Drop `printRequestItemRequiredFieldsValid` with no transition substitute | Forbidden — unknown-field injection / shape holes |
| Generic customer `allow update` escape hatch | Forbidden — broadens access |
| Reorder only (`isCustomer` before `isStaff`) | Insufficient — customer still pays the 27-key validator |
| Deduplicate `optionalFieldUnchanged` only | Insufficient — `keys().hasOnly` of 27 keys on a denser after-image is the dominant cost |
| Size-only fast path **plus** old general path as fallback | Deny/non-size writes still hit the old path and can exhaust the budget; two paths are harder to prove equivalent |
| Skip `isReadyDesign` on catalog resize | Changes catalog semantics |
| Change the test fixture to omit upscale fields | Hides production-shaped documents; not a Rules fix |
| Add 200 DPI to Rules to “help” T9 | Product-policy change; DPI is not in Rules today |
| Functions/Portal to avoid client resize | Out of scope; Portal size write is the established path |
| Production Rules deploy in this goal | Not authorized |

---

## Security invariants (BEFORE vs PROPOSED)

| Actor / case | BEFORE | PROPOSED |
|--------------|--------|----------|
| Request-owner customer, valid size, upscale absent | ALLOW | ALLOW |
| Request-owner customer, valid size, upscale present unchanged | **BUDGET DENY** (defect) | ALLOW |
| Different customer | DENY | DENY |
| Unauthenticated | DENY | DENY |
| Staff valid size, upscale present unchanged | ALLOW | ALLOW (staff chain unchanged) |
| Customer, parent not `draft`/`editing` (e.g. queued) | DENY | DENY (`customerCanMutatePrintRequestItem`) |
| Customer, parked request | DENY | DENY |
| Catalog item | ALLOW if ready design | same `isReadyDesign` |
| Customer-upload item | ALLOW | same upload identity |
| Customer mutates `artworkEnhanceMode` / `preEnhance*` | DENY (or budget deny) | DENY via allowlist miss (cheap) |
| Customer mutates `requestCountApplied` / `updatedBy` / printed\* | DENY | DENY via allowlist miss |
| Unknown field injection | DENY (`hasOnly` on full doc) | DENY (`affectedKeys().hasOnly`) |
| Valid size ≤22″ | ALLOW (Rules inches check) | same helper on new values |
| Size >22″ | DENY | DENY |
| Effective DPI <200 | **Rules do not deny**; product layer denies | **unchanged** (do not add DPI to Rules) |
| Customer quantity change on this branch | DENY (`quantity ==`) | DENY (quantity not in allowlist) |
| Customer notes/sortOrder-only (Rules-legal today; not Portal resize) | ALLOW if shape valid | ALLOW (keep in allowlist for equivalence) |
| Staff quantity during size update | ALLOW | ALLOW (staff path) |

UI gating is not a security boundary. Firestore Rules remain authoritative.

---

## Approach

1. Add `customerPrintRequestItemPortalEditableUpdate()` with the mandatory cheap-to-expensive order above.
2. Replace the customer OR of `printRequestItems` `allow update` with that helper. Leave staff AND-chain byte-for-byte equivalent aside from formatting if required by the editor.
3. Remove or stop calling `customerCanUpdatePrintRequestItem` so alignment tests can be retargeted.
4. Extend `printRequestItemResize.rules.test.ts` for T1–T10 (reuse existing cases; add only missing parity).
5. Update `printRequestLimitSettingsRulesAlignment.test.ts` to assert: customer allowlist **excludes** quantity, interactive-upscale keys, `requestCountApplied`; **includes** size keys; staff `optionalFieldUnchanged` pins unchanged.
6. Test phase: focused file + `npm run test:rules` (0 failures). Do not claim 159/159 if new tests change the count — require 0 failures.
7. STOP for Implementation Review, then owner-authorized **DEV** Rules deploy only.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | n/a (no app TS) | no |
| Lint | only if TS alignment test file is edited | yes if that file changes |
| Unit tests | `npx tsx --test packages/shared/src/constants/printRequest/printRequestLimitSettingsRulesAlignment.test.ts` | yes |
| Build | no | no |
| Integration | no | no |
| E2E | no | no |
| Backend/rules focused | `firebase emulators:exec --only firestore "npx tsx --test tests/firebase/printRequestItemResize.rules.test.ts"` with portable JDK 21 | yes |
| Backend/rules full | `npm run test:rules` | yes |

### Focused matrix (minimum)

| ID | Case | Expected |
|----|------|----------|
| T1 | Customer valid size + interactive upscale present unchanged | ALLOW |
| T2 | Customer valid size, upscale fields absent | ALLOW |
| T3 | Customer changes `artworkEnhanceMode` (or preEnhance) during resize | DENY, and **not** solely via leftover budget exhaustion if the cheap allowlist is in place |
| T4 | Different customer | DENY |
| T5 | Unknown field injected | DENY |
| T6 | Server-maintained field mutation (`requestCountApplied`, `updatedBy`, printed\*) | DENY |
| T7 | Customer-upload item valid resize | ALLOW (existing) |
| T8 | Catalog-design item valid resize | ALLOW (existing) |
| T9 | Invalid size / preset type / queued parent (existing) | DENY |
| T10 | Completion / `queueTab` are parent-request fields; item `printedAt`/`completedAt` remain immutable on this branch | DENY if mutated; unchanged optional item fields stay present |

Reuse existing tests for T2, T6–T9. Add T1 (already present, currently failing), T3 customer variant, T4, T5, T10 as needed without a new test harness.

### Manual

- [x] None required for Plan/Review. After DEV Rules deploy (later): owner sanity that Portal resize of an enhanced item still saves.

---

## Human Checkpoints Anticipated

- [x] Other: **Owner approval before DEV `firestore:rules` deploy** (after Implementation + Tests)
- [x] Production deploy — **NOT AUTHORIZED** (separate later checkpoint)
- [ ] Manual UI/UX review — not for this Rules-only goal unless owner requests Portal smoke after DEV deploy

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Accidental permission broadening | Critical | Allowlist must match today’s customer-mutable keys only; Formal Review matrix; deny tests |
| Accidental narrowing (notes/sortOrder) | High | Include those keys even if Portal resize does not write them |
| Cheap discriminator after expensive mutate | High | Review gate: `affectedKeys().hasOnly` immediately after `isCustomer()` |
| Alignment tests fail | Medium | Update regex pins in the same implementation |
| Staff deny paths still log budget errors | Low | Out of scope; document as residual; fail-closed |
| Unrelated Rules suite failure | Medium | Full `test:rules`; do not “fix” unrelated suites in this goal |

See also: `.cursor/workflow/risk-checklist.md`

---

## DEV deployment inventory (later — not this prompt)

| Surface | This goal |
|---------|-----------|
| Firestore Rules | **YES** — `firestore.rules` → `fresh-prints-dev` only, after owner approval |
| Functions | **NO** |
| Storage Rules | **NO** |
| Indexes | **NO** |
| Migration / backfill | **NO** |
| Studio / Portal / Shared app | **NO** (alignment test only) |

Exact later command (do not run now):

`firebase deploy --only firestore:rules --project fresh-prints-dev`

## Production inventory (later coordinated checkpoint only)

| Surface | Later production |
|---------|------------------|
| Firestore Rules | YES — only after separate production-promotion authorization |
| Functions / Storage / indexes / migration / apps | NO expected |

## Rollback Plan

- DEV: redeploy previous `firestore.rules` from `2b457e2aac18bf138f5459126587daf42ae46dee` (`firebase deploy --only firestore:rules --project fresh-prints-dev`).
- Production: N/A until a production deploy exists; then revert that Rules release the same way.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [ ] DATA_MODEL.md
- [ ] BACKEND.md / FIREBASE.md — optional one-line that customer item updates use an `affectedKeys` allowlist (only if implementation review wants it)
- [ ] TESTING.md — only if commands change (they should not)
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [ ] DECISIONS.md — **no new ADR** (efficiency refactor; product ADRs 075/080/071 unchanged)
- [x] Other: this plan + Formal Review; workflow state; Test report / signoff later

---

## No product-behavior-change statement

This plan does **not** change Print Request sizing product behavior, the 200 DPI save floor, the 22-inch cap, Interactive Upscale semantics, Portal vs Studio editability, quantity/callable ownership, or design lifecycle. It only reduces Rules expressions for the same authorization semantics.

---

## Open Questions

- [x] None blocking implementation after Formal Review. Residual staff-deny budget noise is documented, not a decision.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-09-03-firestore-rules-print-request-item-resize-expression-budget-review.md`
- Verdict: **approved**
