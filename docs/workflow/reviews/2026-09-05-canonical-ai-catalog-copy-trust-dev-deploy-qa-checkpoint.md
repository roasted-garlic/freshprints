# DEV Deploy + QA Checkpoint — Canonical AI Catalog Copy Trust (ADR-FP-181)

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Project | `fresh-prints-dev` |
| Branch | `development` |
| Plan | `docs/workflow/plans/2026-09-05-canonical-ai-catalog-copy-trust-corrective-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-05-canonical-ai-catalog-copy-trust-corrective-review.md` |
| IR | `docs/workflow/reviews/2026-09-05-canonical-ai-catalog-copy-trust-corrective-implementation-review.md` |
| Results | `docs/workflow/reviews/_td034-canonical-copy-trust-qa-dev-results.json` |
| Result | **DEV DEPLOYED · QA COMPLETE · AWAITING OWNER JUDGMENT** |

---

## Deploy

**Allowlist (from IR):** `enqueueAiEnrichment`, `reprocessReadyDesignWithAi`, `onCatalogReprocessJobWritten`, `testAiEnrichmentPlayground`, `startCatalogReprocessJob`, `previewCatalogReprocessJob`

**Command:**

```bash
FUNCTIONS_DISCOVERY_TIMEOUT=60 firebase deploy --only "functions:enqueueAiEnrichment,functions:reprocessReadyDesignWithAi,functions:onCatalogReprocessJobWritten,functions:testAiEnrichmentPlayground,functions:startCatalogReprocessJob,functions:previewCatalogReprocessJob" --project fresh-prints-dev --non-interactive
```

**Exit:** `0` · Unrelated resources: **NO**

| Function | Prior → New |
|----------|-------------|
| enqueueAiEnrichment | `00103-nac` → `00104-gok` |
| reprocessReadyDesignWithAi | `00014-qew` → `00015-rey` |
| onCatalogReprocessJobWritten | `00025-hum` → `00026-teh` |
| testAiEnrichmentPlayground | `00062-dux` → `00063-kix` |
| startCatalogReprocessJob | `00014-fuv` → `00015-wid` |
| previewCatalogReprocessJob | `00014-ban` → `00015-xah` |

---

## Runtime

| Check | Result |
|-------|--------|
| promptVersion | `catalog-enrich-v37` |
| profile | `smart-profile-v1` |
| normalizer | `smart-profile-normalizer-v6` |
| mode | `shadow` |
| live | `false` |
| Autonomous | OFF |

---

## Cucumber Processing (5 runs) — `Y2IQuCgAPgnqrBIeJuap`

| Run | Final title (persisted) | Title mut | Desc mut | Category | Gap | WAA | Other hard |
|-----|-------------------------|-----------|----------|----------|-----|-----|------------|
| 1 | Retro Pin-Up Girl Holding Cucumber with Sarcastic Phrase | NO | NO | Funny & Sarcastic | `""` | NO | `structured_evidence_gap:subjects:woman` |
| 2 | Retro Woman With Cucumber "Go Fuck Yourself" | NO | NO | Funny & Sarcastic | `""` | YES | — |
| 3 | Woman Holding Cucumber with Sarcastic Saying | NO | NO | Funny & Sarcastic | `""` | YES | — |
| 4 | Retro Woman Holding Cucumber with Sarcastic Quote | NO | NO | Funny & Sarcastic | `""` | YES | — |
| 5 | Retro Woman With Cucumber Saying Go Fuck Yourself | NO | NO | Funny & Sarcastic | `""` | YES | — |

| Metric | Value |
|--------|-------|
| Title semantic mutation count | **0** |
| Description semantic mutation count | **0** |
| Slogan reconstruction / lean force | **NO** |
| Description synthesis | **NO** |
| centralSubject append | **NO** |
| Deterministic FUCK→F*** | **NO** |
| False `category_gap_suggested` | **0** |

**Regression:** Old slogan rebuild (`When Life Gives You Cucumbers Go Fuck Yourself Woman`) **not observed**. Visual-subject titles persist.

**Note:** Canonical vs final identity is trim-only `acceptCanonicalCatalogCopy` on the live path (raw provider text is not separately persisted). Cross-check: legacy `resolveLeanCatalogTitle` would still *want* slogan rebuild from visible text, but finals did **not** match forced lean/slogan rebuild.

---

## Playground (3 runs)

All visual-subject titles; Playground→persist simulation mutation **NO** / **NO**. Quality class matches Processing (visual-first, not slogan-forced).

---

## Structural safety (contract tests)

`canonicalAiCatalogCopyTrust.contract.test.ts` — **12/12 PASS** (empty/JSON/fence/garbage fail closed; Unicode/profanity/punctuation allowed; no substitute prose).

---

## Owner checkpoint

Reply:

- `CANONICAL AI COPY DEV QA: PASS`
- `CANONICAL AI COPY DEV QA: PASS WITH NOTES: …`
- `CANONICAL AI COPY DEV QA: FAIL: …`

Agent recommendation: **PASS WITH NOTES** (run 1 WAA blocked by evidence `subjects:woman` — feeds next auto-approve audit; not a copy-trust defect).
