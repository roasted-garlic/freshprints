# Implementation Review — Explicit Content Standard Enrichment Classification (ADR-FP-172)

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Plan | `docs/workflow/plans/2026-09-05-explicit-content-standard-enrichment-classification-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-05-explicit-content-standard-enrichment-classification-review.md` |
| Status | **approved_with_notes** |
| Deploy this pass | **NO** (owner-authorized STOP after IR) |

## Scope verified

| # | Check | Result |
|---|---|---|
| 1 | Explicit root write independent of `publishReady` | **PASS** — `mayWriteExplicit` no longer includes `publishReady` |
| 2 | Shadow writes real Explicit metadata | **PASS** — Needs Review path includes Explicit payload |
| 3 | Hard-blocked Needs Review writes Explicit | **PASS** — lifecycle gate unchanged; Explicit write not gated on blockers |
| 4 | Lifecycle gate unchanged | **PASS** — Ready still dual-gate / Autonomous controlled |
| 5 | Ready+Explicit path preserved | **PASS** — Ready branch still writes Explicit when allowed |
| 6 | Staff vs automation source durable | **PASS** — `explicitContentSource: "staff" \| "automation"` |
| 7–10 | Staff true/false/terms/clear protected | **PASS** — staff source + legacy-without-source protected; Studio stamps staff |
| 11 | Automation non-clear | **PASS** — `resolveExplicitContentAutomationWrite` returns undefined on non-match |
| 12–13 | Settings failure / no silent fallback write | **PASS** |
| 14–15 | UI / provenance truthful | **PASS** — Detected / Auto-classified / applied+detected aliases |
| 16 | One coherent `markAiSuccess` update | **PASS** — no separate Explicit mutation |
| 17–18 | No second AI call; v34/v6/v1 unchanged | **PASS** |
| 19–21 | Portal / Print Requests / tags-reranker unchanged | **PASS** (Portal source untouched; contract asserts no PR wiring) |
| 22 | Rules/index/migration | **NOTES** — Formal Review said NO; repo inspection required additive Rules allowlist for `explicitContentSource` (see below) |
| 23 | ADR-FP-172 recorded | **PASS** |
| 24 | Tests sufficient for matrix | **PASS** (focused; see test report section) |
| 25–26 | DEV allowlist + owner QA checklist | **Prepared** — deploy not authorized this pass |

## Formal Review correction — Rules

**[IMPLEMENTATION SCOPE DRIFT — RULES CHANGE REQUIRED]** (discovered at implement)

`catalogMetadataOnlyUpdate().affectedKeys().hasOnly([...])` omitted `explicitContentSource`. Without Rules update, Studio staff Explicit saves that stamp the source field would be permission-denied.

**Minimal additive change applied in working tree:**

- `isOptionalExplicitContentSource`
- allowlist + validators on `catalogMetadataOnlyUpdate` and `designRequiredFieldsValid`

No index/migration. **Owner must authorize DEV Rules deploy** with Functions/Studio (or Rules-before-Studio) so staff stamp works.

## Authority field

`designs.explicitContentSource: "staff" | "automation"`

- Legacy Explicit fields without source → treat as staff
- Automation writes `"automation"`
- Staff path: `designService.updateDesign` stamps `"staff"` whenever `isExplicitContent` or `censoredTerms` changes (AI Review + Design Library share this service)
- Clients cannot set source to `"automation"` via updateDesign

## Recommended DEV deploy allowlist (future auth only)

```text
firebase deploy --only "functions:enqueueAiEnrichment,functions:reprocessReadyDesignWithAi,functions:onCatalogReprocessJobWritten,firestore:rules" --project fresh-prints-dev
```

Optional if Settings UI already live: `functions:updateAiEnrichmentSettings` (unchanged this pass).

**Studio:** local DEV / Studio publish as needed for AI Review label + designService stamp — no Portal deploy.

## Owner QA checklist (prepare only — do not run this pass)

### QA A — Shadow Explicit

Fresh disposable DEV catalog fixture with configured artwork term.

Expected: Needs Review; Explicit toggle ON; censoredTerms populated; UI says Detected/Auto-classified (not hypothetical Would Mark); no Ready; no publication; no `system:catalog-autonomy`.

### QA B — Shadow + blocker + Explicit

Expected: valid hard blocker visible; Explicit ON; terms populated; stays Needs Review.

### QA C — Staff override

Owner clears/changes Explicit; reprocess; staff authority preserved (no automation resurrect).

## Test evidence (this pass)

| Command | Result |
|---|---|
| `npx tsx --test` shared Explicit + masker + Functions contract + Studio display + portal show-card map | **65 pass / 0 fail** |
| `cd functions && npm run build` | **PASS** |
| `npx eslint` (touched TS) | **PASS** |
| `git diff --check` | **PASS** (CRLF warnings only) |
| `portalPrelaunchCensorUx.test.ts` | **pre-existing unrelated fails** (useState / mobile filter) — not claimed as this corrective |

Studio full `tsc` monorepo not claimed (known baseline debt).

## Verdict

**approved_with_notes**

Source ready for owner-authorized DEV deploy **after** owner acknowledges Rules allowlist inclusion. **Do not enable Autonomous. Do not start WS6.** WS6 remains blocked until DEV deploy + owner QA PASS + corrective Signoff.

## Gate at STOP

`catalogWorkflowMode=shadow` · `catalogAutonomousLiveEnabled=false` · Autonomous not enabled · production untouched · no commit/push.
