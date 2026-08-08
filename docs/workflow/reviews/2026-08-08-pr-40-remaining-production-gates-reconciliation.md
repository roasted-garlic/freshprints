# PR #40 — Remaining production gates reconciliation (read-only)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Workflow | managed-phase |
| Managed goal | `pr-40-remaining-production-gates-reconciliation` |
| Mode | **Read-only inventory / planning / Formal Review only** |
| Mutation | **NONE** |
| Supersedes (forward sequence) | Checkpoint numbers in `docs/workflow/plans/2026-08-08-pr-40-production-promotion-plan.md` (historical record retained) |
| Forward plan | `docs/workflow/plans/2026-08-08-pr-40-remaining-production-gates-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-08-08-pr-40-remaining-production-gates-plan-review.md` |

---

## Confirmations (this pass)

- NO App Hosting / Functions / Rules / indexes deploy
- NO Algolia create/configure/enable
- NO Secret Manager create/set; NO secret **values** read
- NO taxonomy bootstrap / readyAt backfill
- NO Storage delete / snapshotPublicationState delete
- NO Studio package/release
- NO source implementation

---

## Step 1 — Current git + Portal runtime identity

| Item | Verified value | Evidence |
|------|----------------|----------|
| `origin/production` SHA | **`7e139685099f90eb1532771e927384316a432e87`** | `git fetch` + `git rev-parse origin/production` |
| Working tree | **Not clean** (local docs/workflow dirty on gone branch `fix/portal-schedule-prop-wiring`) | `git status -sb` |
| Live App Hosting build | **`build-2026-08-08-004`** | Traffic API `current.splits[0].build` |
| Live source SHA | **`7e139685099f90eb1532771e927384316a432e87`** | Builds API `commit` for `build-2026-08-08-004` |
| Traffic | **100%** | Traffic API `percent: 100` |
| Auto rollouts | **`disabled: true`** (branch `production`) | Traffic API `rolloutPolicy` |
| Algolia | **OFF** | Live HTML `/` `/catalog` `/catalog?discover=new`: no Algolia env markers; `apphosting.yaml` has no Algolia vars |
| PR #40 | **MERGED** (ancestor of tip) | Merge `1e65a43`; tip contains PRs **#42–#45** after it |
| TD-031 | **CLOSED** | Signoff approved; live on `build-2026-08-08-004` |

### Merged production PRs after PR #40 (tip history)

| PR | Merge SHA (abbrev) | Topic |
|----|--------------------|-------|
| #40 | `1e65a43` | Post-launch catalog/processing stability |
| #42 | `ccfc974` | Home discovery pool fallback |
| #43 | `9f3a01a` | Discover View All counts/pagination |
| #44 | `c181f56` | NTW count badge corrective |
| #45 | `7e13968` | Schedule prop wiring (tip) |

### Missing on-disk historical records (referenced by CURRENT-STATE)

These paths are cited in handoff state but **not present** under `docs/workflow/reviews/` in this workspace. Live + CURRENT-STATE evidence is used instead; do not treat absence as unfinished work:

- `2026-08-08-pr-40-production-algolia-config-record.md`
- `2026-08-08-pr-40-production-source-merge-record.md`
- `2026-08-08-pr-40-app-hosting-production-rollout-record.md`

---

## Step 2 — RC-R1–R8 reconciled to current truth

| ID | Original binding | Current classification | Evidence |
|----|------------------|------------------------|----------|
| RC-R1 | Stage 5 Signoff | **SATISFIED** | `docs/workflow/reviews/2026-08-07-stage-5-generated-asset-cleanup-signoff.md` (`approved_with_notes`) |
| RC-R2 | Functions inventory / allowlist | **SATISFIED** (allowlists **re-stated** below vs tip `7e13968`) | Live `firebase functions:list` 2026-08-08 + `functions/src/index.ts` on `origin/production` |
| RC-R3 | Algolia production readiness | **OPEN** | `ALGOLIA_ADMIN_API_KEY` Secret Manager **NOT_FOUND**; no Portal Algolia secrets in `apphosting.yaml`; CURRENT-STATE PARTIAL config; proposed index `portal_catalog_ready_prod` |
| RC-R4 | Rules sequencing / Portal Stage 4 prerequisite | **SATISFIED** (prerequisite only) | Stage 4 Portal **LIVE** on `build-2026-08-08-004`; Rules **deploy** remains a separate remaining gate (not RC-R4) |
| RC-R5 | App Hosting manual rollout behavior | **SATISFIED** | `rolloutPolicy.disabled=true`; all Aug 8 builds via manual CLI |
| RC-R6 | Production generated Storage cleanup | **OPEN** | Fresh counts: portal-catalog **31557** objs / ~32.5 MiB; catalog-reference **229** objs / ~39.4 MiB — cleanup still separately gated |
| RC-R7 | Pre-merge verification | **SATISFIED** | `…-pre-merge-verification-result.md` PASS WITH NOTES; PR merged |
| RC-R8 | App Hosting Firebase Secret Manager readiness | **SATISFIED** | `apphosting-env-secrets` Signoff CLOSED; live builds use secret-backed YAML |

**Do not** carry RC-R4 as OPEN merely because Rules are undeployed — the RC binding was the Portal cutover prerequisite, now met.

---

## Step 3 — Algolia read-only inventory

### A. Portal runtime

| Check | Result |
|-------|--------|
| `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH` | **Not set / not true** in live App Hosting env surface (`apphosting.yaml` has Firebase web + origin only) |
| Public Algolia config (`APP_ID` / search key / index) | **Not supplied** |
| Ordinary Firestore browse | **Healthy** with Algolia OFF (HTTP 200; TD-031 QA PASS; Home/NTW correctives live) |
| Fail-closed managed search | **Proven in source** at tip (`useCatalogDesigns` Stage 4 comment; `isPortalAlgoliaCatalogConfigured()` requires flag `true` **and** all three public strings) |

### B. Functions configuration

| Item | Result |
|------|--------|
| `ALGOLIA_ADMIN_API_KEY` in prod Secret Manager | **NOT FOUND** (describe only; value not accessed) |
| `ALGOLIA_APP_ID` / `ALGOLIA_PORTAL_CATALOG_INDEX_NAME` live params | **Not configured** on prod (Algolia Functions **absent**; legacy `functions:config` `{}`) |
| Source default index | **`portal_catalog_ready_dev`** (`algoliaAdminClient.ts`) — **must override** before any Algolia Function deploy |
| Risk of silent `_dev` | **HIGH** if Wave A Algolia deploys without params |

### C. Algolia provider

| Item | Status |
|------|--------|
| Production Application decision | **[NEEDS OWNER CHECK]** — CURRENT-STATE awaiting `ALGOLIA PROD APP: SEPARATE\|REUSE WQ6OPP2E6Z` |
| Production App ID | **[NEEDS OWNER CHECK]** |
| Intended index name | Proposed **`portal_catalog_ready_prod`** (workflow proposal; not proven created) |
| Index exists | **[NEEDS OWNER CHECK]** |
| Search-only key readiness | **[NEEDS OWNER CHECK]** |
| Initial reconcile/backfill | **Not run** (Functions absent) |

**Algolia remains OFF. Do not enable.**

---

## Step 4 — Production Functions delta (vs tip `7e13968`)

### Live classification (2026-08-08)

| Function | Classification |
|----------|----------------|
| `syncPortalCatalogDesignToAlgolia` | **SOURCE EXISTS + NOT DEPLOYED** |
| `reconcilePortalCatalogAlgoliaIndex` | **SOURCE EXISTS + NOT DEPLOYED** |
| `reconcilePortalCatalogAlgoliaIndexScheduled` | **SOURCE EXISTS + NOT DEPLOYED** |
| `onTagTaxonomySourceWritten` | **SOURCE EXISTS + NOT DEPLOYED** |
| `onCategoryTaxonomySourceWritten` | **SOURCE EXISTS + NOT DEPLOYED** |
| `rebuildTaxonomyMaterializationCallable` | **SOURCE EXISTS + NOT DEPLOYED** |
| `rebuildTaxonomyMaterialization` | **NOT REQUIRED** as deployable (shared async; not a Gen2 trigger/callable wrapper) |
| `enqueueAiEnrichment` | **LIVE + NEEDS UPDATE** (materialization-aware AI taxonomy loader in tip source) |
| `getPortalGlobalOpenGraph` | **LIVE + NEEDS UPDATE** (substantial Portal FS browse delta in PR #40 tree) |
| `onCategorySnapshotSourceWritten` | **LIVE + SOURCE RETIRED / DELETE CANDIDATE** |
| `onTagSnapshotSourceWritten` | **LIVE + SOURCE RETIRED / DELETE CANDIDATE** |
| `onPortalCatalogSnapshotSourceWritten` | **LIVE + SOURCE RETIRED / DELETE CANDIDATE** |
| `rebuildCatalogSnapshots` | **LIVE + SOURCE RETIRED / DELETE CANDIDATE** |
| `retryPortalCatalogPublication` | **LIVE + SOURCE RETIRED / DELETE CANDIDATE** |
| `onPortalCatalogPublicationStateWritten` | **NOT REQUIRED** to delete (already **ABSENT** on prod) |

**Publisher inventory verified:** **5/6** still live (same as original inventory).

### Exact future allowlists (no broad deploy)

**CREATE (Wave A-Taxonomy) — may proceed without Algolia:**

```text
functions:onTagTaxonomySourceWritten
functions:onCategoryTaxonomySourceWritten
functions:rebuildTaxonomyMaterializationCallable
```

**CREATE (Wave A-Algolia) — blocked until RC-R3 config complete + params ≠ `_dev`:**

```text
functions:syncPortalCatalogDesignToAlgolia
functions:reconcilePortalCatalogAlgoliaIndex
functions:reconcilePortalCatalogAlgoliaIndexScheduled
```

**UPDATE:**

```text
functions:enqueueAiEnrichment
functions:getPortalGlobalOpenGraph
```

**DELETE (Wave B — after Portal Stage 4 live ✅; prefer after Storage Rules deny):**

```text
onCategorySnapshotSourceWritten
onTagSnapshotSourceWritten
onPortalCatalogSnapshotSourceWritten
rebuildCatalogSnapshots
retryPortalCatalogPublication
```

**Forbidden:** `firebase deploy --only functions` (broad).

---

## Step 5 — Taxonomy materialization state

| Item | Result |
|------|--------|
| `taxonomyMaterialization/*` | **Absent** (0 docs; `meta` NOT_FOUND) |
| Bootstrap required? | **Yes** — after taxonomy Functions CREATE (+ Rules for Studio staff-read) |
| Deployed AI Functions materialization-aware? | **No** — live `enqueueAiEnrichment` is pre-tip; tip source **does** prefer materialization with Firestore fallback (`loadAiCatalogReferenceSnapshot`) |
| Bootstrap before Functions update? | **Unsafe for AI benefit** — UPDATE `enqueueAiEnrichment` (and CREATE taxonomy Functions) **before** bootstrap |

Do **not** invoke bootstrap this pass.

---

## Step 6 — Rules reconciliation (exact delta)

Live releases (both **2026-07-30**, pre–PR #40):

| Surface | Live ruleset | Live SHA256 (content) | Tip/worktree blob |
|---------|--------------|----------------------|-------------------|
| Firestore | `198d35a7-…` | `1a3956dc…` | `dc8d7906…` (≠ live) |
| Storage | `fbcb0ee4-…` | `e11cb3bf…` | `162f5167…` (≠ live) |

### Firestore — unapplied tip delta

| Change | Live | Tip `origin/production` |
|--------|------|-------------------------|
| `taxonomyMaterialization/{docId}` staff-read / client-write deny | **Missing** | **Present** |
| `readyAt` optional timestamp validation on designs | **Missing** (0 markers) | **Present** |
| Dedicated `snapshotPublicationState` match | **Present** (`allow read, write: if false`) | **Removed** (comment; default-deny) — **functionally equivalent today** |

### Storage — unapplied tip delta

| Change | Live | Tip |
|--------|------|-----|
| Public read `generated/portal-catalog/**` | **`allow read: if true`** | Matches **removed** → default-deny |
| Public read `generated/catalog-reference/manifest.json` + `…/client/**` | **`allow read: if true`** | Matches **removed** → default-deny |
| Assisted proof limit | **`isValidAssistedCreationProof` = 25 MB** | **80 MB** |
| Customer upload 80 MB | Already present (unrelated) | Present |

**Portal Stage 4 live ⇒ Storage generated-read narrowing is now safe to schedule** (ordinary browse does not depend on generated assets).

Local Rules emulator suite: **not re-run this pass** (docs/planning only). Prior portable JDK suite 59/59 recorded on taxonomy steady-state track; re-run required before Rules deploy phrase execution.

---

## Step 7 — Index reconciliation

| Metric | Value |
|--------|-------|
| Local `firestore.indexes.json` | **71** |
| Live composite indexes | **71** |
| readyAt composites | **4/4 READY** |
| Missing | **0** |
| Unexpected | **0** |

**NO INDEX DEPLOYMENT REMAINS** for PR #40 / readyAt. Do not redeploy indexes.

Evidence: live list 2026-08-08 + `…-index-deploy-record.md` (4/4 READY post-deploy compare).

---

## Step 8 — Generated Storage / publication residual (fresh)

Bucket: `gs://fresh-prints-prod.firebasestorage.app`

| Prefix | Objects | Approx bytes (`du --summarize`) |
|--------|--------:|--------------------------------:|
| `generated/portal-catalog/**` | **31557** | **34133628** (~32.5 MiB) |
| `generated/catalog-reference/**` | **229** | **41291849** (~39.4 MiB) |

| Firestore | Count |
|-----------|------:|
| `snapshotPublicationState` | **2** (`catalog-reference`, `portal-catalog`) |

**Retired publishers still live (5)** ⇒ still **capable of regenerating** generated assets until Wave B delete.

---

## Step 9 — Stage 4 / generated-asset dependency

| Proof | Result |
|-------|--------|
| Ordinary FS browse independent of generated Storage | **YES** — tip Portal Stage 4; live build includes tip |
| Managed search has no generated fallback | **YES** — fail-closed when Algolia off/unconfigured |
| Algolia OFF fails closed only for managed search/facets | **YES** |
| Stage 4 cutover live | **YES** — `build-2026-08-08-004` @ `7e13968` |

Therefore later Storage Rules deny + publisher delete + Storage cleanup are **sequenced hardening/cleanup**, not Portal browse blockers.

---

## Step 10 — Studio production package residual

| Item | Finding |
|------|---------|
| Known production Studio track | Stable **`v1.0.0`**; Aug 4 refresh checkpoint at prod `70c083a`; GitHub Release draft reported **unpublished** in `…-release-blockers-signoff.md` |
| Taxonomy disk-cache IPC in **source** on tip | **YES** (`taxonomyDiskCache.ts` on `origin/production`) |
| Taxonomy disk-cache in **distributed** installer | **NO evidence** of a post–PR #40 packaged Studio release containing tip — treat as **not live** in distributed Studio |
| New Studio package required? | **YES** for staff materialization/disk-cache benefit; **NOT** a Portal customer launch blocker |
| Unintentional inclusion risk | Packaging from current `production` tip would include PR #40 + #42–#45 Portal/docs/functions source — acceptable if intentional tip-based release; still requires separate release approval |

---

## Step 11 — Superseded / completed gates (remove from active sequence)

| Gate | Status |
|------|--------|
| PR #40 merge to `production` | **DONE** |
| App Hosting Secret Manager (`apphosting-env-secrets`) | **DONE** |
| App Hosting Portal cutover (Stage 4) | **DONE** (`build-2026-08-08-001` → rolled forward to **004**) |
| readyAt index deploy | **DONE** (4/4 READY) |
| readyAt backfill / R-018 | **DONE / CLOSED** |
| Home/Discover population corrective | **DONE / CLOSED** |
| TD-031 pagination + NTW count | **DONE / CLOSED** |
| Schedule prop companion PR #45 | **DONE** (live on 004) |
| Pre-merge verification (RC-R7) | **DONE** |
| App Hosting auto-rollout proof (RC-R5) | **DONE** |

---

## Step 12 — Authoritative remaining-gates matrix

| Order | Gate | Current Status | Evidence | Mutation Type | Risk | Rollback | Owner Phrase | Prerequisite | Can Defer Until After Launch? |
|------:|------|----------------|----------|---------------|------|----------|--------------|--------------|-------------------------------|
| 1 | Firestore Rules deploy (PR #40 remaining delta) | **COMPLETE** | Live ruleset `2c0578a0-…`; SHA256 = tip; record `…-prod-firestore-rules-deploy-record.md` | Rules release | Med | Prior `198d35a7-…` | (done) | Portal Stage 4 live ✅ | — |
| 2 | Storage Rules deploy (generated deny + proof 80 MB) | **COMPLETE** | Live `ccb8e2ea-…`; SHA256 = tip; record `…-prod-storage-rules-deploy-record.md` | Rules release | Med–High | Prior `fbcb0ee4-…` | (done) | Gate 1 COMPLETE ✅ | — |
| 3a | Optional Algolia secret deployment-discovery corrective | **SOURCE COMPLETE — Implementation Review approved** | Option E landed; discovery 4/4; Algolia unexported from default index; ADR-FP-129 | Commit/promote to tip then Wave A retry | Low | Revert commits | (done for Implement) → `APPROVE PROD FUNCTIONS WAVE A TAXONOMY RETRY` | Plan+Review approved_with_changes | **YES** |
| 3 | Functions Wave A-Taxonomy CREATE + AI/OG UPDATE | **READY TO RETRY after 3a on production tip** | Prior CLI fail was discovery coupling; CREATE still absent; corrective removes Algolia from default `declaredParams` | Exact same five-function deploy | Med | Redeploy prior digests | `APPROVE PROD FUNCTIONS WAVE A TAXONOMY RETRY` | Gate 3a on tip used for deploy | **YES** for Portal customers |
| 4 | Taxonomy materialization bootstrap | **OPEN** | `meta` absent | Callable invoke | Med | Rebuild / FS fallback retained | `APPROVE PROD TAXONOMY MATERIALIZATION BOOTSTRAP` | Wave A-Taxonomy deployed | **YES** (Studio/AI) |
| 5 | Publisher Function DELETE (5) | **OPEN** | 5/6 still live | Function delete | High (hard restore) | Redeploy pre-Stage-4 publishers (heavy) | `APPROVE PROD FUNCTIONS DELETE: STAGE 4 PUBLISHERS` | Prefer Storage Rules deny first | **YES** |
| 6 | Generated Storage + `snapshotPublicationState` cleanup | **OPEN** | Residual objects/docs | Storage/FS delete | High | None practical | Separate DRY-RUN / DELETE | Gate 5 done | **YES** |
| 7 | Studio production package | **OPEN** | No post-tip installer evidence | Release package | Med | Prior installer | Separate Studio release approval | Prefer Gates 1–4 | **YES** |
| A | Algolia production configuration | **OPEN / PARTIAL** — **optional parallel** | Secret NOT_FOUND | Secrets + dashboard | High if `_dev` | Keep Algolia OFF | `ALGOLIA PROD APP: SEPARATE\|REUSE WQ6OPP2E6Z` … | None | **YES** |
| B | Functions Wave A-Algolia CREATE | **OPEN** — optional | Algolia Functions absent | Scoped Functions deploy | High if `_dev` | Delete Functions; flag off | `APPROVE PROD FUNCTIONS WAVE A ALGOLIA` | Gate A complete | **YES** |
| C | Algolia reconcile + Portal enable | **OPEN** — optional | Flag off | App Hosting env + reconcile | Med | Set flag false | `APPROVE PROD ALGOLIA ENABLE` | Gate B + search-only env | **YES** |

**Index deploy:** removed (complete).
**App Hosting Portal roll for PR #40:** removed (complete; tip live).

---

## Step 13 — Recommended next single owner checkpoint

> **Sequencing amendment (2026-08-08 Rules preflight):** Algolia is an **optional parallel lane**. The production-parity lane next gate is **Rules**, not Algolia config. See `docs/workflow/reviews/2026-08-08-pr-40-prod-rules-deploy-checkpoint.md`.

**Exactly one next checkpoint (amended):**

### `APPROVE PROD FIRESTORE RULES DEPLOY: PR40 REMAINING`

**Why:** Stage 4 Portal is live; Firestore/Storage have a real tip-vs-live delta; taxonomy materialization is absent and needs Rules before staff client reads; Algolia may stay OFF. Storage Rules follow under a **separate** later phrase.

**Optional parallel (not blocking):** owner may still reply `ALGOLIA PROD APP: SEPARATE|REUSE WQ6OPP2E6Z` offline — do not treat as prerequisite for Rules/taxonomy.

---

## Launch blockers vs optional cleanup

| Class | Gates |
|-------|-------|
| **Portal customer launch blockers remaining** | **None** for ordinary Firestore browse (Portal Stage 4 + readyAt + TD-031 live; Algolia OFF by design) |
| **Optional / post-launch (managed search)** | Algolia config → Algolia Functions → enable |
| **Staff / AI performance** | Rules (taxonomy read) → taxonomy Functions → bootstrap → Studio package |
| **Hardening / cost cleanup** | Storage Rules deny generated public reads → publisher DELETE → Storage/doc cleanup |

---

## Acceptance checklist

- [x] current production SHA verified
- [x] current live App Hosting build/source verified
- [x] TD-031 recognized CLOSED
- [x] PR #40 recognized MERGED
- [x] App Hosting rollout recognized complete (tip live)
- [x] readyAt indexes recognized complete
- [x] readyAt backfill recognized complete
- [x] RC-R1–R8 reconciled
- [x] Algolia readiness inventoried; remains OFF
- [x] Functions CREATE/UPDATE/DELETE delta produced
- [x] publisher inventory verified (5/6)
- [x] taxonomy materialization state verified (absent)
- [x] Firestore/Storage Rules deltas determined
- [x] indexes reconciled; no redeploy
- [x] generated Storage residual recounted
- [x] Studio package residual determined
- [x] superseded gates removed from active sequence
- [x] remaining order + one next phrase
- [x] NO production mutation
