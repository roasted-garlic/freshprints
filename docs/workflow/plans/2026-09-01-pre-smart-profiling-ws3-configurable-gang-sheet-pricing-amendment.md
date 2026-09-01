# Plan Amendment: WS3 Configurable Gang-Sheet Price / Weight Tiers

| Field | Value |
|-------|-------|
| Date | 2026-09-01 |
| Parent plan | `docs/workflow/plans/2026-08-31-pre-smart-profiling-print-request-and-gang-sheet-polish-plan.md` |
| Goal ID | `pre-smart-profiling-print-request-and-gang-sheet-polish` |
| Workstream | **WS3 amendment** — supersedes hard-coded 6″ / $1 / $2 / 0.75 oz model |
| Status | **ready_for_review** |
| Production | **NOT AUTHORIZED** |
| Smart Profiling | **PARKED** |

---

## Owner change (binding)

WS3 gang-sheet price/weight tiers must be **owner-configurable** from Studio Show Queue Settings, not hard-coded. Standard (`efficiency`) mode remains summary-free.

Prior WS3 owner QA is **void** until this amendment ships and passes owner DEV QA.

---

## Architecture answers (repo-verified)

| # | Question | Answer |
|---|----------|--------|
| 1 | Show Queue Settings document/service | `settings/showQueue` via `showQueueSettingsService.ts` + `useShowQueueSettings.ts` |
| 2 | New persisted fields | `gangSheetSectionPriceCutoffInches`, `gangSheetSmallTierPriceUsd`, `gangSheetSmallTierWeightOz`, `gangSheetLargeTierPriceUsd`, `gangSheetLargeTierWeightOz` (all optional) |
| 3 | Who may edit | **Owner + Admin** — `permissionService.canManageShowQueueSettings`; Firestore `isOwnerOrAdmin()` on `settings/showQueue` |
| 4 | Electron receives settings | Renderer resolves config → `GangSheetLayoutSettings.sectionPricing` → `ExportGangSheetPngRequest.sectionPricing` → IPC → compositors (no direct Firestore in Electron) |
| 5 | Cache fingerprint | Grouped modes: bump `sectionSummaryVersion` to **2**; include resolved `sectionPricing` object in fingerprint payload |
| 6 | Missing/invalid defaults | `resolveGangSheetSectionPricingFromShowQueueSettings()` — cutoff 5″, small $1 / 0.40 oz, large $2 / 0.75 oz |
| 7 | Rules change | **Yes** — extend `showQueueSettingsFieldsValid` allowlist (5 optional numbers) |
| 8 | Migration | **None** — additive optional fields |
| 9 | Redeploy to change values after install | **No** for values; **Yes** once for Rules allowlist + shipped Studio build |
| 10 | Standard mode | Omit `sectionPricing` from efficiency fingerprint; compositors unchanged |

---

## Defaults

| Tier | Cutoff rule | Price | Weight |
|------|-------------|-------|--------|
| Small | both dimensions ≤ cutoff | $1.00 | 0.40 oz |
| Large | either dimension > cutoff | $2.00 | 0.75 oz |

Default cutoff: **5.00 inches** (exactly 5″ → small).

Supersedes prior: ≥6″ = $2, <6″ = $1, flat 0.75 oz/image.

---

## Scope

### In

- Shared pricing config constants + resolver + validation
- Refactor `gangSheetCustomerSectionSummary.ts` to accept config (tier-specific price/weight lines)
- Show Queue Settings UI section **Pricing & Weight** (no existing tab architecture — sections within modal form)
- Service/hook/rules alignment for new fields
- IPC type + renderer → Electron propagation
- Cache fingerprint v2 + tests
- Focused unit tests (defaults, classification, calculations, cache)
- Implementation review; **STOP before DEV deploy**

### Out

- Portal customer pricing UI
- Payment/shipping/tax
- Historical billing snapshots
- Smart Profiling

---

## Files (expected)

| Area | Path |
|------|------|
| Shared constants | `packages/shared/src/constants/gangSheetSectionPricingSettings.constants.ts` (+ test) |
| Summary utility | `packages/shared/src/utils/gangSheetCustomerSectionSummary.ts` (+ test) |
| Cache fingerprint | `packages/shared/src/utils/gangSheetCacheFingerprint.ts` (+ test) |
| IPC types | `packages/shared/src/types/export/gangSheetExportIpc.types.ts` |
| Settings service | `showQueueSettingsService.ts`, `useShowQueueSettings.ts` |
| Studio UI | `UpcomingShowsPage.tsx` |
| Export hook | `useExportGangSheetPng.ts` |
| Compositors | `composeGroupedGangSheetSheets.ts`, `composeContinuousCustomerGroupedGangSheetSheets.ts` |
| Rules | `firestore.rules` |

---

## Test strategy

- `gangSheetSectionPricingSettings.constants.test.ts` — defaults + validation
- `gangSheetCustomerSectionSummary.test.ts` — classification + mixed tier math (defaults + custom)
- `gangSheetCacheFingerprint.test.ts` — pricing settings invalidate grouped cache; efficiency stable
- Service validation via constants tests; UI manual QA checklist post-deploy

---

## DEV deploy scope (after owner approval — not in this session)

| Resource | Required? |
|----------|-----------|
| Firestore Rules | **Yes** — new optional fields on `settings/showQueue` |
| Studio dev restart | **Yes** — local/Electron renderer + main |
| Functions | **No** |
| Storage | **No** |
| Hosting | **No** |
| Production | **NOT AUTHORIZED** |

Changing tier values after deploy requires **no** redeploy — Firestore settings only.

---

## WS status

| WS | Status |
|----|--------|
| WS1 | **PASS** |
| WS2 | **PASS** |
| WS3 | **PENDING AFTER CONFIGURABLE SETTINGS AMENDMENT** |
