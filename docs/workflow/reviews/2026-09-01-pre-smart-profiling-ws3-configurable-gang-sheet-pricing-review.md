# Formal Review: WS3 Configurable Gang-Sheet Price / Weight Tiers

| Field | Value |
|-------|-------|
| Date | 2026-09-01 |
| Plan amendment | `docs/workflow/plans/2026-09-01-pre-smart-profiling-ws3-configurable-gang-sheet-pricing-amendment.md` |
| Verdict | **approved** |
| Production | **NOT AUTHORIZED** |

---

## Summary

Amendment correctly supersedes hard-coded WS3 tiers with persisted Show Queue Settings on the existing `settings/showQueue` document. Architecture reuses owner/admin Firestore merge writes, renderer → IPC → compositor propagation, and grouped-only cache fingerprinting. No migration, no Portal surface, Standard mode unaffected.

**Implementation authorized** per owner prompt.

---

## Review checklist

| # | Item | Finding |
|---|------|---------|
| 1 | Settings document/service | `settings/showQueue` — `showQueueSettingsService` |
| 2 | Persisted fields | Five optional `gangSheet*` pricing fields (see plan) |
| 3 | Edit permissions | Owner + Admin (`canManageShowQueueSettings` / `isOwnerOrAdmin`) |
| 4 | Electron propagation | Resolved config on `ExportGangSheetPngRequest.sectionPricing` |
| 5 | Cache fingerprint | `sectionSummaryVersion: 2` + full pricing config for grouped modes |
| 6 | Defaults | 5″ cutoff; $1/0.40 small; $2/0.75 large |
| 7 | Rules | Allowlist extension only — **required before save works in prod/dev** |
| 8 | Migration | None |
| 9 | Value changes need redeploy? | No (after initial Rules + Studio ship) |
| 10 | Standard mode | No summary; fingerprint excludes pricing |

---

## UI note

Show Queue Settings modal uses **sections**, not tabs. Amendment adds **Pricing & Weight** section — smallest repo-consistent structure.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Rules not deployed before QA | Document DEV deploy scope; block save until Rules deployed |
| Stale grouped cache | Fingerprint includes full pricing config |
| Helper cannot edit settings | By design — owner/admin only (existing pattern) |

---

## Open items

None blocking implementation.
