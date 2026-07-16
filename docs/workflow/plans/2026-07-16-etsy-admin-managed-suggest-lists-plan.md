# Plan: Admin-managed Etsy questionnaire suggestion lists

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Author | Planning Agent |
| Status | approved (review: approved_with_changes) |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-16-etsy-admin-managed-suggest-lists-review.md |
| Target | `fresh-prints-dev` only (no production) |

---

## Goal

Let owner/admin staff **add** (and soft-deactivate) entries to the Portal “Help me find a design” wizard suggestion lists so **Subject** and **Tone/style** autocomplete options **grow over time**, instead of remaining hardcoded static arrays. Free-text entry stays allowed; suggestions remain helpers, not a closed enum.

## Background

Phase 9A Portal wizard currently loads:

1. **Subject** autocomplete from static `ETSY_RECOMMENDATION_SUGGEST_DICTIONARY` (`packages/shared/.../etsyRecommendationSuggestDictionary.ts`) via `matchSuggestDictionary` in `EtsyQuestionnaire.tsx`.
2. **Tone/style** autocomplete from static `ETSY_RECOMMENDATION_STYLE_OPTIONS` in `etsyRecommendation.constants.ts` via local `matchStyleSuggestions`.

Admin app is **Studio** (`apps/studio`). Closest config patterns:

- AI enrichment settings: owner/admin write via **callable** (Admin SDK); staff read Firestore `settings/aiEnrichment` (client write denied).
- Catalog categories/tags: owner/admin **client write** with tight Firestore rules.

Owner request: persist growing lists; admin UI to add; portal loads dynamically. Prefer existing patterns; no ScraperAPI; no full CMS.

**Prior phase note:** `etsy-link-only-rip-scrape` was awaiting owner manual QA when this goal was requested. That QA remains recorded separately; this phase does not reopen scrape work.

---

## Scope

### In Scope

- Firestore collection for admin-added suggestion entries (`kind: subject | style`).
- Cloud Functions callables (Admin SDK): **add** + **soft-deactivate** (owner/admin only).
- Firestore rules: authenticated Portal customers + Studio staff may **read** active (and optionally inactive for admin UI); **client writes denied**.
- Studio Settings section (or compact panel gated by `canManageSettings`): list active entries by kind, add new, deactivate.
- Portal wizard: load admin-added lists (short client cache OK), merge with static seed defaults for autocomplete.
- Case-insensitive dedupe on add (against static seed + existing active admin entries).
- Docs: `DATA_MODEL.md`, `BACKEND.md`, `DECISIONS.md` ADR; workflow state; manual QA for owner.
- Deploy functions + rules to **`fresh-prints-dev` only**.

### Out of Scope

- Production deploy / production rules.
- Re-adding ScraperAPI or listing scrape cards.
- Full CMS (bulk import, reorder UI, rich alias editor beyond minimal fields, versioning UI).
- Editing/deleting static seed dictionary in-repo via admin UI (static remains code baseline).
- Changing subject **parser** greedy matching to require Firestore (see assumptions — optional merge if cheap; not required for “dropdown grows”).
- Helper role write access.
- New npm dependencies.
- Commit unless owner asks.

---

## Assumptions (reasonable defaults)

| # | Assumption |
|---|------------|
| A1 | **Writers** = active `owner` or `admin` (same as `canManageSettings` / AI settings). Helpers read-only if they open Settings. |
| A2 | **Readers** = any signed-in user (Portal customer or Studio staff). Lists are not secret; still not public unauthenticated. |
| A3 | **Static seed stays in code**; Firestore stores **admin additions only**. Effective list = seed ∪ active admin docs. Avoids seeding 150+ subject docs on first read. |
| A4 | Soft-deactivate applies to **admin-added** docs only (`active: false`). Static seeds cannot be removed via UI in this phase. |
| A5 | Subject admin add: required `label` (display) + optional `apiToken` (defaults to normalized label). Optional `aliases` string array (simple comma/chip input OK; empty allowed). |
| A6 | Style admin add: single display string (e.g. `"Whimsical"`); used as both label and match token. |
| A7 | Free-text wizard answers unchanged; validation does not require suggestion membership. |
| A8 | Subject autocomplete merge feeds UI only; **parser** may keep using static phrase index this phase (admin-added subjects still work as free-text / applied tokens). Follow-up can merge dynamic entries into parser if needed. |
| A9 | Client cache TTL ~5 minutes (or session memory) for Portal list fetch is OK. |

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/constants/etsyRecommendation/` — collection constants, types, merge/dedupe helpers, tests
- `functions/src/` — `addEtsyRecommendationSuggestion`, `deactivateEtsyRecommendationSuggestion` (+ validation helpers/tests); export from `index.ts`
- `firestore.rules` — new collection match
- `apps/studio/.../features/settings/` — UI section + service + hook (or small feature folder under settings)
- `apps/portal/features/etsy-recommendations/` — load lists; wire `EtsyQuestionnaire` / hook to merged suggestions
- Docs: `DATA_MODEL.md`, `BACKEND.md`, `DECISIONS.md`

### Architecture Impact

- [x] Details: New persisted config entity; Studio Settings UI; Portal feature service for read. Layers: UI → service → Firestore/callable. No scrape/API expansion.

### Security Impact

- [x] Details: Admin SDK callables for writes; server validates kind, lengths, dedupe; owner/admin gate; client write denied; read requires auth. No secrets.

### Data Model Impact

- [x] Details: New collection `etsyRecommendationSuggestions` (name TBD in implement; document below).

### Backend Impact

- [x] Details: Two callables; rules update; deploy to `fresh-prints-dev`.

### UI / UX Impact

- [x] Details: Studio Settings section; Portal autocomplete sources dynamic merge. Manual QA required.

### Migration Impact

- [x] Forward steps: No backfill required (static seed remains). Empty collection = seed-only UX (non-empty growth path).
- [x] Rollback: Redeploy prior functions/rules; ignore collection; Portal falls back to static-only if fetch fails.

---

## Data model (proposed)

Collection: `etsyRecommendationSuggestions/{suggestionId}`

```ts
type EtsyRecommendationSuggestionKind = "subject" | "style";

interface EtsyRecommendationSuggestion {
  id: string;
  kind: EtsyRecommendationSuggestionKind;
  /** Display label (subject) or style string. */
  label: string;
  /** Subject search token; for style equals label. */
  apiToken: string;
  aliases?: string[];
  /** Soft-delete flag. Missing/true = active for portal merge. */
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // uid
  updatedBy: string;
  /** Lowercase trim of label for dedupe queries. */
  labelKey: string;
}
```

**Indexes:** single-field `kind` + `active` queries are typically fine; composite `kind` + `active` + `labelKey` if needed for admin list/dedupe — add only if query requires.

**Permissions:**

| Action | Who |
|--------|-----|
| Read | Signed-in (`isSignedIn`) |
| Create/update/delete via client | Denied |
| Add / deactivate | Callable → Admin SDK; caller owner/admin |

---

## Approach

1. **Shared**
   - Constants: collection name, max label/token lengths (align with subject 80 / style 60 where sensible), kinds.
   - Pure helpers: `normalizeSuggestionLabelKey`, `mergeSubjectSuggestions(static, admin)`, `mergeStyleSuggestions(static, admin)`, case-insensitive dedupe.
   - Unit tests for merge/dedupe.

2. **Backend**
   - `addEtsyRecommendationSuggestion({ kind, label, apiToken?, aliases? })`:
     - Auth + owner/admin.
     - Validate lengths/format; normalize `labelKey`.
     - Reject if `labelKey` collides with static seed (subject dictionary labels/tokens/aliases or style options) **or** an existing **active** admin doc of same kind.
     - Create doc `active: true`.
   - `deactivateEtsyRecommendationSuggestion({ suggestionId })`:
     - Auth + owner/admin; set `active: false`, `updatedAt`/`updatedBy`.
   - Export callables; unit-test validation helpers.

3. **Firestore rules**
   - `match /etsyRecommendationSuggestions/{id} { allow read: if isSignedIn(); allow write: if false; }`
   - Leave legacy `etsyRecommendationConfig` deny-all unchanged (unused kill switch).

4. **Studio admin UI**
   - Settings page section “Etsy wizard suggestions” (visible when `canManageSettings`).
   - Tabs or two lists: Subject / Tone.
   - Show active admin-added entries; input + Add; Deactivate per row.
   - Optionally show static seed count as read-only note (“Built-in defaults still apply”).
   - Service: Firestore query for admin list; callables for mutations.

5. **Portal**
   - Service: query `kind` + `active == true` (or fetch both kinds once); cache ~5 min in module memory.
   - On fetch failure: fall back to static-only (wizard must not break).
   - `EtsyQuestionnaire`: subject match uses merged dictionary entries; style match uses merged string list.
   - Prefer extending `matchSuggestDictionary` to accept an optional extra entries array rather than forking match logic.

6. **Docs + deploy**
   - Update DATA_MODEL / BACKEND / DECISIONS (ADR).
   - Deploy functions + firestore rules to `fresh-prints-dev`.
   - Manual QA checkpoint for owner.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Shared unit tests (merge/dedupe) | `npm`/`pnpm` test scoped to new/shared etsy suggestion tests | yes |
| Functions validation unit tests | functions test for add/deactivate validation | yes |
| Portal typecheck | portal typecheck script | yes |
| Studio typecheck (touched) | studio typecheck if available | yes if practical |
| Lint | project lint if configured for touched packages | yes if script exists |
| Full build | optional | no |
| Rules emulator suite | if project has rules tests for similar collections | preferred; else document gap |

### Manual

- [ ] Studio (owner/admin): add subject → appears in list; add duplicate (different case) → rejected.
- [ ] Studio: add tone → appears; deactivate → disappears from active list.
- [ ] Portal: hard-refresh Custom Designs wizard → new subject/tone appear in autocomplete; free-text still works.
- [ ] Non-admin / helper: cannot add (callable denied); customer cannot write.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (owner retest after deploy)
- [ ] Design approval — not required (match Settings patterns)
- [ ] Business logic decision — assumptions A1–A9; revise only if owner objects
- [ ] Production deploy — **out of scope**
- [ ] Database migration — none destructive
- [ ] Auth / external service setup — none
- [ ] Secrets / env vars — none
- [x] Deploy to `fresh-prints-dev` functions/rules after tests

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Empty UX if someone removes static seed later | Low | Keep static in code; document A3 |
| Dedupe miss vs aliases | Medium | Check label, apiToken, aliases (static + active admin) case-insensitively |
| Portal offline / rules misdeploy | Medium | Static fallback on read failure |
| Scope creep into CMS | Medium | Explicit out-of-scope; review gate |
| Parser ignores admin subjects | Low | Accepted A8; free-text still works; follow-up if needed |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

1. Redeploy previous functions build and prior `firestore.rules` to `fresh-prints-dev`.
2. Portal/Studio: revert feature commits or leave UI unused; collection may remain inert.
3. No production impact (never deployed).

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [x] DATA_MODEL.md
- [x] BACKEND.md
- [ ] TESTING.md — only if new commands added
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [x] DECISIONS.md — ADR for admin-managed suggest overlay
- [x] Other: workflow plan/review/test/manual-qa/signoff

### FreshForge impact classification

| Area | Impact |
|------|--------|
| Starter Surface | No (project app/docs only) |
| Development Tooling | No |
| Distribution/Installer | No |
| Documentation | Yes — project docs |
| Development History | No |

---

## Open Questions

- [x] None blocking — assumptions A1–A9 cover product defaults. Owner may override during review/QA (e.g. require parser merge).

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-16-etsy-admin-managed-suggest-lists-review.md
- Verdict: pending
