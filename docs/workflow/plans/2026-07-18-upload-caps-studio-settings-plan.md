# Plan: Upload caps + Studio Settings (Small Managed Items #2)

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/plans/2026-07-18-small-items-2-3-settings-caps-notes.md |

---

## Goal

Lower Portal **print-request** daily upload quotas, raise **catalog-donation** daily quotas, and add a **Studio Settings** section so owners can change those six integers live (Firestore `settings`, Functions enforce; no code deploy for tuning).

## Background

Small Managed Items #1 signed off. Backlog #2 requires request caps ↓, donation caps ↑, plus Studio Settings live values. Current hardcoded constants in `packages/shared/src/constants/customerUpload/customerUploadLimits.constants.ts`:

| Cap | Print-request (today) | Donation (today) |
|-----|----------------------:|-----------------:|
| Daily create-batch sessions | 100 | 200 |
| Daily finalize images | 200 | 500 |
| Daily finalize ZIPs | 5 | 20 |

Enforcement today: `functions/src/lib/customerUploadRateLimit.ts` → `resolveDailyQuotaTarget` (constants only).

Clarification stub: `docs/workflow/plans/2026-07-18-small-items-2-3-settings-caps-notes.md`.

## Scope

### In Scope
- New code defaults (↓ request / ↑ donation) in shared constants
- Firestore `settings/customerUploadQuotas` + owner-only Studio Settings UI (subscribe + save callable)
- Functions load settings with safe defaults; `chargeDailyQuota` uses resolved limits
- firestore.rules: owner read, client write false (mirror `emailProviders`)
- Docs: DATA_MODEL, BACKEND, DECISIONS (short ADR), TESTING if commands change
- Dev Functions deploy for callables that enforce quotas + new update callable (owner `APPROVE DEV DEPLOY`)
- Manual QA checkpoint for Settings save + Portal hit-cap messaging

### Out of Scope
- Per-show quantity cap (#3)
- Changing single-image / ZIP **byte** size limits or concurrent finalize leases
- Production deploy
- Portal UI to display remaining quota (errors on exhaust remain enough)

---

## Affected Areas

### Files / Modules (expected)
- `packages/shared/src/constants/customerUpload/customerUploadLimits.constants.ts` — new defaults
- `packages/shared/src/constants/customerUpload/customerUploadQuotaSettings.constants.ts` — **new** doc id, types, resolve, bounds
- `packages/shared/...` rules-alignment test for settings doc
- `functions/src/lib/customerUploadDailyQuota.ts` — accept override limits
- `functions/src/lib/customerUploadRateLimit.ts` — load settings before charge
- `functions/src/lib/loadCustomerUploadQuotaSettings.ts` — **new**
- `functions/src/updateCustomerUploadQuotaSettings.ts` — **new** callable
- `functions/src/index.ts` — export
- `firestore.rules` — `settings/customerUploadQuotas`
- `apps/studio/.../settings/` — service, hook, `CustomerUploadQuotaSettingsSection`, wire into `SettingsPage`
- `apps/studio/.../permissions/permissionService.ts` — owner gate (reuse email-providers style or alias)
- Docs as listed

### Architecture Impact
- [x] Details: Follow existing Settings pattern (`emailProviders`): shared resolve helpers, Admin SDK write via callable, Studio subscribe to Firestore doc.

### Security Impact
- [x] Details: Owner-only update callable; validate integers within hard bounds; no secrets; fail closed on invalid stored values by clamping to defaults (or reject save). Client cannot write settings doc.

### Data Model Impact
- [x] Details: New `settings/customerUploadQuotas` document with six numeric fields + `updatedAt` / `updatedBy`. Rate-limit counter docs unchanged.

### Backend Impact
- [x] Details: `updateCustomerUploadQuotaSettings`; `chargeDailyQuota` reads settings each charge (or short TTL cache). Deploy affected Functions to `fresh-prints-dev`.

### UI / UX Impact
- [x] Details: Studio Settings section “Customer upload quotas” with six number inputs (request vs donation columns), Save, reset-to-defaults hint. Manual QA required.

### Migration Impact
- [x] Forward steps: Missing settings doc → code defaults apply. After save, new limits apply immediately for subsequent charges.
- [x] Rollback / compatibility: Delete settings doc or redeploy prior defaults; counters unchanged.

---

## Approach

1. **Proposed new defaults** (implement unless owner overrides in review/QA):

| Cap | Print-request (new) | Donation (new) |
|-----|--------------------:|---------------:|
| Daily create-batch | **25** | **400** |
| Daily finalize images | **50** | **1000** |
| Daily finalize ZIPs | **2** | **40** |

   Bounds for Settings validation (suggested): each field integer `1…10000` (ZIP `1…500`).

2. Shared `CUSTOMER_UPLOAD_QUOTA_SETTINGS_DOC_ID = "customerUploadQuotas"` + `resolveCustomerUploadQuotaSettings` + `DEFAULT_*` mirroring constants.

3. Update constants file to the new defaults (single source for “code default”).

4. `loadCustomerUploadQuotaSettings()` in Functions; `chargeDailyQuota` uses resolved limits.

5. Callable `updateCustomerUploadQuotaSettings` (active owner only).

6. Studio section + permission (owner-only, same as email providers).

7. Rules + alignment test.

8. Docs + unit tests for resolve/validate/quota target with overrides.

9. Dev deploy (checkpoint) then manual QA.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Unit | `functions` + shared tests for resolve/validate/daily quota | yes |
| Typecheck/build | Functions `tsc` / package test scripts already used in repo | yes |
| Rules alignment | shared settings rules test | yes |
| Lint | project lint if touched packages run it | yes if configured |

### Manual
- [x] Details: Studio owner saves new values; Portal request vs donation exhaust messages reflect new limits (or temporary low test values). Soft-reload Studio after save.

---

## Human Checkpoints Anticipated
- [x] Manual UI/UX review (owner PASS on Settings + Portal caps)
- [ ] Design approval
- [x] Business logic decision — **defaults proposed above**; owner may retune via Settings without re-deploy
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [x] Other: **`APPROVE DEV DEPLOY`** for Functions that charge quota + `updateCustomerUploadQuotaSettings` (and rules if changed)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Defaults too low for real customers | Medium | Owner-tunable Settings; propose conservative request / generous donation |
| Stale Function cold start missing settings | Low | Load per charge; missing doc → defaults |
| Admin sees Settings but cannot write | Low | Owner-only like email providers |

---

## Rollback Plan

Revert constants + remove settings section/callable; delete `settings/customerUploadQuotas` if present; redeploy prior Functions.

---

## Documentation Updates Required
- [x] DATA_MODEL.md
- [x] BACKEND.md
- [x] DECISIONS.md
- [ ] Other: ROADMAP backlog row (in progress → done at signoff)

---

## Open Questions
- [x] None blocking — defaults proposed; owner can tune live after ship

---

## Approval
- Review doc: docs/workflow/reviews/2026-07-18-upload-caps-studio-settings-review.md
- Verdict: pending
