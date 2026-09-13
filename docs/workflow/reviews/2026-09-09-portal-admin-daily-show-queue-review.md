# Formal Review: Portal admin daily Show Queue

| Field | Value |
|---|---|
| Date | 2026-09-09 |
| Managed goal | `portal-admin-daily-show-queue` |
| Plan | `docs/workflow/plans/2026-09-09-portal-admin-daily-show-queue-plan.md` |
| Review status | **approved_with_changes** |
| Review boundary | Implementation authorized after owner timezone decision; DEV deploy remains separately gated |

## Verdict

The planned exception was narrow enough to proceed after the owner selected the Show Queue
operational-day timezone. The design is approved with that change: `America/Chicago` now defines the
server day membership and display, avoiding browser-local ambiguity.

The owner subsequently selected `America/Chicago` and authorized the reviewed implementation. Source
implementation and focused validation are complete locally; DEV deployment, commit, and push remain
outside this review authorization.

## Formal findings

| Review area | Result | Evidence and required safeguard |
|---|---|---|
| Two-application architecture | Conditional pass | Portal historically means customer-only. A route group and isolated admin shell preserve the two-app strategy; this is a single documented exception, not a staff Portal conversion or third app. ADR required. |
| Owner/admin role correctness | Pass | Both the Portal bootstrap and callable use authoritative `users/{uid}` role/isActive data. Allow only active `owner` and `admin`. |
| Helper denial | Pass with mandatory tests | Current Firestore Rules define helper as staff. The callable must fresh-load the role and deny helper; the admin route must never mount a customer or admin shell for helper. |
| Customer/guest denial | Pass with mandatory tests | Customer direct URL receives an access-denied UI but keeps normal session; guest goes to safe login return. The callable remains the independent data boundary. |
| Client-only security risk | Pass | UI/session gates are UX only. The selected callable checks Firebase Auth plus stored role server-side and takes no caller-provided role/date/resource input. |
| Customer bootstrap/mutation isolation | Pass with mandatory structural test | Existing `AuthProvider` rejects staff and `PortalAppShell` mounts Current Request, favorites, notifications, drawer, nav, and customer mutations. The plan correctly uses a session mode plus standalone admin shell and requires customer-only guard before normal shell mount. |
| Account/customer-doc assumptions | Pass | Owner/admin sessions must stop after user-profile resolution and never query/subscribe `customers/{id}`. Current customer flow stays unchanged. |
| Private data minimization | Pass | DTO omits document IDs, emails, uploads/artwork, filenames, URLs, arbitrary docs, payment data, and auth metadata. It derives only the request/show/allocation fields needed for the page. |
| Customer-upload privacy | Pass | No artwork or filename is returned. Generic `Customer upload` source text provides operational recognition without leaking artwork metadata. |
| Public Our Shows isolation | Pass | No public DTO is reused and no public API/Rules behavior changes. The new callable is authenticated owner/admin only. |
| Callable over-fetching | Pass with implementation guard | One daily show query, chunked allocation query, batched request hydration, and no items/designs/customers/uploads is a bounded graph. Keep aggregate-only DEV telemetry and no persistent/private client cache. |
| Firestore Rules widening | Pass | Do not add an Option B Rules branch. It could not deny helper without breaking the shared Studio staff model. Rules remain unchanged. |
| Date/timezone correctness | **Required owner change** | Studio day grouping is browser-local and no shared operational-day timezone exists. Create/use a shared server helper only after the owner selects the IANA timezone; include DST tests. |
| Same-day multiple shows | Pass | Show sections are independent and schedule-sorted; no singleton show assumption. |
| Allocation lifecycle / split / requeue | Pass with parity fixtures | Preserve all allocation rows in DTO. Show non-canceled work distinctly from canceled history; keep each split row; derive requeued/moved labels without raw lineage IDs. Never use designs as state. |
| Studio code/doc mismatch | Follow-up required | Studio code currently includes source-surface shows without the non-archived lifecycle filtering claimed by its service comment. Preserve actual code membership for parity and surface lifecycle; do not silently change this in the Portal feature. Add golden fixtures and record the eventual reconciliation separately. |
| Mobile UX | Pass | Compact show/request cards, quantities/sizes, clear section labels, large Refresh, and no wide desktop-table dependency align with Portal conventions. |
| Rollback | Pass | Read-only callable has no data migration or writes. Revert isolated Portal/auth slice and deploy previous code if needed; retain callable until old clients are retired. |

## Security decision: callable vs Rules

**Approve Option A: a new `getPortalAdminDailyShowQueue` callable.** It is the least-privilege option that enforces owner/admin access without changing Studio’s current helper access to private collections. Option B is rejected for v1: current Rules grant full private documents to every `isStaff()` caller, including helpers; narrowing those paths to Portal owner/admin would alter Studio’s existing authorization contract and leave a complex, broader client data surface.

The callable must use the established `loadCallerProfile` and owner/admin assertion pattern, re-read profile state on every invocation, reject anonymous/helper/customer/inactive callers, validate that request data is exactly an empty object, and return only the reviewed shared DTO.

## Required changes before implementation

1. Obtain the owner’s exact IANA operational-day timezone decision and update the Plan/ADR wording before implementation. Do not substitute browser locale or infer America/Chicago from unrelated upload quotas.
2. Add the planned ADR recording the customer-only Portal exception, constrained roles, isolated shell, callable boundary, and no-Rules decision.
3. Add parity/security tests listed in the Plan before signoff, including role transitions and all DTO exclusion assertions.
4. Keep the observed Studio `isArchived` documentation/code mismatch out of this feature’s semantic change; add fixtures that lock the chosen code-parity behavior.

## Required architecture inventory

| Item | Determination |
|---|---|
| ADR required | **YES** — this is an intentional exception to Portal’s historical customer-only architecture. |
| Firestore Rules change | **NO** — direct private reads would overexpose helper-accessible documents; callable needs no Rules widening. |
| New Function required | **YES** — `getPortalAdminDailyShowQueue` trusted read DTO. |
| New Firestore index required | **NO** — planned timestamp range and single-field `in` queries require no composite index; verify actual DEV query behavior. |
| Portal App Hosting eventually required | **YES, production only** — production Portal release follows its separate reviewed/owner-authorized path. DEV remains localhost-only. |
| Studio publish required | **NO**. |

## Deployment and release review

The eventual DEV inventory is one new Function deploy plus local Portal QA against `fresh-prints-dev`. There is no DEV App Hosting backend by policy, no Rules/index deployment, no production action, and no Studio publish. A future production Function/Portal release requires the established reviewed PR and explicit owner production checkpoint; it is not included in this managed goal authorization.

## Owner decision resolved

The owner selected **`America/Chicago`** as the IANA timezone that defines the server day window and
Portal display. The implementation uses a shared DST-safe calendar-day helper and includes standard,
daylight, spring-forward, and fall-back fixtures.

## Next checkpoint

`[NEEDS OWNER AUTHORIZATION: DEV DEPLOY PORTAL ADMIN DAILY SHOW QUEUE FUNCTION]`

Until that authorization, DEV deployment, commit/push, App Hosting, Studio publish, and production
action remain forbidden.
