# Test Report: Image Quality / Halftone Mid-Checkpoint Remediation

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Goal | `image-quality-sizing-and-halftone-safeguards` |
| Phase | Test (remediation) |
| Status | **passed_with_notes** |

---

## Commands run

| Command | Exit | Result |
|---------|------|--------|
| `npx tsx --test` shared: sizing + detector + review state + printSizeMath | 0 | 71 pass |
| `npx tsx --test` Studio `aiReviewFormState.test.ts` | 0 | 5 pass |
| `npm --prefix functions run build` | 0 | Functions compile OK |
| `npm run typecheck` (apps/portal) | 0 | OK |
| `npx tsc --noEmit` (apps/studio) | 2 | Pre-existing `TS5103` on `ignoreDeprecations` in `tsconfig.json` — unrelated to remediation |

Lint / full Studio Electron build / Portal `next build` not required for this remediation scope; not run.

---

## Detector performance (pure shared detector)

From unit-test wall times on 128×128 synthetic fixtures (decode/resize excluded):

- Typical analysis duration: ~0.5–2.5 ms per sample
- Maximum observed in the unit suite: ~5 ms (first solid-on-transparent case warmup)

Studio import and Functions finalize also log structured `[halftone-analysis]` diagnostics (`analysisDurationMs`, classification, sample size) without image bytes or PII. Owner should note live import/finalize timings during manual retest.

Cost is low enough that **removal is not justified**.

---

## Coverage notes

Covered by automated tests:

- Shared 12″ upscale / 10″ request default (Best Christmas, tall, 6″, 3″, near-target, 13″, 32″)
- Detector false-positive structures + true pattern cases
- Studio/Functions alpha extraction parity helpers
- Intake vs AI Review toggle precedence; explicit false; customer-prompt only for `likely`
- AI Review draft seeding preserves staff false / ignores AI suggestion

Not fully automated (manual checkpoint):

- Real artwork Portal/Studio parity
- Portal optimistic UX feel
- Intake/donation visual polish
- Create-request navigation in Electron UI
- Live Functions finalize duration

---

## Deploy note for retest

Redeploy Cloud Functions to `fresh-prints-dev` before Portal finalize/halftone retest so `halftone-alpha-v2` + pre-upscale analysis + `image-quality-v2` sizing are live.
