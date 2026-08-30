# Test Report: Smart Profile Quality + Canonicalization (+ Import Background)

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Amended | QA corrective A–D |
| Status | **passed_with_notes** (automated + owner manual QA **PASS**) |

## Commands run (corrective)

| Check | Command | Exit |
|-------|---------|------|
| Focused detector / precedence / category / import contracts | `npx tsx --test` (shared resolve+visibility, importBackgroundQuality, category alternatives, batch session/layout) | 0 — 31 pass |
| Studio typecheck | `cd apps/studio && npx tsc --noEmit` | 0 |
| Studio Vite build | `cd apps/studio && npx vite build` | 0 |
| Full repo lint | `npm run lint` | 0 |
| git diff --check (touched surfaces) | pass (CRLF warnings only) | 0 |

## Coverage vs owner automated list (corrective)

| # | Expectation | Evidence |
|---|-------------|---------|
| 1–6 | white/cream/dark/mixed/sparse/transparent visibility | `resolveImportArtworkBackgroundDecision.test.ts` fixtures |
| 7–9 | Single/Batch preview uses resolved bg before create | Electron preview hint + `ImportPngPreview` / `BatchImportFilePreview` CSS hex |
| 10–12 | per-image Light/Dark/Auto precedence | resolver unit tests |
| 13–16 | session All light/dark; All Halftone badge; dark ≠ halftone | resolver + build fields + UI badge |
| 17–21 | category chips resolve existing only; no invent | `resolveExistingCategoryChoice` + contract |
| 22 | full category picker remains | FormPanel Select unchanged |

## Owner manual QA (2026-08-25)

| Result | **PASS** |
| Environment | Studio local → fresh-prints-dev |
| Record | `docs/workflow/reviews/2026-08-25-smart-profile-quality-corrective-owner-qa-pass.md` |

All corrective checklist items verified (imports layout, Auto/Light/Dark picker, halftone session, cream→Dark, dark art→Light, category chips, no auto-approve on category change).

## Notes

1. Real owner cream PNG **[NEEDS OWNER FIXTURE]** for calibration slot #26 — synthetic cream used in unit tests; owner confirmed cream→Dark in manual QA.
2. **No Functions redeploy** for this corrective.
3. Prior DEV Functions (enqueue + vocab refresh) remain as deployed; this corrective is Studio/shared.
4. Bounded v28 DEV calibration (~26 fixtures) required before refinement signoff — see calibration plan + fixture inventory.
5. Do not treat corrective QA as final profiler calibration.

## Verdict

Corrective automated checks + owner manual QA: **passed_with_notes**. Next: bounded v28 calibration execution → owner review of calibration report. **No refinement signoff yet.**
