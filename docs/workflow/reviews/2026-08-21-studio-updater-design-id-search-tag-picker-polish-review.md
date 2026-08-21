# Review: Studio Updater, Design ID Search, and Tag Picker Polish

| Field | Value |
|-------|-------|
| Date | 2026-08-21 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-08-21-studio-updater-design-id-search-tag-picker-polish-plan.md |
| Verdict | **approved** |

---

## Summary

Repo inspection matches the Plan. The updater is mounted inside `.sidebar` (`isolation: isolate` + overflow clip), which traps stacking and squeezes the dialog; the existing `createPortal(document.body)` pattern is the correct fix, not z-index inside the sidebar. Design Library already substring-matches `design.id` on loaded rows; ready-catalog Algolia does not search `objectID`, so a bounded `getDesignsByIds` merge is the smallest complete-ID path. Tag chips stay open because `selectSuggestion` never closes the list; Category `Select` already calls `closeMenu()`. Scope stays Studio-only. Stop until the owner implement phrase.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Three Studio UX fixes. No Portal/Functions/Rules/indexes/schema/version bump. |
| Architecture alignment | pass | Portal overlay; reuse `designService.getDesignsByIds`; no new ModalHost required. |
| Security impact addressed | pass | Same updater permission; ID lookup uses existing `canViewDesigns`. |
| Data model impact addressed | pass | None. |
| Backend impact addressed | pass | No Firebase surface changes; no Algolia `setSettings`. |
| Test strategy adequate | pass | Contract + helper tests; Studio tsc/lint/Vite; Show Queue manual overlay. |
| Human checkpoints identified | pass | Manual UI; implement gated on owner phrase; version/publish later. |
| Roadmap alignment | pass | Polish on existing Studio surfaces. Phase 9 PARKED. PR #84 promotion paused, not reopened. |
| Documentation plan | pass | Workflow artifacts; no silent DEPLOYMENT rewrite. |
| No silent scope expansion | pass | Updater-only CSS class; TagChipInput close only in suggestion mode; Tag Management untouched. |

---

## Architecture Review

**Findings:**

- `Modal.tsx` is a panel, not a host. Plan correctly refuses a new global modal system.
- `createPortal` to `document.body` matches `Select` / `DangerOverflowMenu`.
- Exact-ID helper plus existing one-doc hydrate preserves bounded reads (`studioAlgoliaCatalogSearch.containment.test.ts` already forbids `loadAll` / `getDocs` in `getDesignsByIds`).
- Tag close in shared `TagChipInput` is limited to `approvedTags` suggestion mode. Freeform consumers have no list. AI Review tags getting the same close is acceptable, not a STOP.

**Required changes:**

- [x] None

---

## Security Review

**Findings:**

- Sidebar contract already pins `canAccessDesktopApp` and no new permission. Keep that test.
- `getDesignById` remains permission-gated. Do not bypass Firestore for Algolia-only ID hits.
- Do not log full IDs in new telemetry.

**Required changes:**

- [x] None

**Human approval needed before production:**

- [x] None for this DEV goal. Later Studio release / production promotion remain separate.

---

## Data Model Review

**Findings:**

- No entity/field/status changes. Archived vs ready visibility must use current library rules after ID hydrate.

**Required changes:**

- [x] None

---

## Backend Review

**Findings:**

- Algolia searchable attributes stay unchanged (Portal-shared index). Firestore one-doc read is the ID path.
- No Functions, Rules, indexes, App Hosting, secrets.

**Required changes:**

- [x] None

---

## Testing Review

**Findings:**

- Plan covers the three seams plus containment. Manual Show Queue overlay is required; packaged updater smoke stays on the later release workflow.
- Implement must not claim Vite/lint/tsc passed without running them.

**Required changes:**

- [x] None

---

## Documentation Review

**Findings:**

- Plan paths are repo-verified. Signoff should update CURRENT-STATE; no ADR required unless implementation invents a new modal host (Plan says it will not).

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Root causes are identified in source. Fixes are the smallest existing-pattern changes. Shared tag picker consumers are enumerated and safe. Implement is blocked only on the owner phrase, not on plan gaps.

---

## Next Step

STOP. Await:

```text
APPROVE IMPLEMENT: studio-updater-design-id-search-tag-picker-polish
```

Do not implement, bump Studio version, or open a production PR.
