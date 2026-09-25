# Final Implementation Review: Orientation-Aware Gang-Sheet Shelf Packing

| Field | Value |
|---|---|
| Date | 2026-09-24 |
| Managed goal | `gang-sheet-orientation-aware-shelf-packing-efficiency` |
| Verdict | **approved_with_changes; owner-resolved at signoff** |
| Reviewer role | Independent Final Implementation Review Agent; not Test Agent |

## Findings

1. **A/B acceptance discrepancy — owner resolved.** The implementation produces **30,477 px / 8 rows** for the 10×A + 5×B fixture. The earlier Formal Review expectation of **33,675 px / 10 rows** was conservative/incorrect because it did not reflect the complete-layout score. The implemented result is deterministic, exact-count, within bounds, and materially shorter. Owner DEV QA explicitly accepted 30,477 px / 8 rows as the authoritative regression result.

2. The implementation does include a fixed `MAX_ORIENTATION_CANDIDATES = 32` set covering original, all-rotated, single-flip, and pair candidates; admits boxes when either effective width fits; uses finalized plans for capped placement; preserves `{ id, x, y, rotated }`; and compares the orientation-aware layout against the compatibility baseline by skipped count and total sheet height.

3. Standard, Sheet per Customer, and Grouped by Customer paths still call the shared height-capped nesting utility. Existing compositor code consumes `placement.rotated` and rotates PNG bytes. No goal-specific Firebase, production, IPC, pricing, label, or data-model changes were found.

4. Cache algorithm version `2` is included in the shared fingerprint. Exact fingerprint lookup therefore invalidates old cache folders. The implementation review did not find a new cache stale-path test; the existing renderer fallback should surface an unmatched old disk-peek fingerprint as stale, but this remains a verification gap.

## Verification performed

- Focused shared nesting, efficiency, grouped, continuous-grouped, cache fingerprint, compositor, and IPC validation suites: **73/73 tests passed**.
- Studio TypeScript check: passed.
- Targeted ESLint: passed.
- Targeted `git diff --check`: passed.

Owner DEV QA subsequently resolved the A/B acceptance discrepancy by accepting the implemented
30,477 px / 8-row result and classifying the earlier 33,675 px / 10-row expectation as
conservative/incorrect.

## Resolution and residual risk

Owner DEV QA generated two real DEV gang sheets, including the original 13.00 × 9.35 and
12.00 × 8.09 artwork, and confirmed rotated PNG behavior, efficient packing, clean cuttable rows,
and an additional regression layout. The goal is approved with notes. The remaining cache
stale-path test gap is low risk because algorithm version `2` changes exact fingerprints; no old
cache directories were deleted. No production action is authorized.
