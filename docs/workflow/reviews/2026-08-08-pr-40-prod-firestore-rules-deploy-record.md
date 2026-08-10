# Deploy Record: PR #40 production Firestore Rules

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Authorization | `APPROVE PROD FIRESTORE RULES DEPLOY: PR40 REMAINING` |
| Owner report | `PROD FIRESTORE RULES DEPLOY: COMPLETE` |
| Project | **`fresh-prints-prod`** |
| Scope | **`firestore:rules` only** |
| Status | **COMPLETE — VERIFY PASS** |
| Source SHA | `7e139685099f90eb1532771e927384316a432e87` |
| `firestore.rules` blob | `dc8d7906d414884c8886cd89b9cf24d651bd2055` |
| `firestore.rules` SHA256 | `48c213109b35d55716322f22d3d3f0551d47e1b71580f09998b1caf83125a022` |
| Checkpoint | `docs/workflow/reviews/2026-08-08-pr-40-prod-rules-deploy-checkpoint.md` |

---

## Pre-deploy (agent; earlier same day)

| Check | Result |
|-------|--------|
| Clean `production` tip | **PASS** |
| Rules identity vs checkpoint | **MATCH** |
| `npm run test:rules` | **59/59** exit 0 |
| Taxonomy alignment | **2/2** exit 0 |
| Agent deploy | **Hook-blocked** (owner CLI required) |

---

## Owner deployment

| Item | Value |
|------|-------|
| Executor | **Owner (manual CLI)** |
| Command | `firebase deploy --only firestore:rules --project fresh-prints-prod --non-interactive` |
| Owner phrase after success | `PROD FIRESTORE RULES DEPLOY: COMPLETE` |

---

## Post-deploy verification (agent; read-only) — **PASS**

### Identity

| Item | Value |
|------|-------|
| `origin/production` | `7e139685099f90eb1532771e927384316a432e87` |
| App Hosting | **100%** `build-2026-08-08-004` @ same SHA |
| Auto-rollout | **disabled** |
| Algolia | **OFF** |

### Firestore Rules release

| Item | Before | After |
|------|--------|-------|
| Ruleset ID | `198d35a7-c309-4c0b-97e0-80e0458c0c01` | **`2c0578a0-9764-4081-a5b3-6a5f23795e7d`** |
| Release updateTime | 2026-07-30 / prior | **2026-08-08T21:29:48Z** (observed local) |
| Content SHA256 | `1a3956dc…` | **`48c213109b35d55716322f22d3d3f0551d47e1b71580f09998b1caf83125a022`** |
| Match tip source | no | **YES (exact)** |

Live release changed: **YES** (prior ruleset no longer current).

### Approved markers

| Marker | Live |
|--------|------|
| `taxonomyMaterialization/{docId}` staff-read | **YES** |
| Client writes denied (`create, update, delete: if false`) | **YES** |
| `isOptionalTimestamp(data, "readyAt")` | **YES** |
| Dedicated `snapshotPublicationState` match | **ABSENT** (default-deny) |

Unexpected Rules delta vs tip: **NONE**.

### Storage Rules (control)

| Item | Value |
|------|-------|
| Ruleset | `fbcb0ee4-732e-420f-afff-01041d2eee1b` (**unchanged**) |
| Implication | Storage Rules deploy **not** performed this gate |

### Portal smoke (narrow)

| Path | Status | Notes |
|------|--------|-------|
| `/` | **200** | no `fresh-prints-dev`; no Algolia markers; no permission-denied markers in HTML |
| `/catalog` | **200** | same |

---

## Remaining-gates status (after this verify)

| Gate | Status |
|------|--------|
| Firestore Rules | **COMPLETE** |
| Storage Rules | **NEXT** |
| Functions Wave A-Taxonomy | pending |
| Taxonomy bootstrap | pending |
| Algolia | optional / OFF |
| Publisher delete | pending |
| Storage cleanup | pending |
| Studio package | pending |
| Final smoke | pending |

---

## Confirmations

- PROD FIRESTORE RULES VERIFY: **PASS**
- NO Storage Rules deploy (this pass)
- NO Functions deploy/delete
- NO taxonomy bootstrap
- NO Algolia change
- NO index/backfill
- NO Storage cleanup
- NO App Hosting rollout
- NO Studio release

---

## Next owner checkpoint (ONE)

`APPROVE PROD STORAGE RULES DEPLOY: PR40 REMAINING`
