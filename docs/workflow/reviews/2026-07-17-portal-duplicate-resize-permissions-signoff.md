# Signoff: Portal duplicate + resize permissions

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-17-portal-duplicate-resize-permissions-plan.md |
| Review | docs/workflow/reviews/2026-07-17-portal-duplicate-resize-permissions-review.md |
| Test report | docs/workflow/reviews/2026-07-17-portal-duplicate-resize-permissions-test-report.md |
| Manual QA | docs/workflow/reviews/2026-07-17-portal-duplicate-resize-permissions-manual-qa.md |
| Final status | **approved_with_notes** |

---

## Summary

Portal print-request **Duplicate → resize** autosave no longer fails with `Missing or insufficient permissions` for valid customer edits. Client blocks optimistic `pending_dup_*` writes, stops parent `printRequests` touch on item update, validates size/qty before write, and clears notes with `deleteField()`. Owner manual QA **PASS**. Optional `firestore.rules` harden for `fresh-prints-dev` remains undeployed until owner says `APPROVE DEV DEPLOY`. No production deploy.

---

## Changes Delivered

### Behavior

- Optimistic duplicate rows are non-editable until the real item id exists.
- Item resize/qty autosave updates the item doc only (no fragile parent touch).
- Over-22″ / invalid qty blocked client-side with clear messaging (not permissions toast).
- Rules harden (narrow `hasOnly` + null-tolerant optionals) is in tree; **dev deploy optional / pending**.

### Files Modified (implementation)

- `apps/portal/features/print-requests/services/portalPrintRequestService.ts`
- `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx`
- `firestore.rules` (narrow harden — deploy pending)
- Workflow plan / review / test / manual QA / this signoff
- `.cursor/workflow/state.md`
- `docs/project/ROADMAP.md`
- `references/project-chatgpt-handoff/CURRENT-STATE.md`
- `references/project-chatgpt-handoff/13-recent-completed-work.md`

### Documentation Updated

- Manual QA recorded PASS; test report overall `passed_with_notes`; this signoff
- Roadmap Phase 9 deferred note
- Handoff CURRENT-STATE + recent completed work

---

## Tests

### Automated

- Portal `npx tsc --noEmit`: exit 0
- Rules emulator suite: absent — not run (documented)

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Duplicate → resize / qty / oversize / remove | **PASS** | Owner (2026-07-17): “Portal duplicate/resize is fixed and PASSED.” |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | 2026-07-17 | Not requested |
| Dev `firestore:rules` deploy | **pending** | | Reply `APPROVE DEV DEPLOY` when ready |
| Database migration | not required | | |
| Design / UX | obtained | 2026-07-17 | Manual QA PASS |
| Business / policy | not required | | |
| Secrets / env | not required | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Rules harden not yet on `fresh-prints-dev` | low | Client fix is what owner verified; rules deploy optional via `APPROVE DEV DEPLOY` |
| No rules emulator suite | low | Documented gap; rely on manual QA |

---

## Deferred Items (Roadmap)

Parked (do not wipe; not PASS for this signoff):

- portal-notification-history-modal (next in queue)
- assisted-messages-ctrl-enter-send
- studio-messages-deeplink-scroll-read-on-reply
- portal-notifications-web-push (deploy / VAPID)
- Brevo

---

## Open Blockers

- [ ] Optional: owner `APPROVE DEV DEPLOY` for `firebase deploy --only firestore:rules --project fresh-prints-dev`
- [x] Manual QA checkpoint closed (PASS)

---

## Verdict

**approved_with_notes** — owner PASS on client behavior; optional rules harden deploy still awaiting explicit approval. Other parked QA unchanged.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [ ] `RISK_REGISTER.md` updated if needed — N/A (no new risk)
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated

**Recommended next action for user:** Resume parked **portal-notification-history-modal** manual QA (`docs/workflow/reviews/2026-07-17-portal-notification-history-modal-manual-qa.md`), or reply `APPROVE DEV DEPLOY` if you want the rules harden shipped to `fresh-prints-dev` first.
