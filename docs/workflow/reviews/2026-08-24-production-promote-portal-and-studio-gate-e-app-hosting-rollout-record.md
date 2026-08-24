# App Hosting Rollout Record — Production promote Portal + Studio (Gate E)

| Field | Value |
|-------|-------|
| Date | 2026-08-24 |
| Goal | `production-promote-portal-and-studio-2026-08-23` |
| Authorization | `APPROVE PRODUCTION APP HOSTING ROLLOUT: production-promote-portal-and-studio-2026-08-23` |
| Production source SHA | **`94a1ed0009deab775d8b0c60be44ca931c0ad291`** |
| Status | **BUILD LIVE** — automated/read-only smoke **PASS WITH NOTES**; **owner Portal QA required** |
| Checkpoint | `docs/workflow/reviews/2026-08-24-production-promote-portal-and-studio-gate-e-app-hosting-checkpoint.md` |

---

## Preflight (passed before create)

| Check | Result |
|-------|--------|
| Prior live | `fresh-prints-portal-build-2026-08-21-001` @ `7716d4a…` @ **100%** |
| Gate D | Live on `fresh-prints-prod` (Rules + 4 Functions) |
| `apphosting.yaml` 7716d4a → 94a1ed0 | Identical |
| Secret mapping names | Unchanged; **values not printed** |
| Agent create | Blocked by FreshForge shell guard — **owner ran** create CLI |

---

## Rollout (LIVE — read-only verified)

| Item | Value |
|------|-------|
| Backend | `fresh-prints-portal` |
| Project | `fresh-prints-prod` |
| Git commit | **`94a1ed0009deab775d8b0c60be44ca931c0ad291`** (exact; App Hosting `source.codebase.commit`) |
| Commit message | `Merge pull request #88 from roasted-garlic/development` / Promote Portal show discovery + Studio 1.0.9 release candidate |
| Build / revision | **`fresh-prints-portal-build-2026-08-24-001`** |
| Build state | **READY** |
| Rollout | `rollouts/build-2026-08-24-001` — **SUCCEEDED** |
| Traffic | **100%** → `fresh-prints-portal-build-2026-08-24-001` |
| Cloud Run `latestReadyRevisionName` | `fresh-prints-portal-build-2026-08-24-001` |
| Build createTime | `2026-08-24T15:51:11Z` |
| Backend updateTime | `2026-08-24T15:56:47Z` |
| Hosted URL | `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` |
| Canonical | `https://myprintrequest.com` |
| Previous live / rollback | **`fresh-prints-portal-build-2026-08-21-001`** @ `7716d4a97f83c2dbe5602fb3e149875d6d7f38c9` |

### Env / secrets

- Revision mounts Secret Manager refs for all `NEXT_PUBLIC_*` from `apphosting.yaml` (BUILD + RUNTIME)
- Literal secret / Measurement ID values **not printed**
- Secret mapping, Auth, DNS, Algolia config **not changed** this pass

---

## Technical smoke (read-only / guest — not owner QA)

| Check | Result |
|-------|--------|
| `https://myprintrequest.com/` | **200**; Discover + New This Week / Next Show / Added to Shows This Week rails present |
| `https://myprintrequest.com/catalog` | **200** |
| `https://www.myprintrequest.com/` | **200** |
| Hosted.app `/` | **200** |
| `fresh-prints-dev` marker in HTML | **absent** |
| Catalog search `halloween` | **PASS** — results |
| Catalog search `HaLlOwEeN` (case) | **PASS** — results |
| Catalog search `HaLlO-WeEn` / `hallo-ween` (separator) | **NOTES** — guest Algolia path returned **no results** for hyphenated query; confirm in owner QA (may be Algolia query vs client normalize) |
| `/shows` calendar | **PASS** — Upcoming Shows calendar loads |
| Public show gallery `/shows/QNEwInNcttmdAsb95mQW` | **PASS** — catalog designs listed for 8/24 show |
| Private customer uploads exposed | **PASS** — gallery shows catalog titles only; guest Upload page shows **Login required**; no `customerUploads/` leakage in guest HTML |
| Add to Request login gating | **PASS** — detail CTA **Sign in to add to a request** |
| Auth return-to | **PASS** — CTA → `/login?returnTo=%2Fshows%2FQNEwInNcttmdAsb95mQW` |
| Working Request basics | **OWNER QA** — requires signed-in customer |
| Customer → Internal conversion presentation | **OWNER QA / Studio** — not safely guest-testable on Portal |

---

## Confirmations

- NO Functions / Rules / indexes / Secret Manager value changes / Auth / DNS / Studio this pass
- NO `firebase deploy`
- Rollback remains `build-2026-08-21-001` / `7716d4a`
- Gate F **not started**

---

## Owner Portal production QA (required)

Please run signed-in smoke on `https://myprintrequest.com`, then reply:

```text
PROD PORTAL PROMOTE QA: PASS
```

(or `FAIL: …` / `PASS WITH NOTES: …`)

Suggested focus: Working Request add/edit; hyphenated catalog search; Our Shows/Upcoming Shows UX; return-to after real login; confirm no private uploads on public surfaces.

---

## Next phrase after Portal QA PASS (Gate F draft only)

```text
AUTHORIZE STUDIO 1.0.9 RELEASE DISPATCH: STABLE INTERNAL-UNSIGNED FROM PRODUCTION 94a1ed0009deab775d8b0c60be44ca931c0ad291
```

Do **not** publish until a later `APPROVE STUDIO PUBLISH: 1.0.9`.
