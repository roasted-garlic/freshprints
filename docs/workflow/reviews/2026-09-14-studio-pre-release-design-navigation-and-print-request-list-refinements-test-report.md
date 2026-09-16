# Test Report — Studio pre-release Design Navigation and Print Request refinements

| Field | Value |
|---|---|
| Date | 2026-09-15 |
| Goal | `studio-pre-release-design-navigation-and-print-request-list-refinements` |
| Scope | Workstreams A–F, Owner DEV QA corrections, and regression coverage |
| Environment | Local development source; reviewed DEV Functions only |

## Automated evidence

| Check | Result |
|---|---|
| Affected corrective suite covering A–F and regression contracts | **132/132 PASS** |
| Final F-focused customer picker suite | **22/22 PASS** |
| Studio TypeScript check | **PASS** |
| Portal TypeScript check | **PASS** |
| Functions build | **PASS** |
| Targeted ESLint for affected applicable TS/TSX files | **PASS** |
| `git diff --check` | **PASS** |
| Full repository lint | **Known baseline issue** — 14 unrelated pre-existing errors outside this goal |

The 132-test affected suite included shared Portal editability, active editable request and
unqueue contracts; show grouping/management; Functions queue validation; Portal detail and
mutation contracts; customer directory and identity search; Print Request isolation/search,
clear, grouping, lifecycle layout/counts; and Design Details/lightbox navigation contracts.

The final F-focused command was:

```text
npx tsx --test apps/studio/src/renderer/src/shared/components/selectOptionFilter.test.ts apps/studio/src/renderer/src/shared/components/selectSearchableCategory.contract.test.ts apps/studio/src/renderer/src/features/users/utils/customerDirectorySearch.test.ts apps/studio/src/renderer/src/features/print-requests/services/printRequestService.customerIdentity.contract.test.ts apps/studio/src/renderer/src/features/print-requests/utils/printRequestSearchClear.contract.test.ts
```

It completed with 22 tests passed and 0 failed.

## DEV deployment evidence already used for Owner QA

The owner-authorized DEV-only Functions deployment completed successfully for the seven reviewed
queue/item mutation Functions: **7 deployed, 0 errored, 0 aborted**. This was not a production
deployment and no Portal publication or Studio release occurred.

## Manual Owner DEV QA

On 2026-09-15 the Owner recorded **`OWNER DEV QA: PASS`** for:

- A — Design Details Previous/Next navigation and final UI placement
- B — Staff-created customer PR show management and Portal editability while Editing
- C — Studio show isolation and scoped Print Request search
- D — Show → Customer → Print Requests grouping and combined totals
- E — Printing/Printed newest-show-first ordering
- F — Create Customer Request customer search, including final dropdown-integrated placement
- Regression sweep

## Boundary result

No schema, Rules, authorization, migration, production data, production settings, Portal
publication, or Studio release action was required or performed for this closeout.
