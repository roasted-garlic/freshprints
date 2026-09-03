# Owner QA: Portal Editing request parks current draft

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Goal | `portal-editing-request-parks-current-draft` |
| Environment | `fresh-prints-dev` + local Portal/Studio |
| Result | **FAIL** |

---

## FAIL notes (do not overwrite)

Owner QA after initial DEV deploy recorded **FAIL** with:

1. **Wrong request items temporarily rendered** after ownership switch (Editing PR briefly showed parked draft designs; corrected only after navigation dance).
2. **Incorrect `from=working`** on Editing PR route after pull-from-show (should be Editing return context).
3. **Parked draft remained editable** (no full blocking inactive overlay).
4. **Parked draft shown in Add-request chooser** (“Add to which request?” with Editing + Draft) — violates one-active-editable invariant.
5. **No site-wide Editing mode banner** across authenticated Portal shell.
6. **Requeue Editing → show failed** with Firestore error: `Firestore transactions require all reads to be executed before all writes` (parked-draft restore `get` after allocation writes in `queuePortalPrintRequestToShow`).

---

## Corrective QA section (next Owner QA)

| Field | Value |
|-------|-------|
| Status | **ready for retest** — corrective DEV Functions deployed 2026-09-02 |
| Deployed | `queuePortalPrintRequestToShow`, `convertCustomerPrintRequestToInternal`, `applyShowProductionRecovery`, `onPrintRequestEditingExitRestoreParked`, `deleteEligiblePrintRequest` → `fresh-prints-dev` |
| Corrective Impl Review | `docs/workflow/reviews/2026-09-02-portal-editing-request-parks-current-draft-corrective-implementation-review.md` |
| Checklist | Owner QA retest A–P; hard-reload local Portal first |

### Corrective QA result

**PASS** (2026-09-02) — Owner confirmed after corrective DEV Functions redeploy + Portal reload. Prior FAIL notes above remain historical.

### Post-PASS polish QA

**PASS** (2026-09-02) — Editing tab hide/front, parked overlay theme (no Request Again), queue success `from=working`, cancel-allocation tracking accepted for capacity-safe history.
