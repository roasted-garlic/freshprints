# Gate D Checkpoint — Production Firebase deploy

| Field | Value |
|-------|-------|
| Date | 2026-08-24 |
| Goal | `production-promote-portal-and-studio-2026-08-23` |
| Status | **VERIFIED COMPLETE** |
| Authorization | `APPROVE PRODUCTION FIREBASE DEPLOY: production-promote-portal-and-studio-2026-08-23` |
| Production source SHA | **`94a1ed0009deab775d8b0c60be44ca931c0ad291`** |
| Project | **`fresh-prints-prod`** |
| Deploy executor | Owner local CLI (agent blocked by FreshForge shell guard) |
| Deploy exit code | **0** |

---

## Pre-deploy verification (agent — passed)

| Check | Result |
|-------|--------|
| `origin/production` | `94a1ed0009deab775d8b0c60be44ca931c0ad291` |
| Working tree `firestore.rules` + `functions/` vs `94a1ed0` | **identical** (empty `git diff`) |
| Branch | `development` (docs-only ahead; Gate D product tree matches production) |
| `.firebaserc` production alias | `fresh-prints-prod` |
| Scope unchanged | Rules + 4 Functions only |
| `npm --prefix functions run build` | exit **0** |

## Exact command (owner ran locally)

```bash
firebase deploy --only firestore:rules,functions:completeStaffGangSheetAndOpenNext,functions:convertCustomerPrintRequestToInternal,functions:listPortalPublicShows,functions:listPortalShowCatalogDesigns --project fresh-prints-prod
```

Run from: `C:\coding\fresh-prints`. Scope was **not** broadened.

---

## Deploy result (owner terminal — exit 0)

| Resource | Result |
|----------|--------|
| Firestore Rules | `+ firestore: released rules firestore.rules to cloud.firestore` |
| `convertCustomerPrintRequestToInternal` | **Successful create** (nodejs20 2nd Gen, us-central1) |
| `listPortalPublicShows` | **Successful create** (nodejs20 2nd Gen, us-central1) |
| `listPortalShowCatalogDesigns` | **Successful create** (nodejs20 2nd Gen, us-central1) |
| `completeStaffGangSheetAndOpenNext` | **Successful update** (nodejs20 2nd Gen, us-central1) |
| Overall | `+ Deploy complete!` |

**Non-blocking warnings (pre-existing / advisory):**

- Firestore rules compiler `[W]` unused helpers + false-positive `get`/`exists`/`request` naming — rules still `compiled successfully` (same pattern as 2026-08-22 DEV release)
- Node.js 20 deprecation notice (decommission 2026-10-30)
- `firebase-functions` package version advisory

**Not deployed:** indexes, Storage Rules, App Hosting, secrets, unrelated Functions.

---

## Post-deploy verification (agent — passed)

| Check | Result |
|-------|--------|
| Firestore Rules released | **PASS** (deploy log) |
| `completeStaffGangSheetAndOpenNext` listed | **PASS** — v2 callable, us-central1, 256MB, nodejs20 |
| `convertCustomerPrintRequestToInternal` listed | **PASS** — v2 callable, us-central1, 256MB, nodejs20 |
| `listPortalPublicShows` listed | **PASS** — v2 callable, us-central1, 256MB, nodejs20 |
| `listPortalShowCatalogDesigns` listed | **PASS** — v2 callable, us-central1, 256MB, nodejs20 |
| Region/runtime unchanged vs baseline | **PASS** — us-central1 / nodejs20 |
| No unrelated resources in deploy scope | **PASS** — exact allowlist only |

Verification command: `firebase functions:list --project fresh-prints-prod` (exit 0). Presence in list after Successful create/update = live; CLI table does not print a separate ACTIVE column.

---

## Not in this gate

- App Hosting rollout
- Studio 1.0.9 dispatch/publish

## Next phrase (Gate E)

```text
APPROVE PRODUCTION APP HOSTING ROLLOUT: production-promote-portal-and-studio-2026-08-23
```

Rollout must use production SHA `94a1ed0009deab775d8b0c60be44ca931c0ad291` (never `development`).
