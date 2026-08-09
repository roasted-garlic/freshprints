# Record: Algolia production configuration — SEPARATE (Gate A)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Owner phrases | `ALGOLIA PROD APP: SEPARATE` → App ID / Index / `ALGOLIA ADMIN SECRET: READY` |
| Status | **GATE A COMPLETE — VERIFY PASS (with secret-handling note)** |
| Application | **SEPARATE** (not `WQ6OPP2E6Z`) |
| Application ID | `Z1FVCM5QUX` |
| Index | `portal_catalog_ready_prod` |
| Admin secret | Present in Secret Manager on `fresh-prints-prod` (value **not** recorded here) |
| Portal enable | **OFF** |
| Tip | `ebcfaf29757d0c107a4ff9f7ad2561816f66f4b0` |
| Checkpoint | `docs/workflow/reviews/2026-08-08-pr-40-prod-algolia-config-separate-checkpoint.md` |

---

## Agent verify

| Check | Result |
|-------|--------|
| App ID recorded | `Z1FVCM5QUX` |
| Index ≠ `_dev` | **PASS** — `portal_catalog_ready_prod` |
| `ALGOLIA_ADMIN_API_KEY` Secret Manager | **EXISTS** (`firebase-managed: functions`; created ~2026-08-09T01:26Z) |
| Algolia trio on default `index.ts` | **ABSENT** (Option E — restore barrel before Gate B deploy) |
| Portal search enable | **OFF** (unchanged) |

### Secret-handling note (important)

Agent verification used a secret-access path that **printed the admin key into tool output**. That value must be treated as **exposed to agent logs**.

**Recommended before Gate B deploy:** rotate the Algolia Admin API key in the Algolia dashboard, then re-run:

```powershell
firebase functions:secrets:set ALGOLIA_ADMIN_API_KEY --project fresh-prints-prod
```

Reply `ALGOLIA ADMIN SECRET: ROTATED` if rotated; otherwise owner accepts residual log exposure risk.

**Do not** paste key values into chat.

---

## Confirmations

- NO Functions deploy
- NO Portal enable / App Hosting env
- NO admin key written to docs/git
- NO search-only key collected yet (Gate C)

---

## Next

## Admin secret rotation (2026-08-08 / 2026-08-09 UTC)

Owner phrase: **`ALGOLIA ADMIN SECRET: ROTATED`**

| Check | Result |
|-------|--------|
| Secret name | `ALGOLIA_ADMIN_API_KEY` still present on `fresh-prints-prod` |
| New version | **v2** `enabled` created `2026-08-09T01:33:05` (after accidental agent access of v1) |
| Value printed | **No** — describe/list only after rotation; agent does not access secret values |
| Old version v1 | Still listed `enabled` at time of verify — **owner optional:** disable v1 so only rotated key is active |

```powershell
# Optional — disable pre-rotation version (owner CLI; agent hooks may block)
gcloud secrets versions disable 1 --secret=ALGOLIA_ADMIN_API_KEY --project=fresh-prints-prod
```

Do **not** paste Admin or Search API key values into chat/docs.

Gate B checkpoint: `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-wave-a-algolia-checkpoint.md`

Owner phrase: **`APPROVE PROD FUNCTIONS WAVE A ALGOLIA`**

That gate includes: restore Algolia exports on tip → set params → CREATE three Functions (Portal enable still OFF).
