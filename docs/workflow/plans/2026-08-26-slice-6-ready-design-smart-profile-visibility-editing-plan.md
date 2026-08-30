# Plan: Smart Catalog Intelligence — Slice 6 Corrective: Ready Design Smart Profile Visibility + Editing

| Field | Value |
|-------|-------|
| Date | 2026-08-26 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Parent | smart-catalog-intelligence-unattended-enrichment |
| Related | Slice 6 Ready Catalog reprocess (`2026-08-26-smart-catalog-intelligence-slice-6-plan.md`) |

---

## Goal

Enable Studio staff to **see and correct** Smart Profile / automation provenance on **Ready** catalog designs so the owner can verify Ready backfill canary results and fix AI-generated discovery metadata before authorizing full Ready Catalog reprocessing — **without** changing Ready lifecycle, enabling Autonomous, or running bulk reprocess.

---

## Background

Slice 6 Ready preservation + 3-design canary **safety PASS** (job `w5m0vl8DviTeY7vMLrVB`: `remainedReady=3`, `preservationViolations=0`). Owner manual QA is blocked because:

- `DesignDetailsModal` shows root catalog fields but **no Smart Profile**
- Audit & Technical Details shows legacy `aiSuggestions` only
- `AiReviewSmartProfileSection` exists but is **AI Review–only** (read-only dimensions)
- Firestore rules + `UpdateDesignInput` **forbid client writes** to `smartProfile`
- Canary designs now have v30/v4 profiles + automation provenance in Firestore, invisible in Design Details

This corrective is **DEV usability / verification** required before broad Ready backfill QA and full Start authorization.

**Runtime unchanged:** Shadow, Autonomous OFF, production untouched, no full Ready Catalog Start.

---

## Scope

### In Scope

- **Read UI** in Studio Design Details for Ready designs (`status === "ready"`):
  - Processing status badge: **Missing / Older / Current** (from provenance versions, not timestamps alone)
  - Prompt + normalizer version, generatedAt, provider/model
  - Automation decision, reason codes, verifier state, hard-block indicators
  - All 11 Smart Profile dimension lists (read)
- **Audit & Technical Details** supplement: provenance / automation diagnostics (read-only; no duplicate full editor)
- **Controlled editing** of Smart Profile **dimension lists only** (not root category control; not tags)
- **Server-authoritative write path** (callable) preserving Ready lifecycle + approval audit
- **Provenance + reprocess coexistence policy** (staff edit marking + ready_backfill merge rule)
- **Per-dimension reset** to last AI-generated values where snapshot exists
- **Algolia:** reuse existing Ready sync path; verify staff edits re-index projected fields
- **Tests:** shared utils, callable contracts, Studio component contracts, rules tests if rules change
- **Docs:** DATA_MODEL, BACKEND, DECISIONS (ADR), STYLE_GUIDE as needed

### Out of Scope

- Full Ready Catalog reprocess / canary rerun
- Autonomous enablement or Shadow mode change
- Legacy tag retirement or automatic tag ↔ Smart Profile sync
- Design Library **card badges** (evaluate only; defer unless trivial — see UX)
- Portal customer-facing Smart Profile UI
- Editing `smartProfile.categoryId` / category alternatives (root **Edit Design** category remains authoritative)
- Production deploy (DEV-first; production is separate owner checkpoint)
- AI Review Queue UX changes beyond shared component extraction

---

## Affected Areas

### Files / Modules (expected)

**Studio (read + edit UI)**

| Path | Change |
|------|--------|
| `apps/studio/src/renderer/src/features/designs/components/DesignDetailsModal.tsx` | Add Smart Catalog section + link to technical provenance |
| `apps/studio/src/renderer/src/features/designs/components/DesignSmartProfileSection.tsx` | **New** — status badge, dimensions read, edit entry |
| `apps/studio/src/renderer/src/features/designs/components/DesignSmartProfileEditModal.tsx` | **New** — chip/list editor for 11 dimensions |
| `apps/studio/src/renderer/src/features/designs/utils/smartProfilePipelineStatus.ts` | **New** — Missing / Older / Current from provenance vs constants |
| `apps/studio/src/renderer/src/features/designs/services/designSmartProfileService.ts` | **New** — callable wrapper |
| `apps/studio/src/renderer/src/features/ai-review/components/AiReviewSmartProfileSection.tsx` | Extract shared dimension display; fix stale v28 copy → v30 |
| `apps/studio/src/renderer/src/styles/components/design-details.css` (or existing) | Section styling |

**Shared**

| Path | Change |
|------|--------|
| `packages/shared/src/types/catalog/smartProfile.types.ts` | Staff provenance fields |
| `packages/shared/src/constants/catalogReprocess.constants.ts` | Reuse v30/v4 snapshot constants for “Current” |
| `packages/shared/src/constants/smartProfile.constants.ts` | Dimension caps for editor validation |
| `packages/shared/src/utils/smartProfileNormalization.ts` | Reuse for staff input normalization |
| `packages/shared/src/utils/smartProfileStaffEdit.ts` | **New** — merge/reset helpers |

**Functions**

| Path | Change |
|------|--------|
| `functions/src/designs/updateDesignSmartProfileDimensions.ts` | **New** callable — staff patch + lifecycle guards |
| `functions/src/designs/resetDesignSmartProfileDimension.ts` | **New** callable — per-dimension reset (optional combine into one) |
| `functions/src/index.ts` | Export callables |
| `functions/src/ai/aiEnrichmentPipeline.ts` | **Amend** `ready_backfill` success merge for staff-edited dimensions |
| `functions/src/ai/smartProfileBuilder.ts` | Persist `smartProfileAiSnapshot` on AI write (for reset) |

**Rules / tests**

| Path | Change |
|------|--------|
| `firestore.rules` | Keep client deny on `smartProfile` (callable uses Admin SDK) |
| `tests/firebase/designSmartProfileStaffEdit.rules.test.ts` | **New** — client still cannot write smartProfile |
| `functions/src/designs/updateDesignSmartProfileDimensions.test.ts` | Callable unit tests |
| Studio contract tests for status badge + edit gating |

### Architecture Impact

- [x] **Details:** New Studio feature module under `features/designs/`; new Functions callable(s) in designs namespace; shared merge utilities. UI → `designSmartProfileService` → callable → Admin Firestore. **No direct component Firestore writes.** Algolia continues via existing `syncPortalCatalogDesignToAlgolia` trigger.

### Security Impact

- [x] **Details:**
  - Callable: **active staff** minimum (mirror `canEditDesigns`; consider owner-only if product prefers — default **staff** to match Edit Design)
  - Validate design exists; for Ready edits require `status === "ready"` && `aiReviewStatus === "approved"`
  - **Deny** writes that attempt to change `status`, `aiReviewStatus`, approval audit, `readyAt`, root title/description/categoryId/tags
  - Normalize + cap dimension lengths (reuse `smartProfileNormalization` / validation)
  - No client-side `smartProfile` mutation (rules unchanged)
  - Callable logs staff uid on provenance; no secrets in response

### Data Model Impact

- [x] **Details:** Extend `SmartProfileProvenance` (non-breaking optional fields):

```typescript
/** Dimensions staff has explicitly edited; ready_backfill must preserve these keys. */
staffEditedDimensionKeys?: string[];

staffEditedAt?: string;       // ISO
staffEditedBy?: string;       // uid

/** Last AI-generated profile snapshot for staff reset (Functions-written on enrich). */
smartProfileAiSnapshot?: SmartProfileDimensionLists; // sibling field on design doc OR nested under smartProfile
```

**Recommended shape:** top-level optional `smartProfileAiSnapshot` on `designs/{id}` (Functions-only write) + provenance keys on `smartProfile.provenance`. Avoid duplicating full profile twice on every design — snapshot updates **only on AI enrich success** (queue + ready_backfill).

**Migration:** additive optional fields; no backfill required. Existing Ready designs without snapshot: reset-to-AI disabled until next enrich (document in UI).

### Backend Impact

- [x] **Details:**
  - New callables: `updateDesignSmartProfileDimensions`, `resetDesignSmartProfileDimension` (or single `patchDesignSmartProfile` with action enum)
  - DEV deploy allowlist: new callable(s) only for this corrective (no Algolia function redeploy required if sync trigger unchanged)
  - Env: none new

### UI / UX Impact

- [x] **Details:** See **Proposed UX** below. Manual UI/UX review checkpoint after implement.

### Migration Impact

- [x] **Forward:** Optional fields appear on staff edit / next AI enrich
- [x] **Rollback:** Hide UI; callables can remain deployed (no-op if unused). Staff edits persist if already made.

---

## Proposed UX

### Placement

| Surface | Content |
|---------|---------|
| **Design Details main modal** (Overview column, below tags/category) | **Smart Catalog Profile** section — human-readable |
| **Audit & Technical Details** (existing nested modal) | **Smart Profile provenance** block — versions, provider/model, automation diagnostics, verifier, reason codes (read-only) |

Do **not** duplicate the full editable dimension grid in both places.

### Processing status indicator

Derived from `smartProfile.provenance.promptVersion` + `normalizerVersion` vs live constants (`catalog-enrich-v30`, `smart-profile-normalizer-v4`):

| State | Condition | Badge |
|-------|-----------|-------|
| **Missing** | no `smartProfile` | `Smart Profile: Missing` |
| **Current** | v30 + v4 | `Smart Profile: Current (v30 / v4)` |
| **Older** | profile present but not current | `Smart Profile: Older (v27 / v1)` etc. |

Also show: `generatedAt`, `provider` / `model` when present.

### Automation block (read-only)

- `automationDecision` (+ human label: Shadow / Would auto-approve / Needs review / …)
- `wouldAutoApprove` derived: `automationDecision === "shadow"` with `shadow_would_auto_approve` in reason codes OR explicit mapping
- `automationReasonCodes` (list)
- `verifierInvoked`, verifier outcome (from provenance + reason codes)
- Indicators: hardBlocked, categoryGap, categoryDominantIntentConflict (from reason codes / shared utils)

### Editing flow

1. **Edit Smart Profile** button (staff + Ready + approved + profile present OR allow create-empty? — **Out:** creating profile from scratch; **In:** edit when profile exists OR after at least one enrich)
2. Opens `DesignSmartProfileEditModal` with chip inputs per dimension (add/remove, comma or Enter)
3. **Save** → callable → normalize → update `smartProfile` dimension arrays + provenance staff fields
4. **Reset dimension** → callable restores that dimension from `smartProfileAiSnapshot` and removes key from `staffEditedDimensionKeys`
5. Root **Edit Design** unchanged for title, description, category, tags

### Design Library cards

**Deferred** unless implement review finds zero-cost reuse of existing `Badge` in card component without grid churn. Design Details visibility is **required**; card badge is optional follow-up.

---

## Human Override / Edit Policy (Plan Answers)

### Chosen approach: **B — Direct Smart Profile editing with provenance marking**

**Why not A (separate override layer)?** Algolia builder and Studio filters read `design.smartProfile` directly. A separate override layer would require effective-profile projection in Algolia builder, Design Library filters, and reprocess pipeline — wider blast radius for Slice 6 corrective.

**Why B fits:** Matches halftone/background precedent (`isExplicitOverride`, source marking). Staff edits are visible where AI profile lives. Callable enforces guards.

### Policy table

| Question | Answer |
|----------|--------|
| What happens on future Ready reprocess? | `ready_backfill` **merges**: AI replaces non-staff dimensions; dimensions listed in `staffEditedDimensionKeys` **preserved** from pre-run design unless owner uses **Reset all staff edits** action (clears keys + snapshot restore all) before reprocess |
| Can AI overwrite staff edits? | **No** for keys in `staffEditedDimensionKeys` during `ready_backfill`. Queue reprocess N/A for Ready designs. Manual `enqueueAiEnrichment` on Ready must not demote lifecycle (out of scope unless already allowed — **do not invoke** in this corrective) |
| Staff reset to AI? | Per-dimension **Reset** restores from `smartProfileAiSnapshot[dimension]`; disabled with tooltip if no snapshot |
| Algolia indexes | **Effective** `design.smartProfile` (same as today). Staff edits to dimensions → `smartProfileIndexFieldsChanged` → upsert. Provenance-only edits → no sync (classifier ignores) |
| Staff provenance recorded | `provenance.staffEditedAt`, `staffEditedBy`, `staffEditedDimensionKeys` updated on each save; callable sets ISO + uid |
| Root metadata | **Untouched** by Smart Profile editor. Category remains root `categoryId` via Edit Design |

### ready_backfill amendment (binding for implement)

In `markAiSuccess` / worker post-success path for `ready_backfill`:

1. Read pre-enrich `staffEditedDimensionKeys` from design (capture before stage if needed)
2. On success, merge new AI dimension lists but **copy forward** arrays for staff-edited keys from pre-run profile
3. Update `smartProfileAiSnapshot` to full new AI output (pre-merge AI) for reset semantics
4. Do **not** clear `staffEditedDimensionKeys` automatically

---

## Approach

1. **Shared types + utils** — provenance fields, pipeline status helper, merge/reset helpers, tests
2. **Functions callables** — patch + reset; lifecycle assertions; normalization; snapshot update on AI enrich (all modes writing smartProfile)
3. **ready_backfill merge** — preserve staff-edited dimensions (contract tests with slice 6 preservation suite)
4. **Studio read UI** — extract dimension list from `AiReviewSmartProfileSection`; new `DesignSmartProfileSection` in `DesignDetailsModal` for Ready designs; provenance in Audit modal
5. **Studio edit UI** — edit modal + service + permissions (`canEditDesigns`)
6. **Tests + docs + Implementation Review**
7. **DEV deploy callables only** — Studio local dev picks up UI via `npm run dev:studio` (no Studio release required for owner QA on DEV)

---

## Test Strategy

### Automated

| Check | Command / target | Required |
|-------|------------------|----------|
| Shared unit tests | `smartProfileStaffEdit`, pipeline status | yes |
| Functions unit tests | callables, ready_backfill merge | yes |
| Rules tests | client cannot write smartProfile | yes |
| Studio contract tests | status badges, edit button gating, section renders | yes |
| Slice 6 preservation regression | existing ready preservation tests still pass | yes |
| Typecheck | functions + studio + shared | yes |
| Lint | touched paths | yes |

### Manual

- [ ] Open each of 3 canary designs in Studio Design Details — verify Missing/Current/Older, v30/v4, automation, dimensions
- [ ] Edit one dimension on canary A; confirm Ready lifecycle unchanged; Algolia object still present; search/facet reflects edit (DEV index)
- [ ] Reset edited dimension; confirm restore
- [ ] Confirm Audit & Technical Details shows provenance without duplicating editor

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review after implement (owner verifies canary designs)
- [ ] Production deploy (explicitly out of scope — DEV only)
- [ ] None for business logic — policy defined in plan + ADR

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Staff edit lost on full Ready reprocess | High | `staffEditedDimensionKeys` + merge in ready_backfill |
| Client bypass writes smartProfile | High | Keep rules deny; callable only |
| Root category vs profile category drift | Medium | Do not edit profile category in this corrective; document in UI |
| Algolia delete on accidental status change | P0 | Callable hard-fails if lifecycle fields in payload |
| Snapshot missing on old Ready designs | Low | Reset disabled + tooltip; backfill will populate snapshot |

---

## Rollback Plan

- Revert Studio UI (section hidden)
- Disable callables via feature flag constant if added, or leave dormant
- Staff edits remain in Firestore (acceptable); reprocess merge rules remain safe

---

## Documentation Updates Required

- [x] DATA_MODEL.md — staff provenance, snapshot, merge semantics
- [x] BACKEND.md — new callables
- [x] DECISIONS.md — ADR-FP-147 (staff Smart Profile edit + reprocess coexistence)
- [x] STYLE_GUIDE.md — Smart Profile section patterns (brief)
- [ ] ROADMAP.md — note corrective under Slice 6

---

## FreshForge Impact

| Area | Impact |
|------|--------|
| Starter Surface | No AGENTS/.cursor changes |
| Documentation | DATA_MODEL, BACKEND, DECISIONS (project-specific) |
| Development Tooling | None |

---

## Open Questions

- [ ] **Owner decision:** Callable permission = all active staff (recommended, matches Edit Design) vs owner/admin only?
- [ ] **Owner decision:** Allow Smart Profile edit on Ready designs that are `ready` but missing profile (empty state = read-only + “Run enrich first”) — **recommended: read-only until profile exists**

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-26-slice-6-ready-design-smart-profile-visibility-editing-review.md`
- Verdict: pending
