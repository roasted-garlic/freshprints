# Test report: Studio Assisted library design search fix

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Slice | `production-studio-assisted-library-design-search-empty` |
| Status | **passed** (automated; Studio ship/QA not in this report) |

---

## Commands run

| Command | Exit | Notes |
|---------|------|-------|
| `npx tsx --test` assisted picker search + browse contract + firestoreRouteContainment | 0 | 20/20 |
| `npx eslint` on changed Studio picker files `--max-warnings 0` | 0 | |
| `npm run build --workspace @fresh-prints/studio` | 0 | tsc + vite + electron-builder (local packaging; **not** the approved prod distribute) |

---

## Coverage vs plan

| Case | Result |
|------|--------|
| Failing-before: empty catalog / ID-less hook contract documented | pass |
| Picker not on `useReadyDesignsForSelection` | pass |
| Browse hook uses generated ready-index | pass |
| Empty search returns seeded ready | pass |
| Title / id search | pass |
| Non-ready excluded when filtered at source | pass |
| Print Request ID-only containment | pass |
| Empty-state copy distinguishes catalog empty vs search miss | pass |

Skipped: production Studio distribute, owner Electron QA, Stage 2.
