# Test Report: Customer-specific temporary Print Request + Show quota override

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Goal | `customer-specific-temporary-print-request-and-show-quota-override` |
| Status | **passed_with_notes** |

---

## Commands run

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Shared resolver + Rules alignment + contracts | `npx tsx --test packages/shared/src/utils/printRequestQuotaOverride.test.ts packages/shared/src/constants/printRequest/printRequestLimitSettingsRulesAlignment.test.ts functions/src/updateCustomerPrintRequestQuotaOverride.contract.test.ts functions/src/queuePortalPrintRequestToShow.test.ts apps/studio/src/renderer/src/features/users/components/customerQuotaOverride.contract.test.ts apps/portal/features/print-requests/hooks/usePortalWorkingRequestLimitState.contract.test.ts` | **0** | **32/32 PASS** |
| Functions build | `cd functions && npm run build` | **0** | PASS |
| ESLint (touched sources) | `npx eslint` on listed override/enforcement files | **0** | PASS |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | **2** | Pre-existing unrelated errors in `catalogService.ts` (interactiveEnhanced*); **none** in quota override files |
| Studio `tsc --noEmit` | `npx tsc --noEmit -p tsconfig.json` (studio) | **2** | Pre-existing unrelated errors across electron/export/ai-review/etc.; **none** in quota override files |
| Full Studio/Portal production build | not run (typecheck already shows pre-existing debt; electron-builder heavy) | — | Deferred; note |
| Firebase Rules emulator suite (`npm run test:rules`) | not run this session | — | Rules **source alignment** tests covered allowlist/immutability; emulator suite deferred to DEV deploy QA if Owner requires |

---

## Notes

- Pre-existing Portal/Studio typecheck failures are **not caused by this goal** (filtered: no hits on quota override paths).
- Emulator Rules unit suite not re-run; static Rules alignment tests added/passed for `printRequestQuotaOverride`.
- Owner manual QA (customers A/B) remains after DEV Functions + Rules deploy.

---

## Coverage mapped to Owner test intent

| Area | Evidence |
|------|----------|
| Effective resolver 1–12 | `printRequestQuotaOverride.test.ts` |
| Security 29–36 (source/contract) | callable owner-only contract; Rules alignment (customer cannot write; staff client immutable) |
| Studio UX 37–45 (contract) | User Info section + badge + permission helper contracts |
| Portal UX 46–52 (wiring) | `usePortalWorkingRequestLimitState` uses effective resolver + customer override |
| Staff bypass 14–16 | contract: Show Move / DNP libs do not load effective customer limits |
| PR/Show counting unchanged | existing shared cap utils untouched; callables inject effective max only |
