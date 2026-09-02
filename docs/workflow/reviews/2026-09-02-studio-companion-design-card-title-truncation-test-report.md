# Test Report: Studio Companion Design card title truncation

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-09-02-studio-companion-design-card-title-truncation-plan.md |
| Implementation | CSS-only session (uncommitted) |
| Overall | **passed_with_notes** (Owner QA **PASS** — see final test report) |

---

## Summary

Focused truncation contract tests **6/6 pass**. Sibling `CompanionSetPanel.artworkPlacement.test.ts` has **2 pre-existing failures** (stale assertions vs `anchorDesign` / `showCompanionMembers` — **not caused by this CSS-only goal**; TSX untouched). Studio `tsc --noEmit` reports **pre-existing** errors unrelated to this change. Full Electron `build` skipped as out of proportion for stylesheet-only work. **Owner QA required** before signoff.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Unit (focused) | `npx tsx --test apps/studio/src/renderer/src/features/designs/components/CompanionSetPanel.titleTruncation.test.ts` | 0 | **pass** | 6 tests |
| Unit (sibling) | `npx tsx --test …CompanionSetPanel.artworkPlacement.test.ts` | 1 | **fail (pre-existing)** | 3/5 pass; 2 stale source regexes (out of scope) |
| Unit (combined) | truncation + artworkPlacement | 1 | **pass_with_notes** | Truncation 6/6 pass; sibling 2 pre-existing fails |
| Typecheck | `npx tsc --noEmit -p tsconfig.json` (apps/studio) | 2 | **fail (pre-existing)** | Errors in pngValidator, export tests, ai-review, customer-uploads, companionSetHelpers type name, etc. — **not introduced by this goal** |
| Lint | — | — | skip | No goal-scoped lint script required for CSS-only |
| Build | `npm run build` (studio / electron-builder) | — | skip | CSS-only; disproportionate; HMR covers visual |
| Integration / E2E / Rules | — | — | skip | No backend impact |

---

## Failures (if any)

### Studio tsc --noEmit (pre-existing)

- **Command:** `npx tsc --noEmit -p tsconfig.json` in `apps/studio`
- **In scope to fix:** no
- **Action taken:** Documented only. Examples: `pngValidator.ts` PersistedArtworkUpscalePassCount, `composeContinuousCustomerGroupedGangSheetSheets.test.ts` GroupedResizedImage shape, `companionSetHelpers.ts` missing `CompanionSetStatusLabel` name — none touch `design-library.css` or the new truncation test.

### CompanionSetPanel.artworkPlacement.test.ts (pre-existing)

- **Command:** `npx tsx --test …CompanionSetPanel.artworkPlacement.test.ts`
- **In scope to fix:** no (TSX not modified; assertions expect old `isLinked ? [design, …]` / `member.id === design.id`)
- **Action taken:** Documented; do not expand this goal to rewrite Placement wiring tests.

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Full Studio electron-builder build | CSS-only change; Vite HMR sufficient for Owner QA |
| Lint | No CSS-lint gate for this surface in package scripts |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Companion card title truncation Owner QA | pending | See Implementation Review / Owner QA checklist |

---

## Recommendations

- Optional follow-up (out of scope): companion **picker** row title shrink-chain if Owner QA sees similar overflow there.
- Broader Studio typecheck debt is tracked outside this goal.

---

## Signoff Readiness

- [x] Required automated checks for this goal pass OR failures documented
- [ ] Manual tests complete OR checkpoint pending ← **pending**
- [ ] Ready for signoff phase ← **no** until Owner QA PASS

**Next step:** manual-test-checkpoint (Owner QA)
