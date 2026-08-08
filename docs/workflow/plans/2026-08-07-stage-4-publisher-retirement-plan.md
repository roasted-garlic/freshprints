# Plan: Stage 4 — Live publisher retirement (portal-catalog + catalog-reference)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Author | Planning Agent |
| Status | signed_off (approved_with_notes) on fresh-prints-dev |
| Workflow | managed-phase |
| Managed goal | `post-launch-catalog-and-processing-stability` |
| Related | Stage 1b-C Signoff `docs/workflow/reviews/2026-08-07-stage-1b-c-algolia-owner-qa-signoff.md`; Amendment 8 Phase 1B revalidation plan §16 Stage 4; Stage 1b plan Stage 4 gate |
| Owner authorization | **`APPROVE STAGE 4 PLANNING`** (2026-08-07) — planning only; Implement + live Function delete remain separately gated |

---

## Goal

Retire the **generated Portal catalog snapshot publishers** (portal-catalog + catalog-reference) and remove Portal’s remaining **generated-asset fallback**, so search/facets are Algolia-only (when configured) and ordinary browse stays Firestore — eliminating ~1.1K C+T+R full publications on design writes.

**Does not** delete Storage objects (Stage 5). **Does not** promote production / merge PR #40 (Stage 6).

---

## Background

- Stage 1b D1 = **Algolia**; Stage 1b-C owner QA **approved_with_notes**.
- Publishers are still live on `fresh-prints-dev` and still drive Console pub spikes (see spike attribution).
- Portal still falls back to `portalCatalogAssetService` when Algolia is off (`generatedPortalCatalogEnabled`).
- Amendment 9 **P4** rate guard is a transition aid and becomes unnecessary when portal-catalog publishers are gone.
- Prior plan law: Stage 4 = separate human checkpoint after Stage 1b QA; rollback after Stage 4 is **redeploy Functions revision**, not “flip snapshots back on.”

---

## Prerequisites (must be true before live Function delete)

1. Stage 1b-C Signoff complete — **done**.
2. Algolia sync + reconcile healthy on `fresh-prints-dev` — **done** (prior deploy + QA).
3. Portal code no longer **requires** generated assets for search/multi-tag/facets — **Implement in this Stage** (remove fallback).
4. `classifyPortalCatalogDesignChange` relocated out of `catalogSnapshots/` before deleting that folder — Algolia sync imports it today.
5. Read-only live Function inventory on `fresh-prints-dev` matches allowlist — **`[NEEDS REPO CHECK]`** at Implement start.
6. Explicit owner phrase before **deploy/delete** of publisher Functions (see Human Checkpoints). Planning approval alone does **not** authorize live delete.

---

## Scope

### In Scope

1. **Portal cutover cleanup**
   - Remove generated search/facet fallback paths (`portalCatalogAssetService` call sites in `useCatalogDesigns` / `catalogService` tag facets).
   - Kill or default-off `generatedPortalCatalogEnabled` / `NEXT_PUBLIC_USE_GENERATED_CATALOG_SNAPSHOTS` for ordinary Portal catalog flows.
   - When Algolia is off/unconfigured: Firestore browse continues; search/multi-tag/facets show unavailable (same kill-switch contract already QA’d) — **no** generated Storage fetch.
   - Update containment / Stage 1b tests accordingly.

2. **Algolia dependency unblock**
   - Move `portalCatalogChangeClassifier` (and its tests) to a non-retired module (e.g. `functions/src/algolia/` or `functions/src/lib/`) so Algolia sync keeps classify behavior after publisher folder deletion.

3. **Publisher source retirement**
   - Un-export and delete source for allowlisted Functions (see Allowlist).
   - Delete `functions/src/catalogSnapshots/` publisher stack (publishers, builders, P4 rate guard, recovery) **after** classifier relocate.
   - Delete `functions/scripts/retry-portal-catalog-publication-prod.mjs` (ops script for retired callable).
   - Remove obsolete publisher / P4 unit tests with the sources.

4. **Dev deploy (human-gated)**
   - Scoped Functions deploy to `fresh-prints-dev` that **removes** the six publisher exports from live project.
   - Confirm Algolia Functions remain deployed and healthy.

5. **Owner QA (dev)**
   - Algolia ON: search / multi-tag / facets / sync smoke.
   - Algolia OFF: browse works; search unavailable; **zero** `generated/portal-catalog/**` Network fetches.
   - No new portal-catalog full pubs after design write (Console / traces).
   - Library / category / Discover / New This Week / favorites regression smoke.

6. **Docs**
   - `BACKEND.md`, `DECISIONS.md` (ADR: publishers retired; P4 retired), `CURRENT-STATE`, ROADMAP; note Stage 5 owns Storage/Rules cleanup.

### Out of Scope

- **Stage 5:** deleting `generated/portal-catalog/**`, `generated/catalog-reference/**`, `snapshotPublicationState` docs, Storage/Firestore Rules narrowing.
- **Stage 6 / production:** prod Function delete, prod Algolia app, PR #40 merge, production deploy.
- TD-030 (details/share quantity-control parity).
- Algolia architecture redesign; Studio Design Library changes.
- Deleting shared `packages/shared/src/catalog-snapshots/*` parsers **unless** no remaining imports after Portal cutover (prefer Stage 5 if anything still references types for offline tools).
- Rebuilding tags-only AI Storage package (Strategy 2 FS KEEP).

---

## Allowlist — Functions to retire (live delete)

Exact export names from `functions/src/index.ts` (verify against live project before delete):

| Export | Kind |
|--------|------|
| `onCategorySnapshotSourceWritten` | catalog-reference trigger |
| `onTagSnapshotSourceWritten` | catalog-reference trigger |
| `onPortalCatalogSnapshotSourceWritten` | portal-catalog trigger |
| `onPortalCatalogPublicationStateWritten` | P4 W2 portal-catalog |
| `rebuildCatalogSnapshots` | callable |
| `retryPortalCatalogPublication` | callable |

**Must remain:**

| Export |
|--------|
| `syncPortalCatalogDesignToAlgolia` |
| `reconcilePortalCatalogAlgoliaIndex` |
| `reconcilePortalCatalogAlgoliaIndexScheduled` |
| All unrelated Studio / print-request / AI / OG Functions |

Live name inventory: **`[NEEDS REPO CHECK]`** via `firebase functions:list --project fresh-prints-dev` (or Console) at Implement gate.

---

## Affected Areas

### Files / Modules (expected)

| Area | Paths |
|------|--------|
| Portal | `useCatalogDesigns.ts`, `catalogService.ts`, `catalogSnapshotFlags.ts`, `portalCatalogAssetService.ts` (+ tests); possibly delete or stub asset service |
| Functions Algolia | `syncPortalCatalogDesignToAlgolia.ts` — import path after classifier move |
| Functions retire | `functions/src/catalogSnapshots/**` (most), `functions/src/index.ts` exports, `functions/scripts/retry-portal-catalog-publication-prod.mjs` |
| Docs | `BACKEND.md`, `DECISIONS.md`, workflow state / handoff |

### Architecture Impact
- [x] Details: Remove generated Storage as Portal search/facet backend. Algolia + Firestore remain. Classifier moves next to Algolia sync.

### Security Impact
- [x] Details: No Rules widening. Generated public-read objects remain until Stage 5 (accepted residual). Client still cannot write `snapshotPublicationState`. Search-only Algolia keys unchanged.

### Data Model Impact
- [x] Details: No design schema change. `snapshotPublicationState` becomes orphan until Stage 5 delete (docs note).

### Backend Impact
- [x] Details: Delete six Functions on **dev**; relocate classifier; P4 guard deleted with publishers.

### UI / UX Impact
- [x] Details: Algolia-off search UX already QA’d; ensure no silent generated fallback. Manual QA required.

### Migration Impact
- [x] Forward: code cutover → classifier move → un-export → delete sources → scoped dev deploy removing Functions.
- [x] Rollback: redeploy prior Functions revision that still includes publishers; re-enable generated Portal fallback only if emergency (prefer Algolia reconcile + FS browse). Storage objects may still exist (not deleted in Stage 4).

---

## Approach

1. **Inventory (read-only)** — Confirm live Function names on `fresh-prints-dev` match allowlist; note any extras.
2. **Portal Implement** — Remove generated fallback; update tests; Portal typecheck/lint.
3. **Classifier relocate** — Move + rewire Algolia sync; Functions tests for sync/classify green.
4. **Publisher delete in source** — Un-export six Functions; delete catalogSnapshots publisher modules + P4 + recovery + obsolete tests; keep Algolia.
5. **Formal Implementation Review** — before any deploy.
6. **Human checkpoint** — owner phrase to authorize **dev** Functions deploy/delete (exact phrase in review/signoff).
7. **Scoped deploy** to `fresh-prints-dev` removing allowlisted Functions only.
8. **Owner QA** — checklist below.
9. **Signoff** — Stage 4 complete on **dev**. Stop before Stage 5 / Stage 6 / prod Function delete / PR merge.

---

## Test Strategy

### Automated

| Check | Command / focus | Required |
|-------|-----------------|----------|
| Portal typecheck | `npm run typecheck` (apps/portal) | yes |
| Functions unit | classifier + Algolia sync tests; publisher tests removed/updated | yes |
| Containment | Portal no longer calls `listMatchingDesigns` / generated facets when Algolia off | yes |
| Lint | touched files | yes |
| `git diff --check` | touched | yes |
| Full Functions suite | as practical; document pre-existing failures | yes if timeboxed |

### Manual (owner)

- [ ] Algolia ON: free-text + multi-tag + facets smoke
- [ ] Algolia OFF: Library browse OK; search unavailable; Network = **0** `generated/portal-catalog/**`
- [ ] Approve or edit a ready design: **no** new portal-catalog full publication spike class
- [ ] Discover / New This Week / category browse smoke
- [ ] Algolia sync still updates search after approve/edit (spot-check)

---

## Human Checkpoints Anticipated

- [x] **Stage 4 planning** — obtained (`APPROVE STAGE 4 PLANNING`)
- [ ] **Formal Review** of this plan before Implement
- [ ] **Live Function inventory** confirmation before delete
- [ ] **Owner phrase before `fresh-prints-dev` publisher Function delete/deploy** (Implement must STOP until phrase)
- [ ] Owner QA after deploy
- [ ] **Not** authorized by this plan: Stage 5 Storage cleanup, Stage 6 / prod Function delete, PR #40 merge, production

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Delete classifier with publishers → Algolia sync break | **high** | Relocate before folder delete; tests |
| Leave generated fallback → false “retirement” | high | Portal cutover in same Stage before deploy |
| Accidental delete of Algolia Functions | **high** | Explicit remain-list; scoped deploy filter; inventory |
| Prod delete without Stage 6 | high | Out of scope; forbid |
| Rollback after Stage 4 hard | medium | Redeploy prior revision; Storage objects still present |
| Orphan `snapshotPublicationState` / Storage | low | Documented Stage 5 |
| Shared parser leftovers | low | Grep; Stage 5 if needed |

---

## Rollback Plan

1. Redeploy previous Functions revision that still exports the six publishers.
2. Optionally re-enable Portal generated flag **only** for emergency (prefer Algolia + FS).
3. Do **not** rely on Stage 5 object restore.

---

## Documentation Updates Required

- [x] BACKEND.md — publishers retired on dev; Algolia-only search path
- [x] DECISIONS.md — ADR Stage 4 retirement; P4 retired
- [x] ROADMAP / CURRENT-STATE / workflow state
- [ ] DEPLOYMENT.md — if Function list / rollback notes need update
- [ ] Stage 5 plan stub reference only (not author Stage 5 here)

---

## Open Questions

- [x] D1 Algolia — decided
- [ ] Exact live Function list on `fresh-prints-dev` — confirm at Implement
- [ ] Whether any non-Portal tooling still imports `portalCatalogAssetService` / shared catalog-snapshots — grep at Implement
- [ ] Prod publisher retirement timing — **default: Stage 6**, not this Stage

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-07-stage-4-publisher-retirement-plan-review.md`
- Verdict: **approved_with_changes**
- Implement: authorized for **code** only per required changes; live Function delete still gated
