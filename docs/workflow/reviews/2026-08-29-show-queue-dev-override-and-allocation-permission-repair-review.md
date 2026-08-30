# Formal Review: Show Queue DEV Override + Allocation Permission Repair

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-29-show-queue-dev-override-and-allocation-permission-repair-plan.md` |
| Verdict | **approved** |
| Owner pre-authorization | **Implement → Test** when no unresolved decisions (per phase prompt) |
| Production | **NOT AUTHORIZED** |

---

## Summary

The plan correctly identifies **Firestore rules full-document allowlist drift** as the root cause of Studio allocation permission failures—not manual show creation. The fix is appropriately narrow (add missing optional fields). The DEV `DEV-OVERRIDE` design uses a new `dev_fixture` source, Admin SDK callable with project gate, and truthful UI labeling without fake Whatnot IDs. Scope excludes Did Not Print recovery UX. **Approved for implementation.**

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Recovery re-queue explicitly out |
| Architecture alignment | pass | Callable for dev-only create; Studio service layer unchanged for allocate |
| Security impact addressed | pass | No customer broadening; project-gated callable |
| Data model impact addressed | pass | New source + optional sentinel; rules parity |
| Backend impact addressed | pass | One new callable; rules allowlist |
| Test strategy adequate | pass | Emulator allocation test + sentinel tests |
| Human checkpoints identified | pass | Firebase DEV deploy gate |
| Roadmap alignment | pass | Prerequisite for recovery testing |
| Documentation plan | pass | DATA_MODEL + ADR |
| No silent scope expansion | pass | WS4 / recovery excluded |

---

## Root cause (confirmed)

| # | Finding | Evidence |
|---|---------|----------|
| 1 | **Rejected operation:** most often **`printRequests` update** (step 3) or **`upcomingShows` update** (step 2), not necessarily `showAllocations` create | `allocatePrintRequestItem` sequential writes; rules validate **merged** doc on update |
| 2 | **Missing print request fields in rules:** `customerUsernameAtCreationSnapshot`, `customerDisplayNameAtCreationSnapshot` | In `printRequest.types.ts`; absent from `printRequestRequiredFieldsValid` (`firestore.rules` ~812–871) |
| 3 | **Missing show fields in rules:** `productionResolutionKind`, `productionResolvedAt`, `productionResolvedBy`, `productionOverrideReason` | Written by Admin recovery callables; absent from `whatnotUpcomingShowFieldsValid` |
| 4 | **Manual vs Whatnot:** same path (`source: "whatnot"`) | `UpcomingShowsPage` upsert; no manual-only branch |
| 5 | **WS3 deploy:** did **not** change `showAllocations` rules | Git history; WS3 deploy added merge collections, not allocation contract |

**WS3 contribution:** **No direct regression** on allocation create rules. Latent allowlist gaps likely exposed as customer requests gained creation snapshots and shows gained recovery metadata.

---

## Architecture review

**Findings:**

- `allocatePrintRequestItem` should remain the single Studio attach path; fix belongs in rules parity, not bypassing rules with callables for normal attach.
- DEV fixture create via **callable + Admin SDK** is correct because Firestore rules cannot gate on GCP project ID.
- Whatnot Show Queue UI must include `dev_fixture` in list filters alongside `whatnot`.

**Required changes:**

- [x] None beyond plan

---

## Security review

**Findings:**

- Staff-only allocation model preserved (`isStaff()` unchanged).
- `dev_fixture` client writes denied in rules; creation only through project-gated callable.
- Sentinel validation fail-closed outside `fresh-prints-dev` dev build.
- No Portal/customer write path changes.

**Human approval needed before production:**

- [x] Firebase DEV deploy (Rules + Functions) after implementation review
- [x] Production deploy remains forbidden

---

## Data model review

**DEV override persistence (approved):**

| Field | Storage |
|-------|---------|
| `source` | `"dev_fixture"` |
| `whatnotShowId` | omitted |
| `whatnotUrl` | omitted |
| `devFixtureSentinel` | `"DEV-OVERRIDE"` |
| Display | `DEV OVERRIDE` / no external link |

**Required changes:**

- [x] Document in DATA_MODEL + ADR during implement

---

## Backend review

**Findings:**

- New callable `upsertDevFixtureShow` with same auth pattern as other staff callables + `GCLOUD_PROJECT` check.
- Rules allowlist updates only; no relaxation of transition guards.

---

## Testing review

**Required tests (implement phase):**

1. `tests/firebase/showQueueAllocation.rules.test.ts` — mirror 3-write attach; staff pass; customer fail; fixtures with creation snapshots + resolution metadata.
2. Sentinel acceptance/rejection tests with dev gate mock.
3. Import plan excludes `dev_fixture`.

---

## Binding decisions (from owner prompt — incorporated)

1. Exact sentinel: `DEV-OVERRIDE` (trimmed only).
2. DEV gate: `fresh-prints-dev` + dev build pattern.
3. No fake Whatnot Show ID.
4. Display `DEV OVERRIDE` in show detail.
5. Narrow rules fix; no broad staff bypass.
6. Did Not Print recovery **out of scope**.
7. Stop before Firebase DEV deploy without owner approval.

---

## Verdict rationale

No unresolved product or security decisions remain. Root cause is proven allowlist drift with a narrow, testable fix. DEV override design is production-safe via callable gating. Owner pre-authorized **Implement → Test** contingent on this review.

---

## Next step

1. **Implement** approved scope.
2. **Implementation review** with exact DEV deploy scope.
3. **STOP** for owner Firebase DEV deploy approval.
4. **Test** + owner manual DEV QA checklist.
5. **Signoff** — then resume WS4 DEV QA separately.

---

## Owner manual DEV QA checklist (post-deploy)

1. Create show with `DEV-OVERRIDE` on `fresh-prints-dev`.
2. Confirm detail shows **DEV OVERRIDE** and no external link.
3. Attach Customer Print Request — no permission error.
4. Attach Internal Print Request if supported on surface.
5. Confirm capacity increments/decrements on remove.
6. Repeat attach on normal Whatnot-backed show.
7. Split allocation smoke (if quick) unchanged.

Reply: **PASS** / **FAIL: …** / **PASS WITH NOTES: …**
