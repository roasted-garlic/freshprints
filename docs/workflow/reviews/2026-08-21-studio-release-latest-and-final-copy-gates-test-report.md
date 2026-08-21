# Test Report: Studio GitHub Latest + final release-copy gates

| Field | Value |
|-------|-------|
| Date | 2026-08-21 |
| Goal | `studio-release-latest-and-final-copy-gates` |
| Plan | `docs/workflow/plans/2026-08-21-studio-release-latest-and-final-copy-gates-plan.md` |
| Result | **passed** |

---

## Scope tested

Process/docs/scripts only. No Studio installer rebuild. No GitHub Release mutation (including 1.0.8).

---

## Commands run (this session)

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Copy + publish helper + signing-policy | `npx tsx --test .github/scripts/publish-studio-stable-github-release.test.ts .github/workflows/studio-release-signing-policy.test.ts` | 0 | **pass** (36 tests) |
| Lint | `npm run lint` | 0 | **pass** |

## Not run (documented)

| Check | Why skipped |
|-------|-------------|
| Studio tsc / Vite / `build:studio` | No product or packaging change |
| Live `gh api` publish | Out of scope; helper unit-tested with fakes |
| Edit 1.0.8 | Owner-local / forbidden in this goal |

---

## Next

Signoff this process goal. Future Studio publishes use:

`node .github/scripts/publish-studio-stable-github-release.mjs --release-id <id> --version X.Y.Z --sha <40-char>`

after `APPROVE STUDIO PUBLISH: X.Y.Z`.
