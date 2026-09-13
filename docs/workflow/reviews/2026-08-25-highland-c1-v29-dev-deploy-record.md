# DEV Deploy Record — C1 v29 / normalizer-v3 (`enqueueAiEnrichment`)

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Project | **fresh-prints-dev** only |
| Owner authorization | **authorize** (this session) |
| Allowlist | `docs/workflow/reviews/2026-08-25-highland-c1-v29-dev-deploy-allowlist.md` |
| Status | **deployed + smoke PASS** |

---

## Preflight

| Check | Result |
|-------|--------|
| `firebase use` | fresh-prints-dev |
| Functions build | pass |
| Allowlist | `functions:enqueueAiEnrichment` only |

## Deploy

```bash
firebase deploy --only functions:enqueueAiEnrichment --project fresh-prints-dev --non-interactive
```

Exit **0**.

| Function | Op | State | updateTime |
|----------|-----|-------|------------|
| `enqueueAiEnrichment` | **updated** | ACTIVE | **`2026-08-26T03:04:03Z`** |
| Revision | `enqueueaienrichment-00080-dog` | | (was `00079` @ `2026-08-25T16:07:27Z`) |

## Not deployed / untouched

- Vocab refresh callables (already ACTIVE; not required)
- Rules / indexes / secrets / Algolia Functions
- **fresh-prints-prod** `enqueueAiEnrichment` still `2026-08-12T15:50:12Z`

## Smoke

See `docs/workflow/reviews/2026-08-25-highland-c1-v29-dev-smoke-report.md` — **ALL_PASS=true**.

Designs temporarily reset → Cloud Function enqueue → **restored** to prior ready/approved snapshots.
