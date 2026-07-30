# Portal Print Request Pre-Launch Stability — Amendment 8 Formal Review

- **Date:** 2026-07-28
- **Reviewer:** Independent Formal Review Agent
- **Scope:** Plan Section 26 / Amendment 8 only
- **Plan:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`

## Verdict

**`approved_with_changes`**

Amendment 8 is appropriately bounded to the remaining failed owner QA: a complete Studio production
timer lifecycle, mounted Portal progress reconciliation, and the explicitly approved personal
show-use display. Its architecture is sound: Studio timer writes remain in the service layer,
Portal progress remains a request-scoped server-authoritative callable poll, and personal usage
reuses the existing `customerAllocatedQuantity` response rather than adding a Function, listener,
or N+1 query. The proposed legacy Finish rule can be least-privilege if and only if its
failing-before proof and exact transition restrictions are enforced.

One root-cause statement is not supported by the current checkout. `listUpcomingShows` already maps
each document independently, warns, and skips malformed records. Therefore an unrelated malformed
show does not currently abort that one-shot list load, and Section 26.3 item 3 is already true for
the full show list. The observed `An upcoming show record is incomplete.` must not be attributed to
that path without executable evidence. The Plan appropriately says the root-cause model must be
proved or disproved, so implementation may proceed under the constraints below; no new
`listUpcomingShows` behavior is authorized merely to satisfy an already-met requirement.

## Required changes and constraints

1. Treat Section 26.2 as a hypothesis matrix, not an established diagnosis. Tests must identify
   whether a failure occurs before the batch, during commit, in the service's post-commit
   `getUpcomingShowById`, during `onShowUpdated`, or during request-completion reconciliation. A
   committed mutation may be reported separately from a failed refresh/reconciliation, but code
   must not claim commitment unless the write promise actually resolved.
2. Preserve the existing per-document resilience of `listUpcomingShows`; add regression coverage
   if absent, but do not rewrite it or claim it as an Amendment 8 repair. Keep direct selected-show
   mapping strict before writes. If another list/read path is proven to throw on an unrelated
   malformed show, fix only that evidenced path.
3. Give Start, Pause, Resume, and Finish explicit action identities and phases. Sanitized
   diagnostics may include operational document IDs, path templates, operation counts/types,
   changed-field names, parser status, missing/extra field names, current/proposed statuses, and
   Firebase error code. Never include field values, document bodies, customer identity, request
   content, artwork metadata, notes, tokens, or credentials. Development-only detailed manifests
   must remain development-only.
4. Keep mapper-invalid allocations out of every write and total. Skipped warnings remain separate
   from operation rows. If no mapper-valid affected allocation remains, fail before creating or
   committing a batch with an actionable staff message. Unknown fields on mapper-compatible legacy
   records must be preserved.
5. A Finish Rules change is authorized only if an exact service-payload emulator fixture fails
   against the pre-correction Rules. The correction must be an alternative narrow branch requiring
   active owner/admin/helper, existing `pending|queued|in_progress`, proposed `done`,
   `completedBy` and `updatedBy` equal to `request.auth.uid`, and timestamp-typed `completedAt` and
   `updatedAt`. Affected keys must contain only `status`, `completedAt`, `completedBy`, `updatedBy`,
   and `updatedAt`. The ordinary full-schema branch must explicitly exclude this Finish transition
   so current and legacy records use the same narrow authorization.
6. Rules tests must prove current and mapper-compatible legacy Finish success for active
   owner/admin/helper, plus denial for customer, inactive staff, unrelated field addition/change,
   preserved legacy-field change/removal, invalid source status, invalid destination status,
   mismatched caller IDs, and invalid/missing timestamp fields. Retain all Amendment 7 Start
   coverage.
7. Request-completion reconciliation must remain after the atomic timer batch and bounded to the
   deduplicated affected request IDs. A reconciliation failure must not relabel the already-resolved
   timer batch as uncommitted; surface it as a distinct partial-success/reconciliation warning and
   preserve a retry path. Do not add print-request documents to the timer batch absent new source
   evidence and a reviewed amendment.
8. The Portal poll must remain scoped to one `printRequestId`, run only while mounted, visible, and
   nonterminal, and permit at most one in-flight callable across timer, focus, visibility, and
   manual-refresh triggers. Use request/generation identity so a late result or error cannot clear
   or overwrite newer state. Stop timers and invalidate completions on request change, disable,
   terminal state, hidden document, and unmount. The at-most-10-second target is acceptable for this
   narrow production-status surface; do not introduce exponential delays that violate it.
9. Polling tests must execute the controller/hook boundary with controlled time and deferred
   promises. They must prove Queued → Printing → terminal without remount, no overlapping calls,
   stale success and stale error rejection, focus/visibility coalescing, hidden/terminal cleanup,
   request-switch invalidation, and no customer elapsed clock.
10. Personal usage must be derived only from the selected show's
    `customerAllocatedQuantity` and the already-loaded `L`, with remaining clamped to zero. The
    optimistic post-submit value must add the successful queued quantity exactly once, be scoped to
    that show, and never survive a failed submission or overwrite a newer server value. Switching
    shows must immediately render that show's independent value and reject late Show A results.
11. The personal copy is distinct from ShowPicker's show-wide capacity and must never imply that
    customer exhaustion means the whole show is full. Cover 0/25, 22/25, 25/25, successful +3,
    failure rollback, reopening with server authority, independent Show A/B values, exact-25 allow,
    over-25 denial, same-request denial, and the existing exhausted-cap wording.
12. No Function deployment is planned for Amendment 8. If implementation discovers that
    `listPortalAllocatableShows` or `getPortalShowPrintProgress` must change, stop and amend/review
    the Plan before changing or deploying it. If Firestore Rules change, proceed only after
    verification and independent Implementation Review to a new exact
    `APPROVE DEV RULES DEPLOY` checkpoint. Do not redeploy Amendment 7's unchanged callable.

## Architecture, security, and operational assessment

- **Studio architecture:** Approved with constraints 1–7. Firebase access remains in the service;
  hook/page code owns action and refresh presentation only.
- **Portal architecture:** Approved with constraints 8–11. The existing callable remains server
  authority, and the poll remains bounded to the mounted request.
- **Authorization:** Approved with constraint 5. `isStaff()` supplies active-role enforcement; the
  completion branch must not become a general legacy-document update escape hatch.
- **Data model:** No schema migration or legacy-field normalization is approved. Compatibility
  writes preserve unknown fields.
- **Read cost:** Acceptable. A 10-second request-scoped poll is a deliberate UX/read tradeoff for a
  mounted nonterminal production tracker. No Firestore listener, global scan, all-show poll, or N+1
  lookup is approved.
- **UX/accessibility:** Approved. Personal usage is owner-approved and must use visible text with
  separate show-wide semantics; async warning/success changes should use the existing accessible
  status/error patterns.
- **Deployment:** Dev Rules only if the conditional Rules correction is proven and later approved.
  Production, migration, broad deploys, and owner QA before deployment are forbidden.

## Test and gate assessment

Section 26.6 is sufficient when combined with the constraints above. Verification must record the
TypeScript 5.9.3 version, focused tests, full Java 21 Rules suite, Portal typecheck/build, Studio
build, changed-file lint, repository lint, and diff check. Known Studio build and repository-lint
baselines may be documented honestly but may not be weakened or represented as passes. A Functions
build is needed only if an independently reviewed amendment authorizes a Function change.

A new independent Implementation Review must inspect the final diff and verification evidence. It
must specifically confirm the actual action-failure phase, post-commit semantics, sanitized
manifests, no new broad reads/listeners, single-flight polling, stale-response protection,
personal/show-wide separation, failing-before Rules evidence, least-privilege Finish transition,
and exact deployment selector.

## Blocking findings

None after applying the required constraints above.

## Handoff

Implementation may proceed within Plan Section 26 and this review. The already-resilient
`listUpcomingShows` behavior is a preserved baseline, not an implementation task. Stop after
verification and independent Implementation Review at the exact dev Rules approval checkpoint if a
Rules change is proven necessary. Do not deploy, start owner QA, sign off, or begin queued goals as
part of implementation.
