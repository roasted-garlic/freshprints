# Plan: Print-request quota help modal (wider + Cap B)

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Author | Agent |
| Status | complete |
| Workflow | managed-phase |
| Related | Cap A/B print-request limits; Portal quota banner |

---

## Goal

Widen the Portal print-request quota help modal and include the live **per-show print max** (Cap B / `maxQuantityPerShowPerCustomer`) from Settings, not a hardcoded number. Banner stays short; modal explains daily quota and per-show max in plain language.

---

## Scope

### In Scope

- Widen `.portal-print-request-quota-help-modal` beyond current `24rem`
- Extend `getPrintRequestDailyDesignQuota` response with `maxPerShow` from live Settings
- Update help modal copy helper + unit tests; wire banner to pass both limits
- Soft-reload Portal; deploy callable to `fresh-prints-dev` if payload changes
- Brief BACKEND.md note on response field

### Out of Scope

- Production deploy
- Cap B enforcement changes
- Exposing full Settings docs to customers
- Banner copy changes (remain short daily-only)

---

## Approach

1. Add `maxPerShow` to `GetPrintRequestDailyDesignQuotaResponse`; return `settings.maxQuantityPerShowPerCustomer` from `readPrintRequestDailyDesignQuota`.
2. Update `dailyPrintAddsHelpModalCopy(dailyLimit, maxPerShow)` with plain Cap B line using live value.
3. Banner stores `maxPerShow`, passes both into copy; modal title → "Print limits"; CSS `max-width` → ~32rem.
4. Deploy `getPrintRequestDailyDesignQuota` to `fresh-prints-dev`; soft-reload Portal.

---

## Test Strategy

| Check | Required |
|-------|----------|
| Unit: help copy includes live Cap B; no em dashes / Cap jargon | yes |
| Portal typecheck | yes |
| Functions deploy to fresh-prints-dev | yes (payload change) |
| Soft-reload Portal | yes |

---

## Risks

| Risk | Mitigation |
|------|------------|
| Old callable without `maxPerShow` | Deploy before relying on UI; copy falls back to generic phrase if null |
