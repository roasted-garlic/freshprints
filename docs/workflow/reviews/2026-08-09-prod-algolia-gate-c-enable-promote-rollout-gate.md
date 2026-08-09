# Gate: Production Algolia Portal enable — source promote + App Hosting rollout

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Authorization | `APPROVE PROD ALGOLIA ENABLE` + owner `ALGOLIA PORTAL SECRETS: READY` |
| Secrets verify | All four secret **names** present on `fresh-prints-prod` (values not read) |
| Branch | `feat/portal-algolia-enable-apphosting` @ **`42cf4ad`** |
| Base | `production` tip **`f5c0bdb`** (PR #49; contains `42cf4ad`) |
| Backend | `fresh-prints-portal` |
| Source promote | Owner **`ALGOLIA ENABLE SOURCE PROMOTED: PASS`** — agent verify PASS |

---

## Source change (pushed)

- `apps/portal/apphosting.yaml` — four Algolia `secret:` refs
- `apps/portal/.env.example` — prod index name note
- `docs/standards/DEPLOYMENT.md` — Algolia Portal secrets table

---

## Owner: promote to `production` — DONE (PR #49 → `f5c0bdb`)

---

## Owner: App Hosting rollout (exact tip)

```powershell
cd C:\coding\fresh-prints
firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit f5c0bdb7f37d0d7fab589fbe31a6a76963e456a0 --force
```

Reply: **`PROD ALGOLIA ENABLE ROLLOUT: COMPLETE`** (include build id if known)

---

## Owner QA (after live)

### Steps

1. Open production Portal catalog → search a known ready design title → **Expected:** results via managed search
2. Confirm facets/filters still usable
3. Spot-check that browse still works for ordinary navigation

### Pass criteria

- [ ] Search returns catalog hits
- [ ] No reliance on `_dev` index
- [ ] No Admin key used in Portal

Reply: **`PROD ALGOLIA ENABLE QA: PASS`** (or `FAIL: …` / `PASS WITH NOTES: …`)

---

## Kill-switch

```powershell
firebase apphosting:secrets:set NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH --project fresh-prints-prod
# value: false
# then roll out tip again
```

---

## Explicitly forbidden

- Pasting Search/Admin API key values into chat
- Rollout of tip **without** Algolia yaml refs
- Using `portal_catalog_ready_dev`
