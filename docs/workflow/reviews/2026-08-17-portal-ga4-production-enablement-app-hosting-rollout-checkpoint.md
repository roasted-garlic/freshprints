# Checkpoint C: Production App Hosting rollout — GA4 enablement (historical pre-flight)

> **Superseded for live status.** Owner completed the authorized rollout. Live: `fresh-prints-portal-build-2026-08-17-002` @ 100% serving `124c6fa`. See `2026-08-17-portal-ga4-production-enablement-app-hosting-rollout-record.md`. Body below is the pre-flight record and is left as it was at Checkpoint C.

| Field | Value |
|-------|-------|
| Date | 2026-08-17 |
| Managed goal | `portal-ga4-production-enablement` |
| Authorization | later obtained: `AUTHORIZE PROD APP HOSTING ROLLOUT: GA4 ENABLEMENT` |
| Production source SHA | `124c6fa4ad3c86defa8fd61c578b3efeaf6609bb` |
| Status at write | **PRE-FLIGHT PASS** (historical) |
| App Hosting at write | **NOT run** (historical) |

---

## Preflight

| Check | Result |
|-------|--------|
| `origin/production` | `124c6fa4ad3c86defa8fd61c578b3efeaf6609bb` |
| Merge subject | `Merge pull request #80 from roasted-garlic/chore/portal-ga4-measurement-id` |
| Merge parents | `f8acb26d76acdaed5f145138681f30b1d63c7257` + `ea9abe12161e5483014d91fcf7258a039ae97e5e` |
| PR #80 | **MERGED** — https://github.com/roasted-garlic/freshprints/pull/80 |
| YAML mapping | `NEXT_PUBLIC_GA_MEASUREMENT_ID` → secret `NEXT_PUBLIC_GA_MEASUREMENT_ID`, availability `BUILD` + `RUNTIME` |
| Secret | version **1 enabled** |
| Enhanced Measurement | Owner-recorded **fully OFF** |
| Decision 7 | **SATISFIED** |
| Live App Hosting at pre-flight | `fresh-prints-portal-build-2026-08-17-001` @ 100% |

### Exact command (later run by owner)

```bash
firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit 124c6fa4ad3c86defa8fd61c578b3efeaf6609bb --force --non-interactive
```

### Rollback (historical)

- Source: `f8acb26d76acdaed5f145138681f30b1d63c7257`
- Build: `fresh-prints-portal-build-2026-08-17-001`
