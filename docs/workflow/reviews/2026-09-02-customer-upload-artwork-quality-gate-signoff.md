# Signoff: Customer Upload Artwork Quality Gate

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-09-02-customer-upload-artwork-quality-gate-plan.md` |
| Review | `docs/workflow/reviews/2026-09-02-customer-upload-artwork-quality-gate-review.md` |
| Implementation review | `docs/workflow/reviews/2026-09-02-customer-upload-artwork-quality-gate-implementation-review.md` |
| Test report | `docs/workflow/reviews/2026-09-02-customer-upload-artwork-quality-gate-test-report.md` |
| Owner QA | `docs/workflow/reviews/2026-09-02-customer-upload-artwork-quality-gate-owner-qa.md` |
| DEV deploy | `docs/workflow/reviews/2026-09-02-customer-upload-artwork-quality-gate-dev-deploy.md` |
| Final status | **approved** |

---

## Summary

Hardened Portal customer artwork uploads for `print_request` and `catalog_donation`: PNG-only by decoded bytes, exterior-connected transparency gate (replacing permissive trim/ratio loopholes), pre-upscale quality projection using existing Fresh Prints sizing policy, customer-safe failure copy, scoped Storage Rules PNG-only on customer source path. DEV deployed to `fresh-prints-dev`; owner QA **PASS**.

---

## Changes Delivered

### Behavior

- Customer path accepts decoded PNG only; WebP/JPEG renamed `.png` rejected server-side
- Meaningful transparency: edge flood-fill exterior + thin-border screenshot reject + full-bleed safeguard
- Pre-upscale quality gate using max-upscale projection + `assessPrintSizeCapability`
- Processing order: format → decode → transparency → fail → trim → normalize → quality projection → upscale → assessment → previews → READY
- Portal UX: PNG-only accept lists; WebP removed from customer-visible formats
- ZIP: PNG entries only; per-file failure preserved
- Staff/assisted paths: WebP/JPEG unchanged via `skipCustomerQualityGates`

### Files Created

- `packages/shared/src/utils/customerUploadFailureMessages.ts`
- Workflow plan, reviews, test report, owner QA, dev deploy, signoff docs

### Files Modified

- `functions/src/lib/customerUploadProcessing.ts` (+ tests)
- `functions/src/lib/customerUploadZip.ts` (+ tests)
- `functions/src/finalizeCustomerUploadZip.ts`
- `packages/shared/src/utils/customerUploadTransparency.ts` (+ tests)
- `packages/shared/src/utils/meaningfulTransparencyMeasurement.ts`
- Portal customer-upload panel, hook, service
- `storage.rules` (scoped `isValidCustomerUploadSource`)

### Documentation Updated

- FreshForge workflow state, plan, review, implementation review, dev deploy, owner QA, test report, signoff

---

## Tests

### Automated

| Check | Result |
|-------|--------|
| Focused regression (63 tests) | **PASS** (0 fail) |
| Functions build | **PASS** |
| Portal typecheck | **FAIL** — pre-existing `catalogService.ts` only; no customer-upload errors |

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Owner DEV QA — Upload Artwork + Donate Designs | **PASS** | Owner 2026-09-02 |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| PNG-only product decision | obtained | 2026-09-02 | Portal customer path only |
| DEV Functions + Storage deploy | obtained | 2026-09-02 | `fresh-prints-dev` |
| Owner DEV QA | obtained | 2026-09-02 | **PASS** |
| Production deploy | not required | | **NOT AUTHORIZED** |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Semantic screenshot/watermark bypass | Low | Separate follow-up goal if needed; no AI classifier in V1 |
| Portal typecheck baseline debt | Low | Pre-existing `catalogService.ts`; unrelated to this goal |
| Production promotion pending | Info | Coordinated promotion: Functions + Storage + Portal hosting when authorized |

---

## Deferred Items (Roadmap)

- **Semantic visual suitability classifier** — separate proposal if deterministic gate insufficient
- **Production promotion** — customer-upload Functions + scoped Storage Rules + Portal (no Firestore/index/migration)
- Smart Profiling — **PARKED**
- `show-queue-batch-allocation-performance` — **DEFERRED**

---

## Open Blockers

- [x] None

---

## Verdict

**APPROVED** — implementation, DEV deploy, automated regression, and owner QA **PASS** complete. Production not authorized.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [ ] `ROADMAP.md` updated (optional follow-up items noted above)
- [ ] `references/project-chatgpt-handoff/CURRENT-STATE.md` — N/A (handoff package not present)
- [x] Signoff recorded

**Production inventory (future promotion):**

- Cloud Functions: `finalizeCustomerUpload`, `finalizeCustomerUploadZip`, `retryCustomerUploadProcessing` (+ confirm callables if unchanged but bundled)
- Storage Rules: scoped customer-upload source PNG-only
- Portal hosting/source as applicable
- **No** Firestore Rules, indexes, or migration

**Recommended next action:** Schedule coordinated production promotion when owner authorizes; or pick next roadmap item.
