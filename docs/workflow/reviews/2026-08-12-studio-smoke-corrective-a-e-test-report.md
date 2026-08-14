# Test Report: Studio production-smoke corrective A–E

| Field | Value |
|-------|-------|
| Date | 2026-08-12 |
| Phase | Test (post–DEV QA PASS) |
| Candidate implementation | `13e0af88f843571e3f49eae07899c38a23c90fd4` |
| Branch tip (includes QA docs) | `dac0284` + PASS checklist update |
| Worktree | `c:\coding\fresh-prints-wt-smoke-ae` |
| Verdict | **passed_with_notes** |

---

## Summary

Focused automated gates re-run against the corrective worktree after owner DEV QA **PASS**. Manual DEV QA (helper account, worktree Studio) passed. Production deploy and Studio 1.0.4 packaging remain blocked pending separate owner authorization after PR merge.

---

## Commands and results

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Studio typecheck | `node apps/studio/scripts/generate-packaged-build-config.mjs` then `npx tsc -p apps/studio --noEmit` | 0 | pass |
| Functions build | `npm --prefix functions run build` | 0 | pass |
| Studio focused unit | `npx tsx --test` (permission + AI Review form + designLibrarySearch + Algolia facets) | 0 | **57** pass |
| Functions focused unit | `npx tsx --test` from `functions/` (catalogTagResolver + customerUploadStaffAuth) | 0 | **43** pass |
| Lint (touched files) | `npx eslint … --max-warnings 0` | (recorded in session) | pass if 0 |
| `git diff --check` | on worktree | 0 | pass |
| Full monorepo lint / Vite production build / installer | not required for this checkpoint | — | deferred to Studio 1.0.4 package gate |
| Firestore Rules emulator suite | no `settings/showQueue` coverage in harness | — | documented; Rules validated via DEV deploy + owner QA |

---

## Manual / human tests

| Test | Result |
|------|--------|
| Owner DEV QA checklist (helper + A/B/D/E) | **PASS** 2026-08-12 |
| Path | `docs/workflow/reviews/2026-08-12-studio-smoke-corrective-a-e-dev-qa-checklist.md` |

---

## Notes

- Implementation product SHA for promotion: **`13e0af8`**. Branch tip may include docs-only commits after that SHA.
- Production promotion sequence and allowlists: see production promotion checkpoint (separate doc).
- No production deploy in this test pass.

---

## Signoff readiness

- Automated focused gates: **pass**
- Manual DEV QA: **pass**
- Production deploy / Studio 1.0.4: **not authorized** — stop for human checkpoint after PR
