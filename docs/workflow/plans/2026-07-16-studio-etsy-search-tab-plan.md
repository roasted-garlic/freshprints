# Plan: Studio Custom Designs — Etsy search tab + tab order

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-16-studio-etsy-search-tab-review.md |
| Target | local + `fresh-prints-dev` rules when deployed |

---

## Goal

On Studio **Custom Designs** (Customer Requests):

1. Reorder tabs so **Suggestions** is far right.
2. Add **Etsy search** immediately left of Suggestions, listing saved Portal Find-a-design searches (`etsyRecommendationRequests`).

Desired order: **AI Design → Fresh Prints Assisted → Etsy search → Suggestions**.

---

## Background

- Suggestions tab already shows pending suggestion requests + live lists.
- Portal persists each Find submit to `etsyRecommendationRequests`, but Studio has no staff list yet.
- Firestore currently allows only the owning customer to read those docs — staff cannot list them.
- Prior plan explicitly deferred “full CRM” browsing; owner now wants a read-only list.

---

## Scope

### In Scope

- Tab reorder + new **Etsy search** tab (default tab: Etsy search).
- Studio service + hook + list UI (status, customer id, subject/styles/wording summary, canonical query, created time, Open Etsy link).
- Live query: `orderBy(createdAt, desc)`, limit ~75–100 via `onSnapshot`.
- Firestore rules: staff (`isStaff()`) may **read** all `etsyRecommendationRequests`; customers still read own only; writes remain Admin SDK / deny client.
- Docs: DATA_MODEL rules note; brief BACKEND/DECISIONS if needed.

### Out of Scope

- Status filters, search, pagination beyond limit, customer profile deep links
- Completing/cancelling searches from Studio
- Production rules deploy without human approval
- Changing Portal submit behavior
- Finishing parked Suggestions deploy/QA (still separate)

---

## Affected Areas

### Files / Modules
- `CustomerRequestsPage.tsx` — tabs
- New: `etsyRecommendationRequestsService.ts`, `useEtsyRecommendationRequests.ts`, `EtsyRecommendationRequestsSection.tsx`
- `firestore.rules`
- `settings.css` or staff-inbox CSS for list rows
- `DATA_MODEL.md` (permissions)

### Architecture Impact
- [x] Studio client read of existing collection after rules widen; no new callables.

### Security Impact
- [x] Broadens read of customer search answers (subject/wording) to active staff. Least privilege: read-only; no client writes. Production rules deploy = human checkpoint.

### Data Model Impact
- [x] Permissions text only; no schema change.

### Backend Impact
- [x] Rules only; no functions.

### UI / UX Impact
- [x] New tab + list; manual QA.

### Migration Impact
- [x] None. Rollback: revert rules + UI.

---

## Approach

1. Update rules: `allow read: if isStaff() || (isCustomer() && resource.data.customerUid == request.auth.uid);`
2. Service maps docs → list items; subscribe ordered by `createdAt` desc with limit.
3. Section UI mirrors pending-suggestions list pattern; external link opens `etsySearchUrl`.
4. Page tab order + content switch; default `etsy_search`.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Studio typecheck | package script if present | yes |
| Unit | none required for thin list | no |
| Rules emulator | optional | no |

### Manual
- Tab order visual
- List shows recent Portal searches (after rules deployed to the Firebase project Studio uses)
- Customer still can read own request; Open Etsy works
- Suggestions still works on far-right tab

---

## Human Checkpoints Anticipated
- [x] Manual UI review
- [x] Firestore rules deploy to fresh-prints-dev (if Studio points there)
- [ ] Production rules — not this phase

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Helpers see customer free-text | Med | Accepted for staff ops; read-only |
| List empty until rules deployed | Med | Document deploy step in test checkpoint |
| Large collections | Low | Limit query |

---

## Rollback Plan
Revert rules + Studio tab/files.

---

## Documentation Updates Required
- [x] DATA_MODEL.md
- [x] DECISIONS.md (short note / ADR amendment)
- [ ] Other as needed

---

## Open Questions
- [x] None — tab order locked by owner request.

---

## Approval
- Review doc: pending
- Verdict: pending
