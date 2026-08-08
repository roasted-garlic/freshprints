# Plan: PR #40 — Production promotion + merge readiness

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Author | Planning Agent |
| Status | **ready_for_review** → Formal Review **approved_with_changes** (overnight closeout) |
| Workflow | managed-phase |
| Managed goal | `post-launch-catalog-and-processing-stability` |
| Follow-up | `pr-40-production-promotion` |
| PR | [#40](https://github.com/roasted-garlic/freshprints/pull/40) |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| Planned HEAD | **`54b9fef8a0ccfa29c8b0dbcd238f8379a74e5608`** (re-verify at execution) |
| Base | `production` (`70c083af6ec0165e95f439fe6111e7e0a62c8ecd`) |
| Owner auth (docs only) | `APPROVE STAGE 5 SIGNOFF` → `APPROVE PR 40 PRODUCTION PROMOTION PLAN` |
| Related Signoffs | Stage 1b-C, Stage 4, Stage 5, taxonomy-read-spike-elimination, apphosting-env-secrets |

---

## Overnight closeout status (2026-08-08)

| Gate | Status |
|------|--------|
| Stage 5 Formal Signoff | **CLOSED** — `approved_with_notes` — `docs/workflow/reviews/2026-08-07-stage-5-generated-asset-cleanup-signoff.md` |
| `apphosting-env-secrets` | **CLOSED** — `APP HOSTING SECRETS READY` (Checkpoint 2b secrets create/grant **SATISFIED**) |
| App Hosting rollout | **NOT RUN** — still needs `APPROVE APP HOSTING ROLLOUT` |
| PR #40 merge | **NOT authorized** |
| Pre-merge verification on HEAD | **Pending** — next live gate before merge |

### Live PR audit (refreshed this pass)

| Item | Value |
|------|-------|
| Title | `fix: harden post-launch catalog and processing stability` |
| Head | `54b9fef8a0ccfa29c8b0dbcd238f8379a74e5608` |
| Base | `production` @ `70c083a` |
| Mergeable | `true` / `clean` |
| Commits | **54** |
| Files | **415** |
| Diff | **+42,399 / −6,907** |
| Behind production | **0** (ahead 54) |
| GitHub checks / reviews / threads | **0 / 0 / 0** |

---

## Goal

Define the exact, gated production-promotion and merge-readiness sequence for PR #40
(`fix: harden post-launch catalog and processing stability`) so owner can promote
`fresh-prints-dev`-proven work to production **without** merging or deploying in this
planning pass.

---

## Background

PR #40 is the cumulative post-launch stability release:

- Original Aug 4 stability track (AI Review, taxonomy archive, Studio ordering, snapshot
  pressure reduction — later superseded for publishers)
- Amendment / catalog mats / readyAt / Assisted proof 80 MB
- Stage 1b Algolia Portal search + Stage 1b-C correctives
- Stage 4 generated publisher retirement (source + **dev** Function delete)
- Stage 5 generated-asset cleanup (**dev** Storage/Rules; **no Formal Signoff file**)
- Taxonomy materialization + Studio disk cache + AI process cache + trigger corrective
- 45-design performance validation **PASS WITH NOTES**

Live PR (as of planning): open, `mergeable=true` / `clean`, ~53 commits, 406 files,
~+41K/−6.9K, **no GitHub status checks** on HEAD.

**Critical:** source absence of publisher exports ≠ live production Function deletion.
Stage 5 ops script is hard-pinned to `fresh-prints-dev` and cannot clean production.

---

## Scope

### In Scope (this plan / later gated execution)

- Merge-readiness gates for PR #40
- Production prerequisite inventory (read-only)
- Explicit Function create / update / delete allowlists
- Firestore / Storage Rules + index promotion
- Algolia production prerequisites and fail-closed Portal behavior
- Taxonomy production bootstrap ordering
- Stage 5–equivalent production cleanup sequencing (human-gated, separate)
- Pre-merge verification suite on exact HEAD
- Rollback + human checkpoint phrases
- Stage 5 Formal Signoff completion as a **docs gate** (before treating Stage 5 done)

### Out of Scope (this planning pass)

- Any implementation / code change
- PR merge
- Any Firebase / Algolia / Secret Manager mutation
- Production Storage cleanup
- Broad `firebase deploy --only functions`
- Creating CI
- Stage 6 auto-start beyond this promotion plan
- Studio stable 1.0.0 / domain cutover (separate tracks)

---

## Answers to planning questions

### 1. Is PR #40 source ready to merge as-is?

**Not yet — gates remain before merge, but Stage 5 docs gate is cleared.**

| Gate | Status |
|------|--------|
| Stage 5 Formal Signoff (dev) | **CLOSED** (`approved_with_notes`) |
| Pre-merge verification suite on exact HEAD | **Not yet run/recorded on `54b9fef`** |
| Read-only production inventory | **[NEEDS OWNER CHECK]** |
| Algolia production strategy documented + owner-approved | **[NEEDS OWNER CHECK]** |
| App Hosting Firebase web secrets create/grant | **CLOSED** (`APP HOSTING SECRETS READY`) |
| App Hosting rollout consuming secret YAML | **NOT RUN** |
| App Hosting Algolia public env plan (flag off until ready) | **Required at enable time** |

Mergeable GitHub state only proves git conflict cleanliness, not release readiness.

### 2. Does Stage 5 require a missing Formal Signoff?

**Resolved (2026-08-08):** Stage 5 Formal Signoff exists and is **`approved_with_notes`**:
`docs/workflow/reviews/2026-08-07-stage-5-generated-asset-cleanup-signoff.md`.

Dev cleanup remains **not** authorization for production Storage delete. Production Stage 5–class
cleanup stays separately gated (dev-pinned script cannot target prod).
### 3–4. Production Firebase delta (source vs `origin/production`)

#### Cloud Functions — CREATE (new on HEAD; deploy allowlist)

| Function | Module |
|----------|--------|
| `syncPortalCatalogDesignToAlgolia` | `functions/src/algolia/syncPortalCatalogDesignToAlgolia.ts` |
| `reconcilePortalCatalogAlgoliaIndex` | `functions/src/algolia/reconcilePortalCatalogAlgoliaIndex.ts` |
| `reconcilePortalCatalogAlgoliaIndexScheduled` | same |
| `onTagTaxonomySourceWritten` | `functions/src/taxonomy/onTaxonomySourceWritten.ts` |
| `onCategoryTaxonomySourceWritten` | same |
| `rebuildTaxonomyMaterializationCallable` | same |
| `rebuildTaxonomyMaterialization` | `functions/src/taxonomy/rebuildTaxonomyMaterialization.ts` (if exported as deployable; confirm at deploy) |

#### Cloud Functions — UPDATE (same export name; meaningful impl change)

| Function | Why |
|----------|-----|
| `enqueueAiEnrichment` | Materialization-aware taxonomy load / cache; terminal enqueue behavior |
| Related AI enrichment callables if co-deployed historically | `testAiEnrichmentPlayground`, `testAiEnrichmentTagRerank` only if still in prod allowlist needs — **prefer not** unless required |
| `getPortalGlobalOpenGraph` | FS browse path changes (substantial) |
| Assisted-creation / proof-related Functions | 80 MB proof alignment (deploy only if still required vs already on prod) |

Exact UPDATE allowlist at execution time must be derived from:

```text
firebase functions:list --project fresh-prints-prod
git diff origin/production...HEAD -- functions/src/index.ts
```

#### Cloud Functions — DELETE (retired publishers; live delete required)

Exact six names (Stage 4 Signoff / delete record):

1. `onCategorySnapshotSourceWritten`
2. `onTagSnapshotSourceWritten`
3. `onPortalCatalogSnapshotSourceWritten`
4. `onPortalCatalogPublicationStateWritten`
5. `rebuildCatalogSnapshots`
6. `retryPortalCatalogPublication`

**Source on HEAD:** all six absent from `functions/src/index.ts`.  
**Live production:** **NEEDS PROD CHECK** — assume present until inventory proves otherwise.  
**Do not assume** a Functions source deploy removes them.

#### Firestore Rules

- Add `taxonomyMaterialization/{docId}`: staff read; client writes denied
- Remove dedicated `snapshotPublicationState` allow match → default-deny
- Designs: optional `readyAt` validation (already part of branch)

#### Storage Rules

- Assisted proof size `25MB` → `80MB`
- **Remove** public-read matches for `generated/catalog-reference/**` and `generated/portal-catalog/**` → default-deny

#### Firestore indexes

Four new `designs` composites with `readyAt` DESC (status / categoryId / tags CONTAINS combinations) in `firestore.indexes.json`.

#### App Hosting / Portal

- Large Portal source change (Algolia search, Stage 4 fail-closed, readyAt browse, mats, etc.)
- **`apphosting-env-secrets` (2026-08-08) — SIGNOFF `approved_with_notes`:**  
  `apps/portal/apphosting.yaml` uses Cloud Secret Manager `secret:` refs only for the eight
  production `NEXT_PUBLIC_FIREBASE_*` + `NEXT_PUBLIC_PORTAL_ORIGIN` bindings — **no plaintext
  values in YAML**. Owner: `APP HOSTING SECRETS READY` (created/granted on `fresh-prints-prod` /
  backend `fresh-prints-portal`). Signoff:
  `docs/workflow/reviews/2026-08-08-apphosting-env-secrets-signoff.md`
- YAML still has **no Algolia vars** — keep `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH` unset/`false`
  until Algolia prod prerequisites are complete; prefer Secret Manager for any future Algolia
  public env (do not reintroduce plaintext Firebase web config).
- **First App Hosting rollout that consumes secret-backed YAML** is a separate production deploy
  gate (`APPROVE APP HOSTING ROLLOUT` or equivalent). Do **not** auto-deploy. Secret-backed YAML
  must be on the branch App Hosting builds from (`production` for `fresh-prints-portal`) before
  that rollout. Until then, live Portal continues on the previous build.
- Post-rollout smoke (first secret cutover): homepage HTTP 200; served HTML must **not** embed
  `fresh-prints-dev`; origin / `NEXT_PUBLIC_*` resolve to production expectations.
- Residual: old plaintext remains in git history (`60cff59`+); history rewrite out of scope.

#### Studio

- Taxonomy disk-cache IPC + materialization client require a **new packaged Studio build**
- Cache is Electron `userData` JSON — not a separate installer product type
- Without new Studio build: staff still function via FS hydrate; spike benefit missing

#### Secrets / config

| Surface | Names |
|---------|--------|
| App Hosting Secret Manager (Portal Firebase web + origin) | `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_FIREBASE_VAPID_KEY`, `NEXT_PUBLIC_PORTAL_ORIGIN` — **READY** (owner PASS); values never in repo/YAML |
| Functions Secret Manager | `ALGOLIA_ADMIN_API_KEY` (`defineSecret`) |
| Functions params | `ALGOLIA_APP_ID`, `ALGOLIA_PORTAL_CATALOG_INDEX_NAME` (default **`portal_catalog_ready_dev`** — **must override for prod**) |
| Portal Algolia public (when enabling search) | `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH`, `NEXT_PUBLIC_ALGOLIA_APP_ID`, `NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY`, `NEXT_PUBLIC_ALGOLIA_INDEX_NAME` |

### 5. Algolia production prerequisites — **[NEEDS PROD CHECK]**

Do **not** assume production already has any of:

- [ ] Algolia Application (prefer separate from dev)
- [ ] Production index (name ≠ `portal_catalog_ready_dev`)
- [ ] Search-only API key for Portal
- [ ] Admin API key in Secret Manager as `ALGOLIA_ADMIN_API_KEY` on `fresh-prints-prod`
- [ ] Functions params `ALGOLIA_APP_ID` + `ALGOLIA_PORTAL_CATALOG_INDEX_NAME` set for prod
- [ ] Initial reconcile / index backfill completed
- [ ] App Hosting / Portal **Algolia** env wired (Firebase web + origin secrets already **READY**)

**Before enabling managed search on production Portal**, all of the above must be true and smoked.

**Already closed (do not reopen):** App Hosting Firebase web config + origin secrets create/grant
(`APP HOSTING SECRETS READY`). Remaining App Hosting work is **rollout of secret-backed YAML**,
not secret creation.

### 6. Is ordinary Firestore browse safe if Algolia prod is incomplete?

**Yes**, by architecture/signoff evidence:

- `isPortalAlgoliaCatalogConfigured()` requires flag `'true'` **and** all three public config strings
- When not configured: ordinary Library / category / single-tag browse uses Firestore
  (`listReadyDesignsPageWithSortFallback`); managed free-text / multi-tag / facets fail closed
- Stage 1b-C owner QA: `ALGOLIA OUTAGE: PASS` / kill-switch — Firestore browse healthy
- Stage 4: **no** generated Storage fallback

**Implication:** production can merge + ship Portal with Algolia **OFF** and retain ordinary browse;
managed search/facets remain unavailable until Algolia ON.

### 7. Stage 5 production cleanup requirements

| Question | Answer |
|----------|--------|
| Are old producers still serving? | After Stage 4 Portal ship: Portal does not consume generated search assets. Live **publisher Functions** may still write until deleted — waste/cost, not Portal dependency. |
| When is generated Storage obsolete? | After: (a) Portal Stage 4 code live, (b) Storage Rules deny public-read (optional hardening), (c) publisher Functions deleted (stop writers). Bytes may remain until explicit cleanup. |
| Cleanup before or after cutover? | **After** Portal cutover + publisher delete + Rules deny. Never before Portal no longer needs generated paths. |
| `snapshotPublicationState` on prod? | **NEEDS PROD CHECK** (list-only). |
| Rollback if delete generated assets? | **Irreversible** without regenerating publishers (retired). Do not delete until publishers deleted and Portal Algolia/FS path proven. |

Current Stage 5 script: `STAGE5_ALLOWED_PROJECT_ID = "fresh-prints-dev"` — **cannot** target prod. Production cleanup needs a **separate** owned procedure/script + phrase.

### 8. Taxonomy production bootstrap ordering

Safe order (AI never “hard-requires” materialization):

1. Deploy Firestore Rules for `taxonomyMaterialization` staff-read (or deploy Rules with Functions in same window if Rules already allow staff via upcoming release — prefer Rules before/with callable)
2. Deploy taxonomy Functions + AI loader that **prefers** materialization with **FS fallback + circuit**
3. **Bootstrap** `rebuildTaxonomyMaterializationCallable` on production → verify meta ready / chunkCount / parity
4. Deploy taxonomy source triggers (or same allowlist as step 2 if already included)
5. Studio package with disk-cache IPC (independent staff release)
6. Only then treat spike-elimination as live on prod

**Safety net:** `loadAiCatalogReferenceSnapshot` falls back to FS (`taxonomy-fallback-fs`) and opens a 5-minute circuit after 3 fallbacks — AI continues without materialization, with higher read cost.

**Do not** delete FS taxonomy collections; Firestore remains authoritative.

### 9. Function deploy/delete sequence (no broad deploy)

Prefer explicit allowlists. **Never** `firebase deploy --only functions` for this release unless a later review proves full inventory parity.

Suggested allowlists (adjust after prod inventory):

**Wave A — CREATE/UPDATE (non-destructive):**

```text
# Example shape only — finalize after inventory
firebase deploy --only \
  functions:syncPortalCatalogDesignToAlgolia,\
  functions:reconcilePortalCatalogAlgoliaIndex,\
  functions:reconcilePortalCatalogAlgoliaIndexScheduled,\
  functions:onTagTaxonomySourceWritten,\
  functions:onCategoryTaxonomySourceWritten,\
  functions:rebuildTaxonomyMaterializationCallable,\
  functions:enqueueAiEnrichment \
  --project fresh-prints-prod
```

Plus any other UPDATEs confirmed required (e.g. `getPortalGlobalOpenGraph`) on a **second** allowlist after diff review.

**Wave B — DELETE publishers (separate human phrase, after Portal cutover):**

```text
firebase functions:delete \
  onCategorySnapshotSourceWritten \
  onTagSnapshotSourceWritten \
  onPortalCatalogSnapshotSourceWritten \
  onPortalCatalogPublicationStateWritten \
  rebuildCatalogSnapshots \
  retryPortalCatalogPublication \
  --project fresh-prints-prod
```

(Exact CLI flags/region per project conventions; confirm each exists first.)

### 10. Merge timing recommendation

**Merge PR #40 AFTER:**

1. Stage 5 Formal Signoff (dev docs gate)
2. Read-only production inventory recorded
3. Pre-merge verification suite PASS on exact HEAD
4. Owner approval of this promotion plan’s Formal Review gates
5. Explicit Algolia enablement strategy (recommend: ship Portal with Algolia **OFF** initially)

**Merge PR #40 BEFORE:**

- Production publisher Function deletion
- Production generated Storage cleanup
- Enabling `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH=true` (unless prerequisites already complete)

**Why:** Merge promotes **source of truth** to `production` for App Hosting / future deploys without performing irreversible runtime deletes. Runtime cutover remains phrase-gated. Shipping Portal with Algolia OFF preserves ordinary browse while Functions/index/bootstrap catch up.

If App Hosting auto-deploys on merge to `production`, treat merge as **also** Portal rollout — then Algolia OFF + FS browse must be accepted at merge time, and Storage Rules that deny generated public-read should land **with or after** that Portal rollout (not before old Portal still depends on generated assets). Confirm auto-deploy behavior in owner inventory (**NEEDS PROD CHECK**).

---

## PR logical categorization (406 files)

| Slice | Contents |
|-------|----------|
| **A** Original post-launch stability | AI Review terminal enqueue, taxonomy archive/restore, Studio ordering, readyAt, mats, Assisted proof 80 MB, catalog FS browse corrections |
| **B** Algolia Stage 1b / 1b-C | Portal `portalAlgolia*`, sync/reconcile Functions, facet/Discover correctives |
| **C** Publisher retirement | Delete `catalogSnapshots/` publishers; classifier → `functions/src/algolia/`; Portal fail-closed |
| **D** Generated-asset cleanup | Stage 5 scripts (dev-pinned), Storage/Rules narrowing, inventories |
| **E** Taxonomy materialization | Shared builder, Functions taxonomy/*, Studio materialization + disk cache IPC, Rules |
| **F** Taxonomy corrective | `taxonomyTriggerCoalesce` awaited rebuild |
| **G** Tests | Portal/Studio/Functions/shared/Rules tests |
| **H** Docs/workflow | Plans, reviews, signoffs, BACKEND/DATA_MODEL/ROADMAP/DECISIONS, handoff |
| **I** Other (explained) | Studio AI queue trace IPC; import PNG normalize; category archive persistence; `getPortalGlobalOpenGraph` FS path; `backfill-design-ready-at.mjs`; shared assisted-creation constants; `.cursor/workflow/state.md` |

**Category I is not unexplained noise** — each item ties to post-launch stability amendments already on this branch. No secrets/env files in PR. Stage 5 script cannot hit prod. Dev console bridges gated to DEV + `fresh-prints-dev`.

### Production-candidate risk checks

| Check | Result |
|-------|--------|
| Obsolete publishers retained in source | **No** — deleted |
| Dev-only bridges in prod Studio | Gated off (DEV + fresh-prints-dev) |
| Secrets in repo | **None** intended; do not commit `.env.local` |
| Algolia `_dev` default | **Risk** if Functions params unset on prod — override required |
| Generated fallback consumers | Removed (Stage 4) |
| Accidental prod cleanup script | Dev project pin |

---

## Approach — production rollout checkpoints (ordered)

### Checkpoint 0 — Docs / gates (no prod mutation)

1. ~~Complete Stage 5 Formal Signoff~~ → **DONE** (`approved_with_notes`)
2. Owner: `APPROVE PR 40 PRODUCTION PROMOTION PLAN` (this overnight closeout)
3. Record read-only prod inventory (Functions list, Rules versions, Algolia, App Hosting auto-deploy, Storage residual sample) — **[NEEDS OWNER CHECK]**

### Checkpoint 1 — Pre-merge verification (local / CI-less)

Run suite in § Test Strategy A against exact HEAD (`54b9fef` or newer). Record results.
Owner phrase: `APPROVE PR 40 PRE-MERGE VERIFICATION` (or equivalent after PASS recorded).

### Checkpoint 2 — Merge (source only)

Owner: `APPROVE PR 40 MERGE TO PRODUCTION`  
Merge PR #40 → `production` (must include secret-backed `apphosting.yaml`).  
**No** Function delete / Storage cleanup / App Hosting deploy in this step unless auto-deploy
is confirmed and owner accepts that merge == rollout (RC-R5).  
Portal Algolia flag: keep **off** unless Checkpoint 3 already green.

### Checkpoint 2b — App Hosting secrets readiness + first rollout

| Sub-gate | Status |
|----------|--------|
| Secret-backed YAML in repo | **SATISFIED** |
| Eight secrets created/granted | **SATISFIED** (`APP HOSTING SECRETS READY`) — **do not reopen** |
| First rollout consuming secrets | **NOT RUN** — Owner: `APPROVE APP HOSTING ROLLOUT` after YAML on `production` |

Smoke after rollout: homepage HTTP 200; served HTML must **not** contain `fresh-prints-dev`;
production `NEXT_PUBLIC_*` resolve. Prefer Secret Manager as single source; avoid duplicating
the same vars as Console overrides unless intentional.
### Checkpoint 3 — Algolia production prep (secrets / index)

Owner phrases for secret/config (separate).  
Create/configure prod index; set Secret Manager + params; **do not** point prod at `_dev` index.

### Checkpoint 4 — Functions Wave A (create/update allowlist)

Deploy CREATE/UPDATE allowlist to `fresh-prints-prod`.  
Bootstrap taxonomy materialization.  
Optional: Algolia reconcile (admin) once secrets present.

### Checkpoint 5 — Indexes + Rules

Deploy `firestore.indexes.json` if missing.  
Deploy Firestore Rules (taxonomyMaterialization).  
Deploy Storage Rules **only after** Portal Stage 4 code is live (generated public-read no longer required).

### Checkpoint 6 — Portal Algolia enable (optional later)

Set App Hosting public Algolia env + flag `true`.  
Owner smoke: search / facets / kill-switch / FS browse.

### Checkpoint 7 — Publisher Function delete (destructive)

Owner: `APPROVE PROD FUNCTIONS DELETE: STAGE 4 PUBLISHERS`  
Delete exact six names after inventory confirm.

### Checkpoint 8 — Production generated Storage cleanup (optional, later)

**Separate** procedure (not current Stage 5 script).  
Dry-run → owner phrase → APPLY. Irreversible without publishers.

### Checkpoint 9 — Studio package

Ship Studio build including taxonomy disk-cache IPC. Owner smoke Design Library.

### Checkpoint 10 — Final production smoke QA

Record PASS/FAIL. Only then consider promotion complete.

---

## Affected Areas

### Architecture Impact

- [x] Details: Algolia replaces generated catalog search; taxonomy materialization derived read path; Firestore remains taxonomy authority; publishers retired

### Security Impact

- [x] Details: Storage Rules narrow (remove public generated reads); taxonomyMaterialization staff-read only; Algolia admin key Secret Manager only; search-only key on Portal; Stage 5 script must not gain silent prod escape

### Data Model Impact

- [x] Details: `taxonomyMaterialization/**` derived; `readyAt` on designs; `snapshotPublicationState` orphan cleanup (prod optional); no Algolia-as-taxonomy-authority

### Backend Impact

- [x] Details: Function create/update/delete allowlists; Rules; indexes; Algolia params/secrets; App Hosting env

### UI / UX Impact

- [x] Details: Portal search/facets depend on Algolia when enabled; otherwise fail-closed for managed search; Studio cache requires new build

### Migration Impact

- [x] Forward: bootstrap materialization; Algolia reconcile; optional Storage cleanup  
- [x] Rollback: see § Rollback

---

## Test Strategy

### A. Automated / local (pre-merge, exact HEAD) — MUST RERUN on promotion HEAD

Lookup from repo scripts (`package.json` workspaces). Do not invent commands.

| Check | Command | Required | Notes |
|-------|---------|----------|-------|
| Diff hygiene | `git diff --check` | yes | Always |
| Taxonomy suites | `npx tsx --test` on `functions/src/taxonomy/*.test.ts` + shared builder/alignment tests | yes | Focused |
| Stage 4 / Algolia containment | Portal Stage 4 + Algolia / discover / facet tests under `apps/portal/features/catalog/` | yes | Focused |
| Stage 5 guard tests | `node --test functions/scripts/lib/stage5GeneratedAssetCleanup*.test.mjs` | yes | Focused |
| Functions build | `npm run build --prefix functions` | yes | |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes | |
| Portal build | `npm run build:portal` | recommended | Catches Next build issues |
| Studio typecheck | `npx tsc --noEmit` in Studio (or equivalent workspace script if present); Studio `build` runs `tsc` | yes type / optional full package | Full `npm run build:studio` is heavy (electron-builder) — typecheck sufficient for merge gate unless owner requires package |
| Repo lint | `npm run lint` | yes | |
| Rules tests | `npm run test:rules` | yes **if Java available** | Document skip if blocked |

**Already valid without re-live QA:** Stage 1b-C / Stage 4 / Stage 5 / taxonomy 45-design **dev** Signoffs — do not re-run destructive live QA. They do **not** replace automated suite on final HEAD.

**No GitHub checks on HEAD** — local suite is the merge evidence. Do **not** invent CI in this task.
### B. Read-only production prerequisite checks

| Check | Method |
|-------|--------|
| List Functions | `firebase functions:list --project fresh-prints-prod` |
| Confirm six publishers present/absent | inventory |
| Secret `ALGOLIA_ADMIN_API_KEY` exists? | console / gcloud (owner) |
| Params ALGOLIA_* | owner |
| Algolia app/index | Algolia dashboard (owner) |
| App Hosting auto-deploy on `production`? | owner |
| Sample `generated/portal-catalog/` object count | list-only |
| `snapshotPublicationState` count | list-only |
| `taxonomyMaterialization` exists? | expect empty/absent until bootstrap |

### C. Production deployment checkpoints

Per Approach checkpoints 2–8; each with own phrase.

### D. Owner smoke QA (production)

| Area | Expected |
|------|----------|
| Portal FS browse (Algolia OFF) | Library/category healthy |
| Portal managed search OFF | fail-closed message; no crash |
| Portal Algolia ON (after enable) | search/facets/sync smoke |
| AI enqueue / Needs Review | no taxonomy tower; fallback OK if pre-bootstrap |
| Studio Design Library (new build) | 0 unexpected tag/cat hydrate when cache warm |
| Publishers deleted | no publisher logs; no regen of generated assets |

---

## Human Checkpoints (separate phrases — do not combine)

| # | Phrase (recommended) | Action |
|---|----------------------|--------|
| 1 | ~~`APPROVE STAGE 5 SIGNOFF`~~ | **DONE** |
| 2 | ~~`APPROVE PR 40 PRODUCTION PROMOTION PLAN`~~ | **DONE** (overnight closeout; docs only) |
| 3 | `APPROVE PR 40 PRE-MERGE VERIFICATION` | After suite recorded on exact HEAD |
| 4 | `APPROVE PR 40 MERGE TO PRODUCTION` | GitHub merge only (includes secret-backed YAML) |
| 4b | `APPROVE APP HOSTING ROLLOUT` | First prod Portal build consuming Secret Manager YAML |
| 5 | `APPROVE PROD ALGOLIA CONFIG` | Algolia secrets/index/App Hosting Algolia public env |
| 6 | `APPROVE PROD FUNCTIONS DEPLOY: PR40 WAVE A` | Allowlisted create/update |
| 7 | `APPROVE PROD TAXONOMY MATERIALIZATION BOOTSTRAP` | Callable invoke |
| 8 | `APPROVE PROD RULES DEPLOY: PR40` | Firestore + Storage Rules |
| 9 | `APPROVE PROD INDEXES DEPLOY: PR40` | If needed |
| 10 | `APPROVE PROD ALGOLIA ENABLE` | Flag true + smoke |
| 11 | `APPROVE PROD FUNCTIONS DELETE: STAGE 4 PUBLISHERS` | Six deletes |
| 12 | `APPROVE PROD STORAGE CLEANUP DRY-RUN` / `… DELETE` | Later, separate script |
| 13 | `APPROVE PROD STUDIO BUILD/RELEASE` | Taxonomy cache IPC |
| 14 | `PROD SMOKE: PASS\|FAIL` | Final |

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Merge triggers Portal auto-deploy before Algolia ready | medium | Ship Algolia OFF; FS browse safe |
| First App Hosting rollout after secret YAML without smoke | high | Explicit `APPROVE APP HOSTING ROLLOUT`; smoke no `fresh-prints-dev` in HTML |
| Reintroducing plaintext Firebase config into YAML | high | Forbidden — Secret Manager only |
| Prod Functions keep `_dev` index default | high | Force prod index param |
| Publishers left live after Portal cutover | medium | Wave B delete checkpoint |
| Storage Rules deny generated before Portal cutover | high | Order Rules after Portal Stage 4 live |
| Storage cleanup without regen path | high | After publishers deleted; separate approval |
| Missing Stage 5 Signoff | medium | Docs gate before prod cleanup narrative |
| Taxonomy bootstrap skipped | medium | FS fallback; bootstrap still required for spike elimination |
| No CI on PR | medium | Mandatory local pre-merge suite |

---

## Rollback

| Area | Rollback |
|------|----------|
| Git source | Revert merge commit on `production` (or reverse PR) — does not undelete Functions/Storage |
| Portal App Hosting | Redeploy previous `production` revision; set Algolia flag false |
| Algolia sync/search | Disable Portal flag; pause/delete sync Functions if needed; index retained |
| Cloud Functions (Wave A) | Redeploy prior function versions from pre-merge source / prior digests |
| Publisher deletion | **Cannot** restore by source alone — must redeploy publisher source from pre-Stage-4 revision (heavy). Prefer delay delete until confident |
| Taxonomy materialization | Leave docs; AI FS fallback works; optional delete materialization collection (non-authoritative) |
| Firestore Rules | Redeploy previous Rules release |
| Storage Rules | Redeploy previous Rules (re-enables generated public-read if rolled back) |
| Generated Storage cleanup | **No app-level restore** without revived publishers |

---

## FreshForge Impact Classification

| Area | Impact |
|------|--------|
| Starter Surface | No (app project docs/workflow only) |
| Development Tooling | No |
| Distribution/Installer | Studio release implication (app), not FreshForge installer |
| Documentation | Yes — this plan + review + later Stage 5 Signoff |
| Development History | No |

---

## Open questions (owner / prod inventory)

1. Does merge to `production` auto-deploy App Hosting Portal?
2. Which of the six publisher Functions exist live on `fresh-prints-prod`?
3. Does prod already have any Algolia app/index/secrets?
4. Are `readyAt` indexes already deployed on prod?
5. Is a production Storage cleanup desired in the same promotion window or deferred weeks?

---

## Success criteria

- [ ] Stage 5 Signoff status resolved (doc exists)
- [ ] Owner accepts Formal Review gates
- [ ] Pre-merge suite PASS on exact HEAD
- [ ] Prod inventory recorded
- [ ] Merge + runtime checkpoints executed only under listed phrases
- [ ] No broad Functions deploy
- [ ] No prod Storage delete via dev-pinned Stage 5 script

---

## Confirmations (this planning pass)

- NO implementation
- NO Firebase mutation
- NO Algolia mutation
- NO secret change
- NO deploy
- NO production cleanup
- NO PR merge
- NO branch deletion
