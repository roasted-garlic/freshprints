# Test Report: WS3 Configurable Gang-Sheet Pricing / Weight

| Field | Value |
|-------|-------|
| Date | 2026-09-01 |
| Goal | `pre-smart-profiling-print-request-and-gang-sheet-polish` (WS3 amendment) |
| Status | **passed** |

---

## Automated tests

| Command | Result |
|---------|--------|
| `npx tsx --test packages/shared/src/constants/gangSheetSectionPricingSettings.constants.test.ts packages/shared/src/utils/gangSheetCustomerSectionSummary.test.ts packages/shared/src/utils/gangSheetCacheFingerprint.test.ts` | **23/23 PASS** (exit 0) |
| `npm --prefix functions run build` | **PASS** (exit 0) |

### Coverage summary

- Defaults when settings missing
- Classification at 5″ cutoff (small/large, custom cutoff)
- Price/weight math (all large, all small, mixed, custom tiers)
- Cache fingerprint invalidates on each pricing field change
- Efficiency fingerprint stable without grouped pricing inputs

---

## Not run

| Check | Reason |
|-------|--------|
| Full Portal typecheck | Out of scope; unchanged Portal paths |
| Studio UI component tests | No existing Show Queue Settings UI test harness |
| Firestore rules emulator suite | Rules allowlist extended; deploy-time verification required |
| Manual owner QA | Pending after DEV Rules deploy + Studio restart |

---

## Manual QA (owner — after deploy)

See Implementation Review owner checklist.
