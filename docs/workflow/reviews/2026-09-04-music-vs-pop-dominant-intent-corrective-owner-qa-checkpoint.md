# Owner QA Checkpoint — Music & Bands vs Pop Culture dominant-intent

| Field | Value |
|-------|-------|
| Date | 2026-09-04 |
| Environment | **fresh-prints-dev** only |
| Feature | Resolver-only Music-vs-Pop dominant-intent corrective |
| Plan | `docs/workflow/plans/2026-09-04-music-vs-pop-dominant-intent-corrective-plan.md` |
| Formal Review | `approved_with_changes` |
| Implementation Review | `approved_with_notes` |
| DEV deploy | **complete** (this checkpoint) |
| Mode | **shadow** · Autonomous **OFF** |
| Prompt | **catalog-enrich-v34** (not v35) |
| Normalizer | **smart-profile-normalizer-v6** |
| Schema | **smart-profile-v1** |
| WS4 | **PASS WITH NOTES** (not closed) |
| WS5 | **BLOCKED** |
| Production | **NOT TOUCHED** |
| Commit/push | **NOT DONE** (owner QA first) |
| Agent canaries | **NOT RUN** — owner runs manually |
| Owner QA result | **OWNER MUSIC VS POP QA: PASS** (recorded 2026-09-04) |

### Owner QA outcome (2026-09-04)

| Case | Result |
|------|--------|
| Judas Priest → Music & Bands | **PASS** |
| Dolly music competitive → Music & Bands | **PASS** |
| Scooby → Pop Culture & Characters | **PASS** |
| Faith → Faith & Worship | **PASS** |
| Inspirational → Inspirational Quotes & Affirmations | **PASS** |

Owner reply recorded: `OWNER MUSIC VS POP QA: PASS`

---

## Deployment verification

| Item | Result |
|------|--------|
| Project | `fresh-prints-dev` |
| Branch | `development` |
| `.worktrees/` | Preserved |
| Deploy command | `firebase deploy --only "functions:enqueueAiEnrichment,functions:reprocessReadyDesignWithAi,functions:onCatalogReprocessJobWritten,functions:testAiEnrichmentPlayground" --project fresh-prints-dev` |
| Rules / Storage / indexes / Hosting / Portal | **Not deployed** |
| Unrelated Functions changed | **NO** (`previewCatalogReprocessJob` / `startCatalogReprocessJob` unchanged at `00011-*`) |

### Functions

| Function | Prior → New | State | Runtime | Region | Traffic |
|----------|-------------|-------|---------|--------|---------|
| `enqueueAiEnrichment` | `00091-lur` → **`enqueueaienrichment-00092-piv`** | ACTIVE | Node.js 20 | us-central1 | **100%** latest |
| `reprocessReadyDesignWithAi` | `00002-kuw` → **`reprocessreadydesignwithai-00003-gem`** | ACTIVE | Node.js 20 | us-central1 | **100%** latest |
| `onCatalogReprocessJobWritten` | `00013-xoq` → **`oncatalogreprocessjobwritten-00014-fev`** | ACTIVE | Node.js 20 | us-central1 | **100%** latest |
| `testAiEnrichmentPlayground` | `00055-mil` → **`testaienrichmentplayground-00056-bot`** | ACTIVE | Node.js 20 | us-central1 | **100%** latest |

### Why each Function was deployed

1. **`enqueueAiEnrichment`** — AI Processing / retry executes `runAiEnrichmentPipeline` → candidate core → Music-vs-Pop resolver.
2. **`reprocessReadyDesignWithAi`** — Design Library → Reprocess with AI (primary owner QA path).
3. **`onCatalogReprocessJobWritten`** — catalog reprocess worker runs the same pipeline.
4. **`testAiEnrichmentPlayground`** — Settings Playground imports `resolveThemeCategory` directly.

**Not deployed:** `previewCatalogReprocessJob` / `startCatalogReprocessJob` — coordinate/create jobs only; do **not** execute the category resolver (worker above does).

### Deployed source checks (enqueue zip)

Confirmed in deployed bundle:

- `isMusicDominantOverPop`
- `findBestApprovedMusicCategory` (name-based Music pick)
- `POP_MEDIA_BLOCK_FOR_MUSIC` / `MUSIC_IDENTITY_TOKENS`
- `professionsGroups` in resolver signal bag + candidate-core wiring
- `buildDurableMusicEvidenceTokenSet` excludes `matchedTags` for Music override
- `catalog-enrich-v34` / `smart-profile-normalizer-v6`

### Cost / AI calls

- **No new Gemini call** added (deterministic resolver only)
- **No prompt token change** from this corrective
- **No reranker behavior change**
- Owner Studio combined cost variance during QA is normal per-design noise (recent baseline noted: **$0.000888**/design)

---

## Tag-retirement compatibility

| Check | Result |
|-------|--------|
| matchedTags required for Music override | **NO** |
| IR no-tags Judas fixture | **PASS** |
| Deployed durable Music bag excludes matchedTags | **YES** |

---

## Owner QA — DO NOT agent-execute

Use **local Studio** on `development` → **fresh-prints-dev**. Prefer **Design Library → Reprocess with AI**.

### Shared procedure

1. Open design in Design Library (Ready).
2. Click **Reprocess with AI** → confirm.
3. Wait for **Needs Review**.
4. Inspect **primary category**.
5. Confirm Smart Profile still shows strong domain evidence where expected.
6. Approve (or record FAIL).

### 1 — Judas Priest (primary corrective)

| Field | Value |
|-------|-------|
| Design ID | `Wt5eILv4uyCnYNoJI8uZ` |
| Title | Judas Priest Painkiller |
| Was | Pop Culture & Characters |
| Expected | **Music & Bands** |

### 2 — Dolly Music competitive

| Field | Value |
|-------|-------|
| Design ID | `Ai4Wmfp4Vd6Ady2WCsKC` |
| Title | Dolly Parton I Will Always Love You Sheet Music Portrait |
| Expected | **Music & Bands** |

### 3 — Scooby Pop negative control

| Field | Value |
|-------|-------|
| Design ID | `0UsPRAh0tggzuX8xwWqq` |
| Title | Scooby-doo Bursting Through |
| Expected | **Pop Culture & Characters** (must NOT become Music) |

### 4 — Faith control

| Field | Value |
|-------|-------|
| Design ID | `8pSowFU1o1H1EjXBaXaA` |
| Title | I Can Do All Things Through Christ Who Strengthens Me Cross |
| Expected | **Faith & Worship** |

### 5 — Inspirational control (one is enough)

| Field | Value |
|-------|-------|
| Design ID | `74BdnNQuNWz0N0GaL4CO` (or `8QpQFWwwfM21WEimy6Vm` / `FRP1L0K6AKq2hrgGnOxX`) |
| Title | If You See Someone Without A Smile Give Em Yours Dolly |
| Expected | **Inspirational Quotes & Affirmations** |

---

## Owner reply format

Reply with exactly one of:

```text
OWNER MUSIC VS POP QA: PASS
```

```text
OWNER MUSIC VS POP QA: PASS WITH NOTES — ...
```

```text
OWNER MUSIC VS POP QA: FAIL — ...
```

---

## Safety (this pass)

| Item | Result |
|------|--------|
| Rules / Storage / indexes deployed | **NO** |
| Migrations / backfills | **NO** |
| Tag/reranker behavior changed | **NO** |
| Prompt bumped to v35 | **NO** |
| WS5 / Autonomous | **NO** |
| Production | **NO** |
| Commit / push | **NO** |
| Owner canaries executed by agent | **NO** |
