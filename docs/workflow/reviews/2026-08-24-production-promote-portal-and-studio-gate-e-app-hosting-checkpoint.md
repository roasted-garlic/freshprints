# Gate E Checkpoint — Production App Hosting rollout

| Field | Value |
|-------|-------|
| Date | 2026-08-24 |
| Goal | `production-promote-portal-and-studio-2026-08-23` |
| Status | **VERIFIED LIVE** — awaiting owner Portal QA |
| Authorization | `APPROVE PRODUCTION APP HOSTING ROLLOUT: production-promote-portal-and-studio-2026-08-23` |
| Production source SHA | **`94a1ed0009deab775d8b0c60be44ca931c0ad291`** |
| Backend | `fresh-prints-portal` |
| Project | `fresh-prints-prod` |
| Rollout record | `docs/workflow/reviews/2026-08-24-production-promote-portal-and-studio-gate-e-app-hosting-rollout-record.md` |

---

## Live after rollout

| Item | Value |
|------|-------|
| Build / revision | **`fresh-prints-portal-build-2026-08-24-001`** |
| Source | **`94a1ed0009deab775d8b0c60be44ca931c0ad291`** |
| Rollout | **SUCCEEDED** |
| Traffic | **100%** |
| Canonical | `https://myprintrequest.com` serving new build |
| Rollback | `fresh-prints-portal-build-2026-08-21-001` @ `7716d4a…` |

---

## Owner next

```text
PROD PORTAL PROMOTE QA: PASS
```

Then Gate F draft (only after QA):

```text
AUTHORIZE STUDIO 1.0.9 RELEASE DISPATCH: STABLE INTERNAL-UNSIGNED FROM PRODUCTION 94a1ed0009deab775d8b0c60be44ca931c0ad291
```
