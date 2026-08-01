# Plan: Portal customer show-schedule visibility + independently configurable request/customer-show limits

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Author | Planning Agent |
| Status | approved_with_changes (incorporate Formal Review) |
| Workflow | managed-phase |
| Goal #13 slice | `portal-customer-queued-show-schedule-visibility` + `portal-print-request-and-customer-show-limit-settings` |
| Related | `docs/workflow/reviews/2026-07-31-production-portal-show-schedule-and-limit-settings-review.md` |

### Formal Review incorporation (required)

1. Named shared constant capping batch `printRequestIds` (test the cap).
2. Server derives/validates show IDs from owned allocations (do not trust client-only show ID lists).
3. Linked save always persists equal numeric fields.
4. Progress status chip/label unchanged; schedule UI is additive.
5. ADR supersedes sole-`L` product rule; preserve atomic queue + ADR-FP-122 accumulation on customer-show limit.
6. Linked equal-value compatibility test; later deploy checklist in implement checkpoint.

---

## Goal

Two coordinated Goal #13 prelaunch source slices in one workflow:

1. **Show-schedule visibility** — Portal customers see the scheduled date/time of show(s) their print request is queued to, without show names or internal show metadata.
2. **Independent limit settings** — Owner can configure (a) max prints per print request and (b) max prints per customer per show separately, with a default-linked checkbox, while overall show capacity remains a third independent concept.

Source only this pass: Plan → Review → Implement → Test → Implementation Review → commit `development` → protected PR to `production`. **No** App Hosting, Functions, Rules, indexes, or production-data deploys.

---

## Background

- Active goal: `production-release` (Goal #13), Phase G. Prior remediations remain signed off; Stage 2 / domain deferred.
- Customers currently see progress badges (`Queued`, etc.) via `getPrintRequestProgressLabel` / `derivePrintRequestQueueState` but no schedule line on cards or details.
- ADR-FP-102 / ADR-FP-122 describe a **sole** limit `L` = `settings/printRequestLimits.maxQuantityPerShowPerCustomer` used for both Current Request max and per-customer-per-show allotment. Studio Settings exposes one field. Owner wants unlinkable dual limits.
- Owner Portal observation (request qty 25, customer 25 of 30, show 25 of 200) is explained by repo evidence below — not by an undocumented second setting today.

---

## Investigation findings (repo-grounded)

### A. Show-schedule visibility

| # | Question | Finding |
|---|----------|---------|
| 1 | My Print Requests cards | `apps/portal/features/print-requests/components/PrintRequestCard.tsx`; rendered from `apps/portal/app/(app)/requests/page.tsx` |
| 2 | Request-detail progress | `apps/portal/features/print-requests/components/PortalPrintRequestProgressPanel.tsx` in `PrintRequestDetailView.tsx` |
| 3 | Progress derivation | Shared `derivePrintRequestQueueState` + `getPrintRequestProgressLabel` (`packages/shared/src/utils/printRequestQueueState.ts`, `printRequestProgressDisplay.ts`). Totals from `buildPrintRequestAllocationTotalsByRequestId` |
| 4 | Show IDs vs records | List/detail allocation loads include `upcomingShowId` on `ShowAllocation`. Progress path uses **quantity totals only** today — no schedule. Detail timer path `getPortalShowPrintProgress` already resolves unique show IDs for owned requests but returns timer fields only (no `scheduledStartAt`, no title) |
| 5 | Customer `showAllocations` | Yes — allocations carry `upcomingShowId`, quantities, status. No scheduled datetime on allocation |
| 6 | Rules — allocations | `firestore.rules` `match /showAllocations`: customer read if `customerOwnsPrintRequestById(resource.data.printRequestId)` |
| 7 | Rules — `upcomingShows` | **Staff-only read.** Customers cannot client-read show docs. `listPortalAllocatableShows` Admin projection already returns `scheduledStartAt` (no title) for calendar window |
| 8 | Past/completed shows | Calendar callable window = start of (now month − 2). Detail timer callable loads shows by allocation show ID with **no calendar window** — better for retained history |
| 9 | Existing customer-safe projection | `getPortalShowPrintProgress` — ownership-bounded, batched show doc gets, no title. Closest reuse target |
| 10 | Date/time formatter | `formatShowDateTimeLabel` / `formatShowTimeOnlyLabel` in `packages/shared/src/utils/showDateTimeDisplay.ts` (locale `toLocaleString` / `toLocaleTimeString`, **no explicit “CT” suffix** in Portal/show-picker today). Reuse as-is; do not invent new timezone behavior |
| 11 | Cache invalidation | `useMyPrintRequests.reload` (chrome vs full); queue reconcile merges allocation totals; detail uses `usePortalShowPrintProgress` when polling enabled |
| 12 | Multi-show split | `ShowAllocation` docs: one item may have multiple allocations across shows; `upcomingShowId` per allocation. Staff or historical splits possible; Portal queue is atomic full-request-to-one-show (ADR-FP-102 §3) but display must still handle multi-show |
| 13 | Positive/relevant allocation | Non-`canceled`, `allocatedQuantity > 0` (same spirit as `listPortalAllocatableShows` customer qty loop and progress totals skipping canceled) |
| 14 | Missing show | `getPortalShowPrintProgress` already skips missing docs (`flatMap` empty). UI must show quiet `Schedule unavailable` without exposing show ID |

**Data-access decision:** Do **not** denormalize schedule onto `printRequests`. Do **not** client-read `upcomingShows`. Prefer:

1. Extend `getPortalShowPrintProgress` response with customer-safe `scheduledStartAt: string | null` (detail reuse).
2. Add a **bounded batch** callable (e.g. `getPortalPrintRequestShowSchedules`) accepting a capped list of caller-owned `printRequestIds`, returning per-request distinct show schedules (`upcomingShowId` + `scheduledStartAt` only) with server-side unique show doc fetch + Promise-style dedupe of show IDs across the batch.
3. Portal shared pure helpers + small cache/dedupe around the batch callable for My Print Requests full-scope reload.

Rules changes **not** required if callables use Admin SDK. Functions deploy remains a **later** human checkpoint (source may land now).

### B. Limit settings

| # | Question | Finding |
|---|----------|---------|
| 1 | Settings doc | `settings/printRequestLimits` (`PRINT_REQUEST_LIMIT_SETTINGS_DOC_ID`) |
| 2 | Source of production **30** | Almost certainly stored `maxQuantityPerShowPerCustomer` (`L`) set in Studio. Code default is **20** (`PRINT_REQUEST_MAX_QUANTITY_PER_SHOW_PER_CUSTOMER`). **No separate customer-show field exists today.** Not overall show capacity |
| 3 | Source of **25** (request) | Current request’s **print quantity**, not a distinct settings field. Working-request max today = same `L` |
| 4 | Source of **200** | Show field `upcomingShows.maxTotalQuantity` (overall capacity) |
| 5 | Studio Settings UI | `PrintRequestLimitSettingsSection.tsx` — single input “Max prints per Current Request / per customer per show” |
| 6 | Shared types/defaults | `printRequestLimitSettings.constants.ts`, `printRequestLimitDefaults.constants.ts`; `printRequestLimitL()`; parse mirrors `L` → legacy Cap A |
| 7 | Portal request-limit consumers | `portalPrintRequestLimitService`, `usePortalWorkingRequestLimitState`, catalog/upload/assisted gates via context |
| 8 | Portal customer-show consumers | `PortalQueueToShowModal` (`perShowLimit`, `remainingPerShowCustomerCap`, `planPortalShowQueueFit`, `buildPortalPersonalShowUsage`) |
| 9 | Server enforcement | Add/qty/duplicate/upload/assisted callables use `maxQuantityPerShowPerCustomer` as working max; `queuePortalPrintRequestToShow` uses same `L` for customer remaining |
| 10 | Callouts | Show picker capacity labels (overall); personal usage panel (customer); fit/blocked messages (`portalShowQueueFit.ts`) |
| 11 | Cap A / daily | Cap A **not enforced**; `dailyDesignsAddedToRequestsLimit` write-only mirror of `L` on save |
| 12–13 | Separate 30 field? | **No** — displayed 30 is sole `L`. Owner product change is to **split** request max vs customer-show max |

---

## Scope

### In Scope

**Workstream 1 — schedule visibility**

- Card compact schedule line (earliest + `+ N more` when multiple distinct shows).
- Detail “Scheduled show(s)” list: dedupe by show ID, chronological, positive non-canceled allocations only; retain after printing/printed/completed while records exist.
- Pure format helpers using `formatShowDateTimeLabel`.
- Extend `getPortalShowPrintProgress` + new bounded batch schedule callable + Portal wiring/tests.
- Missing-show quiet fallback.

**Workstream 2 — limit settings**

- Additive settings fields (migration-free):
  - Keep `maxQuantityPerShowPerCustomer` = per-customer-per-show limit.
  - Add `maxQuantityPerPrintRequest` (request building limit).
  - Add `linkPrintRequestAndCustomerShowLimits` (boolean; default / absent = `true`).
- Resolve helpers: missing request-limit → fall back to customer-show limit; missing link → linked.
- Studio Settings: two number fields + link checkbox with specified sync behavior.
- Portal + Functions: request path uses request limit; queue/customer allotment uses customer-show limit; overall capacity unchanged.
- Callout audit/alignment (calendar modal, personal panel, fit warnings, Current Request badges).
- ADR amendment (supersede ADR-FP-102 “sole L” for the split; keep atomic full-request queue + ADR-FP-122 multi-request accumulation against customer-show limit).
- DATA_MODEL / handoff / test docs updates.

### Out of Scope

- App Hosting / Studio installer / Functions / Rules / index **deploys**
- Production settings save / data migration / Stage 2 / domain / Coming Soon / GA4
- Restoring Cap A / daily print limits
- Denormalizing show title or schedule onto `printRequests`
- Broadening customer reads of `upcomingShows`
- Changing overall show capacity model
- Reopening prior PASS results

---

## Affected Areas

### Files / Modules (expected — confirm during implement)

**Shared**

- `packages/shared/src/constants/printRequest/printRequestLimitSettings.constants.ts` (+ tests)
- `packages/shared/src/utils/showDateTimeDisplay.ts` (reuse; thin schedule copy helpers nearby)
- `packages/shared/src/utils/portalShowQueueFit.ts` (+ tests) if limiting-factor copy needs split clarity
- New: customer-safe schedule view helpers + types under `packages/shared/src/types/portal/` and `packages/shared/src/utils/`
- `packages/shared/src/types/portal/getPortalShowPrintProgress.types.ts`

**Portal**

- `PrintRequestCard.tsx`, `requests/page.tsx`
- `PortalPrintRequestProgressPanel.tsx` and/or `PrintRequestDetailView.tsx`
- `useMyPrintRequests.ts` / services for batch schedule load + cache
- `usePortalShowPrintProgress.ts`, `portalShowSelectionService.ts`
- `PortalQueueToShowModal.tsx`, `portalPersonalShowUsage.ts`, working-limit hooks/services
- Focused `*.test.ts`

**Studio**

- `PrintRequestLimitSettingsSection.tsx` (+ hooks/service as needed)

**Functions**

- `getPortalShowPrintProgress.ts`
- New batch schedule callable + `index.ts` export
- `updatePrintRequestLimitSettings.ts`
- Working-max helpers + add/qty/queue callables reading split settings
- Focused function tests

**Docs**

- `docs/project/DECISIONS.md` (ADR amendment)
- `docs/architecture/DATA_MODEL.md`
- Handoff CURRENT-STATE / recent-completed / decisions as needed
- Workflow plan/review/test/implementation-review artifacts

**Possible**

- `firestore.rules` — only if settings read shape needs allowlist notes (reads already signed-in; writes false). Prefer **no Rules change**.

### Architecture Impact

- [x] Details: Portal UI → hooks/services → existing/new Admin callables for schedule; settings remain `settings/printRequestLimits` with additive fields. No UI→Firestore `upcomingShows` reads.

### Security Impact

- [x] Details: Schedule callables must prove ownership (print request `customerId` / allocation ownership) before returning any `scheduledStartAt`. Return only `{ showId?, scheduledStartAt }` as needed for UI — **never** title, Whatnot id/URL, notes, capacity, other customers. No new writes. No Rules relaxation of `upcomingShows`. Limit settings writes remain owner-only Admin callable.

### Data Model Impact

- [x] Details: Additive optional fields on `settings/printRequestLimits`. No allocation/request schema migration. No production data rewrite.

### Backend Impact

- [x] Details: Functions source changes; **deploy gated**. Extend progress callable; add batch schedule callable; settings update/parse/enforce split limits.

### UI / UX Impact

- [x] Details: Portal cards + detail schedule; Studio Settings dual fields + checkbox; calendar callout correctness. Manual owner QA after later Portal/Studio/Functions rollouts.

### Migration Impact

- [x] Forward: none destructive. Absent new fields → linked behavior, request limit = existing `maxQuantityPerShowPerCustomer`.
- [x] Rollback: revert source; old clients treating sole `L` still work if server mirrors/falls back; undeployed Functions mean prod continues sole-`L` until deploy.

---

## Approach

### Workstream 1 — schedule

1. Add shared pure helpers: from allocations (+ schedule map) → distinct shows with qty > 0, sort by `scheduledStartAt`, card summary `{ earliestLabel, additionalCount }`, detail list labels, missing → `Schedule unavailable`.
2. Extend `PortalShowPrintProgress` with `scheduledStartAt: string | null`.
3. Implement batch callable with hard cap on `printRequestIds.length`, ownership checks, unique show fetches, sanitized response.
4. Wire detail panel to progress shows’ schedules; wire My Print Requests full reload to one batch call (dedupe show IDs server-side).
5. Tests for acceptance matrix (no alloc, one, multi same-show, multi shows, card +N, zero qty, remove/reassign, printed retain, missing fallback, no title/ids in output, progress regression, bounded dedupe).

### Workstream 2 — limits

1. Extend `PrintRequestLimitSettings` + resolve/parse/save:
   - Linked default; absent request max → customer-show max; absent link → true.
   - On save while linked: persist equal values + `linkPrintRequestAndCustomerShowLimits: true`.
   - Recheck sync: set customer-show = request max.
   - Legacy Cap A mirror: continue mirroring **request** max (or both equal when linked) into `dailyDesignsAddedToRequestsLimit` — still not enforced.
2. Studio UI: two inputs + checkbox; reuse settings patterns.
3. Split Portal consumers: working/request UI → request max; queue personal usage / fit → customer-show max; show card capacity → overall only.
4. Split Functions enforcement accordingly; keep atomic full-request queue.
5. Tests for linked/unlinked matrix + enforcement + callouts + stale client rejection paths.
6. ADR + DATA_MODEL updates distinguishing three limits + retired Cap A.

### Combined git

- One development commit (or tightly related commits if review requires split — prefer **one** feature commit + docs) covering both reviewed workstreams.
- Protected PR `development` → `production` only; no direct push; stop with UI merge instructions if agent merge hook blocks.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Focused unit | `npx tsx --test` on new/changed `*.test.ts` (shared, portal, studio, functions) | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Studio typecheck | workspace Studio typecheck (per `11-testing-commands.md` / package scripts) | yes if Studio touched |
| Functions build | `cd functions && npm run build` | yes if Functions touched |
| Portal build | `npm run build:portal` | yes |
| Studio build | `npm run build:studio` | yes if Studio touched |
| Lint | `npm run lint` or eslint on touched files | yes |
| Whitespace | `git diff --check` | yes |
| Rules | `npm run test:rules` | only if Rules touched |

### Manual (after later rollouts — not this pass)

- Owner QA checklists for schedule visibility (single/multi/lifecycle/privacy) and limit matrix (linked 25/25, unlinked 25/30, unlinked 30/20, reduced show capacity).
- Do **not** mark production owner QA passed before App Hosting + real verification.

---

## Human Checkpoints Anticipated

- [x] Later: Functions deploy (schedule callable + limit enforcement)
- [x] Later: Portal App Hosting rollout — phrase provided at end of source pass
- [x] Later: Studio installer if Settings UI ships
- [x] Later: Owner production settings save
- [x] Manual UI QA after rollouts
- [ ] No migration checkpoint (additive resolve)
- [ ] No Stage 2 / domain in this pass

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| N+1 schedule fetches on list | Batch callable + unique show ID fetch |
| Customer enumerates shows | Ownership-bound callables only; no `upcomingShows` Rules open |
| Accidental title leak | Response types omit title; UI tests assert absence |
| Prod sole-`L` until Functions deploy | Additive client fallbacks; document deploy gating |
| Callout mis-attribution | Centralize effectiveRemaining; tests for limiting factor |
| Scope creep into Cap A | Explicit out of scope; Cap A remains non-enforced mirror |

Rollback: revert commit / PR; no data migration to undo.

---

## Open questions

- None blocking. Production numeric “25 vs 30” explained without needing live Firestore read for planning.
- Explicit “CT” in example copy is **not** in current Portal formatter — reuse existing formatter output (may omit “CT”).

---

## Success criteria

- Both acceptance matrices in the owner prompt satisfied in source + automated tests.
- No deployment in this pass.
- Development pushed; protected production PR opened (merged by owner UI if hook blocks).
- Next rollout phrase recorded for Portal App Hosting only after source merge.
