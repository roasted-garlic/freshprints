# Plan: AI analysis background on preview (reprocess + persist)

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Goal id | `ai-analysis-background-preview` |
| Related | Existing `artworkBackgroundHex` display/OG mat; `prepareAiAnalysisImage` |

---

## Goal

Let staff change the mat behind the AI Review image preview (top-right control) so they can reprocess with a better analysis canvas for hard cases (e.g. halftone), without changing default auto-processing behavior. Persist the chosen color on the design through Needs Review → Library unless staff changes it in Review.

## Background

Today:

- Studio Review/Edit **Artwork background** (`artworkBackgroundHex`) controls **display mats + OG letterbox only**.
- AI enrichment always composites the preview onto a hard-coded mid-grey canvas `#808080` in `functions/src/ai/prepareAiAnalysisImage.ts`.
- Auto-processing and reprocess both use that fixed canvas; the design field is ignored.

Owner decisions (2026-07-22):

1. **Placement:** top-right of the image preview (processing / review workspace preview).
2. **Persistence:** save with the design; carry into Needs Review and Library if not changed in Review.

### Product interpretation (locked for this plan)

- **One persisted field:** reuse `designs.artworkBackgroundHex` (already on Review form + Edit modal + Portal/OG). No second parallel color system.
- **AI canvas:** `prepareAiAnalysisImage` uses the design’s `artworkBackgroundHex` when present/valid; when **absent**, keep today’s AI default `#808080` so **first-pass auto-processing is unchanged**.
- **Display:** unchanged — missing field still resolves to Portal grey `#e5e7eb` for Studio/Portal mats.
- **Preview wiring:** AI Review workspace preview must actually show `artworkBackgroundHex` (today it often omits the prop).
- **Control:** compact top-right overlay on the preview stage (not only the form fieldset). Same presets as existing artwork background (grey / light black / custom); optional **White** preset for contrast on dark/halftone art if cheap to add to the shared picker.

Reprocess path today is often `resetForProcessing` then later enqueue. Saving the hex on the design **before/as** enqueue is enough for the pipeline to pick it up; no need for a one-shot enqueue-only arg unless save races require it (prefer design-field source of truth).

---

## Scope

### In Scope

- Top-right background control on AI Review workspace preview (`AiReviewWorkspace` preview stage), available at least on **Processing** (retry/reprocess) and **Needs Review** (and Rejected if that tab shows the same preview + reprocess).
- Persist via existing `artworkBackgroundHex` write path (`designService.updateDesign` / review draft → approve already covered).
- Immediate save (or save-on-change) from the overlay so a following reprocess/enqueue reads the new color from Firestore.
- Keep Review form `ArtworkBackgroundFields` in sync with the same draft/design value (one source of truth in the inbox draft when on Needs Review).
- Pass resolved analysis RGB into `prepareAiAnalysisImage` from the design document in `runAiEnrichmentPipeline` (and playground if it can accept an optional hex for parity).
- Wire `DesignThumbnailPanel` in the workspace preview with the current hex so staff see what they’re choosing.
- Unit tests for analysis-image background resolution; focused Studio/UI tests if patterns exist.
- Docs: DATA_MODEL note that field also feeds AI analysis canvas when set; short ADR; BACKEND/DECISIONS as needed.
- Soft-deploy enrichment Functions + manual QA (human).

### Out of Scope

- Changing default auto-import AI canvas when field is unset (must remain `#808080`).
- Separating “display mat” vs “AI canvas” into two persisted fields.
- Forcing OG/Portal to use `#808080`.
- Production deploy.
- Title-completeness regression work (parked awaiting manual QA).
- Brand-logo uploads (still parked).
- Halftone detection / auto-picking a background.
- Batch “apply background to all in queue” (unless trivial; defer).

---

## Affected Areas

### Files / Modules (expected)

- `functions/src/ai/prepareAiAnalysisImage.ts` — accept optional background RGB/hex; default `#808080`
- `functions/src/ai/aiEnrichmentPipeline.ts` — read `artworkBackgroundHex` from design; pass into prepare
- `functions/src/ai/aiEnrichmentPlayground.ts` — optional parity if image path uses prepare
- Tests: `prepareAiAnalysisImage` (+ pipeline unit if present)
- `apps/studio/.../AiReviewWorkspace.tsx` (+ CSS) — top-right overlay control; pass hex into thumbnail
- Shared/reuse: `ArtworkBackgroundFields` patterns or a compact `ArtworkBackgroundPreviewControl`
- `useAiReviewInbox` / services — save hex on change; keep draft synced
- `docs/architecture/DATA_MODEL.md`, `docs/project/DECISIONS.md`

### Architecture Impact

- [x] Details: Same design field; Functions preparation layer reads it. UI overlay is presentation + write of existing field.

### Security Impact

- [x] Details: Validate hex server-side before compositing (reuse `normalizeArtworkBackgroundHex`). Staff-only paths already gate enqueue/update.

### Data Model Impact

- [x] Details: No new field. Document that `artworkBackgroundHex`, when set, also drives AI analysis canvas compositing.

### Backend Impact

- [x] Details: Enrichment pipeline image prep only; soft-deploy `enqueueAiEnrichment` (and any shared prepare consumers). No rules change expected.

### UI / UX Impact

- [x] Details: Top-right compact control on preview; live mat update; form fieldset remains for Needs Review approve flow. Manual visual QA.

### Migration Impact

- [x] None. Existing designs without the field keep current AI default and display grey.

---

## Approach

1. **Shared resolve helper (Functions)**  
   - `resolveAiAnalysisBackground(hex?: unknown) → {r,g,b,alpha}`  
   - Valid design hex → that RGB; else `#808080`.

2. **`prepareAiAnalysisImage(bytes, background?)`**  
   - Use resolved background for resize/extend/flatten.

3. **Pipeline**  
   - After loading design data, pass `data.artworkBackgroundHex` into prepare.

4. **Studio overlay**  
   - Position absolute top-right on `.ai-review-preview-stage`.  
   - Compact control: preset select or swatch menu (grey / light black / custom [+ white if approved]).  
   - On change: update inbox draft when present; **persist to design immediately** via existing update API (staff permission).  
   - Pass current hex into `DesignThumbnailPanel`.

5. **Needs Review sync**  
   - Overlay and `ArtworkBackgroundFields` bind the same draft fields.  
   - Approve continues to write `artworkBackgroundHex` as today — unchanged value carries to Library.

6. **Reprocess**  
   - No change to reset/enqueue sequencing required if hex is already on the design before enqueue.  
   - Ensure retry/reprocess buttons don’t clear `artworkBackgroundHex` (verify `resetAiEnrichmentForProcessing`).

7. **Tests + docs + soft-deploy QA**

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Functions AI / prepare tests | `npx tsx --test` on touched Functions AI tests | yes |
| Functions build | `npm --prefix functions run build` | yes |
| Studio unit tests for draft/sync if added | existing studio test runner for touched files | yes if present |
| Diff check | `git diff --check` | yes |

### Manual

- [ ] Processing tab: change preview bg top-right → mat updates; reprocess → AI results; confirm field persisted on design
- [ ] Halftone-like / light-ink design: light black or white improves readability vs default grey (qualitative)
- [ ] Needs Review: overlay matches form fieldset; leave unchanged → Library keeps hex
- [ ] Needs Review: change in form or overlay → Library gets new hex
- [ ] Fresh import auto-process with no hex: still uses AI `#808080` (no regression)
- [ ] Display/OG still use `#e5e7eb` when field omitted

---

## Human Checkpoints Anticipated

- [ ] Manual UI + reprocess QA after soft-deploy
- [ ] Production deploy — not this phase
- [x] Product decisions recorded above (placement + persist)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Staff confuses display mat with AI canvas | Low | Same field intentionally; hint text: “Also used as AI analysis mat when set” |
| Auto behavior accidentally changes | High | Unset field → keep `#808080`; tests |
| Reset-for-processing clears hex | Medium | Audit reset payload; do not delete `artworkBackgroundHex` |
| Overlay races with concurrent edits | Low | Last-write-wins via design update; draft refresh from snapshot |
| Custom invalid hex | Low | Client + server normalize; reject/ignore invalid |

---

## Rollback Plan

Revert prepare/pipeline + Studio overlay; redeploy Functions. Persisted hex values remain valid display/OG colors.

---

## Documentation Updates Required

- [ ] DATA_MODEL.md (`artworkBackgroundHex` AI canvas note)
- [ ] DECISIONS.md (short ADR)
- [ ] Workflow plan/review/test/signoff
- [ ] Other: BACKEND.md only if enrichment prep is documented there

---

## Open Questions

- [x] Placement: top-right of preview — accepted.
- [x] Persist through review → library if unchanged — accepted via `artworkBackgroundHex`.
- [ ] **White preset:** add `#ffffff` as a first-class preset for halftone contrast? **Default in plan: yes, add to shared artwork background presets** (Review form + overlay). Owner may veto in review if unwanted for Portal mats.

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-22-ai-analysis-background-preview-review.md
- Verdict: **approved**
