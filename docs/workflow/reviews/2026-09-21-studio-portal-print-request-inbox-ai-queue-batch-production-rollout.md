# Production Rollout Record: studio-portal-print-request-inbox-ai-queue-batch

| Field | Value |
|-------|-------|
| Date | 2026-09-21 |
| Goal | `studio-portal-print-request-inbox-ai-queue-batch` |
| PR | [#106](https://github.com/roasted-garlic/freshprints/pull/106) |
| Production merge SHA | `f09dafc6a9566fa0ee021646e5b7d1318cc010a9` |
| Goal commit | `35b0ea80b8821726f8cf1a9c1c23abe3ba0b3bbe` |
| Disposition | **COMPLETE** |

## Surfaces

### Firestore indexes

| Signature | State | ID / note |
|-----------|-------|-----------|
| `showAllocations` `requestOriginSnapshot ASC, updatedAt DESC, __name__ DESC` | **READY** | `CICAgJjFvYoK` |
| `designIssueReports` `status ASC, createdAt DESC, __name__ DESC` | **READY** | `CICAgNirhYUK` |
| `designIssueReports` `status ASC, resolvedAt DESC, __name__ DESC` | **READY** | `CICAgJiUzYsK` |
| `upcomingShows` `updatedAt DESC, __name__ DESC` | **Covered by single-field controls** | GCP rejects composite create (`400 this index is not necessary`). Staff Inbox `orderBy(updatedAt).orderBy(__name__)` uses automatic single-field indexing. |

- Live composite count: **111**, all **READY**
- Removals vs pre-rollout: **0**
- Rules were compiled as a Firebase indexes-deploy side check only; **Rules were not deployed**

### Functions

| Function | State | Revision | Update time (UTC) | Source hash |
|----------|-------|----------|-------------------|-------------|
| `getPortalAdminUpcomingShowQueueDashboard` | **ACTIVE** | `getportaladminupcomingshowqueuedashboard-00003-meq` | 2026-09-21T16:05:29Z | `1610f7726ac125d96f8a2689fec74035b6cc2e9c` |
| `promoteStaffArtworkToAiReview` | **ACTIVE** | `promotestaffartworktoaireview-00004-qif` | 2026-09-21T16:05:27Z | `1610f7726ac125d96f8a2689fec74035b6cc2e9c` |

Both: `allTrafficOnLatestRevision: true`. Exact two-target deploy only (no fleet deploy).

Rollback revisions: `…-00002-guh` / `…-00003-hoz`.

### Portal App Hosting

| Item | Value |
|------|-------|
| Backend | `fresh-prints-portal` |
| Build / revision | `fresh-prints-portal-build-2026-09-21-001` |
| Commit | `f09dafc6a9566fa0ee021646e5b7d1318cc010a9` |
| Traffic | **100%** |
| Smoke | Hosted + custom-domain `/` and `/admin/show-queue` → HTTP **200**; no `fresh-prints-dev` markers |
| Rollback | `fresh-prints-portal-build-2026-09-17-003` |

### Studio

| Item | Value |
|------|-------|
| Version / tag | `1.0.18` / `v1.0.18` |
| Workflow | [35619359510](https://github.com/roasted-garlic/freshprints/actions/runs/35619359510) SUCCESS |
| SHA | `f09dafc6a9566fa0ee021646e5b7d1318cc010a9` |
| Draft / Latest / assets | false / yes / **8** |
| Rollback | `v1.0.17` |

## Safety confirmations

- Firestore Rules: **not deployed**
- Storage Rules: **not deployed**
- Migration / backfill / data repair: **none**
- Secrets / IAM: **unchanged**
- Destructive index deletions: **none**

## Verdict

**FULL COORDINATED PRODUCTION ROLLOUT COMPLETE**
