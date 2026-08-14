# Checkpoint: Prefinal A–H + Track B — Production Functions wave

| Field | Value |
|-------|-------|
| Date | 2026-08-11 |
| Owner phrases | `APPROVE PROD DEPLOY: FUNCTIONS WAVE…` → OPTION A → PR **#58** → `FUNCTIONS WAVE DEPLOY: DONE` |
| Status | **COMPLETE — VERIFY PASS** |
| Plan | `docs/workflow/plans/2026-08-11-prefinal-a-h-production-promotion-plan.md` |
| Project | **`fresh-prints-prod`** |
| Scope | **13 Functions allowlist only** |

---

## Git identity

| Item | Value |
|------|-------|
| `origin/production` | `76205da8eeab43c545112f7399522e6b4106a03e` |
| Freeze `3b7a978` | Contained; runtime product tree match |
| Test fix `67231f1` | Contained (PR #58) |
| Storage Rules | Live `0c911fca-…` (**unchanged** this gate; updateTime still `2026-08-11T20:45:02Z`) |
| Firestore Rules | `64bdaccc-…` (**unchanged**; updateTime `2026-08-10T19:40:23Z`) |

---

## Post-deploy verification (read-only) — **PASS**

All 13 allowlist Functions **ACTIVE** on `fresh-prints-prod`, updated in the deploy window (~`2026-08-11T21:07:46Z`–`21:08:17Z`):

| Function | State | updateTime (UTC) |
|----------|-------|------------------|
| `previewPortalCustomerUploadDeletion` | ACTIVE | 21:07:46 |
| `finalizeCustomerUpload` | ACTIVE | 21:08:08 |
| `customerAddAssistedApprovedProofToPrintRequest` | ACTIVE | 21:08:10 |
| `deletePortalCustomerUpload` | ACTIVE | 21:08:13 |
| `deleteEligibleCustomerUpload` | ACTIVE | 21:08:13 |
| `confirmCustomerUploadsAndAttachToRequest` | ACTIVE | 21:08:15 |
| `getPortalOgShareImage` | ACTIVE | 21:08:15 |
| `onShowAllocationCreated` | ACTIVE | 21:08:15 |
| `previewCustomerUploadDeletion` | ACTIVE | 21:08:16 |
| `confirmCustomerUploadsForDonation` | ACTIVE | 21:08:16 |
| `updatePortalSocialMetaSettings` | ACTIVE | 21:08:16 |
| `getPortalGlobalOpenGraph` | ACTIVE | 21:08:17 |
| `queuePortalPrintRequestToShow` | ACTIVE | 21:08:17 |

Wave-window Function updates: **exactly 13** — **zero** outside allowlist.

### Contracts now production-authoritative

| Contract | Status |
|----------|--------|
| Workstream E (attach stays `not_eligible`; Add to Show / allocation → Pending; donate → Pending) | **LIVE** |
| Track B Static Global OG always letterbox (`getPortalGlobalOpenGraph` + `getPortalOgShareImage`) | **LIVE** |
| F3 delete/refund + finalize charge-on-ready | **LIVE** |

---

## Confirmations

| Action | Occurred? |
|--------|-----------|
| Scoped Functions deploy | **Yes** (owner CLI) |
| Unrelated Function deploy/delete | **No** (verified) |
| Storage / Firestore Rules / indexes | **No** |
| App Hosting | **No** |
| Algolia | **No** |
| Track A inventory/dry-run/APPLY | **No** |
| Studio 1.0.3 | **No** |

---

## FUNCTIONS WAVE GATE: **COMPLETE**

### Next owner phrase

**[NEEDS REPO CHECK]** — Plan ordered checkpoint #6 is “App Hosting rollout”  
(`docs/workflow/plans/2026-08-11-prefinal-a-h-production-promotion-plan.md`) but that Plan does **not** define an exact App Hosting approval string.

Recommended (not binding until recorded in Plan/Review):

```
APPROVE PROD DEPLOY: APP HOSTING PREFINAL A-H + TRACK B
```

Do **not** start Track A inventory/dry-run until App Hosting is complete per Plan sequence (steps 5→6→7).
