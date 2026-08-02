# Formal Review: Portal design issue reporting

Date: 2026-08-01  
Plan reviewed: `docs/workflow/plans/2026-08-01-portal-design-issue-reporting-plan.md`  
Reviewer posture: independent architecture, security, data, read-containment, test, and release-gate review

## Independent verification

The review independently inspected the current production source rather than accepting proposed names as existing facts.

- Confirmed public catalog design details are rendered by `CatalogDesignDetailsModal.tsx`; it already has guest login continuation and receives a server-mapped `CatalogDesign` whose source query requires `status == ready`.
- Confirmed Portal auth distinguishes unauthenticated/anonymous/profile states and established callables use `requirePortalCustomer` for active customer authority.
- Confirmed Studio Inbox supports only `portal_queued` and `show_queue_full`; it derives open items from bounded print-request/allocation/show listeners and stores user-specific Done acknowledgments separately.
- Confirmed there is no generic persisted Inbox task entity and no exact Studio design-ID deep-link parameter.
- Confirmed all active staff currently access Inbox through `viewPrintRequests`, but no report-specific permission exists.
- Confirmed no production callable currently enables `enforceAppCheck`, so mandatory feature-only enforcement would be a new platform dependency.
- Confirmed a persisted global lifecycle cannot safely reuse `staffInboxAcks`: that would make resolution staff-specific, permit restore semantics that conflict with global resolution, and omit required report snapshots/text.
- Confirmed `status == open` + chronological ordering and bounded resolved history require new composite indexes.
- Confirmed production/development divergence makes a feature branch from `origin/production` safer than broad development promotion.

## Findings

### Approved architecture

1. Dedicated `designIssueReports` collection is justified and preferable to embedding reports on `designs` or overloading Inbox acknowledgments.
2. Trusted callables for both creation and resolution preserve identity/status boundaries and avoid granting Portal or Studio clients protected writes.
3. One bounded open listener plus paged history meets the prior Inbox Firestore-containment discipline.
4. Server snapshots eliminate N+1 customer/design listeners and preserve historical context.
5. A one-shot cached design read on explicit `View Design` is proportionate; no card listener is allowed.
6. Adding a validated Design Library `designId` parameter is necessary because the claimed “existing exact deep link” does not exist in current source.
7. The proposed `open`/`resolved` lifecycle is the minimum sufficient global lifecycle. Per-user acknowledgment remains unchanged for existing kinds.

### Required implementation clarifications already incorporated into the Plan

- Share-design and Catalog Home modal call sites must be audited, not only the Library page.
- The backend must validate Portal visibility from the authoritative design document, not infer it from the client model.
- Idempotency and daily rate enforcement must be transactional and must not count via an unbounded report query.
- The one-open policy needs a deterministic uniqueness guard or transactional key, not a non-atomic query-then-create.
- Resolved history is on-demand pagination and must not reuse the live open listener.
- Missing/archived designs remain actionable from report snapshots; navigation failure must not make resolution impossible.
- Direct staff resolution writes are denied; callable-only mutation avoids scattered Rules field-diff complexity.
- No internal note, response, customer history, reopen, or notification is included without a later amendment.

## Risk assessment

| Risk | Rating | Required control |
|---|---:|---|
| Free-text abuse | High | active-customer auth, 10/day transactional quota, length limit, no text logging |
| Duplicate/replay | High | client intent key plus server idempotency record and deterministic open uniqueness |
| Identity spoofing | High | ignore all client identity/snapshot fields; derive from auth/customer/design reads |
| Design integrity mutation | High | separate collection; callables never update `designs`; explicit tests |
| Inbox read growth | High | one `status=open`, createdAt-desc, limit-100 listener; paged history; snapshots |
| Permission drift | Medium | centralized permission methods and callable authorization |
| Archived/missing design | Medium | retained snapshots plus graceful one-shot navigation failure |
| Branch contamination | High | branch from `origin/production`; protected clean PR; no broad development merge |
| Index rollout | Medium | explicit deploy checkpoint and Enabled verification before client QA |
| App Check inconsistency | Medium | owner decision; do not silently introduce isolated mandatory enforcement |

## Gate review

- Scope is complete and does not expand into messaging, attachments, customer history, automated design changes, or a third app.
- Architecture follows Portal Component → Hook → Service → Callable and Studio Component → Hook → Service → Firebase/callable.
- Security boundaries are explicit and testable.
- Data migration is correctly none.
- Rollback retains audit data and avoids destructive cleanup.
- The 49 required acceptance-test categories and release sequencing are represented.
- Rules/index deployments, production backends, Portal rollout, installer, Stage 2, and domain remain human-gated.

## Verdict

**APPROVED WITH CHANGES — implementation blocked pending owner decisions.**

The changes required by review are already incorporated in the Plan. No technical `[NEEDS REPO CHECK]` remains for planning. The 15 product/operational choices are intentionally unresolved and require explicit owner approval; implementation may begin only after they are recorded.

Next checkpoint:

`APPROVE PORTAL DESIGN ISSUE REPORTING OWNER DECISIONS`
