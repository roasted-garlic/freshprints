# DEV Deploy: Show Queue Past-Show Recovery Functions

| Field | Value |
|-------|-------|
| Date | 2026-08-28 |
| Project | `fresh-prints-dev` |
| Branch | `development` |
| Production | **NOT targeted** |
| Rules / indexes | **NOT deployed** |

## Command

```bash
firebase deploy --project fresh-prints-dev --only functions:previewShowProductionRecovery,functions:applyShowProductionRecovery
```

## Result

**Deploy complete** (exit 0).

| Function | Generation | Region | Revision | updateTime | State |
|----------|------------|--------|----------|------------|-------|
| `previewShowProductionRecovery` | v2 (Node.js 20) | `us-central1` | `previewshowproductionrecovery-00002-bas` | 2026-08-28T00:33:34.835320116Z | ACTIVE |
| `applyShowProductionRecovery` | v2 (Node.js 20) | `us-central1` | `applyshowproductionrecovery-00002-zeq` | 2026-08-28T00:33:36.990282373Z | ACTIVE |

## Post-deploy

- Reload Studio against `fresh-prints-dev`.
- Recovery dialogs should use **server preview** (no deploy banner; Apply enabled when eligible).
- Owner DEV QA checklist pending — see workflow state.

## Fallback regression (manual)

If preview callable unavailable: client facts + deploy message; Apply disabled.
