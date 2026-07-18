# Signoff: Studio Messages deep-link scroll + mark read on reply

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-17-studio-messages-deeplink-scroll-read-on-reply-plan.md |
| Review | docs/workflow/reviews/2026-07-17-studio-messages-deeplink-scroll-read-on-reply-review.md |
| Test report | docs/workflow/reviews/2026-07-17-studio-messages-deeplink-scroll-read-on-reply-test-report.md |
| Manual QA | docs/workflow/reviews/2026-07-17-studio-messages-deeplink-scroll-read-on-reply-manual-qa.md |
| Final status | **approved_with_notes** |

---

## Summary

Studio **Messages** inbox deep-link opens Assisted request → Messages tab with thread scrolled to bottom / composer in view; staff reply marks related unread ack as read (same as Read control). Owner confirmed this is the Studio Messages deep-link residual and **PASS**. No deploy required. Web-push **not** marked PASS.

---

## Changes Delivered

### Behavior

- Deep-link / Messages tab: scroll panel + thread to latest messages.
- After successful staff send: mark history entry read via existing ack service.
- Per-row Read unchanged.

### Documentation Updated

- Manual QA, test report, signoff; workflow state; handoff

---

## Tests

### Automated

- Shared unit: pass
- Studio Vite build: pass
- Studio tsc: pre-existing ignoreDeprecations TS5103 documented

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Deep-link scroll + mark-read-on-reply | **PASS** | Owner (2026-07-17) |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | 2026-07-17 | Studio renderer-only |
| Design / UX | obtained | 2026-07-17 | Manual QA PASS |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Studio tsc ignoreDeprecations | low | Pre-existing tooling debt |

---

## Deferred Items (Roadmap)

- `portal-notifications-web-push` VAPID + push QA
- Optional Functions alert-copy redeploy; optional rules harden

---

## Open Blockers

- [x] None for this goal

---

## Verdict

**approved_with_notes** — owner PASS on Studio Messages deep-link residual.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated
- [x] `ROADMAP.md` updated
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated

**Recommended next action for user:** Finish **portal-notifications-web-push** (VAPID env + browser push QA).
