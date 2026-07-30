# Portal Print Request Pre-Launch Stability — Amendment 13 Test Report

- **Date:** 2026-07-29
- **Scope:** Plan Section 31 / Amendment 13
- **Deployment:** none required; client-only implementation (Studio)

## Implemented behavior

Root cause traced and confirmed: `upcomingShowService.markShowPrintingFinished` commits a `writeBatch`
setting `updatedAt: serverTimestamp()` on the allocations being finished, then immediately re-reads
those same allocations via a fresh `getDocs` to determine whether affected print requests are now
fully printed. A `serverTimestamp()` sentinel is not guaranteed resolved in the very next standalone
read performed by the same client immediately after `batch.commit()` — no Firebase JS SDK contract
covers this case (only within-transaction reads carry that guarantee). When the sentinel is still
pending, `mapFirestoreTimestamp` returns `undefined`, `mapShowAllocationData` throws, and that
allocation is excluded from the printed-quantity sum for that one read — producing a false "1 request
update(s) need retry" warning for a request that is, in fact, already fully printed. This is exactly why
the warning disappeared correctly on navigation (Amendment 12's reconstruction effect performs the same
bounded check later, after the sentinel has settled) and why no genuine Firebase error was ever visible.

**Correction:** `markShowPrintingFinished`'s post-commit reconciliation now performs a second, bounded
re-check limited to exactly the print-request IDs the first pass classified as `"failed"` (never
remediation IDs, which are not transient by construction). The re-check reuses the existing
`markPrintRequestCompletedIfFullyPrinted` function — no new read mechanism, no unbounded scan. Results
are merged back by `printRequestId`, and the final `failedRequestIds` is re-derived from the merged
result before being returned to the Finish action's caller. A request that is genuinely still
unresolved fails the re-check identically and is reported exactly as before, with an actionable Retry
button; a request only caught in the `serverTimestamp()` resolution window now correctly reports as
resolved immediately, matching what the owner already observed to be true in both Studio and Portal.

The separate console "excluded invalid production record" warning was confirmed to be the same
transient race manifesting through the live `showAllocations` subscription's own `onSnapshot` read path
(`getOrCreateShowAllocationsSubscription`) rather than an unrelated defect — it self-heals on the
listener's next emission once the server acknowledgment arrives, and is already deduplicated. No
separate fix was required for it.

## Verification

| Command | Result |
|---|---:|
| `npx tsc -v` | 5.9.3 |
| New tests (`showFinishReconciliationRecheck.test.ts`) | exit 0; 5/5 pass |
| Directly-relevant regression (13 files) | exit 0; 87/87 pass |
| Portal typecheck | exit 0 |
| Portal build | exit 0; 19/19 pages |
| Studio build | exit 2; unchanged 29-error baseline, none in touched files |
| Repository lint | exit 1; unchanged 41 findings (31 errors, 10 warnings), none in touched files |
| `git diff --check` | exit 0 (only LF/CRLF autocrlf warnings) |
| Rules/Functions suites | not run: no Rules or Function file was changed; not required |

No changed-line lint error remains. No TypeScript setting or lint rule was weakened. No Function,
Rules, migration, or production action occurred.

**Independent Formal Review** (`.../amendment-13-review.md`): approved the fix's logic and safety
(scoping, idempotency, no masking of genuine failures) as implemented, and required the Section 31.5
tests to be added before signoff — now added and verified.

**Independent Implementation Review 15** (`.../implementation-review-15.md`): did not defer to the
Formal Review or the implementer's narrative; independently re-verified the fix, the merge logic, the
double-write safety, and the new tests against current source, and re-ran the full verification matrix
directly. **Verdict: APPROVED, no notes.**

## Files changed

- `apps/studio/src/renderer/src/features/upcoming-shows/services/upcomingShowService.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showFinishReconciliationRecheck.test.ts` (new)

## Evidence checkpoint

The unresolved write remains exactly:

```text
updateDoc printRequests/{printRequestId}
fields: status=completed, updatedBy, updatedAt
```

This amendment did not touch the write itself, any Rule, or any Function — it corrects only the
truthfulness of the immediate post-Finish reconciliation read that decides whether a warning is shown
about that write.
