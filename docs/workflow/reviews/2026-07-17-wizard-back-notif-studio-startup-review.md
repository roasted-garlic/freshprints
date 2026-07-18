# Review: Wizard Back, Notifications, Studio Startup, Unread Badges, Email History

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-17-wizard-back-notif-studio-startup-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Plan scope is coherent and narrow enough to implement. Owner add-ons (unread badges + email-sent history on successful delivery) are correctly in-scope. Email live deploy remains deferred.

## Required Changes (apply during implement)

1. **Email history on success only** — append in the worker after successful send (`markSent` path), not at job enqueue in `staffAddAssistedCreationProof`. Note copy: `Proof-ready email sent` (system actor). Do not treat as boilerplate in Studio History.
2. **Unread acks** — new collection `assistedCreationUpdateAcks`; do not overload `staffInboxAcks`. Mark read via History **Read** control using latest customer-update timestamp as `readThroughAt`.
3. **History copy** — `"Request updated"` / `"Request updated — {note}"`; Studio detection should prefer structural (`fromStatus === toStatus === "submitted"` + customer role) over brittle regex alone; keep legacy regex as fallback for old notes.
4. **Opt-out** — missing field = opted in; worker non-retryable skip; invitation emails untouched.
5. **Back flash** — intentional-back must update URL; do not regress deep-link hydrate forward snap.
6. **No production deploy**; stop for human approval before fresh-prints-dev Functions/rules deploy for email/opt-out/history/acks.

## Security

- Customer preference field allowlist on own doc (or callable) — OK.
- Staff-only acks scoped to `auth.uid` — OK.
- Admin SDK history append — OK.

## Verdict Rationale

Approved to implement with the required changes above (already reflected in the amended plan). No blockers.

## Next Step

Implementation phase.
