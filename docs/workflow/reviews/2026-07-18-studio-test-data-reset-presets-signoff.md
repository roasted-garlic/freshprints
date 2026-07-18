# Signoff: Studio Test Data Reset presets + wipe expansion

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-18-studio-test-data-reset-presets-plan.md |
| Review | docs/workflow/reviews/2026-07-18-studio-test-data-reset-presets-review.md |
| Test report | docs/workflow/reviews/2026-07-18-studio-test-data-reset-presets-test-report.md |
| Final status | **approved_with_notes** |

---

## Summary

Studio **Test Data Reset** wipe UX closed after owner **PASS**: short target labels, preset buttons (including **All (-) Designs**), expanded Etsy/Custom orphan wipe targets in shared expansion, and `wipeOperationalTestData` already deployed to `fresh-prints-dev`. Safety gates unchanged. No production.

---

## Changes Delivered

### Behavior
- Short checkbox labels; long copy secondary/collapsible
- Preset buttons: Print Requests, Etsy, Custom Requests, Customer Uploads, Designs + prints, Select all, Clear, **All (-) Designs** (all ops except `designs`)
- Named wipe targets expand to orphan/side collections (Etsy suggestion/request leftovers; Custom acks/notifications/email jobs/legacy `customRequests`)
- Callable deploy to `fresh-prints-dev` completed earlier in this workflow (required for leftover clears)

### Files Created
- `docs/workflow/plans/2026-07-18-studio-test-data-reset-presets-plan.md`
- `docs/workflow/reviews/2026-07-18-studio-test-data-reset-presets-review.md`
- `docs/workflow/reviews/2026-07-18-studio-test-data-reset-presets-test-report.md`
- `docs/workflow/reviews/2026-07-18-studio-test-data-reset-presets-signoff.md` (this file)

### Files Modified
- `packages/shared/src/utils/operationalWipeTargets.ts` (+ `EVERYTHING_EXCEPT_DESIGNS_WIPE_PRESET_TARGETS`, expanded plans)
- `packages/shared/src/utils/operationalWipeTargets.test.ts`
- `apps/studio/.../wipeTargetOptions.ts`, `TestDataResetPage.tsx`, `test-data-reset.css`
- `docs/standards/TESTING.md`

### Documentation Updated
- TESTING.md wipe presets / expansion notes
- Workflow plan/review/test/signoff artifacts

---

## Tests

### Automated
- Unit: `operationalWipeTargets` tests — **pass** (21)
- Functions build — **pass**
- Deploy `wipeOperationalTestData` → `fresh-prints-dev` — **pass** (prior)

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Soft-reload Studio wipe UX (labels, presets, All (-) Designs) | **PASS** | owner |
| Expanded Etsy / Custom leftover wipe behavior | **PASS** | owner |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | 2026-07-18 | Explicitly out of scope |
| Database migration | N/A | | |
| Design / UX | obtained | 2026-07-18 | Owner PASS |
| Business / policy | N/A | | |
| Secrets / env | N/A | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Admin SDK leftover count script blocked (no ADC) | low | Owner Console/preset wipe PASS is authoritative |
| Custom Requests wipe clears all `customerNotifications` / `emailDeliveryJobs` on allowlisted project | medium (dev-only) | Documented; same as review |

---

## Deferred Items (Roadmap)
- Production wipe / production Functions deploy — deferred until explicit owner approval
- Separate Brevo first-proof IP/blocklist deliverability checkpoint remains open (not part of this signoff)

---

## Open Blockers
- [x] None for this goal

---

## Verdict

**approved_with_notes** — Owner manual QA **PASS**; automated unit/build/deploy notes recorded; production out of scope.

---

## Workflow Complete
- [x] `.cursor/workflow/state.md` updated (wipe goal closed; Brevo checkpoint remains active separately)
- [x] `ROADMAP.md` updated
- [x] `RISK_REGISTER.md` updated if needed — N/A
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated

**Recommended next action for user:** Continue Brevo IP/blocklist first-proof email retest, or pick next managed phase. No production.
