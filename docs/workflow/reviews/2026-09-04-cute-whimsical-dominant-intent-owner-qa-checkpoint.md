# Owner QA Checkpoint — Cute & Whimsical dominant-intent corrective

| Field | Value |
|-------|-------|
| Date | 2026-09-04 |
| Environment | **fresh-prints-dev** only |
| Feature | Generalized exact-match structured-evidence challenge + styles wiring |
| Plan | `docs/workflow/plans/2026-09-04-cute-whimsical-dominant-intent-and-tag-independence-plan.md` |
| Formal Review | `approved_with_changes` |
| Implementation Review | `approved_with_notes` (`2026-09-04-cute-whimsical-dominant-intent-implementation-review.md`) |
| DEV deploy | **complete** (this checkpoint) |
| Mode | **shadow** · Autonomous **OFF** |
| Prompt | **catalog-enrich-v34** (not v35) |
| Normalizer | **smart-profile-normalizer-v6** |
| Schema | **smart-profile-v1** |
| Taxonomy revision | **19** · Cute & Whimsical **ACTIVE** (`x3mLSDjl8JOQcVOcjUfb`) |
| WS4 | **PASS WITH NOTES** (not closed) |
| WS5 | **BLOCKED** |
| Production | **NOT TOUCHED** |
| Commit/push | **NOT DONE** (owner QA first) |
| Agent canaries | **NOT RUN** — owner runs manually |
| Owner QA result | **OWNER CUTE & WHIMSICAL QA: PASS WITH NOTES** (recorded 2026-09-04) |

### Owner QA outcome (2026-09-04)

| Case | Category result | Owner disposition |
|------|-----------------|-------------------|
| Highland `swcJl3RvjTFsf5hp04Ze` → Cute & Whimsical | **PASS** | Category accepted |
| Judas → Music & Bands | **PASS** | Regression held |
| Scooby → Pop Culture & Characters | **PASS** | Regression held |
| Faith → Faith & Worship | **PASS** | Regression held |
| Remaining planned category controls | **PASS** | Expected categories |
| Sloth `7ZZIvBXvrnS2AcTVdjzl` | **Cute & Whimsical** | **CATEGORY ACCEPTED** (prior Animals expectation too rigid) |
| Poodle `rhfZm1hB37krd8QBtfm9` | **Cute & Whimsical** | **CATEGORY ACCEPTED** (cross-subject aesthetic evidence) |

Owner reply recorded: `OWNER CUTE & WHIMSICAL QA: PASS WITH NOTES`

#### Title notes (not category failures)

| Design | Observed title | Owner title disposition |
|--------|----------------|------------------------|
| Highland | *A Charming Illustrated Highland Cow With Large Expressive Eyes Is Depicted Resting Its Chin On Its Hand* | **TITLE ACCEPTED** — long descriptive title is excellent for this artwork; do **not** treat as failure for length/sentence form |
| Sloth | `Sloth` | **UNDER-SPECIFIC** — richer visual evidence available (e.g. clinging/tree composition) |
| Poodle | `Dog` | **MATERIALLY UNDER-SPECIFIC** — breed + heart-shaped glasses known |

Follow-up (separate workstream): visual/no-text catalog **title specificity** Plan + Formal Review — **no title implementation in Cute signoff**.

---

## Deployment verification

| Item | Result |
|------|--------|
| Project | `fresh-prints-dev` |
| Branch | `development` |
| Source drift since IR | **NO** (reviewed cute challenge source unchanged; no implement edits this pass) |
| `.worktrees/` | **Preserved** |
| Predeploy tests | **50 PASS** (resolver + quality contract) |
| Functions build | **PASS** |
| Touched lint | **PASS** |
| `git diff --check` | **PASS** (CRLF warnings only) |
| Deploy command | `firebase deploy --only "functions:enqueueAiEnrichment,functions:reprocessReadyDesignWithAi,functions:onCatalogReprocessJobWritten,functions:testAiEnrichmentPlayground" --project fresh-prints-dev` |
| Deploy result | **Successful** (all four updates) |
| Rules / Storage / indexes / Hosting / Portal | **Not deployed** |
| Unrelated Functions changed | **NO** (`previewCatalogReprocessJob` / `startCatalogReprocessJob` remain `00011-*`) |

### Functions

| Function | Prior → New | State | Runtime | Region | Traffic |
|----------|-------------|-------|---------|--------|---------|
| `enqueueAiEnrichment` | `enqueueaienrichment-00092-piv` → **`enqueueaienrichment-00093-loz`** | ACTIVE | Node.js 20 | us-central1 | **100%** latest |
| `reprocessReadyDesignWithAi` | `reprocessreadydesignwithai-00003-gem` → **`reprocessreadydesignwithai-00004-til`** | ACTIVE | Node.js 20 | us-central1 | **100%** latest |
| `onCatalogReprocessJobWritten` | `oncatalogreprocessjobwritten-00014-fev` → **`oncatalogreprocessjobwritten-00015-qem`** | ACTIVE | Node.js 20 | us-central1 | **100%** latest |
| `testAiEnrichmentPlayground` | `testaienrichmentplayground-00056-bot` → **`testaienrichmentplayground-00057-viv`** | ACTIVE | Node.js 20 | us-central1 | **100%** latest |

### Why each Function was deployed

1. **`enqueueAiEnrichment`** — AI Processing / retry → `runAiEnrichmentPipeline` → candidate core → resolver (challenge + styles).
2. **`reprocessReadyDesignWithAi`** — Design Library → Reprocess with AI (primary owner QA path).
3. **`onCatalogReprocessJobWritten`** — catalog reprocess worker → same pipeline → resolver.
4. **`testAiEnrichmentPlayground`** — Settings Playground imports `resolveThemeCategory` (+ styles) directly.

**Not deployed:**

| Function | Why excluded |
|----------|----------------|
| `previewCatalogReprocessJob` | Job preview/inventory only; does **not** run enrichment pipeline / category resolver |
| `startCatalogReprocessJob` | Creates/starts jobs only; worker (`onCatalogReprocessJobWritten`) executes enrichment |

### Deployed source checks (`enqueueAiEnrichment` zip)

Inspect artifact: `docs/workflow/reviews/_cute-whimsical-zip-inspect-20260904171928/`

Confirmed live in deployed bundle:

| Check | Live |
|-------|------|
| `challengeExactMatchWithStructuredEvidence` | **YES** |
| `buildDurableStructuredEvidenceTokens` (excludes matchedTags) | **YES** |
| `STRUCTURED_CHALLENGE_MIN_MARGIN` = `PRIORITY_BOOST_WEIGHT` (4) | **YES** |
| `STRUCTURED_CHALLENGE_MIN_DIMENSIONS` = 2 | **YES** |
| `PROTECTED_DOMAIN_CATEGORY_NAME_TOKENS` / `isProtectedDomainExactCategory` | **YES** |
| `CUTE_WHIMSICAL_PRIORITY` + name-only priority matching | **YES** |
| `styles: parse?.styles` in candidate core | **YES** |
| `isMusicDominantOverPop` preserved | **YES** |
| Challenge requires matchedTags | **NO** |
| Second AI call / prompt v35 | **NO** |

---

## Runtime contract

| Item | Live DEV |
|------|----------|
| Prompt | **catalog-enrich-v34** |
| Normalizer | **smart-profile-normalizer-v6** |
| Schema | **smart-profile-v1** |
| Mode | **shadow** |
| Autonomous | **OFF** (`catalogAutonomousLiveEnabled: false`) |
| Cost behavior | **Unchanged** — deterministic resolver only; no new Gemini / verifier / prompt token / reranker change |

---

## Implementation notes for owner QA

1. **Tag independence:** Challenge must succeed with empty `matchedTags`. Do not treat tags as required evidence.
2. **Pop→Faith structured challenge (IR note):** A Pop-exact + faith-dominant structured-evidence fixture now resolves **Faith & Worship** via the generalized challenge (Music still blocked). Product-aligned; not a Music-vs-Pop regression.
3. **Thresholds unchanged at deploy:** margin ≥ 4; ≥2 support dimensions; protected-domain exact skip.

---

## Owner QA — DO NOT agent-execute

Use **local Studio** on `development` → **fresh-prints-dev**. Prefer **Design Library → Reprocess with AI** (or Design Details equivalent).

### Shared procedure

1. Open design.
2. Click **Reprocess with AI** → confirm.
3. Wait for **Needs Review**.
4. Inspect **primary category**.
5. Confirm Smart Profile evidence still present as noted.
6. Record PASS / FAIL.

---

### 1 — Highland cow (PRIMARY CORRECTIVE)

| Field | Value |
|-------|-------|
| Design ID | `swcJl3RvjTFsf5hp04Ze` |
| Title | Highland Cow With Flowers And Bow |
| Prior live category | **Animals** |
| Expected | **Cute & Whimsical** |
| Also verify | subjects still include Highland cow / cow; styles/themes still include cute / whimsical |

---

### 2 — Animals negative control

| Field | Value |
|-------|-------|
| Design ID | `7ZZIvBXvrnS2AcTVdjzl` |
| Title | Sloth Hanging On Tree |
| Status | Ready |
| Prior category | **Animals** |
| Expected after reprocess | **Animals** |
| Why | Wildlife / realistic animal identity; styles not cute/whimsical stack |

Alt breed control (optional): `ESKL5gpALMsrXxrohSSu` — 355 Australian Cattle Dog → expect **Animals**.

---

### 3 — Music regression

| Field | Value |
|-------|-------|
| Design ID | `Wt5eILv4uyCnYNoJI8uZ` |
| Title | Judas Priest Painkiller |
| Expected | **Music & Bands** |

---

### 4 — Pop regression

| Field | Value |
|-------|-------|
| Design ID | `0UsPRAh0tggzuX8xwWqq` |
| Title | Scooby-doo Bursting Through |
| Expected | **Pop Culture & Characters** |

---

### 5 — Faith regression

| Field | Value |
|-------|-------|
| Design ID | `8pSowFU1o1H1EjXBaXaA` |
| Title | I Can Do All Things Through Christ Who Strengthens Me Cross |
| Expected | **Faith & Worship** |

---

### 6 — Optional Cute cross-subject canary

| Field | Value |
|-------|-------|
| Design ID | `8bGvOZVxkx54Am5rx1EW` |
| Title | Teddy Bear With Blue Bow |
| Status | Ready · currently Animals |
| Expected | **Cute & Whimsical** (optional — proves non-cow subject) |
| Note | Optional only. Ghost/food/person gaps remain; do **not** fail overall QA solely on this canary. |

---

## Owner reply format

Reply with exactly one of:

```text
OWNER CUTE & WHIMSICAL QA: PASS
```

```text
OWNER CUTE & WHIMSICAL QA: PASS WITH NOTES — ...
```

```text
OWNER CUTE & WHIMSICAL QA: FAIL — ...
```

Please include per-case notes if any case differs from expected.

---

## After PASS

Next workflow step (separate pass): **Cute & Whimsical Signoff** → evaluate final WS4 closeout.

**Do not** start WS5 / Autonomous / tag retirement / production / commit-push in this checkpoint.

---

## STOP (agent)

NO OWNER QA EXECUTION. NO WS4 CLOSEOUT. NO WS5. NO AUTONOMOUS. NO TAG RETIREMENT. NO COMMIT/PUSH. NO PRODUCTION.
