# Review: Studio Design Library archive / search consistency

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-09-02-studio-design-library-archive-search-consistency-plan.md |
| Verdict | **approved** |

---

## Summary

Plan correctly identifies two independent, source-verified Studio defects: (1) managed Algolia hydrate trusts index membership and never requires `status === "ready"`, and (2) archive success only refreshes the disabled Firestore list while managed search owns the grid. Proposed fix is Studio-scoped, defense-in-depth with existing Algolia leave-ready delete, preserves ADR-FP-084 purged Archive-browse hide, and correctly parks optional Algolia reconcile as an owner decision. Implementation may proceed after this approval; production remains NOT AUTHORIZED.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Studio membership + archive reconciliation; no Portal/Functions/Rules |
| Architecture alignment | pass | Firestore status authoritative over Algolia IDs |
| Security impact addressed | pass | Stops archived/purged selection via stale search UI; service gate already exists |
| Data model impact addressed | pass | No schema change; purge marker `assetsPurgedAt` correctly identified |
| Backend impact addressed | pass | Existing sync traced; no new Function required |
| Test strategy adequate | pass | Unit/contract + Owner QA matrix |
| Human checkpoints identified | pass | Owner QA; optional reconcile; ADR purge visibility |
| Roadmap alignment | pass | Bugfix; deferred goals untouched |
| Documentation plan | pass | Optional pointers; ADR change only if owner reverses |
| No silent scope expansion | pass | Explicit out-of-scope list |

---

## Root-cause verification (against current development source)

### RC1 — Archive mutation leaves main-list card (managed search)

**Verdict: CONFIRMED**

Evidence:

- `handleArchiveConfirm` only `await refreshCatalog()` after `archiveDesign` (`DesignLibraryPage.tsx` ~825–836).
- `useDesigns(..., { enabled: … && !managedSearchActive })` (`DesignLibraryPage.tsx` ~306–308).
- `managedSearchActive` when ready + (search / tags / category / smart) (~256–263).
- Restore/purge use `removeDesignFromList`; archive does not (`designLibraryArchiveRestoreReconciliation.contract.test.ts` documents restore/purge only).

Browse-only archive (managed off) is lower risk because `reloadDesigns` hits a `status==ready` query after cache invalidation.

### RC2 — Algolia / search leak of archived (incl. image-purged)

**Verdict: CONFIRMED**

Evidence:

- `hydrateStudioDesignsPreservingOrder` returns any doc from `getDesignsByIds` with **no** status filter (`studioAlgoliaCatalogSearchService.ts` ~72–84).
- Managed hook filters smart filters only (~147–157, ~251–253), not status.
- Portal contrast: `mapCatalogDesign` requires `status === 'ready'`.
- Index delete on leave-ready **is wired** (`syncPortalCatalogDesignToAlgolia.ts`); stale IDs remain possible on sync failure — Studio still must not trust them.

### RC3 — Full design-ID bypass

**Verdict: NOT a current bypass**

`designVisibleForExactIdLibrary` already scopes ready vs archived and rejects `assetsPurgedAt`. Keep and share; do not “fix” by removing it.

### RC4 — Image purge contract

**Verdict: CONFIRMED as documented**

- Purge sets `assetsPurgedAt`/`assetsPurgedBy`; status stays `archived`; thumbnail kept (`purgeArchivedDesignAssets.ts`, ADR-FP-084).
- Metadata retention intentional.
- Archive browse hides purged (`visibleDesigns` filter) — matches ADR / DATA_MODEL / SECURITY, **not** the task brief’s “visible in Archive” wording.

### RC5 — Cache / stale UI

**Verdict: CONFIRMED for managed-search React state**

Primary stale surface is in-memory managed search list, not Firestore page cache after archive (mutation invalidates caches). Plan correctly forbids `window.location.reload()`.

---

## Architecture Review

**Findings:**

- Ready browse query and Archive query are correctly status-scoped today.
- Membership rules are fragmented (list query vs exact-ID vs hydrate vs purge hide). Shared helper is justified and narrow.
- Archive search remains page-local — do not force Algolia onto Archive (ready index cannot answer).

**Required changes:**

- [ ] None beyond plan approach

---

## Security Review

**Findings:**

- Request-selection shares managed hydrate leak for display; `printRequestService` rejects non-ready adds (~623–624) — defense in depth still required at UI/hydrate.
- No Rules/Storage Rules changes needed.
- No secrets / Algolia admin key in Studio.

**Required changes:**

- [ ] None

**Human approval needed before production:**

- [x] Production remains NOT AUTHORIZED for this entire goal

---

## Data Model Review

**Findings:**

- Status set `{imported, processing, ready, rejected, archived}` unchanged.
- Purge marker is `assetsPurgedAt`, not `imagesDeleted`.
- Plan correctly refuses hard-delete of archived metadata.

**Required changes:**

- [ ] None

---

## Backend Review

**Findings:**

- Algolia leave-ready delete already present — prefer Studio filter (A) + keep existing sync (B); do not invent new index infrastructure.
- Optional reconcile callable exists — **[NEEDS OWNER DECISION]** to run; not part of implement gate.
- No Functions deploy required for Studio-only fix.

**Required changes:**

- [ ] None

---

## Testing Review

**Findings:**

- Plan matrix maps to automated + Owner QA adequately.
- Must add contract coverage that archive reconciles managed list (today’s archive/restore contract only asserts restore/purge local remove).
- Exact-ID regression tests remain high priority (already green — keep).

**Required changes:**

- [ ] None (implement must add the planned tests)

---

## Documentation Review

**Findings:**

- ADR-FP-084 vs task brief purge-in-Archive visibility conflict correctly escalated.
- Plan default preserve ADR is correct for this review.

**Open owner decisions (non-blocking for implement of Studio ready-leak fix):**

1. **[NEEDS OWNER DECISION]** Optional Algolia reconcile/backfill for stale objectIDs.
2. **[NEEDS OWNER DECISION]** Whether to reverse ADR-FP-084 and show purged designs in Archive browse (out of default scope).

---

## Required Changes (if approved_with_changes)

N/A — **approved** as written. Implement must follow plan Approach + preserve ADR purge-browse hide.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Every owner root-cause question was traced to exact development paths. The two user-visible defects have high-confidence, independent causes with a small Studio-only remediation that matches architecture (Firestore authority) and security (ready-only catalog selection). Scope excludes production, Portal UI, Rules, indexes, migrations, and automatic Algolia reconcile. Open owner decisions do not block the Studio membership fix.

---

## Next Step

**Await owner go-ahead to Implement** (user asked Plan + Formal Review then STOP). When owner says continue: Implement → Test → Owner QA → Signoff → commit → push `development` only.
