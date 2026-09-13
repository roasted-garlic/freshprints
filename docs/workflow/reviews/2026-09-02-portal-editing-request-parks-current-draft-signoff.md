# Signoff: Portal Editing request parks current draft

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-09-02-portal-editing-request-parks-current-draft-plan.md` |
| Review | `docs/workflow/reviews/2026-09-02-portal-editing-request-parks-current-draft-review.md` |
| Implementation reviews | `docs/workflow/reviews/2026-09-02-portal-editing-request-parks-current-draft-implementation-review.md`; corrective `…-corrective-implementation-review.md` |
| Owner QA | `docs/workflow/reviews/2026-09-02-portal-editing-request-parks-current-draft-owner-qa.md` |
| Final status | **approved_with_notes** |

---

## Summary

Portal Continuable parking is live on `fresh-prints-dev`: when a customer PR enters Editing, a meaningful Working draft is parked (status stays `draft`); empty drafts are archived in the park TX; Editing owns Current Request until re-queue/terminal exit. Corrective pass fixed UI rebinding, `from=` navigation, parked field mapping/overlay, Add targeting, site-wide Editing strip, and requeue TX read-before-write. Post-PASS polish: hide empty Editing tab / front when present; themed parked overlay without Request Again; queue success lands with `from=working`. Owner corrective QA **PASS**; final polish **PASS**. Production **NOT AUTHORIZED**.

---

## Changes Delivered

### Behavior
- Park meaningful draft behind active Editing Continuable; empty draft archived in park TX
- Editing owns Current Request; parked Working visible but locked (OD-1)
- Clear items while Editing does **not** restore parked draft (OD-3)
- Studio customer remove-from-show uses trusted TX callable (hard-delete allocations + park)
- Portal unqueue cancels allocations (retain history) + park; capacity math excludes canceled
- Queue / convert / recovery restore parked draft (reads before writes)
- Portal UX: site-wide Editing strip; detail explanation; parked overlay; Editing tab hide/front

### Key surfaces
- Shared: `portalActiveEditablePrintRequest`, parking helpers, list-tab visibility helper
- Functions: park/restore lib; Portal unqueue; Studio unqueue; queue/convert/recovery/delete restore paths; safety trigger
- Portal: context resolver, map parking fields, banners, overlay, Add/upload targeting, tab strip, `from=` after unqueue/queue
- Studio: customer remove → `unqueueStudioCustomerPrintRequestFromShow`
- Docs: ADR-FP-071 amend; ADR-FP-158 tab-strip amendment; DATA_MODEL parking fields

---

## Tests

### Automated
- Focused shared parking/editability/unqueue/recovery + list-tab visibility: **PASS**
- Functions build: **PASS**
- Portal typecheck: pre-existing `interactiveEnhance*` only (unchanged)
- Rules suite: not re-run locally (no Java); Rules unchanged in corrective pass

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Initial Owner QA (A–P) | **FAIL** (preserved) | Owner |
| Corrective Owner QA after DEV Functions redeploy | **PASS** | Owner |
| Post-PASS polish (tab strip, overlay theme, `from=working` on requeue) | **PASS** | Owner |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | **not authorized** | 2026-09-02 | DEV only |
| Database migration | N/A | | None |
| Design / UX | obtained | 2026-09-02 | Banner/overlay/tab polish via Owner iteration |
| Business / policy | obtained | 2026-09-02 | OD-1…3; keep Portal cancel allocations for tracking |
| Secrets / env | N/A | | None |
| Corrective DEV Functions redeploy | obtained | 2026-09-02 | 5 Functions to `fresh-prints-dev` |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Occasional false queue capacity / “only a few designs” | medium | Canceled rows correctly excluded; if recurs, chase denormalized `allocatedQuantity` / cache drift — not cancel retention |
| Portal cancel vs Studio hard-delete on remove | low | Documented intentional; canceled rows ignored by capacity |
| Working tree uncommitted | low | Commit/push only when Owner asks |
| Production promote | high if rushed | Explicit inventory later; **NOT AUTHORIZED** now |

---

## Deferred Items (Roadmap)
- Production promotion inventory (Functions + Rules + Portal + Studio + shared)
- Lightbox (explicitly out of this goal)
- Smart Profiling remains **PARKED**
- Optional: hide canceled allocation rows in Studio show queue UI (data retained)

---

## Open Blockers
- [x] None for DEV closeout

---

## Verdict

**approved_with_notes** — Goal complete on DEV with Owner corrective + polish PASS. Notes: Production not authorized; keep Portal allocation cancel for tracking; watch capacity drift if false limits return.

---

## Known signoff notes (preserve)

1. Production is **NOT AUTHORIZED**.
2. Portal remove/unqueue retains **canceled** allocations for tracking.
3. Studio remove may **hard-delete** according to the approved contract.
4. Canceled allocations are **excluded** from capacity.
5. If the occasional false capacity / “only a few designs” symptom recurs, investigate denormalized `allocatedQuantity` / cache drift rather than removing canceled-allocation retention.
6. Lightbox remains **out of scope** for this goal (queued separately).

---

## Later coordinated production-promotion inventory (DO NOT deploy now)

| Area | Inventory |
|------|-----------|
| **Shared** | Active editable resolution; parking semantics; list-tab visibility (`getVisiblePortalPrintRequestListTabs`) |
| **Functions** | Park/restore helpers; `unqueuePortalPrintRequestFromShow`; `unqueueStudioCustomerPrintRequestFromShow`; `queuePortalPrintRequestToShow`; mutation/upload consumers; `convertCustomerPrintRequestToInternal`; recovery requeue/release; `deleteEligiblePrintRequest`; `onPrintRequestEditingExitRestoreParked`; related working-request resolve |
| **Firestore Rules** | Parking fields allowlist; parked item create/mutate deny |
| **Portal** | Editing owns Current Request; editable Editing PR; site-wide strip; parked overlay; Add/upload targeting; mapping/state rebinding; `from=` fixes; Editing tab hide/front |
| **Studio** | Trusted customer remove-from-show callable path |
| **ADR / data model** | ADR-FP-071 amendment; ADR-FP-158 preservation + Portal tab-strip amendment; parking fields in DATA_MODEL |
| **Indexes** | **NONE** |
| **Storage Rules** | **NONE** |
| **Migration** | **NONE** expected |

---

## Workflow Complete
- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `RISK_REGISTER.md` updated if needed (skip — capacity drift already known pattern; note in signoff only)
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated when present

**Recommended next action for user:** Closeout commit + push to `development` complete when Owner authorizes. Production remain unauthorized. Next queued: `cross-app-lightbox-previous-next-navigation` (do not auto-start).
