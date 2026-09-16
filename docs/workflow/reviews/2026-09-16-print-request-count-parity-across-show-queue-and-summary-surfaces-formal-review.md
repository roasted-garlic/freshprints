# Formal Review: Print Request count parity across Show Queue and summary surfaces

| Field | Value |
|---|---|
| Date | 2026-09-16 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-16-print-request-count-parity-across-show-queue-and-summary-surfaces-plan.md` |
| Goal | `print-request-count-parity-across-show-queue-and-summary-surfaces` |
| Verdict | **approved_with_changes** |
| Implementation authorization | **Not granted by this review** |

---

## Post-review owner authorization

After this review, the owner explicitly accepted the plan with the listed changes and authorized
continuous Implement → focused/cross-surface Test → typecheck/lint/build → documentation and Owner
DEV QA preparation. That authorization came from the owner follow-up request, not from this review
itself. The authorization excludes production actions, commits/pushes, schema/rules/index changes,
data repair/backfill, new Functions/DTOs, and scope expansion. The workflow must stop at Owner DEV QA
until the owner records results.

---

## Summary

The plan is approved as a bounded implementation proposal with the conditions below. The investigation proves the reported production mismatch: the Studio Show Queue row combines all allocation-history rows/quantity (`34 / 46`) with active-only tier and price calculations (`19 + 6 / $56`). The requested `19 / 25` full-request result is supported by live `printRequestItems` and source-aware identity, while persisted `PrintRequest.itemCount` is a row count and is independently used as a misleading Designs value in Portal and user-history surfaces.

The plan correctly separates two scopes that must not be conflated:

- Full request contents: source-aware identities and quantities from current `printRequestItems`.
- Selected-show operational contents: source-aware identities and quantities from non-canceled `showAllocations` for that show.

No implementation, data repair, migration, production write, deploy, or release is authorized by this review.

## Evidence review

| Finding | Status | Review note |
|---|---|---|
| Production request and allocation lineage were resolved through bounded read-only access | pass | The plan records the resolved request ID and aggregate facts without claiming an unrecorded user action as certain |
| `34 / 46` is reproducible from current Studio code | pass | `group.allocations.length` and all-row quantity reduction are distinct from active-only tier and pricing paths |
| Canceled history is the immediate inflation source | pass | Production contains 14 canceled rows totaling 21 quantity; active rows total 25 |
| 19 logical Designs is source-aware rather than persisted row count | pass | The duplicate upload identity explains 20 live item rows becoming 19 logical identities |
| Move/requeue behavior is addressed without over-claiming production evidence | pass | Code supports possible historical duplication; production has no move/requeue lineage IDs for this request |

## Review checklist

| Area | Status | Notes |
|---|---|---|
| Scope clear and bounded | pass with condition | Broad surface inventory is required by the goal; unrelated catalog/account statistics remain explicitly out of scope |
| Count contract | pass | Full-request and selected-show allocation scopes are explicit, named, and testable |
| Architecture alignment | pass | Shared source-aware identity plus shared summary adapters are appropriate; existing readers and permission boundaries remain in place |
| Data model impact | pass | No schema change; `itemCount` remains compatibility state and is not backfilled |
| Backend/API impact | pass with condition | Existing Portal Admin DTO/callable should remain stable; any Function source change must be called out in implementation and included in promotion |
| Security/privacy | pass | No new permission boundary or data exposure is proposed |
| Lifecycle/history behavior | pass with condition | Preserve history grouping/export and make history-only UI explicit; canceled rows must never feed active counters |
| Test strategy | pass with condition | All listed fixtures and cross-surface contract checks are required before signoff; no unrun test may be reported as passing |
| UX impact | pass with condition | Owner DEV QA must verify labels and the intended “allocated to this show” scope on a real DEV request |
| Production safety | pass | No production promotion or data mutation is authorized; promotion delta is enumerated for a later checkpoint |
| Documentation | pass | Durable count semantics are updated only if the implementation changes the documented contract |

## Required changes before implementation

1. Preserve the plan's two-scope contract exactly. The Show Queue attached-request row must count current non-canceled allocation identities and allocated quantity for that selected show. It must not be changed to show full-request totals merely to match the Print Request list.
2. Keep `groupAllocationsByRequest` history-inclusive if it is needed for move/requeue/history actions, but move current numeric counters to the tested active-allocation summary. Canceled-only groups must be visibly history-only rather than silently showing canceled values as current Designs/Items.
3. Make source identity precedence explicit and shared across Catalog, Customer Upload, Staff Artwork, and fallbacks. Prefix namespaces so equal IDs across sources cannot collide. Add the production-shaped duplicate-upload fixture before wiring every consumer.
4. Do not repurpose or rewrite `PrintRequest.itemCount`. If an existing history/activity surface cannot obtain a bounded live item summary without a material read/performance change, stop that sub-surface and request owner direction; relabeling or a new server DTO is not an implicit scope expansion.
5. Keep Portal Admin's current DTO shape and active-allocation semantics. A shared helper refactor is acceptable, but it requires Functions tests and a Functions promotion entry if the callable bundle changes.
6. Preserve the existing historical export mode and test it separately from active operational counts. Do not use all-row historical totals with active-only price/tier labels.
7. Complete the required automated checks, targeted typechecks/lint/builds, and Owner DEV QA before signoff. This review is not owner implementation authorization, commit authorization, or production authorization.

## Architecture review

**Findings:**

- The source data already exists in live `printRequestItems` and `showAllocations`; adding a persisted aggregate would create another drift surface.
- The existing shared source-type resolver and current-request aggregate provide the right source semantics to centralize.
- The proposed allocation summary can serve Studio, Staff Inbox, Portal Admin, and Functions while retaining surface-specific scope and permissions.

**Required changes:**

- [x] Use one namespaced source identity primitive.
- [x] Keep full-request and selected-show aggregation APIs visibly distinct.
- [x] Keep Firestore readers and authorization boundaries unchanged.

## Security and data review

**Findings:**

- Investigation used read-only production access only.
- Implementation has no required Firestore write, migration, backfill, rules, index, settings, or storage change.
- Canceled history is ignored by current operational summaries through read semantics, not deleted.

**Required changes:**

- [x] No production console or data action.
- [x] Stop if new credentials or a new permission boundary is proposed.
- [x] Treat any new Function/DTO as a separate review point, not an automatic implementation detail.

## Test review

The listed coverage is adequate if it is implemented as cross-surface contract coverage rather than only isolated helper tests. At minimum, the production-shaped fixture must assert:

- Full request: 19 Designs, 25 Items.
- Selected show active allocation: 19 Designs, 25 Items.
- Historical/all-row allocation: retained only for explicitly historical output, never operational counters.
- Tier quantities: Reg Full 19 and Reg Oversize 6, summing to 25.
- Price: `$56` with the repository's production default pricing, unchanged by canceled rows.

The tests must also cover duplicate same-design rows/sizes, mixed source types, remove/re-add, move/requeue, multi-show splits, canceled-only groups, Portal/Studio/Staff Inbox/Admin parity, and the existing dollar regression. Failures must be recorded honestly at the Test gate.

## Human checkpoints

- **Required before implementation:** owner explicitly authorizes implementation after this review.
- **Required before signoff:** owner DEV QA reviews the changed labels and scope on DEV data.
- **Required before promotion:** owner separately authorizes production promotion; reviewed PR/release and any Functions or Portal hosting deployment follow repository policy.

## Verdict rationale

**Approved with changes.** The plan answers the requested investigation questions with production and code evidence, chooses a coherent definition for both full-request and selected-show counts, and avoids destructive repair. The conditions are implementation guardrails, not permission to begin implementation. The workflow must stop here until the owner provides implementation authorization.
