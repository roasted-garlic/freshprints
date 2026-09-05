# Formal Review: Explicit Content Reprocess Authority Corrective

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-05-explicit-content-reprocess-authority-corrective-plan.md` |
| Parent | ADR-FP-172 Explicit standard enrichment (Signoff blocked) |
| Verdict | **approved_with_changes** |
| Implementation authorized | **NO** |

---

## Summary

Owner QA C correctly exposed that ADR-FP-172’s `explicitContentSource=staff` permanent suppress conflates “last edited by staff” with “never auto-classify again.” Plan correctly reframes reprocess to re-apply positive Explicit detection unless a **separate** deliberate lock exists, while preserving no-auto-clear and non-blocking Explicit. Cucumber design `Y2IQuCgAPgnqrBIeJuap` is **not** blocked by profanity; hard blocker is contract-valid `structured_evidence_gap:subjects:woman` — **no cucumber source corrective** in this Plan.

---

## Required questions

| # | Question | Answer |
|---|---|---|
| 1 | Should normal staff Explicit edits permanently suppress future classifier runs? | **NO** |
| 2 | Should explicit reprocess recompute positive Explicit detection? | **YES** |
| 3 | Does no-auto-clear remain? | **YES** |
| 4 | Is positive SET different from negative CLEAR? | **YES** |
| 5 | Is `explicitContentSource` provenance sufficient alone? | **Sufficient for last-writer provenance**; **insufficient** as permanent protect — must stop using it as write-block |
| 6 | Is separate override/lock needed? | **YES for Case 4 product completeness**; **[NEEDS OWNER DECISION]** whether to ship lock UI in this corrective or defer (default automatic re-apply until lock exists) |
| 7 | Existing staff-stamped DEV docs impact? | Reprocess may re-apply Explicit on match after behavior change — **desired** |
| 8 | Migration needed? | **NO** preferred (reinterpret stamps) |
| 9 | AI Review edit semantics? | Stamp provenance `staff` on field edit; **do not** set lock unless dedicated control |
| 10 | Design Library edit semantics? | Same as AI Review via `designService` |
| 11 | Reprocess semantics? | Classifier runs; positive match applies if !locked && settings OK |
| 12 | Settings-failure unchanged? | **YES** |
| 13 | Explicit remains non-blocking? | **YES** |
| 14 | Customer PR unaffected? | **YES** |
| 15 | Portal unaffected? | **YES** (consumes fields only) |
| 16 | Cucumber exact blocker? | `structured_evidence_gap:subjects:woman` (hard); soft `category_alternatives_present` |
| 17 | Cucumber blocker valid? | **YES** under current lexical evidence contract |
| 18 | Cucumber source corrective required? | **NO** |
| 19 | Source files required? | **YES** — shared Explicit helpers, pipeline, Studio stamp/copy (± lock UI), tests, ADR/docs, maybe Rules |
| 20 | Rules changes required? | **Only if** new client-writable lock field; otherwise **NO** |
| 21 | Functions deploy required? | **YES** after implement auth |
| 22 | Studio change required? | **YES** (copy ± lock control) |
| 23 | Focused tests? | **YES** — Cases 1–4 + no-clear + contracts |
| 24 | QA replacement for old QA C? | **YES** — reprocess must restore Explicit after staff clear without lock |
| 25 | WS6 remains blocked? | **YES** until this corrective + ADR-FP-172 disposition complete |
| 26 | **[NEEDS OWNER DECISION]** | (a) Ship lock control now vs defer; (b) lock field/UX name; (c) authorize implement |

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Explicit authority only; cucumber diagnostic-only |
| Architecture alignment | pass | Enrichment metadata; SP staff keys untouched |
| Security impact addressed | pass | No customer surface; Rules additive if lock |
| Data model impact addressed | pass | Provenance reinterpret + optional lock |
| Backend impact addressed | pass | Pipeline protection rewrite |
| Test strategy adequate | pass | Cases 1–4 |
| Human checkpoints identified | pass | Lock decision + implement auth |
| Roadmap alignment | pass | Blocks WS6 until done |
| Documentation plan | pass | ADR + DATA_MODEL |
| No silent scope expansion | pass | No evidence-rule loosening |

---

## Architecture / Security / Data

**Findings:**

- Smart Profile `staffEditedDimensionKeys` is the right **precedent class** (explicit preserve list), not “any edit forever.”
- Current `hasProtectedStaffExplicitAuthority` is the root of QA C product fail.
- Cucumber: `isHardEvidenceCode` treats `structured_evidence_gap:*` as hard — subject `woman` lacks lexical support in title/description corpus; Explicit `fuck` unrelated.

**Required changes before implement:**

1. Owner decide Case 4 lock: **ship now** vs **defer** (if defer, document that permanent suppress is unavailable until follow-up).
2. Stop using `explicitContentSource===staff` / legacy fields as permanent write suppress.
3. Keep no-auto-clear and settings-fail skip.
4. Replacement QA C script/checklist.
5. Do **not** change cucumber evidence validators in this corrective.

---

## Cucumber diagnostic record

| Item | Value |
|---|---|
| Design ID | `Y2IQuCgAPgnqrBIeJuap` |
| wouldAutoApprove | **false** |
| Hard blocker | `structured_evidence_gap:subjects:woman` |
| Soft | `category_alternatives_present` |
| Profanity in blocker | **NO** |
| Explicit | correctly ON with `fuck` |
| Source defect | **NO** |

---

## Verdict

**approved_with_changes** — Plan approved for a future implement phase after owner lock-ship decision and separate implement authorization.

**Implementation authorized: NO** this pass.

WS6 remains **BLOCKED**. Autonomous remains **OFF**. Fixtures retained. No Signoff of ADR-FP-172 yet.
