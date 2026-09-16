# Studio Halftone Background Toggle Hotfix Review

## Verdict

**Approved with bounded implementation conditions.**

## Review basis

The existing resolver and controls already model Halftone and Artwork Background as separate values. The defect is that toggle handlers do not synchronize the background at the moment Halftone changes. The requested behavior can therefore be implemented in the existing Studio client state and persistence paths without changing backend contracts or production surfaces outside Studio.

## Approved changes

- Synchronize import session and per-item Halftone changes to `dark`/`auto` background modes.
- Synchronize Customer Upload Intake Halftone changes to the persisted light-black/default background values, including optimistic state, failure handling, and retry.
- Make AI Review Halftone persistence update the paired artwork background in the same design update, while updating the local preview immediately.
- Seed the Design Edit Modal form background when its Halftone field changes, preserving independent later background edits.
- Add or update focused tests/contracts for these transitions and preserve explicit-background precedence tests.

## Conditions

- Keep the change Studio/client-only and use existing fields/services.
- Do not alter resolver precedence: a subsequent explicit background selection must remain authoritative while Halftone is on.
- Do not deploy, merge to production, change Firebase configuration, or perform data repair.
- If verification exposes a non-Studio runtime delta or requires a new permission/data contract, stop and report it.

## Required verification

- Focused import, intake, AI review, and design-form tests/contracts.
- Studio typecheck and applicable build/package preflight.
- `git diff --check` and a review of the final diff for scope containment.

## Hotfix addition review — Print Request rail selection

**Approved as a bounded Studio-client addition.** The reported flicker is
consistent with a stale-detail race in the existing route canonicalization flow:
the new request ID becomes current before the detail object has switched from the
previous request. The approved correction is to require exact request-ID ownership
before selected detail participates in canonicalization and to clear retained
detail collections at the start of a new selection load.

Conditions remain unchanged: keep the URL/list architecture and existing service
boundaries, preserve direct-ID hydration and all tab/triage behavior, add focused
regression coverage for repeated rail selection, and perform no production merge,
release publication, deployment, backend/configuration change, or data repair.
