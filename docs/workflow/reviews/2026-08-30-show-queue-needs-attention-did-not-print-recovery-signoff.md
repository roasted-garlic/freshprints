# Signoff: Show Queue Needs Attention Did Not Print Re-queue Recovery

| Field | Value |
|-------|-------|
| Date | 2026-08-30 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-08-29-show-queue-needs-attention-did-not-print-recovery-plan.md` |
| Review | `docs/workflow/reviews/2026-08-29-show-queue-needs-attention-did-not-print-recovery-review.md` |
| Implementation review | `docs/workflow/reviews/2026-08-29-show-queue-needs-attention-did-not-print-recovery-implementation-review.md` |
| Test report | `docs/workflow/reviews/2026-08-30-show-queue-needs-attention-did-not-print-recovery-test-report.md` |
| Final status | **approved** |

---

## Summary

Closed Phase 7 Show Queue goal delivering **Did Not Print** bulk requeue recovery, **Release-only** staff re-queue triage, and DEV fixture / allocation permission prerequisites on `fresh-prints-dev`. Owner DEV QA **PASS** confirms primary Move path, secondary Release-only path, DEV fixture lifecycle, allocation permission repair, and scoped Owner Edit Show QA enabler.

**Production remains NOT AUTHORIZED.** This signoff is DEV acceptance only.

---

## Corrective history preserved (regression context)

1. Firestore allocation writes initially failed because existing documents contained legitimate optional fields missing from full-document Rules allowlists.
2. `DEV-OVERRIDE` / `source: dev_fixture` was added so Show Queue lifecycle testing could occur without real Whatnot external identity.
3. `dev_fixture` initially skipped Needs Attention because classification and recovery logic assumed `source === "whatnot"`.
4. Recovery/classification was corrected to use Show Queue surface eligibility while keeping `dev_fixture` excluded from Whatnot synchronization.
5. Initial requeue Preview falsely reported split allocation because planned destination rows were counted as pre-existing other-show allocations.
6. Split detection was corrected to inspect persisted pre-destination allocation state.
7. Requeue Apply initially failed because the Admin SDK received undefined values from a client-oriented requeue-marker clearing helper.
8. Admin-safe `FieldValue.delete()` handling was added for server transaction updates.
9. Successful requeue now provides concise green success feedback.
10. **Owner Edit Show** was enabled as a DEV QA enabler so fixture schedule times could be adjusted without repeatedly recreating shows (scoped to this Show Queue work; do not silently widen scope).

---

## Owner QA acceptance (PASS)

### Primary Did Not Print recovery

Needs Attention → Did Not Print → Move unprinted requests to another show — verified:

- Eligible destination show selection
- Exact unprinted quantity Preview
- No false split-allocation warning for ordinary single-show requests
- Apply succeeds; source show resolves Past / DID NOT PRINT
- Source allocation remains historical and canceled; destination allocation created
- `requeuedFromAllocationId` lineage works
- Print Request remains/reconciles active + Queued
- Destination capacity updates correctly; no duplicate allocation/quantity
- Successful move does not leave stale Needs Re-queue state
- Success banner displays after successful move

### Secondary recovery

Needs Attention → Did Not Print → Release only — verified:

- Released work receives Needs Re-queue staff recovery state
- Released Customer Request does not become a second Portal-continuable editing request when another draft/editing request exists
- Working triage includes Needs Re-queue as **rightmost** filter: Active · Stale · Empty · All · Needs Re-queue
- NEEDS RE-QUEUE badge/context works; normal Add to Show recovers; marker clears after reallocation
- Customer's existing draft/editing request remains untouched

### DEV fixture lifecycle

- DEV-OVERRIDE fixtures creatable; support allocations
- Unresolved fixtures transition Upcoming → Needs Attention (not incorrectly skip to terminal Past)
- Recovery callables accept `dev_fixture`; excluded from real Whatnot import/sync

### Allocation permission repair

- Authorized Studio staff can attach Print Requests
- Manual / Whatnot / DEV fixture allocation paths work per supported behavior
- Narrow Firestore allowlists remain; customer permissions not broadened

### Owner Edit Show QA enabler (scoped)

- Owner-only Edit show on eligible Whatnot / DEV fixture shows (Admin/helper do not)
- Editable: title, scheduled date/time, notes, Whatnot URL (Whatnot shows only; same Show ID preserved)
- DEV fixture cannot change Whatnot identity; Internal Gang Sheets excluded
- Schedule changes affect Upcoming / Needs Attention classification; allocations/production state unchanged by metadata edit
- Saving… guard; narrow owner-only Firestore metadata path on DEV

---

## Changes Delivered

### Behavior

- `requeue_unfulfilled` recovery action with server preview checksum + transactional apply
- `release_unfulfilled` sets `needsStaffRequeue*` metadata; Working triage `needs_requeue`
- `requeuedFromAllocationId` destination lineage (ADR-FP-156)
- Source show `productionResolutionKind: unfulfilled_requeue` (Did Not Print)
- Owner-only Edit show metadata path (QA enabler, not separate managed goal)

### Documentation Updated

- ADR-FP-156 finalized in `docs/project/DECISIONS.md`
- Plan, formal review, implementation review, test report, this signoff
- `.cursor/workflow/state.md`, `docs/project/ROADMAP.md`

---

## Tests

### Automated

See test report. Focused recovery suite **92/92 pass**; scoped Rules **18/18 pass**. Full global `npm run test:rules` **not claimed passing** (pre-existing expression-budget failures in unrelated suites at Owner Edit Show checkpoint).

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Primary requeue path | **PASS** | owner |
| Secondary Release-only + Needs Re-queue | **PASS** | owner |
| DEV fixture lifecycle | **PASS** | owner |
| Allocation permissions | **PASS** | owner |
| Owner Edit Show enabler | **PASS** | owner |
| Production untouched | **PASS** | owner |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| DEV deploy (recovery callables + rules) | obtained | 2026-08-29 | Owner approved |
| Owner Edit Show rules deploy | obtained | 2026-08-29 | Scoped QA enabler |
| Owner DEV QA (full recovery workflow) | obtained | 2026-08-30 | **PASS** |
| Production deploy | not required | | **NOT AUTHORIZED** |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Global Rules expression-budget failures | medium | Unrelated suites; track in TECH_DEBT; not blocking this DEV signoff |
| Owner Edit Show is DEV QA enabler only | low | Do not promote to production without separate reviewed scope |
| Rules allowlist drift | medium | Scoped emulator tests + reconciliation deploy artifacts |

---

## Deferred Items (Roadmap)

- **Next active:** `customer-account-identity-management-ws4-customer-activity-and-deep-linking` — resume Owner DEV QA
- Coordinated production promotion for identity + Show Queue phases — deferred
- Smart Profiling — **not started** (owner must explicitly authorize)

---

## Open Blockers

- [x] None

---

## Verdict

**approved** — Owner DEV QA **PASS** for complete Did Not Print recovery workflow on `fresh-prints-dev`. Corrective history preserved. Production untouched.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes` for this goal
- [x] `ROADMAP.md` updated
- [x] ADR-FP-156 finalized
- [ ] `references/project-chatgpt-handoff/` — **absent from repo** (skipped per policy)

**Recommended next action:** Resume WS4 Owner DEV QA (`customer-account-identity-management-ws4-customer-activity-and-deep-linking`).
