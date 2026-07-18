# Test Report: Customer cancel reason (assisted creation)

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Status | **passed_with_notes** |

## Automated

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Portal typecheck | `npm --prefix apps/portal run typecheck` | 0 | pass |
| Functions build | `npm --prefix functions run build` | 0 | pass |
| Deploy | `firebase deploy --only functions:cancelAssistedCreationRequest --project fresh-prints-dev` | 0 | pass |

## Notes

- Owner manual QA **PASS** (owner **PASS all**, 2026-07-17) — see manual QA doc.
- No production deploy.
- Lint / Studio typecheck skipped (narrow change; Studio is display-only field map).

## Manual

**Owner result:** **PASS** (2026-07-17)

## Deploy record

- Target: `fresh-prints-dev`
- Function: `cancelAssistedCreationRequest`
- Result: success

## Signoff readiness

Ready — proceed to signoff `approved_with_notes`.

