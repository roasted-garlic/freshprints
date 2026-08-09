# Plan: Production Algolia Gate C — Portal enable

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Managed goal | `pr-40-prod-algolia-gate-c-enable` |
| Authorization | Owner **`APPROVE PROD ALGOLIA ENABLE`** |
| Related | Reconcile COMPLETE `docs/workflow/reviews/2026-08-09-prod-algolia-gate-c-reconcile-apply-record.md` |

---

## Goal

Turn on Portal managed catalog search against the SEPARATE production Algolia app/index already populated (46 records): App ID `Z1FVCM5QUX`, index `portal_catalog_ready_prod`, using a **search-only** API key (never admin). Deliver via App Hosting Secret Manager + `apphosting.yaml` secret refs + production rollout.

---

## Background

- Gates A–B + C-reconcile COMPLETE; Functions sync/reconcile ACTIVE; index populated.
- Portal `isPortalAlgoliaCatalogConfigured()` requires flag `true` **and** appId + searchApiKey + indexName.
- Current `apphosting.yaml` has Firebase web + origin secrets only — no Algolia vars (search OFF).
- Prior App Hosting pattern: `secret:` refs + `firebase apphosting:secrets:set` / `grantaccess` on backend `fresh-prints-portal`.

---

## Scope

### In Scope

- Owner: create Algolia **Search-Only** key (ACL `search`, index `portal_catalog_ready_prod` only)
- Owner: create/grant four App Hosting secrets on `fresh-prints-prod`
- Repo: add four `secret:` env entries to `apps/portal/apphosting.yaml`
- Promote yaml to `production` tip; App Hosting rollout of that tip
- Smoke / owner QA that managed search works; kill-switch documented
- Docs: DEPLOYMENT/BACKEND brief notes; workflow records; reconciliation update

### Out of Scope

- Admin API key in Portal / chat
- Index `portal_catalog_ready_dev` on prod
- Re-reconcile (already COMPLETE) unless QA finds empty index
- GA4 / unrelated App Hosting env
- Functions redeploy / Rules / Studio

---

## Required env (Portal)

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH` | `true` |
| `NEXT_PUBLIC_ALGOLIA_APP_ID` | `Z1FVCM5QUX` |
| `NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY` | Search-only key (owner-created; never admin) |
| `NEXT_PUBLIC_ALGOLIA_INDEX_NAME` | `portal_catalog_ready_prod` |

All four delivered as App Hosting secrets (same hygiene as existing Firebase web config).

---

## Approach

1. Plan + Formal Review (this gate).
2. Owner creates search-only key + sets/grants four secrets → `ALGOLIA PORTAL SECRETS: READY`.
3. Implement `apphosting.yaml` secret refs → promote to `production`.
4. Owner App Hosting rollout (exact tip) → verify build live.
5. Owner QA managed search → `PROD ALGOLIA ENABLE QA: PASS` → record + close.

### Kill-switch

Set `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH` secret to `false` (or remove) and roll out — Portal falls back to Firestore browse (fail-closed for managed search only).

---

## Test Strategy

### Automated

| Check | Required |
|-------|----------|
| No app logic change expected | n/a unless yaml-only |
| Tip contains Algolia `secret:` refs before rollout | yes |

### Manual

- [ ] Catalog search returns results (managed path)
- [ ] Facets/filters behave vs pre-enable baseline
- [ ] Ordinary browse still works if flag flipped off (document; optional immediate kill-switch test deferred)
- [ ] Live HTML/build does not use `_dev` index name

---

## Human Checkpoints Anticipated

- [x] Production secrets / external Algolia key create
- [x] App Hosting production rollout
- [x] Manual search QA

### Phrases

| Step | Phrase |
|------|--------|
| Authorize (done) | `APPROVE PROD ALGOLIA ENABLE` |
| Secrets ready | `ALGOLIA PORTAL SECRETS: READY` |
| Source on production | `ALGOLIA ENABLE SOURCE PROMOTED: PASS` (or PR merge notice) |
| Rollout done | `PROD ALGOLIA ENABLE ROLLOUT: COMPLETE` |
| QA | `PROD ALGOLIA ENABLE QA: PASS` |

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Admin key used as search key | High | Explicit search-only ACL; never paste admin |
| Wrong index (`_dev`) | High | Hard-code prod index name in checkpoint/secrets |
| Rollout before secrets exist | High | Secrets READY before rollout; yaml after or with secrets |
| Search empty / misconfig | Med | Reconcile already 46/46; fail-closed if misconfigured |
| Key leaked in chat | Med | Owner sets via CLI stdin; no values in docs |

---

## Rollback Plan

1. Set `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH=false` in Secret Manager.
2. Roll out same or prior tip.
3. Optional: remove Algolia secret refs from yaml on a follow-up.

---

## Documentation Updates Required

- [x] Other: enable plan/checkpoint/review/records; reconciliation C-enable row
- [ ] DEPLOYMENT.md — Algolia Portal secret names (brief)
- [ ] `.env.example` — note prod index name

---

## Open Questions

- [x] None blocking — App ID / index known; search key owner-created

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-09-prod-algolia-gate-c-enable-plan-review.md`
- Verdict: **approved**
