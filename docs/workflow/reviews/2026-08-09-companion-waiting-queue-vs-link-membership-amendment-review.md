# Review: Companion waiting-queue vs link membership (Plan Amendment)

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-09-companion-waiting-queue-vs-link-membership-amendment-plan.md` |
| Parent | `docs/workflow/plans/2026-08-09-prelaunch-companion-designs-and-censored-content-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

Amendment correctly supersedes singleton-set-on-expect with an independent staff queue flag and link-only membership. Scope is appropriately narrow (Studio service/UX + DEV heal; Portal/Explicit unchanged). Architecture (Option A + service-owned denorm) remains sound. Proceed to Implement → Test on `fresh-prints-dev` only after applying the required changes below.

**STOP for production:** no prod / Algolia / App Hosting / Studio package / domain work.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Corrective only; Explicit out |
| Architecture alignment | pass | Service owns set + denorm; UI thin |
| Security impact addressed | pass | Staff-only sets; Portal never reads queue |
| Data model impact addressed | pass | Semantics change; field names kept |
| Backend Impact addressed | pass | No Functions expected |
| Test strategy adequate | pass | Owner list mapped; service tests required |
| Human checkpoints identified | pass | Owner DEV re-QA |
| Roadmap alignment | pass | Pre-cutover hardening |
| Documentation plan | pass | DATA_MODEL + ADR note |
| No silent scope expansion | pass | Case E merge deferred |

---

## Architecture Review

**Findings:**
- Separating queue (`companionSetIncomplete`) from membership (`companionSetId`) is the right smallest model change.
- Link Cases A–D match owner clarification; Case E hard-error matches “no silent merge.”
- Reuse existing Design Library search/thumb/lightbox — do not invent a second lightbox.

**Required changes:**
- [x] Implementers must **delete or fully retire** `ensureExpectsCompanions` from the approve path and from “Expect companions” UI — no leftover call sites that create singletons.
- [x] Prefer a dedicated `unlinkMember(caller, memberDesignId)` (or equivalent) callable from **any** member card, not only “this design.”
- [x] One-member dissolution is **mandatory** when remaining &lt; 2 after unlink (not only when empty).

---

## Security Review

**Findings:**
- No customer exposure of queue state if Portal continues to ignore `companionSetIncomplete`.
- Link picker must use staff Design Library data paths only.

**Required changes:**
- [ ] None beyond verify Portal mapper still does not surface incomplete.

**Human approval needed before production:**
- [x] Any future prod Rules/Studio promotion (not this phase)

---

## Data Model Review

**Findings:**
- Keeping `companionSetIncomplete` name with new semantics is acceptable for this corrective; document clearly in `DATA_MODEL.md`.
- Persisted sets should only exist for **real multi-member relationships** (N≥2) after this amendment; Rules may still allow N≥1 for transitional writes inside a transaction — implementers should create sets only with ≥2 members in Case A, and dissolve when &lt;2.

**Required changes:**
- [x] Update `DATA_MODEL.md` Companion section in the same implement pass.
- [x] Add/adjust ADR note in `DECISIONS.md` (supersede singleton-on-expect).
- [x] Heal DEV singleton incomplete sets (on-encounter in service and/or documented one-shot).

---

## Backend Review

**Findings:**
- No Cloud Functions / Algolia work expected.
- Rules/indexes likely unchanged; redeploy Rules to DEV only if files change.

**Required changes:**
- [ ] None

---

## Test Review

**Findings:**
- Parent plan lacked `companionSetService` unit tests; this amendment **requires** them for A–E, dissolve, queue-without-set, complete/needs toggles.
- Rules expression-budget suite must remain green.

**Required changes:**
- [x] Add `companionSetService` (or focused transaction-logic) tests covering owner items 1–4, 7–8, 11 and dissolution.
- [x] Picker exclusion/sort tests (or pure helper tests) for item 9.
- [x] Structural/wiring assertion that companion management mounts under expanded details (item 10) — acceptable as component test or explicit DOM hierarchy test.

---

## Documentation Review

**Required changes:**
- [x] Parent plan header or footnote: superseded-by this amendment for expect→singleton.
- [x] Update owner QA checklist for new sequences (approve Expects without set; picker link; per-card unlink).

---

## Required Changes for Implement (binding)

1. Retire singleton creation (`ensureExpectsCompanions`) completely from product paths.
2. Dissolve sets when members drop below 2; preserve queue flag from `!complete`.
3. Case E: hard error, no merge UI.
4. AI Review Expects ON → queue flag only; approve still reaches ready.
5. Companion UI under “View more details”; compact NEEDS COMPANION badge OK.
6. Searchable Link picker; no primary design-ID paste field.
7. Per-member unlink + confirm; remove standalone unlink button.
8. Member cards: thumb → existing lightbox; truncate titles; no raw ids in normal UI.
9. Docs + DEV heal + tests per plan; deploy DEV only if Rules/indexes change.
10. Explicit Content untouched except regressions.

---

## Verdict

**approved_with_changes** — Implementer may proceed immediately applying the binding changes above (owner product clarification already authorizes this corrective; no second owner plan-approval gate required before DEV implement).

After Implement + Test: STOP for owner DEV re-QA. Do not promote to production.
