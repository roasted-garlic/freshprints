# Taxonomy Mutation Server Rebuild — Verify Result

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Owner phrase | `TAXONOMY MUTATION SMOKE: OWNER MUTATION COMPLETE` |
| Project | **fresh-prints-dev** |
| Scope | **READ-ONLY** verify only |
| Verdict | **TAXONOMY MUTATION SERVER REBUILD: FAIL** |

---

## Verdict

**FAIL** — Canonical tag write succeeded; `onTagTaxonomySourceWritten` fired; materialization **did not** advance to revision 2.

---

## Checklist

| # | Check | Result |
|---|--------|--------|
| 1 | meta revision 1 → 2 | **FAIL** — still **1** |
| 2 | meta ready/healthy | **PASS** (ready=true; stale corpus) |
| 3 | contentHash changed from rev1 | **FAIL** — unchanged |
| 4 | chunk-0 matches rev2 + new hash | **FAIL** — still rev **1** / old hash |
| 5 | Recomputed integrity/hash | **PASS** for *current* (stale) docs |
| 6 | chunk-0 contains alias `taxonomy-smoke-20260807` | **FAIL** — absent |
| 7 | Canonical Firestore tag has same alias | **PASS** — `tags/acdc` |
| 8 | Counts 1121 / 18 | **PASS** |
| 9 | Trigger evidence `onTagTaxonomySourceWritten` | **PASS** (invoked; no rebuild) |
| 10 | Category trigger not responsible | **PASS** — no category runs |
| 11 | No unexpected rebuild loop | **PASS** — **0** rebuilds after mutation |

---

## Revision / hash

| | Before (bootstrap) | After owner mutation (live now) |
|--|--------------------|--------------------------------|
| revision | 1 | **1** (unchanged) |
| contentHash | `38e69b3851688e963470b1dc17c879a3e947a481c6d111a0d2a4fe74bdd33e59` | **same** |
| ready | true | true |
| tagCount / categoryCount | 1121 / 18 | 1121 / 18 |
| updatedBy | owner uid (callable) | still owner uid (callable) — **not** `onTaxonomySourceWritten` |
| updatedAtMs | `1786154932285` | unchanged |

Collection docs: `meta`, `chunk-0` only.

---

## Alias parity

| Surface | Result |
|---------|--------|
| Alias | `taxonomy-smoke-20260807` |
| Canonical FS | **Present** on approved tag `acdc` (`aliases: ["taxonomy-smoke-20260807"]`) |
| Tag `updateTime` | `2026-08-08T03:10:35.765Z` |
| Materialization chunk-0 | **Absent** |
| Parity | **FAIL** |

---

## Trigger / rebuild count

| Signal | Count / evidence |
|--------|------------------|
| `onTagTaxonomySourceWritten` HTTP invocations (≈03:08–03:10Z) | **3** (instance start + 2 writes): latencies ~4.3s / 0.98s / **0.18s** |
| Matching tag write | `tags/acdc` @ `03:10:35.765Z` ↔ trigger @ `03:10:35.905Z` status 200 |
| `onCategoryTaxonomySourceWritten` runs | **0** |
| `taxonomy-materialization-rebuild-success` after mutation | **0** |
| Only rebuild-success since deploy window | Bootstrap callable @ `02:08:52Z` revision **1** reason `callable-rebuild` |
| `taxonomy-materialization-rebuild-failure` | **0** |
| Duplicate rebuild loop | **No** (zero rebuilds, not excess) |

---

## Unexpected behavior / likely root cause

1. Tag trigger **did fire** and returned HTTP **200** in **~176ms** after the alias save — far too fast for a full 1121-tag rebuild.
2. No `taxonomy-materialization-rebuild-success` / `…-failure` from trigger path.
3. Source pattern in `onTaxonomySourceWritten.ts`: `scheduleCoalescedRebuild` uses **process-local `setTimeout(750)`** then returns from the Cloud Function handler **before** `rebuildTaxonomyMaterialization` runs. On Gen2/Cloud Run, work scheduled after the request completes is **not reliable** (instance can freeze/idle after response). That matches live evidence: trigger succeeds, rebuild never starts, materialization stays at revision 1.

This is a **server rebuild path defect**, not a Studio cache issue. Studio stale-refresh cannot be proven until revision actually advances.

---

## Confirmations

- NO taxonomy mutation by agent
- NO alias removal
- NO deploy
- NO production
- NO PR merge
- **STOP** before Studio stale-cache refresh test

---

## Next (owner / corrective — not executed)

1. Fix coalesce so rebuild **awaits inside** the trigger invocation (or use a durable queue/task), redeploy tag/category triggers on `fresh-prints-dev` under a new owner approve gate.
2. Re-run mutation smoke (alias already present — either remove+re-add, tweak another field, or temporary alias toggle) to prove revision 1→2.
3. Only then run Studio stale-cache refresh smoke.
