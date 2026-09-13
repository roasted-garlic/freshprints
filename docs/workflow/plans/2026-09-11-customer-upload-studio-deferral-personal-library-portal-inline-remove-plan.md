# Plan: Defer Studio upload intake until Add to Show, personal library retention, Portal inline remove

| Field | Value |
|-------|-------|
| Date | 2026-09-11 |
| Author | FreshForge Planning |
| Status | complete — Signoff approved_with_notes 2026-09-11 |
| Workflow | managed-phase (corrective / follow-up child) |
| Parent | Coordinated production promotion and release readiness |
| Prior child | `pre-freeze-owner-qa-correctives-request-editing-live-sync-and-denied-intake` (DEV deployed; Signoff blocked by Owner QA findings below) |
| Related owner decisions | A1, B1, C (30-day personal bucket + dual-tab Portal), D (no Studio Pending **or** Denied until Add to Show), Portal inline remove like Studio, Studio audible queue alert only after success UI |
| Owner acceptance | 2026-09-11 — accepted Formal Review; additive Workstream A authorized |

---

## Goal

1. **Studio Uploaded Designs** must not list a customer print-request upload on **Pending** or **Denied/Excluded** until that upload’s Print Request has been **successfully added to a show**.
2. Keep production-safe asset retention: **A1** reject/exclude from catalog intake without hard-deleting under dependency; **B1** hard delete / auto-purge only when no print-request items and no active/future allocations (gangsheet/export always wins, including shows >14 days out).
3. Deliver (soon) a **Portal personal image bucket**: denied-for-library uploads reusable for ~**30 days**; later dual tabs for personal vs Design Library cards.
4. Replace the Portal print-request **Remove design?** modal with Studio’s **inline** Duplicate / Cancel / Confirm pattern.
5. Studio **audible** Staff Inbox queue alert must fire only after the Add-to-Show process has fully completed and success is shown to the actor (Portal customer or Studio staff) — not while “Adding…” / mid-celebration.

---

## Background

Owner DEV QA on the prior corrective found:

- Uploads appearing in Studio Uploaded Designs before Add to Show (owner wants **neither** Pending nor Denied until then).
- Hard-delete blocked while attached to a print request item (correct under B1; staff should Reject/Exclude instead).
- Desire for a bounded personal reuse library (not indefinite hosting).
- Portal request page Remove still uses a confirm modal; Studio item cards already use inline confirm.

**Full-size Storage:** Owner believed full-size might not be saved until Add to Show. Current architecture finalizes/stores production assets on upload/attach so Portal Current Request, quality gates, and later queue/export work. **Recommended:** keep saving full-size on finalize/attach; enforce Studio **visibility** and **retention clocks** instead of delaying Storage writes. Owner accepted “whatever works best for the app.”

Prior child’s immediate Denied tab (classification-A on attach deny) is **superseded** by D for print-request uploads: Denied/Excluded Studio visibility waits for successful show submit. Retention semantics for personal reuse move toward the **30-day** personal bucket (C), with B1 blockers.

---

## Scope

### In Scope

#### Workstream D — Studio intake deferral (blocking for freeze)

- Affirmative Allow attach: remain `not_eligible` until Add to Show → then `pending_staff_review` (existing Workstream E; verify no regression).
- Don’t-allow attach: **must not** appear on Studio Denied/Excluded **or** Pending until Add to Show.
  - Recommended approach (app-efficient): keep durable denial fields / personal-bucket eligibility on the upload, but **gate Studio list/count queries** (and any badge) on “print request has successful show allocation” (or equivalent trusted flag set in the same TX as queue/allocate). Prefer not inventing a third catalog status if gating is clearer.
  - On successful Add to Show while still library-denied: then surface on **Denied**; while Allow: surface on **Pending**.
- Staff Excluded after the upload is already show-submitted may remain on Excluded (existing staff action); do not reintroduce pre-show Studio visibility for customer-denied rows.
- Docs: `DATA_MODEL.md` intake timing + Denied visibility; update prior corrective plan notes that immediate Denied-on-attach Studio visibility is superseded.
- Contracts/tests for query/filter + confirmation patch callers.

#### Workstream R — Portal inline Remove confirm (small, same child)

- Portal print request detail (and Current Request drawer/card if it shares the same Remove modal path): remove `PortalConfirmModal` for per-item remove.
- Match Studio `PrintRequestItemCard`: keep Duplicate; on Remove click → show Cancel (ghost) + Confirm (danger); Confirm calls existing remove handler.
- Preserve qty-0 restore / cancel behavior currently tied to modal cancel.
- Contract/UI test as appropriate; owner visual QA.

#### Workstream A — Studio audible queue alert after success UI (same child)

- **Bug:** Staff Inbox plays `request_queued_to_show` (and often coalesced `show_queue_full`) when Firestore first shows the new allocation group — typically as soon as the queue TX commits — while Portal/Studio UI is still on “Adding…” or mid capacity-bar celebration (~1400ms after the callable returns).
- **Fix:** Defer sound + toast presentation for newly queued groups until after a **post-commit settle window** long enough to cover callable return + capacity celebration (`SHOW_CAPACITY_BAR_ANIMATION_MS` + modest network buffer), while still coalescing queue-add + show-full into one sound.
- **Studio local allocate:** Also suppress or hold alerts for in-flight `printRequestId:showId` groups started by this Studio session’s Add-to-Show until that modal’s success celebration finishes (then present once if still unacked).
- Do not require Portal→Studio client signaling. Do not remove alerts; only delay presentation.
- Contract/unit coverage for settle timing / suppress-until-complete behavior.

#### Workstream C — Personal library + 30-day retention (same program, soon — may ship as sequenced Implement slices)

- **C1 (retention):** Don’t-allow / not-in-library print-request uploads: **30-day** personal reuse window; auto-remove from personal bucket when eligible under **B1** (no PR items, no active/future allocations). Align or replace the prior child’s 14-day Denied `catalogRetentionStartedAt` clock for **customer_permission_denied** with this 30-day personal policy; keep staff-Excluded policy explicit (recommend keep prior 14-day staff Excluded unless owner says otherwise — default **keep staff Excluded at 14 days**).
- **C2 (Portal UX):** Reuse the existing customer dashboard **Your designs** gallery (`AccountArtworkGallery` / modal tabs) — do **not** build a separate personal-library section.
  1. **Personal / not-in-library tab** (reuse or reshape the current Uploaded / personal list) — Don’t-allow / not-promoted uploads in the personal bucket; Add to Request; auto-drop after 30 days when B1 allows.
  2. **Design Library / promoted tab** (reuse the existing reusable/catalog tab surface) — their **promoted** library designs with normal design-card look/feel + Add to Request.
- Clarify product fact in UI copy: **Allow ≠ instantly in Design Library**; library tab shows **promoted** designs (and any already-catalog designs they can use), not merely “Allow” consent.
- Out of scope for C2: a brand-new dashboard module or parallel gallery route.

### Out of Scope

- Production deploy / freeze / scheduler activation without separate owner authorization.
- Delaying full-size Storage writes until Add to Show (rejected for app efficiency unless a later phase revisits).
- Changing hard-delete blockers away from B1.
- Indefinite personal hosting.
- Broader Account artwork gallery redesign beyond reshaping **Your designs** tabs for C2 (personal vs promoted library).
- Donated Designs intake timing (donate may still enter Pending immediately — unchanged unless owner says otherwise).

---

## Affected Areas

### Files / Modules (expected)

- `functions/src/lib/customerUploadCatalogConfirmation.ts` (+ tests)
- `functions/src/queuePortalPrintRequestToShow.ts`, `onShowAllocationCreated.ts` (visibility / Denied advance hooks)
- Studio: `customerUploadIntakeQueries.ts`, `useCustomerUploadIntake.ts`, `fetchIntakeDocsForMatchedCustomers.ts`, `CustomerUploadIntakeSection.tsx`, pending/denied count hooks
- Portal: `PortalPrintRequestItemCard.tsx`, `PrintRequestDetailView.tsx` (and drawer card path if separate)
- Retention: `purgeExpiredCustomerUploadCatalogRetention.ts` / shared helpers; possibly new personal-bucket purge predicate
- Portal C2: extend `AccountArtworkGallery` / `AccountArtworkGalleryModal` / `useAccountArtworkGallery` (dashboard **Your designs**) — no new gallery section
- `docs/architecture/DATA_MODEL.md`, ADR notes / `DECISIONS.md` as needed
- Contracts for deferral + inline remove

### Architecture Impact

- [x] Details: Studio intake remains purpose + status queries with an additional **show-submitted** eligibility gate for print-request Denied (and verify Pending already gated via status). Portal gains personal-bucket listing. No new public unauthenticated endpoints.

### Security Impact

- [x] Details: Retention/purge remains Admin/trusted paths with existing deletion blockers (B1). Portal personal library is customer-scoped only. No Rules relaxation without review.

### Data Model Impact

- [x] Details: May add or reuse a trusted “entered Studio intake / show-submitted” signal (allocation-derived or field set in queue TX). Personal 30-day clock field may reuse/extend `catalogRetentionStartedAt` for denied-library or introduce a dedicated personal-bucket timestamp — choose one in Implement and document. Staff Excluded retention remains distinct if clocks differ.

### Backend Impact

- [x] Details: Confirmation + queue/allocate paths; retention scheduler predicates; no production scheduler enable without owner phrase.

### UI / UX Impact

- [x] Details: Studio lists empty for pre-show uploads; Portal inline remove; C2 dual tabs inside existing **Your designs** (not a new section). Manual QA required.

### Migration Impact

- [x] Forward: Existing pre-show Denied rows in DEV may remain visible until purged or filtered by the new gate; document one-time DEV cleanup optional, not required for prod freeze.
- [x] Rollback: Revert query gate / UI; retention clock change reversible by redeploy + doc note.

---

## Approach

1. **Lock product rules in docs** (DATA_MODEL): pre-show = no Studio Pending/Denied; full-size may exist; A1/B1; personal 30-day + B1; staff Excluded 14-day default.
2. **Implement Workstream D** — Studio query/filter (+ confirmation if status write changes); queue/allocate surfaces Denied or Pending appropriately; contracts green.
3. **Implement Workstream A** — defer Staff Inbox queue sound/toast until after success settle; local Add-to-Show suppress-until-complete.
4. **Implement Workstream R** — Portal inline remove parity with Studio; remove item modal for that path only.
5. **Implement Workstream C1** — 30-day personal retention under B1; adjust scheduler/docs; DEV deploy only when authorized.
6. **Implement Workstream C2** — reshape dashboard **Your designs** tabs (personal vs promoted library); no new section.
7. **Owner DEV QA** per workstream; then Signoff; prior child’s Signoff reconciles “Denied immediate” as superseded.

---

## Test Strategy

### Automated

| Check | Required |
|-------|----------|
| Confirmation / intake eligibility / Studio query contracts | Yes |
| Retention predicate unit/contract (30-day personal + B1 blockers) | Yes (C1) |
| Portal inline remove contract (no Remove modal; Cancel/Confirm present) | Yes (R) |
| Functions build / Portal typecheck / targeted lint | Yes |
| Broad suite | Document baselines; do not block on known unrelated failures |

### Manual

| Check | Required |
|-------|----------|
| Upload + Allow on draft → Studio Pending empty until Add to Show | Yes (D) |
| Upload + Don’t allow on draft → Studio Denied/Excluded empty until Add to Show | Yes (D) |
| After Add to Show → Allow→Pending, Don’t allow→Denied | Yes (D) |
| Reject/Exclude while on future show → off intake list; export/gangsheet still works; hard delete still blocked | Yes (A1/B1) |
| Audible queue alert only after Add-to-Show success UI (Portal and Studio) | Yes (A) |
| Portal Remove → Duplicate stays; Cancel; Confirm removes; no modal | Yes (R) |
| Personal bucket 30-day + dual tabs | Yes when C ships |

---

## Human Checkpoints

- Formal Review acceptance of this plan before Implement.
- Owner DEV QA after D+R (and again after C slices).
- DEV Functions/index/scheduler deploy phrases as needed.
- Production forbidden until parent freeze program authorizes.

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Prior child Denied tab contradicts D | Supersede in this plan; Signoff prior child only with explicit note or after D ships |
| Filtering by allocation is expensive/incorrect | Prefer trusted field written in queue TX; index review |
| 30-day vs 14-day confusion | Document clocks per reason; separate predicates |
| Personal tab scope creep | C2 reuses dashboard **Your designs**; no new section |

Rollback: revert Functions + Studio queries + Portal UI; leave Storage intact.

---

## Amendment — 2026-09-11 (owner)

1. **DEV Functions redeploy pause** after D/A/R (incl. remove polish) before C1/C2 Implement continues.
2. **C2 placement locked:** reuse customer dashboard **Your designs** (`AccountArtworkGallery` + modal tabs) for personal Don’t-allow uploads vs Design Library / promoted designs — do not build a separate section.

---

## Open Questions

1. **Staff Excluded retention:** keep **14 days** (recommended) while personal Don’t-allow bucket is **30 days**? (Default yes if unanswered.)
2. **Donate path:** unchanged (immediate Pending)? (Default yes.)
3. **C2 placement:** ~~open~~ — **resolved 2026-09-11:** same child after D+R+C1; UX reuses **Your designs**, not a new module.

---

## FreshForge Impact

Application / docs only — not Starter Surface.
