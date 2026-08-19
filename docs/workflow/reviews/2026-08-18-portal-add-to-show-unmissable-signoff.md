# Signoff: Portal Add to Show Unmissable

| Field | Value |
|-------|-------|
| Date | 2026-08-18 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-08-18-portal-add-to-show-unmissable-plan.md |
| Review | docs/workflow/reviews/2026-08-18-portal-add-to-show-unmissable-review.md |
| Test report | docs/workflow/reviews/2026-08-18-portal-add-to-show-unmissable-test-report.md |
| Final status | **approved** |

---

## Summary

Portal Current Request and request-review copy now make it obvious that building a request is not the end of the flow. Customers review the request, then add it to a Whatnot show. Show picker, callable queue path, and request lifecycle are unchanged (ADR-FP-066). Owner DEV QA: `DEV ADD TO SHOW UNMISSABLE QA: PASS`.

Original signed-off commit: `5d042696ddbc7bce2bc40675e5cae82124e5dc04`.

**Follow-up (2026-08-18, still this goal, not analytics):** After that commit, the owner asked to move “Final step: choose the show you want this request added to.” under the review CTA and keep it on one centered line. That layout is `3fe17d8644524afb973e4ce294764405dda95deb` (`fix(portal): finalize add-to-show review layout`). Original goal history is preserved.

---

## Changes Delivered

### Behavior

- Current Request drawer primary CTA: **Review & Add to Show** (same navigation to `/requests/{id}`).
- Muted helper above that CTA: `Next step: review your request, then add it to a show.`
- Subdued **Needs a show** pill on a non-empty working Current Request only (existing drawer state; not shown after queue).
- Request-review header no longer shows **Upload Designs** / **Browse Design Library**. **Back to Design Library** remains. Empty-state Upload/Browse remains when there are no items.
- Review header primary CTA: **Add Request to Whatnot Show** (owner DEV QA amendment; still only opens `PortalQueueToShowModal`). Wider on desktop, full-width on mobile.
- Modal submit remains **Add to show**.
- “How this works” / Help FAQ were already clear; left unchanged.

### Files Created

- `apps/portal/features/print-requests/components/CurrentRequestDrawer.addToShowCopy.test.ts`
- `docs/workflow/plans/2026-08-18-portal-add-to-show-unmissable-plan.md`
- `docs/workflow/reviews/2026-08-18-portal-add-to-show-unmissable-review.md`
- `docs/workflow/reviews/2026-08-18-portal-add-to-show-unmissable-test-report.md`
- `docs/workflow/reviews/2026-08-18-portal-add-to-show-unmissable-dev-qa-checkpoint.md`
- `docs/workflow/reviews/2026-08-18-portal-add-to-show-unmissable-signoff.md`

### Files Modified

- `apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx`
- `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx`
- `apps/portal/styles/shell.css`
- `apps/portal/styles/requests.css`
- `docs/project/ROADMAP.md`
- `.cursor/workflow/state.md`
- `references/project-chatgpt-handoff/CURRENT-STATE.md`
- `references/project-chatgpt-handoff/13-recent-completed-work.md`
- `references/project-chatgpt-handoff/03-roadmap-and-phases.md`
- `references/project-chatgpt-handoff/04-features-inventory.md`
- `references/project-chatgpt-handoff/05-workflows-summary.md`

### Documentation Updated

- ROADMAP banner; handoff CURRENT-STATE, 13, 03, 04, 05.

---

## Tests

### Automated

- `npm run typecheck --workspace @fresh-prints/portal` — exit 0
- `npx tsx --test apps/portal/features/print-requests/components/CurrentRequestDrawer.addToShowCopy.test.ts` — 8/8 pass

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Owner DEV QA — drawer, review header, add-to-show, post-queue cue | PASS | human (`DEV ADD TO SHOW UNMISSABLE QA: PASS`) |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | 2026-08-18 | DEV signoff only; later `development` → `production` PR + App Hosting remain gated |
| Database migration | N/A | | |
| Design / UX | obtained | 2026-08-18 | Owner DEV QA PASS after CTA size/copy tweak |
| Business / policy | N/A | | |
| Secrets / env | N/A | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Follow-up layout commit after original signoff | Low | Recorded as `3fe17d86`; original `5d042696` unchanged |
| Production still on prior App Hosting build | Low | Separate promotion PR; no App Hosting this signoff |
| Header CTA opens picker (does not immediately queue) | Low | Accepted by owner; modal **Add to show** remains the queue action |

---

## Deferred Items (Roadmap)

- `portal-design-engagement-analytics` remains queued separately
- Production Portal rollout of this copy (and optional shared PR with analytics)
- Phase 9 parked

---

## Open Blockers

- [x] None

---

## Verdict

**approved** — Automated checks passed; owner `DEV ADD TO SHOW UNMISSABLE QA: PASS`. No backend/lifecycle change.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `RISK_REGISTER.md` updated if needed — not needed
- [x] **`references/project-chatgpt-handoff/CURRENT-STATE.md` updated**
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] Other handoff files per `references/project-chatgpt-handoff/MANIFEST.md` when behavior/architecture changed (03, 04, 05)

**Recommended next action for user:**

Commit the uncommitted Portal copy on `development` when ready. Production promotion is a later `development` → `production` PR (optional to combine with `portal-design-engagement-analytics`). Do not App Hosting until that PR is authorized.
