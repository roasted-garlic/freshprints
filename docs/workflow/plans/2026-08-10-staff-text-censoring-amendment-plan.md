# Plan Amendment: Staff-controlled text censoring (`censoredTerms`)

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase **amendment** (before prod promote) |
| Related | `prelaunch-companion-designs-and-censored-content` + Featured Tags; promote checkpoint deferred until this DEV QA |
| Review | `docs/workflow/reviews/2026-08-10-staff-text-censoring-amendment-review.md` |

---

## Goal

Staff can list exact words/phrases on an Explicit Content design (`censoredTerms`) that Portal masks in **title** and **description** while the customer is in **Censored** mode — without mutating stored text, without Algolia changes, and without changing image-censor UX.

## Background

Image censoring + Censored/Uncensored preference are DEV-signed-off. Titles/descriptions still show raw explicit language while artwork is blurred. Owner wants staff-controlled display masking before production promotion.

## Scope

### In Scope

1. Optional `censoredTerms?: string[]` on designs (Studio + Portal catalog types; Firestore)
2. Studio AI Review + Design Library Edit: chip input when Explicit Content is on; persist terms; keep terms if Explicit later turned off (inactive only)
3. Shared masking helper (canonical); Portal wires all title/description display surfaces through it
4. Rules: allow optional list on full validator + `catalogMetadataOnlyUpdate`
5. Tests listed by owner; DEV Rules deploy if changed
6. Stop for owner DEV QA; no prod

### Out of Scope

- Production / App Hosting prod / Studio prod package / Algolia / myprintrequest.com
- Backfill; mutating stored title/description
- Changing image blur / reveal / toggle behavior
- Masking OG/meta server strings (display UI only unless already client-rendered)
- Search corpus changes

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/utils/maskCensoredDesignText.ts` (+ test)
- Studio: design types/form/mapper/service; `DesignFormFields`; AI Review draft/panel/state/service
- Portal: `catalog.types`; catalogService map; display helper hook/util; catalog cards/details/share/companions/gallery (+ request titles if they show live design title)
- `firestore.rules`
- `docs/architecture/DATA_MODEL.md`; promote checkpoint note

### Architecture Impact

- [x] Details: Presentation-only masking in Portal UI layer via one shared util; services keep raw title/description.

### Security Impact

- [x] Details: Staff-only write of `censoredTerms`; not a security boundary (same as image censor). Validate list size/type in Rules + client.

### Data Model Impact

- [x] Details: `designs.censoredTerms?: string[]` — missing/empty = no masking; effective only with `isExplicitContent === true` in Portal.

### Backend Impact

- [x] Details: Rules only on DEV. **No Functions. No Algolia.**

### UI / UX Impact

- [x] Details: Studio chip field; Portal masked title/description in Censored mode. Manual QA.

### Migration Impact

- [x] None / no backfill. Rollback: hide UI; field may remain.

---

## Approach

1. Add shared `maskCensoredDesignText` + `resolvePortalCensoredDisplayText` (gate: explicit + !showExplicit + terms).
2. Masking: case-insensitive; whole-word/phrase boundaries; escape regex; longest-term-first; within each match replace `[A-Za-z0-9]` with `*`, preserve spaces/punctuation.
3. Studio persist via existing update/approve paths; `TagChipInput` without `approvedTags`; show field when Explicit on.
4. Portal map `censoredTerms`; one helper used at render sites; do not mask search inputs.
5. Rules: optional string list (size-capped) in `designRequiredFieldsValid` + `catalogMetadataOnlyUpdate` hasOnly.
6. Tests + DEV rules deploy; owner QA checklist; update promote checkpoint to wait for this QA.

## Why Algolia is NOT required

Search continues on real title/description. Masking is display-only after Firestore hydrate. Confirmed by repo: UI does not render Algolia hit titles for catalog cards.

---

## Test Strategy

### Automated

| Check | Required |
|-------|----------|
| Shared mask unit tests (owner cases 1–8, 11–12) | yes |
| Portal preference gating tests (9–10) | yes |
| Studio form/AI persist wiring (13–14 source or unit) | yes |
| Existing `portalPrelaunchCensorUx` regressions | yes |
| Portal + Studio typecheck | yes |
| Rules if changed | yes |

### Manual (owner)

Studio set terms on AI Review + Edit Design; Portal Censored vs Uncensored title/description; image censor unchanged; non-explicit / empty terms unchanged.

---

## Human Checkpoints

- Owner DEV QA: `DEV TEXT CENSOR QA: PASS` / `FAIL` / `PASS WITH NOTES`
- Prod promote remains blocked until this QA + existing approve phrase

## Risks

| Risk | Mitigation |
|------|------------|
| Substring false positives | Whole-word/phrase boundaries + tests (`ass` vs `class`) |
| Expression budget on design update | Add field to existing `catalogMetadataOnlyUpdate` |
| Missed Portal surface | Grep title/description render sites; central helper |

## Rollback

Hide Studio field + Portal helper no-ops; Rules can keep optional field.
