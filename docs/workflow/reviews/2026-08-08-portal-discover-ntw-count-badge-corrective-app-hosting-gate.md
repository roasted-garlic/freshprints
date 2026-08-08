# App Hosting Gate — NTW count badge corrective (TD-031)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Managed goal | `portal-discover-view-all-complete-pagination` (NTW count corrective) |
| Status | **READY — DO NOT EXECUTE UNTIL OWNER PHRASE** |
| Source | PR **#44** MERGED → `production` `c181f5694bde83ddee26863a0a6a8d546c39619e` |
| Contains fix | `82ea6100a8480890d3d7c5e4bc62168253369e2b` |

---

## Preconditions (satisfied)

- [x] `origin/production` = `c181f5694bde83ddee26863a0a6a8d546c39619e`
- [x] Production contains approved corrective `82ea610`
- [x] Live still **`build-2026-08-08-003`** (100%) until this gate runs
- [x] Source-promotion record finalized

---

## Owner phrase

```text
APPROVE PROD DISCOVER NTW COUNT BADGE APP HOSTING ROLLOUT
```

---

## Exact command (after phrase only)

```powershell
firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit c181f5694bde83ddee26863a0a6a8d546c39619e --force
```

---

## After SUCCEEDED

1. Verify traffic 100% on the new build (expect next `build-2026-08-08-*` @ `c181f56`).
2. Smoke `/` + `/catalog` + `/catalog?discover=new` HTTP 200.
3. Owner QA:  
   `docs/workflow/reviews/2026-08-08-portal-discover-ntw-count-badge-corrective-owner-qa-checklist.md`
4. Reply: `DISCOVER VIEW ALL PAGINATION QA: PASS` (or FAIL / PASS WITH NOTES)

---

## Out of scope for this gate

Functions, Rules, indexes, Algolia, readyAt, Storage, taxonomy.
