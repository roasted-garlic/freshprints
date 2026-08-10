# Checkpoint: Algolia production configuration — SEPARATE app (Gate A)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Managed goal | `pr-40-prod-algolia-config` (optional lane) |
| Owner phrase | **`ALGOLIA PROD APP: SEPARATE`** |
| Decision | **SEPARATE** production Algolia Application (do **not** reuse `WQ6OPP2E6Z`) |
| Status | **DECISION RECORDED — await App ID + admin secret + index prep** |
| Enable flag | Remains **OFF** until Gate C (`APPROVE PROD ALGOLIA ENABLE`) |
| Tip | `ebcfaf29757d0c107a4ff9f7ad2561816f66f4b0` |
| Parent | PR #40 remaining production gates — optional Algolia lane |

---

## Decision log

| Choice | Result |
|--------|--------|
| Production Algolia Application | **SEPARATE** new Application (not `WQ6OPP2E6Z`) |
| Dev Application | Unchanged (keep isolated) |
| Intended index name | **`portal_catalog_ready_prod`** (must **not** be `portal_catalog_ready_dev`) |
| Portal enable | **false** until Gate C |

---

## Owner checklist (offline — Algolia dashboard + Firebase)

Do **not** paste Admin or Search API key values into chat, git, or docs.

### 1. Create SEPARATE Algolia Application

- New Application for **production** only
- Prefer US / closest to Firebase `fresh-prints-prod`

### 2. Create index

- Name: **`portal_catalog_ready_prod`**
- Settings can be applied by reconcile later (searchableAttributes / faceting / customRanking per Stage 1b); empty index OK for now

### 3. Keys

| Credential | Where |
|------------|--------|
| **Application ID** | Reply in chat (public-ish); also for Functions `ALGOLIA_APP_ID` + later Portal `NEXT_PUBLIC_ALGOLIA_APP_ID` |
| **Admin API Key** | Firebase Secret Manager only — never chat |
| **Search-Only API Key** | Later at Gate C (Portal App Hosting); restrict ACL `search` + index `portal_catalog_ready_prod` only |

### 4. Set admin secret on `fresh-prints-prod` (owner CLI)

```powershell
firebase functions:secrets:set ALGOLIA_ADMIN_API_KEY --project fresh-prints-prod
```

(Paste key only into the secret prompt — not into this chat.)

### 5. Reply format (after app + secret)

```text
ALGOLIA PROD APP ID: <ApplicationId>
ALGOLIA PROD INDEX: portal_catalog_ready_prod
ALGOLIA ADMIN SECRET: READY
```

Optional (search-only can wait until enable):

```text
ALGOLIA SEARCH KEY: READY
```

---

## Explicitly forbidden this gate

- Enabling `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH`
- Deploying Algolia Functions (Gate B — separate phrase)
- Reconcile / enable (Gate C)
- Using `portal_catalog_ready_dev` on prod
- Reusing Application `WQ6OPP2E6Z`
- Pasting any secret values into chat/docs

---

## After owner READY replies

Next phrase (ONE): **`APPROVE PROD FUNCTIONS WAVE A ALGOLIA`**

That deploys the Algolia trio to `fresh-prints-prod` with params:

- `ALGOLIA_APP_ID=<ApplicationId>`
- `ALGOLIA_PORTAL_CATALOG_INDEX_NAME=portal_catalog_ready_prod`

(Requires Option E tip already live — **yes** on `ebcfaf29` / PR #46 ancestry.)

---

## Confirmations (this agent pass)

- SEPARATE decision **recorded**
- NO secret create by agent
- NO Functions deploy
- NO Portal enable
- NO App Hosting change

**STOP** pending owner App ID + `ALGOLIA ADMIN SECRET: READY`.
