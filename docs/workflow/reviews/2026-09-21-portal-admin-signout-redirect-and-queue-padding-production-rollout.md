# Production Rollout Record: portal-admin-signout-redirect-and-queue-padding

| Field | Value |
|-------|-------|
| Date | 2026-09-21 |
| Goal | `portal-admin-signout-redirect-and-queue-padding` |
| PR | [#107](https://github.com/roasted-garlic/freshprints/pull/107) |
| Production merge SHA | `6f7053600e352db871c7e2d48f6012a147b5fce3` |
| Goal commit | `4d3b937f23764cbbc0b90cfbb284db206e0d56c0` |
| Disposition | **COMPLETE** (Portal App Hosting only) |

## Surfaces

### Portal App Hosting

| Item | Value |
|------|-------|
| Backend | `fresh-prints-portal` |
| Project | `fresh-prints-prod` |
| Build / revision | **`fresh-prints-portal-build-2026-09-21-002`** |
| Build state | **READY** |
| Rollout | `rollouts/build-2026-09-21-002` — **SUCCEEDED** |
| Commit | `6f7053600e352db871c7e2d48f6012a147b5fce3` (**exact**) |
| Traffic | **100%** → `fresh-prints-portal-build-2026-09-21-002` |
| Build createTime | `2026-09-21T17:26:04Z` |
| Backend Updated Date | `2026-09-21 12:31:09` (local) |
| Hosted URL | `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` |
| Canonical | `https://myprintrequest.com` |
| Rollback (preserved) | **`fresh-prints-portal-build-2026-09-21-001`** @ `f09dafc6a9566fa0ee021646e5b7d1318cc010a9` |

Owner created rollout (agent CLI shell-guard blocked):

```bash
firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit 6f7053600e352db871c7e2d48f6012a147b5fce3 --force --non-interactive
```

Terminal: **Successfully created a new rollout!** (exit 0).

### Not deployed this pass

| Surface | Status |
|---------|--------|
| Functions | **not deployed** |
| Firestore Rules | **not deployed** |
| Storage Rules | **not deployed** |
| Indexes | **not deployed** |
| Studio | **not published** |
| Secrets / IAM | **unchanged** |
| Migrations / data | **none** |

## Smoke

| Check | Result |
|-------|--------|
| Hosted `/` | **200** |
| Hosted `/admin/show-queue` | **200** |
| `https://myprintrequest.com/` | **200** |
| `https://myprintrequest.com/admin/show-queue` | **200** |
| `https://www.myprintrequest.com/` | **200** |
| `fresh-prints-dev` in HTML | **absent** |
| `THIS IS A DEVELOPMENT SERVER` banner | **absent** on production |
| `myprintrequest.dev` in HTML | **absent** |
| Guest `/admin/show-queue` → Login | **PASS** — hard-nav to `/login?returnTo=%2Fadmin%2Fshow-queue` (brief “Redirecting…” then Login; not stuck) |
| Staff Sign out (authenticated) | **Owner confirm** — requires staff session |
| Show Queue bottom spacing | **Owner confirm** — requires staff session on queue with cards |

## Safety confirmations

- Firestore Rules: **not deployed**
- Storage Rules: **not deployed**
- Functions: **not deployed**
- Indexes: **not deployed**
- Studio: **not published**
- Secrets / IAM: **unchanged**
- Prior revision preserved for rollback: `build-2026-09-21-001`

## Verdict

**PORTAL APP HOSTING ROLLOUT COMPLETE**

Build `fresh-prints-portal-build-2026-09-21-002` @ `6f705360` serving **100%** traffic. Guest admin redirect hard-nav verified. Authenticated Sign out + bottom padding: please confirm with a staff login and reply `PROD ADMIN SIGNOUT/PADDING QA: PASS` (or FAIL / PASS WITH NOTES).
