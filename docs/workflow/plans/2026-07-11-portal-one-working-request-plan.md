# Plan: One working print request per portal customer

| Field | Value |
|-------|-------|
| Date | 2026-07-11 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-11-portal-one-working-request-review.md |

---

## Goal

Portal customers may have **at most one** continuable print request (`draft` or `editing`) at a time. They must not create/open a second working request until the current one is queued to a show (becomes `active`) or otherwise leaves continuable status.

## Background

Today the UI offers “Start new request” beside an in-progress draft, and `createPortalPrintRequest` has no concurrency check. Product now requires a hard one-at-a-time lock.

**Definition:** Continuable = persisted `draft` | `editing` (same as Working tab for editable requests). Queued/printing/printed requests do not block starting a new one after the current working request is queued.

## Scope

### In Scope

- Server: reject `createPortalPrintRequest` when customer already has a `draft`/`editing` request (transactional query)
- Firestore composite index `customerId` + `status` if required
- Portal UI: when a continuable request exists, Start/FAB/catalog actions **continue** it — never offer “Start new”
- Remove/hide “Start new request” from choice + pick modals
- Shared friendly error message constant
- Update ADR-FP-067 / DECISIONS + brief DATA_MODEL note
- Unit tests for branch/message helpers; document function deploy for server gate

### Out of Scope

- Migrating/merging existing multi-draft customers (they keep existing drafts; cannot create another)
- Studio staff create flows
- Changing Working tab derivation

---

## Approach

1. Shared: `PORTAL_ONE_WORKING_REQUEST_MESSAGE` + `shouldBlockPortalPrintRequestCreate(count)`
2. Callable: inside create transaction, `transaction.get` query `customerId == X && status in [draft, editing] limit 1` → `failedPrecondition` if any
3. Index: add `printRequests` `customerId` ASC, `status` ASC
4. `usePrintRequestCreationFlow`: if continuable > 0 → navigate continue; else confirm create
5. Drop choice-modal “start new” path (or stop opening that modal)
6. Pick modal: remove Start new; copy = choose existing only
7. Requests list CTA label: Continue vs Start like catalog

---

## Test Strategy

| Check | Required |
|-------|----------|
| Unit: shared helper + branch behavior | yes |
| Manual: FAB / Start / Add-to-request with existing draft | yes (human) |
| Deploy `createPortalPrintRequest` | human checkpoint |

---

## Human Checkpoints

- [x] Deploy updated `createPortalPrintRequest` (+ indexes if new)
- [x] Light manual QA of Start/Continue flows

---

## Risks

| Risk | Mitigation |
|------|------------|
| Existing 2+ drafts | Allow pick/continue; block only create |
| Race on double-click create | Transactional query |
| UI-only without deploy | Server still authoritative after deploy |

---

## Approval

- Verdict: approved
