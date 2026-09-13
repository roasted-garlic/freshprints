# Test Report: Standard Size preset + Add to Request default recalibration

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-09-05-standard-size-preset-and-add-to-request-default-recalibration-plan.md |
| Implementation | session 2026-09-05 (uncommitted) |
| Overall | **passed_with_notes** |

---

## Summary

Scoped unit tests **87/87 pass**. Functions build **PASS**. Portal typecheck **PASS**. Touched-file ESLint **PASS**. Full-repo `npm run lint` and Studio `tsc --noEmit` fail with **pre-existing** errors unrelated to this goal (documented; not introduced by this change).

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Unit tests | `npx tsx --test` (preset + sizing + Portal + Functions add-to-request globs) | 0 | pass | 87 pass / 0 fail |
| Functions build | `npm --prefix functions run build` | 0 | pass | |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | pass | |
| Lint (touched files) | `npx eslint` on changed TS files | 0 | pass | |
| Lint (full repo) | `npm run lint` | non-zero | fail (pre-existing) | SettingsPage hooks, unused vars, etc. — not in this goal’s files |
| Studio typecheck | `cd apps/studio; npx tsc --noEmit` | 2 | fail (pre-existing) | Export tests, staff-inbox, shared tests — none in this goal’s production files |
| Rules | `npm run test:rules` | skip | skip | No rules changes |
| Studio/Portal Vite builds | | skip | skip | Constant-only change; Functions build + typecheck sufficient |

---

## Failures (if any)

### Full-repo lint / Studio tsc (pre-existing)

- **In scope to fix:** no
- **Action taken:** Documented; scoped eslint on touched files clean

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Firestore rules | No rules/auth changes |
| Full monorepo unit sweep | Focused globs cover acceptance criteria |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Live Studio/Portal smoke after settings Reset | pending (optional) | If Firestore overlays old Full Back widths or `defaultPrintRequestWidthInches` is still 11″, owner Reset / set 10.5″ in Studio Settings |

---

## Recommendations

- After DEV host reload: owner Reset Standard Size defaults + set Print Request default to 10.5″ if validating against live Firestore settings.

---

## Signoff Readiness

- [x] Required automated checks for this scope pass OR failures documented
- [x] Manual optional / not blocking for code-only signoff
- [x] Ready for signoff phase

**Next step:** signoff
