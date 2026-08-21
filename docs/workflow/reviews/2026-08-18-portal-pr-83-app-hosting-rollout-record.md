# App Hosting Rollout Record — PR #83 add-to-show + design engagement analytics

| Field | Value |
|-------|-------|
| Date | 2026-08-18 |
| Goals | `portal-add-to-show-unmissable` + `portal-design-engagement-analytics` — **CLOSED/LIVE** |
| Authorization | Owner Continue Workflow: production App Hosting rollout of PR **#83** |
| Production source SHA | `99b230333efd9a4892f8c4a30ccf72008baf2246` |
| Status | **BUILD LIVE / OWNER QA PASS — SIGNOFF COMPLETE** |
| Signoff | **approved** — `docs/workflow/reviews/2026-08-18-portal-pr-83-production-signoff.md` |

---

## Preflight

Owner ran the established create after the agent CLI was hook-blocked:

```bash
firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit 99b230333efd9a4892f8c4a30ccf72008baf2246 --force --non-interactive
```

Local terminal result: **Successfully created a new rollout!** (exit 0). Source announced as `[99b2303]: Merge pull request #83 from roasted-garlic/development`.

---

## Rollout (LIVE — read-only verified)

| Item | Value |
|------|-------|
| Backend | `fresh-prints-portal` |
| Project | `fresh-prints-prod` |
| Git commit | `99b230333efd9a4892f8c4a30ccf72008baf2246` (**exact**, App Hosting `source.codebase.commit`) |
| Commit message | `Merge pull request #83 from roasted-garlic/development` / Portal: add-to-show clarity and design engagement analytics |
| Build / revision | **`fresh-prints-portal-build-2026-08-19-001`** |
| Build state | **READY** (`latestReadyRevisionName`) |
| Rollout | `rollouts/build-2026-08-19-001` — **SUCCEEDED** |
| Traffic | **100%** → `fresh-prints-portal-build-2026-08-19-001` |
| Backend updateTime | `2026-08-19T04:08:05Z` (CLI Updated Date `2026-08-18 23:08:05`) |
| Build createTime | `2026-08-19T04:04:10Z` |
| Hosted URL | `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` |
| Canonical | `https://myprintrequest.com` |
| Previous live / rollback | **`fresh-prints-portal-build-2026-08-18-001`** @ `cb006bd5a21580cccf89d6c1d13d31f07633c51f` |

### GA Measurement ID wiring

- Revision still mounts Secret Manager `NEXT_PUBLIC_GA_MEASUREMENT_ID` (BUILD/RUNTIME via `apphosting.yaml`)
- Literal `G-` value **not printed**
- Secret mapping, Auth, DNS, Algolia **not changed** this pass

---

## Technical smoke (read-only, not production QA)

| Check | Result |
|-------|--------|
| `https://myprintrequest.com/` | **200** |
| `https://myprintrequest.com/catalog` | **200** |
| `https://www.myprintrequest.com/` | **200** after redirect to canonical `/` |
| Hosted.app `/` | **200** |
| HTML gtag loader | present (`googletagmanager.com/gtag/js`) — tag detection is **not** owner QA |

---

## Confirmations

- NO Functions / Rules / indexes / Secret Manager / Auth / DNS / Algolia / Studio this pass
- NO Measurement ID written to source
- NO `firebase deploy`
- Rollback remains `build-2026-08-18-001` / `cb006bd` (previous live; not promoted away from this record)
- Goals **CLOSED/LIVE** after owner `PROD PR 83 QA: PASS`

---

## Owner production QA

**`PROD PR 83 QA: PASS`** (2026-08-18). Add-to-show UX + design-engagement GA4 transport on `https://myprintrequest.com`.

---

## Related

- Checkpoint: `docs/workflow/reviews/2026-08-18-portal-pr-83-app-hosting-rollout-checkpoint.md`
- Production Signoff: `docs/workflow/reviews/2026-08-18-portal-pr-83-production-signoff.md`
- PR: https://github.com/roasted-garlic/freshprints/pull/83
