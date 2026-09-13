# DEV Deploy Record: Studio Delete First-Action Latency

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Goal | `studio-delete-first-action-latency` |
| Project | **fresh-prints-dev** |
| Owner authorization | **AUTHORIZE DEV DEPLOY** |
| Production | **NOT AUTHORIZED** / not touched |
| Status | **deployed** — awaiting Owner QA |

---

## Pre-deploy checks

| Check | Result |
|-------|--------|
| Target project | `firebase use` → **fresh-prints-dev** |
| Exact 11 Functions | Match approved checkpoint |
| New Function names | None |
| minInstances / memory / CPU / timeout / region changes | None (pre-existing timeout/memory on purge + unapproved-design unchanged) |
| Firestore Rules / Storage / indexes / migration / Hosting | **NO** |

---

## Deploy command

```bash
firebase deploy --only functions:previewPrintRequestDeletion,functions:deleteEligiblePrintRequest,functions:archivePrintRequest,functions:previewUpcomingShowDeletion,functions:deleteEligibleUpcomingShow,functions:previewCustomerUploadDeletion,functions:deleteEligibleCustomerUpload,functions:deleteEligibleUnapprovedDesign,functions:purgeArchivedDesignAssets,functions:previewHardDeleteCustomerAccount,functions:hardDeleteCustomerAccount --project fresh-prints-dev
```

Exit code: **0**

### Function update results (all Successful update operation)

1. previewPrintRequestDeletion  
2. deleteEligiblePrintRequest  
3. archivePrintRequest  
4. previewUpcomingShowDeletion  
5. deleteEligibleUpcomingShow  
6. previewCustomerUploadDeletion  
7. deleteEligibleCustomerUpload  
8. deleteEligibleUnapprovedDesign  
9. purgeArchivedDesignAssets  
10. previewHardDeleteCustomerAccount  
11. hardDeleteCustomerAccount  

**Deploy complete!** Project Console: https://console.firebase.google.com/project/fresh-prints-dev/overview

---

## Studio restart

- Stopped prior `npm run dev:studio` session
- Restarted: `npm run dev:studio`
- Vite ready; Electron/Studio available for fresh-session Owner QA

---

## Warmup instrumentation (Owner QA)

- DEV console may show: `[deletion-warmup] skipped/failed` only on failure
- Trace: `callTracedFunction` with `logicalOperation: "deletion-callable-warmup"` / source `deletionCallableWarmup.*`
- Enable `FP_FIRESTORE_TRACE` localStorage if inspecting callableComplete durations

---

## Owner QA checklist

Reply with `PASS` / `PASS WITH NOTES: …` / `FAIL: …`

1. Fresh Studio restart → wait for idle warmup → first delete latency  
2. Print Request preview + safe mutate  
3. Upcoming Show  
4. Internal Gang Sheet (same services)  
5. AI Review permanent design delete  
6. Design Library **permanent image purge** (not soft archive)  
7. Customer Upload delete  
8. Blocked delete still blocked  
9. Warm repeat still fast  
10. Authorization unchanged  

Target: first actions materially faster after warmup; mutation should not routinely pay a second multi-second cold start.
