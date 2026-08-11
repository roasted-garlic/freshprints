# Plan: Prefinal A–H development QA integration

| Field | Value |
|-------|-------|
| Date | 2026-08-11 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase / development QA only |
| Parent | prelaunch-catalog-search-count-and-first-visit-ux |
| Related | docs/workflow/reviews/2026-08-11-prefinal-a-h-development-qa-integration-plan-review.md |
| QA checklist | docs/workflow/reviews/2026-08-11-prefinal-a-h-development-qa-checklist.md |

**STOP:** This plan does **not** authorize production merge/deploy, Studio 1.0.3, or Algolia prod mutation.

---

## Goal

Integrate reviewed Workstreams **A–G + H** into a dedicated **development QA** git state so the owner can test locally against **`fresh-prints-dev`** (local Studio + local Portal + scoped DEV Functions/Storage Rules) before any production promotion.

---

## Step 0 — H commit (completed this pass)

| Field | Value |
|-------|-------|
| Branch | `fix/studio-upload-intake-perf-counts` |
| New tip | **`6150eee1b249673ec0f24b8602b23498bc7f0dd8`** |
| Message | `fix(studio): purpose-scope upload intake queries and progressive load` |
| Base | `913329caefa5cf5041b269da1e5192424d0b95c6` |
| A–G tips | Unchanged (Portal `e618a87`, OG `9d2144d`, Intake `633d3fa`, Quota `e39fc20`) |
| Functions / Rules / indexes in H commit | Unchanged |

---

## Current SHA topology (read-only, after `git fetch`)

| Ref | SHA (short) | Full |
|-----|-------------|------|
| `origin/production` | `913329c` | `913329caefa5cf5041b269da1e5192424d0b95c6` |
| `origin/development` | `cd33108` | `cd33108506932acb7adc8550c6131c5c8748defa` |
| Common ancestor (dev ∩ prod) | `3fabbf6` | `3fabbf67b93eaa6fd155cddf1922d45c98e2574d` |
| PR-Portal | `e618a87` | `fix/prefinal-a-g-portal-wt` |
| PR-OG | `9d2144d` | `fix/prefinal-a-g-og` |
| PR-Intake | `633d3fa` | `fix/prefinal-a-g-intake` |
| PR-Quota | `e39fc20` | `fix/prefinal-a-g-quota` |
| H | **`6150eee`** | `fix/studio-upload-intake-perf-counts` |

### Divergence facts

1. **`origin/development` is not equal to the A–H production base.**  
2. **Neither branch is an ancestor of the other** (diverged after `3fabbf6`).  
3. **Production-not-in-development:** includes Portal hotfixes / PR #55–#56 lineage through `913329c` (the A–H base).  
4. **Development-not-in-production:** essentially **docs/scripts only** (`cd33108` signoff + companion promote docs, ROADMAP, handoff, one PowerShell promote script). **No A–H product-file overlap** with that delta.  
5. Dry-merge `origin/production` → `origin/development` conflicts only on **workflow state / CURRENT-STATE** docs — not Portal/Studio/Functions product sources.

**Implication:** Starting a QA branch from current `development` would first require absorbing all production commits (doc conflicts only), then A–H. Safer and clearer for preserving reviewed A–H: **start QA branch from `origin/production` @ `913329c`**, then merge A–H in order.

---

## Recommended DEV integration branch

**Name:** `qa/prefinal-a-h-dev`  
(Repo has no existing `qa/*` convention conflict; matches H Implementation Review recommendation.)

**Create from:** `origin/production` @ `913329c` (not from lagging `development`).

**Do not** merge into protected `production` in this phase.  
**Do not** auto-merge into permanent `development` until after DEV QA PASS (optional follow-up: fast-forward/merge QA tip into `development` once green — separate owner decision).

---

## Recommended merge order

1. **Portal** `e618a87` (A+B+G)  
2. **OG** `9d2144d` (C+D)  
3. **Intake** `633d3fa` (E)  
4. **Quota** `e39fc20` (F3)  
5. **H** `6150eee`

**Why this order (unchanged from H IR):** Portal-only → OG Storage/Functions+Studio settings → Intake Functions lifecycle → Quota Functions+Portal delete → Studio intake query/perf. No new product dependency invented.

**Conflict expectation:** Mostly docs (`DATA_MODEL.md`, `BACKEND.md`, workflow state). Product paths are largely disjoint across PRs. If a merge conflict would change reviewed A–H **product** behavior → **STOP**, amend Formal Review — do not silent-resolve product conflicts.

---

## Component deployment classification (verified)

| Workstream | Local Studio | Local Portal | DEV Functions | DEV Storage Rules | DEV Firestore Rules | DEV indexes | App Hosting |
|------------|--------------|--------------|---------------|-------------------|---------------------|-------------|-------------|
| A+B+G Portal | — | **Yes** | No | No | No | No | **No** (policy) |
| C+D OG | **Yes** (settings UI) | **Yes** (OG consumers) | **Yes** | **Yes** | No | No | **No** |
| E Intake | Yes (observes Pending timing) | Yes (upload/donate/Add to Show) | **Yes** | No | No | No | No |
| F3 Quota | Optional | **Yes** | **Yes** | No | No | No | No |
| H | **Yes** | — | No | No | No | **Already present on DEV** | No |

**Dev Firebase project:** `fresh-prints-dev` only.

**App Hosting:** **Not needed** for this QA loop. `DEPLOYMENT.md` prohibits App Hosting on `fresh-prints-dev`; Portal QA is `npm run dev:portal` → `localhost:3100`.

---

## Algolia isolation proof (DEV vs PROD)

| Environment | Source | App ID | Index |
|-------------|--------|--------|-------|
| Local Portal (DEV QA) | `apps/portal/.env.local` | `WQ6OPP2E6Z` | **`portal_catalog_ready_prod` must not be used** — configured **`portal_catalog_ready_dev`** |
| Local Portal (prod file) | `apps/portal/.env.production.local` | `Z1FVCM5QUX` | `portal_catalog_ready_prod` |
| Functions DEV | `functions/.env.fresh-prints-dev` | `WQ6OPP2E6Z` | `portal_catalog_ready_dev` |
| Studio local | `apps/studio/.env.local` | (Algolia optional) | `VITE_FIREBASE_PROJECT_ID=fresh-prints-dev` |

**Proof proposed DEV workflow cannot mutate prod Algolia:**

1. Local Portal/Studio env for QA uses **`fresh-prints-dev`** + **`portal_catalog_ready_dev`** (different Algolia **app** than prod `Z1FVCM5QUX`).  
2. Functions param default / DEV env index is **`portal_catalog_ready_dev`**.  
3. Workstream **A** is **query-time only** (`queryType: 'prefixLast'`) — **no `setSettings`**, no admin index mutate in A–H scope.  
4. All proposed deploy commands use **`--project fresh-prints-dev`**.  
5. Owner must **not** load `.env.production.local` during DEV QA.

If any machine’s active Portal env shows `portal_catalog_ready_prod` while intending DEV QA → **STOP human checkpoint**.

---

## DEV Firestore index status (read-only)

Queried `firebase firestore:indexes --project fresh-prints-dev` (2026-08-11):

| Composite | Present on `fresh-prints-dev` |
|-----------|-------------------------------|
| `purpose` ASC + `catalogReviewStatus` ASC | **YES** |
| `purpose` ASC + `catalogReviewStatus` ASC + `createdAt` DESC | **YES** |

**Result: PASS — no DEV index deploy required for H.**  
Production index verify remains a **separate later** checkpoint (not this phase).

---

## Proposed DEV Functions allowlist (do not execute yet)

Changed / required exports from current A–G tips:

**OG (C+D)**  
- `updatePortalSocialMetaSettings`  
- `getPortalGlobalOpenGraph`  

**Intake (E)**  
- `confirmCustomerUploadsAndAttachToRequest`  
- `confirmCustomerUploadsForDonation`  
- `customerAddAssistedApprovedProofToPrintRequest`  
- `queuePortalPrintRequestToShow`  
- `onShowAllocationCreated` (trigger)

**Quota (F3)**  
- `previewCustomerUploadDeletion`  
- `deleteEligibleCustomerUpload`  
- `previewPortalCustomerUploadDeletion` (**new**)  
- `deletePortalCustomerUpload` (**new**)

**Proposed scoped command (execute only after owner approval phrase):**

```bash
firebase deploy --only functions:updatePortalSocialMetaSettings,functions:getPortalGlobalOpenGraph,functions:confirmCustomerUploadsAndAttachToRequest,functions:confirmCustomerUploadsForDonation,functions:customerAddAssistedApprovedProofToPrintRequest,functions:queuePortalPrintRequestToShow,functions:onShowAllocationCreated,functions:previewCustomerUploadDeletion,functions:deleteEligibleCustomerUpload,functions:previewPortalCustomerUploadDeletion,functions:deletePortalCustomerUpload,storage --project fresh-prints-dev
```

---

## DEV Storage Rules

- **Required:** YES — OG adds `match /portal-social-meta/static-og/{fileName}` (owner create/delete; public read for UUID-named images ≤5MB png/jpeg/webp).  
- **Firestore Rules:** NO change in A–H tips.  
- Included in the scoped command above via `storage`.  
- Do not deploy Storage Rules in Plan/Review pass.

---

## Local Studio against `fresh-prints-dev`

Per `DEPLOYMENT.md` + `apps/studio/.env.example`:

1. Ensure `apps/studio/.env.local` has `VITE_FIREBASE_PROJECT_ID=fresh-prints-dev` (and matching Firebase web config).  
2. Checkout `qa/prefinal-a-h-dev` after integration.  
3. From repo root: `npm run dev:studio`  
4. **Do not** build/publish Studio 1.0.3 for this QA.

---

## Local Portal against `fresh-prints-dev`

1. Ensure `apps/portal/.env.local` has `NEXT_PUBLIC_FIREBASE_PROJECT_ID=fresh-prints-dev` and Algolia **`portal_catalog_ready_dev`**.  
2. From repo root: `npm run dev:portal` → `http://localhost:3100`  
3. Features needing deployed DEV Functions (E/F3/OG): use allowlist deploy above first.  
4. Global OG JSON can be smoke-checked via Functions URL on DEV after deploy (`getPortalGlobalOpenGraph`) — **local Next is sufficient** for Portal UI; App Hosting not required.

---

## Combined A–H owner QA checklist

See: **`docs/workflow/reviews/2026-08-11-prefinal-a-h-development-qa-checklist.md`**

Includes A–H cases + H timing fields (shell / first image / settle) — not lab benchmarks.

---

## Fix / retest loop

```
Integrate on qa/prefinal-a-h-dev
→ DEV Functions + Storage deploy (scoped)
→ Owner local QA checklist
→ FAIL → narrow plan amendment / Formal Review if product change
→ fix on branch → redeploy affected DEV pieces → retest
→ PASS → stop (production still blocked)
```

---

## Rollback (DEV only)

- Git: reset/abandon `qa/prefinal-a-h-dev` or revert merges.  
- Firebase DEV: redeploy previous Functions/Storage from last known good DEV tip if needed.  
- No production rollback required (production untouched).

---

## Human checkpoints

1. Approve DEV integration/deploy phrase (below).  
2. Confirm local env files still point at `fresh-prints-dev` / `portal_catalog_ready_dev` before QA.  
3. DEV Storage Rules + Functions scoped deploy (after approval).  
4. Owner checklist PASS / FAIL.  
5. **Production remains blocked** — separate future phrase.

---

## Exact next owner approval phrase (DEVELOPMENT only)

```text
APPROVE DEV INTEGRATION + DEV DEPLOY: PREFINAL A-H QA
```

**No production approval phrase is provided.**
