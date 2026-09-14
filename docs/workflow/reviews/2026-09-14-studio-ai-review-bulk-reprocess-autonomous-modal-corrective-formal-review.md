# Formal Review — Studio AI Review bulk reprocess and Autonomous modal corrective

Date: 2026-09-14
Verdict: **approved_with_changes**
Reviewer basis: primary reconciliation of architecture and modal reconnaissance findings.

## Review result

The amendment is bounded, internally consistent, and safe to implement automatically. It uses the
existing component → hook/service → callable boundary and does not require backend changes. The
stale-rail diagnosis is proven by the tracked-return subscription accepting a cached pre-reset
snapshot after patch-primary removal. The proposed freshness baseline addresses that race without
forcing a refresh or tab navigation.

## Required bounded changes incorporated

1. The freshness barrier must be per tracked design and compare a captured pre-reset
   `updatedAt`/server timestamp. It must not require observing `pending`, because a legitimate fast
   completion can outrun a pending snapshot.
2. Bulk execution must be serial (concurrency 1), deduplicate IDs synchronously, and use a
   synchronous in-flight guard so repeated clicks cannot submit duplicate callables.
3. Bulk successes must not repeatedly overwrite the single-item pending-advance index. Selection
   is settled once from the current remaining list; failed rows remain available and inspectable.
4. The modal fix must portal the existing overlay to `document.body`; changing shared overlay CSS is
   unnecessary and would broaden risk. The modal panel becomes the overlay's direct flex child.
5. Copy must use the shared phrase constant and the existing browser clipboard fallback, with no
   input autofill or authorization-flow change. Focus/Escape behavior must be preserved or covered
   by the existing modal containment pattern.

## Security and scope

No authorization, callable, Rules, schema, data, secret, provider, Autonomous policy, Pass 2,
production, or release behavior is changed. Local reconciliation remains UI state only; the
existing server callable remains authoritative. Manual owner DEV QA is the only remaining gate.

## Approval

**Approved with the bounded changes above. Continue automatically through Implement, Test,
Independent Review, and DEV QA Preparation; stop only at `OWNER QA REQUIRED — STUDIO 1.0.12
CORRECTIVE`.**
