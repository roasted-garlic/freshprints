# Test Report: Portal show-schedule visibility + independent limit settings

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Plan | `docs/workflow/plans/2026-07-31-production-portal-show-schedule-and-limit-settings-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-07-31-production-portal-show-schedule-and-limit-settings-review.md` |
| Verdict | **passed** (automated source checks) |

---

## Commands run

| Check | Command | Exit |
|-------|---------|------|
| Focused unit | `npx tsx --test` on schedule + limits + fit + working-max + validation + personal usage + progress signature tests | **0** (54 pass) |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | **0** |
| Studio typecheck | `npx tsc --noEmit` in `apps/studio` | **0** |
| Functions build | `cd functions && npm run build` | **0** |
| Portal build | `npm run build:portal` | **0** |
| Touched eslint | eslint on portal print-requests, requests pages, Studio settings section, shared helpers, schedule/limit functions | **0** |
| Whitespace | `git diff --check` | **0** (CRLF warnings only) |
| Rules emulator | skipped — Rules not changed |

---

## Coverage notes

- Schedule: no alloc / one / same-show dedupe / multi chronological / card +N / printed retain / missing fallback / batch cap / no show id in labels.
- Limits: missing-field linked fallback / linked equal persist / unlinked independent / legacy sole-L parse / compatibility accessors.
- Queue fit + personal usage customer-show cap case.
- Progress signature includes `scheduledStartAt`.

Production owner QA and App Hosting verification are **not** claimed here.
