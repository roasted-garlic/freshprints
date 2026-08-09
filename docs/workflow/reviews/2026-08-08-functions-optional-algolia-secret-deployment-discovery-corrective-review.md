# Review: Optional Algolia secret — deployment-discovery decoupling

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Reviewer | Review Agent (independent Formal Review) |
| Plan | `docs/workflow/plans/2026-08-08-functions-optional-algolia-secret-deployment-discovery-corrective-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

The Plan correctly proves that Wave A failed because Firebase discovers **all** `defineSecret` params registered while loading the default Functions codebase — and Fresh Prints registers optional `ALGOLIA_ADMIN_API_KEY` via shared `lib/secrets.ts` (imported by `enqueueAiEnrichment`) plus unconditional Algolia exports. Selected Option E (split secret + remove Algolia from default `index` exports while OFF) is architecture- and security-aligned and correctly **rejects** creating the Algolia secret as the primary unblock. Implementation must apply the listed documentation and test-guard changes; no production mutation in the corrective Implement phase.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | **pass** | Plan/Review only; no secret create; no Wave A deploy in corrective |
| Architecture alignment | **pass** | Optional Algolia lane; Firestore taxonomy authority preserved |
| Security impact addressed | **pass** | Secret Manager–only admin key when later enabled; fail-closed retained |
| Data model impact addressed | **pass** | None |
| Backend impact addressed | **pass** | Export surface + secret module boundary only |
| Test strategy adequate | **pass** | Local `declaredParams` proof is the right non-prod discovery check |
| Human checkpoints identified | **pass** | Implement auth; Wave A deploy remains separate |
| Roadmap alignment | **pass** | Unblocks Wave A without forcing RC-R3 |
| Documentation plan | **pass** | Requires ADR + BACKEND/DEPLOYMENT notes (see required changes) |
| No silent scope expansion | **pass** | Wave A allowlist unchanged; no Node/`firebase-functions` upgrades |

---

## Architecture Review

**Findings:**

- Root cause classification **A+B+C+D** is evidenced: unconditional Algolia exports; shared module-scope `defineSecret`; endpoint secret bindings; Firebase CLI resolves **all** codebase `build.params` secrets regardless of `--only`.
- Local proof that `enqueueAiEnrichment` alone registers `ALGOLIA_ADMIN_API_KEY` is decisive for Wave A (B), not merely Algolia export presence.
- Option E correctly notes B alone is insufficient while Algolia remains exported from `index.ts`.
- Option C (second codebase) is appropriately deferred — supported by Firebase, but not Fresh Prints’ current convention; not required to unblock Wave A.
- Dev deletion risk if Algolia exports are removed and someone runs an unfiltered Functions deploy on `fresh-prints-dev` is real and must stay visible in Implement + Signoff.

**Required changes:**

- [x] In Implement docs/signoff: add an explicit **dev full-deploy caution** checklist item (scoped `--only` until Algolia exports restored).
- [x] Record in remaining-gates matrix that Wave A retry depends on this corrective landing on `production`, **not** on Option A secret set.

---

## Security Review

**Findings:**

- Rejecting Option A as primary is correct: placeholder/prod secret creation would blur optional-lane boundaries and invite accidental Algolia Function deploys against incomplete config.
- Selected path preserves: admin key only in Secret Manager when Algolia is intentionally configured; Portal search-only unchanged; no admin key in Firestore/client/git; Algolia sync/reconcile remain gated by `isAlgoliaPortalCatalogSyncConfigured()` when re-exported.
- No secret values were accessed during investigation (prod NOT FOUND; dev existence metadata only).

**Required changes:**

- [ ] None beyond Plan’s fail-closed retainment

**Human approval needed before production:**

- [x] Corrective **source** merge/promotion to `production` (normal release discipline)
- [x] Subsequent Wave A five-function **deploy** (existing production gate — unchanged allowlist)
- [ ] **Not** required: `ALGOLIA_ADMIN_API_KEY` secret set for this corrective

---

## Data Model Review

**Findings:** None.

**Required changes:**

- [ ] None

---

## Backend Review

**Findings:**

- Single codebase `default` in `firebase.json` confirmed.
- Runtime no-op path already exists; discovery coupling is the bug, not missing runtime guards.
- Wave A five-function allowlist must remain identical after corrective.

**Required changes:**

- [x] Implement must add a **regression guard** (unit or static test) asserting default entry / `enqueueAiEnrichment` load path does **not** register `ALGOLIA_ADMIN_API_KEY` in `declaredParams` while Algolia exports are absent.

---

## Testing Review

**Findings:**

- Local `declaredParams` methodology is sound and safer than a production deploy attempt for proof.
- Existing Algolia / taxonomy / AI tests should be re-run; do not invent missing suites.

**Required changes:**

- [x] Make the discovery regression guard **required** (not optional) in Implement acceptance.

---

## Documentation Review

**Findings:**

- Plan correctly points at BACKEND/DEPLOYMENT/DECISIONS and superseding the prior “secret set to unblock” recommendation.
- TD-009 / TD-010 already cover Node/`firebase-functions` warnings — good separation.

**Required changes:**

- [x] Update `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-wave-a-taxonomy-deploy-record.md` so next checkpoint is **this corrective**, not `APPROVE PROD ALGOLIA_ADMIN_API_KEY SECRET SET: WAVE A UNBLOCK ONLY`.
- [x] Add a short ADR entry in `DECISIONS.md` during Implement (not optional).

---

## Required Changes (approved_with_changes)

1. Treat **discovery regression guard** (`declaredParams` excludes Algolia on default/Wave A load path) as a hard Implement acceptance criterion.
2. Document **dev full Functions deploy caution** after Algolia unexport.
3. Supersede Option A secret-unblock phrase in Wave A deploy record + workflow state; next phrase is **Implement authorization** for this corrective.
4. During Implement, write the DECISIONS ADR + BACKEND/DEPLOYMENT note (do not skip as “later”).

---

## Blockers

None. Plan may proceed to Implement after owner authorizes this managed goal’s implementation.

---

## Verdict Rationale

**approved_with_changes** — root cause proven; Option E is the narrowest architecture-safe fix; Option A correctly rejected; security and Wave A containment preserved. Changes are documentation/test-guard tightening for Implement, not a redesign.

---

## Next Step

Owner authorizes Implement (source only). **Do not** create Algolia secret. **Do not** deploy Wave A until corrective is on `production` and separately authorized.

**Exactly one next owner checkpoint:**

`APPROVE IMPLEMENT: OPTIONAL ALGOLIA SECRET DISCOVERY CORRECTIVE`
