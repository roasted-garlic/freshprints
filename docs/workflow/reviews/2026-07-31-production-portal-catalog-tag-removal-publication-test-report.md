# Test report: Portal catalog tag-removal publication fix

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Slice | `production-portal-catalog-tag-removal-publication` |
| Status | **passed** (automated; production deploy/QA not in this report) |

---

## Commands run

| Command | Exit | Notes |
|---------|------|-------|
| `npx tsx --test src/catalogSnapshots/publicationRecovery.test.ts src/catalogSnapshots/portalCatalogChangeClassifier.test.ts` (cwd `functions`) | 0 | 19 tests, 0 fail |
| `npm run build` (cwd `functions`) | 0 | `tsc` clean |

---

## Coverage vs plan

| Case | Result |
|------|--------|
| Tag removal classifies `index-filter` | pass |
| Empty tags classifies `index-filter` | pass |
| Tag removal is not `card-only` | pass |
| Tag facet rebuild omits removed tag, retains others | pass |
| Transient `FetchError` / network codes classified for Storage retry | pass |
| Non-transient budget errors not retried | pass |
| Failing-before: lease-active early abandon leaves catch-up needed | pass (documents old behavior) |
| Passing-after: lease-busy then publish drains catch-up | pass |
| Passing-after: FetchError then publish drains catch-up | pass |
| Dirty mark during success continues second pass | pass |
| Fatal errors rethrown | pass |
| Existing classifier suite (card-only / index-filter / operational / overrides) | pass |

Skipped (not applicable or gated): production Functions deploy, live catch-up invoke, owner Portal
QA, Stage 2, E2E browser automation (none available in this environment).

---

## Honest notes

- Recovery loop and Storage retries are unit-tested with injected clocks; full Storage emulator
  end-to-end publish was not re-run in this pass.
- Production coordination remains stuck until owner-approved deploy + catch-up.
