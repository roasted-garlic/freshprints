# Formal Review Amendment: Staff Artwork compatibility, origin-based canonical title, AI sort, and Processing preference persistence

| Field | Value |
|---|---|
| Date | 2026-09-19 |
| Plan | [2026-09-19 corrective plan](../plans/2026-09-19-studio-staff-artwork-ai-review-corrective-plan.md) |
| Review gate | Formal Review — corrective amendment |
| Decision | **APPROVED WITH CONDITIONS** |
| Implementation authorization | Approved only within the bounded scope and conditions below |

## Evidence reviewed

- Studio has one AI Review workspace at `/ai-review` with one sort toggle shared by Processing,
  Needs Review, and Rejected. Existing `window.localStorage` preference helpers are the approved
  persistence pattern.
- Pre-corrective Staff Artwork already carried `sourceFileName`, production, preview, and
  thumbnail paths after finalization. Promotion already copied available derivatives into
  canonical Design paths before deleting the private source. The newly added provenance and
  `importSourceFileName` fields are additive.
- The actual new-record title defect is in the queued/manual AI persistence branch: it stores
  `aiSuggestions.title` but leaves an import-derived Staff Artwork root title unchanged. The
  proposed repair is limited to Designs with `sourceStaffArtworkId` and an untrusted
  import/legacy title source, so normal Imports and Ready Design reprocessing are unchanged.
- Already-promoted legacy Designs are safely identifiable only within the bounded
  `sourceStaffArtworkId` scope. Missing private source documents and source filenames cannot be
  guessed; the proposed reconciliation must report those cases rather than rewrite them.
- The Processing-tab **Auto advance** toggle is one shared `/ai-review` workspace control. It
  currently uses the existing key `fresh-prints.ai-processing.auto-advance` in `sessionStorage`,
  while Studio already uses `localStorage` for durable local UI preferences. The correction can
  retain the key/default/scope and migrate a legacy session value on first read without involving
  Firestore or queue-state persistence.
- Owner DEV read-only evidence confirms the defect is origin-based rather than creation-history-based:
  23 Staff-Artwork-originated Designs were found, 22 with generated short titles and the old
  `catalogTitleSource: "staff"` stamp and no `importSourceFileName`; one already has an AI-owned
  title. This is the prior promotion shape and is sufficient evidence for the bounded compatibility
  rule; no data repair is authorized.

## Conditions

1. Add one workspace-level localStorage preference. A valid URL sort parameter remains an
   explicit route override; when absent, the persisted preference is authoritative; existing
   tab-specific defaults apply only when no preference exists. Do not write this preference to
   Firestore or combine it with unrelated queue preferences.
2. Persist an AI-generated title in the normal queued Staff Artwork path only when the Design is
   Staff Artwork-originated and its root title is import-derived/legacy-unknown. Preserve
   `staff`, `trusted_import`, and existing `ai_generated` authority. Do not alter global AI
   prompts, providers, queue status, approval, normal import, Ready Design reprocess, or customer
   upload behavior.
3. Include real pre-corrective Staff Artwork fixtures: default/short-ID title with omitted
   provenance, explicit title with omitted provenance, source filename, production and derivative
   paths, and the resulting canonical Design shape. Promotion must stay canonical imported/
   pending, derivative-copying, idempotent, and source-removing.
4. Add a DEV-only reconciliation/inventory command that is dry-run by default, hard-pinned to
   `fresh-prints-dev`, scoped to Staff Artwork-originated Designs, and reports repairable versus
   ambiguous/missing-source cases. It may not write in this phase. Any future apply mode must
   require an owner checkpoint and an explicit DEV confirmation.
5. Do not make AI Review read private Staff Artwork documents or Storage paths. If a canonical
   derivative is missing and no surviving source is available, report it; do not weaken Rules or
   create a private-path shortcut.
6. Test sort persistence, unrelated filter/selection stability, new and legacy title handling,
   AI Review visibility, derivative continuity, idempotency/no duplicate Design, and unchanged
   normal workflows. Update the Test report and workflow state, then stop at Owner DEV QA. No
   Signoff, deployment, release, backfill, or bulk repair is authorized.
7. Add focused Auto advance persistence coverage: default ON, explicit OFF/ON writes to
   localStorage, legacy sessionStorage migration only when localStorage is absent, invalid-value
   fallback, and no reset from queue data, filters, pagination, selections, processing actions,
   remounts, navigation, or Studio restart. Keep it distinct from Auto process and AI sort.
8. Treat `sourceStaffArtworkId` as the shared title-authority scope across new, pre-corrective,
   waiting, previously processed, and reprocessed Staff Artwork histories. A prior incorrect
   `staff` stamp may yield only for a bounded legacy placeholder title when the old Design shape
   lacks `importSourceFileName`; human-looking explicit staff titles, current explicit staff titles,
   trusted imports, and already AI-owned titles remain protected.
9. Add a canonical lifecycle verification that checks the persisted title at pre-AI, post-AI,
   AI Review, approval write, post-approval, Design Library, and Portal projection stages. The
   Portal check must consume the ready Design's persisted `title`; AI suggestion presence alone is
   not evidence of success. Do not ask for Owner DEV QA until this Test evidence passes.

The amendment is approved for implementation subject to these conditions.
