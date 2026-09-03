# Signoff: Customer-specific temporary Print Request + Show quota override

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Signoff by | Signoff Agent |
| Goal | `customer-specific-temporary-print-request-and-show-quota-override` |
| Plan | `docs/workflow/plans/2026-09-02-customer-specific-temporary-print-request-and-show-quota-override-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-02-customer-specific-temporary-print-request-and-show-quota-override-review.md` (**approved_with_changes**) |
| Test report | `docs/workflow/reviews/2026-09-02-customer-specific-temporary-print-request-and-show-quota-override-test-report.md` (**passed_with_notes**) |
| Implementation Review | `docs/workflow/reviews/2026-09-02-customer-specific-temporary-print-request-and-show-quota-override-implementation-review.md` (**approved_with_notes**) |
| Linked UX Implementation Review | `docs/workflow/reviews/2026-09-02-customer-specific-temporary-print-request-and-show-quota-override-linked-ux-implementation-review.md` (**approved_with_notes**) |
| DEV deploy record | `docs/workflow/reviews/2026-09-02-customer-specific-temporary-print-request-and-show-quota-override-dev-deploy-record.md` |
| Owner QA | **PASS** (full A–Q including linked UX + Internal Save corrective) |
| Final DEV status | **APPROVED** |
| Final signoff status | **approved** |
| Production | **NOT AUTHORIZED** |
| Baseline HEAD (goal start) | `c050a0bfd02f53098e6c36697381a7657b661c5a` |
| Commit/push | **not performed** — Owner must authorize separately |

---

## Summary

Owner-authorized temporary per-customer Print Request and/or Customer Show Portal quota overrides on `customers/{id}.printRequestQuotaOverride`, with shared effective-limit resolver, owner-only callable, Rules immutability, Portal enforcement on six consumer Functions, Studio Edit Customer → Quota Override (linked default + Set independently), Users-list active badge, and activity audit events. Cap A remains retired; staff/Show Move/DNP bypass and parking/ADR-FP-071 preserved. DEV deployed to `fresh-prints-dev` (Rules + 7 Functions, then corrective redeploy of `updateCustomerPrintRequestQuotaOverride` for Internal Save metadata omit-undefined). Owner QA **PASS**. Production **NOT AUTHORIZED**.

---

## Owner QA record

| Result | **PASS** |
|--------|----------|
| Date | 2026-09-02 |
| Scope | Full quota-override checklist A–Q, including linked-quota Studio UX polish and Internal Save metadata correction |
| Environment | `fresh-prints-dev` + local Studio/Portal |

Owner accepted the final product contract (global fallback, independent stored dimensions, linked Studio editing convenience, expiration-by-clock, owner-only mutation, Portal effective enforcement, staff bypass, no Cap A revival).

---

## Changes Delivered

### Behavior
- Additive optional `customers/{id}.printRequestQuotaOverride` (independent nullable PR/Show ints, optional `expiresAt`, audit fields)
- Effective limits: active override dimension ?? **current** global; expired inactive by clock (no scheduler)
- Owner-only callable `updateCustomerPrintRequestQuotaOverride`; Rules deny client/staff direct write of override
- Portal PR/Show quota consumers use `loadEffectivePrintRequestLimitsForCustomer`
- Studio: **Users → Edit customer → Quota Override** — default **linked** Temporary quota (both dimensions); **Set independently** for unequal/PR-only/Show-only; Users badge when clock-active
- Clear / Use global; expiration alone cannot create active override
- Activity: `account.quota_override_set` / `account.quota_override_cleared`
- Internal Save fix: omit `metadata.expiresAtMs` when unset (Firestore rejects `undefined`)

### Files Created (representative)
- Shared: `printRequestQuotaOverride.ts` (+ tests), types, update request types
- Functions: `updateCustomerPrintRequestQuotaOverride.ts`, `lib/loadEffectivePrintRequestLimits.ts`, contracts
- Studio: `CustomerQuotaOverrideSection.tsx`, `customerQuotaOverrideEditMode.ts` (+ tests), service, contracts
- Portal: working-request limit contract test
- Workflow: plan, reviews, test report, deploy record, linked-ux review, this signoff

### Files Modified (representative)
- Functions: six Portal quota consumers + `index.ts`
- `firestore.rules` (customer override allowlist / immutability)
- Studio Users page/table/Edit modal/permissions/CSS; customer activity audit types
- Portal `usePortalWorkingRequestLimitState` + profile hydration
- Docs: DATA_MODEL, BACKEND, DECISIONS (ADR-FP-159), ROADMAP, workflow state, handoff

### Documentation Updated
- `.cursor/workflow/state.md`
- `docs/project/ROADMAP.md`
- `docs/project/DECISIONS.md` (ADR-FP-159)
- `docs/architecture/DATA_MODEL.md` / `BACKEND.md` (already during implement; signoff closeout)
- `references/project-chatgpt-handoff/*` (CURRENT-STATE, NEXT-PLANNED, 13-recent, 03–07, 12 as needed)

---

## Tests

### Automated (honest history)

| Run | Result |
|-----|--------|
| Initial focused implementation | **32/32 PASS** |
| Post-review / pre-deploy rerun | **33/33 PASS** |
| Linked UX + Internal corrective focused | **17/17 PASS** |
| Functions build | **exit 0** |
| Touched ESLint | **exit 0** |
| Studio/Portal typecheck | Pre-existing unrelated failures only; no goal-path failures |

### Manual (Owner QA)

| Test | Result | Approved by |
|------|--------|-------------|
| A–Q full checklist (incl. linked UX B/D/E/F/H + Internal Save) | **PASS** | Owner |

Overall Owner QA: **PASS**

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| DEV Functions + Rules deploy | **obtained** | 2026-09-02 | `fresh-prints-dev` allowlist |
| Corrective callable redeploy | **obtained** (via Internal fix request) | 2026-09-02 | `updateCustomerPrintRequestQuotaOverride` only |
| Owner QA / UX | **obtained** | 2026-09-02 | **PASS** |
| Production deploy | **not obtained** | | **NOT AUTHORIZED** |
| Database migration | N/A | | None |
| Storage / indexes | N/A | | Not deployed |
| Commit / push | **not obtained** | | Working tree remains dirty until Owner authorizes |

---

## Final DEV deploy inventory

### Firestore Rules
Deployed to **fresh-prints-dev** (customer `printRequestQuotaOverride` allowlist + immutability).

### Functions — initial allowlist
1. `updateCustomerPrintRequestQuotaOverride` (create)
2. `addPortalCatalogDesignToPrintRequest`
3. `confirmCustomerUploadsAndAttachToRequest`
4. `duplicatePortalPrintRequestItem`
5. `updatePortalPrintRequestItemQuantity`
6. `customerAddAssistedApprovedProofToPrintRequest`
7. `queuePortalPrintRequestToShow`

### Functions — corrective redeploy
- `updateCustomerPrintRequestQuotaOverride` (metadata omit-undefined Internal Save fix)

Final DEV runtime includes the **post-QA corrected** callable version.

### Not deployed
| Area | Status |
|------|--------|
| Storage Rules | **NO** |
| Indexes | **NO** |
| Migration | **NO** |
| Production | **NO** |
| Portal App Hosting | **NO** |
| Studio publish | **NO** |

---

## Production promotion inventory (future — not now)

| Surface | Promote later? |
|---------|----------------|
| Shared | **YES** |
| Studio | **YES** |
| Portal | **YES** |
| Functions | **YES** (same 7 + **must** include post-corrective `updateCustomerPrintRequestQuotaOverride`) |
| Firestore Rules | **YES** |
| Storage Rules | **NO** |
| Indexes | **NO** |
| Migration | **NO** |

Production remains **NOT AUTHORIZED**.

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Working tree uncommitted | low | Owner authorize commit/push separately |
| Production promote must use corrective callable | medium | Inventory note above; do not promote pre-fix bundle |
| Studio/Portal full tsc debt | low | Pre-existing; out of scope |
| Node 20 / firebase-functions deprecation warnings on deploy | low | Track separately |

---

## Deferred Items (Roadmap)

- Production coordinated promotion (quota-override inventory)
- Smart Profiling — **PARKED**
- `show-queue-batch-allocation-performance` — **DEFERRED**

---

## Open Blockers

- [x] None for DEV signoff

---

## Verdict

**approved** — Implementation + linked UX polish + Internal Save corrective verified on `fresh-prints-dev`; Owner QA **PASS**; final DEV **APPROVED**. Production **NOT AUTHORIZED**.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes` / FreshForge **IDLE**
- [x] `ROADMAP.md` updated
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/NEXT-PLANNED-GOAL.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] Handoff 03–07 / 12 updated for shipped DEV behavior / ADR-FP-159
- [x] ADR-FP-159 status closed for DEV

**Recommended next action for user:** Authorize commit/push when ready; later coordinated production promote using inventory above (include corrective callable). Do not auto-start Smart Profiling or batch-allocation.
