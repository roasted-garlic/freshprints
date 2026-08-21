# Gate B index deploy — printRequests isInternal+queueTab

| Field | Value |
|-------|-------|
| Date | 2026-08-21 |
| Goal | `promote-print-request-correctives-to-production` |
| Authorization | Owner `APPROVE PROD INDEX: printRequests isInternal+queueTab` |
| Project | `fresh-prints-prod` |
| Production merge SHA | `7716d4a97f83c2dbe5602fb3e149875d6d7f38c9` (PR **#84**) |
| Agent deploy | hook-blocked; owner-local CLI succeeded |
| Status | **COMPLETE — READY** |

---

## Gate A (recorded)

| Item | Value |
|------|--------|
| PR | https://github.com/roasted-garlic/freshprints/pull/84 |
| State | **MERGED** 2026-08-21T14:12:16Z |
| Merge commit | `7716d4a97f83c2dbe5602fb3e149875d6d7f38c9` |
| Source head | `eaf52e7265c9dbc3f1a82782380f9b899ebbe9a7` |
| Prior production | `99b230333efd9a4892f8c4a30ccf72008baf2246` |

---

## Required composite (source once)

```text
printRequests COLLECTION
isInternal ASC, queueTab ASC, updatedAt DESC, __name__ DESC
```

Local `firestore.indexes.json`: **77** indexes; this four-field composite appears **exactly once**.

---

## Pre-deploy live delta — **PASS**

Canonical keys strip trailing `__name__` (Firebase materializes it on live).

| Metric | Pre-deploy |
|--------|------------|
| Local total | **77** |
| Live total | **76** |
| Target live | **no** |

```text
CREATE:
1. printRequests | isInternal ASC + queueTab ASC + updatedAt DESC + __name__ DESC

DELETE:
NONE

UNEXPECTED:
NONE
```

---

## Deploy

| Item | Value |
|------|--------|
| Command | `firebase deploy --only firestore:indexes --project fresh-prints-prod --non-interactive` |
| Executor | Owner-local (agent hook-blocked) |
| Exit | **0** |
| Result | `deployed indexes in firestore.indexes.json successfully for (default) database` / Deploy complete |
| `--force` | **not used** |
| Deletions proposed | **none** |
| Scope | Indexes only (rules file compiled as a check; rules were **not** the deploy target) |

---

## Wait until READY — **PASS**

Monitored via `gcloud firestore indexes composite describe` / `composite list --project=fresh-prints-prod`.

| Item | Value |
|------|--------|
| Index id | `CICAgPi9o4UK` |
| Full name | `projects/fresh-prints-prod/databases/(default)/collectionGroups/printRequests/indexes/CICAgPi9o4UK` |
| Fields | `isInternal ASC, queueTab ASC, updatedAt DESC, __name__ DESC` |
| Observed | **CREATING → READY** |
| ERROR | **none** |

---

## Post-deploy canonical comparison — **PASS**

| Metric | Post-deploy |
|--------|-------------|
| Local total | **77** |
| Live Firebase listing | **77** |
| gcloud total | **77** |
| gcloud states | **77 READY** |
| missing (local not live) | **0** |
| unexpected (live not local) | **0** |
| deleted vs pre-deploy intent | **0** |
| Target state | **READY** |

Existing live `isInternal + updatedAt` and `queueTab + updatedAt + __name__` remain.

---

## Not executed this gate

- Functions (including `queuePortalPrintRequestToShow`)
- App Hosting
- Studio publish / version bump
- Rules, Storage, Auth, secrets, Algolia
- Schema / `isInternal` backfill

## Next gate

```text
APPROVE PROD FUNCTION: queuePortalPrintRequestToShow
```
