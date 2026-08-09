# Checkpoint: Production Algolia Gate C — Portal enable

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Managed goal | `pr-40-prod-algolia-gate-c-enable` |
| Authorization | Owner **`APPROVE PROD ALGOLIA ENABLE`** |
| Plan | `docs/workflow/plans/2026-08-09-prod-algolia-gate-c-enable-plan.md` |
| Formal Review | **approved** |
| Prerequisites | C-reconcile COMPLETE — 46/46 on `portal_catalog_ready_prod` |
| Phase | **OWNER: search-only key + App Hosting secrets — STOP before rollout** |

---

## Goal

Enable Portal managed search with:

| Variable | Required value |
|----------|----------------|
| `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH` | `true` |
| `NEXT_PUBLIC_ALGOLIA_APP_ID` | `Z1FVCM5QUX` |
| `NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY` | **Search-only** (not Admin) |
| `NEXT_PUBLIC_ALGOLIA_INDEX_NAME` | `portal_catalog_ready_prod` |

---

## Step 1 — Algolia Search-Only API Key (owner console)

In Algolia Application **`Z1FVCM5QUX`**:

1. Create an API key with ACL **`search` only** (no addObject/delete/settings/admin).
2. Restrict to index **`portal_catalog_ready_prod`** only.
3. Do **not** paste the key into chat.

---

## Step 2 — App Hosting secrets (owner CLI)

Do **not** commit values. Use Firebase CLI prompts (stdin):

```powershell
cd C:\coding\fresh-prints

firebase apphosting:secrets:set NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH --project fresh-prints-prod
# value: true

firebase apphosting:secrets:set NEXT_PUBLIC_ALGOLIA_APP_ID --project fresh-prints-prod
# value: Z1FVCM5QUX

firebase apphosting:secrets:set NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY --project fresh-prints-prod
# value: <search-only key from Step 1>

firebase apphosting:secrets:set NEXT_PUBLIC_ALGOLIA_INDEX_NAME --project fresh-prints-prod
# value: portal_catalog_ready_prod

firebase apphosting:secrets:grantaccess NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH --backend fresh-prints-portal --project fresh-prints-prod
firebase apphosting:secrets:grantaccess NEXT_PUBLIC_ALGOLIA_APP_ID --backend fresh-prints-portal --project fresh-prints-prod
firebase apphosting:secrets:grantaccess NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY --backend fresh-prints-portal --project fresh-prints-prod
firebase apphosting:secrets:grantaccess NEXT_PUBLIC_ALGOLIA_INDEX_NAME --backend fresh-prints-portal --project fresh-prints-prod
```

Optional local (gitignored) for reference builds only — never commit:

`apps/portal/.env.production.local` may mirror the same four vars for local prod-like builds.

---

## Step 3 — Reply

**`ALGOLIA PORTAL SECRETS: READY`**

(Do not include key values.)

Then agent will: update `apphosting.yaml` secret refs → promote to `production` → owner rollout commands → QA checklist.

---

## Later phrases (after secrets)

| Step | Phrase |
|------|--------|
| Source on tip | `ALGOLIA ENABLE SOURCE PROMOTED: PASS` |
| Rollout | `PROD ALGOLIA ENABLE ROLLOUT: COMPLETE` |
| QA | `PROD ALGOLIA ENABLE QA: PASS` |

---

## Explicitly forbidden until secrets READY + yaml + rollout

- Pasting Admin or Search API key values into chat/docs
- Using index `portal_catalog_ready_dev`
- App Hosting rollout before secrets exist (would fail or ship without Algolia)
- Functions/Rules/Studio changes in this gate

---

## Confirmations (this prepare pass)

- Plan + Review **approved**
- NO yaml promote yet
- NO App Hosting rollout yet
- NO secrets created by agent
