# Test Report: Studio Print Request item Download dirty-preset fix

| Field | Value |
|-------|-------|
| Date | 2026-09-16 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-09-16-studio-print-request-item-download-dirty-preset-fix-plan.md |
| Implementation | session — PrintRequestItemCard signature fix |
| Overall | **passed_with_notes** |

---

## Summary

Focused contract suite (8/8) and Studio `tsc --noEmit` passed. Optional owner smoke on a queued request with a preset-sized item remains recommended but not required for signoff.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Unit / contract | `npx tsx --test apps/studio/src/renderer/src/features/print-requests/hooks/printRequestExport.contract.test.ts` | 0 | pass | 8/8 including new preset dirty assertions |
| Studio typecheck | `npx tsc --noEmit` (cwd `apps/studio`) | 0 | pass | |
| Lint | — | — | skip | Narrow two-line logic fix; not run |
| Portal typecheck | — | — | skip | No Portal changes |
| Build | — | — | skip | No build-affecting packaging change |
| Integration / E2E | — | — | skip | N/A |
| Backend/rules | — | — | skip | No backend delta |

---

## Failures (if any)

None.

---

## Manual Testing

Not required for gate. Optional owner smoke:

1. Open a Print Request with at least one item that uses a standard size preset.
2. Confirm Download is enabled (including when request is queued / read-only).
3. Download succeeds.

---

## Signoff Readiness

- [x] Required automated checks passed
- [x] Failures documented (n/a)
- [x] Manual checkpoint not blocking
