# Checkpoint: Production PR — GA4 enablement (no merge)

| Field | Value |
|-------|-------|
| Date | 2026-08-17 |
| Managed goal | `portal-ga4-production-enablement` |
| Signoff | not yet — App Hosting + owner QA still gated |
| PR base | `origin/production` |
| Status | **Branch pushed; GitHub PR create hook-blocked in this agent — owner must open the production PR** |
| Compare | https://github.com/roasted-garlic/freshprints/compare/production...chore/portal-ga4-measurement-id?expand=1 |
| Merge | **NOT authorized** |
| App Hosting | **NOT authorized** |

---

## Intended PR contents

### Configuration
- `apps/portal/apphosting.yaml` — `NEXT_PUBLIC_GA_MEASUREMENT_ID` Secret Manager mapping (BUILD + RUNTIME)

### Docs (this goal only)
- Plan, Formal Review, Checkpoint B, test report, this checkpoint
- `docs/standards/DEPLOYMENT.md` — env-table row for the Measurement ID (value not committed)

### Explicitly excluded
- Analytics implementation rewrite
- Functions, Rules, indexes, Storage, Algolia, Auth, DNS
- Studio, TD-030 product code, tag-alias, cutover artifacts
- Plaintext `G-` Measurement ID
- Unrelated local/untracked files from `fix/td-030-share-qty-parity`

---

## After owner audit + merge (later)

```
AUTHORIZE PROD APP HOSTING ROLLOUT: GA4 ENABLEMENT
```

Do **not** send until merge is complete.
