# Review: Studio permission two-ask, activity modal, Denied→Excluded handoff

| Field | Value |
|-------|-------|
| Date | 2026-09-11 |
| Plan | `docs/workflow/plans/2026-09-11-studio-permission-two-ask-activity-excluded-handoff-plan.md` |
| Status | **approved_with_changes** |
| Reviewer | Agent (owner product locks recorded) |

## Verdict

**approved_with_changes** — Owner locked scope in-session. Proceed to Implement.

### Required changes (non-blocking, apply in Implement)
1. Prefer append-only `catalogPermissionActivity` + `catalogPermissionAskCount`; do not invent a third follow-up status enum.
2. Denied tab must stay actionable only; terminal = second decline (`askCount >= 2` && `declined`).
3. Legacy `declined` without askCount → treat as **1** ask used (allow one more Ask Again).
4. No Rules change; Admin SDK only for activity writes.
5. Keep C1/C2 gated on existing DEV deploy gate; this slice may redeploy request/respond/confirm Functions only.

## Security
Staff request + customer respond boundaries unchanged. Opaque token model retained per ask.

## Architecture
UI stays thin; eligibility helpers in shared; Filters in Studio query utils.
