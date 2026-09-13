# Corrective Review: Smart Catalog Intelligence — Slice 2 Persistence Fix

| Field | Value |
|-------|-------|
| Date | 2026-08-24 |
| Slice | 2 — Smart Profile Firestore undefined persistence corrective |
| Trigger | Owner DEV QA **FAIL** after scoped DEV deploy |
| Status | **approved** |

---

## Defect

AI Processing failed on design import with:

> Cannot use "undefined" as a Firestore value (found in field `smartProfile.provenance.validationWarnings`)

Observed path: enqueue → AI success path → `markAiSuccess` → `designs/{id}.update({ smartProfile })` → Firestore reject → `aiProcessingStage: failed`.

## Root cause

1. `buildDesignSmartProfile` assigned `provenance.validationWarnings = undefined` when there were no warnings.
2. `stripEmptySmartProfileDimensions` copied `profile.provenance` wholesale without deep-omitting undefined nested fields.
3. `markAiSuccess` ran `removeUndefinedFields` on `aiSuggestions` / `aiAnalysis` but **not** on `smartProfile`.

Approved master plan already required: *“Strip undefined before Firestore writes (existing `removeUndefinedFields` pattern)”* — this was incomplete for Smart Profile.

## Corrected persist semantics

| Field | Semantics |
|-------|-----------|
| `provenance.validationWarnings` | **Omit** when empty/absent. Persist `string[]` only when warnings exist. Never `undefined`, never `[]`. |
| Empty dimension lists | **Omit** (existing `stripEmptySmartProfileDimensions` behavior). |
| Optional provenance / categoryAlternative / gap / halftone evidence fields | **Omit** when absent (deep strip). |

Authority: `SmartProfileProvenance.validationWarnings?`, plan persistence note, repo `withoutUndefinedFields` / `removeUndefinedFields` convention. **Not** global `ignoreUndefinedProperties`.

## Scope check

- [x] Needs Review routing unchanged
- [x] No auto-approval
- [x] No Algolia / tag retirement / backfill / category auto-create
- [x] Halftone remains shadow evidence only
- [x] Prompt remains `catalog-enrich-v27`
- [x] No `ignoreUndefinedProperties` global enablement
- [x] No production / App Hosting / unrelated Functions

## Audit — other undefined risk sites

| Site | Risk | Mitigation |
|------|------|------------|
| `provenance.validationWarnings` | **Confirmed FAIL** | Omit when empty; deep strip |
| `provenance.provider/model/promptVersion/...` | Optional; could be undefined | Deep strip in `stripEmptySmartProfileDimensions` |
| `provenance.automationReasonCodes` | Always set by pipeline today; could be undefined if mutated | Deep strip |
| `categoryAlternatives[].categoryId/reason` | Explicitly set to undefined in parse/normalize | Omit keys; sanitize on persist |
| Dimension lists | In-memory undefined | Already omitted by stripEmpty |
| `categoryGapSuggested/Evidence` | Optional | Truthy gate + deep strip |
| `halftoneShadowAssessment.evidence` | Could be undefined | Omit when absent in parser; analysis already deep-stripped |
| Import batch fields (Studio client) | Separate create path; not this FAIL | Unchanged; rules already optional strings |

## Tests

| Check | Result |
|-------|--------|
| Functions build | PASS |
| Smart Profile + shadow unit tests | PASS (10/10) |
| Title/prompt regressions | PASS (68/68) |
| Studio typecheck | PASS |
| `git diff --check` | PASS (CRLF warnings only) |

New regressions cover: omit warnings when none; persist warnings when present; nested optional provenance/alternatives cannot introduce Firestore undefined; halftone evidence omit.

## Verdict

**approved** — narrow persistence corrective aligns with approved Slice 2 plan; ready for owner-approved scoped DEV redeploy of Functions only (rules unchanged by this fix).

## DEV deployment allowlist (requires owner approval)

```bash
firebase deploy --only functions:enqueueAiEnrichment,functions:resetAiEnrichmentForProcessing --project fresh-prints-dev
```

- **Do not** deploy `fresh-prints-prod`
- **Do not** deploy App Hosting, Algolia, indexes, Storage Rules
- Firestore rules redeploy **not required** for this corrective (no rules change)
- After deploy: owner re-runs Slice 2 DEV QA checklist (Retry AI or fresh import)
