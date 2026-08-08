# Plan: Optional Algolia secret — deployment-discovery decoupling

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Author | Planning Agent |
| Status | **approved_with_changes** (Formal Review 2026-08-08) |
| Workflow | managed-phase |
| Managed goal | `functions-optional-algolia-secret-deployment-discovery-corrective` |
| Parent | PR #40 `post-launch-catalog-and-processing-stability` / Wave A Taxonomy |
| Production tip (expected) | `7e139685099f90eb1532771e927384316a432e87` |
| Related | `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-wave-a-taxonomy-deploy-record.md` |

---

## Goal

Decouple **optional** Algolia admin Secret Manager configuration from Firebase Functions **codebase discovery**, so the already-approved Wave A Taxonomy five-function production deploy can proceed **without** creating `ALGOLIA_ADMIN_API_KEY` and **without** advancing the Algolia lane.

This pass: **Plan + Formal Review only**. No implementation, no production mutation.

---

## Background

Owner ran the approved Wave A command:

```bash
firebase deploy --only functions:onTagTaxonomySourceWritten,functions:onCategoryTaxonomySourceWritten,functions:rebuildTaxonomyMaterializationCallable,functions:enqueueAiEnrichment,functions:getPortalGlobalOpenGraph --project fresh-prints-prod --non-interactive
```

Predeploy `tsc` succeeded. Discovery then failed:

```text
Error: In non-interactive mode but have no value for the secret ALGOLIA_ADMIN_API_KEY: ALGOLIA_ADMIN_API_KEY
```

Post-failure inventory (re-verified this investigation): CREATE trio still **ABSENT**; Algolia trio still **ABSENT**; `ALGOLIA_ADMIN_API_KEY` still **NOT FOUND** on prod; Algolia product **OFF**; no bootstrap; publishers still live.

Architecture intent (must preserve): Algolia is an **optional** parallel lane; taxonomy/AI/Portal browse must operate with Algolia OFF; Firestore remains taxonomy authority.

---

## Scope

### In Scope

- Root-cause proof (source + Firebase CLI + local discovery)
- Corrective options A–E evaluation
- Narrow source-structure corrective Plan
- Independent Formal Review
- Test / discovery-proof strategy for a later Implement phase
- Docs/state updates for this investigation
- Record Node/`firebase-functions` warnings as **out-of-scope** maintenance (already TD-009 / TD-010)

### Out of Scope

- Creating `ALGOLIA_ADMIN_API_KEY`
- Accessing any secret value
- Algolia app/config/Functions deploy/enable
- Wave A Functions deploy
- Taxonomy bootstrap
- Publisher delete / Rules / Storage cleanup / App Hosting / Studio
- Node 20 or `firebase-functions` upgrades
- Implementation in this pass

---

## Investigation findings (proven)

### 1. Exact secret declaration

| Item | Evidence |
|------|----------|
| File | `functions/src/lib/secrets.ts` |
| Declaration | `export const algoliaAdminApiKeySecret = defineSecret("ALGOLIA_ADMIN_API_KEY");` (module scope) |
| Shared module | Same file also declares `RESEND_API_KEY`, `BREVO_API_KEY`, `GEMINI_API_KEY`, `ETSY_X_API_KEY` |
| Direct Function bindings | `functions/src/algolia/syncPortalCatalogDesignToAlgolia.ts` (`secrets: [algoliaAdminApiKeySecret]`); `functions/src/algolia/reconcilePortalCatalogAlgoliaIndex.ts` (callable + scheduled) |
| Runtime consumer | `functions/src/algolia/algoliaAdminClient.ts` → `algoliaAdminApiKeySecret.value()` inside `createAlgoliaAdminClient()` (after config gate) |

### 2. Discovery / import chain (why Wave A hits it)

```
firebase deploy --only functions:<Wave A five>
  → loads codebase "default" (firebase.json → functions/)
  → discovery loads functions/src/index.ts (all exports)
  → export enqueueAiEnrichment
       → import { geminiApiKeySecret } from "./lib/secrets"
       → lib/secrets.ts evaluates ALL defineSecret(...) calls
       → registerParam(ALGOLIA_ADMIN_API_KEY) into firebase-functions declaredParams
  → export Algolia trio (also loads algoliaAdminClient defineString params)
  → CLI resolveParams(build.params) for **entire codebase**
  → ensureSecret(ALGOLIA_ADMIN_API_KEY) → Secret Manager NOT FOUND on prod
  → non-interactive abort (zero Functions mutated)
```

**Local proof (non-mutating, after `npm run build` in `functions/`):**

| Load target | `declaredParams` includes `ALGOLIA_ADMIN_API_KEY`? |
|-------------|-----------------------------------------------------|
| `enqueueAiEnrichment` alone | **YES** (also registers RESEND/BREVO/GEMINI/ETSY) |
| `getPortalGlobalOpenGraph` alone | No |
| `onTaxonomySourceWritten` alone | No |
| Full `index.js` | **YES** (+ `ALGOLIA_APP_ID` / `ALGOLIA_PORTAL_CATALOG_INDEX_NAME` as StringParam with defaults) |

SDK evidence: `firebase-functions/lib/params/index.js` — `defineSecret` always `registerParam`s into global `declaredParams`. Firebase Tools `resolveParams` / `ensureSecret` require every secret param in `build.params` to exist in Secret Manager when `--non-interactive`.

### 3. Why `--only` did not help

`--only` filters which **endpoints are targeted for create/update**. It does **not** filter:

- which modules discovery loads (`index.ts` full graph), or
- which entries appear in `build.params` / `declaredParams`

This is **expected Firebase CLI + params SDK behavior**, amplified by a **Fresh Prints source-structure issue**: optional Algolia `defineSecret` lives in a shared module imported by non-Algolia Wave A Function `enqueueAiEnrichment`.

Classification: **A + B + C + D** (all true; B is the Wave A–critical coupling).

### 4. Dev vs production

| Project | `ALGOLIA_ADMIN_API_KEY` |
|---------|-------------------------|
| `fresh-prints-prod` | **NOT FOUND** (confirmed `gcloud secrets list`) |
| `fresh-prints-dev` | **EXISTS** (name only; value not accessed) |

Prior scoped deploys on dev succeeded because the secret already existed (Stage 1b Algolia work). Prod never created it (Algolia lane optional/OFF; RC-R3 OPEN). Other Function secrets required by `secrets.ts` (**GEMINI, RESEND, BREVO, ETSY**) **do** exist on prod — only Algolia is missing, matching the exact error.

### 5. Production mutation check (this investigation)

| Check | Result |
|-------|--------|
| CREATE taxonomy trio | still **ABSENT** |
| Algolia Functions | still **ABSENT** |
| `ALGOLIA_ADMIN_API_KEY` on prod | still **NOT FOUND** |
| Tip SHA | `7e139685099f90eb1532771e927384316a432e87` |

### 6. Runtime warnings (OUT OF SCOPE)

Owner CLI also warned Node.js 20 deprecation and outdated `firebase-functions`. **Not the failure cause.** Already tracked:

- TD-009 — Node.js 20 runtime upgrade
- TD-010 — `firebase-functions` package upgrade

Do **not** combine with this corrective.

---

## Options analysis

### Option A — Create prod `ALGOLIA_ADMIN_API_KEY` solely to unblock Wave A

| | |
|--|--|
| Verdict | **REJECTED as primary corrective** |
| Why | Advances optional Algolia Secret Manager readiness merely to deploy unrelated taxonomy/AI Functions; contradicts “Algolia optional / OFF” architecture; prior Wave A authorization explicitly excluded Algolia secret set |
| When acceptable | Only as last-resort owner secret checkpoint if source decoupling is proven impossible — **not the case here** |

### Option B — Refactor secret declaration / import structure

| | |
|--|--|
| Verdict | **NECESSARY but not sufficient alone** |
| Action | Move `defineSecret("ALGOLIA_ADMIN_API_KEY")` out of `functions/src/lib/secrets.ts` into an Algolia-only module (e.g. `functions/src/algolia/algoliaSecrets.ts` or colocate in `algoliaAdminClient.ts`) |
| Why needed | Stops `enqueueAiEnrichment` → `lib/secrets` from registering Algolia into `declaredParams` |
| Gap | While `index.ts` still **unconditionally exports** Algolia Functions, discovery still loads Algolia modules → Algolia `defineSecret` still registers → Wave A still fails |

### Option C — Separate Firebase Functions codebase for Algolia

| | |
|--|--|
| Verdict | **Viable long-term; heavier than needed now** |
| Notes | `firebase.json` already uses a `functions` array (`codebase: "default"`). Multi-codebase is a supported Firebase pattern, but Fresh Prints has no second Functions codebase today — introducing one expands deploy ops, CI, and ownership |
| Use when | Optional Algolia lane must remain exportable indefinitely without affecting default discovery |

### Option D — Conditional / non-`defineSecret` admin credential strategy

| | |
|--|--|
| Verdict | **Not preferred** |
| Notes | Runtime Secret Manager client without `secrets:` binding changes IAM/patterns vs established `defineSecret` usage; risk of weaker consistency; still must fail-closed; must never use plaintext/Firestore/client admin keys |
| Runtime no-op already exists | `isAlgoliaPortalCatalogSyncConfigured()` gates on `ALGOLIA_APP_ID` (defineString default `''`) before admin client use |

### Option E — Narrow combo (SELECTED)

| | |
|--|--|
| Verdict | **SELECTED** |
| Steps | (1) Option B split of Algolia `defineSecret` out of shared `secrets.ts`; (2) Remove (or stop importing) Algolia trio exports from default `functions/src/index.ts` while Algolia remains optional/OFF; (3) Keep Algolia source modules intact for later Wave A-Algolia; (4) Document re-export + secret existence as prerequisites before Algolia Functions deploy |
| Why safer than Option A | Restores intended optional-lane semantics in source; no fake/prod placeholder secrets; no Algolia enablement; Wave A allowlist unchanged |
| Dev risk | `fresh-prints-dev` already has live Algolia Functions. After unexport, a **full** codebase Functions deploy (no `--only`) could propose deleting those endpoints. Mitigation: keep using scoped `--only` deploys; restore Algolia exports before any intentional Algolia/full deploy; Formal Review must call this out |

---

## Selected approach (Implement later — not this pass)

1. **Split secret declaration** — `ALGOLIA_ADMIN_API_KEY` leaves `functions/src/lib/secrets.ts`; Algolia modules import from Algolia-local module only.
2. **Decouple discovery graph** — remove Algolia trio `export` lines from `functions/src/index.ts` (or move to a non-imported barrel) while Algolia lane is OFF.
3. **Preserve fail-closed Algolia runtime** — when later re-exported and configured: retain `secrets: [algoliaAdminApiKeySecret]`, retain `isAlgoliaPortalCatalogSyncConfigured()` early returns, retain Secret Manager–only admin key.
4. **Do not change Wave A five-function allowlist.**
5. **No production deploy in the corrective Implement phase** unless separately authorized; after merge to `production`, Wave A deploy remains under existing / re-confirmed owner phrase.
6. **Proof before claiming deploy-ready** — local `declaredParams` checks (below); then owner-authorized Wave A retry.

### Why this is safer than creating the optional Algolia secret

- Does not pretend Algolia is configured
- Does not store placeholder/fake credentials in prod Secret Manager
- Does not authorize Algolia Functions or Portal enable
- Aligns discovery with product policy: optional lane must not block taxonomy

### Exact files expected to change (Implement)

| File | Change |
|------|--------|
| `functions/src/lib/secrets.ts` | Remove `algoliaAdminApiKeySecret` / Algolia `defineSecret` |
| `functions/src/algolia/algoliaSecrets.ts` (**new**) or `algoliaAdminClient.ts` | Own `defineSecret("ALGOLIA_ADMIN_API_KEY")` |
| `functions/src/algolia/syncPortalCatalogDesignToAlgolia.ts` | Import secret from Algolia-local module |
| `functions/src/algolia/reconcilePortalCatalogAlgoliaIndex.ts` | Same |
| `functions/src/algolia/algoliaAdminClient.ts` | Import secret from Algolia-local module (if split file) |
| `functions/src/index.ts` | Remove/stop Algolia trio exports while optional/OFF |
| Docs | `BACKEND.md` / `DEPLOYMENT.md` / `TECH_DEBT` or DECISIONS note; Wave A deploy record cross-link; remaining-gates matrix |
| Tests | Update any imports; add static/unit guard that default entry `declaredParams` excludes Algolia secret when Algolia exports absent |

Wave A allowlist Functions’ own logic: **unchanged** unless a test import path requires adjustment.

---

## Affected Areas

### Architecture Impact

- [x] Details: Optional Algolia Functions leave the default discovery export surface until Algolia lane is intentionally enabled; shared secrets module no longer registers optional Algolia secret for all consumers.

### Security Impact

- [x] Details: Admin key remains Secret Manager–only when Algolia is later configured; no plaintext; no client admin credentials; Portal search-only unchanged; unconfigured paths remain no-op / fail-closed; taxonomy/AI independent of Algolia.

### Data Model / UI Impact

- [x] None

### Backend Impact

- [x] Details: Functions export surface + secret module boundaries only. No Algolia product enable. No Rules/indexes.

### Migration Impact

- [x] None for Firestore/Storage. Functions: Algolia remain absent on prod (no delete). Dev: avoid unfiltered full Functions deploy until exports restored or Algolia deletion is intentional.

---

## Approach (Implement sequence — later)

1. Implement Option E source changes on a branch from current tip.
2. Run automated proofs (Test Strategy).
3. Update docs stating: Algolia Functions are not part of default `index` exports while Algolia OFF; Wave A-Algolia requires secret set + re-export + scoped Algolia deploy.
4. Signoff corrective (source only).
5. Promote/merge under normal PR process — **not** auto Wave A deploy.
6. Re-run Wave A five-function deploy under production authorization (separate checkpoint).

---

## Test Strategy

### Automated

| Check | Command / method | Required |
|-------|------------------|----------|
| Functions build | `npm run build` in `functions/` | yes |
| Lint (touched files) | project eslint on changed paths | yes |
| Existing Algolia unit tests | current repo Algolia test paths (do not invent) | yes |
| Taxonomy / AI focused tests | existing Wave A suites | yes |
| **Discovery proof** | Node script: load compiled default entry / `enqueueAiEnrichment`; assert `declaredParams` has **no** `ALGOLIA_ADMIN_API_KEY`; load Algolia module in isolation; assert secret **is** registered there | yes |
| `git diff --check` | yes | yes |

### Manual / non-prod discovery

- Prefer local `declaredParams` proof (above).
- **Do not** run production deploy as proof during Implement.
- Optional later: owner Wave A retry on prod after merge (separate authorization).

### Deployment-discovery proof strategy

1. **Pre-implement (done):** enqueueAiEnrichment alone registers ALGOLIA (baseline fail).
2. **Post-implement (required):** enqueueAiEnrichment + full index **must not** register ALGOLIA; Algolia module alone **must**.
3. **Production attempt:** only after merge + Wave A deploy phrase; if still fails, STOP and re-diagnose (do not create secret as silent fix).

---

## Human Checkpoints Anticipated

- [x] Other: Owner authorizes **Implement** of this corrective (source only)
- [x] Production deploy: Wave A five-function deploy remains a **separate** existing gate after corrective lands on `production`
- [ ] Secrets / Algolia config: **not** required for this corrective
- [ ] Option A secret set: **not** recommended

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Unexport causes accidental Algolia Function deletion on **dev** full deploy | Med | Document scoped `--only`; restore exports before Algolia work; avoid full Functions deploy on dev until then |
| Re-export forgotten before Algolia lane | Low | Checklist on Wave A-Algolia checkpoint; remaining-gates matrix note |
| Someone still creates placeholder secret | Low | Plan explicitly rejects Option A as primary |
| CLI behavior changes in future firebase-tools | Low | Local declaredParams proof is SDK-level and stable |

---

## Rollback Plan

- Revert the corrective commit(s) on the branch / production tip.
- Restoring Algolia exports + shared `defineSecret` returns to today’s discovery coupling (dev still works; prod Wave A still blocked without secret).
- No data migration to roll back.

---

## Documentation Updates Required

- [ ] BACKEND.md / DEPLOYMENT.md — optional Algolia Functions not on default export surface while OFF; discovery/secret coupling note
- [ ] DECISIONS.md — short ADR: optional Algolia must not register `defineSecret` via shared secrets / default index
- [ ] TECH_DEBT — optional note if multi-codebase (Option C) deferred
- [x] TD-009 / TD-010 — already cover Node/`firebase-functions` warnings (no change required beyond referencing)
- [ ] Wave A deploy record — cross-link this Plan/Review; supersede “create secret to unblock” as primary path
- [ ] Remaining-gates reconciliation matrix — insert corrective before Wave A retry

---

## Open Questions

- [x] None blocking Plan/Review — Option E does not require owner Algolia configuration decision
- [ ] Optional later: whether to adopt Option C multi-codebase after launch — **deferred**, not required to unblock Wave A

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-08-functions-optional-algolia-secret-deployment-discovery-corrective-review.md`
- Verdict: **approved_with_changes**
- Implement must include: discovery `declaredParams` regression guard; dev full-deploy caution; DECISIONS ADR + BACKEND/DEPLOYMENT notes; supersede Option A secret-unblock as primary path
