# Handoff: Print Requests Working/Editing 3rd scrollbar — STILL FAILING Owner QA

**Date:** 2026-09-13
**Disposition:** Owner confirms **NOT FIXED**. Handed to another agent.
**Do not mark Owner DEV QA PASS for scroll.**

## Owner-observed behavior (authoritative)

On Studio Print Requests, tabs **Working** and **Editing** show **three** vertical scrollbars:

1. Left request **list** (wanted)
2. Right **detail** pane (wanted)
3. **Entire page** (unwanted)

Tabs **Queued**, **Printing**, and **Printed** do **not** show #3.

Owner asked repeatedly to learn from Queued/Printing/Printed and make Working/Editing match.

## Important clarification

The gold pills in one screenshot (`CUSTOMER SUBMITTED` / `EDITING` / `WORKING`) are **detail badges**, not the left-rail status tabs. The failing tabs are the left-rail lifecycle tabs: Working / Editing vs Queued / Printing / Printed.

## Proven facts (do not re-derive from scratch)

1. **There is no per-tab scroll CSS.** Same DOM/CSS for all lifecycle tabs.
2. **Difference is content height:** Working/Editing render editable item cards (`readOnly={false}`); Queued/Printing/Printed are locked/compact (`readOnly={true}` via `isSelectedRequestDetailLocked`).
3. **Scrollbar #3 owner:** `div.page-content-area.page-content-area--print-requests` (AppShell), from base `.page-content-area { overflow-y: auto }` in `navigation.css`.
4. **Legacy conflict:** `.print-requests-layout` used to have `height: auto` on purpose so detail grew the page (old outer-scroll model). That makes #3 appear when detail is tall.
5. **Show Queue** intentionally keeps outer page scroll; do not break it.

## What this agent already changed (uncommitted / local tree)

Files heavily touched:

- `apps/studio/src/renderer/src/styles/layout.css` — Print Requests separated from Show Queue; shell `height: 0` + `overflow: hidden`
- `apps/studio/src/renderer/src/styles/components/navigation.css` — `overflow: hidden !important` on print-requests content area
- `apps/studio/src/renderer/src/styles/components/print-requests.css` — route-scoped layout/main/rail; removed base `height: auto` (Show Queue opts in)
- `apps/studio/src/renderer/src/styles/utilities.css` — **final cascade kill-switch** (loads last)
- `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx` — removed page-shell `scrollTop` restore
- Contract: `printRequestPocketFullSizeCounts.contract.test.ts`
- Probe script: `apps/studio/scripts/probe-print-requests-scroll-electron.mjs` (Electron fixture PASSed locally: page shell does not scroll; main + rail do)

**Owner still says the real Studio UI is broken** despite local probe PASS. Treat owner runtime as source of truth.

## Likely reasons owner still sees #3

Investigate these before more CSS thrash:

1. **Electron window not on current Vite CSS** — confirm DevTools computed style on `.page-content-area--print-requests` is `overflow-y: hidden`, not `auto`.
2. **A packaged `release/1.0.11/win-unpacked` build exists** from an earlier `npm run build` in this session — owner must use the Vite/`npm run dev:studio` Electron, not that package.
3. **Another scrollport** may be #3 (not page-content-area) — measure `scrollHeight > clientHeight` live in DevTools on Working vs Queued for: `html`, `body`, `#root`, `.app-shell`, `.app-main`, `.page-content-area`, `.print-requests-page`, `.print-requests-layout`, `.print-requests-main`.
4. **Working-only chrome** (triage bar) + sticky/`100vh` rail leftovers may still expand a different ancestor.
5. Fixture probe may not reproduce real item-card / autosave / sticky geometry.

## Required next-agent approach

1. Open **live** Studio Print Requests Working with a tall request selected.
2. In DevTools, identify the element that actually owns scrollbar #3 (`document.elementsFromPoint` on the scrollbar, or walk overflow + scrollHeight).
3. Diff computed styles Working vs Queued on that element and its ancestors.
4. Apply the **minimal** fix that makes Working match Queued’s computed overflow/height chain.
5. Verify Queued/Printing/Printed and Show Queue unchanged.
6. Only then ask Owner to re-QA.

## Companion UX (separate; do not drop)

Also in this corrective cycle:

- Matching Designs qty alignment vs Design Details stepper
- `Not now` → `Done` after confirmed companion add

Owner’s latest messages focused on scroll; companion may still need visual confirmation.

## Production boundary

Unchanged / forbidden: no production Algolia, deploy, publish, commit, push unless separately authorized.
