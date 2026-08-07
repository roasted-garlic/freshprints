# Test Report: Amendment 9 P4 — Snapshot Publication Read Amplification Guard

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Phase | Amendment 9 P4 Implement / Test |
| HEAD tested | working tree on `fix/post-launch-catalog-and-processing-stability` (pre-commit) |
| Baseline | `862f7d1` |
| Emulator / live Firebase | **Not run** |

---

## Commands and results

| Check | Command | Result |
|-------|---------|--------|
| Catalog snapshot suite | `npx tsx --test` on all `functions/src/catalogSnapshots/*.test.ts` | **138/138 pass** |
| Functions build | `cd functions && npm run build` | **exit 0** |
| ESLint (touched) | `npx eslint` on publisher/guard/classifier/recovery/`index.ts` | **exit 0** |
| `git diff --check` | whitespace | **exit 0** (CRLF warnings only) |

---

## Coverage highlights

- Classifier P4-a: non-ready INDEX_FILTER → operational; ready-boundary / ready INDEX_FILTER preserved
- Rate guard constants: quiet 30s, min interval 120s, claim 240s
- Eligibility missing ⇒ immediate; persisted eligibility honored across instances
- W2 anti-recursion: nonce advance processes; bookkeeping-only / not-dirty skip
- Synthetic 45 @ 13s ≤6 (10-min formula bound); 45 @ 10s ≤5; 100 @ 8.4s ≤8; gaps ≥120s; ≪25
- Source wiring: passLimit=1, nextEligible with publishedGeneration, admin bypass, wake after claim release
- Amendment 1 claim/timeout regressions retained

---

## Not claimed

- Live Cloud Logging / Firestore read measurement (requires Functions deploy + owner QA)
- Emulator publication end-to-end
- Stage 1a Portal containment (unchanged contracts; Wave C suite still green)
