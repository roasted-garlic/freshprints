# Plan: Studio Customer Requests — suggestion inbox + placeholders

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-16-studio-customer-requests-suggestions-review.md |
| Target | `fresh-prints-dev` only (no production) |

---

## Goal

Enable the Studio **Customer Requests** page as the home for customer-facing design-request work. Move Etsy wizard suggestion-list management out of Settings into a **Suggestions** tab, persist Portal “Suggest … be added” as real reviewable requests, and add Coming soon placeholders for **AI Design** and **Fresh Prints Assisted** requests.

---

## Background

- Studio already has a disabled `/customer-requests` route and `ComingSoonPage`.
- Live Subject/Tone overlays live in `etsyRecommendationSuggestions` (ADR-FP-087k) and are managed in Settings today.
- Portal `EtsySaveSuggestionAction` only shows a thank-you message and **does not persist** anything — staff never see customer suggestion requests.
- Owner asked to handle suggestion approvals on Customer Requests, with placeholders for the two future Custom Designs routes.

Etsy questionnaire polish was pushed (`b8a952d`). Formal Etsy signoff remains incomplete but owner directed moving to this next task.

---

## Scope

### In Scope

1. **Enable Customer Requests nav/route**
   - Remove `isDisabled` on sidebar item
   - Replace Coming soon page with a real tabbed page (`manageRequests`)

2. **Suggestions tab (primary working tab)**
   - Move Studio suggestion-list management UI here from Settings (Subject + Tone/style add, searchable list modal, deactivate)
   - Show **pending customer suggestion requests** queue with Approve / Reject
   - Approve creates/activates an `etsyRecommendationSuggestions` overlay (reuse existing validation/collision rules)
   - Reject marks request rejected with optional staff note (simple; note optional in v1)

3. **Portal: persist suggestion requests**
   - Replace local-only acknowledgment with authenticated callable that writes a pending request
   - Keep customer copy as “Suggest … be added” (not immediate add)
   - Light per-customer daily rate limit for spam control

4. **Placeholder tabs**
   - **AI Design requests** — Coming soon
   - **Fresh Prints Assisted requests** — Coming soon

5. **Settings cleanup**
   - Remove `EtsySuggestionListsSettingsSection` from Settings page
   - Optional one-line Settings note linking to Customer Requests (only if Settings already has similar cross-links; otherwise omit)

6. **Docs**
   - DATA_MODEL, BACKEND, DECISIONS (ADR amendment to 087k), ROADMAP note

### Out of Scope

- Building AI Design or Fresh Prints Assisted Portal/Studio fulfillment flows
- Inbox bell integration / staff-inbox toasts (can follow later)
- Production deploy
- Changing live suggestion seed dictionaries
- Changing Etsy search/query behavior
- Full CRM for all historical `etsyRecommendationRequests` audit browsing (optional follow-up)

---

## Affected Areas

### Files / Modules (expected)

- `apps/studio/.../customer-requests/` (page, tabs, suggestion panels/hooks/services)
- `apps/studio/.../Sidebar.tsx` (enable nav)
- `apps/studio/.../settings/pages/SettingsPage.tsx` (remove section)
- Move or re-export `EtsySuggestionListsSettingsSection` / hooks / services under customer-requests or shared settings service import
- `apps/portal/.../EtsySaveSuggestionAction.tsx` + portal service callable
- `functions/src/` new callables for submit/list/approve/reject suggestion requests
- `packages/shared/` types + constants for suggestion requests collection
- `firestore.rules` + indexes as needed
- Docs: DATA_MODEL, BACKEND, DECISIONS, ROADMAP

### Architecture Impact
- [x] Details: New Studio feature surface under existing `customer-requests` module; Portal still calls services (no direct Firestore writes for requests); Settings loses suggestion management.

### Security Impact
- [x] Details:
  - Customers: submit own pending suggestion requests only (auth required)
  - Staff with `manageRequests` (and/or owner/admin as today for overlays): read queue, approve/reject
  - Approve path must enforce same collision/validation rules as `addEtsyRecommendationSuggestion`
  - Client writes denied on new collection; Admin SDK callables only

### Data Model Impact
- [x] Details: New collection `etsySuggestionRequests` (name final in implement; document in DATA_MODEL):

```ts
{
  id: string;
  kind: "subject" | "style";
  label: string;
  apiToken?: string; // subject only; optional
  status: "pending" | "approved" | "rejected";
  customerUid: string;
  customerId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt?: Timestamp;
  resolvedBy?: string;
  resultingSuggestionId?: string; // set on approve
  rejectReason?: string; // optional v1
}
```

### Backend Impact
- [x] Details:
  - `submitEtsySuggestionRequest` (portal customer)
  - `listEtsySuggestionRequests` or Studio Firestore listen with rules — prefer **callable list** or **signed-in staff read of pending** via rules if role claims exist; Studio already uses client reads for overlays. Prefer Admin SDK list callable if staff role checks are server-side only today for this domain.
  - `approveEtsySuggestionRequest` / `rejectEtsySuggestionRequest` (staff)
  - Reuse `assertOwnerAdminCaller` **or** align to `manageRequests` permission — **Required change:** use the same gate as Customer Requests page (`manageRequests`) if that is broader than owner/admin; document exact role matrix in implement.

### UI / UX Impact
- [x] Details: New Studio page with tabs; Settings loses section; Portal suggest becomes real async request with clear “pending review” copy. Manual Studio + Portal QA required.

### Migration Impact
- [x] None for existing overlay docs
- [x] Forward: new empty collection
- [x] Rollback: disable nav / hide page; leave collection inert; restore Settings section from git if needed

---

## Approach

1. Shared types/constants for `etsySuggestionRequests` + action DTOs.
2. Functions: submit (customer), approve/reject (staff), optional list; wire exports.
3. Firestore rules: deny client writes; allow staff read if using snapshots, else deny-all + callable.
4. Portal: callable from `EtsySaveSuggestionAction`; success copy clarifies pending staff review.
5. Studio: enable sidebar; build `CustomerRequestsPage` with tabs Suggestions | AI | Fresh Prints.
6. Move suggestion list management UI into Suggestions tab; add pending queue Approve/Reject.
7. Remove Settings Etsy suggestions section.
8. Update docs + ADR note amending 087k (Studio home moves to Customer Requests; customer requests are first-class).
9. Deploy callables + rules to `fresh-prints-dev` after tests.

**Permission default (unless review blocks):** Approve/reject/manage overlays from this page require `manageRequests`. If current overlay callables are owner/admin-only, either keep owner/admin for mutations **or** expand callable gate to match `manageRequests` roles — implement must pick one and document; prefer **owner/admin** for overlay mutations in v1 to avoid widening write power unexpectedly, while page visibility stays `manageRequests`. Helpers without manage rights see placeholders only / read-only queue if rules allow.

Actually: page is ProtectedRoute `manageRequests`. Overlay add today is owner/admin. Plan: **keep overlay mutate as owner/admin**; approve callable also owner/admin; page visible to manageRequests — if helper has manageRequests but not owner/admin, show queue read-only + message. Confirm in review.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Typecheck portal | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Typecheck/build functions | `npm run build` in `functions/` | yes |
| Unit | validation tests for suggestion request payloads | yes |
| Studio typecheck | existing studio check if present | yes if script exists |
| Rules | document manual / emulator if available | no |

### Manual
- [x] Portal: Suggest term → success; second submit rate-limit or duplicate handling
- [x] Studio Customer Requests → Suggestions: pending appears; Approve → appears in live list / Portal pills; Reject → leaves queue
- [x] Settings no longer hosts suggestion manager
- [x] AI / Fresh Prints tabs show Coming soon
- [x] Sidebar Customer Requests enabled

---

## Human Checkpoints Anticipated
- [x] Manual UI/UX review (Studio page + Portal copy)
- [ ] Design approval
- [ ] Business logic decision — only if permission matrix disputed
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [ ] Other: deploy to `fresh-prints-dev` after implement/tests

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Spam suggestion requests | Medium | Per-customer daily cap; dedupe pending by kind+labelKey |
| Permission mismatch (manageRequests vs owner/admin) | Medium | Document matrix; keep writes owner/admin in v1 |
| Duplicate approve races | Low | Transaction + collision checks |
| Settings users lose discoverability | Low | ROADMAP/DECISIONS note; optional Settings link |

---

## Rollback Plan

Revert Studio page/nav/Settings; undeploy new callables or leave unused; Portal falls back to acknowledgment-only if callable removed (prefer feature flag via soft fail message). Collection can remain.

---

## Documentation Updates Required
- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [x] DATA_MODEL.md
- [x] BACKEND.md
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [x] DECISIONS.md (amend ADR-FP-087k)
- [x] ROADMAP.md
- [x] Other: workflow plan/review/test/signoff

---

## Open Questions
- [x] Resolved in plan: overlay/approve writes stay **owner/admin** in v1; page route stays `manageRequests`
- [ ] None blocking

---

## Approval
- Review doc: docs/workflow/reviews/2026-07-16-studio-customer-requests-suggestions-review.md
- Verdict: pending
