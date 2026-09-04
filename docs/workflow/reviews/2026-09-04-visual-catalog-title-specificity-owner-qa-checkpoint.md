# Owner QA Checkpoint — Visual / no-text catalog title specificity

| Field | Value |
|-------|-------|
| Date | 2026-09-04 |
| Environment | **fresh-prints-dev** only |
| Feature | Lean no-text title under-specific enrich (subjects/objects) |
| Plan | `docs/workflow/plans/2026-09-04-visual-catalog-title-specificity-plan.md` |
| Formal Review | `approved_with_notes` |
| Implementation Review | `approved_with_notes` |
| DEV deploy | **complete** (this checkpoint) |
| Mode | **shadow** · Autonomous **OFF** |
| Prompt | **catalog-enrich-v34** (not v35) |
| Normalizer | **smart-profile-normalizer-v6** |
| Schema | **smart-profile-v1** |
| WS4 | Remains open until WS4 closeout signoff (this QA does not close WS4) |
| WS5 | Not started |
| Production | **NOT TOUCHED** |
| Commit/push | **NOT DONE** (owner QA first) |
| Agent canaries | **NOT RUN** — owner runs manually |
| Owner QA result | **OWNER TITLE SPECIFICITY QA: PASS** (recorded 2026-09-04) |

### Owner QA outcome (2026-09-04)

| Case | Result |
|------|--------|
| Sloth title specificity | **PASS** (behavior accepted) |
| Poodle title specificity | **PASS** (behavior accepted) |
| Highland long-title control | **PASS** (accepted) |
| Hallucination | **None observed** |
| Category during canaries | **Acceptable** (Cute & Whimsical held) |
| Simple-title owner fixture | Gap remains; **automated coverage sufficient** |

Owner reply recorded: `OWNER TITLE SPECIFICITY QA: PASS`

---

## Deployment verification

| Item | Result |
|------|--------|
| Project | `fresh-prints-dev` |
| Branch | `development` |
| Source drift since IR | **NO** |
| `.worktrees/` | **Preserved** |
| Predeploy title tests | **75 PASS** |
| Functions build | **PASS** |
| Touched lint | **PASS** |
| `git diff --check` | **PASS** (CRLF warnings only) |
| Deploy command | `firebase deploy --only "functions:enqueueAiEnrichment,functions:reprocessReadyDesignWithAi,functions:onCatalogReprocessJobWritten,functions:testAiEnrichmentPlayground" --project fresh-prints-dev` |
| Deploy result | **Successful** |
| Rules / Storage / indexes / Hosting / Portal | **Not deployed** |
| Unrelated Functions changed | **NO** (`previewCatalogReprocessJob` / `startCatalogReprocessJob` remain `00011-*`) |

### Functions

| Function | Prior → New | State | Runtime | Region | Traffic |
|----------|-------------|-------|---------|--------|---------|
| `enqueueAiEnrichment` | `00093-loz` → **`enqueueaienrichment-00094-wuz`** | ACTIVE | Node.js 20 | us-central1 | **100%** latest |
| `reprocessReadyDesignWithAi` | `00004-til` → **`reprocessreadydesignwithai-00005-fud`** | ACTIVE | Node.js 20 | us-central1 | **100%** latest |
| `onCatalogReprocessJobWritten` | `00015-qem` → **`oncatalogreprocessjobwritten-00016-han`** | ACTIVE | Node.js 20 | us-central1 | **100%** latest |
| `testAiEnrichmentPlayground` | `00057-viv` → **`testaienrichmentplayground-00058-bop`** | ACTIVE | Node.js 20 | us-central1 | **100%** latest |

### Why each Function was deployed

1. **`enqueueAiEnrichment`** — pipeline → Gemini provider → `buildSimpleCatalogEnrichmentResult` → `resolveLeanCatalogTitle` (+ enrich).
2. **`reprocessReadyDesignWithAi`** — Design Library → Reprocess with AI (primary owner QA path).
3. **`onCatalogReprocessJobWritten`** — catalog reprocess worker → same pipeline.
4. **`testAiEnrichmentPlayground`** — Settings Playground enrichment path uses the same result builder.

**Not deployed:** `previewCatalogReprocessJob` / `startCatalogReprocessJob` — job coordination only; do not run title finalization.

### Deployed source checks (`enqueueAiEnrichment` zip)

Inspect: `docs/workflow/reviews/_title-specificity-zip-inspect-20260904181512/`

| Check | Live |
|-------|------|
| `enrichUnderSpecificNoTextCatalogTitle` | **YES** |
| `UNDER_SPECIFIC_TITLE_MAX_WORDS` (= 2) | **YES** |
| `selectMoreSpecificSubjectForTitle` | **YES** |
| subjects/objects wiring in enrichment result | **YES** |
| styles/themes keyword stuffing in enrich | **NO** |
| matchedTags required in enrich | **NO** |
| `hasMeaningfulReadableText` gate | **YES** |

---

## Runtime / cost / tags

| Item | Live DEV |
|------|----------|
| Prompt | **catalog-enrich-v34** |
| Normalizer | **smart-profile-normalizer-v6** |
| Schema | **smart-profile-v1** |
| Mode | **shadow** |
| Autonomous | **OFF** |
| Second AI call | **NO** |
| Cost accounting change | **NO** (deterministic post-process) |
| Tag dependency | **NO** |
| Category resolver changed | **NO** |
| New Autonomous hard blocker | **NO** (repair-before-decision) |

---

## Nondeterminism note

Validate **behavior**, not exact fixture strings. If Gemini already returns a sufficiently specific title, that is **PASS**. Failure = remains materially under-specific despite richer trustworthy subjects/objects eligible for repair.

---

## Owner QA — DO NOT agent-execute

Use **local Studio** → **fresh-prints-dev**. Prefer **Design Library → Reprocess with AI**.

### Shared procedure

1. Open design → **Reprocess with AI** → confirm.
2. Wait for **Needs Review**.
3. Inspect **final title** (+ category for sanity).
4. Record PASS / FAIL with notes.

---

### 1 — Sloth

| Field | Value |
|-------|-------|
| Design ID | `7ZZIvBXvrnS2AcTVdjzl` |
| Prior title | **Sloth** |
| Expected | Meaningfully **more specific than bare Sloth** if SP has richer subject/object evidence |
| Do not require exact string | `Sloth Clinging To Tree Trunk` |
| Also verify | No hallucination; category **Cute & Whimsical** |

---

### 2 — Poodle

| Field | Value |
|-------|-------|
| Design ID | `rhfZm1hB37krd8QBtfm9` |
| Prior title | **Dog** |
| Expected | Must **not** remain bare **Dog** if SP again has poodle + glasses/heart evidence |
| Accept natural equivalents | e.g. Poodle With Glasses And Heart / Poodle Wearing Heart Glasses |
| Also verify | No hallucination; category **Cute & Whimsical** |

---

### 3 — Highland long-title control

| Field | Value |
|-------|-------|
| Design ID | `swcJl3RvjTFsf5hp04Ze` |
| Accepted prior (example) | *A Charming Illustrated Highland Cow With Large Expressive Eyes Is Depicted Resting Its Chin On Its Hand* |
| Expected | Detailed/accurate descriptive title remains **acceptable**; no blanket shortening; category **Cute & Whimsical** |
| Exact prior string | **Not required** (Gemini nondeterminism) |

---

### 4 — Simple title control

| Field | Value |
|-------|-------|
| Status | **[FIXTURE GAP — OWNER SIMPLE TITLE CONTROL]** — no convenient DEV canary required |
| Note | Automated: bare Cat / Dog with no richer evidence stays simple. Sufficient for this deploy checkpoint. |

---

## Owner reply format

```text
OWNER TITLE SPECIFICITY QA: PASS
```

```text
OWNER TITLE SPECIFICITY QA: PASS WITH NOTES — ...
```

```text
OWNER TITLE SPECIFICITY QA: FAIL — ...
```

Please note per-case titles observed.

---

## After PASS

Next (separate pass): **Title Specificity Signoff** → evaluate WS4 closeout.

**Do not** start WS5 / Autonomous / tag retirement / production / commit-push here.

---

## STOP (agent)

NO OWNER QA EXECUTION. NO WS4 CLOSEOUT. NO WS5. NO AUTONOMOUS. NO TAG RETIREMENT. NO COMMIT/PUSH. NO PRODUCTION.
