# Amendment 8 Phase 1A — Assisted catalog-share artwork background correction

| Field | Value |
|---|---|
| Date | 2026-08-05 |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| Base HEAD | `4ed41bc6e9cacf55f74c68633762d86b3eb38e46` |
| Correction commit | `bc9e7e779dd529e5b54faf562938f78aa675caae` |
| Scope | Narrow Phase 1A correction only |
| Owner Phase 1A QA | **PASS WITH NOTES** (artwork mat on Assisted catalog-share) |
| Signoff | **Not started** — owner re-QA required after scoped Functions deploy |
| Independent Implementation Review | **APPROVED** (after required Portal proofs-list live-resolve fix) |

## Root cause

Assisted catalog-share UI rendered transparent catalog PNGs against the theme default `--color-artwork-preview-bg` and did not carry the ready design’s `artworkBackgroundHex`. The suggest callable also did not snapshot that public display field onto the Assisted request.

## Correction

- Shared helpers: `snapshotAssistedCatalogArtworkBackgroundHex`, `buildAssistedCatalogShareArtworkBackgroundSnapshots`, `resolveAssistedCatalogShareArtworkBackgroundHex`, `needsAssistedCatalogShareArtworkBackgroundLiveResolve`
- Functions `staffSuggestAssistedCreationCatalogDesign` snapshots authoritative design-doc hex onto `suggestedCatalogDesign.artworkBackgroundHex` and `proof.catalogArtworkBackgroundHex` (optional; omit when missing/invalid)
- Studio picker / overview / proofs apply CSS mat; legacy one-shot `getDesignById`
- Portal status stage, lightbox, proofs list (panel-scoped), proof modal, approved card apply CSS mat; legacy one-shot `getReadyDesignsByIds`
- Client suggest payload remains `requestId` + `designId` (+ optional note) — no client hex

## Commands run

### Focused + Assisted regression

```bash
npx tsx --test \
  packages/shared/src/utils/assistedCreationCatalogShareArtworkBackground.test.ts \
  packages/shared/src/constants/design/artworkBackground.constants.test.ts \
  packages/shared/src/utils/assistedCreationProofKind.test.ts \
  packages/shared/src/utils/assistedCreationTransitions.test.ts \
  packages/shared/src/utils/assistedCreationApprovedProofRetention.test.ts \
  apps/studio/src/renderer/src/features/customer-requests/utils/assistedCatalogShareArtworkBackground.test.ts \
  apps/studio/src/renderer/src/features/customer-requests/utils/assistedCatalogPhase1aCompleteness.test.ts \
  apps/studio/src/renderer/src/features/customer-requests/utils/assistedCatalogPickerBrowseContract.test.ts
```

**Result:** `# tests 66` / `# pass 66` / `# fail 0`

### AI Processing regression (unmodified)

```bash
npx tsx --test \
  apps/studio/src/renderer/src/features/ai-review/utils/monotonicAiProcessingListMerge.test.ts \
  apps/studio/src/renderer/src/features/ai-review/hooks/aiProcessingMonotonicReconciliation.wiring.test.ts \
  apps/studio/src/renderer/src/features/ai-review/utils/backgroundAiQueueReconciliation.test.ts \
  apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.observerSubscription.test.ts \
  apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.liveDesignReconciliation.test.ts \
  apps/studio/src/renderer/src/features/ai-review/hooks/aiProcessingReconciliation.test.ts \
  apps/studio/src/renderer/src/features/imports/services/importAiBackgroundQueueSequencing.test.ts
```

**Result:** `# tests 60` / `# pass 60` / `# fail 0`

### Typecheck / build / lint

| Check | Result |
|---|---|
| Studio `tsc --noEmit` | exit 0 |
| Portal `typecheck` | exit 0 |
| Functions `build` | exit 0 |
| Studio Vite build (renderer/main/preload) | exit 0 |
| Portal `build:portal` (initial attempt) | **blocked** — concurrent `npm run dev:portal` held `.next` |
| Portal `build:portal` (final checkpoint 2026-08-06) | **PASS** — stopped Portal `next dev --port 3100` only; removed `apps/portal/.next`; `npm run build:portal` exit **0** (compiled, typed, 19/19 static pages) |
| `npm run lint` | exit 0 |
| `git diff --check` (changed paths) | exit 0 |

### Final development checkpoint (2026-08-06)

| Check | Result |
|---|---|
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| HEAD | `bc9e7e779dd529e5b54faf562938f78aa675caae` (clean vs origin; no unrelated source drift) |
| Portal production build | **PASS** (exit 0) after stopping local Portal dev only |
| Scoped Functions deploy | **Awaiting owner approval** — exact command prepared; not executed |

## Owner result (Phase 1A)

**PASS WITH NOTES** (2026-08-05) — note addressed by correction.  
**Owner re-QA:** **PASS** (2026-08-06).  
Signoff: `docs/workflow/reviews/2026-08-05-amendment-8-phase-1a-signoff.md` — **approved_with_notes**.

### Residual (non-blocking)

Scoped deploy of `staffSuggestAssistedCreationCatalogDesign` to `fresh-prints-dev` was prepared but not executed (no explicit deploy-approval phrase). Display QA passed with live-resolve/CSS mats.
