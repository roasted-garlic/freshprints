# DEV Deploy Record: Show Production Recovery Warmup (amendment)

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Goal | `studio-delete-first-action-latency` (recovery impact-preview amendment) |
| Project | **fresh-prints-dev** |
| Owner authorization | **AUTHORIZE DEV DEPLOY** |
| Production | **NOT AUTHORIZED** / not touched |
| Status | **deployed** — awaiting Owner QA |

---

## Pre-deploy checks

| Check | Result |
|-------|--------|
| Target project | `firebase use` → **fresh-prints-dev** |
| Exact 2 Functions | `previewShowProductionRecovery`, `applyShowProductionRecovery` |
| New Function names | None |
| minInstances / memory / CPU / timeout / region changes | None |
| Firestore Rules / Storage / indexes / migration / Hosting | **NO** |

---

## Deploy command

```bash
firebase deploy --only functions:previewShowProductionRecovery,functions:applyShowProductionRecovery --project fresh-prints-dev
```

Exit code: **0**

### Function update results (all Successful update operation)

1. previewShowProductionRecovery  
2. applyShowProductionRecovery  

**Deploy complete!** Project Console: https://console.firebase.google.com/project/fresh-prints-dev/overview

---

## Related client changes (no Functions needed for flicker)

- Preview effect deps stabilized (no re-fetch on schedule clock)
- Idle warm `previewShowProductionRecovery` for staff
- Dialog open warms `applyShowProductionRecovery`

Reload Studio once so idle warmup includes the new preview callable.

---

## Owner QA (recovery + continue delete matrix)

Reply with `PASS` / `PASS WITH NOTES: …` / `FAIL: …`

1. Reload Studio → wait briefly for idle warmup  
2. **Mark as Fulfilled** — impact preview loads once, **no flicker** after content appears  
3. Confirm action still works when allowed  
4. Continue prior delete first-action latency checklist if not finished  
