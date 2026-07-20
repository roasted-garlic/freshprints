# Plan: Show queue cutoff + calendar countdown

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Author | Planning Agent |
| Status | ready_for_review / **approved** (review 2026-07-20) |
| Workflow | managed-phase |
| Related | Small Managed Items Backlog #5; `docs/project/ROADMAP.md` |

---

## Goal

Customers cannot queue a Continuable print request onto a show after a configurable **cutoff offset** before that show’s `scheduledStartAt` (product default example: **5 hours** — 8pm show → cutoff 3pm). Studio staff configure the offset on **Show Queue settings**. Portal Add-to-Show calendar reflects unavailable shows and shows a **compact countdown to cutoff**. Backend (Cloud Functions) enforces the rule; UI alone is not enough.

## Background

- Roadmap item #5 (owner-directed). #4 upload mobile layout closed with owner **PASS** 2026-07-20.
- Existing Portal flow: `listPortalAllocatableShows` + `queuePortalPrintRequestToShow` + shared `ShowPicker` / `buildShowPickerOptions`.
- Existing Studio config home: **Show Queue settings** modal on Upcoming Shows / Show Queue (`settings/showQueue` via `showQueueSettingsService`) — correct place per owner (“setting for this in the show settings on the show queue page”).
- Capacity / past / full already block allocation via `getShowAllocationBlockReason`; cutoff is a new Portal-only gate (Studio staff may still allocate after cutoff).

## Scope

### In Scope

1. **Global Studio setting** on `settings/showQueue`: `portalQueueCutoffHoursBeforeStart` (number; default **5** when unset). Validated range (proposed **1–72** hours).
2. **Studio UI:** field in Show Queue settings → General section (hint: “Customers cannot Add to Show within this many hours of show start. Example: 5 → 8pm show closes at 3pm.”).
3. **Shared cutoff helpers** in `packages/shared` (pure time math on `scheduledStartAt` absolute timestamps).
4. **Backend enforcement:**
   - `listPortalAllocatableShows`: treat past-cutoff shows as not allocatable (still calendar-visible like past/full when appropriate); expose cutoff hours (and/or per-show `queueCutoffAt`) for UI.
   - `queuePortalPrintRequestToShow`: reject with clear `failed-precondition` + dedicated error code when past cutoff (re-check inside transaction).
5. **Portal UX:** non-selectable / clear status for past-cutoff shows; **compact countdown to cutoff** on selected (or listed) slot without breaking capacity bar or scroll-to-progress behavior.
6. **Docs:** DATA_MODEL, BACKEND, DECISIONS (ADR), ROADMAP, firestore.rules allowlist for new field.
7. **Deploy** Functions (+ rules if changed) to **fresh-prints-dev** only. No production. No commit unless asked.

### Out of Scope

- Per-show override of cutoff hours (global setting only).
- Blocking Studio staff allocation after cutoff.
- Changing ADR-FP-102 / `L` / one-request-per-show.
- Production deploy.
- Timezone picker UI (see Timezone below).

---

## Timezone

- Show starts are stored as Firestore `Timestamp` on `upcomingShows.scheduledStartAt` (absolute UTC instant).
- **Cutoff math:** `cutoffAt = scheduledStartAt − N hours` compared to `now` — no calendar-day conversion required.
- **Display:** existing `formatShowTimeOnlyLabel` / locale formatters (browser local). Operational day buckets elsewhere use **America/Chicago**; cutoff is not a calendar-day bucket. Document this in ADR + DATA_MODEL.
- No new timezone field on shows.

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/utils/showQueueCutoff.ts` (+ tests)
- `packages/shared/src/constants/printRequest/printRequestQuotaErrorCodes.constants.ts` — e.g. `SHOW_QUEUE_CUTOFF`
- `packages/shared/src/types/portal/listPortalAllocatableShows.types.ts`
- `packages/show-picker` — optional compact cutoff label on slot / types; preserve scroll-to-progress
- `functions/src/listPortalAllocatableShows.ts`
- `functions/src/queuePortalPrintRequestToShow.ts` (+ transaction re-check)
- `apps/studio/.../showQueueSettingsService.ts`, `useShowQueueSettings.ts`, `UpcomingShowsPage.tsx` (settings modal)
- `apps/portal/.../PortalQueueToShowModal.tsx` (+ any small countdown helper)
- `firestore.rules` — `showQueueSettingsFieldsValid` allowlist
- Docs: DATA_MODEL, BACKEND, DECISIONS, ROADMAP, plan/review/test/signoff

### Architecture Impact

- [x] Details: Setting on existing `settings/showQueue`; shared pure helpers; Portal callables enforce; ShowPicker stays presentation-focused (labels from options).

### Security Impact

- [x] Details: Client cannot bypass — Functions enforce. Studio write remains staff-only via existing rules + permission. New field validated in Studio service + rules keys allowlist. No secrets.

### Data Model Impact

- [x] Details: Optional number `portalQueueCutoffHoursBeforeStart` on `settings/showQueue`. Default 5 when missing (code). No migration/backfill.

### Backend Impact

- [x] Details: Read setting in list + queue callables; new error code; deploy Functions + rules to fresh-prints-dev.

### UI / UX Impact

- [x] Details: Studio settings field; Portal picker unavailable state + compact countdown. Manual QA required.

### Migration Impact

- [x] None (optional field; code default).
- Forward: deploy Functions/rules; staff may set hours in Studio.
- Rollback: redeploy prior Functions; omit field (defaults to 5) or set high hours temporarily.

---

## Approach

1. Add shared cutoff utilities + unit tests (`getPortalQueueCutoffAt`, `isPastPortalQueueCutoff`, `formatPortalQueueCutoffCountdown` compact: e.g. `2h 14m left`, `45m left`, `Closed`).
2. Extend `ShowQueueSettings` + Studio save validation (1–72) + General section input.
3. Update `firestore.rules` allowlist + optional number check.
4. Extend `getShowAllocationBlockReason` **or** separate Portal-only check used only by Portal callables — prefer **separate Portal check** so Studio eligibility unchanged (`"cutoff"` reason only in Portal path).
5. `listPortalAllocatableShows`: load `settings/showQueue`; apply cutoff when computing `isAllocatable`; return `portalQueueCutoffHoursBeforeStart` on response (single value).
6. `queuePortalPrintRequestToShow`: load setting; fail closed if past cutoff (message: pick another show).
7. Portal `buildShowPickerOptions` / modal: past-cutoff → not selectable; status like “Cutoff passed”; selected slot shows compact countdown under capacity row (CSS: one line, small type — do not enlarge slot height much; keep scroll target on `.show-picker-slot.is-selected`).
8. Tick countdown ~30s or 1s via lightweight interval in modal/picker for selected option only.
9. Docs + ADR-FP-103 (or next free number — verify DECISIONS).
10. Deploy Functions + rules to fresh-prints-dev; soft-reload Portal/Studio as needed.
11. Manual QA checkpoint for owner PASS.

### Countdown UX (layout-safe)

- Place countdown as a **single compact line** on the slot (e.g. under `capacityLabel` or as secondary text beside time): `Add closes in 2h 14m` / `Closed for adds`.
- Do **not** add a large callout banner above the calendar.
- Preserve existing capacity progress bar and `scheduleScrollSelectedSlotIntoView` behavior.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit (shared cutoff) | `npx tsx --test packages/shared/src/utils/showQueueCutoff.test.ts` (or project pattern) | yes |
| Unit (eligibility / list helpers if touched) | existing shared tests | yes if changed |
| Typecheck shared / portal / studio / functions | workspace typechecks | yes |
| Lint | if touched TS | preferred |
| Build | skip unless needed | no |
| Functions unit for queue validation if extractable | yes if new pure validation | yes |
| Backend deploy smoke | deploy to fresh-prints-dev | yes (dev only) |

### Manual

- [ ] Studio: set cutoff hours (e.g. 5), save, reload settings.
- [ ] Portal: show with start in ~6h → selectable + countdown; after adjusting clock/setting so now past cutoff → unavailable; queue attempt errors clearly.
- [ ] Calendar layout: countdown compact; scroll still reveals capacity bar.
- [ ] Studio staff can still allocate after Portal cutoff (spot-check).

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (owner PASS on Portal picker + Studio setting)
- [ ] Design approval — N/A beyond compact countdown
- [ ] Business logic decision — resolved: **global** setting on Show Queue settings (not per-show)
- [ ] Production deploy — no
- [ ] Database migration — none
- [ ] Auth / external service setup — no
- [ ] Secrets / env — no

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Client clock skew vs server | medium | Server enforces; UI may briefly disagree |
| Countdown bloats slot / breaks scroll | medium | Compact one-line CSS; preserve scroll helper |
| Rules reject save if field omitted from allowlist | high | Update rules in same change; deploy rules to dev |
| Staff confused that Studio still allows adds | low | Hint copy: “Portal customers only” |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Redeploy previous Functions + rules to fresh-prints-dev; remove or ignore setting field (code default). UI without Functions still blocked server-side only after rollback of Functions.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [x] DATA_MODEL.md — `settings/showQueue` field
- [x] BACKEND.md — list/queue cutoff behavior
- [ ] TESTING.md
- [ ] DEPLOYMENT.md — note if rules/functions deploy steps needed (optional)
- [ ] STYLE_GUIDE.md
- [x] DECISIONS.md — ADR
- [x] ROADMAP.md — #5 status
- [x] firestore.rules

---

## Open Questions

- [x] None blocking — prefer global Show Queue settings field (owner wording + existing modal).

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-20-show-queue-cutoff-countdown-review.md
- Verdict: pending
