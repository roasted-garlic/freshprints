# Deploy Record: PR #40 production Storage Rules

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Authorization | `APPROVE PROD STORAGE RULES DEPLOY: PR40 REMAINING` |
| Owner report | `PROD STORAGE RULES DEPLOY: COMPLETE` |
| Project | **`fresh-prints-prod`** |
| Scope | **`storage` only** |
| Status | **COMPLETE — VERIFY PASS** |
| Source SHA | `7e139685099f90eb1532771e927384316a432e87` |
| `storage.rules` blob | `162f516726fb14283a8f803facff40f8c7e12436` |
| `storage.rules` SHA256 | `ac3a6830b4d48a9f7a49748da02accb228d6c28ad14bbb38debfa30f2708ada2` |
| Prior live Storage ruleset | `fbcb0ee4-732e-420f-afff-01041d2eee1b` |
| New live Storage ruleset | **`ccb8e2ea-74e6-4ed6-b1f8-e3cb3e386cd6`** |
| Firestore Rules | **COMPLETE / UNTOUCHED** — `2c0578a0-9764-4081-a5b3-6a5f23795e7d` |
| Checkpoint | `docs/workflow/reviews/2026-08-08-pr-40-prod-rules-deploy-checkpoint.md` |

---

## Pre-deploy (agent; earlier same day)

| Check | Result |
|-------|--------|
| Clean tip + identity | **PASS** |
| Stage 4 Portal generated refs | **NONE** |
| Proof 80 MB contract | **PASS** |
| `npm run test:rules` | **59/59** |
| Alignment (storage+proof+taxonomy) | **16/16** |
| Agent deploy | **Hook-blocked** → owner CLI |

---

## Owner deployment

| Item | Value |
|------|-------|
| Executor | **Owner (manual CLI)** |
| Command | `firebase deploy --only storage --project fresh-prints-prod --non-interactive` |
| Owner phrase | `PROD STORAGE RULES DEPLOY: COMPLETE` |

---

## Post-deploy verification (agent; read-only) — **PASS**

### Identity

| Item | Value |
|------|-------|
| `origin/production` | `7e139685099f90eb1532771e927384316a432e87` |
| App Hosting | **100%** `build-2026-08-08-004` @ same SHA; auto-rollout **disabled** |
| Algolia | **OFF** |

### Storage Rules release

| Item | Before | After |
|------|--------|-------|
| Ruleset ID | `fbcb0ee4-732e-420f-afff-01041d2eee1b` | **`ccb8e2ea-74e6-4ed6-b1f8-e3cb3e386cd6`** |
| Release updateTime | 2026-07-30 | **2026-08-08T21:41:22Z** (observed) |
| Content SHA256 | `e11cb3bf…` | **`ac3a6830b4d48a9f7a49748da02accb228d6c28ad14bbb38debfa30f2708ada2`** |
| Match tip source | no | **YES (exact)** |

Live release changed: **YES**.

### Approved markers

| Marker | Live |
|--------|------|
| `match /generated/portal-catalog` | **ABSENT** |
| `match /generated/catalog-reference` | **ABSENT** |
| Stage 5 retirement comment present | **YES** |
| `isValidAssistedCreationProof` `<= 80 * 1024 * 1024` | **YES** |
| Proof helper still 25 MB | **NO** |
| `ASSISTED_CREATION_MAX_PROOF_BYTES` | `80 * 1024 * 1024` inclusive |

Unrelated customer/guest access expansion vs tip: **NONE**.

### Firestore Rules (control)

| Item | Value |
|------|-------|
| Ruleset | `2c0578a0-9764-4081-a5b3-6a5f23795e7d` (**unchanged**) |

### Portal smoke (narrow)

| Path | Status | Notes |
|------|--------|-------|
| `/` | **200** | no `fresh-prints-dev`; no Algolia markers; no permission-denied markers |
| `/catalog` | **200** | same |

### Objects

Storage **objects** not deleted (Rules-only change).

---

## Remaining-gates status (after this verify)

| Gate | Status |
|------|--------|
| Firestore Rules | **COMPLETE** |
| Storage Rules | **COMPLETE** |
| Functions Wave A-Taxonomy | **NEXT** (prepared separately) |
| Taxonomy bootstrap | pending after Functions |
| Algolia | optional / OFF |
| Publisher DELETE | pending |
| Generated Storage cleanup | pending |
| Studio package | pending |
| Final smoke | pending |

---

## Confirmations

- PROD STORAGE RULES VERIFY: **PASS**
- STORAGE RULES GATE: **COMPLETE**
- NO Firestore Rules redeploy
- NO Functions deploy/delete
- NO taxonomy bootstrap
- NO Algolia change
- NO indexes/backfill
- NO Storage object cleanup
- NO App Hosting rollout
- NO Studio release

---

## Next owner checkpoint (ONE)

`APPROVE PROD FUNCTIONS WAVE A TAXONOMY`

(See prepared checkpoint — do not auto-deploy.)
