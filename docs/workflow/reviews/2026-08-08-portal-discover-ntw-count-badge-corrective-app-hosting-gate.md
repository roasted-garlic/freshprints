# App Hosting Gate — NTW count badge corrective (TD-031)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Managed goal | `portal-discover-view-all-complete-pagination` (NTW count corrective + schedule companion) |
| Status | **READY AFTER COMPANION MERGE — DO NOT EXECUTE UNTIL OWNER PHRASE** |
| NTW corrective on production | `c181f5694bde83ddee26863a0a6a8d546c39619e` (contains `82ea610`) |
| Schedule companion (local) | branch `fix/portal-schedule-prop-wiring` tip `36d71ff` (`ce80dac` + docs) — **merge to production before rollout** |

---

## Preconditions

- [x] NTW corrective on `production` (`c181f56` / `82ea610`)
- [ ] Schedule prop companion merged to `production` (branch `fix/portal-schedule-prop-wiring` @ `ce80dac`)
- [x] Live still **`build-2026-08-08-003`** until this gate runs
- [x] Source-promotion record finalized for PR #44

**Rollout `--git-commit`:** use the **exact `origin/production` tip after the schedule companion is merged** (not `c181f56` alone if companion lands after).

---

## Owner phrase

```text
APPROVE PROD DISCOVER NTW COUNT BADGE APP HOSTING ROLLOUT
```

---

## Expected command (after phrase only)

```powershell
firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit <EXACT_PRODUCTION_TIP_INCLUDING_SCHEDULE_COMPANION> --force
```

---

## After SUCCEEDED

1. Traffic 100% on new build  
2. Smoke `/` + `/catalog` + `/catalog?discover=new`  
3. Owner QA:  
   `docs/workflow/reviews/2026-08-08-portal-discover-ntw-count-badge-corrective-owner-qa-checklist.md`  
4. Reply: `DISCOVER VIEW ALL PAGINATION QA: PASS`

Also spot-check print-request detail schedule section still renders when scheduled shows exist.

---

## Out of scope

Functions, Rules, indexes, Algolia, readyAt, Storage, taxonomy.
