# Stage 1b D1 — Search Architecture Decision Analysis

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| PR | #40 — open / **unmerged** |
| Status | **Owner decision package — Implement BLOCKED on D1** |
| Pass type | Research / Plan / Formal Review only — **no Implement** |
| Amendment 9 | **Closed** (P0/P1/P3/P4). Do not reopen. |

**Binding prior plans:**  
`docs/workflow/plans/2026-08-06-post-launch-catalog-and-processing-stability-amendment-8-phase-1b-revalidation-plan.md`  
**Binding Formal Review:**  
`docs/workflow/reviews/2026-08-06-post-launch-catalog-and-processing-stability-amendment-8-phase-1b-revalidation-plan-review.md`

**Pricing sources (retrieved 2026-08-07):**  
- Algolia official: https://www.algolia.com/pricing (Grow: 10K searches + 100K records free; then $0.50/1K searches, $0.40/1K records)  
- Typesense Cloud: capacity hourly (no per-search/per-record). Catalog examples from typesense.org comparison + Cloud calculator model. Exact HA quote: **[NEEDS OWNER CURRENT PRICING VERIFICATION]** via https://cloud.typesense.org/pricing/calculator

---

## 0. Binding architecture (non-negotiable)

| Rule | Constraint |
|------|------------|
| Authority | Firestore = metadata; Storage = images |
| Ordinary browse / category / single-tag / Discover / Home / New This Week / by-id | Stay **Firestore** |
| Search index (if any) | Disposable derived data; **not** SoR; **not** authorization |
| Forbidden | Full-catalog client hydrate; `array-contains-any` scalable multi-tag; rename/recreate portal-catalog snapshots; Option C/D as primary |
| Outage | Search down → FS browse continues; facets show explicit unavailable |
| Mutation | Add-to-Request / details authority = Firestore |

---

## 1. Active generated consumers (HEAD revalidation)

Stage 1a already moved known-ID hydrate + categories off generated assets. **Three Portal runtime chains remain:**

### A1 — Free-text + multi-tag AND (+ optional category ∩)

| Field | Value |
|-------|-------|
| Route | `/catalog` (+ home `?q=` → catalog; request-selection mode) |
| Hook | `useCatalogDesigns` when `requiresGeneratedSearchPath` (non-empty `q` **or** `selectedTags.length > 1`) |
| Service | `portalCatalogAssetService.listMatchingDesigns` |
| Assets | `manifest.json`, search shards, tag/category ID lists, **card buckets** |
| Capability | Tokenized free-text ∩ multi-tag AND ∩ category; offset pagination (40); cards from buckets |
| FS alternative | **None** that preserves behavior |
| Algolia / Typesense | Replaced by managed search |
| Product simplify | Remove / cripple free-text + multi-tag |

### A2 — Global tag facets

| Field | Value |
|-------|-------|
| Route | `/catalog` (`useCatalogTags` on mount) |
| Service | `catalogService.listApprovedTags` → `listTagFacets` |
| Assets | `filters/tags-facet.json` |
| Capability | Ready-count ≥1 tags + exact counts |
| FS alternative | **None by design** (no N× count fallback) |
| Managed search | Provider facets |
| Product simplify | Names without counts, or drop facets |

### A3 — Narrowed tag facets (AND co-occurrence)

| Field | Value |
|-------|-------|
| Route | `/catalog` → `CatalogTagFilterModal` |
| Service | `listNarrowedApprovedTags` → `listNarrowedTagFacets` |
| Assets | facet names + tag ID lists + **card buckets** |
| Capability | AND-narrowed candidates + live counts |
| FS alternative | **None** |
| Managed search | Refined facet filters |
| Product simplify | Lose exact narrowed counts |

**Dead / unread by Portal runtime (still published):** `discover.json`, studio ready-index, recent/category pages, `catalog-reference/client/**`, `getDesignsByIds` export. Publisher still writes them → residual **~1.1K C+T+R / full pub** until Stage 4.

### Behavior matrix (current)

| Behavior | Source |
|----------|--------|
| Free-text | Generated (A1) |
| Single tag | Firestore |
| Multi-tag AND | Generated (A1) |
| Tag facets / narrowed | Generated (A2/A3) |
| Pagination | FS cursor (ordinary) / offset (generated) |
| Sort / New This Week / Discover / Home | Firestore |
| Favorites / details / share / Add to Request / known-ID | Firestore |

---

## 2. Product requirements classification

| # | Feature | Class | Notes |
|---|---------|-------|-------|
| 1 | Free-text title search | **OWNER DECISION REQUIRED** (default lean MUST if keeping A) | Core of A1 |
| 2 | Description/keyword search | **NICE TO HAVE** | Include in searchable attrs if A |
| 3 | Typo tolerance | **NICE TO HAVE** | Both providers |
| 4 | Prefix/partial-word | **NICE TO HAVE** | Both providers |
| 5 | Search across tags | **MUST KEEP** if free-text kept | Else CAN REMOVE with free-text |
| 6 | Tag aliases in search | **NICE TO HAVE** | Flatten aliases into searchable text; do not index private AI fields |
| 7 | Character/brand/category terms | **NICE TO HAVE** | Via tags + category name |
| 8 | Multi-tag filtering | **OWNER DECISION REQUIRED** | Forces A1 today |
| 9 | True AND semantics | **MUST KEEP** if multi-tag kept | Both providers support filter AND |
| 10 | Tag facet counts | **OWNER DECISION REQUIRED** | A2 |
| 11 | Narrowed facet counts | **CAN SIMPLIFY** | Highest complexity; names-only OK under B |
| 12 | Category filtering | **MUST KEEP** | Already Firestore |
| 13 | Newest (`readyAt`) | **MUST KEEP** | Already Firestore browse; search should support numeric sort |
| 14 | Relevance ordering | **NICE TO HAVE** | Search path only |
| 15 | Pagination | **MUST KEEP** | |
| 16 | Result counts | **NICE TO HAVE** | |
| 17 | Empty-state UX | **MUST KEEP** | |
| 18 | Search outage UX | **MUST KEEP** | FS browse continues |
| 19 | Guest/customer access | **MUST KEEP** | Search-only key |
| 20–24 | Immediate remove/reindex on ready/archive/edit | **MUST KEEP** if A | Sync contract |
| 25 | Taxonomy rename/archive consistency | **MUST KEEP** if A | Rebuild/reconcile |

**Option B forces an honest cut:** free-text, multi-tag AND, exact/narrowed facets are the only capabilities that still require generated assets.

---

## 3. Option A1 — Algolia

### Technical fit

| Need | Algolia Grow |
|------|--------------|
| Full-text, typo, prefix | Yes |
| Multi-tag AND | `facetFilters` / filter AND |
| Facets + narrowed | Faceting + facetFilters |
| `readyAt` sort | Numeric attribute + customRanking / replica if needed |
| Pagination | Yes |
| Batch index / upsert / delete | Yes |

**Minimum public-safe record (proposed):**

```text
objectID          = designId
title             = string
searchText        = title + description keywords + tag names + aliases (public)
categoryId        = string
categoryName      = string
tagIds            = string[]
tagNames          = string[]
readyAtMs         = number
artworkThumbUrl   = public Storage URL (or omit → FS hydrate by id)
statusPublic      = "ready" only (records absent otherwise)
```

**Do not index:** AI review internals, drafts, staff notes, private Storage paths, customer PII.

### Sync (smallest reliable)

| Event | Action |
|-------|--------|
| Transition → `ready` | Upsert |
| Metadata/tag/category change while ready | Upsert |
| Leave ready / archive | Delete |
| Restore / re-approve | Upsert |
| Taxonomy rename affecting designs | Targeted upsert or reconcile job |

**Recommend:** Firestore `onWrite` (or existing approval/write path callable) + **periodic reconcile** safety net (dev+prod). Prefer trigger/service sync over “only periodic.”

### Security

- Admin/write key: Firebase Secret Manager only (Functions)
- Portal: **search-only** key, index allowlist, referrer/domain restrictions where supported
- Index ≠ authorization; mutations always Firestore + Rules
- Never write non-ready records

### Operations

| Area | Assessment |
|------|------------|
| Impl complexity | Medium (adapter + sync + keys + QA) |
| Dashboard | Mature |
| Maintenance | Low–medium (sync drift + rebuild) |
| Outage | FS browse OK; search unavailable banner |
| Dev/prod | Separate applications/indices |
| Rollback | Keep publishers until Stage 4 PASS |

### Cost (Grow plan — official 2026-08-07)

Assumptions: 1 record/design; no Grow Plus; indexing does not multiply record count; search = Portal catalog searches (**not** unbounded InstantSearch-per-keystroke — Algolia counts each keystroke request; debounce/submit required to keep the table honest).

| Catalog records | Searches/day | Searches/mo | Est. Algolia $/mo |
|----------------:|-------------:|------------:|------------------:|
| 1,000 | 100 | 3,000 | **$0** (under free) |
| 1,000 | 1,000 | 30,000 | **~$10** (20K overage × $0.50/1K) |
| 1,000 | 10,000 | 300,000 | **~$145** |
| 5,000 | 1,000 | 30,000 | **~$10** |
| 25,000 | 1,000 | 30,000 | **~$10** |
| 100,000 | 1,000 | 30,000 | **~$10** (records still within 100K free) |
| 100,000 | 10,000 | 300,000 | **~$145** |
| 150,000 | 1,000 | 30,000 | **~$10 + ~$20 records** ≈ **$30** |

Free/trial: Build for non-prod (10K searches, 1M records). Grow free tier triggers paid usage past 10K searches/mo or 100K records.

**At current Fresh Prints scale (~hundreds–low thousands designs, low–mid hundreds searches/day): effectively $0–$10/mo.**

---

## 4. Option A2 — Typesense Cloud

**Self-hosted:** Not recommended for Fresh Prints (ops burden, upgrades, HA, backups). Use **Typesense Cloud** only.

### Technical fit

Typo tolerance, prefixes, filter AND on tags, facets, numeric `readyAt` sort, pagination, upsert/delete, bulk import — all supported. Aliases → `searchText` field same as Algolia.

**Minimum document:** same public-safe field set as Algolia (`id` instead of `objectID`).

### Sync / security / ops

Same event table as Algolia. Admin key server-only; scoped search-only key for Portal. Dev/prod separate clusters/collections. Rebuild via full export of ready designs. Outage → FS browse.

**Maintenance note:** Owner must size RAM/CPU and optionally HA; mental model is **server capacity**, not request meters.

### Cost (capacity-based — no per-search)

Official model: hourly cluster fee + bandwidth (~$0.09–$0.12/GB). Published catalog examples (typesense.org comparison, verify in calculator):

| Config | Example hourly | ≈ Monthly (720h) |
|--------|----------------|-----------------:|
| Single-node 0.5 GB (small catalog) | ~$0.01–$0.03/hr | **~$7–$22** |
| HA 3-node 0.5 GB (prod recommended) | ~$0.03–$0.12/hr | **~$22–$86** |

**[NEEDS OWNER CURRENT PRICING VERIFICATION]** — exact SKU depends on region/vCPU/HA in the live calculator.

Implication for Fresh Prints: **cost is nearly flat vs search volume**. At 10K searches/day Algolia grows; Typesense stays ~cluster fee. At current low traffic Algolia is usually cheaper.

| Catalog | Searches/day | Typesense Cloud (est.) |
|--------:|-------------:|-----------------------:|
| 1K–25K | any | **~$7–$86** (size/HA) |
| 100K | any | May need ≥1–2 GB → higher; still no per-search |

---

## 5. Option B — Product simplification

### B1 — Firestore browse + category + single-tag only (**recommended simplify variant**)

**Remove:** free-text search UI; multi-tag AND; global exact facet counts; narrowed facets.

**Keep:** ordinary browse, `readyAt` newest, category, single-tag (`array-contains`), Discover/Home/New This Week, favorites, details, share, Add to Request.

**UI disappears:** search box (or “coming soon” → prefer remove), multi-select tag AND, count badges in tag modal (names-only optional or hide modal counts).

**Customer impact:** cannot type a character name across titles; cannot AND two tags; no exact ready counts in tag picker.

**Staff impact:** none on Studio taxonomy; Portal marketing of “search” must change.

**Code deleted (after QA):** A1–A3 readers, snapshot flag for search, generated asset fetch paths for search/facets.

**Generated infra deletable after Stage 4/5:** portal-catalog publisher path for design search shards/facets/cards (and unread legacy assets).

**FS reads:** no ~1.1K publication for search; ordinary browse remains bounded pages.

**Reversibility:** managed search can be added later (new Stage); harder than keeping publisher briefly.

### B2 — Curated filters without pretending FS is search

Same as B1 + curated Discover chips / popular tags from metrics — still no free-text. Acceptable UX packaging of B1.

### B3 — “Narrow free-text without provider”

No truthful current-stack option without recreating snapshots or full hydrate. **Rejected** as primary.

---

## 6. Weighted decision matrix

Weights as specified (total 100). Scores 1–5.

| Factor | W | Algolia | Typesense Cloud | B1 Simplify |
|--------|--:|-------:|----------------:|------------:|
| Customer search quality | 15 | 5 → 75 | 5 → 75 | 1 → 15 |
| Multi-tag/facet capability | 10 | 5 → 50 | 5 → 50 | 1 → 10 |
| Lowest implementation complexity | 15 | 2 → 30 | 2 → 30 | 5 → 75 |
| Lowest ongoing maintenance | 15 | 3 → 45 | 2 → 30 | 5 → 75 |
| Low monthly cost (current scale) | 10 | 5 → 50 | 3 → 30 | 5 → 50 |
| Predictable cost at larger scale | 5 | 3 → 15 | 5 → 25 | 5 → 25 |
| Firebase architecture fit | 10 | 4 → 40 | 3 → 30 | 5 → 50 |
| Security simplicity | 5 | 3 → 15 | 3 → 15 | 5 → 25 |
| Snapshot-retirement completeness | 10 | 5 → 50 | 5 → 50 | 5 → 50 |
| Rollback/rebuild simplicity | 5 | 4 → 20 | 4 → 20 | 3 → 15 |
| **TOTAL** | **100** | **390** | **355** | **390** |

**Interpretation:** Algolia and B1 **tie**. Typesense trails on maintenance + current-scale cost. Feature preservation → Algolia; maintenance/zero-vendor → B1. Do not let “more features” auto-win without owner MUST KEEP on free-text/multi-tag.

---

## 7. What we gain (all options that retire generated search)

### Removable after Stage 1b QA + Stage 4/5 (not now)

- Portal readers: `listMatchingDesigns`, `listTagFacets`, `listNarrowedTagFacets`, snapshot search flag usage
- Publisher outputs: search shards, tag/category ID lists, `tags-facet.json`, card buckets used by search/facets
- Eventually: debounce/lease/coordination for portal-catalog design publication (Stage 4 human checkpoint)
- Residual **~1.1K C+T+R / full pub → ~0** for that publication class after retirement

**Does not remove:** Studio tag hydrate (~1.1K once/12h — P2 accepted); AI taxonomy P3 cache loads; ordinary FS browse reads.

### Firestore after publisher retirement

Ordinary catalog browse stays O(page). No full catalog publication scan for Portal search. P4 becomes unnecessary once publishers are gone.

---

## 8. Recommendations

### Recommendation A — best if preserving current customer features

**Algolia (Grow)** over Typesense Cloud.

Why: equivalent AND/facet capability; **~$0–$10/mo** at realistic Fresh Prints traffic; no cluster sizing; stronger InstantSearch/Firebase patterns already assumed in prior ADR lean; Typesense only wins clearly when search volume is high enough that Algolia request fees exceed ~cluster HA cost.

### Recommendation B — best overall Fresh Prints decision

**Depends on owner classification of free-text + multi-tag + facet counts:**

| If owner says… | Choose |
|----------------|--------|
| Those are **MUST KEEP** | **Algolia** |
| Those are **CAN REMOVE / CAN SIMPLIFY** | **B1 Product Simplification** (lowest maintenance, no vendor, full snapshot retirement) |

Default engineering lean when features must survive: **Algolia**.  
If owner prioritizes “simplest/safest/lowest-maintenance” *and* accepts UX cuts: **B1**.

`RECOMMENDED D1: ALGOLIA` *(feature-preserving default when free-text / multi-tag / facets are MUST KEEP; owner may select B1 / Plan D1=C)*

**Matrix note (adversarial clarity):** Algolia and B1 **tie at 390**. The Algolia lean is **not** a score win — it is the default only if those customer features survive. If the owner prioritizes lowest maintenance / no vendor and accepts UX cuts, B1 is co-equal (and better on complexity/security simplicity).

**Plan D1 letters:** Plan uses A=Algolia, B=Typesense, C=B1 simplify — **not** the same letters as prior Amendment 8 Option A/B/C. See Plan crosswalk.

**This is not owner approval.** Stage 1b Implement remains blocked until explicit D1.

---

## 9. Unresolved owner decisions (besides D1)

1. MUST KEEP vs REMOVE for free-text, multi-tag AND, global facet counts, narrowed facets (feeds D1).
2. If Algolia: confirm Grow (not Grow Plus) is sufficient (no AI ranking required).
3. If Typesense: confirm HA prod cluster budget via calculator.
4. Search card rendering: index public thumb fields vs always FS by-id hydrate (prefer **FS by-id** for cards to keep index minimal — slight latency tradeoff).
5. Stage 4/5 retirement timing after 1b QA (separate checkpoints).

---

## 10. Hard-stop confirmation

No npm install · no provider accounts · no secrets · no Portal/Functions code for search · no deploy · no Rules/indexes · no PR merge · no production · no publisher deletion.
