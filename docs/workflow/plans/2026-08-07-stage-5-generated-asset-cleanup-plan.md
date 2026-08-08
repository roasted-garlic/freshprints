# Plan: Stage 5 — Generated-asset cleanup (Storage + Rules + orphan state)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Author | Planning Agent |
| Status | approved_with_changes (Formal Review); source Implement complete; live gates pending |
| Workflow | managed-phase |
| Managed goal | `post-launch-catalog-and-processing-stability` |
| Related | Amendment 8 Phase 1B revalidation §16 Stage 5; Stage 4 plan Out of Scope; Stage 4 Signoff `docs/workflow/reviews/2026-08-07-stage-4-publisher-retirement-signoff.md` |
| Owner authorization | **`APPROVE STAGE 5 PLANNING`** (2026-08-07) — planning + Formal Review only; Implement / dry-run / live delete / Rules deploy remain separately gated |

---

## Goal

Remove residual **generated Portal catalog Storage objects**, orphan **`snapshotPublicationState`** coordination docs, and the **Storage/Firestore Rules** that existed only to serve the retired publisher stack — so `fresh-prints-dev` no longer retains dead public-readable snapshot surfaces after Stage 4 publisher retirement.

**Does not** revive publishers. **Does not** touch design artwork or customer uploads. **Does not** promote production / merge PR #40 (Stage 6).

---

## Background

- Stage 4 complete on **`fresh-prints-dev`**: six publisher Functions deleted live + source un-exported/deleted; Portal generated search/facet fallback removed; Algolia sync/reconcile retained. Signoff **approved_with_notes**.
- Publishers no longer write `generated/portal-catalog/**` or `generated/catalog-reference/**`, but **objects may still exist** in the bucket (`[NEEDS REPO CHECK]` at dry-run).
- Storage Rules still publicly read:
  - `generated/portal-catalog/{allPaths=**}`
  - `generated/catalog-reference/manifest.json`
  - `generated/catalog-reference/client/{fileName}`
  - AI path denied: `generated/catalog-reference/ai/{fileName}`
- Firestore Rules still reserve `snapshotPublicationState/{snapshotId}` as server-only (`allow read, write: if false`).
- AI taxonomy is **Strategy 2 Firestore-only** (`loadAiCatalogReferenceSnapshot` → `categories` / `tags`). No tags-only Storage package; **default: retain nothing** under `generated/catalog-reference/**`.
- Shared `packages/shared/src/catalog-snapshots/*` types remain imported by AI FS loader + Algolia classifier — **keep package** this Stage (do not delete solely for cleanliness).

---

## Prerequisites (must be true before live Storage delete)

1. Stage 4 Signoff complete on `fresh-prints-dev` — **done**.
2. Portal + AI do **not** fetch generated catalog Storage at runtime — **done** (stubs / FS Strategy 2).
3. Publisher Functions **absent** on `fresh-prints-dev` — **done** (delete record).
4. Stage 4 source remains retired (no `catalogSnapshots` exports in `functions/src/index.ts`; classifier lives under `functions/src/algolia/`). Uncommitted Stage 4 deletes must not be reverted.
5. **Dry-run inventory PASS** with owner-reviewed allowlist of prefixes/object counts — before any delete.
6. Explicit owner phrases for Implement, dry-run, live delete, and Rules deploy (see Human Checkpoints). Planning approval alone does **not** authorize deletion or deploy.

---

## Scope

### In Scope

1. **Dry-run inventory (dev)**
   - List metadata under exact prefixes only:
     - `generated/portal-catalog/`
     - `generated/catalog-reference/`
   - Prefer extending / scripting around existing dry-run-only patterns (`inventoryCatalogImageStorage` already reports generated prefixes separately — **never deletes**). Stage 5 may add a **narrow, dry-run-first** admin/ops path or documented `gsutil`/`firebase` listing procedure — **no silent delete mode** without a second owner phrase.
   - Record object counts / sample paths in a workflow review artifact before delete approval.
   - Confirm **zero** overlap with `originals/`, `thumbnails/`, `previews/`, `display/`, `customer-uploads/`.

2. **Live Storage delete (dev only, after dry-run PASS + owner phrase)**
   - Delete **only** objects under:
     - `generated/portal-catalog/**`
     - `generated/catalog-reference/**` (including `ai/**`, `client/**`, `manifest.json`)
   - **Forbidden:** any other Storage root (design artwork, customer uploads, OG assets, etc.).

3. **Orphan Firestore cleanup (dev)**
   - Delete docs under `snapshotPublicationState/**` (publisher coordination; writers gone).
   - Bounded, allowlisted collection only; no other collections.

4. **Rules narrowing (source + deploy gated)**
   - Remove or deny-all the generated catalog Storage matches in `storage.rules` (lines ~228–247 today).
   - Remove `snapshotPublicationState` match from `firestore.rules` (or keep deny-all only if a short rollback window explicitly requires a reserved path — **default: remove** after delete).
   - Update `tests/firebase/catalogSnapshot.rules.test.ts` (dispose / rewrite for absent paths).
   - Deploy Rules to **`fresh-prints-dev` only** after owner phrase (separate from Storage delete if needed).

5. **Code / docs hygiene (narrow)**
   - Update inventory comments / docs that imply generated assets are live readers.
   - Keep `GENERATED_ASSET_PREFIXES` in inventory for historical orphan detection **or** document removal after cleanup — either is acceptable if inventory remains dry-run-only.
   - **Do not** delete `packages/shared/src/catalog-snapshots/*` while AI / Algolia still import types.
   - Optional: remove dead Portal stub files (`portalCatalogAssetService`, always-false flag) **only if** containment tests still prove no runtime use — prefer keep stubs until Stage 6 / follow-up to avoid churn; **default: keep stubs**, document as Stage 5 optional.

6. **Docs**
   - `BACKEND.md`, `DECISIONS.md` (short ADR or Stage 5 note: generated Storage retired), `DATA_MODEL` if `snapshotPublicationState` documented, workflow/handoff, ROADMAP note.

### Out of Scope

- **Stage 6 / production:** prod Storage delete, prod Rules, prod Function delete, PR #40 merge, production deploy.
- Rebuilding tags-only AI Storage (Strategy 1) — **not accepted**; Strategy 2 KEEP.
- Deleting shared catalog-snapshots **types** used by AI/Algolia.
- Redeploying or deleting Algolia Functions.
- TD-030.
- Broad Functions redeploy unrelated to Rules.
- Committing secrets; any production console action.

---

## Affected Areas

### Files / Modules (expected)

| Area | Paths |
|------|--------|
| Storage Rules | `storage.rules` |
| Firestore Rules | `firestore.rules` |
| Rules tests | `tests/firebase/catalogSnapshot.rules.test.ts` (+ related firebase rules test harness if needed) |
| Inventory (optional touch) | `functions/src/inventoryCatalogImageStorage.ts`, `packages/shared/src/utils/catalogImageStorageInventory.ts` |
| Docs | `docs/architecture/BACKEND.md`, `docs/project/DECISIONS.md`, `docs/architecture/DATA_MODEL.md` (if entity listed), handoff |
| Ops artifact | `docs/workflow/reviews/2026-08-07-stage-5-*-dry-run-*.md`, delete record |

### Architecture Impact
- [x] Details: Removes dead generated-asset delivery surface; Portal/AI remain Algolia + Firestore. No new runtime readers.

### Security Impact
- [x] Details: **Narrows** exposure — removes public-read Storage paths for obsolete snapshots. Must **not** widen any other Rules. Deletes are allowlist-prefix only.

### Data Model Impact
- [x] Details: Retire `snapshotPublicationState` coordination collection (orphan docs). No design/tag/category schema change.

### Backend Impact
- [x] Details: No publisher Functions. Optional dry-run listing helper. Rules deploy to `fresh-prints-dev` only.

### UI / UX Impact
- [x] None expected if Stage 4 holds (no generated fetches). Manual smoke confirms Algolia ON/OFF + browse.

### Migration Impact
- [x] Forward: dry-run → delete Storage prefixes → delete orphan FS docs → narrow Rules → tests/docs.
- [x] Rollback: Rules can be restored from git; **Storage objects are not automatically restored** unless owner has backup — prefer not needing objects (FS/Algolia primary). Do not re-enable publishers without a new Stage.

---

## Approach

### Phase A — Source + Rules prep (after `APPROVE STAGE 5 IMPLEMENT`)

1. Confirm prerequisites (publisher absence, no generated Portal fetches).
2. **Stage 4 residue check (Formal Review required change):** `index.ts` has no publisher exports; `functions/src/catalogSnapshots/` absent on disk; classifier only under `functions/src/algolia/`; do not restore deleted publisher sources.
3. Draft Rules removals + update Rules unit tests (fail closed / assert paths gone or deny).
4. Prepare dry-run procedure/script (list-only) with hard-coded allowlisted prefixes.
5. Prepare delete procedure as **ops script / documented commands** pinned to `fresh-prints-dev` (Formal Review: prefer **non-callable**; callable delete needs re-review). Delete tooling must **refuse** any path not under the two allowlisted prefixes.
6. Docs ADR draft (can land with Implement).
7. **STOP** before any live Storage/Firestore delete or Rules deploy.

### Phase B — Dry-run (after `APPROVE DEV STORAGE DRY-RUN: STAGE 5`)

1. Run list-only inventory on `fresh-prints-dev` for the two prefixes.
2. Write dry-run record (counts, samples) including **negative checklist**: `originals/`, `thumbnails/`, `previews/`, `customer-uploads/` were **not** targeted for deletion.
3. Owner reviews: `STAGE 5 DRY-RUN: PASS` or fail notes.
4. **STOP** — no delete yet.

### Phase C — Live delete (after `APPROVE DEV STORAGE DELETE: STAGE 5`)

1. Delete Storage objects under allowlisted prefixes only.
2. Delete `snapshotPublicationState` docs (bounded).
3. Write delete record.
4. Spot-check: prefixes empty (or only expected leftovers documented).

### Phase D — Rules deploy (after `APPROVE DEV RULES DEPLOY: STAGE 5`)

1. Deploy narrowed `storage.rules` + `firestore.rules` to `fresh-prints-dev`.
2. Re-run Rules tests; owner smoke (Algolia ON/OFF, browse, no need for generated URLs).

### Phase E — Signoff

1. Test report + Signoff on `fresh-prints-dev`.
2. Explicit note: Stage 6 / prod / PR #40 **not** authorized.

---

## Allowlist — Storage prefixes to delete

| Prefix | Action |
|--------|--------|
| `generated/portal-catalog/` | DELETE all objects under prefix |
| `generated/catalog-reference/` | DELETE all objects under prefix (ai, client, manifest) |

### Must never delete (non-exhaustive)

| Prefix / root | Why |
|---------------|-----|
| `originals/`, `thumbnails/`, `previews/`, `display/` | Design artwork |
| `customer-uploads/` | Customer upload binaries |
| Any path outside the two generated prefixes | Out of scope |

### Firestore allowlist

| Collection | Action |
|------------|--------|
| `snapshotPublicationState` | DELETE orphan docs only |

---

## Decision locks (this Stage)

| ID | Decision | Locked value |
|----|----------|--------------|
| D2 | AI taxonomy | **Strategy 2 Firestore** — delete catalog-reference Storage; **no** tags-only retain |
| Env | Target | **`fresh-prints-dev` only** |
| Shared package | `catalog-snapshots` types | **KEEP** (AI + classifier imports) |
| Portal stubs | `portalCatalogAssetService` / flags | **KEEP by default** (optional removal only if zero churn risk) |

---

## Test Strategy

### Automated

| Check | Command / target | Required |
|-------|------------------|----------|
| Rules unit tests | Project firebase rules test for catalogSnapshot / storage / firestore rules | yes (after Rules edit) |
| Typecheck | Portal + Functions if code touched | yes if code touched |
| Lint | Touched files | yes if code touched |
| Unit | Inventory helpers if changed; containment still green | yes if touched |
| Build | Not required for Rules-only unless portal touched | no by default |
| Diff check | `git diff --check` | yes |

### Manual

- [ ] Dry-run record reviewed by owner (`STAGE 5 DRY-RUN: PASS`)
- [ ] Post-delete: prefixes empty / documented; artwork + uploads intact (spot-check)
- [ ] Algolia ON smoke: search / facets / browse
- [ ] Algolia OFF: browse healthy; search fail-closed; **no** Network to `generated/portal-catalog`
- [ ] No publisher Function resurrection (`firebase functions:list` spot-check)

---

## Human Checkpoints Anticipated

| Phrase / gate | Authorizes |
|---------------|------------|
| `APPROVE STAGE 5 PLANNING` | Plan + Formal Review only — **obtained 2026-08-07** |
| `APPROVE STAGE 5 IMPLEMENT` | Source Rules edits, tests, dry-run tooling, docs — **not** live delete/deploy |
| `APPROVE DEV STORAGE DRY-RUN: STAGE 5` | List-only inventory on `fresh-prints-dev` |
| `APPROVE DEV STORAGE DELETE: STAGE 5` | Live delete of allowlisted Storage + `snapshotPublicationState` |
| `APPROVE DEV RULES DEPLOY: STAGE 5` | Deploy narrowed Rules to `fresh-prints-dev` |
| Owner QA phrases | `STAGE 5 DRY-RUN: PASS`, `STAGE 5 POST-DELETE QA: PASS` (or FAIL notes) |

**Never authorized by this plan:** production Storage/Rules, Stage 6, PR #40 merge.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Accidental delete outside allowlist | **Critical** | Hard-coded prefixes; dry-run record; separate delete phrase; no recursive project-wide delete |
| Need generated objects after delete | Medium | Objects obsolete post-Stage 4; rollback = Rules git restore + Algolia/FS; do not depend on regenerating snapshots |
| Public Rules still serve deleted paths | Low | Deploy Rules after delete (or deny-all first) so clients stop expecting assets |
| Shared package deleted too early | Medium | Explicit KEEP while AI/classifier import types |
| Uncommitted Stage 4 deletes reverted | High | Prerequisite check; do not restore `catalogSnapshots/` |
| Live bucket larger than expected | Low | Dry-run documents counts; paginate listing |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

1. **Before delete:** stop; no object loss.
2. **After Storage delete:** cannot undelete without backup — accept if Algolia + FS healthy (Stage 4 contract).
3. **Rules:** redeploy previous `storage.rules` / `firestore.rules` from git.
4. **Do not** re-add publisher Functions without a new managed Stage.
5. Never leave Portal requiring generated Storage for search (Stage 4 already removed fallback).

---

## Documentation Updates Required

- [x] BACKEND.md — generated Storage retired on dev; Rules narrowed
- [x] DECISIONS.md — Stage 5 ADR / note
- [ ] DATA_MODEL.md — if `snapshotPublicationState` documented, mark retired
- [x] Workflow reviews: dry-run record, delete record, test report, signoff
- [x] Handoff / CURRENT-STATE / workflow state
- [ ] ROADMAP — Stage 5 done note when signed off

---

## Open Questions

- [x] None blocking planning — Strategy 2 locked; dry-run will resolve live object inventory (`[NEEDS REPO CHECK]`).
- Optional Implement choice: keep vs remove Portal stubs (default **keep**).

---

## FreshForge Impact Classification

| Area | Impact |
|------|--------|
| Starter Surface | None (project app Rules/docs only) |
| Development Tooling | None expected |
| Distribution/Installer | None |
| Documentation | Project docs + workflow artifacts |
| Development History | None |

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-07-stage-5-generated-asset-cleanup-plan-review.md`
- Verdict: **approved_with_changes** (2026-08-07) — required changes folded into Approach above
- Implement: blocked until `APPROVE STAGE 5 IMPLEMENT`
