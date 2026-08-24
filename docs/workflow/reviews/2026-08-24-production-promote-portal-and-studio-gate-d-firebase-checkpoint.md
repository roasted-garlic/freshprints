# Gate D Checkpoint — Production Firebase deploy

| Field | Value |
|-------|-------|
| Date | 2026-08-24 |
| Goal | `production-promote-portal-and-studio-2026-08-23` |
| Status | **PENDING OWNER CLI** — agent `firebase deploy` blocked by FreshForge shell guard |
| Authorization | `APPROVE PRODUCTION FIREBASE DEPLOY: production-promote-portal-and-studio-2026-08-23` |
| Production source SHA | **`94a1ed0009deab775d8b0c60be44ca931c0ad291`** |
| Project | **`fresh-prints-prod`** |

---

## Pre-deploy verification (agent — passed)

| Check | Result |
|-------|--------|
| `origin/production` | `94a1ed0009deab775d8b0c60be44ca931c0ad291` |
| Working tree `firestore.rules` + `functions/` vs `94a1ed0` | **identical** (empty `git diff`) |
| Branch | `development` @ `3f546d9` (docs-only ahead; Gate D product tree matches production) |
| `.firebaserc` production alias | `fresh-prints-prod` |
| Scope unchanged | Rules + 4 Functions only |
| `npm --prefix functions run build` | exit **0** |

## Exact command (owner must run locally)

```bash
firebase deploy --only firestore:rules,functions:completeStaffGangSheetAndOpenNext,functions:convertCustomerPrintRequestToInternal,functions:listPortalPublicShows,functions:listPortalShowCatalogDesigns --project fresh-prints-prod
```

Run from: `C:\coding\fresh-prints` with Functions built (`npm --prefix functions run build` already exit 0).

Do **not** broaden scope. Do **not** deploy indexes, Storage, App Hosting, or secrets.

---

## Post-deploy verification (pending owner CLI)

After the command succeeds, reply `CONTINUE GATE D POST-DEPLOY` (or paste deploy output) so the agent can verify:

- [ ] Firestore Rules released
- [ ] `completeStaffGangSheetAndOpenNext` ACTIVE
- [ ] `convertCustomerPrintRequestToInternal` ACTIVE
- [ ] `listPortalPublicShows` ACTIVE
- [ ] `listPortalShowCatalogDesigns` ACTIVE
- [ ] Region/runtime unchanged
- [ ] No unrelated resources changed

Suggested read-only checks:

```bash
firebase functions:list --project fresh-prints-prod
```

---

## Not in this gate

- App Hosting rollout
- Studio 1.0.9 dispatch/publish

## Next phrase after Gate D verified

```text
APPROVE PRODUCTION APP HOSTING ROLLOUT: production-promote-portal-and-studio-2026-08-23
```

Rollout must use production SHA `94a1ed0…` (never `development`).
