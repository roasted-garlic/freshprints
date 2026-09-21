# Fresh Prints — Current State Snapshot

## CURRENT AUTHORITATIVE PHASE — IDLE

**Last updated:** 2026-09-21

FreshForge is **IDLE**. Managed goal `studio-portal-print-request-inbox-ai-queue-batch` is **CLOSED** after Owner DEV QA PASS, Signoff **approved_with_notes**, and full coordinated production rollout.

| Field | Value |
|------|-------|
| Production SHA | `f09dafc6a9566fa0ee021646e5b7d1318cc010a9` (PR [#106](https://github.com/roasted-garlic/freshprints/pull/106)) |
| Goal commit | `35b0ea80b8821726f8cf1a9c1c23abe3ba0b3bbe` |
| Studio | **`v1.0.18` Latest** — workflow `35619359510`; 8 assets; rollback `v1.0.17` |
| Functions | `getPortalAdminUpcomingShowQueueDashboard` + `promoteStaffArtworkToAiReview` **ACTIVE** |
| Portal | `fresh-prints-portal-build-2026-09-21-001` **100%** traffic; smoke HTTP 200 |
| Indexes | 3 Staff Inbox composites **READY**; `upcomingShows(updatedAt+__name__)` covered by GCP single-field controls |
| Rules / Storage / secrets / IAM / migrations | **unchanged** |
| Signoff | `docs/workflow/reviews/2026-09-21-studio-portal-print-request-inbox-ai-queue-batch-signoff.md` |
| Rollout record | `docs/workflow/reviews/2026-09-21-studio-portal-print-request-inbox-ai-queue-batch-production-rollout.md` |

## PREVIOUS CLOSED GOAL — STAFF ARTWORK AI TITLE CORRECTIVE

### Shipped

| Item | Value |
|------|-------|
| Goal commit | `4f9732ad032d131f8e10a2bfa6aa72dbfa1d7c25` |
| PR | #105 |
| Production SHA (pre-batch) | `9c7e4da8922a2413abb73d609b6f82ce6af3e249` |
| Studio (pre-batch) | **v1.0.17** |

Artifacts: `docs/workflow/plans/2026-09-19-studio-staff-artwork-ai-review-corrective-plan.md` and matching reviews/signoff under `docs/workflow/reviews/`.

## PREVIOUS — STUDIO INTAKE PROMOTION REVERSAL — CLOSED

Goal `studio-intake-review-efficiency-and-customer-upload-promotion-reversal` closed via PR **#104** / production `e6e90cdd` / Studio **v1.0.16**.
