# Checkpoint: Production Firestore Rules deploy — request item resize permission

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Approval | `APPROVE PRODUCTION FIRESTORE RULES DEPLOY: REQUEST ITEM RESIZE PERMISSION` |
| Project | `fresh-prints-prod` |
| Command | `firebase deploy --only firestore:rules --project fresh-prints-prod` |
| Result | **Deploy complete** — `firestore: released rules firestore.rules to cloud.firestore` |
| Scope | Rules only — no Functions, indexes, Storage, Auth, App Hosting, data, DNS |

## What shipped

`printRequestItems` whole-document validator now allows optional server marker
`requestCountApplied` and both staff (Studio) and customer (Portal) update paths keep it
client-immutable.

## Explicit non-changes

- No Functions deploy
- No Storage Rules / Auth / App Hosting rollout
- No production data mutation
- Stage 2 not resumed
- Custom-domain cutover not started

## Owner QA (required next)

### Manual Test Checkpoint

**Feature / area:** Catalog print-request item width/height autosave after Rules deploy  
**Why automated tests are insufficient:** Live Studio Electron + hosted Portal against production data  
**Environment:** Production Studio installer (bundled-brand build) +  
`https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app`  
**Prerequisites:** Editable request (`draft`/`editing` Portal; unlocked Studio detail); catalog item (not upload-only)

### Steps — Studio

1. Open an editable print request with a catalog item → change width or height → **Expected:** Saved (no permission-denied)
2. Refresh / reopen → **Expected:** dimensions persist
3. Change quantity → **Expected:** still works
4. On a queue-locked request (if available) → **Expected:** size controls read-only

### Steps — Portal

1. On request-details, change catalog item width or height → **Expected:** autosave Saved (no “Missing or insufficient permissions”)
2. Refresh → **Expected:** dimensions persist
3. Change quantity → **Expected:** Cap A path still works
4. Invalid / under-200 DPI / oversize → **Expected:** still blocked client-side

### Pass criteria

- [x] Studio catalog resize OK  
- [x] Portal catalog resize OK  
- [x] Locked / invalid cases still blocked  

### Owner QA result — **PASS** (2026-07-31)

Exact recorded result:

> PASS

Signoff: `docs/workflow/reviews/2026-07-31-production-portal-request-item-resize-permission-signoff.md`
(**approved**).

## Rollback

```bash
# Redeploy prior committed firestore.rules from git, or revert via Firebase Console rules history
firebase deploy --only firestore:rules --project fresh-prints-prod
```

| Local rules SHA-1 at deploy | `2118de2c790abcc079e91d08ded1a20480baeb68` |

