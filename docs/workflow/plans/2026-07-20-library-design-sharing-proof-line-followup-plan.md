# Plan: Library design sharing — Design Library proof line (#12 follow-up)

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/plans/2026-07-20-library-design-sharing-custom-requests-plan.md; ADR-FP-108; owner PASS with follow-up |

---

## Goal

When staff shares a Design Library match on an Assisted Creation request (`staffSuggestAssistedCreationCatalogDesign`), also persist a **proofs-array line item** that appears in Studio and Portal Proofs lists, clearly labeled as a **Design Library** recommendation (preview + title), not a custom proof PNG.

## Background

Owner manual QA for #12: **PASS** after saving the library recommendation as a line item under proofs, clearly marked as Design Library. Today #12 writes `fulfillmentMode: "catalog_share"` + `suggestedCatalogDesign` on the request doc and shows a banner on the Proofs tab; the `proofs[]` array stays empty for catalog shares.

**Persist moment:** on staff suggest / send (`staffSuggestAssistedCreationCatalogDesign`) — matches “save the recommendation,” same write as moving to `proof_ready`.

## Scope

### In Scope

1. Extend `AssistedCreationProof` with optional `kind: "catalog_share"` (+ catalog snapshot fields); omit/legacy ≡ image proof.
2. Append a catalog-share proof row in `staffSuggestAssistedCreationCatalogDesign` (empty `storagePath` so purge never deletes catalog assets).
3. Studio + Portal Proofs list/detail: show Design Library labeling, title, catalog preview (not assisted proof Storage).
4. Keep classic proof upload path unchanged; image proof numbering ignores catalog rows.
5. Docs: DATA_MODEL + ADR-FP-108 brief amendment; unit tests for helpers.
6. Decision Log: owner PASS + this follow-up.

### Out of Scope

- Changing approve / Add to Request / email / notification semantics.
- Backfilling historical catalog shares into `proofs[]`.
- Production deploy; Messages rich cards.

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared` — types + helpers (+ tests)
- `functions/src/assistedCreationRequests.ts` — append proof on suggest; purge already skips empty storagePath
- Studio `AssistedCreationRequestsSection.tsx` (+ derivative URL for catalog preview)
- Portal `AssistedCreationDetailPanels.tsx` (`AssistedCreationProofsPanel` / thumbs / modal)
- `docs/architecture/DATA_MODEL.md`, `docs/project/DECISIONS.md` (ADR-FP-108)

### Architecture Impact

- [x] Details: Additive proof `kind`; UI branches on kind; authoritative current suggestion remains `suggestedCatalogDesign`.

### Security Impact

- [x] Details: Server still owns design snapshot; catalog preview paths are public ready-design derivatives (no new ACL). Never store catalog Storage paths in `storagePath` (purge safety).

### Data Model Impact

- [x] Details: `AssistedCreationProof.kind?: "proof_image" | "catalog_share"`; for catalog_share: `catalogDesignId`, `catalogDesignTitle`, optional `catalogPreviewImageUrl`, `storagePath: ""`, `sizeBytes: 0`.

### Backend Impact

- [x] Details: Suggest callable appends proof row; Functions redeploy required for live suggest.

### UI / UX Impact

- [x] Details: Proofs tab lists Design Library rows with badge/label + preview/title; detail modal without proof Download.

### Migration Impact

- [x] Forward: additive; no backfill.
- [x] Rollback: stop appending; old clients ignore `kind`.

---

## Approach

1. Shared types + `isAssistedCreationCatalogShareProof` / image-proof count helpers + tests.
2. Suggest callable appends catalog proof; keep `suggestedCatalogDesign`.
3. Studio/Portal proofs UI branch on kind.
4. Docs + ADR note; update workflow state; run unit/typecheck; manual re-check notes for owner.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit | helper tests in shared | yes |
| Typecheck / Functions build | touched packages | yes |

### Manual

1. Studio: Share library design → Proofs tab shows Design Library row (title + preview).
2. Portal: Proofs tab same; Overview review card still works.
3. Classic proof upload still works; numbering not confused by catalog rows.

---

## Human Checkpoints Anticipated

- [x] Manual UI re-check after implement (owner)
- [x] Functions deploy to `fresh-prints-dev` (human)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Purge deletes catalog assets | High | Empty `storagePath` + kind skip |
| Proof N numbering includes catalog rows | Medium | Count only image proofs |

---

## Approval

- Review: docs/workflow/reviews/2026-07-20-library-design-sharing-proof-line-followup-review.md
