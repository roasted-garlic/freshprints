# Formal Review: Amendment 9 — Large-batch Firestore read amplification

| Field | Value |
|---|---|
| Date | 2026-08-06 |
| Plan | `docs/workflow/plans/2026-08-06-post-launch-catalog-and-processing-stability-amendment-9-plan.md` |
| Incident | `docs/workflow/reviews/2026-08-06-large-batch-firestore-read-amplification-incident.md` |
| Branch | `fix/post-launch-catalog-and-processing-stability` @ `4a0c039…` |
| Reviewer posture | Independent, adversarial; source spot-checked |
| Pass | Plan → review → **required Plan corrections applied** → re-review |

---

## Verdict

**APPROVED WITH REQUIRED CHANGES** (all required changes **applied to the Plan** in the same planning pass).

**No unresolved implementation-relevant planning blocker remains.**

Implement is still **not** started and still requires a later **explicit owner Implement approval**. This verdict only clears the Plan for that future Implement gate (P0 scope).

---

## Challenge results (17)

| # | Challenge | Result | Notes |
|---|---|---|---|
| 1 | A/B improperly combined | **PASS** | Kept separate; no 7.1K−2,495 subtraction |
| 2 | Tracer as billing truth | **PASS** | Disclaimer + undercount of write-path `getDoc` documented |
| 3 | O(n²) / shrinking list proven | **PASS** | Sequence `44…0` sum 990 = triangular; source `reloadDesigns` |
| 4 | Count-query billing | **PASS** | `getCountFromServer`; approx min-1; not treated as list-size docs |
| 5 | Client vs Function reads mixed | **PASS** | Separated; Functions modeled only |
| 6 | Index-entry charges | **PASS** | Explicitly excluded from Debug; unknown in Console |
| 7 | Deletion-triggered work | **PASS** | Checklist + classifier notes; not asserted as measured |
| 8 | Snapshots blamed without logs | **PASS** | Modeled; not sole cause; Phase 1B not substitute for P0 |
| 9 | AI taxonomy autoscaling | **PASS** | 1..N instance model included |
| 10 | Local reconcile staleness | **PASS after Plan edit** | Inbound drift under K=∞ explicit; recovery table locked |
| 11 | Concurrent staff safety | **PASS after Plan edit** | Honest LWW + archived guards; no false etag claim |
| 12 | Full tag loading | **PASS** | Consumer traced; ACCEPTABLE once/session |
| 13 | Cache recreates snapshots | **PASS** | Shared Storage taxonomy flagged as architecture decision |
| 14 | Phase 1B as complete fix | **PASS** | Explicit WILL NOT ADDRESS for client AI Review |
| 15 | Read budgets measurable | **PASS after Plan edit** | P0 gates = list 0 + count 0; authority ≤2/≤3 provisional |
| 16 | Protected features | **PASS after Plan edit** | Processing `onQueueChanged` preservation + tests required |
| 17 | Narrow implement / rollback | **PASS after Plan edit** | First slice = P0; P3/P4 need logs + re-review |

---

## First-pass required changes (R1–R6) — status

| ID | Requirement | Status |
|---|---|---|
| R1 | Lock P0 happy path; remove invalidate **OR** skip fork | **Applied** — Plan §8 |
| R2 | Drop etag/fail-closed overclaim; document LWW | **Applied** — Plan §8 / §14 |
| R3 | Explicit inbound Needs Review drift under K=∞ | **Applied** — Plan §8 / §18 |
| R4 | Preserve Processing count refresh paths; add tests | **Applied** — Plan §8 / §13 |
| R5 | Gate P0 on list=0 / counts=0 only; authority provisional | **Applied** — Plan §9 / §10 |
| R6 | First Implement = P0 (+ optional P1); P3/P4 blocked | **Applied** — Plan §3 / §18 / §22 |

---

## Source spot-check (independent)

| Claim | Verified |
|---|---|
| `runInboxAction` → `reloadDesigns` + `onQueueChanged` on success | Yes |
| Approve return value unused today | Yes |
| `DEFAULT_LIST_LIMIT = 100` | Yes |
| `countDesigns` → `getCountFromServer` | Yes |
| `FALLBACK_TTL_MS = 5min` + in-flight dedupe | Yes |
| `updateDesign` / `applyCatalogApprovalUpdate` pre-write `getDoc` untraced | Yes |
| Approval concurrency = LWW + status guards (not etag precondition) | Yes |

---

## Residual risks (non-blocking for Plan approval)

1. Run A composition still unknown — owner log checklist required before attributing 7.1K.
2. Tracer undercounts ~225 write-path gets — Console will be higher than Debug for same client session.
3. Local count / list drift under multi-staff until remount — accepted for P0 with owner decision on K.
4. P3 TTL lengthening can stale AI taxonomy — deferred pending logs.
5. P4 snapshot guard must stay evidence-gated.

---

## Production / process confirmations

| Item | Status |
|---|---|
| PR #40 | Remains open / unmerged |
| Phase 1B | Not started |
| Firebase / production actions this pass | None |
| Application source / tests modified | None (docs only) |
| Implement authorized | **No** — needs explicit owner phrase |

---

## Recommendation

Owner may next: (1) retrieve Run A/B Function + Query Insights per incident §10; (2) decide §18 items; (3) explicitly approve **Implement Amendment 9 P0**.
