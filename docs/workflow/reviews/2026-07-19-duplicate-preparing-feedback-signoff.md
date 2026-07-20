# Signoff: Portal cart/detail UX batch (duplicate preparing + cart polish)

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Signoff by | Signoff Agent |
| Primary plan | docs/workflow/plans/2026-07-19-duplicate-preparing-feedback-plan.md |
| Related plans | cart newest-first; detail newest-first match cart; cart per-size line |
| Review | docs/workflow/reviews/2026-07-19-duplicate-preparing-feedback-review.md |
| Test report | docs/workflow/reviews/2026-07-19-duplicate-preparing-feedback-test-report.md |
| Manual QA | docs/workflow/reviews/2026-07-19-duplicate-preparing-feedback-manual-qa.md |
| Final status | **approved** |

---

## Summary

Closed the combined Portal Current Request / request-detail UX batch after owner **PASS on everything** (2026-07-19). Delivered preparing feedback for optimistic duplicates (editable size/qty while pending), newest-first detail + cart, per-size cart line items, cart header Clear + quota meta bar between dividers, and hidden mobile cart scrollbar chrome.

---

## Changes Delivered

### Behavior

- **Duplicate preparing:** Optimistic duplicate cards show “Preparing duplicate…” (pulse / accent); Width/Height/Qty editable immediately; Duplicate/Remove locked until real id; mid-flight edits flush on resolve; stable client key avoids remount.
- **Newest-first:** Detail and cart share newest-first display order; duplicate still lands to the right of the source; resize/qty does not reshuffle.
- **Cart per-size lines:** Each size is its own drawer row (`W x H · Qty N`); remove is per line.
- **Cart header:** Title/close/summary in header; Clear (left) + daily quota (right) in bordered meta bar between header and list.
- **Mobile cart:** On ≤720px, drawer body scrollbar chrome hidden while overflow scroll remains.

### Files Modified (app)

- `apps/portal/features/print-requests/hooks/usePrintRequestDetail.ts`
- `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx`
- `apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx`
- `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx`
- `apps/portal/styles/requests.css`
- `apps/portal/styles/shell.css`
- Related sort/format utils + unit tests from folded-in cart goals
- `duplicatePortalPrintRequestItem` (dev deploy for detail newest-first insert math)

### Documentation Updated

- Plans/reviews/test reports/manual QA for this goal and folded cart goals
- `docs/project/ROADMAP.md` (Phase 8 fast-follow polish note)
- `.cursor/workflow/state.md`
- `references/project-chatgpt-handoff/CURRENT-STATE.md`, `13-recent-completed-work.md`

---

## Tests

### Automated

| Check | Result |
|-------|--------|
| Portal typecheck | pass |
| Unit (sort/format/display-order suites from folded goals) | pass |
| Functions build + `duplicatePortalPrintRequestItem` → fresh-prints-dev | pass (detail newest-first session) |

Overall test status: **passed** (automated + owner manual PASS).

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Duplicate preparing + editable while pending | **PASS** | owner 2026-07-19 |
| Cart per-size line items | **PASS** | owner 2026-07-19 |
| Detail + cart newest-first (+ duplicate-right / resize-stable) | **PASS** | owner 2026-07-19 |
| Cart Clear + quota meta bar | **PASS** | owner 2026-07-19 |
| Mobile cart scrollbar hidden | **PASS** | owner 2026-07-19 (PASS everything) |

Related manual QA docs closed as PASS:

- `2026-07-19-duplicate-preparing-feedback-manual-qa.md`
- `2026-07-19-current-request-cart-per-size-line-manual-qa.md`
- `2026-07-19-portal-detail-newest-first-match-cart-manual-qa.md`
- `2026-07-19-current-request-cart-newest-first-manual-qa.md`

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | | Dev-only / Portal soft-reload |
| Database migration | not required | | |
| Design / UX | obtained | 2026-07-19 | Owner PASS on everything |
| Business / policy | not required | | |
| Secrets / env | not required | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Duplicate still waits on Cloud Function latency | low | Preparing UI documents wait; speed-up out of scope |
| ESLint `@next/next/no-img-element` rule noise on drawer img | low | Pre-existing; not introduced by this batch |

---

## Deferred Items (Roadmap)

Unrelated parked owner-QA items remain open (not part of this PASS):

- Smart contextual print-request quota errors
- Portal split print request across shows
- Clear request must reuse the same open working print request
- Catalog/library: stable Studio-newest sort
- Fix rapid Add to Request duplicate working-request create race
- Portal auth busy feedback gaps

---

## Open Blockers

- [x] None

---

## Verdict

**approved** — Owner recorded **PASS on everything** for the combined Portal cart/detail UX workflow on 2026-07-19. Automated checks from this and folded sessions passed; manual checkpoints resolved.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `RISK_REGISTER.md` updated if needed (N/A — no new risks)
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] Other handoff files per MANIFEST (features inventory not required for polish-only; no new ADR)

**Recommended next action for user:** Pick next managed goal from parked QA list or Small Managed Items (#3 Cap B / split across shows), or leave workflow idle.
