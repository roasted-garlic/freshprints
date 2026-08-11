# Checkpoint: Prefinal A–H + Track B production promote preflight + Git PR

| Field | Value |
|-------|-------|
| Date | 2026-08-11 |
| Owner phrase | `APPROVE PROD PROMOTE PREFLIGHT: PREFINAL A-H + TRACK B` → `PR 57 MERGED` |
| Plan | `docs/workflow/plans/2026-08-11-prefinal-a-h-production-promotion-plan.md` |
| Formal Review | `approved_with_changes` |
| Status | **git_complete** — PR #57 merged; `development` reconciled; **STOP** before Storage Rules |

---

## Freeze / topology (post-merge verified)

| Item | Value |
|------|-------|
| Frozen product SHA | `3b7a978f324d3c133ead8707ffc51454a20e1f5d` |
| `origin/production` | `c3a61bfe244b091e2d71bb58d6633b7e57ab67b2` (merge PR #57) |
| Freeze contained in production | **yes** (ancestor) |
| Product diff freeze↔production tip | **empty** (`apps/`, `functions/src/`, `packages/`, `storage.rules`) |
| `development` reconcile | merge commit `4225eb94ccc6e40eb6867f7c2a536c26161ea330` (docs/workflow conflicts only) |
| Product diff `development`↔`origin/production` | **empty** (same trees) |

---

## Pre-merge gates (unchanged from preflight)

| Check | Result |
|-------|--------|
| Portal typecheck | **pass** |
| Studio typecheck | **pass** |
| Functions build | **pass** |
| Track A guards | **18/18** |
| Track B + focused regressions | **91/91** |
| Lint (focused) | **pass** |
| `git diff --check` | **fail (docs only)** — markdown trailing whitespace; no product-file hits |

---

## Infra preflight (read-only; deploys not started)

| Item | Result |
|------|--------|
| H indexes | **Present** on `fresh-prints-prod` |
| Algolia production | App `Z1FVCM5QUX` · Index `portal_catalog_ready_prod` · **no mutation** |
| Firestore Rules | **no deploy** |
| Storage Rules | **deploy required next** (static-og) |
| Functions allowlist | Binding unchanged; **not deployed** |

### Functions allowlist (binding)

`updatePortalSocialMetaSettings`, `getPortalGlobalOpenGraph`, `getPortalOgShareImage`, `confirmCustomerUploadsAndAttachToRequest`, `confirmCustomerUploadsForDonation`, `customerAddAssistedApprovedProofToPrintRequest`, `queuePortalPrintRequestToShow`, `onShowAllocationCreated`, `previewCustomerUploadDeletion`, `deleteEligibleCustomerUpload`, `previewPortalCustomerUploadDeletion`, `deletePortalCustomerUpload`, `finalizeCustomerUpload`

---

## Git promotion (Option B) — COMPLETE

| Item | Value |
|------|-------|
| PR | [#57](https://github.com/roasted-garlic/freshprints/pull/57) **MERGED** |
| Production merge SHA | `c3a61bfe244b091e2d71bb58d6633b7e57ab67b2` |
| Development reconcile | `4225eb94ccc6e40eb6867f7c2a536c26161ea330` onto production lineage |
| Conflict scope | docs/workflow/handoff only (`.cursor/workflow/state.md`, handoff CURRENT-STATE / 13-recent, ROADMAP auto-merge) |

---

## Confirmations (this pass)

| Action | Occurred? |
|--------|-----------|
| Firebase Storage/Functions/Rules/index deploy | **No** |
| App Hosting rollout | **No** |
| Track A dry-run/APPLY | **No** |
| Studio 1.0.3 | **No** |
| Algolia mutation | **No** |
| Domain cutover | **No** |

---

## Next owner phrase

```
APPROVE PROD DEPLOY: STORAGE RULES STATIC-OG
```

Do **not** issue Functions/App Hosting/APPLY until Storage Rules checkpoint completes per Plan order.
