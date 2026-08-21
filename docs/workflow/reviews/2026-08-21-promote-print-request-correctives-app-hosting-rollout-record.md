# App Hosting Rollout Record — PR #84 Print Request correctives

| Field | Value |
|-------|-------|
| Date | 2026-08-21 |
| Goal | `promote-print-request-correctives-to-production` |
| Authorization | Owner ran the Gate D create command, then `Continue Workflow` |
| Production source SHA | `7716d4a97f83c2dbe5602fb3e149875d6d7f38c9` |
| Status | **BUILD LIVE** — owner Portal QA still required |

---

## Preflight

Owner ran the established create after the agent CLI is hook-blocked:

```bash
firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit 7716d4a97f83c2dbe5602fb3e149875d6d7f38c9 --force --non-interactive
```

Local terminal: **Successfully created a new rollout!** (exit 0). Source announced as `[7716d4a]: Merge pull request #84 from roasted-garlic/development`.

---

## Rollout (LIVE — read-only verified)

| Item | Value |
|------|--------|
| Backend | `fresh-prints-portal` |
| Project | `fresh-prints-prod` |
| Git commit | `7716d4a97f83c2dbe5602fb3e149875d6d7f38c9` (**exact**, App Hosting `source.codebase.commit`) |
| Commit message | `Merge pull request #84 from roasted-garlic/development` / Promote Print Request sizing, queue integrity, and Customer/Internal lists |
| Build / revision | **`fresh-prints-portal-build-2026-08-21-001`** |
| Build state | **READY** |
| Rollout | `rollouts/build-2026-08-21-001` — **SUCCEEDED** |
| Traffic | **100%** → `fresh-prints-portal-build-2026-08-21-001` |
| Backend updateTime | `2026-08-21T14:49:53Z` |
| Build createTime | `2026-08-21T14:44:37Z` |
| Hosted URL | `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` |
| Canonical | `https://myprintrequest.com` |
| Previous live / rollback | **`fresh-prints-portal-build-2026-08-19-001`** @ `99b230333efd9a4892f8c4a30ccf72008baf2246` |

### GA Measurement ID wiring

- HTML still includes `googletagmanager.com/gtag/js`
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
| `fresh-prints-dev` marker in HTML | **absent** |
| HTML gtag loader | present — tag detection is **not** owner QA |

---

## Confirmations

- NO Functions / Rules / indexes / Secret Manager / Auth / DNS / Algolia / Studio this pass
- NO Measurement ID written to source
- NO `firebase deploy`
- Rollback remains `build-2026-08-19-001` / `99b2303`

---

## Next

Owner Portal smoke on `https://myprintrequest.com`. Studio Customer/Internal lists are **not** in published **1.0.7**; those steps wait for Gate E.

Phrases:

```text
APPROVE STUDIO VERSION: <x.y.z>
PROD PRINT REQUEST CORRECTIVES QA: PASS
```

(Use `FAIL:` / `PASS WITH NOTES:` if needed. Full QA including Studio lists is after a new Studio publish.)
