# Portal Print Request Pre-Launch Stability — Amendment 9 Test Report

- **Date:** 2026-07-28
- **Scope:** Plan Section 27 / Amendment 9
- **Deployment:** none

## Focused behavior verification

The complete Amendment 9-focused suite passed **55 tests; 55 pass; 0 fail** in **1,437 ms**
wall-clock time (Node reported 396 ms test duration). It covers:

- explicit request/item/allocation/write reconciliation phases, committed-without-post-read,
  idempotent terminal retry, partial-print no-op, and malformed allocation remediation;
- production-wired request/allocation diagnostics that preserve exact missing/wrong-typed and
  legacy-extra field names without document values;
- monotonic mounted Portal progress (`queued → printing → done`) without regression;
- bounded historical show visibility, including a just-finished future show;
- terminal/past/cutoff Show Picker rows remaining visible but non-selectable, with no default
  destination when every row is inspect-only;
- request-switch stale success/error rejection, single-flight focus/timer coalescing, hidden/unmount
  cleanup, and effective-terminal polling stop;
- historical-only destination clearing, mixed-date eligible default selection, and the shared
  pointer/keyboard activation guard;
- the existing timer committed/post-commit phase matrix.

## Builds and static analysis

| Command | Result |
|---|---:|
| Portal typecheck | exit 0 |
| Functions build | exit 0 |
| Amendment 9 changed-file ESLint | exit 0 |
| `git diff --check` | exit 0 |
| Studio typecheck | exit 2; existing repository baseline errors, no Amendment 9 service/utility errors reported |
| Rules emulator | not required for Amendment 9 after the unproven compatibility branch was reverted |

The first implementation review correctly rejected an evidence-free Rules hypothesis. The owner
warning proves a request-level failure, but not an exact legacy field or source status. Amendment 9
therefore makes **no new Rules change**. The structured development-only manifest is the mechanism
for obtaining exact live evidence before any later Rules proposal.

## Behavioral conclusions

- Finish reconciliation now returns a sanitized structured result for every affected request:
  parser state, missing/extra field names, current/proposed status, write intent, Firebase code,
  commitment, success, diagnostic category, and retry eligibility.
- Retry is restricted to transient failed IDs. Remediation IDs are separate, non-retryable, and
  receive distinct staff wording. Retry state resets when the action or selected show changes.
- A completion write has no post-write read, so a committed write cannot be mislabeled as failed.
- Mapper-invalid allocations are no longer silently omitted from completion math; they are reported
  as remediation-required at the allocation-read phase.
- The Portal rail and live indicator share one per-request monotonic mounted-stage authority.
- The historical query retains its existing lower bound. Terminal shows are display-only even when
  their scheduled time is still future, and disabled rows cannot become allocation destinations.
- `listPortalAllocatableShows` changed, so a narrow dev Function deployment checkpoint is required.
- No Rules deployment is requested or authorized.

## Gate

Implementation Review 10 returned `BLOCKED`; its five findings were remediated. Re-review is
required. If approved, request only the narrow Function checkpoint.
