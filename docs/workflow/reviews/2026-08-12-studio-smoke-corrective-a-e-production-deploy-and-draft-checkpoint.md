# Production deploy + Studio 1.0.4 draft checkpoint: smoke corrective A–E

| Field | Value |
|-------|-------|
| Date | 2026-08-12 |
| Owner authorization | `AUTHORIZE PRODUCTION DEPLOY: Studio smoke corrective A-E` |
| Status | **DRAFT RELEASE READY — STOP before publish** |
| Production HEAD / build SHA | `662b5ef7fde11cd2795201e2f14275cc15e74d55` |

---

## Temporary hook change (and restore)

| Action | Detail |
|--------|--------|
| Temporary | `beforeShellExecution.failClosed` set **`false`**; prompt simplified for authorized session |
| Reason | Prevent Cursor hook-runtime `failClosed` hard-block of already-authorized production shell |
| Restored | `failClosed` set back to **`true`**; permanent ALLOW/DENY production policy restored |
| sessionStart | unchanged |

---

## Firestore Rules

| Field | Value |
|-------|-------|
| Command | `npx firebase deploy --only firestore:rules --project fresh-prints-prod --non-interactive` |
| Project | `fresh-prints-prod` |
| Result | **success** (`EXIT:0`) |
| Metadata | `firestore: released rules firestore.rules to cloud.firestore` |
| Intended change | `settings/showQueue` create/update → `isOwnerOrAdmin()` |
| Storage Rules | **not deployed / untouched** |

---

## Functions (allowlist only)

| Field | Value |
|-------|-------|
| Command | `npx firebase deploy --only functions:promoteCustomerUploadToAiReview,functions:retryCustomerUploadProcessing,functions:enqueueAiEnrichment,functions:resetAiEnrichmentForProcessing --project fresh-prints-prod --non-interactive` |
| Result | **success** (`EXIT:0`) |
| Notes | Required worktree `npm ci` + `functions/.env.fresh-prints-prod` (gitignored) + `FUNCTIONS_DISCOVERY_TIMEOUT=120` |

| Function | State | updateTime (UTC) |
|----------|-------|------------------|
| `promoteCustomerUploadToAiReview` | ACTIVE | 2026-08-12T15:49:37Z |
| `retryCustomerUploadProcessing` | ACTIVE | 2026-08-12T15:49:33Z |
| `enqueueAiEnrichment` | ACTIVE | 2026-08-12T15:50:12Z |
| `resetAiEnrichmentForProcessing` | ACTIVE | 2026-08-12T15:49:43Z |

---

## Untouched surfaces

| Surface | Status |
|---------|--------|
| Storage Rules | untouched |
| Algolia settings | untouched (query-only; no setSettings) |
| App Hosting | untouched |

---

## Studio 1.0.4 draft package

| Field | Value |
|-------|-------|
| Workflow | `.github/workflows/studio-release.yml` |
| Use workflow from | `production` |
| Build ref | `662b5ef7fde11cd2795201e2f14275cc15e74d55` |
| release_type | `stable` |
| distribution_mode | `internal-unsigned` |
| Run | https://github.com/roasted-garlic/freshprints/actions/runs/31614537410 |
| Conclusion | **success** |
| Release ID | `369361779` |
| Draft | **true** |
| Tag/ref | `untagged-23d42021480fd8e60de6` (temporary; **do not publish with this**) |
| Name | `1.0.4` |
| target_commitish | `662b5ef7fde11cd2795201e2f14275cc15e74d55` |
| Installer | `Fresh-Prints-Windows-1.0.4-Setup.exe` |
| Installer size | `107344187` bytes |
| Installer SHA-256 | `1e0bec5492f778ab0761940d30dd3bfd4d60182a745ac8c0aa5c9d601f6aac47` |
| Blockmap SHA-256 | `b4269ba603c84db3f6ba5a4995d8091c22e2b6423d979f6c386d03788b763932` |
| latest.yml SHA-256 | `d2c0f1b8b8114a52dc269aa9d87bcbad90d7a535757fc180789d556b08653332` |
| latest.yml version | `1.0.4` |
| Published | **no** |

---

## Production smoke checklist

`docs/workflow/reviews/2026-08-12-studio-smoke-corrective-a-e-production-smoke-checklist.md`

---

## Next human gate

1. Review draft release assets / hashes.
2. Explicitly authorize **publish** of Studio 1.0.4 (separate from deploy auth).
3. Install and run production smoke (Helper + Owner/Admin).
4. Then reconcile `production` → `development` via protected PR.

**Do not publish until owner publish authorization.**
