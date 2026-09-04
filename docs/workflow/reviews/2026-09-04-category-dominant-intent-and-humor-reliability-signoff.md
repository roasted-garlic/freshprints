# Signoff: Category Dominant-Intent Calibration + Humor Override Reliability

| Field | Value |
|-------|-------|
| Date | 2026-09-04 |
| Signoff by | Signoff Agent |
| Parent goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Correctives | category-dominant-intent-calibration + humor-dominant-intent-override-reliability |
| Plans | `docs/workflow/plans/2026-09-03-category-dominant-intent-calibration-plan.md`, `docs/workflow/plans/2026-09-03-humor-dominant-intent-override-reliability-plan.md` |
| Formal Reviews | both **approved_with_changes** |
| Implementation Reviews | both **approved_with_notes** |
| Final status | **approved_with_notes** |

---

## Summary

Category dominant-intent calibration (prompt **catalog-enrich-v33**, resolver second-pass, revision-aware taxonomy cache) and humor-override reliability (expanded Smart Profile signal bag + joke-primary dual-gate, Animals-only gate removed) are deployed to **fresh-prints-dev**. Automated tests and Functions builds passed. Live humor 10× canary **did not** achieve 10/10 Funny for F-CAW-F; owner **accepts with notes** that occasional plausible-but-suboptimal category ranking (e.g. Animals for a joke-primary raven) is acceptable when Smart Profile discovery remains strong.

**No further category corrective work** for this edge case. **Autonomous remains OFF.** **WS4** may proceed to inventory/Preview only.

---

## Owner acceptance (2026-09-04)

**`OWNER ACCEPTED WITH NOTES`**

- Known limitation: strong joke-primary designs may occasionally retain another semantically plausible exact category (e.g. Animals) rather than preferred Funny & Sarcastic.
- Accepted when: category is defensible from artwork; Smart Profile discovery is strong; no material category contradiction; no other hard automation blocker.
- Owner chooses **not** to pursue deterministic 10/10 category ranking for F-CAW-F.
- Product principle: a plausible suboptimal category alone must **not** force Needs Review (see ADR-FP-163).

Prior canary agent status FAIL is superseded by this owner acceptance for closeout purposes (limitation documented, not “perfect”).

---

## Behavior delivered

- Lean prompt **v33** dominant-intent examples (humor/cannabis/zodiac/franchise)
- Resolver thresholded second-pass + joke-primary dual-gate (any non-humor exact when strongly joke-primary)
- Enrichment-parse themes/subjects/objects/interests/searchConcepts wired into category resolve
- Revision-aware AI taxonomy cache meta peek
- Prompt max length 12000
- Normalizer **v6**, schema **v1** unchanged
- Tags / Autonomous / Ready Catalog Start / production untouched

---

## Tests

| Check | Result |
|-------|--------|
| Focused resolver / cache / prompt / quality contracts | PASS (prior sessions) |
| Humor reliability matrix (Animals/Food parity, CASE B, VT-alone, goldens) | PASS |
| Functions build | PASS |
| Lint / diff-check (touched) | PASS |
| DEV deploy (v33 calibration + humor reliability) | PASS |
| Live 10× #1 Funny | **not met** — owner accepted limitation |

---

## Human approvals

| Item | Result |
|------|--------|
| Implement / DEV deploy authorizations | Recorded in workflow |
| Owner category canary | Accepted with notes (this decision) |
| Autonomous | **NOT** enabled |
| Production | **NOT** authorized |
| WS4 Start | **NOT** authorized (inventory/Preview next) |

---

## Risks / known issues

| Issue | Disposition |
|-------|-------------|
| F-CAW-F / similar joke+subject designs may resolve Animals intermittently | **Accepted** — discovery via Smart Profile |
| Resolve-time vs persisted-signal anomaly noted in humor canary | **Deferred** — no more instrumentation for this corrective |
| WS4 Ready counts must be recalculated vs v33/v6 (not old 346) | Next step |

---

## Follow-ups

1. WS4 Ready Catalog inventory + Preview against **v33/v6** (no Start until owner auth)
2. Later Autonomous enablement remains a separate owner gate
3. Tag retirement remains later workstreams

---

## Final status

**approved_with_notes** — category/humor corrective closed on DEV; Autonomous OFF; WS4 Start not authorized.
