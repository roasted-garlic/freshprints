# Checkpoint: Prefinal A–H + Track B production promote preflight + Git PR

| Field | Value |
|-------|-------|
| Date | 2026-08-11 |
| Owner phrase | `APPROVE PROD PROMOTE PREFLIGHT: PREFINAL A-H + TRACK B` |
| Plan | `docs/workflow/plans/2026-08-11-prefinal-a-h-production-promotion-plan.md` |
| Formal Review | `approved_with_changes` |
| Status | **awaiting_owner_merge** — PR open; agent merge blocked by Cursor production-merge hook |

---

## Freeze / topology

| Item | Value |
|------|-------|
| Frozen product SHA | `3b7a978f324d3c133ead8707ffc51454a20e1f5d` |
| QA tip | `f7286ed3a5e74d1d4c4b9b242a46b660497ebe53` |
| Post-freeze commits | **1** docs-only (`f7286ed`) |
| Product diff freeze↔tip | **empty** (`apps/`, `functions/src/`, `packages/`, `storage.rules`, Firestore rules/indexes) |
| Working tree | clean except local workflow state update |
| `origin/production` | `913329caefa5cf5041b269da1e5192424d0b95c6` (**unchanged**) |
| `origin/development` | `cd33108506932acb7adc8550c6131c5c8748defa` |
| Ancestry | production is ancestor of QA tip |
| Commits `production..QA` | **18** |
| Files `production..QA` | **114** |
| Product conflicts | **none** |
| Secret/env leak scan | **pass** (no tracked `.env.local` / credentials / installers) |

---

## Pre-merge gates

| Check | Result |
|-------|--------|
| Portal typecheck | **pass** |
| Studio typecheck | **pass** |
| Functions build | **pass** |
| Track A guards | **18/18** |
| Track B + focused regressions | **91/91** (includes storageRulesAlignment static-og assert) |
| Lint (focused) | **pass** |
| `git diff --check` | **fail (docs only)** — pre-existing markdown trailing whitespace in workflow plans/reviews; **no product-file hits** |

---

## Infra preflight (read-only)

| Item | Result |
|------|--------|
| H indexes (`purpose`+`catalogReviewStatus`; +`createdAt`) | **Present** on `fresh-prints-prod` |
| Algolia production (from gitignored `.env.production.local`) | App `Z1FVCM5QUX` · Index `portal_catalog_ready_prod` · Project `fresh-prints-prod` |
| Algolia mutation | **none required** (query-time only) |
| Firestore Rules vs production | **no diff** → no deploy |
| Storage Rules vs production | **+25 lines** static-og → **deploy required later** |
| Functions allowlist | Unchanged from Formal Review; all listed sources **M** vs production; portal delete exports new vs production |

### Functions allowlist (binding)

`updatePortalSocialMetaSettings`, `getPortalGlobalOpenGraph`, `getPortalOgShareImage`, `confirmCustomerUploadsAndAttachToRequest`, `confirmCustomerUploadsForDonation`, `customerAddAssistedApprovedProofToPrintRequest`, `queuePortalPrintRequestToShow`, `onShowAllocationCreated`, `previewCustomerUploadDeletion`, `deleteEligibleCustomerUpload`, `previewPortalCustomerUploadDeletion`, `deletePortalCustomerUpload`, `finalizeCustomerUpload`

---

## Git promotion (Option B)

| Item | Value |
|------|-------|
| PR | **[#57](https://github.com/roasted-garlic/freshprints/pull/57)** |
| Base | `production` |
| Head | `qa/prefinal-a-h-dev` |
| Agent merge | **blocked** by Cursor hook (production merge) |
| Owner action required | **Merge PR #57** via GitHub UI (merge commit preferred) |
| Development reconcile | **deferred** until production lands |
| Production merge SHA | _pending owner merge_ |

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

## Next owner phrase (after PR #57 is merged and verified)

```
APPROVE PROD DEPLOY: STORAGE RULES STATIC-OG
```

Do **not** issue Functions/App Hosting/APPLY until Storage Rules checkpoint completes per Plan order.
