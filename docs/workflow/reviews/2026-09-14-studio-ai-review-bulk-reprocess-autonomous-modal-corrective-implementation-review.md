# Independent implementation and adversarial review — Studio 1.0.12 corrective

Date: 2026-09-14
Verdict: **PASS — bounded renderer-only implementation ready for DEV QA**

## Findings resolved

The first adversarial pass identified six bounded defects. The final diff resolves each:

1. `bulkReprocessRunningRef` synchronously prevents overlapping bulk runners; per-ID guards still
   prevent duplicate callable submission.
2. Completion status is rendered outside the multi-select bar, and partial failures expose each
   failed ID/reason. Auto-start failures are visible as warnings while reset success remains a
   success.
3. Bulk reconciliation does not overwrite the single-item advance ref. Retention is suppressed
   while the run is active, then one final selection is chosen (failed selected row first, otherwise
   the first remaining row).
4. Tracked listener callbacks require an active baseline and mark a run consumed before upsert/count
   side effects, preventing stale replaced subscriptions from double-consuming a return.
5. Bulk Auto-start errors are recorded as inspectable warnings.
6. Missing/non-finite timestamp baselines fail closed for tracked terminal classification.

## Scope review

- Existing `resetAiEnrichmentForProcessing` callable/service remains authoritative and unchanged.
- No Functions, Rules, indexes, schemas, migrations, Storage, secrets, provider behavior,
  Autonomous policy, Pass 2, Portal, production, or Studio release files changed.
- Modal correction is limited to document-level portal ownership, focus containment, scoped phrase
  layout, and clipboard feedback. Exact shared confirmation constant and typed comparison remain.

Independent verdict: **PASS**. No owner checkpoint is required before the requested manual DEV QA;
the next and only gate is Owner QA.
