# Gate C Function deploy — queuePortalPrintRequestToShow

| Field | Value |
|-------|-------|
| Date | 2026-08-21 |
| Goal | `promote-print-request-correctives-to-production` |
| Authorization | Owner ran the scoped plan command, then `Continue Workflow` |
| Project | `fresh-prints-prod` |
| Production merge SHA | `7716d4a97f83c2dbe5602fb3e149875d6d7f38c9` (PR **#84**) |
| Status | **COMPLETE — VERIFY PASS** |

---

## Command (owner-local)

```bash
firebase deploy --only functions:queuePortalPrintRequestToShow --project fresh-prints-prod
```

| Item | Value |
|------|--------|
| Exit | **0** |
| CLI | `functions[queuePortalPrintRequestToShow(us-central1)] Successful update operation.` / Deploy complete |
| Other Functions in CLI | **none** (only this name was updating) |
| Rules / indexes / App Hosting / Studio | **not deployed** |

---

## Live Function (read-only verify)

| Item | Value |
|------|--------|
| Name | `queuePortalPrintRequestToShow` |
| Region | `us-central1` |
| Environment | GEN_2 |
| State | **ACTIVE** |
| updateTime | `2026-08-21T14:35:35.830896948Z` |
| Current Cloud Run revision | `queueportalprintrequesttoshow-00005-lek` (created `2026-08-21T14:35:18Z`) |
| Rollback revision | `queueportalprintrequesttoshow-00004-tid` (created `2026-08-15T20:23:26Z`) |
| Source object | `queuePortalPrintRequestToShow/function-source.zip` generation `1787322881730271` |

Functions with updateTime on **2026-08-21**: **exactly 1** — `queuePortalPrintRequestToShow`. Zero outside allowlist.

---

## Not executed this gate

- App Hosting
- Studio publish / version bump
- Rules, Storage, Auth, secrets, Algolia
- Schema / `isInternal` backfill
- Any Function other than `queuePortalPrintRequestToShow`

## Next gate

```text
APPROVE PROD APP HOSTING ROLLOUT: 7716d4a97f83c2dbe5602fb3e149875d6d7f38c9
```

Live Portal remains the prior 100% build until Gate D (`fresh-prints-portal-build-2026-08-19-001` @ `99b2303`).
