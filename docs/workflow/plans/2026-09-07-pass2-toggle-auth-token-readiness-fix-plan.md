# Plan — Pass 2 toggle Auth-token readiness fix

| Field | Value |
|---|---|
| Date | 2026-09-07 |
| Parent program | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Phase | Post-DEV-deploy owner QA corrective fix |
| Environment | DEV source only; `fresh-prints-dev` runtime evidence |
| Implementation authorization | Cursor handoff after formal review |
| Production | Not authorized |
| Provider calls | None during implementation/testing |
| Setting mutation | None by agent |

## Problem

The owner-only `updateSemanticReviewPlaygroundSetting` toggle continues to
show `internal`. DEV Cloud Run logs for the deployed callable show repeated
requests rejected before callable execution with `Empty Authorization header
value`. The owner role is therefore not being evaluated; Studio is invoking
the callable without a Firebase Auth bearer token.

## Goal

Make the Studio toggle path wait for Firebase Auth readiness and require a
current owner token before invoking the callable, so valid owner sessions do
not race Auth initialization or send an empty Authorization header.

## Scope

- Update only the Studio Auth/callable boundary used by
  `updateSemanticReviewPlaygroundSetting`.
- Wait for Firebase Auth initialization before the call.
- Confirm `auth.currentUser` exists; otherwise return a clear sign-in error.
- Refresh/obtain the current ID token before invoking the callable, using the
  existing Firebase Auth instance and preserving the standard callable SDK.
- Preserve server-side owner-only enforcement and the default-OFF setting.
- Add focused unit/contract tests for Auth-not-ready, no-current-user, and
  successful callable readiness behavior where the repository test seams allow.

## Out of scope

- No change to owner authorization rules.
- No change to `semanticReviewPlaygroundEnabled` persistence semantics.
- No direct Firestore writes or callable invocations by Cursor/Codex.
- No Pass 2 provider execution, AI calls, Processing behavior, rules, indexes,
  migrations, secrets, production, commit, or push.

## Likely implementation points

- `apps/studio/src/renderer/src/config/firebase.ts`
- `apps/studio/src/renderer/src/config/tracedCallable.ts`, only if the fix is
  proven to belong in the shared callable boundary rather than the settings
  service
- `apps/studio/src/renderer/src/features/settings/services/aiEnrichmentSettingsService.ts`
- Focused settings/Auth tests near those modules

Prefer the narrowest service-level change so unrelated callables do not gain a
new token-refresh behavior without review. If the Firebase SDK requires a
shared boundary change, add regression coverage proving existing callable
behavior remains unchanged.

## Acceptance criteria

1. A signed-in DEV owner can toggle the experimental flag without an empty
   Authorization header.
2. A signed-out user receives a clear authentication error and no callable
   request is attempted.
3. A non-owner still receives server-side permission denial.
4. The setting remains false/absent until the owner intentionally toggles it.
5. No provider call is made by the fix or its tests.
6. Focused Studio tests pass; broader baseline failures are documented rather
   than attributed to this fix.

## Handoff command

After Cursor implementation, run the focused Studio tests and typecheck the
changed surface. Owner must perform the live toggle QA manually; do not enable
the setting from an agent or test.
