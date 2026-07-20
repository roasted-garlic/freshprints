# Signoff: Portal upload limits layout / copy / ZIP (+ #2 upload caps residual)

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-18-portal-upload-limits-copy-zip-plan.md |
| Review | docs/workflow/reviews/2026-07-18-portal-upload-limits-copy-zip-review.md |
| Test report | docs/workflow/reviews/2026-07-18-portal-upload-limits-copy-zip-test-report.md |
| Final status | **approved** |

---

## Summary

Owner **PASS** closed Small Managed Items **#2** upload caps and Portal follow-ons (25 MB image cap, remaining daily quota UI, layout/copy/ZIP alignment, Choose files title removal). Dev-only Functions deploys; no production.

Related prior phases also recorded PASS under the same owner message:
- `2026-07-18-upload-caps-studio-settings-*`
- `2026-07-18-portal-25mb-remaining-quota-*`

---

## Changes Delivered

### Behavior
- Studio Settings live customer upload quotas (print-request ↓ / donation ↑ defaults)
- Portal remaining daily quota display; 25 MB single-image max
- Plain-English upload-starts copy; ZIP max = min(2 GB, images/day × 25 MB)
- Choose files panel layout polish; embedded Choose files title removed

### Documentation Updated
- Manual QA + test reports marked PASS 2026-07-18
- Human checkpoint for #2 deploy/QA resolved PASS
- ROADMAP Small Managed Items #2 → Done

---

## Tests

### Automated
- Shared/functions/portal unit + typecheck + Functions build (see test reports) — passed earlier in phase

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Upload caps + Studio Settings (#2) | PASS | owner 2026-07-18 |
| Portal 25 MB + remaining quota | PASS | owner 2026-07-18 |
| Portal layout / copy / ZIP (+ Choose files title removal) | PASS | owner 2026-07-18 |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | | fresh-prints-dev only |
| Database migration | N/A | | |
| Design / UX | obtained | 2026-07-18 | Owner PASS on upload caps QA |
| Business / policy | N/A | | |
| Secrets / env | N/A | | |
| Dev deploy | obtained | 2026-07-18 | Earlier APPROVE DEV DEPLOY |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Storage rules still allow 2 GB ZIP ceiling | low | Functions enforce tighter Settings-derived max |
| Studio quotas UX polish parked | low | Soft borders / blank-while-editing — separate parked re-test if still open |

---

## Deferred Items (Roadmap)
- Small Managed Items **#3** — Cap quantity per show queue + Studio Settings UI (ready to start; do not block if already in progress)

---

## Open Blockers
- [x] None (upload QA human checkpoint cleared)

---

## Verdict

**approved** — Owner PASS covers #2 upload caps and Portal upload-limits polish residuals. Phase closed lightly so #3 may proceed.

---

## Workflow Complete
- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated (#2 Done)
- [ ] `RISK_REGISTER.md` updated if needed — N/A
- [ ] **`references/project-chatgpt-handoff/CURRENT-STATE.md` updated** — handoff package not present
- [ ] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated — N/A

**Recommended next action for user:** Start Small Managed Items **#3** (qty-per-show-queue cap + Settings), or continue if another agent already started that phase.
