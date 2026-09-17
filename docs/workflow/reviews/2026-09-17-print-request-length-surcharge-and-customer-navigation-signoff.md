# Signoff: Shared Length-Based Show Pricing and Customer Navigation

| Field | Value |
|---|---|
| Date | 2026-09-17 |
| Goal | `print-request-length-surcharge-and-customer-navigation` |
| Status | **approved_with_notes** |
| Candidate | `061a0201495c37adbbb22362bcece7d0da7d3011` plus documented closeout artifacts |
| DEV target | `fresh-prints-dev` |
| Production rollout | Partially complete; protected PR and infrastructure deployed; Studio `v1.0.15` publication blocked by external GitHub failures |

## Delivered scope

- Shared width-plus-length show pricing: four width tiers, four length bands, configurable
  surcharges, exact quantity/weight totals, and immutable allocation pricing snapshots.
- Portal receives a customer-safe pricing projection and never reads raw staff settings.
- Legacy allocations use an explicit resolver fallback; no backfill or data rewrite is required.
- Cross-origin active Working uniqueness, Studio-customer Portal reuse, origin-neutral parking and
  unqueue behavior, and a transaction-guarded Studio creation callable.
- Stable Studio customer navigation through `/users?customerId=<stable-id>`.
- Owner-directed final corrections for parked-draft restore, Add-to-Show reconciliation,
  import/staff preview cache trust boundaries, Portal cart rebinding after queue reset, empty-cart
  readiness, and silent reload loading state.

## Verification

| Check | Result |
|---|---|
| Expanded affected contract suite | **145/145 pass** |
| Global pricing/compositor/export/size-count checks | **40/40 pass** |
| Snapshot-first total checks | **8/8 pass** |
| Functions build | **pass** |
| Studio / Portal typecheck | **pass** |
| Portal production build | **pass**, 22/22 static pages |
| Studio packaged build | **pass**, version `1.0.15`, Windows installer generated |
| Studio release lint | **pass**, current 15 / baseline 25 / new 0 |
| DEV Functions | Exact reviewed 25-function allowlist, all ACTIVE, source hash `9eff4e7503246487859ad354ce53d2f78360b9b5` |
| DEV Firestore Rules | Released successfully; focused Rules matrix remains 22/23 because of the known emulator expression-limit baseline |
| Live DEV callable checks | Pricing-only DTO and 401 unauthenticated boundaries verified; no fixture mutation |

## QA notes and accepted limitations

Interactive Studio, Portal, and customer-flow QA was not executed because no connected in-app
browser or Windows Computer Use bridge was available. The owner reviewed the final corrective
behavior and explicitly accepted this limitation for closeout based on the reviewed code, tests,
builds, DEV deployment, and live non-interactive checks. This is recorded as `approved_with_notes`,
not as a claim that interactive QA passed.

Repository-wide lint remains an unrelated baseline of 14 errors and one warning. Node.js 20
deprecation and the known Firestore emulator expression limit remain documented residual risks.

## Human approvals and safety boundaries

- Owner approved DEV QA closeout and authorized protected development-to-production rollout on
  2026-09-17.
- Owner approved the Studio stable version advance from the already-published `v1.0.14` to
  `v1.0.15`; internal-unsigned distribution remains required by the existing release policy.
- No destructive migration, backfill, cleanup, customer/request fixture mutation, secret change,
  IAM change, Storage Rules change, index change, or Firebase configuration change is required.
- Required production path is a reviewed protected `development` → `production` PR. Direct push to
  `production` is not authorized.

## Manual verification record

| Scenario | Result | Note |
|---|---|---|
| Studio settings and allocation pricing UI | **PASS WITH NOTES** | Interactive execution unavailable; owner accepted limitation |
| Portal pricing projection and cross-origin Working flow | **PASS WITH NOTES** | Interactive execution unavailable; automated/live boundary evidence passed |
| Park/unpark, queue/unqueue, Add-to-Show, customer link | **PASS WITH NOTES** | Final owner-directed corrective set reviewed; no interactive session evidence |
| Production smoke | **PASS WITH NOTES** | Rules, exact 25 Functions, Portal revision/traffic, pricing DTO, and unauthenticated boundaries verified; Studio stable publication remains pending |

## Signoff decision

The managed goal is signed off with notes for the implemented behavior and owner-approved
production infrastructure rollout, but the workflow is not complete. Production Rules, the exact
25 Functions, and Portal App Hosting are live and smoke-checked. Studio stable `v1.0.15` remains
blocked by repeated macOS packaging stalls and GitHub Release asset-upload HTTP 500/502 failures;
the existing stable `v1.0.14` remains current. Completion still requires the eight verified
`v1.0.15` assets, publication, and final Studio smoke evidence.
