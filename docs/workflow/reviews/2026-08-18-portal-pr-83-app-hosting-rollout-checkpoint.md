# Checkpoint: Production App Hosting rollout — PR #83 add-to-show + design analytics

| Field | Value |
|-------|-------|
| Date | 2026-08-18 |
| Authorization | Owner Continue Workflow: production App Hosting rollout of PR **#83** merge `99b230333efd9a4892f8c4a30ccf72008baf2246` |
| Production source SHA | `99b230333efd9a4892f8c4a30ccf72008baf2246` |
| Status | **LIVE / OWNER QA PASS — SIGNOFF COMPLETE** |
| App Hosting | **LIVE** — owner `PROD PR 83 QA: PASS` |

---

## Preflight (PASS)

| Check | Result |
|-------|--------|
| `origin/production` | **`99b230333efd9a4892f8c4a30ccf72008baf2246`** |
| Merge parents | `60f0086aa85347e41a674907b3f4e5cd044058fc` + **`64791a1f65fd5873aaef1ef3112e506065c6de84`** |
| GitHub PR #83 | **MERGED** |
| Rollback | `fresh-prints-portal-build-2026-08-18-001` / `cb006bd5a21580cccf89d6c1d13d31f07633c51f` |

---

## Exact command (ran by owner)

```bash
firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit 99b230333efd9a4892f8c4a30ccf72008baf2246 --force --non-interactive
```

---

## After LIVE

- Build: **`fresh-prints-portal-build-2026-08-19-001`** READY at **100%**
- Source: **`99b230333efd9a4892f8c4a30ccf72008baf2246`** (App Hosting `source.codebase.commit`)
- Canonical `https://myprintrequest.com/` **200**; `/catalog` **200**
- Owner production QA: **`PROD PR 83 QA: PASS`**

Record: `docs/workflow/reviews/2026-08-18-portal-pr-83-app-hosting-rollout-record.md`

Production Signoff: `docs/workflow/reviews/2026-08-18-portal-pr-83-production-signoff.md`
