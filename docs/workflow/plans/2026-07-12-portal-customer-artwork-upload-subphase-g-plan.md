# Plan: Portal Customer Artwork Upload — Sub-phase G (Cleanup, Wipe Target, Hardening, Parent Signoff)

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Author | Agent |
| Status | ready_for_review → **revised after review round 1** |
| Workflow | managed-phase |
| Parent | `docs/workflow/plans/2026-07-11-portal-customer-artwork-upload-plan.md` |
| Depends on | Sub-phase F signed off on `fresh-prints-dev` |
| ADR | ADR-FP-073 |

---

## Goal

Close the customer artwork upload feature with: **abandoned-upload cleanup**, a **contained operational wipe target** for customer uploads (dev allowlist only), **hardening / residual-risk docs**, an **owner manual E2E checkpoint**, and **parent feature signoff**. After parent signoff: do **not** auto-resume the parked wipe track or start Phase 9.

---

## Scope

### In Scope

1. **Abandoned cleanup (v1)**
   - **Primary:** owner/admin callable `cleanupAbandonedCustomerUploads` — idempotent; optional `dryRun: boolean`
   - Batches/`awaiting_upload` older than **24 hours** without finalize → mark `abandoned`; delete orphan **source** Storage objects only (not production assets attached to requests)
   - Document how to run from Studio or CLI; Cloud Scheduler wiring is **optional** in G and must not block parent signoff if callable + docs exist
   - Standing `fresh-prints-dev` deploy auth covers the callable

2. **Wipe target `customerUploads`** (contained extension under **this** goal — does not unpark full wipe track)
   - Expand `OperationalWipeTarget` + `expandOperationalWipePlan` + Studio wipe UI option
   - Delete: `customerUploads`, `customerUploadBatches`, and operational collections `customerUploadRateLimits`, `customerUploadFinalizeLeases`, `customerUploadIdempotency` when this target is selected
   - Storage: wipe `customer-uploads/` prefix when this target is selected
   - **Independence:** `customerUploads` may be selected alone
   - **Designs interaction (binding):** wiping `designs` does **not** require `customerUploads`; promoted designs may retain `sourceCustomerUploadId` pointing at deleted uploads. Studio wipe UI copy must warn: “Catalog designs keep `sourceCustomerUploadId` even if uploads are wiped; select Customer uploads to clear upload docs/Storage.”
   - Ordering: when wiping printRequests, upload-backed items go with items (existing stack)
   - Unit tests for plan expansion
   - Deploy updated `wipeOperationalTestData` to `fresh-prints-dev` only
   - **Wipe smoke:** prefer deleting **smoke-created** fixtures from this goal; do not wipe unrelated `fresh-prints-dev` data without confirmation
   - **Never** add production to wipe allowlist

3. **Hardening / residual risk**
   - Update `RISK_REGISTER.md` / residual notes for opacity, ZIP, dual assets, upload status frozen after promote
   - Optional: rules emulator tests if low-cost; otherwise document gap in TESTING
   - Small bugfixes only if G smoke/manual finds blockers

4. **Owner manual E2E checkpoint** (human) — **hard gate for parent signoff**
   - Portal: upload → confirm → attach → queue to show
   - Studio: `/imports` intake → exclude OR Send to AI Review → AI approve/reject
   - Verify reject/exclude keep request art
   - Parent feature signoff **must not** be approved until owner returns `PASS` or `PASS WITH NOTES`

5. **Parent feature signoff**
   - Aggregate A–G; update ROADMAP Phase 8 fast-follow complete; workflow `DONE: yes` for this goal
   - Explicit: wipe track stays parked; Phase 9 not started

### Out of Scope

- Unparking / finishing `admin-operational-test-data-wipe` as a whole
- Production App Hosting / production Functions deploy
- AI prompt changes
- Phase 9 Custom Request Q&A
- Changing locked upload limits (10/50/5, concurrency 3)
- Auto-delete of production assets on request completion (v1 retain)

### Binding constraints

| Item | Rule |
|------|------|
| Wipe project allowlist | Dev only; no production |
| Abandoned cleanup | Source orphans only; never delete production paths tied to requests |
| Wipe vs parked track | G ships **customerUploads target** under this goal; does **not** claim wipe track signed off |
| After parent signoff | Stop; do not auto-start Phase 9 or resume wipe |

---

## Affected Areas

### New / modified (expected)

| Path | Role |
|------|------|
| `functions/src/` cleanup job (scheduled or callable) | Abandoned batches/sources |
| `packages/shared/.../wipeOperationalTestData.types.ts` | New target |
| `packages/shared/.../operationalWipeTargets.ts` (+ tests) | Expansion + Storage prefix |
| `functions/src/wipeOperationalTestData.ts` | Execute new target |
| Studio test-data-reset UI | Checkbox / copy for customer uploads |
| Docs | BACKEND, TESTING, RISK_REGISTER, ROADMAP, DATA_MODEL, parent signoff |

### Reuse

- Existing wipe allowlist + confirmation phrase
- E/F smoke patterns for any regression smoke
- Standing `fresh-prints-dev` deploy authorization

---

## Architecture Impact

- [x] Cleanup is trusted Admin/scheduled — not client deletes
- [x] Wipe remains owner/admin + confirmation phrase + project allowlist

---

## Security Impact

- [x] No production wipe allowlist change
- [x] Cleanup must not delete customer production artwork for live requests
- [x] Staff-only wipe UI unchanged in privilege model

---

## Data Model Impact

- Batch status `abandoned` already in enums — use it
- Wipe target additive

---

## Backend Impact

Deploy to `fresh-prints-dev` (as needed):

```bash
firebase deploy --only functions:wipeOperationalTestData,functions:cleanupAbandonedCustomerUploads --project fresh-prints-dev
```

Cloud Scheduler for cleanup is optional and must not block parent signoff.

---

## UI / UX Impact

- Studio wipe panel: new “Customer uploads” option + short warning (deletes upload docs + `customer-uploads/` Storage)
- No Portal UX changes expected

---

## Approach

1. Wipe target + unit tests + wipe Function + Studio UI (with designs/upload warning copy)
2. Callable `cleanupAbandonedCustomerUploads` (+ optional dryRun) + docs
3. Docs / risk residual
4. Deploy + light smoke on smoke fixtures only
5. **Human manual E2E checkpoint (hard gate)**
6. Parent feature signoff only after manual PASS / PASS WITH NOTES

---

## Test Strategy

| Check | Required |
|-------|----------|
| Unit: wipe plan expansion includes customerUploads | yes |
| Functions build | yes |
| Deploy wipe + cleanup callable to fresh-prints-dev | yes |
| Light smoke on smoke-created fixtures only | yes |
| Manual E2E (owner) | yes — **hard gate** for parent signoff |

---

## Human Checkpoints Anticipated

1. **Manual E2E / visual** — Portal upload → Studio intake → AI path — **required before parent signoff**
2. Optional Scheduler — not required for G closeout

---

## Risks

| Risk | Mitigation |
|------|------------|
| Cleanup deletes production art | Only delete source orphans; never production paths with attached ready uploads |
| Wipe leaves `sourceCustomerUploadId` dangling | Allowed; UI warning; optional select customerUploads |
| Scope into full wipe track | Explicit “target only”; leave wipe goal parked |
| Signoff without manual QA | Hard gate: no parent approve without PASS / PASS WITH NOTES |

---

## Acceptance Criteria

- [ ] `cleanupAbandonedCustomerUploads` callable deployed to `fresh-prints-dev` (Scheduler optional)
- [ ] Wipe target `customerUploads` selectable; unit tests pass; Function deployed to dev
- [ ] Owner manual E2E PASS / PASS WITH NOTES
- [ ] Parent feature signoff approved; ROADMAP fast-follow complete
- [ ] Wipe track still parked; Phase 9 not started

---

## FreshForge Impact Classification

Product + docs; wipe shared utils; no starter surface.

---

## Open Questions

None blocking — cleanup is callable-first per review.
