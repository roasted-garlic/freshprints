# Plan: Prefinal A–H + Track B production promotion

| Field | Value |
|-------|-------|
| Date | 2026-08-11 |
| Author | Planning Agent |
| Status | reviewed (`approved_with_changes`) |
| Workflow | managed-phase |
| Related | A–H DEV QA signoff · Track A/B letterbox signoff · Formal Review `2026-08-11-prefinal-a-h-production-promotion-plan-review.md` |

---

## Goal

Promote the **exact owner-tested** Prefinal A–H + DEV QA amendments + Track B Static OG letterbox package (and Track A **tooling only**) from frozen `qa/prefinal-a-h-dev` into production through protected Git + component deploys — **without** executing merges/deploys/APPLY in this Plan pass.

---

## Background

- A–H DEV QA: **PASS**
- Track B Static OG letterbox DEV QA: **PASS**
- Track A Admin recon tooling: implemented + tested; **no prod APPLY**
- Production tip was untouched during DEV work (`913329c`)

### Frozen production candidate (authoritative)

| Field | Value |
|-------|-------|
| Branch | `qa/prefinal-a-h-dev` |
| Full SHA | `3b7a978f324d3c133ead8707ffc51454a20e1f5d` |
| Short | `3b7a978` |
| Freeze commit | `Freeze A-H QA amendments and Track A/B Static OG letterbox.` |
| Working tree at freeze | **clean**; `origin/qa/prefinal-a-h-dev` **==** local tip |
| Pre-freeze HEAD | `9c97c70342a5c5c6190dc64b774900d75f84c8f1` |

**Candidate includes:** A–H (A,B,C,D,E,F3,G,H) + owner QA amendments (catalog filters, Algolia refresh, bulk upload preview/quota, Studio OG preview, intake UI) + Track B always-letterbox Static + Track A recon tooling (no APPLY).

---

## Scope

### In Scope (this Plan document)

- Branch topology + permanent `development` sequencing decision
- Production vs candidate topology preflight
- Exact deployment matrix + Functions allowlist
- Storage Rules / Firestore Rules / indexes / Algolia gates
- E-before-Track-A-APPLY ordering
- App Hosting + Studio 1.0.3 checkpoints (plan only)
- Production smoke checklist
- Rollback strategy
- Human approval phrases

### Out of Scope (this pass — HARD STOP)

- Merge to `development` or `production`
- Any production deploy (Rules, Functions, App Hosting, indexes)
- Track A dry-run/APPLY against production
- Studio 1.0.3 package/publish
- Algolia mutation
- DNS / `APPROVE MYPRINTREQUEST.COM CUTOVER`

---

## Topology preflight (read-only 2026-08-11)

| Ref | Full SHA |
|-----|----------|
| `origin/production` | `913329caefa5cf5041b269da1e5192424d0b95c6` |
| `origin/development` | `cd33108506932acb7adc8550c6131c5c8748defa` |
| Frozen candidate | `3b7a978f324d3c133ead8707ffc51454a20e1f5d` |

| Metric | Value |
|--------|-------|
| Commits `production..candidate` | **17** |
| Files changed vs production | **111** (+8461 / −808) |
| Production moved since A–H base? | **No** — still `913329c`; candidate is descendant of production |
| Product conflicts with production | **None** — clean ancestry |
| Commits on `development` not in candidate | **1** — `cd33108` docs(workflow) companion/censored promote signoff |
| Merge-tree QA↔development conflicts | **Docs/workflow only** — `.cursor/workflow/state.md`, `docs/project/ROADMAP.md`, `references/project-chatgpt-handoff/CURRENT-STATE.md`, `references/project-chatgpt-handoff/13-recent-completed-work.md`. **No product-code conflict.** |

### Permanent `development` sequencing (recommended)

**Prefer OPTION B (binding for this already-tested cycle):**

1. Promote **frozen product candidate `3b7a978`** to `production` via protected PR (exact tested product content). Subsequent docs-only commits on the QA branch may ride along but must not alter product trees.
2. After production Git lands (or in parallel after PR open), reconcile `development` by merging the **same product SHA** (or production tip), resolving only workflow-doc conflicts.

**Rationale:** Guarantees production source is the owner-tested tip. Development’s extra docs commit must not rewrite product content on the way to production.

**OPTION A** (merge QA → `development` first, then `development` → `production`) is acceptable **only if** org policy forbids non-`development` → `production` PRs **and** Formal Review confirms the resulting production tip still contains byte-equivalent product trees to `3b7a978` (docs-only merge noise OK).

**Formal Review (2026-08-11):** Option B preferred/binding; Functions allowlist confirmed complete and narrow. H indexes present on prod — no deploy; reconfirm Enabled if Studio intake fails.
---

## Deployment matrix (from frozen candidate vs `origin/production`)

| Component | Required? | Notes |
|-----------|-----------|-------|
| **Git / PR** | **Yes** | PR of `3b7a978` into `production` (Option B) or via `development` (Option A with equivalence check) |
| **Portal / App Hosting** | **Yes** | Portal A/B/G + OG consumers; backend `fresh-prints-portal` builds branch `production` root `apps/portal` — must build **exact promoted production SHA** |
| **Functions** | **Yes** | Scoped allowlist below (E + F3 + C/D/B + finalize charge-on-ready) |
| **Storage Rules** | **Yes** | Candidate adds `portal-social-meta/static-og/...` — **not** live on production tip |
| **Firestore Rules** | **No** | No diff vs production in candidate |
| **Firestore Indexes** | **No deploy** | H indexes already present on `fresh-prints-prod` (see verification) |
| **Studio 1.0.3** | **Later checkpoint** | Package only after Git + backend readiness from same lineage |
| **Algolia** | **No mutation** | Query-time A only; env isolation verified |
| **Track A data repair** | **Later, separate phrase** | After E live + reinventory + dry-run |

---

## Functions production allowlist (exact)

Deploy **only** these exports (and their bundled deps) to `fresh-prints-prod`:

| Function | Why required |
|----------|----------------|
| `updatePortalSocialMetaSettings` | C/D Global OG Save + cache invalidate + Static snapshot finalize |
| `getPortalGlobalOpenGraph` | C/D/B Global OG JSON; Static **always letterbox** |
| `getPortalOgShareImage` | Letterbox JPEG; Track B `staticPath` + design `designId` |
| `confirmCustomerUploadsAndAttachToRequest` | E: attach stays `not_eligible` |
| `confirmCustomerUploadsForDonation` | E: donation → Pending |
| `customerAddAssistedApprovedProofToPrintRequest` | E: assisted attach timing |
| `queuePortalPrintRequestToShow` | E: Add to Show → Pending |
| `onShowAllocationCreated` | E: Studio allocate path → Pending |
| `previewCustomerUploadDeletion` | F3 staff preview |
| `deleteEligibleCustomerUpload` | F3 staff delete + refund path |
| `previewPortalCustomerUploadDeletion` | F3 customer self-delete preview (new vs prod) |
| `deletePortalCustomerUpload` | F3 customer self-delete + refund (new vs prod) |
| `finalizeCustomerUpload` | QA amendment: donation day quota **charge on ready** (not at finalize start) |

**Not in allowlist:** unrelated Functions; Track A Admin script (local only, not a Cloud Function).

**Batching:** Prefer **one Functions wave** containing the full allowlist so E is live before any Track A APPLY. Do not APPLY before this wave succeeds.

---

## Storage Rules

- Candidate `storage.rules` includes owner create/delete + public read for `portal-social-meta/static-og/{uuid}.{ext}` (≤5 MiB).
- Production tip **lacks** this block → **production Storage Rules deploy is required** (human checkpoint).
- Track B letterbox Function reads via Admin SDK; public read still needed for Firebase download tokens / Studio upload path.

---

## Firestore Rules

- **No** candidate vs production diff → **no** Firestore Rules deploy.

---

## Firestore Indexes (H)

Read-only `firebase firestore:indexes --project fresh-prints-prod` (2026-08-11):

| Index | Status |
|-------|--------|
| `customerUploads`: `purpose` ASC + `catalogReviewStatus` ASC | **Present** (Enabled in live listing) |
| `customerUploads`: `purpose` ASC + `catalogReviewStatus` ASC + `createdAt` DESC | **Present** (Enabled in live listing) |

→ **No index deploy** for this package. If re-check before H Studio release shows missing/BUILDING/ERROR → **block** Studio/cold-start verification until Enabled.

Repo `firestore.indexes.json` has **no** diff vs production for this candidate.

---

## Algolia isolation

| Env | App | Index |
|-----|-----|-------|
| Production | `Z1FVCM5QUX` | `portal_catalog_ready_prod` |
| Development (local `.env.local`) | `WQ6OPP2E6Z` | `portal_catalog_ready_dev` |

- Local Portal/Studio env files remain **DEV** (not committed).
- Candidate Algolia code changes are **query-time** (`prefixLast` / exact params) — **no** `setSettings`, reconcile, or index swap.
- Packaged Studio / App Hosting must use **production** Algolia app/index via release config — verify at Studio 1.0.3 + App Hosting env checkpoints.
- **No Algolia mutation** in this promotion.

---

## Workstream E before Track A APPLY

Required sequence:

1. Git promote frozen candidate → `production` (Option B preferred)
2. Production preflight (Rules/indexes/Algolia identity)
3. Deploy **Storage Rules** (static-og) — human approve
4. Deploy **Functions allowlist** (includes E + Track B OG + F3 + finalize)
5. App Hosting rollout of **exact production SHA** (Portal)
6. Re-run **read-only** production print-request `pending_staff_review` inventory
7. Freeze APPLY allowlist from that inventory (prior IDs provisional)
8. Track A **DRY RUN** (prod-pinned script) → owner inspect report
9. Owner: `APPROVE PROD APPLY: LEGACY PENDING FALSE-PENDING REPAIR`
10. Bounded APPLY
11. Studio 1.0.3 cold-start: badge ↔ Pending list
12. Reduced production smoke (below)

**Prior known IDs** `kkD1yLR9UNFsleK4Bg4Z`, `sTN1ewGYYpK8fWg6nU0s` are **provisional only** until post-E reinventory.

---

## Track B production

Must deploy `getPortalGlobalOpenGraph` + `getPortalOgShareImage` (in Functions wave). Static Global OG remains **always letterboxed** for Design Library Static and Uploaded Static; logo fail-safe; design-share unchanged.

---

## App Hosting

- Backend: `fresh-prints-portal` → branch `production`, root `apps/portal`
- Build/rollout **only after** Git promote + required Functions/Storage Rules for OG Static
- Exact source SHA: **the production tip after merge of `3b7a978`** (record full SHA at rollout time; must contain frozen candidate content)
- **No rollout in this pass**

---

## Studio 1.0.3 (later)

Package/publish **only** from the final production lineage containing C/E/H + QA amendments + Track B Studio copy.

Requirements: `fresh-prints-prod` Firebase; Algolia `Z1FVCM5QUX` / `portal_catalog_ready_prod`; no DEV project/index; correct branding; no Test Data Reset / Catalog Storage Inventory exposure.

**Not in this pass.**

---

## Production smoke checklist

Path: `docs/workflow/reviews/2026-08-11-prefinal-a-h-production-smoke-checklist.md` (created with this Plan).

Focus: deployment-sensitive behavior only (not full DEV re-run).

---

## Rollback (per component)

| Component | Rollback |
|-----------|----------|
| Git/PR | Revert merge commit on `production` (protected process) |
| Storage Rules | Redeploy previous `storage.rules` from `913329c` (loses static-og until re-deploy) |
| Functions | Redeploy prior production revision(s) for allowlisted Functions |
| App Hosting | Roll back to previous successful rollout |
| Studio installer | Stop distributing 1.0.3; keep prior installer |
| Track A repair | Exceptional: re-queue via Add to Show **or** emergency Admin restore to `pending_staff_review` from dry-run IDs — **no** destructive deletes |

---

## Human checkpoints (ordered)

1. Formal Review of this Plan  
2. Owner first promotion phrase (below)  
3. Git merge to production (and development reconcile)  
4. Storage Rules prod deploy  
5. Functions allowlist prod deploy  
6. App Hosting rollout  
7. Post-E read-only inventory + Track A dry-run  
8. `APPROVE PROD APPLY: LEGACY PENDING FALSE-PENDING REPAIR`  
9. Studio 1.0.3 package/publish  
10. Production smoke PASS  
11. Domain cutover remains **excluded** unless `APPROVE MYPRINTREQUEST.COM CUTOVER`

---

## Risks

| Risk | Mitigation |
|------|------------|
| Development docs-only diverge | Option B; reconcile development after |
| APPLY before E | Hard sequence gate |
| Storage Rules skipped → Static upload broken | Explicit Rules checkpoint |
| Studio packaged with DEV Algolia | Studio package checklist |
| Uncommitted escape | Freeze commit already pushed; tree clean |

---

## Exact next owner approval phrase (first PRODUCTION PROMOTION checkpoint)

```
APPROVE PROD PROMOTE PREFLIGHT: PREFINAL A-H + TRACK B
```

That phrase authorizes **starting** the production promotion sequence (Git PR / merges + subsequent human-gated deploys per this Plan). It does **not** by itself authorize Track A APPLY, Studio publish, or domain cutover.

---

## Open Questions

- [x] Frozen SHA recorded  
- [x] Production ancestry clean  
- [x] Formal Review: Option B preferred/binding for this cycle  
- [x] Formal Review: Functions allowlist complete and narrow  
- [x] H indexes present on prod; reconfirm if Studio intake fails