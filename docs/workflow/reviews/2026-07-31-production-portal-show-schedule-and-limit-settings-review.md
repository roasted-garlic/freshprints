# Review: Portal show-schedule visibility + independent limit settings

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Reviewer | Review Agent (independent of Planning Agent) |
| Plan | `docs/workflow/plans/2026-07-31-production-portal-show-schedule-and-limit-settings-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

The plan is repository-grounded, correctly identifies that customers cannot read `upcomingShows`, and correctly prefers extending the existing ownership-bounded `getPortalShowPrintProgress` path plus a capped batch schedule callable rather than Rules relaxation or denormalization. The limit workstream correctly concludes that production “30” is sole `L` (`maxQuantityPerShowPerCustomer`) and request “25” is cart quantity — splitting settings is additive and migration-free. Proceed after incorporating the required changes below.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Two coordinated workstreams; deploys explicitly out |
| Architecture alignment | pass | Services/callables; no UI→Firestore show reads |
| Security impact addressed | pass | Ownership-bound projections; no title exposure |
| Data model impact addressed | pass | Additive settings fields; resolve fallbacks |
| Backend impact addressed | pass | Functions source + later deploy gate |
| Test strategy adequate | pass | Matches owner matrix; commands from handoff |
| Human checkpoints identified | pass | Functions/Portal/Studio/settings/Stage 2 gated |
| Roadmap alignment | pass | Goal #13 prelaunch; prior PASSes untouched |
| Documentation plan | pass | ADR + DATA_MODEL + workflow artifacts |
| No silent scope expansion | pass | Cap A / Stage 2 / domain excluded |

---

## Architecture Review

**Findings:**
- Batch schedule callable is required for My Print Requests; per-card `getPortalShowPrintProgress` would be N+1 — plan already rejects that.
- Reusing `formatShowDateTimeLabel` matches “do not invent timezone behavior.” Example copy with “CT” is illustrative only.
- Limit split must keep overall `maxTotalQuantity` on shows independent — plan states this.

**Required changes:**
- [x] Cap `printRequestIds` explicitly in the plan/implement notes (e.g. ≤ 50 or the existing Portal list page upper bound — pick one constant in shared code and test it).
- [x] Batch response must not require the client to send raw `upcomingShowIds` as the sole authority; derive/validate show IDs from server-side allocations for owned requests (client may hint IDs only as optional optimization, never trust without ownership proof).

---

## Security Review

**Findings:**
- `upcomingShows` staff-only Rules must stay unchanged — plan agrees.
- Extending progress callable with `scheduledStartAt` is safe if title/Whatnot/capacity remain omitted.
- Settings writes remain owner callable; signed-in read of `printRequestLimits` already allowed.

**Required changes:**
- [x] Implementation Review must include an explicit “rendered output never contains title / whatnotShowId / allocation id” test assertion list (plan mentions; do not skip).
- [x] None for Rules unless implement proves a schema allowlist gap — default **no Rules change**.

**Human approval needed before production:**
- [x] Functions deploy (separate phrase)
- [x] Portal App Hosting rollout (phrase after source merge)
- [x] Studio installer if Settings UI ships
- [x] Owner settings save in production

---

## Data Model Review

**Findings:**
- Additive fields + linked fallback are correct; no migration checkpoint.
- Field naming: keep `maxQuantityPerShowPerCustomer` as customer-show limit; add `maxQuantityPerPrintRequest` + `linkPrintRequestAndCustomerShowLimits`.

**Required changes:**
- [x] When linked, both persisted numeric fields must be equal on every successful save (not merely UI-mirrored).
- [x] ADR must supersede ADR-FP-102 “sole L” for the dual-limit product rule while preserving atomic full-request queue and ADR-FP-122 multi-request accumulation against the **customer-show** limit.

---

## Backend Review

**Findings:**
- Working-request max callables and queue customer cap must diverge when unlinked — plan lists the right files.
- Until Functions deploy, production continues sole-`L` behavior — acceptable for source-only pass.

**Required changes:**
- [x] Document in implement checkpoint which Functions must be deployed later for each workstream (schedule vs limits) as separate checklist lines.
- [x] Stale Portal clients must still receive authoritative server rejection with current limits when unlinked values differ.

---

## UI / UX Review

**Findings:**
- Card: earliest + `+ N more`; detail: full list — clear.
- No schedule line when no positive allocation — clear.
- Studio checkbox behavior matches owner prompt.

**Required changes:**
- [x] Progress badge (`getPrintRequestProgressLabel`) must remain unchanged; schedule is an **additional** line/section, not a replacement status chip.
- [x] Do not render internal `showId` in customer-visible copy (including fallback).

---

## Testing Review

**Findings:**
- Owner’s failing-before/passing-after lists are adequate.
- Include regression coverage for `derivePrintRequestQueueState` / card loading when wiring list batch.

**Required changes:**
- [x] Add at least one test that linked mode with equal values preserves pre-change enforcement behavior (sole-`L` compatibility).

---

## Required changes before / during implement

1. Bound batch `printRequestIds` with a named shared constant + test.
2. Server derives/validates show IDs from owned allocations (do not trust client-only show ID lists).
3. Persist equal numerics whenever link checkbox is checked on save.
4. Keep progress status chip/label behavior unchanged; schedule is additive UI.
5. ADR supersession text + later deploy checklist in implement checkpoint.
6. Linked equal-value compatibility test.

---

## Verdict rationale

**approved_with_changes** — safe to implement while incorporating the required changes above. Not blocked: no migration, no unclear product decision, no broad show enumeration, no destructive production action in this pass.
