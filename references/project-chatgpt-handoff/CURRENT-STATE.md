# Fresh Prints — Current State Snapshot

## CURRENT AUTHORITATIVE PHASE — STUDIO STAFF ARTWORK → AI REVIEW CORRECTIVE — PRODUCTION CLOSEOUT

**Last updated:** 2026-09-19

Managed goal `studio-staff-artwork-ai-review-corrective` has **Owner DEV QA: PASS** and Signoff
**approved_with_notes**. Production closeout is in progress under owner authorization.

### Proven root cause (preserved)

1. Correct AI title lived in `aiSuggestions.title`; wrong title in canonical `designs.title`.
2. DEV catalog autonomy trusted mis-stamped `catalogTitleSource: "staff"` hex/placeholder roots in
   `resolveFinalCatalogCopy`, so Ready finalization could restore the Staff short ID.
3. Pipeline write order allowed `finalCatalogFields` to overwrite Staff-origin helper writes.
4. An earlier corrective passed **119/119** local tests while live DEV Functions were still stale —
   automated PASS did not prove the deployed runtime path.

### Fix

- Bounded Staff-origin placeholder exception in `resolveFinalCatalogCopy`
- Staff Artwork AI title helper repairs `staff`+placeholder even with `importSourceFileName`
- `staffArtworkTitleFields` spread after `finalCatalogFields`
- Promotion/create/edit provenance; Studio Send to AI / pagination / preference persistence
- DEV Functions deployed; Owner DEV QA PASS confirmed canonical title through Design Library

### Production closeout surfaces (authorized)

- Functions: `enqueueAiEnrichment`, `reprocessReadyDesignWithAi`, `onCatalogReprocessJobWritten`,
  `promoteStaffArtworkToAiReview`, `createStaffArtworkUpload`, `updateStaffArtwork`
- Firestore indexes: Staff Artwork `__name__` tie-breakers only
- Studio release **1.0.17** for approved client deliverables
- No Portal redeploy, Rules, Storage Rules, or reconciliation apply

### Explicitly unauthorized

Legacy Staff Artwork reconciliation/backfill writes; unrelated customer-upload and portal-halftone
index work left out of this commit.

Artifacts: `docs/workflow/plans/2026-09-19-studio-staff-artwork-ai-review-corrective-plan.md`,
reviews, test reports, and
`docs/workflow/reviews/2026-09-19-studio-staff-artwork-ai-review-corrective-signoff.md`.

## CURRENT AUTHORITATIVE PHASE — STUDIO INTAKE PROMOTION REVERSAL — PRODUCTION ROLLOUT COMPLETE

**Last updated:** 2026-09-18

Managed goal `studio-intake-review-efficiency-and-customer-upload-promotion-reversal` is closed.
Owner DEV QA is **PASS**. The final implementation candidate is
`f6df49882f80a7a8029610659178bc0bc1c56925`; protected PR **#104** merged it to production as
`e6e90cdd14ea6a0d468c54412c195fa7a689823e`.

The reviewed server lifecycle is implemented exactly as:

```text
validate provenance/eligibility
→ invalidate active AI attempt
→ safely remove derived design assets
→ delete design document
→ restore customerUpload to intake-excluded
```

Studio release **v1.0.16** was published for the client surfaces in that goal.
