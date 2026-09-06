# Review: Studio customer-upload artwork background auto-detect (import parity)

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-09-05-studio-customer-upload-import-parity-artwork-background-auto-detect-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Plan correctly reuses the shared import light-art detector at customer-upload finalize time and wires Studio intake `autoSuggestsDark` (today hardcoded false). Portal stays out of scope. Scope is narrow, fail-soft, and aligned with existing `code_auto` / display-mat semantics.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Studio + processing only; no Portal UI; no threshold retune |
| Architecture alignment | pass | Shared util + Functions write; Studio staff UI only |
| Security impact addressed | pass | Trusted finalize; staff callable gated; fail → no dark |
| Data model impact addressed | pass | Additive boolean + existing artwork bg fields |
| Backend impact addressed | pass | finalize / ZIP / retry + Auto restore on staff callable |
| Test strategy adequate | pass | Unit/contract + manual Studio smoke |
| Human checkpoints identified | pass | Manual Studio smoke; DEV deploy separate |
| Roadmap alignment | pass | UX parity with import; does not block TD-034 park |
| Documentation plan | pass | DATA_MODEL + short ADR |
| No silent scope expansion | pass | Explicit out-of-scope list |

---

## Architecture Review

**Findings:**
- Reusing `suggestDarkArtworkBackgroundFromPngBytes` avoids duplicating thresholds.
- Studio already shares `ImportPreviewControls`; wiring `autoSuggestsDark` is the missing link.
- Do not introduce renderer/sharp; keep detection server-side on production PNG.

**Required changes:**
- [x] When rewriting detection on retry/reprocess and detector returns false: **clear** prior `suggestDarkArtworkBackground` and prior `code_auto` fields if present (and not `staff_manual`). Do not leave a stale true hint after art that no longer suggests dark.

---

## Security Review

**Findings:**
- No new Portal exposure.
- Staff Auto restore writing `code_auto` is acceptable (server-authored provenance), not client-invented.

**Required changes:**
- [ ] None

**Human approval needed before production:**
- [ ] None for implement; DEV/prod Functions+Studio deploy still need owner auth later

---

## Data Model Review

**Findings:**
- `suggestDarkArtworkBackground` mirrors import IPC hint; keep optional boolean.
- `code_auto` already documented for designs; extend customerUploads note.

**Required changes:**
- [ ] None beyond plan + Architecture stale-hint clear rule

---

## Backend Review

**Findings:**
- Three ready writers must stay in sync (finalize, ZIP, retry).
- Prefer attaching detection on `CustomerUploadProcessingSuccess` once so all writers share one path.

**Required changes:**
- [x] Implement detection inside / immediately after `processCustomerUploadImageBytes` success (or a shared helper used by all three writers) so ZIP/retry/finalize cannot drift.

---

## Test Review

**Findings:**
- Existing CU preview contract tests must gain `autoSuggestsDark: true` cases.
- Processing test with synthetic light sparse PNG → suggest true is valuable if fixtures exist / cheap to build.

**Required changes:**
- [ ] None

---

## Required changes for implementation

1. Centralize detection on processing success result so finalize / ZIP / retry cannot diverge.
2. On reprocess when not `staff_manual`: rewrite detector outcome; clear stale `suggestDark` / `code_auto` when detector is false.
3. Never clear `suggestDarkArtworkBackground` from staff Auto/Light/Dark except via reprocess rewrite rules above.
4. Historical backfill remains out of scope (owner can Retry processing for key rows).

---

## Verdict rationale

Approved with the above implementer constraints. Safe to implement.
