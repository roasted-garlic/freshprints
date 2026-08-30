# Queued managed goal — Show Queue gang-sheet three-mode refinement

| Field | Value |
|-------|-------|
| Date recorded | 2026-08-24 |
| Last owner refinement | 2026-08-27 |
| Status | **QUEUED ONLY** — superseded by formal plan `docs/workflow/plans/2026-08-27-show-queue-gang-sheet-three-mode-refinement-plan.md` (2026-08-27) |
| Owner correction | Today’s shipped grouped export isolates **per customer** (via `customerId` grouping), not per individual Print Request |
| Managed goal id | `show-queue-gang-sheet-three-mode-refinement` |
| Phase alignment | Phase 7 — Show Queue / production workflow fast-follow |
| Roadmap | `docs/project/ROADMAP.md` (Phase 7 fast-follow section) |
| Baseline ADR | ADR-FP-143 (`docs/project/DECISIONS.md`) + WS5 signoff `docs/workflow/reviews/2026-08-23-studio-workflow-organization-and-grouped-gang-sheet-signoff.md` |
| Active goal unaffected | `smart-catalog-intelligence-unattended-enrichment` remains idle awaiting Slice 3 — **do not start Slice 3 from this record** |

---

## Purpose

Record the owner product clarification for future Show Queue gang-sheet generation so a later managed phase can implement **three** explicit modes without mixing this work into Smart Catalog Intelligence Slices 3–6.

**This document is not an implementation plan.** Formal Plan + Formal Review are required when the owner authorizes the goal.

---

## Owner product decision (2026-08-24; refined 2026-08-27)

The gang-sheet generation modal should ultimately expose three distinct options, preferably as tabs in the existing modal.

**Shared sheet rules (all modes):** Use existing Show Queue gang-sheet settings for width, margins, gutters, DPI, placement, rotation, quantity expansion, and **max sheet length** (default **300 inches** — `DEFAULT_GANG_SHEET_MAX_LENGTH_INCHES` in `showQueueSettingsService`; staff-configurable in Show Queue settings). Modes differ in **grouping and sheet-boundary rules**, not in base sheet geometry.

### 1. Standard

- Current efficiency packing — **unchanged**.
- Maximum normal packing efficiency; no CR/customer section headings.
- No requirement to keep one customer’s items together.
- When the current sheet cannot accept more artwork, continue onto the next sheet using existing Standard behavior.
- Backward-compatible with current Standard output.

Helper copy (conceptual): “Pack all artwork for maximum normal sheet efficiency.”

### 2. Grouped by Customer (intended meaning)

- **Same sheet-filling behavior as Standard:** pack as many customer requests as possible onto each physical sheet until normal layout/capacity rules require rollover (including the configured **max sheet length**, default 300″).
- **Critical:** Do **not** start a new physical sheet merely because the next customer/request begins. Multiple customers **may** share one sheet when space allows.
- Each Print Request is a contiguous section under its **CR/request heading** (visible section separator).
- **Starting a new customer/request must not force a new sheet** — continue using remaining sheet length for the next request whenever layout allows.
- **CR spans sheets:** If a request’s remaining items cannot fit in the **remaining length** of the current sheet, continue on the **next** physical sheet with:
  1. The **default sheet heading** (show heading — same as Standard), then
  2. The **CR/request heading with `-Continued`** (existing convention, e.g. `roasted_garlic-CR001-Continued`).
- Do not duplicate or drop quantities; do not change allocation lifecycle merely because of layout mode.

Helper copy (conceptual): “Keep each customer request together with CR headings while sharing sheets when space allows.”

### 3. Separate by Customer

- Preserve **today’s isolated-per-request** behavior as an explicit third option.
- **One sheet (or multi-sheet set) per customer/request** — never place artwork from two different requests on the same physical sheet.
- Each isolated output uses the **default sheet heading** (show heading) plus **CR/request section headings** on every sheet in that request’s set (same heading vocabulary as grouped mode, but sheet boundaries are per request).
- If one request requires multiple sheets, continue that request’s output normally (default heading + CR headings; `-Continued` when a request spans sheets within its own set).

Preferred user-facing name: **Separate by Customer** (Formal Review may recommend clearer Studio wording without changing product intent).

Helper copy (conceptual): “Create separate gang-sheet output for each customer request.”

---

## Repo baseline (inspection 2026-08-24 — not implementation)

| Area | Path / fact |
|------|-------------|
| Layout mode type | `packages/shared/src/types/export/gangSheetExportIpc.types.ts` — `GangSheetLayoutMode = "efficiency" \| "grouped_by_customer"` |
| Modal options | `apps/studio/src/renderer/src/features/upcoming-shows/utils/gangSheetLayoutModeOptions.ts` — UI labels **Standard** / **Grouped by customer** |
| Confirm modal | `apps/studio/src/renderer/src/features/upcoming-shows/components/ExportGangSheetConfirmModal.tsx` |
| Mode menu | `apps/studio/src/renderer/src/features/upcoming-shows/components/GangSheetLayoutModeMenu.tsx` |
| Grouped planner | `packages/shared/src/utils/gangSheetGroupedLayout.ts` — `planGroupedGangSheetLayout` |
| Observed separate-sheet behavior | Planner calls `commitSheetIfNeeded(true)` before each production-group nest segment → new physical sheet when a group segment starts |
| Group key | `packages/shared/src/utils/groupPrintRequestsByShow.ts` — `resolveGangSheetProductionGroupKey` prefers `customerId` → username → internal base → `printRequestId` |
| Section heading | Request names (comma-joined); `-Continued` helper exists |
| Cache | ADR-FP-143: Standard vs Grouped fingerprints coexist; `layoutMode` included for grouped exports only |
| Max sheet length default | `DEFAULT_GANG_SHEET_MAX_LENGTH_INCHES = 300` in `apps/studio/src/renderer/src/features/upcoming-shows/services/showQueueSettingsService.ts` |

**Product gap:** Today’s “Grouped by customer” UI/behavior matches owner **Separate by Customer**, not intended continuous **Grouped by Customer**.

---

## Future Formal Review must decide

1. **Enum / persistence migration (backward-safe preferred):**
   - Option A: Reinterpret `grouped_by_customer` as continuous grouped; add a new enum (e.g. `separate_by_customer`) for today’s behavior; migrate/invalidate old grouped caches carefully.
   - Option B: Keep `grouped_by_customer` semantics as today’s separate-sheet behavior; introduce a **new** enum for continuous grouped (exact name TBD).
   - Prefer backward-safe migration over renaming persisted semantics blindly so stale grouped cache cannot be returned for the new continuous behavior.

2. **Cache fingerprints:** Ensure all three modes cannot collide (Standard / continuous Grouped / Separate).

3. **Grouping identity:** Prefer stable **`printRequestId`** internally; render CR/request **name** as section heading. Do not use display name alone if one customer can have multiple distinct queued requests. Revisit current customerId-first key.

4. **Architecture:** Prefer shared Standard sheet primitives (dimensions, gutters, placement, max-length rollover, DPI/export) with mode-specific grouping/order constraints — not three fully independent engines if architecture allows.

5. **UX copy / tab labels:** Confirm “Separate by Customer” vs Studio convention alternatives without changing product intent.

---

## Out of scope for this queued record

- Runtime implementation
- Studio component / algorithm / Functions changes
- New `layoutMode` values in code
- Production deploy / Studio release
- Smart Catalog Slice 3+
- Manual Gang Sheet Builder canvas
- Request lifecycle or Show Queue production status changes

---

## Authorization gate

Do **not** begin Plan → Review → Implement for `show-queue-gang-sheet-three-mode-refinement` until the owner explicitly authorizes that managed goal.

Workflow after this docs-only amendment: remain **idle** on Smart Catalog Intelligence awaiting Slice 3 authorization (separate phrase).
