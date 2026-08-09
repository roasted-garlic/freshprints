# Plan: Taxonomy read-spike elimination (AI + Studio)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Author | Planning Agent |
| Status | approved_with_changes (Formal Review) — Implement not authorized until RCs acknowledged |
| Workflow | managed-phase |
| Managed goal | `post-launch-catalog-and-processing-stability` |
| Working follow-up | **`taxonomy-read-spike-elimination`** |
| Related | Amendment 9 P3 Signoff; Stage 4 publisher retirement; Stage 5 Storage/Rules cleanup |
| Owner authorization | Investigate → Plan → Formal Review only (`MANAGED PHASE — TAXONOMY READ SPIKE ELIMINATION`) |
| Implement | **Not authorized** until owner approves reviewed Plan |

---

## Goal

Eliminate remaining **O(tag-count)** Firestore taxonomy hydrates (~1,121 approved tags + ~18 categories ≈ **1,139 docs**) in:

1. Server AI enrichment on a **cold Function instance**
2. Studio **AI Review** mount when no current persistent taxonomy cache exists

**Firestore remains authoritative.** Do **not** revive `generated/portal-catalog/**` or `generated/catalog-reference/**` (Stage 4/5). Design writes must **never** rebuild taxonomy materialization.

---

## Background

P3 added process-local AI taxonomy cache (15 min TTL). It does **not** span instances and does **not** help Studio. Live 45-design test (2026-08-08 ~00:20–00:24Z, `fresh-prints-dev`) still showed two Console spikes (~1.3K then ~1.4K).

---

## 1. Live spike attribution (Workstream A)

### Owner timeline (CT) ↔ UTC

| CT | UTC | Event |
|----|-----|-------|
| 7:20–7:21 PM | ~00:20–00:21Z | Upload / first Console ~1.3K spike |
| 7:22–7:23 PM | ~00:22–00:23Z | Upload end / AI Review start; ~1.4K spike |
| 7:23–7:24 PM | ~00:23–00:24Z | Approvals |

### Server taxonomy events (Cloud Logging, proven)

| Timestamp (UTC) | Event | Instance | coldStart | Counts | Notes |
|-----------------|-------|----------|-----------|--------|-------|
| 00:20:06.712Z | `taxonomy-cache-miss` | `0278ec32-7857-4c20-97fb-c8529761e10e` | **true** | — | First pipeline after miss |
| 00:20:07.350Z | `taxonomy-load-success` | same | false (on success log) | **18 cat + 1121 tags = 1139 docs**, 637 ms | **Only** load-success in 00:19–00:24Z |
| 00:20:07+ → 00:22:22Z | `taxonomy-cache-hit` (many) | **same instance only** | false | 18 / 1121 | cacheAgeMs 1 → ~135s |

**Independent Function instances that loaded taxonomy during the batch: 1**  
**Server taxonomy Firestore reads attributable to taxonomy load: 1,139** (proven)

All subsequent designs in the window hit the **same** process cache (P3 working as designed for multi-design on one warm instance).

### Attribution table — ~7:20 PM / 00:20Z spike (~1.3K Console)

| Component | Docs (approx) | Status |
|-----------|---------------|--------|
| AI taxonomy cold load (`categories`+`tags` queries) | **1,139** | **PROVEN** (logs) |
| Per-design AI pipeline (design read/write, settings cache, etc.) | remainder to ~1.3K | **UNPROVEN exact split** (expected linear with enqueue; not taxonomy) |
| Retired portal-catalog publishers / full pub scan | **0** | **PROVEN absent** (no publisher log hits; Stage 4 retired) |
| Generated portal-catalog publication | **0** | **PROVEN absent** |

### Attribution — ~7:22–7:23 / 00:22Z spike (~1.4K)

| Component | Docs | Status |
|-----------|------|--------|
| Studio `listCategories` + `listTags` pages | **18 + 1,121 = 1,139** | **PROVEN** (Studio Firestore debug; `/imports`→`/ai-review`) |
| Studio designs / other | session total designs ~322; imports ~90 | Context only |
| Server taxonomy reload at AI Review time | **0** additional loads | **PROVEN** (only hits; no second miss/load-success) |

### Studio session (owner debug)

- Whole session ~1,461 billable reads; tags 1,121; categories 18; designs ~322  
- Imports ~90 (~2/design) + 45 `enqueueAiEnrichment`  
- Tracer does **not** include Function server reads (matches split spikes)

---

## 2. Exact source dependency map (Workstream B)

### Server

| Path | Role |
|------|------|
| `functions/src/enqueueAiEnrichment.ts` | Enters pipeline; no direct taxonomy query |
| `functions/src/ai/aiEnrichmentPipeline.ts` | Loads categories+tags via runtime cache |
| `functions/src/ai/loadAiCatalogReferenceSnapshot.ts` | **FS queries** + 15 min process cache; logs miss/hit/load-success |
| `functions/src/ai/aiEnrichmentRuntimeCache.ts` | Adapters over taxonomy loader |
| `functions/src/ai/catalogTagResolver.ts` | **Needs full approved set in memory** (exact+alias Maps) |
| `functions/src/ai/catalogTagRerankProvider.ts` | **Shortlist ≤30** only |
| `functions/src/ai/catalogSuggestedTagAuthorProvider.ts` | Full set for reserved terms/calibration; prompt ≤4 examples |
| `functions/src/ai/catalogThemeCategoryResolver.ts` | Full active categories (id/name/description) |
| `functions/src/ai/simpleCatalogEnrichmentPrompt.ts` | Default vision: **category names only**; **no tags** |

**Fields consumed:** tag `name`, `aliases`, `preferredWhen`, `status`; category `id`, `name`, `description`. Tag `id` loaded but unused by matcher. No category↔tag link fields.

**Matching already uses in-memory Maps** — FS cost is only bulk hydrate on cache miss.

### Studio (exact paths)

| Path | Role |
|------|------|
| `apps/studio/.../designs/hooks/useGeneratedDesignLibraryTaxonomy.ts` | Firestore `listCategories` + `listTags` (name retained; Storage retired) |
| `apps/studio/.../designs/services/categoryService.ts` | Category CRUD + list; **12h in-memory** cache |
| `apps/studio/.../designs/services/catalogTagService.ts` | Tag CRUD/list/bulk/approveSuggested; **12h in-memory** cache |
| `apps/studio/.../designs/services/taxonomyCacheControl.ts` | Clears in-memory caches |
| `apps/studio/.../ai-review/hooks/useAiReviewInbox.ts` | Mounts taxonomy for `TagChipInput` |
| `apps/studio/.../ai-review/pages/AiReviewPage.tsx` | Second hook mount (categories); tags shared via service cache |
| `apps/studio/.../shared/components/TagChipInput.tsx` | Needs **name+aliases** corpus for resolve |
| `apps/studio/.../designs/utils/catalogTagNormalizer.ts` | Candidate resolve |

**Why AI Review hydrates 1,121 tags:** `TagChipInput` hard-resolves against full approved name/alias set. `preferredWhen` not required for picker. **No disk persistent taxonomy cache** today (electron-store absent; only in-memory 12h).

---

## 3. Taxonomy writers (Workstream C)

| Entity | Operation | Path | updatedAt | version field |
|--------|-----------|------|-----------|---------------|
| Tag | create/update/bulk/approveSuggested/archive(restore) | `catalogTagService.ts` (+ `archiveTagWithGuards` Function) | yes | **none** |
| Category | create/update/reorder/archive/restore | `categoryService.ts` (+ `archiveCategoryWithGuards`) | yes | **none** |
| Hard delete | — | **none** | — | — |

**Not single service** — two Studio services + archive Functions. AI/Algolia **read-only** for taxonomy.

**Invalidation risk:** Any materialization revision bump **must** be invoked from **all** write paths above (or a single shared `bumpTaxonomyRevision()` called by both services + archive Functions). No silent bypass.

---

## 4. Current serialized taxonomy size (live measure, `fresh-prints-dev`, read-only)

| Shape | Bytes | Notes |
|-------|------:|-------|
| AI snapshot JSON (current loader shape) | **299,565** (~293 KiB) | 18 cat + 1121 tags |
| Studio compact (omit preferredWhen) | **94,789** | |
| Studio picker minimal (name/aliases/status + cat id/name) | **77,018** | |
| Avg tag bytes (AI shape) | ~251 | |
| Projected AI shape @ 5K tags | ~**1.34 MiB** | **> Firestore 1 MiB doc limit** |
| Projected AI shape @ 10K tags | ~**2.67 MiB** | Needs Storage or many chunks |

---

## 5. Option A–D decision matrix

| Criterion | A Private Storage artifact | B Compact/chunked Firestore | C Algolia taxonomy index | D FS + persistent caches only |
|-----------|----------------------------|-----------------------------|---------------------------|-------------------------------|
| O(1) cold AI load vs tag count | **Yes** (1–few object reads) | **Yes** if chunk count fixed/small | No (queries per design or still need full set) | No for cold AI (still 1139 FS unless shared cache) |
| Studio O(0–1) with warm disk cache | Needs staff Storage Rules or callable | **Natural** (existing FS Rules) | Partial (search UX) | **Yes** with revision meta |
| Fits 1 MiB now | Yes | **Yes** (single doc possible now) | N/A | N/A |
| Scales to 10K | Yes | Chunks required | Cost/latency | Still O(n) on cold |
| Firestore authoritative | Yes | Yes | Risk of treating index as truth | Yes |
| Revives Stage 5 surfaces? | **No** if new private prefix | No | No | No |
| Alias completeness for AI | Full blob in memory | Full in memory | **Weak** unless download-all | Full |
| Writer invalidation | Rebuild on taxonomy write | Rebuild on taxonomy write | Sync job | Revision bump only |
| Ops complexity | Medium (Rules+Admin) | Medium (chunks) | High | Lower |
| Failure mode | Fallback to FS once/instance | Fallback to FS once/instance | Wrong/missed tags | Cold still spikes |

---

## 6. Recommended architecture

**Hybrid: B (chunked compact Firestore materialization) + D (Studio disk cache + keep AI process cache)**, with **A-ready packaging** (same JSON schema) if chunk count grows beyond a small bound.

### Steady-state data flow

```
Firestore tags/categories (authoritative)
        │
        ▼  (on taxonomy write only)
taxonomyRevision meta + compact chunk docs (staff-readable / Admin)
        │
        ├─► AI Functions: load chunks O(chunks) → process memory (P3 TTL) → resolver Maps
        └─► Studio: read revision (1 doc) → if match local userData cache → 0 list hydrates
                    else fetch chunks → write userData cache → TagChipInput
```

### Concrete design (Implement phase)

1. **`taxonomyMaterialization/meta`** (name TBD at Implement; single doc)  
   Fields: `revision` (monotonic int or hash), `schemaVersion`, `chunkCount`, `tagCount`, `categoryCount`, `updatedAt`, `updatedBy`, `contentHash`.

2. **`taxonomyMaterialization/chunks/{chunkId}`**  
   Compact AI-compatible payload pieces (categories in chunk 0 or dedicated `categories` doc; tags partitioned by stable hash/order). Each doc **< 900 KiB** safety margin.

3. **Rebuild trigger:** only from taxonomy writers (services + archive Functions) via shared helper `scheduleTaxonomyMaterializationRebuild()` — **never** from design write / Algolia sync / enqueue.

4. **Server loader change:** `loadAiCatalogReferenceSnapshot` prefers materialization chunks; on miss/corrupt → **single-flight** FS full load + log `taxonomy-fallback-fs` + still fill process cache (must not per-design repeat).

5. **Studio:** Electron `userData/taxonomy-cache/v{schema}.json` (existing userData FS pattern; **not** inventing electron-store). On AI Review / Design Library taxonomy need: get meta revision (1 read); if local revision matches → use disk; else fetch chunks / or temporary FS list until chunks exist, then persist.

6. **Management screens** (`includeArchived: true`) may still need full archived corpus — **out of AI Review critical path**; keep FS list for management or separate archived materialization later.

### Why this wins

- Removes **1,139** cold AI reads → **O(chunkCount)** (target 1–3 now; grows slowly).  
- Removes Studio AI Review hydrate when cache current → **1 revision read**.  
- Stays on Firestore (no Stage 5 Storage revival; no public generated paths).  
- Scales past 1 MiB via chunks; schema shared with future private Storage (Option A) if desired.  
- Preserves resolver correctness (full dictionary in memory after O(chunks) fetch).

---

## 7. Rejected alternatives (why they lose)

| Option | Why rejected as primary |
|--------|-------------------------|
| **C Algolia taxonomy index** | AI needs **complete** alias dictionary; per-design search is wrong latency/cost model; risk of non-authoritative drift; does not fix Studio hydrate cleanly without still caching full set |
| **A alone (private Storage) first** | Viable later; Studio needs new staff Storage Rules or callable; post–Stage 5 prefer not adding Storage until FS chunks insufficient |
| **D alone** | Studio disk cache helps Review, but **each cold Function instance** still pays 1,139 FS reads without materialization |
| **Revive catalog-reference / portal-catalog** | **Forbidden** — Stage 4/5 |

---

## 8. Expected files to change (Implement — not this pass)

| Area | Likely paths |
|------|----------------|
| Shared types | `packages/shared/src/...` taxonomy materialization types |
| Functions | `loadAiCatalogReferenceSnapshot.ts`; new materialization builder; wire `catalogTagService`/`categoryService` counterparts on server archive Functions; `index.ts` export if callable rebuild (optional, owner-admin only) |
| Studio services | `catalogTagService.ts`, `categoryService.ts`, `useGeneratedDesignLibraryTaxonomy.ts`, new `taxonomyMaterializationClient` + userData cache helper |
| Rules | Firestore rules for `taxonomyMaterialization/**` (staff read; client write **false**) — **narrow allow**, no Stage 5 reversal |
| Tests | Loader prefers chunks; fallback single-flight; Studio revision short-circuit; writer bumps revision |
| Docs | BACKEND, DATA_MODEL, DECISIONS ADR |

**Out of scope:** Algolia design index changes; Portal; production; PR #40 merge; Stage 5 path revival.

---

## 9. Materialization schema (draft)

```ts
// meta
{
  revision: number;           // monotonic; bump on every taxonomy write
  schemaVersion: 1;
  chunkCount: number;
  tagCount: number;
  categoryCount: number;
  contentHash: string;        // sha256 of canonical JSON
  updatedAt: Timestamp;
  updatedBy: string;
}

// chunk
{
  chunkIndex: number;
  categories?: CompactCategory[]; // usually only chunk 0
  tags: Array<{ id, name, aliases, preferredWhen, status: "approved" }>;
}
```

Studio picker may strip `preferredWhen` locally when caching for TagChipInput.

---

## 10. Cache invalidation / freshness

| Event | Behavior |
|-------|----------|
| Tag/category create/update/archive/restore/bulk/approveSuggested | Bump `revision` + rebuild chunks (sync in write path **or** queued Function with revision fence) |
| Design import / approve / Algolia sync | **No** rebuild |
| AI process cache | Keep 15 min TTL **or** key by `revision` (prefer revision: instant freshness after deploy of new meta) |
| Studio disk cache | Valid iff `local.revision === meta.revision` |
| Stale window | Target **immediate** after writer completes rebuild; if async rebuild, bound ≤ N seconds and document in ADR |

**Must not** depend on a revision field writers can forget — centralize bump in service helpers used by all write paths + archive Functions checklist in tests.

---

## 11. Security model

- Firestore `taxonomyMaterialization/**`: **staff read**; **client write false** (Admin/Functions write only).  
- Do **not** grant public read.  
- Do **not** reintroduce `generated/catalog-reference/**` or `generated/portal-catalog/**`.  
- No Admin Algolia/Gemini keys in Studio.  
- Studio disk cache is local staff machine only (not a security boundary for other users).

---

## 12. Failure / fallback

| Failure | Behavior |
|---------|----------|
| Missing/corrupt chunks | Log; **one** FS full load per process (existing loader); fill process cache; alert metric |
| Rebuild fails | Keep prior revision readable; writers surface error; AI uses last good or FS fallback once |
| Studio disk corrupt | Delete local file; refetch chunks |
| Fallback storm | Single-flight + process cache **required**; never per-design FS full scan |

---

## 13. Migration sequence (dev)

1. Add types + builder + Rules (staff read).  
2. One-shot rebuild callable/script on `fresh-prints-dev`.  
3. Switch AI loader to prefer materialization.  
4. Wire all writers to bump+rebuild.  
5. Studio revision+disk cache.  
6. Deploy Functions + Rules to **dev only**.  
7. Manual 45-design validation.  
8. Signoff. **Production separately gated.**

---

## 14. Dev rollout gates

1. Plan Formal Review approved.  
2. Owner `APPROVE TAXONOMY SPIKE ELIMINATION IMPLEMENT` (phrase TBD).  
3. Dev Rules + Functions deploy phrases as needed.  
4. Manual 45-design PASS.  
5. Stage Signoff.  
6. No prod / no PR merge without separate auth.

---

## 15. Observability

Retain/extend: `taxonomy-cache-miss|hit|load-success|fallback-fs|materialization-rebuild-*` with `revision`, `chunkCount`, `documentCount`, `runtimeInstanceId`, `coldStart`.  
Studio debug: log revision match vs hydrate.

---

## 16. Automated tests

- Builder output size < per-chunk limit at fixture scale.  
- Loader uses chunks when present; FS fallback once under failure.  
- Writer helper always bumps revision (unit).  
- Studio: revision match skips `listTags` pages (mock).  
- Containment: no imports of retired generated catalog paths.  
- Resolver parity: Maps from chunks ≡ Maps from FS fixture.

---

## 17. Manual 45-design validation (acceptance)

Repeat controlled test on `fresh-prints-dev`:

| Check | Target |
|-------|--------|
| Upload → enqueue batch | Import reads remain ~linear (~2/design) |
| Server logs | **No** `taxonomy-load-success` with documentCount≈1139; instead materialization O(chunks) or cache hit |
| Multiple cold instances | Each pays O(chunks), **not** 1139 |
| Open AI Review (warm Studio cache) | **No** 500+500+121 tag pages; ≤1 meta read |
| Cold Studio (delete userData cache) | One chunk hydrate then disk cache |
| Console spikes | No ~1.1K taxonomy class spikes from AI cold or Review mount |
| Publishers | Still zero |
| AI quality | Spot-check tags/categories/halftone/aliases |
| Taxonomy edit | New tag appears within freshness contract |

---

## 18. Rollback

1. Feature-flag loader to FS-only (P3 behavior).  
2. Studio ignore disk cache / skip materialization client.  
3. Leave chunks in place (harmless) or delete later.  
4. Rules can remain (read-only surface).

---

## 19. Production

**Out of scope** for this Plan’s Implement. Separate Stage / owner phrases. PR #40 merge unrelated / not authorized.

---

## Expected read counts — 45-design test

| Path | Before (observed) | After (target) |
|------|-------------------|----------------|
| Server taxonomy cold (1 instance) | **1,139** FS docs | **O(chunks)** (1–3) + 0 on warm hits |
| Server taxonomy N cold instances | N × 1,139 | N × O(chunks) |
| Studio AI Review (warm disk) | **1,139** | **0–1** (meta) |
| Studio AI Review (cold disk) | **1,139** | O(chunks) once, then disk |
| Import design docs | ~90 | ~90 (unchanged) |

---

## Human / product decisions

| ID | Decision | Default if deferred |
|----|----------|---------------------|
| H1 | Sync rebuild in writer vs async Function | Prefer **sync rebuild** (taxonomy edits rare; simpler freshness) |
| H2 | Studio management (`includeArchived`) stays on FS lists | **Yes** (default) |
| H3 | Promote to private Storage (Option A) when chunks > K | Defer until 5K pressure; schema stays portable |

No blocker to Formal Review.

---

## Scope locks

- **In:** Plan + attribution + architecture recommendation  
- **Out this pass:** Implement, deploy, Rules change, Storage change, Algolia change, Firebase mutation (beyond read-only size measure already done), production, PR merge  

---

## Formal Review required changes (folded — must obey at Implement)

Source: `docs/workflow/reviews/2026-08-07-taxonomy-read-spike-elimination-plan-review.md` (**approved_with_changes**).

| ID | Constraint |
|----|------------|
| **RC1** | **Server-owned rebuild only.** Studio clients cannot write `taxonomyMaterialization/**` (client write false). Use callable-after-write and/or `tags`/`categories` `onWrite` triggers + archive Function hooks into one shared `rebuildTaxonomyMaterialization`. Do not claim client “sync rebuild.” |
| **RC2** | Exhaustive writer registry + automated containment that every known write path invokes rebuild entrypoint. |
| **RC3** | Fallback storm controls: bootstrap materialization **before** loader flip; per-process single-flight **and** fleet telemetry/alert; circuit/flag after repeated `taxonomy-fallback-fs`; document N-instance × 1139 risk on global miss. |
| **RC4** | Bootstrap-before-flip sequence per environment (dev first). |
| **RC5** | AI cache keyed by `revision` (TTL secondary); atomic meta/chunk publish so readers never see revision pointing at incomplete chunks. |
| **RC6** | Studio short-circuit order: meta revision check before any `listTags` pages; disk cache invalid on mismatch. |
| **RC7** | Rules: exact existing staff predicate; unit tests for deny/allow; Stage 5 negative checklist (no `generated/portal-catalog` / `catalog-reference` revival). |
| **RC8** | Chunk partition + numeric scale trigger (when to add chunks / consider Option A). |
| **RC9** | Materialization corpus = **approved tags + active categories only**; archived stays on FS management lists (H2). |

**H1 locked for Implement default:** server-side rebuild (sync-in-Function or trigger), not Studio client chunk writes.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-07-taxonomy-read-spike-elimination-plan-review.md`
- Verdict: **approved_with_changes** (2026-08-07)
- Implement: blocked until owner `APPROVE TAXONOMY SPIKE ELIMINATION IMPLEMENT` (or equivalent) **after** RC acknowledgment
