# Formal Review — Pass 2 toggle Auth-token readiness fix

| Field | Value |
|---|---|
| Plan | `docs/workflow/plans/2026-09-07-pass2-toggle-auth-token-readiness-fix-plan.md` |
| Review status | **APPROVED FOR CURSOR IMPLEMENTATION** |
| Scope | Studio toggle callable Auth readiness only |
| Production | Not authorized |
| Provider/callable testing by agent | Not authorized |

## Evidence reviewed

- The deployed Function is ACTIVE and has latest traffic.
- DEV logs for `updatesemanticreviewplaygroundsetting` show repeated
  `Empty Authorization header value` warnings.
- The server callable performs authentication, owner-role validation, input
  validation, and Firestore mutation in the expected order.
- Studio currently invokes the callable through the Firebase callable SDK, but
  the observed request proves the client path can reach the endpoint without a
  bearer token.

## Review decision

Approved for a narrow implementation that makes Auth readiness explicit before
the toggle invocation. The implementation must not weaken Cloud Run/Firebase
callable authentication or make the Function publicly callable as a workaround.

## Required implementation constraints

- Preserve `updateSemanticReviewPlaygroundSetting` server-side owner-only guard.
- Do not replace the callable with a direct Firestore write.
- Do not automatically enable the setting.
- Do not invoke Pass 1/Pass 2 providers.
- Do not change `semanticReviewerEnabled`, Autonomous, Processing authority, or
  any AI-tag behavior.
- Avoid broad changes to unrelated callable services unless tests prove the
  shared boundary is the only safe location.

## Required verification

- Focused unit/contract tests for the changed Auth/callable path.
- Studio changed-surface typecheck or documented baseline failures.
- `git diff --check`.
- Manual owner QA only after Cursor implementation: sign in as owner, toggle
  Pass 2 ON, confirm the setting changes, then complete the existing QA and
  return it OFF.

## Handoff marker

`[CURSOR HANDOFF: IMPLEMENT APPROVED PASS 2 TOGGLE AUTH-TOKEN READINESS FIX]`
