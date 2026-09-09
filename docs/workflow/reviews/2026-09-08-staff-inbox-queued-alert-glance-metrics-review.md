# Review: Staff Inbox queued alert glance metrics

| Field | Value |
|-------|-------|
| Date | 2026-09-08 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-09-08-staff-inbox-queued-alert-glance-metrics-plan.md |
| Verdict | **approved** |

---

## Summary

Bounded Studio Inbox UI enrichment: reuse the existing portal allocation subscription, expand the client snapshot, derive glance metrics in shared helpers, and render design qty / print qty / total price on `portal_queued` cards only. No persisted schema, Rules, Functions, or new listeners.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Open + optional Done live-enrich; queued only |
| Architecture alignment | pass | Shared derive + Studio row/settings hook |
| Security impact addressed | pass | Read-only existing staff fields |
| Data model impact addressed | pass | No persistence |
| Backend impact addressed | pass | None |
| Test strategy adequate | pass | Shared unit + manual UI |
| Human checkpoints identified | pass | Owner visual QA; no deploy in scope |
| Roadmap alignment | pass | Operational inbox polish |
| Documentation plan | pass | Workflow artifacts only |
| No silent scope expansion | pass | Explicit out-of-scope list |

---

## Architecture Review

**Findings:**
- Correct layering: snapshot mapping in Studio subscription service; pure metrics in shared; presentation in `StaffInboxItemRow`.
- Allocation-scoped metrics match alert semantics better than full-request hydration without adding reads.

**Required changes:**
- None.

---

## Security Review

**Findings:**
- No auth/Rules changes; no new client-trusted writes.

**Required changes:**
- None.

---

## Data / Backend Review

**Findings:**
- Intentionally avoids ack field / Rules allowlist expansion.

**Required changes:**
- None.

---

## Test Review

**Findings:**
- Derive/helper unit tests are the right gate; full Studio typecheck may remain baseline-noisy.

**Required changes:**
- None.

---

## Human Checkpoints

- Owner visual check on Inbox + bell after implement.
- Commit / push / publish / production remain forbidden until separately authorized.

---

## Verdict Rationale

Plan is narrow, reversible, and consistent with existing show-queue / pricing helpers. Approved for implementation under owner request to finish this tweak locally.
