# Plan: Custom request details parity (Portal + Studio)

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-21-custom-request-details-parity-review.md |

---

## Goal

When a customer submits a custom request (Assisted Creation) from the Portal, **every non-empty** submitted value must appear on custom-request details in **both Portal and Studio**: filled text, checked checkboxes, selected radios/enums, and uploaded reference images. Studio is the primary fix; Portal only if gaps remain for non-empty values.

## Background

Owner report: Studio does not seem to show every entry sent from Portal during a custom request. Inspection shows **persistence is complete** (`AssistedCreationAnswers` + `referenceImages` are written intact via callables). The gap is **display mapping**: Studio hard-codes a shorter “Request details” list than Portal, and **both** apps omit several wording / reference-usage fields that customers can fill and save.

---

## Scope

### In Scope

- Align Studio Assisted Creation request-details rows with the full non-empty answer set (at least match Portal’s subject extras; also add fields both apps currently omit when non-empty).
- Align Portal details so neither app forgets non-empty values (wording notes/bools, reference usage).
- Prefer a **shared** pure helper in `@fresh-prints/shared` that builds ordered `{ label, value }[]` from `AssistedCreationAnswers`, filtering empties consistently.
- Unit tests for include-non-empty / exclude-empty mapping.
- Studio reference-image list: avoid silently dropping entries when download URL resolve fails (show unavailable placeholder like Portal).
- Light doc note if display contract changes (DATA_MODEL assisted section and/or STYLE if needed — minimal).

### Out of Scope

- Broad questionnaire schema changes
- Production deploy
- #14 CF deploy (`onShowAllocationCreated`) unless blocking (not expected)
- Changing Cloud Function persistence / `answersForFirestore` stripping (orthogonal; empties already stored)
- Full consolidation of duplicate `assistedCreationLabels.ts` into shared (optional nicety; helper may reuse local label fns or move labels — keep change narrow)
- Wizard pre-submit “review” step parity (nice-to-have only if cheap; not required for owner goal of post-submit details)

---

## Affected Areas

### Files / Modules (expected)

| Path | Change |
|------|--------|
| `packages/shared/src/utils/assistedCreationAnswerDisplay.ts` | **Add** — build non-empty answer display rows |
| `packages/shared/src/utils/assistedCreationAnswerDisplay.test.ts` | **Add** — unit tests |
| `apps/studio/.../AssistedCreationRequestsSection.tsx` | Use shared rows; fix ref media silent drop |
| `apps/portal/.../AssistedCreationDetailPanels.tsx` | Use shared rows (keep rating/approval note local) |
| Optionally Portal/Studio `assistedCreationLabels.ts` | Call shared helper or share label helpers if needed for DRY |

### Architecture Impact

- [x] Details: Thin shared pure util under `packages/shared/src/utils/`; UI still owns layout (`dl` / `AnswerRow` / `DetailRow`). No layer violation. Import via `@fresh-prints/shared/utils/assistedCreationAnswerDisplay` (package exports `./*`).

### Security Impact

- [x] None — display-only; no auth, rules, or storage path changes.

### Data Model Impact

- [x] None — no new persisted fields; display contract clarified for existing `AssistedCreationAnswers`.

### Backend Impact

- [x] None — no Functions / rules changes.

### UI / UX Impact

- [x] Details: Studio Request details gains missing rows (Additional subjects, Action, Props, Setting, plus wording notes/bools and reference usage when set). Portal gains the previously omitted wording/reference-usage rows when non-empty. Manual checkpoint required.

### Migration Impact

- [x] None — existing Firestore docs already contain the fields; UI just starts reading them.

---

## Approach

1. **Confirm field inventory** against `AssistedCreationAnswers` and Portal wizard fields.
2. **Add** `buildAssistedCreationAnswerDisplayRows(answers): ReadonlyArray<{ label: string; value: string }>` in shared:
   - Ordered rows matching product sense (request type → wording → exact text → wording notes/bools → subjects → occasion… → composition → reference usage).
   - Strings: include when `trim()` non-empty.
   - Enums: include when present (label via constants options).
   - Arrays: include when length > 0 after labeling (`join` with `, `).
   - **Booleans (non-empty = meaningfully set for staff/customer visibility):**
     - `textLineBreaksExact`: show when `true` (e.g. “Yes — keep line breaks exact”).
     - `textLayoutFlexible`: show when `true` **only if** it is a customer-visible choice that differs from “unchecked”; default in validation is `true`. Prefer: show when `true` with clear label (“Layout may be flexible”) **and** show when `false` as “Keep layout exact” so a deliberate uncheck is not lost. Document in helper JSDoc.
     - Do **not** show `hasReferences` as a bare bool if reference images section already conveys presence; **do** show `referenceUsage` when non-empty.
   - Skip empty strings / empty arrays / false-only booleans that are defaults-with-no-signal where applicable (`textLineBreaksExact === false` → omit).
3. **Unit-test** helper: mixed filled/empty; checkbox true vs false; radio/enum selected; referenceUsage filled; subject extras present.
4. **Wire Studio** Request details: map helper rows through existing `AnswerRow`; keep Brief + Reference images sections.
5. **Wire Portal** Request details: same for answer rows; keep customer rating / approval note as Portal-only extras after shared rows.
6. **Studio refs:** when URL resolve fails, keep a placeholder entry (fileName + unavailable) instead of filtering `null` out of `refMedia`.
7. **Manual checkpoint** after automated tests.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit tests (new helper) | `npx tsx --test packages/shared/src/utils/assistedCreationAnswerDisplay.test.ts` | yes |
| Shared related | `npx tsx --test packages/shared/src/utils/assistedCreationValidation.test.ts` | yes (smoke) |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Studio typecheck | `npm --prefix apps/studio exec tsc -- --noEmit` | yes |
| Lint | `npm run lint` (or scoped if full lint is heavy) | yes if TS/TSX touched |
| Build | Not required for display-only unless typecheck insufficient | no |
| Integration / E2E / rules | N/A | no |

### Manual

- [x] Details: Submit (or open existing) custom request with mix of text, checkbox, radio/enum, and ≥1 reference image → verify Portal details + Studio details show all non-empty values (see human checkpoint).

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (Portal + Studio details parity)
- [ ] Design approval
- [ ] Business logic decision
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [ ] Other:

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| `textLayoutFlexible` default `true` always shows a row even when customer never touched it | Medium | Helper rule: show both true/false with explicit labels so deliberate choice is visible; accept that default-true may appear on older docs — prefer clarity over silence for staff |
| Showing more rows clutters Studio | Low | Empty filter unchanged; only non-empty appear |
| Scope creep into wizard review step / label consolidation | Medium | Explicitly out of scope unless trivial |
| Studio image “missing” was URL failure, not answers | Medium | Placeholder fix in same phase |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert the shared helper + Portal/Studio UI wiring commits. No data migration; display-only rollback is safe.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [x] DATA_MODEL.md — brief note that Overview Request details lists all non-empty `AssistedCreationAnswers` via shared display helper (and reference images separately)
- [ ] BACKEND.md
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [ ] DECISIONS.md
- [ ] Other: workflow plan/review/test/signoff artifacts

---

## Open Questions

- [x] None blocking — boolean display rule documented in Approach; implement with that rule unless review requires change.

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-21-custom-request-details-parity-review.md
- Verdict: approved (original) + addendum approved 2026-07-21

---

## Addendum A — Wizard exact-wording draft persistence (2026-07-21)

**Bug:** On Portal Assisted Creation step “Words on the design”, selecting **Exact wording must appear**, filling exact text + notes/checkboxes, then switching to another wording radio and back clears the **Exact wording** textarea while notes/checkboxes survive.

**Root cause:** `AssistedCreationWizardStepFields` wording radio `onChange` explicitly set `exactText: ''` when leaving `exact_wording`. Nested notes/bools were never cleared.

**In scope (addendum):**
- Stop clearing `exactText` on wording-mode change; preserve draft like other nested fields.
- Keep submit-time strip via `parseAssistedCreationAnswers` (`exactText: ''` when mode ≠ `exact_wording`).
- Gate review-step exact-text snippet to `containsText === 'exact_wording'` so preserved draft does not show under other modes.
- Unit tests: `applyContainsTextSelection` preserve + validation strip-on-submit.
- Extend manual checkpoint: switch away/back on Words step → exact wording still present.

**Out of scope:** Questionnaire schema changes; Studio display (already covered by original goal).

**Files:**
- `apps/portal/.../applyContainsTextSelection.ts` (+ test)
- `apps/portal/.../AssistedCreationWizardStepFields.tsx`
- `packages/shared/.../assistedCreationValidation.test.ts` (strip-on-submit case)

---

## Addendum B — Mood / vibe chip input (2026-07-21)

**Owner request:** Style & mood step — **Mood or vibe (optional)** should behave like Etsy comma-separated search chips/pills (type comma/Enter → removable pills; still optional).

**Current model:** `AssistedCreationAnswers.mood: string` (optional short text, max `ASSISTED_CREATION_FIELD_LIMITS.shortText`). Persistence and display already treat it as a free-text string.

**Reuse:** Portal already has `EtsyMultiValueInput` + `parseEtsyMultiValueInput` / `serializeEtsyMultiValueInput` / `normalizeEtsyMultiValueInput` (Etsy questionnaire subject/style). Reuse that component; do not invent a second chip control.

**In scope (addendum):**
- Replace plain `<input>` for mood with `EtsyMultiValueInput` (comma / Enter commit, Backspace remove last, × remove chip).
- Keep `mood` as **string** in Firestore (no schema change). Draft UI may use trailing `, ` chip encoding; **normalize on submit** via `parseAssistedCreationAnswers` so stored/displayed value is a clean comma-joined list (include in-progress draft token).
- Cap chip count sensibly (e.g. 5) + existing `shortText` length limit.
- Assisted-creation CSS so multi-value input looks correct under Style & mood (dark theme; scoped Etsy input styles currently require `.etsy-questionnaire-field`).
- Extend manual checkpoint: create/remove mood pills; navigate away/back → pills restore; submit → Mood row non-empty on Portal + Studio details.

**Out of scope:** Changing colors fields to chips; extracting multi-value utils to shared (optional later); Studio edit UI for mood; questionnaire schema / array field migration.

**Files:**
- `apps/portal/.../AssistedCreationWizardStepFields.tsx`
- `apps/portal/styles/assisted-creation.css` (input nesting under multi-value)
- `packages/shared/.../assistedCreationValidation.ts` (+ test for mood normalize)
- Optionally `assistedCreation.constants.ts` if adding `ASSISTED_CREATION_MAX_MOOD_ITEMS`
- Manual checkpoint + test report + workflow state

---

## Addendum C — Wizard “Review your answers” parity (2026-07-21)

**Owner question:** Review card missing non-empty values — deploy or code?

**Answer:** **Code fix only.** The review step is client-rendered from wizard draft answers; no Cloud Functions / App Hosting deploy required. Local refresh/restart after the code change is enough.

**Root cause:** `AssistedCreationWizardStepFields` `case 'review'` used a **hardcoded shorter** `<dl>` (Description, type, words, primary subject, occasion/audience combo, personalization, flexibility, exact requirements, styles, colors combo, composition, references). It omitted subject extras, mood, wording notes/checkboxes, reference usage as its own row, etc.

**In scope:** Reuse `buildAssistedCreationAnswerDisplayRows` for the review list (plus Description + reference file count). Gate Exact text in the shared helper to `exact_wording` only (draft preservation). Normalize mood chip encoding for display. Extend manual checkpoint.

**Out of scope:** Firebase deploy for this card.

---

## Inspection Notes (2026-07-21)

**Studio omits vs Portal (high confidence):** `additionalSubjects`, `subjectAction`, `props`, `setting`.

**Both omit when filled:** `textCapitalizationNotes`, `textPunctuationNotes`, `textLineBreaksExact` (when true), `textLayoutFlexible` (meaningful bool), `referenceUsage`.

**Persistence OK:** `functions` + `parseAssistedCreationAnswers`; Studio `mapDoc` keeps full `answers`.
