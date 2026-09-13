# Plan Amendment: WS5 Autonomous DEV Canary — Model 2 Safety-Invariant Expectation

| Field | Value |
|---|---|
| Date | 2026-09-05 |
| Author | Planning Agent |
| Status | **approved** — Formal Review 2026-09-05 |
| Parent plan | `docs/workflow/plans/2026-09-04-smart-catalog-intelligence-completion-ws5-autonomous-dev-canary-plan.md` |
| Parent review | `docs/workflow/reviews/2026-09-04-smart-catalog-intelligence-completion-ws5-autonomous-dev-canary-review.md` |
| Diagnostic | `docs/workflow/reviews/2026-09-05-ws5-autonomous-canary-03cb-unexpected-blocker-diagnostic.md` |
| Parent goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Workstream | WS5 — Autonomous DEV Canary |
| Environment | `fresh-prints-dev` only |
| Runtime baseline | `catalog-enrich-v34` / `smart-profile-normalizer-v6` / `smart-profile-v1` (**unchanged**) |
| Source / deploy | **NONE** this amendment |

---

## Owner decisions recorded (2026-09-05)

1. **Adopt MODEL 2 — SAFETY-INVARIANT CANARY EXPECTATION** as the going-forward WS5 acceptance contract.
2. **`EXPLICIT CONTENT AUTONOMOUS QA: PASS`** for fixture `N3Ag21ThKyFXLTTsKAZZ`.
3. **Accept 03cb** live Needs Review (`structured_evidence_gap:objects:hat`) as legitimate conservative block under the signed evidence contract — do not rerun, replace, or mutate.
4. **nff6** blocker-set drift accepted as Model 2 PASS.
5. Explicit fixture retained for now (cleanup deferred to later closeout unless a later workflow explicitly authorizes deletion).

---

## Historical Model 1 execution (do not erase)

The owner-authorized partial canary correctly **STOPPED** under the then-active operational criterion (exact preflight/replay class reproduction).

| Fact | Record |
|---|---|
| Stop trigger | `03cbj1cIFH7Bavt38XBX` expected Ready → actual Needs Review |
| Blocker | `structured_evidence_gap:objects:hat` |
| Rollback | `shadow` / live `false` (verified) |
| Execution artifact | `docs/workflow/reviews/2026-09-05-smart-catalog-intelligence-completion-ws5-autonomous-dev-canary-execution.md` |

**Model 1 classification of that stop:** procedural STOP — correct under then-active exact-class expectation.

**Model 2 reclassification of the same outcome:** CONSERVATIVE SAFETY PASS — valid current hard blocker kept the design in Needs Review; no bypass.

Both facts remain true. History is not rewritten.

---

## Goal of this amendment

Replace exact persisted-replay class reproduction as the **primary** canary pass/fail criterion with **fresh enrichment safety invariants**, without weakening any Autonomous hard blocker, confidence/verifier bypass rules, dual gate, prompt, normalizer, or schema.

Explicit documentation:

> **Persisted deterministic replay ≠ fresh probabilistic enrichment.**

Preflight replay remains useful for candidate diversity, likely-outcome estimation, deterministic decision-code checks, and owner audit workload estimates — **not** as an exact prediction of a future Gemini call.

---

## Scope

### In scope (docs / process only)

- Formalize Model 2 canary contract (below).
- Record Explicit Autonomous mechanical + owner QA PASS.
- Record 03cb / nff6 / Explicit dispositions under Model 2.
- Record deferred visual-object lexical evidence quality note (no fix in WS5).
- Update workflow state so continuation of remaining rows requires **separate owner authorization** under Model 2.

### Out of scope

- Autonomous enablement
- Remaining candidate execution (`LYJ`, `Dr8`, `1Ws`)
- 03cb reprocess / replace / manual approve / SP edits
- Evidence-contract or prompt/normalizer/schema changes
- Functions/Studio deploy
- Tag/reranker retirement, WS6, production, commit/push
- Explicit fixture deletion (unless later closeout authorizes)

---

## Model 2 — formal canary contract

### Ready is allowed only when policy-clear

A fresh enrichment may become Ready only when `hardBlockers.length === 0` **and** all existing Autonomous requirements pass (dual gate, system actor, audit/`readyAt`, authority preservation, publication synced + Algolia verified).

If a design reaches Ready with **any** hard blocker → **CRITICAL FAIL** / STOP IMMEDIATELY.

Confidence cannot bypass. Verifier cannot bypass.

### New valid hard blocker → Needs Review is safe

If fresh Gemini output introduces a **new valid** hard blocker absent from persisted preflight:

- Expected: Needs Review
- Canary result: **PASS — CONSERVATIVE BLOCK**
- May attach a quality note if the blocker appears overly conservative under product judgment
- Must **not** loosen the blocker to obtain more Ready rows

**Example (03cb):** persisted replay AUTO → fresh `objects:["hat"]` → contract-valid `structured_evidence_gap:objects:hat` → Needs Review → Model 2 PASS.

### Needs Review with zero explained blockers

Needs Review with:

- zero hard blockers
- no explained runtime/settings failure
- no authority reason
- no other repo-defined reason

→ **NOT automatically acceptable.** STOP and investigate.

Model 2 does **not** mean “anything that stays Needs Review passes.”

### Fresh blocker validity

Mechanically evaluate new blockers under the **current signed contract**.

| Outcome | Action |
|---|---|
| Contract-valid | Needs Review = conservative PASS |
| Invalid / source-defect application | STOP for diagnostic |

### Exact blocker-set drift

Exact blocker-set reproduction is **NOT** required.

**Example (nff6):** prior `category_gap_suggested` + `structured_evidence_gap:objects:flowers` → live only flowers; class stayed Needs Review → Model 2 PASS.

### Exact preflight class reproduction

Exact AUTO/Needs Review class reproduction vs persisted replay is **NOT** required.

---

## Canary success invariants (minimum)

1. No hard-blocked design reaches Ready.
2. Every Ready row has zero current hard blockers.
3. Policy-clear Ready rows have correct system approval metadata.
4. `aiReviewedBy = system:catalog-autonomy` where applicable.
5. `readyAt` / audit metadata valid.
6. Human authority is never overwritten.
7. Needs Review rows retain valid reasons.
8. No unexplained zero-blocker Needs Review result.
9. Explicit Autonomous classification remains correct (already proved).
10. Publication to Algolia succeeds for Ready rows.
11. No customer PR behavior changes.
12. No runtime/settings failures are ignored.
13. Stop/rollback remains mandatory on actual invariant violation.

---

## Row dispositions (recorded)

| ID | Disposition |
|---|---|
| `At5hu7vLjWgduiyzZCfR` | Mechanical Ready PASS (prior run); remains |
| `nff6PpkZF9TNitnpX2Mm` | **PASS** under safety intent and Model 2 (blocker-set drift OK) |
| `N3Ag21ThKyFXLTTsKAZZ` | Mechanical PASS + **OWNER VISUAL QA PASS** — Explicit path proved; no new Explicit fixture required for remaining rows |
| `03cbj1cIFH7Bavt38XBX` | Model 1 procedural STOP (historical) + Model 2 conservative safety PASS; **preserve forensic state; do not reuse as execution row** |
| `LYJcsxnfUyacRWtntEkd` | **NOT RUN** — continuation only after separate owner auth under Model 2 |
| `Dr8lcyPE8imTQlNESP8X` | **NOT RUN** — same |
| `1Ws0T9fivryest6IUSbt` | **NOT RUN** — same |

---

## Future continuation rules (not authorized yet)

Remain: serial, one design at a time, audit terminal result before next submission.

| Fresh result | Model 2 interpretation |
|---|---|
| Zero hard blockers → Ready + correct metadata + authority + pub synced | PASS |
| Valid new hard blocker → Needs Review | PASS — conservative |
| Hard blocker present → Ready | CRITICAL FAIL + rollback |
| No blocker but unexpectedly Needs Review | STOP for diagnostic |
| Blocker invalid under signed contract | STOP for diagnostic |

Stop/rollback procedure from parent plan remains: restore `catalogWorkflowMode=shadow` and `catalogAutonomousLiveEnabled=false`; stop enqueuing; audit in-flight.

---

## Deferred quality note (not in WS5)

**TD-034 / quality follow-up:** object structured-evidence validation can hard-block a visually obvious object when Gemini lists it but title/description/centralSubject/visibleText omit the token (example: fedora present, `objects:["hat"]`, no lexical “hat”).

- Creates conservative review friction
- **Does not** block WS5
- **Does not** authorize loosening safety rules during WS5
- Future approaches (prompt guidance; visual-object evidence reconsideration) require **separate Plan/Review**
- Do **not** change `catalogAutomationEvidence`, prompt v34, normalizer v6, or schema v1 in this pass

---

## Supersedes (acceptance criterion only)

This amendment **supersedes** the operational use of exact preflight class reproduction as the primary WS5 canary pass/fail criterion.

It does **not** supersede:

- Dual-gate / hard-blocker source contracts
- ADR-FP-169 / ADR-FP-170 Explicit automation
- Parent plan execution safety (serial, rollback, publication verification)
- Historical Model 1 stop documentation

Related decision: **ADR-FP-171** (WS5 Model 2 safety-invariant canary expectation).

---

## Human checkpoints after this amendment

1. Formal Review of this amendment (this workflow).
2. **Separate** owner authorization before any Autonomous re-enable or remaining-row continuation.
3. Explicit fixture cleanup deferred to later closeout.

**[NEEDS OWNER DECISION]** — authorize or decline continuation of remaining three rows under Model 2 (not requested by this amendment alone).

---

## Risks

| Risk | Mitigation |
|---|---|
| Misread Model 2 as “any Needs Review passes” | Explicit unexplained-NR STOP rule |
| Silent weakening of blockers | Amendment forbids source/evidence changes; Ready+blocker = CRITICAL FAIL |
| Erasing Model 1 history | Explicit dual classification of 03cb stop |

## Rollback of this amendment

Docs-only: revert amendment status / restore Model 1 primary criterion by owner decision. No runtime rollback needed (no source/deploy).
