# Focused review — coordinated production promotion Studio lint corrective

| Field | Value |
|---|---|
| Parent goal | `coordinated-production-promotion-2026-09-16` |
| Plan | `docs/workflow/plans/2026-09-16-coordinated-production-promotion-studio-lint-corrective-plan.md` |
| Review status | **approved** |
| Production baseline | `3802ff8564efb0d24e6c783a23c4b4b65d7cef8f` |
| Reviewer disposition | Owner authorization dated 2026-09-16 permits ordinary lint fixes, tests, protected promotion, workflow retry, and v1.0.13 publication. |

## Review conclusion

**Approved for bounded implementation.** The six workflow findings are
deterministic and are resolved by local source/module-boundary cleanup plus a
named invocation alias for the existing fail-closed comparator. No baseline
expansion or lint disable is approved.

The change does not alter signed-off Studio behavior, including Print Request
per-item Download, Uploaded/Donated Designs navigation, Design Library and
Staff Artwork AI Review paths, Show Queue behavior, or the v1.0.13 release
inputs. The existing Rules result remains the owner-accepted 179/182 baseline
limitation and is outside this corrective.

## Required implementation checks

1. Remove the invalid unavailable Next-rule directive.
2. Restructure the Staff Artwork upload `finally` guard without changing state
   transitions or sequential processing.
3. Remove the unused middleware request parameter without changing headers or
   matcher behavior.
4. Make the intake navigation effect depend on the stable callback it uses.
5. Move non-component Smart Profile labels/formatting helpers out of the
   component module and update all imports.
6. Add `lint:release` and use it in both canonical Studio release jobs; update
   the workflow contract test accordingly.

## Verification and promotion boundary

The real canonical lint runner must pass locally before any retry. Typecheck,
focused Studio/Portal regressions, release-policy tests, and Studio build
preflight must also pass. Compare the corrective against production
`3802ff85`; if the delta is limited to client code, release validation/workflow,
and documentation, do not redeploy Functions, Rules, Portal App Hosting, IAM,
indexes, Storage Rules, or data. Then use the normal protected
`development → production` path and publish only the exact new production SHA.

## Hard-stop review

Any new lint finding, baseline change, runtime-surface expansion, release
policy/security failure, new Rules failure, or actual regression on the healthy
live surfaces blocks continuation.
