# Gate E Checkpoint — Production App Hosting rollout

| Field | Value |
|-------|-------|
| Date | 2026-08-24 |
| Goal | `production-promote-portal-and-studio-2026-08-23` |
| Status | **VERIFIED LIVE** (promote + hotfix) |
| Authorization | `APPROVE PRODUCTION APP HOSTING ROLLOUT: production-promote-portal-and-studio-2026-08-23` |
| Backend | `fresh-prints-portal` |
| Project | `fresh-prints-prod` |

---

## Live after rollouts

| Item | Value |
|------|-------|
| **Current build** | **`fresh-prints-portal-build-2026-08-24-002`** @ **100%** |
| **Current production Git** | **`f35c96dda23ce83f99f75ab3f942c5edfcfcfdd2`** (PR **#89** hotfix on PR **#88** promote) |
| Promote rollout | `build-2026-08-24-001` @ `94a1ed0` — SUCCEEDED |
| Hotfix rollout | `build-2026-08-24-002` @ `f35c96d` — SUCCEEDED |
| Canonical | `https://myprintrequest.com` |
| Rollback (prior live) | `build-2026-08-24-001` @ `94a1ed0` |
| Full rollback | `build-2026-08-21-001` @ `7716d4a` |

### Records

- Promote: `docs/workflow/reviews/2026-08-24-production-promote-portal-and-studio-gate-e-app-hosting-rollout-record.md`
- Hotfix: `docs/workflow/reviews/2026-08-24-production-promote-portal-and-studio-gate-e-hotfix-rollout-record.md`

---

## Gate E outcome

Portal production is live with PR #88 product batch **plus** PR #89 Upcoming Shows sidebar theme-toggle fix. Gate D Firebase unchanged. **STOP before Gate F** until owner authorizes Studio 1.0.9 draft dispatch from **current production tip**.

---

## Next phrase (Gate F draft)

```text
AUTHORIZE STUDIO 1.0.9 RELEASE DISPATCH: STABLE INTERNAL-UNSIGNED FROM PRODUCTION f35c96dda23ce83f99f75ab3f942c5edfcfcfdd2
```

Publish later: `APPROVE STUDIO PUBLISH: 1.0.9`
