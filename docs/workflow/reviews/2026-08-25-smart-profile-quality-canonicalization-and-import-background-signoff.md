# Signoff: Smart Profile Quality + Canonicalization (+ Import Background) Refinement

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Signoff by | Signoff Agent |
| Goal | `smart-catalog-intelligence-unattended-enrichment` — refinement between Slice 4 and Slice 5 |
| Primary plan | `docs/workflow/plans/2026-08-25-smart-profile-quality-canonicalization-and-import-background-plan.md` |
| Final status | **approved_with_notes** |

---

## Summary

Refinement delivered Smart Profile quality (v28→**v29** + **normalizer-v3** subject-specificity promote), import Auto artwork-background / session controls (C2b accepted with deferred detector tuning), DEV runtime deploy of `enqueueAiEnrichment`, and bounded live smoke. **Slice 5 remains not started** — unblocked for a future managed phase. Live Autonomous OFF. Production untouched.

---

## Changes delivered

### Behavior

- Smart Profile: text-dominant / per-dimension thoroughness; canonicalization; **C1** specific subjects (e.g. `highland cow` + `cow`)
- Import: Auto / All light / All dark + per-image override; All-halftones → Dark; **C2b** pre-poodle luma + cream/sparse secondary
- Prompt **`catalog-enrich-v29`**, normalizer **`smart-profile-normalizer-v3`** on DEV enqueue path

### Correctives closed

| ID | Result |
|----|--------|
| C1 Highland subject specificity | **PASS WITH NOTES** + DEV deploy smoke PASS |
| C2b Auto Background | **PASS WITH NOTES** — accepted; further tuning deferred (**non-blocking**) |

### Documentation / artifacts

- Plans/reviews/test reports under `docs/workflow/plans/` and `docs/workflow/reviews/`
- Deploy: `2026-08-25-highland-c1-v29-dev-deploy-record.md`
- Smoke: `2026-08-25-highland-c1-v29-dev-smoke-report.md`

---

## Tests

### Automated

- Shared/functions unit + contract suites for detector, specificity promote, prompt version, pipeline containment
- Studio `tsc --noEmit`, Vite build, full lint, `git diff --check` (as recorded in corrective test reports)

### DEV deploy + smoke

| Check | Result |
|-------|--------|
| `enqueueAiEnrichment` updateTime | `2026-08-26T03:04:03Z` (rev `00080`) |
| Highland via Cloud Function | v29 + v3; subjects `highland cow`, `cow` |
| Jimothy via Cloud Function | raccoon present; people absent |
| Designs restored | ready/approved baselines restored |
| Live Autonomous | **OFF** |
| Prod enqueue | unchanged (`2026-08-12`) |

### Manual / owner

| Item | Result |
|------|--------|
| C2b Auto Background | PASS WITH NOTES |
| C1 Highland observe | PASS WITH NOTES |
| DEV deploy authorize | **authorize** |
| Live Autonomous | remains OFF |

---

## Human approvals

- C1 / C2b owner QA acceptances
- DEV `enqueueAiEnrichment`-only deploy authorization
- No production deploy
- No Slice 5/6 start in this signoff

---

## Risks / follow-ups

| Item | Notes |
|------|--------|
| Auto Background further calibration | Deferred; prefer false negatives; per-image override |
| Slice 5 | **Unblocked** to start as next managed phase — **not started here** |
| Modifier blocklist drift | Occasional prose bigrams (e.g. temporary `depicts raccoon` in smoke) filtered by restore; may tune later |
| Node 20 runtime deprecation warning on deploy | Track separately |

---

## Final status

**approved_with_notes**

Refinement complete for Slice 5 gating. Do **not** treat as Slice 5 execution. Do **not** enable live Autonomous. Do **not** touch production without a separate authorize.
