# Independent Implementation Review: Shared Length-Based Show Pricing and Customer Navigation

| Field | Value |
|---|---|
| Date | 2026-09-17 |
| Reviewer | Codex / Independent Implementation Review |
| Plan / Formal Review | `2026-09-17-print-request-length-surcharge-and-customer-navigation-*` |
| Verdict | **Implementation review pass with documented test-environment limitations; production infrastructure rollout verified; Studio stable publication blocked externally** |
| Deployment | **DEV deployed; production rollout pending** |

## Reviewed implementation

- Shared pricing remains centralized in `packages/shared`: width base tier, two-dimensional
  Pocket classification, height length tier, surcharge, unit price, line price, weight, and cache
  version are derived from one normalized contract.
- Studio settings persist four surcharge fields under canonical `settings/showQueue`; breakpoints
  remain fixed and displayed as read-only labels.
- New Show Allocations capture an immutable pricing snapshot. Trusted allocation, Portal queue,
  move, recovery/requeue, transfer, and Studio read paths preserve or consume the snapshot; legacy
  rows use a documented resolver fallback without backfill.
- Portal receives a pricing-only callable projection and uses it in request/show commitment and
  size-tier UI without reading raw staff settings.
- The active customer Working invariant is origin-neutral for non-internal unparked `draft|editing`
  requests. Portal reuses an unparked `studio_customer` request; existing item mutation callables
  use the corrected predicate; parking archives empty drafts and parks meaningful drafts regardless
  of origin.
- Studio customer request creation now uses `createStudioCustomerPrintRequest` with an Admin
  transaction guard. The renderer preflight remains UX only.
- Studio Print Request detail links customer requests to `/users?customerId=<stable-id>` while
  internal requests remain unchanged.
- Durable decision, architecture, workflow, and testing docs were amended to match the code and
  the approved no-migration/no-deployment boundary.

## Boundary and safety review

| Area | Result | Evidence |
|---|---|---|
| Pricing authority | pass | Shared resolver and summary tests; no new React-local price formula |
| Snapshot immutability | pass | Rules immutable-field guard and snapshot-first dollar-total regression |
| Legacy compatibility | pass | Optional snapshot type and explicit current-resolver fallback; no backfill |
| Portal settings exposure | pass | `getPortalShowPricing` returns normalized pricing only |
| Cross-origin uniqueness | pass | Shared editability/active-selector tests and callable source contract |
| Parking/unqueue safety | pass | Origin-only blocker removed; existing empty-archive/meaningful-park lifecycle retained |
| Ownership/internal boundaries | pass | Existing customer ownership, `isInternal`, lifecycle, quota, cutoff, and production guards preserved |
| Rules scope | pass with limitation | Allowlist + immutable snapshot field; nested validation omitted to avoid existing expression-budget failure |
| Navigation scope | pass | Stable ID query link; no request-name parsing or Users redesign |
| Deployment/data safety | pass | Exact 25-Function DEV deploy and Rules release; no migration, backfill, merge, cleanup, or data mutation |

## Findings and residual risks

1. The repository-wide Rules emulator suite has a reproducible pre-existing 1,000-expression-limit
   failure. The goal-specific Rules delta was removed and re-tested to establish that baseline; it
   did not remove the failure. Owner DEV QA should still run the exact reviewed Rules matrix in the
   target environment.
2. The first Portal production build attempt encountered the active-dev-server `.next/trace`
   `EPERM`; after the server was stopped, the canonical build passed and generated 22/22 pages.
3. Repository-wide lint has unrelated baseline diagnostics. Targeted lint over all modified/new
   goal-scoped source files passes.
4. The Rules file intentionally validates snapshot presence/immutability at the top-level field
   boundary, while Admin allocation paths author the nested canonical shape. Runtime readers fail
   closed to the live resolver when a legacy/malformed snapshot cannot be mapped.

## Review conclusion

The implementation stays within the amended Plan and Formal Review. The reported duplicate/parking
incident is addressed at the shared predicate, Portal reuse path, parking helper, and race-safe
Studio creation boundary without merging, deleting meaningful drafts, rewriting provenance, or
changing lifecycle protections. Pricing is shared, configurable, customer-safe, and preserved for
new allocation commitments. Owner DEV QA is closed `approved_with_notes`: interactive browser and
native-app checks were unavailable, but the owner accepted that limitation against 145/145 affected
contracts, typechecks, release lint, packaged build, DEV deployment, live callable projection, and
unauthenticated-boundary checks. The implementation is ready for Signoff and the explicitly
authorized protected development-to-production rollout.
Production PR #101 merged as `e6e7eaf7b47e714414572a986611afa124bb8a8b`; Firestore Rules, the exact
25 reviewed Functions, and Portal App Hosting build `build-2026-09-17-002` were deployed and
smoke-checked. The Studio `v1.0.15` workflow did not reach publish: macOS packaging stalled on
multiple fresh runners and GitHub Release asset uploads returned HTTP 500/502. Keep the goal open
and retry the exact release workflow after that external blocker clears.
