# Plan: Cap A exhausted card/modal copy (status only)

**Date:** 2026-07-19  
**Goal:** On Portal design cards and add-to-request modals, Cap A exhaustion shows only **“Daily print limit reached”**. Keep full situational next-step copy on page-level banner / drawer callouts.

## Context

Smart contextual Cap A copy already splits:

- Status: `formatCapAExhaustedStatusLine()` → `"Daily print limit reached"`
- Helper: `formatCapAExhaustedHelperText(situation)` → e.g. `"Add your Current Request to a show."`

Cards/modals currently render both lines (title + hint). Product wants cards/modals status-only; banner keeps status + helper.

## In scope

- Catalog design card, selection card, details modal
- `PortalPrintRequestItemCard` Cap A hints/titles
- Assisted creation / customer upload Cap A control hints (same pattern)
- Doc comment on helper helper so usage stays clear

## Out of scope

- Cap A backend / quota math
- Banner (`PortalPrintRequestDailyQuotaBanner`) and Current Request drawer meta (keep helper)
- Cap B allotment bug (separate active phase)

## Approach

1. Where cards/modals compose `status + "\n" + helper` or render two-line hints, use only `formatCapAExhaustedStatusLine()` / `exhaustedStatusText`.
2. Keep passing `exhaustedHelperText` as the exhausted-context gate where already used (no parent churn).
3. Soft-reload Portal for manual QA (PASS pending).

## Success criteria

- Cards/modals: single line “Daily print limit reached”
- Page banner / drawer: still show next-step helper when exhausted
- No Cap A server/logic changes
