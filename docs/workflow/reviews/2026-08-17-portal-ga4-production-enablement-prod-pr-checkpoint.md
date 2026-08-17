# Checkpoint: Production PR — GA4 enablement (no merge)

| Field | Value |
|-------|-------|
| Date | 2026-08-17 |
| Managed goal | `portal-ga4-production-enablement` |
| Signoff | not yet — App Hosting + owner QA still gated |
| PR | [#80](https://github.com/roasted-garlic/freshprints/pull/80) **OPEN** |
| PR base | `production` @ `f8acb26d76acdaed5f145138681f30b1d63c7257` |
| Implementation/config head (before this docs correction) | `c213ad5f75245417fccbd4b77dfee335a2104b92` |
| Status | **PR #80 OPEN — STOP for final independent pre-merge re-audit** |
| Merge | **NOT authorized** |
| App Hosting | **NOT authorized** |

---

## Current PR state

- PR #80 is **OPEN**: https://github.com/roasted-garlic/freshprints/pull/80
- Production base: `f8acb26d76acdaed5f145138681f30b1d63c7257`
- Implementation/config head before this docs-only correction: `c213ad5f75245417fccbd4b77dfee335a2104b92`
- Merge **NOT authorized**
- App Hosting **NOT authorized** / **not run**

Historical note: the agent's original `gh pr create` targeting `production` was hook-blocked. The owner opened PR #80 afterward. This document must not claim the PR still does not exist.

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
