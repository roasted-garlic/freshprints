# Signoff: Amendment 9 P3 — Server AI taxonomy read containment

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Plan | `docs/workflow/plans/2026-08-07-amendment-9-p3-server-ai-taxonomy-read-containment-plan.md` |
| Formal Review | `approved_with_changes` |
| Impl Review | **APPROVED** (`c3d3c45`) |
| Dev deploy | `fresh-prints-dev` — `2026-08-07-amendment-9-p3-dev-deploy-record.md` |
| Live attribution | `docs/workflow/reviews/2026-08-07-amendment-9-combined-live-qa-attribution.md` |
| Verdict | **approved** |

---

## Architecture (must remain true)

| Property | Live confirmation |
|----------|-------------------|
| Process-local cache only | Yes — one `runtimeInstanceId` |
| One cold load per warm instance / cache window | **1 miss + 1 load-success**; then **89 hits** |
| No global one-load guarantee | Documented; multi-instance would each cold-load once |
| Finite TTL | **15 minutes** (`ttlMs=900000` logged) |
| Firestore remains canonical | Load from active categories + approved tags queries; expiry re-reads |

## Live results (UTC window `14:27:30Z`–`14:34:30Z`)

| Metric | Value |
|--------|------:|
| Instances | **1** |
| Cold loads | **1** (`documentCount=1139`) |
| Hits | **89** |
| Joins / expired / failures | **0 / 0 / 0** |
| Same-instance reload inside TTL | **None** |

## Explicit non-claims

- No production deploy.
- Does not remove Studio client tag hydrate (~1,121).
- Does not remove P4 publication C+T+R (~1.1K per full pub).
