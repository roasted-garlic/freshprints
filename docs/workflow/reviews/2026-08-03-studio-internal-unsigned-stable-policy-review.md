# Formal Review: Studio internal-unsigned stable distribution policy

Date: 2026-08-03
Verdict: **APPROVED**

Plan: `docs/workflow/plans/2026-08-03-studio-internal-unsigned-stable-policy-plan.md`

## Findings

1. The proposed `distribution_mode` input is correctly scoped: it only affects the signing
   decision branch for `release_type: stable`; prerelease behavior is explicitly preserved
   unchanged, avoiding any regression risk to the already-proven beta.1–beta.5 update chain.
2. `signed` as the default value is the correct safety posture — an operator must actively choose
   `internal-unsigned`; nothing can silently drift into shipping unsigned.
3. The Plan correctly keeps the Firebase-configuration fail-closed logic, the stable-ref
   production-reachability guard, the packaged-channel generation, and the updater runtime
   (silent install, user-gated download/restart, assisted manual first-install) entirely
   untouched — this is a narrow, single-concern change.
4. The partial-signing-config fail-closed rule is correctly preserved and takes precedence over
   the new mode logic (a half-configured secret pair is always an error, in either mode) — this
   prevents a confusing state where `internal-unsigned` silently ignores a broken signing
   configuration that the operator may have intended to use.
5. Full signing credentials present + `internal-unsigned` selected → sign anyway. Correct: having
   a working certificate should never be discarded just because the mode was left at a stale
   value from a prior run.
6. Documentation requirements (prominent internal-only warning, SmartScreen expectation, "obtain
   only from the private GitHub Release" guidance, and explicit statement that a future public
   release must return to `signed`) are necessary and sufficiently specified.

## Security notes

- This authorizes shipping an executable without a trusted code-signing signature. The blast
  radius is scoped by the product decision itself (internal-only, owner-controlled machines) — the
  workflow change does not widen that scope; it only allows one narrowly-selectable path within it.
- The change does not weaken any other safeguard: Firebase isolation, production-source
  restriction, and the human-gated draft/publish flow all remain fully intact and untested-
  regression-free.

## Verdict rationale

Approved as a narrow, correctly-scoped policy change with `signed` preserved as the safe default.
No production action, version bump, or release is authorized by this review.
