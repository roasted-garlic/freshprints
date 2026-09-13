# Signoff: Print Request Sizing + Interactive Upscale

| Field | Value |
|-------|-------|
| Date | 2026-08-31 |
| Signoff by | Signoff Agent |
| Managed goal | `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale` |
| Plan | `docs/workflow/plans/2026-08-30-print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale-plan.md` |
| Review | `docs/workflow/reviews/2026-08-30-print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale-review.md` |
| Final implementation review | `docs/workflow/reviews/2026-08-31-print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale-final-implementation-review.md` |
| Test report | `docs/workflow/reviews/2026-08-31-print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale-final-test-report.md` |
| Final status | **approved** |
| Result | **DONE on `development`** |
| Production | **NOT PROMOTED / NOT AUTHORIZED** |
| Migration / backfill | **NONE** |
| Smart Profiling | **NOT STARTED** |
| Owner DEV QA | **PASS** |

---

## Summary

Delivered configurable Print Request default sizing (runtime Studio setting with **10″ system fallback**), **15″ automated** import/upload upscale target (`image-quality-v3`), and **interactive upscale** (WS-TOGGLE) for `catalog_design` and `customer_upload` in **Studio + Portal** with non-destructive one-derivative-per-lineage semantics, production export parity, and reviewed DEV Firestore/Storage security boundaries.

---

## Changes Delivered

### Behavior

- **WS-CONFIG-DEFAULT:** `settings/standardPrintSizes.defaultPrintRequestWidthInches` is operational source of truth for new generic Print Request items; **10″** system fallback; new items only; no migration.
- **Automated upscale:** **15″** target on import/upload; cumulative **≤6×** from native; separate from interactive enhancement.
- **Interactive upscale:** request-driven ~300 DPI first pass; one valid derivative per lineage; OFF/ON is selection only; no regeneration on larger sizes; Reset to Default preserves reusable derivative.
- **Production export parity:** gang sheets (all modes), ZIP, manual builder honor `artworkEnhanceMode`; cache fingerprints distinguish active asset; fail-closed when enhanced derivative missing.
- **Security:** Firestore rules for enhance fields; Storage rules for staff read of `{designId}.interactive.png`; customer-upload private boundaries preserved.

### Key commits (development)

| SHA | Subject |
|-----|---------|
| `878439ea` | Initial sizing / automated 15″ target |
| `c2461238` | WS-CONFIG configurable default |
| `c71e8392` | One-derivative reuse / state machine |
| `c84ec449` | Production export parity |
| `9c9f7f0e` | Storage rules interactive original read |
| `951e7760` | DEV Storage + Function deploy record |
| `a646829c` | Studio + Portal UI, settings, callable parity |

### Documentation Updated

- `docs/project/DECISIONS.md` — ADR-FP-080 reconciled (accepted amendments through 2026-08-31)
- `docs/project/ROADMAP.md` — goal marked complete on DEV
- `references/project-chatgpt-handoff/*` — handoff refresh

---

## Tests

### Automated

See final test report. Consolidated closeout run: **119/119 PASS**; Functions build **PASS**.

### Manual — Owner DEV QA

| Test | Result | Approved by |
|------|--------|-------------|
| Configurable Print Request default | **PASS** | Owner |
| Runtime default change without redeploy | **PASS** | Owner |
| 10″ system fallback | **PASS** | Owner |
| First interactive upscale | **PASS** | Owner |
| Enhanced derivative reuse | **PASS** | Owner |
| Reset to Default | **PASS** | Owner |
| Re-enable after reset reuses derivative | **PASS** | Owner |
| Repeated ON/OFF | **PASS** | Owner |
| Manual size changes preserve Upscale ON | **PASS** | Owner |
| Standard Size changes preserve Upscale ON | **PASS** | Owner |
| No auto-baseline on ordinary size edits | **PASS** | Owner |
| No regeneration on larger sizes | **PASS** | Owner |
| Production export paths honor enhanced mode | **PASS** | Owner |
| Storage access fix for interactive catalog derivative reads | **PASS** | Owner |
| Overall feature complete | **PASS** | Owner |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | **not authorized** | — | DEV only |
| Database migration | N/A | — | None |
| DEV Firebase deploy (Functions/Storage/Rules) | obtained | 2026-08-30 – 2026-08-31 | `fresh-prints-dev` only |
| Design / UX | obtained | 2026-08-31 | Owner DEV QA PASS |
| Business / policy | obtained | 2026-08-31 | Final binding contract recorded |
| Secrets / env | N/A | — | No new secrets |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Pre-existing Studio/Portal `tsc` failures | low | Unrelated to this goal; documented in test report |
| Assisted-creation proof Function not redeployed for 15″ | low | Out of scope; may retain prior bundle until future checkpoint |
| Production not promoted | info | Requires separate authorized promotion workflow |
| Unrelated local working-tree edits (show rails, imports) | info | Intentionally excluded from closeout commits |

---

## Deferred Items (Roadmap)

- **Smart Profiling completion** — next major candidate; **not started**
- Coordinated **production promotion** of accumulated DEV work — owner separately authorized
- Bulk catalog re-upscale backfill — out of scope

---

## Open Blockers

- [x] None

---

## Verdict

**approved** — Owner DEV QA **PASS**; automated regression **PASS**; implementation review **approved**; production **untouched**; goal **DONE** on `development`.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`, **IDLE**
- [x] `docs/project/ROADMAP.md` updated
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] Other handoff files per MANIFEST where behavior changed

**Recommended next action for user:** When ready, authorize a separate production promotion workflow. Smart Profiling remains parked until explicitly started.
