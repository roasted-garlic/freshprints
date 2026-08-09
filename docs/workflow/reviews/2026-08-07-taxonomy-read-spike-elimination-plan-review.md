# Review: Taxonomy read-spike elimination plan

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Reviewer | Formal Review Agent (independent, read-only) |
| Plan | `docs/workflow/plans/2026-08-07-taxonomy-read-spike-elimination-plan.md` |
| Related constraints | Stage 4 publisher retirement; Stage 5 generated Storage/Rules cleanup (ADR-FP-126 / ADR-FP-127) |
| Verdict | **approved_with_changes** |

---

## Summary

The plan correctly attributes the dual ~1.1K Firestore spikes (cold AI instance + Studio AI Review hydrate), keeps **Firestore tags/categories authoritative**, and proposes a **staff-private derived materialization** that does **not** revive `generated/portal-catalog/**` or `generated/catalog-reference/**`. Direction is sound and Stage 5-compatible.

It is **not** unconditionally Implement-ready. Writer invalidation and fallback-storm language are too loose for a system where Studio taxonomy writes are **client SDK** paths that **cannot** Admin-write `taxonomyMaterialization/**` under the proposed Rules. Treat as **approved_with_changes**: fold the Required Changes below into the plan (or Implement kickoff constraints) **before** any Implement authorization phrase.

**Implement is not authorized by this review.** Owner still needs a separate Implement approval after Required Changes are acknowledged.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | **pass** | Attribution + architecture + gates; Implement/prod/PR #40/Algolia design index out |
| Architecture alignment | **pass_with_changes** | Derived projection OK; rebuild **must** be server-owned (see RC1–RC2) |
| Security impact addressed | **pass_with_changes** | Staff-read / client-write-false is right; define staff claim parity + no Stage 5 path revival (RC7) |
| Data model impact addressed | **pass_with_changes** | New collection needed; migration/bootstrap/rollback of empty meta must be explicit (RC4–RC5) |
| Backend impact addressed | **pass_with_changes** | Loader + Functions OK; Studio “sync in writer” is misleading without callable/trigger (RC1) |
| Test strategy adequate | **pass_with_changes** | Add exhaustive writer-registry + multi-instance fallback containment (RC2, RC3) |
| Human checkpoints identified | **pass** | Formal Review → Implement phrase → dev Rules/Functions → 45-design → Signoff; prod separate |
| Roadmap alignment | **pass** | Fits `post-launch-catalog-and-processing-stability` / taxonomy spike follow-up |
| Documentation plan | **pass** | BACKEND, DATA_MODEL, DECISIONS ADR listed |
| No silent scope expansion | **pass** | Portal / Algolia design index / prod / Storage Option A deferred; Stage 5 surfaces forbidden |

---

## Mandatory challenge answers

### 1. Is this secretly rebuilding the generated snapshot architecture?

**No — not Stage 4/5 revival — but it is a derived projection and must stay narrowly scoped.**

| Old generated snapshot stack | This proposal |
|------------------------------|---------------|
| Public/client Storage under `generated/portal-catalog/**` and `generated/catalog-reference/**` | New Firestore `taxonomyMaterialization/**` (staff read; client write false) |
| Design-write / publisher-triggered full pubs | Rebuild **only** on taxonomy writes |
| Portal browse + AI dual consumers on Storage | AI + Studio taxonomy hydrate only; Portal/Algolia design index out of scope |
| Stage 5 deleted those Storage surfaces + Rules | Plan forbids reviving those prefixes |

This is architecturally a **cache/projection**, not a second source of truth — **if** Firestore tags/categories remain canonical and writers never treat chunks as authority. Calling it “not a snapshot” rhetorically is weak; treat it as **bounded taxonomy materialization** with Stage 5 lockouts.

**Required posture:** Do not name/paths under `generated/**`. Do not add Storage Rules for catalog-reference/portal-catalog. Do not rebuild on design write / Algolia sync / enqueue.

---

### 2. Is Firestore still authoritative?

**Yes — plan states this correctly and must keep it hard.**

- Authoritative: `tags/**`, `categories/**` (and existing archive guard Functions writing those docs).
- Derived: `taxonomyMaterialization/meta` + `chunks/**`.
- AI/Studio loaders may prefer materialization for **read cost**, but matching correctness is “dictionary equivalent to approved FS corpus,” not “chunks are truth.”
- On conflict/corruption: FS fallback (bounded) or last-good revision — never invent tags from Algolia.

**No change needed** beyond locking this in ADR language during Implement docs.

---

### 3. Can stale materialization cause wrong tags/categories?

**Yes — unless freshness is fenced harder than the current draft.**

Stale windows exist when:

1. **AI process cache** still uses 15 min TTL without revision key → post-edit AI can resolve against old Maps until TTL expires.
2. **Async rebuild** (H1 deferred) → meta.revision bumps before chunks catch up, or chunks update while readers see prior revision.
3. **Studio disk cache** stays valid until `local.revision === meta.revision` — correct **only if** meta bumps atomically with successful chunk publish.
4. **Rebuild failure** leaving prior revision → AI/Studio miss newly created/renamed tags/aliases until FS fallback or repair.

Plan’s “prefer revision-keyed AI cache” and “prefer sync rebuild” are the right defaults but are currently **soft**.

**RC5 required:** Lock (a) AI cache keyed by `revision` (TTL secondary/optional), and (b) **atomic publish** semantics: readers must never observe `meta.revision` pointing at incomplete/corrupt chunk set (fence token / `contentHash` / dual-meta swap — pick one and document).

---

### 4. Can any taxonomy writer bypass invalidation?

**Yes today as written — this is the primary approval condition.**

Plan inventory (create/update/bulk/approveSuggested/archive/restore for tags + categories) is good, but:

- Studio `catalogTagService` / `categoryService` are **client** writers. Proposed Rules: **client write false** on `taxonomyMaterialization/**`. Clients **cannot** rebuild chunks themselves.
- Archive paths already go through Admin Functions (`archiveTagWithGuards` / `archiveCategoryWithGuards`) — easy to miss if “wire Studio services” is interpreted as client-side bump only.
- “Shared helper called by both services + archive Functions” understates the real design: **all client writes must invoke a server rebuild path**, and all Admin write paths must share that same path.

Without an **exhaustive writer registry + automated containment**, a future bulk/approve/reorder path will silently skip rebuild → stale tags in AI/Studio.

**RC1–RC2 required** (see below). Prefer **approved_with_changes** specifically for this.

---

### 5. Does the plan really remove O(tag-count) reads?

**Yes in steady state; no for unmanaged fallback / management screens.**

| Path | After |
|------|--------|
| Cold AI, healthy materialization | **O(chunkCount)** FS docs (target 1–3 now), not 1,139 |
| Warm AI same instance | 0 (process cache / revision hit) |
| Studio AI Review, warm disk | **0–1** (meta) |
| Studio AI Review, cold disk | O(chunks) once |
| Studio management `includeArchived` | Still O(tag-count) FS lists (**accepted**, out of critical path) |
| Fallback `taxonomy-fallback-fs` | **O(tag-count)** again |

So the spike class is removed **only if** materialization is present and fallback is rare/bounded.

---

### 6. Does it work with multiple cold Function instances?

**Yes for the happy path; dangerous for the miss path.**

- Happy: N cold instances → **N × O(chunks)** — acceptable and correctly stated.
- Miss/corrupt globally: N cold instances each doing single-flight FS full load → **N × 1,139** (per-process single-flight does **not** cross instances).

P3 already showed multi-design on one warm instance is fine; multi-instance cold is the residual cost — materialization fixes the coefficient, not the N multiplier.

**RC3 required:** Do not flip AI loader to “prefer materialization” until bootstrap rebuild verified; add fallback circuit/telemetry so a missing collection cannot recreate a multi-instance spike storm unnoticed.

---

### 7. Is Studio persistence safe and correctly invalidated?

**Mostly yes; invalidation contract needs sharper write-path semantics.**

Safe:

- Local `userData` staff-machine cache is fine; not a multi-user security boundary (plan says this).
- Validity iff `local.revision === meta.revision` is the right predicate.
- Corrupt file → delete + refetch is correct.

Gaps:

- After a successful taxonomy write, Studio must not assume in-memory/disk corpus is current until rebuild completes and meta is readable — or must merge local write into local cache **and** still bump server materialization for other machines/Functions.
- “Temporary FS list until chunks exist” during migration can reintroduce the 1,139 spike on AI Review if Implement order is wrong (Studio cache before materialization bootstrap).

**RC4 / RC6:** Sequence Studio disk short-circuit **after** verified materialization exists on dev; define post-write Studio behavior (await rebuild vs optimistic local patch + forced meta refresh).

---

### 8. Is Algolia alternative dismissed/accepted with evidence?

**Dismissed as primary — with adequate product/architecture evidence; not with new latency benchmarks.**

Plan evidence (accepted for Formal Review):

- AI resolver needs **complete** approved name/alias dictionary in memory (exact+alias Maps) — Algolia per-design search is the wrong model.
- Treating Algolia as taxonomy truth risks non-authoritative drift vs Firestore.
- Studio hydrate is not cleanly fixed without still caching a full set locally.

Measured “Algolia browse-all aliases cost” is **not** provided; not required to reject Option C as **primary**. Do **not** reopen Option C in Implement without a new plan.

---

### 9. Does fallback reintroduce massive Firestore reads?

**Yes — by design, and currently under-specified for fleet behavior.**

Section 12 correctly requires single-flight + process cache “never per-design.” That prevents **intra-instance** storms only.

Still possible:

- Empty/missing materialization after deploy
- Corrupt chunks / schemaVersion mismatch
- Partial publish without fence
- Many concurrent cold starts during an outage

**RC3 required:** Bootstrap gate + explicit fallback policy (log `taxonomy-fallback-fs`, metric/alert, optional hard fail-closed after K fallbacks per instance per window, feature flag back to FS-only for rollback).

---

### 10. Does proposal scale to 10K+ tags?

**Yes for reads (chunks); write-path rebuild cost is the real 10K risk.**

- Live measure: ~300 KiB AI shape now; ~2.67 MiB @ 10K → exceeds 1 MiB doc → chunks required (plan correct).
- Read path: O(chunks) scales if partition algorithm keeps chunk size bounded (~900 KiB).
- Write path: sync rebuild that re-serializes 10K tags on every tag edit may become slow/contention-heavy; async + fence becomes necessary later (H3/Option A).

**RC8:** Before Implement, fix chunk partitioning algorithm (stable order/hash), max chunk bytes, and a numeric “when chunks > K or rebuild p95 > T → revisit Option A / async” trigger — not just “defer until 5K pressure.”

---

### 11. Are Stage 5 Storage/Rules retirements preserved?

**Yes — if Required Change RC7 is treated as a hard Implement constraint.**

Plan explicitly forbids reviving:

- `generated/portal-catalog/**`
- `generated/catalog-reference/**`

Prefers Firestore chunks over private Storage first — aligned with ADR-FP-127 / Stage 5 “Strategy 2 KEEP; no tags-only Storage rebuild.”

Containment tests must assert **no** imports/writes to retired generated catalog paths and **no** Storage Rules reopening those prefixes.

---

### 12. Are security rules strictly private/bounded?

**Intent yes; specificity insufficient.**

Proposed:

- `taxonomyMaterialization/**`: staff read; client write false; Admin/Functions write only
- No public read
- No Admin Algolia/Gemini keys in Studio

Missing for Implement:

- Exact staff predicate must **match existing Studio staff/admin claim helpers** (no new ad-hoc allow).
- Rules unit tests for: unauthenticated deny, non-staff deny, staff read allow, client write deny, path confinement (no accidental public).
- Chunk payload includes `preferredWhen` / aliases — acceptable for staff-only; must not become Portal-readable.

**RC7 required.**

---

### 13. Any hidden production dependency?

**No hidden prod dependency in the plan as scoped — keep it that way.**

- Implement / Rules / Functions deploy: **dev only**.
- Production: separate Stage / owner phrases.
- Rollback: feature-flag loader to FS-only (P3 behavior).

Residual risk: accidental prod Functions deploy that “prefers materialization” while prod collection empty → fallback storm. Mitigate with project-pinned deploy gates + flag defaulting safe until bootstrap verified **per environment**.

Not a plan blocker if prod remains explicitly unauthorized.

---

## Architecture Review

**Findings:**

- Correct problem split: server cold hydrate vs Studio AI Review hydrate; publishers proven absent.
- Hybrid B+D is the right primary vs Algolia-primary or D-alone.
- Critical design hole: client Studio writers vs Admin-only materialization writes.
- “A-ready packaging” is fine as schema portability; must not become silent Storage work in this phase.

**Required changes:**

- [ ] RC1 — Server-owned rebuild path for **all** taxonomy mutations
- [ ] RC2 — Exhaustive writer registry + containment tests
- [ ] RC5 — Atomic revision/chunk publish + revision-keyed AI cache
- [ ] RC8 — Chunk partition + scale trigger numbers

---

## Security Review

**Findings:**

- Staff-private derived docs are appropriate; public generated Surfaces must stay dead (Stage 5).
- Main security failure mode is Rules widening or path revival, not the materialization concept itself.
- Local disk cache is not a cross-user boundary — OK if documented.

**Required changes:**

- [ ] RC7 — Exact staff claim + Rules tests + Stage 5 negative checklist

**Human approval needed before production:**

- [ ] Production Rules/Functions deploy (out of this plan — remains gated)
- [ ] Any future Option A private Storage (new Stage; not this Implement)

---

## Data Model Review

**Findings:**

- New entities (`meta`, `chunks`) are justified; tags/categories unchanged as SoT.
- No hard-delete of taxonomy (good).
- Migration needs one-shot bootstrap before loader flip.
- Status field in chunks currently shows `"approved"` only — confirm archived exclusion for AI/Studio picker materialization vs management FS lists (plan §6.6 / H2 implies approved/active corpus — make explicit).

**Required changes:**

- [ ] RC4 — Bootstrap-before-flip sequence
- [ ] RC9 — Explicit inclusion rules (approved/active only vs archived) in schema ADR

---

## Backend Review

**Findings:**

- Loader change + observability extensions are appropriate.
- Archive Functions wiring is necessary but incomplete alone.
- Optional owner-admin rebuild callable is OK if least-privilege and dev-gated; prefer also an automatic path so humans are not in the steady-state loop.
- Sync rebuild default (H1) is acceptable **on server** while taxonomy edits remain rare; do not pretend Studio client can sync-write chunks.

**Required changes:**

- [ ] RC1, RC3, RC6

---

## Testing Review

**Findings:**

- Automated list is directionally right (builder size, loader prefer, fallback once, Studio short-circuit, resolver parity, containment).
- Missing: writer-registry exhaustiveness; multi-instance fallback policy test/doc; Rules tests; publish-fence test (meta never points at incomplete chunks).

**Required changes:**

- [ ] RC2, RC3, RC5, RC7 (test bullets)

Manual 45-design acceptance table is strong and should remain the Signoff gate on `fresh-prints-dev`.

---

## Documentation Review

**Findings:**

- BACKEND / DATA_MODEL / DECISIONS ADR are the right durable updates.
- ADR must state: Firestore authoritative; materialization derived; Stage 5 paths remain retired; freshness/fence contract; fallback policy.

---

## Required Changes (must apply before Implement)

These are **actionable plan/Implement-constraint edits**. Planning may fold them into the plan Approach without a full re-plan; Implement must not start until they are acknowledged in the plan or kickoff notes.

1. **RC1 — Server-owned rebuild for every taxonomy write**  
   Specify the concrete mechanism: **Callable invoked after Studio client writes** and/or **Firestore `onWrite` triggers on `tags`/`categories`**, plus direct calls from archive Admin Functions. Do **not** claim Studio client services “sync rebuild” materialization docs under client-write-false Rules. One shared server helper: `scheduleTaxonomyMaterializationRebuild()` / `rebuildTaxonomyMaterialization(revisionFence)`.

2. **RC2 — Exhaustive writer registry + bypass-proof tests**  
   Publish a checklist of every create/update/reorder/bulk/approveSuggested/archive/restore path (Studio services + hooks + archive Functions). Add automated containment that fails if a known write path exists without invoking the shared rebuild entrypoint (source-scan or shared-module-only write API).

3. **RC3 — Fallback storm controls**  
   Before flipping the AI loader: require verified bootstrap materialization on the target project. Document fleet behavior: per-process single-flight **and** telemetry/alert on `taxonomy-fallback-fs`; define a safe degradation (feature flag FS-only / circuit after repeated fallbacks). Explicitly state that single-flight does **not** prevent N-instance × 1,139 during global miss.

4. **RC4 — Migration order lock**  
   Enforce: types/Rules → one-shot rebuild → verify meta+chunks → switch AI loader → wire writers → **only then** Studio revision short-circuit. Forbid Studio “skip listTags when cache warm” while materialization is absent (temporary FS list must not become the steady AI Review path after signoff).

5. **RC5 — Freshness fence (no soft prefer)**  
   Make AI process cache **revision-keyed** (mandatory). Define atomic publish so `meta.revision` never references incomplete chunks (`contentHash` match / writing staging then swap / generation fence — pick one). If async rebuild is ever used, document max staleness and reader behavior during rebuild; default remains sync server rebuild for this phase.

6. **RC6 — Studio post-write invalidation semantics**  
   After taxonomy mutation: clear in-memory caches, invalidate/replace local disk cache, and refresh from new meta/chunks (or await rebuild callable result). Dual-machine Studio correctness must not depend on “same process wrote the tag.”

7. **RC7 — Rules + Stage 5 negative lock**  
   Define staff read using existing claim helpers; client write false; Admin-only writes. Add Rules unit tests. Explicit Implement negative checklist: no `generated/portal-catalog/**`, no `generated/catalog-reference/**`, no Storage Rules revival for those prefixes, no public read on materialization.

8. **RC8 — Chunk scale contract**  
   Specify partitioning algorithm, per-chunk soft cap (~900 KiB), expected chunkCount at current and 5K/10K projections, and a concrete revisit trigger for async rebuild and/or Option A private Storage (new plan — not silent expansion).

9. **RC9 — Corpus inclusion rules**  
   State explicitly that AI/Studio picker materialization includes **approved/active** taxonomy only; archived management remains FS `includeArchived` (H2). Chunk schema must not silently drop aliases/`preferredWhen` required by AI resolvers.

---

## Blockers

**None for planning/review closure.**  
**Implement blocked** until RC1–RC9 are folded into the plan (or written as binding Implement constraints) **and** owner issues the Implement approval phrase.

---

## Verdict Rationale

**approved_with_changes** — not **approved** — because:

- Writer-bypass risk is real given client Studio services + Admin-only materialization writes.
- Fallback language underplays multi-instance O(tag-count) storms.
- Freshness is “prefer” where it must be “must.”

Not **blocked/rejected** because:

- Attribution is strong and evidence-based.
- Firestore remains authoritative.
- Stage 5 surfaces are correctly forbidden.
- Hybrid B+D is the right architecture vs Algolia-primary or D-alone.
- Scope, human gates, tests, and rollback are otherwise adequate.

---

## Next Step

1. Planning Agent (or Implement kickoff notes) incorporates **RC1–RC9** into the plan.  
2. Owner issues Implement approval phrase only after that acknowledgment.  
3. Then: Implement → Test (incl. Rules + writer containment + 45-design manual) → Signoff — **dev only**.  
4. Production / PR #40 / Storage Option A remain unauthorized.
