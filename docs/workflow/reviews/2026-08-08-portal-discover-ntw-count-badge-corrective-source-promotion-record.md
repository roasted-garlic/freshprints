# Source Promotion Record — NTW count badge corrective (TD-031)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Managed goal | `portal-discover-view-all-complete-pagination` (NTW count corrective) |
| Authorization | `APPROVE PROD DISCOVER NTW COUNT BADGE SOURCE PROMOTION` |
| Status | **SOURCE PROMOTED / LIVE PORTAL STILL ON PRE-CORRECTIVE BUILD** |

---

## Preflight

| Check | Result |
|-------|--------|
| Feature branch | `fix/portal-discover-ntw-count-badge-corrective` |
| Approved corrective HEAD | `82ea6100a8480890d3d7c5e4bc62168253369e2b` |
| `origin/production` before | `9f3a01ae0585d607f9a332dad2c86ad2a541548b` |
| Diff containment | **PASS** (approved catalog files + docs) |

---

## Protected Git promotion

| Item | Value |
|------|-------|
| PR | **#44** |
| URL | https://github.com/roasted-garlic/freshprints/pull/44 |
| Title | fix: correct New This Week aggregate count state |
| Head OID | `82ea6100a8480890d3d7c5e4bc62168253369e2b` |
| State | **MERGED** / CLOSED |
| Merged at | `2026-08-08T19:37:31Z` |
| Agent push/PR | Cursor hook blocked; **owner completed push + merge** |
| Merge method | **merge commit** |
| Production SHA before | `9f3a01ae0585d607f9a332dad2c86ad2a541548b` |
| Production merge SHA | `c181f5694bde83ddee26863a0a6a8d546c39619e` |
| Parents | `9f3a01a` + `82ea610` |
| Subject | `Merge pull request #44 from roasted-garlic/fix/portal-discover-ntw-count-badge-corrective` |

---

## Post-merge verification (2026-08-08)

| Check | Result |
|-------|--------|
| `git fetch origin` | **DONE** |
| `origin/production` | `c181f5694bde83ddee26863a0a6a8d546c39619e` (**exact**) |
| Contains `82ea610` | **YES** (parent / ancestor) |
| Direct production push | **NO** |
| Force push | **NO** |
| Live App Hosting | **100%** → `build-2026-08-08-003` |
| NTW count corrective live? | **NO** |

---

## Companion Portal fix (same managed goal — next App Hosting)

Uncommitted schedule prop wiring (`scheduledShowEntries` / `entries`) must **not** remain a stray local diff. It is tracked under this goal and must be on `production` before (or as part of) the next Portal App Hosting rollout so the corrective build is not shipped without it.

See: companion promotion / commit under `fix/portal-schedule-prop-wiring` (or successor) before App Hosting if not yet merged.

---

## Binding status

| Layer | Status |
|-------|--------|
| Git source (NTW corrective) | **PROMOTED** (`c181f56`) |
| Schedule prop companion | **Must ship with next Portal push** |
| App Hosting | **NOT YET ROLLED OUT WITH CORRECTIVE** |
| Owner QA | **AWAITING ROLLOUT** |

---

## Next gate

Gate: `docs/workflow/reviews/2026-08-08-portal-discover-ntw-count-badge-corrective-app-hosting-gate.md`

Owner phrase:

```text
APPROVE PROD DISCOVER NTW COUNT BADGE APP HOSTING ROLLOUT
```

Rollout `--git-commit` must be the **exact `origin/production` tip at rollout time** (include schedule companion if merged after `c181f56`).

---

## Confirmations

- NO App Hosting this pass
- NO Rules / Functions / indexes / Algolia / data / readyAt mutation
- NO direct production push / force push by agent
