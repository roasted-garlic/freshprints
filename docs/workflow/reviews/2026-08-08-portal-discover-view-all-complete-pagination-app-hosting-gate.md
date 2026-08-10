# App Hosting Gate — Discover / View All complete pagination (TD-031)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Managed goal | `portal-discover-view-all-complete-pagination` |
| Status | **ROLLOUT COMPLETE — OWNER QA PENDING** |
| Live build | **`build-2026-08-08-003`** @ `9f3a01a` (100%) |
| Source | PR **#43** MERGED → `production` `9f3a01ae0585d607f9a332dad2c86ad2a541548b` |
| Contains fix | `a01a9dc2139f0e060faac083541bb92c1e022c9a` |

---

## Preconditions (satisfied)

- [x] `origin/production` = `9f3a01ae0585d607f9a332dad2c86ad2a541548b`
- [x] Production contains approved implementation `a01a9dc`
- [x] Live build still **`build-2026-08-08-002`** (100%) until this gate runs
- [x] Source-promotion record finalized

---

## Owner phrase

```text
APPROVE PROD DISCOVER VIEW ALL PAGINATION APP HOSTING ROLLOUT
```

---

## Exact command (after phrase only)

```powershell
firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit 9f3a01ae0585d607f9a332dad2c86ad2a541548b --force
```

---

## After SUCCEEDED

1. Verify traffic 100% on the new build (expect next `build-2026-08-08-*` @ `9f3a01a`).
2. Smoke `/` + `/catalog` HTTP 200.
3. Owner QA:
   `docs/workflow/reviews/2026-08-08-portal-discover-view-all-complete-pagination-owner-qa-checklist.md`
4. Reply: `DISCOVER VIEW ALL PAGINATION QA: PASS` (or FAIL / PASS WITH NOTES)

---

## Out of scope for this gate

Functions, Rules, indexes, Algolia, readyAt, Storage, taxonomy.
