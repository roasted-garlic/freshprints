# Formal Review — Show Queue Needs Attention Did Not Print Re-queue Recovery

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Plan | `docs/workflow/plans/2026-08-29-show-queue-needs-attention-did-not-print-recovery-plan.md` |
| Reviewer | Review Agent (+ Security / Architecture perspectives) |
| Verdict | **approved_with_changes** |

---

## Verdict summary

The plan correctly extends the existing ADR-FP-149 trusted recovery boundary rather than introducing client-side allocation writes. Binding product direction is fully reflected. **Implementation may proceed** after the minor plan clarifications listed in [Required plan updates](#required-plan-updates) are incorporated (can be done inline during implement without re-review if scope unchanged).

Production remains **NOT AUTHORIZED**. WS4 remains **paused**.

---

## Review checklist (33 challenge areas)

| # | Topic | Assessment |
|---|-------|------------|
| 1 | Authoritative unprinted quantity | **Pass** — finishable-only rows on source show; shared pure helper; excludes printed/done |
| 2 | Split allocation correctness | **Pass** — per-allocation row move; other-show rows untouched |
| 3 | Printed quantity duplication risk | **Pass** — printed/done excluded from requeue set |
| 4 | Source allocation history | **Pass** — cancel + new docs; no showId rewrite |
| 5 | Destination allocation creation | **Pass** — clone snapshots; normal allocate status |
| 6 | Source DID NOT PRINT terminal | **Pass** — `unfulfilled_requeue` completes source; distinct from fulfilled |
| 7 | Target capacity | **Pass** — preview projection + apply revalidation |
| 8 | Target eligibility | **Pass** — reuses `isPrintRequestShowTransferDestination` |
| 9 | Bulk operation limits | **Pass with note** — 400-write transaction cap; preview blocker if exceeded |
| 10 | Atomicity | **Pass** — single transaction primary; job fallback documented if needed |
| 11 | Resumability | **Pass** — idempotency doc pattern if job path needed (v1 likely unnecessary) |
| 12 | Idempotency | **Pass** — previewChecksum + terminal guard + optional apply doc |
| 13 | Retry safety | **Pass** — checksum mismatch → blocked |
| 14 | Concurrency | **Pass** — apply re-read + checksum |
| 15 | Duplicate allocation prevention | **Pass** — idempotent apply record |
| 16 | Request status reconciliation | **Pass** — active + Queued after move; no spurious editing |
| 17 | Portal continuability invariant | **Pass** — ADR-FP-071 preserved on release; bypassed on requeue |
| 18 | Multiple released CRs per customer | **Pass** — each request marked independently |
| 19 | Internal Request behavior | **Pass** — separate continuability path documented |
| 20 | Needs Re-queue persistence | **Pass** — explicit printRequests fields proposed |
| 21 | Needs Re-queue clearing | **Pass** — allocate / archive / fulfill rules |
| 22 | Working filter implementation | **Pass** — extend `printRequestWorkingTriage.ts` |
| 23 | Normal Add to Show recovery | **Pass** — reuses existing engine; clears marker |
| 24 | Manual show parity | **Pass** — same eligibility helpers |
| 25 | Whatnot show parity | **Pass** — unchanged paths + new requeue on whatnot source |
| 26 | dev_fixture parity | **Pass** — destination eligible; excluded from import |
| 27 | CR→IR safety | **Pass** — block converted requests |
| 28 | Request-content immutability | **Pass** — allocation-only mutations |
| 29 | Security / staff authorization | **Pass** — extend existing callables; rules deny customer writes |
| 30 | Rules/index requirements | **Pass** — rules yes; indexes deferred (client triage v1) |
| 31 | Audit/history compatibility | **Pass** — optional lineage field; WS4-safe |
| 32 | Extend existing callables | **Pass** — preferred over new callable |
| 33 | New Function required? | **No** — extend preview/apply only |

---

## Architecture alignment

- Layering preserved: Studio → service → Functions → Firestore.
- No UI-only security boundaries.
- Reuses Show Queue failsafe architecture (ADR-FP-149) and DEV fixture lifecycle (ADR-FP-155).

---

## Security review

- Staff-only callables; checksum prevents tampered apply payloads.
- New persisted fields must be allowlisted in `firestore.rules` with staff-only writes.
- Customer cannot invoke requeue or set `needsStaffRequeue*`.
- No weakening of production rules.

---

## Data model review

- New optional fields are backward compatible.
- Recommend adding `requeuedFromAllocationId?: string` on `showAllocations` in v1 for audit (optional but low cost).
- ADR-FP-156 draft during implement.

---

## Test strategy review

Adequate unit + emulator + manual DEV fixture matrix. Add one rules test file for requeue field allowlists.

---

## Required plan updates

Minor — implement agent may apply without re-review:

1. **Mixed source show edge case:** If source has both finishable and printed/done allocations, plan must state: complete source as DID NOT PRINT while leaving printed/done rows historical; only finishable rows requeue. If finishable qty = 0 but active printed rows exist, block requeue (use Mark Fulfilled instead).
2. **Transaction threshold:** Implement with constant `SHOW_REQUEUE_MAX_TRANSACTION_ALLOCATIONS` (default 150) and preview blocker.
3. **Index follow-up:** If Working Needs Re-queue filter is slow at scale, follow-up task to persist `needsStaffRequeueAt` index — not v1 blocker.

---

## [NEEDS OWNER DECISION]

**None blocking.** Binding product decisions are already recorded in the plan.

Optional implement-time confirmation (not blocking review):

- Whether v1 requires `requeuedFromAllocationId` on new allocations for audit (recommended yes; default implement yes).

---

## Approval

| Gate | Status |
|------|--------|
| Scope bounded | Yes |
| Architecture | Aligned |
| Security | Acceptable with rules updates |
| Data model | Acceptable |
| Tests | Adequate |
| Human checkpoints | Identified |
| Production | Correctly excluded |

**Verdict: approved_with_changes** — proceed to Implement after owner acknowledges plan (standard managed-phase gate).

---

## Next step

Owner approves plan → Implementation phase → Test → DEV deploy checkpoint → Owner QA → Signoff.

Do **not** start Did Not Print move-to-show implementation until owner explicitly approves this plan.
