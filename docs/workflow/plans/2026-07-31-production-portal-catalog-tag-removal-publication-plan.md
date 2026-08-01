# Plan: Production Portal catalog tag-removal publication

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase (Goal #13 narrow slice) |
| Goal id | `production-portal-catalog-tag-removal-publication` |
| Incident | `docs/workflow/reviews/2026-07-31-production-portal-catalog-tag-removal-publication-incident.md` |
| Related | ADR-FP-120; Wave C catalog publisher |

---

## Goal

Ensure removing a tag from a ready catalog design in Studio removes that tag from **every** Portal generated-catalog surface (cards, tag filters, facets, search shards, discover/ready-index), with the same reliability as category changes, without abandoning ADR-FP-120 or forcing a full rebuild on every metadata edit.

---

## Background

Owner observed tag removal stuck on Portal while a category change on the same design published correctly. Read-only production audit proves Firestore already dropped the tag; the generated portal-catalog projection did not advance because republish **failed** (`FetchError`) with `requestedGeneration=9` / `publishedGeneration=8` / `status=failed`.

---

## Evidence-backed root cause

**Classification:** publisher coordination / failed full republish (not Portal cache, not missing change detection, not Studio write failure).

1. Studio correctly replaces `designs.tags` (`designService.ts`).
2. `classifyPortalCatalogDesignChange` correctly classifies tag edits as `index-filter` (same set as `categoryId`).
3. Trigger correctly dirties portal-catalog and attempts full `publishPortal`.
4. Production generation 9 attempt **failed** with `FetchError`; assets remain on generation 8 which still contains the removed tag on cards **and** reverse indexes.
5. Category looked correct because generation 8 already reflected the new `categoryId`.

Secondary code risk (not current prod cause): `publishPortalCardOverride` can overlay card tags without refreshing tag indexes if a card-only publish races after a full publish; current prod manifest has no `cardOverrides`.

---

## Scope

### In Scope

1. **Durable recovery for failed portal-catalog publication** when `requestedGeneration > publishedGeneration` and `status=failed` (or interrupted), so a failed tag-removal republish cannot leave Portal permanently stale until a human notices.
2. **Resilient Storage I/O** around portal-catalog publish (retry/backoff on transient `FetchError` / network Storage failures) without broadening privileges.
3. **Failing-before + passing-after automated tests** proving: tag removal dirties → failed publish leaves stale tag assets → recovery/retry clears removed tag from cards, tag filter, facet, and search terms while retaining other tags; category still publishes.
4. **Secondary harden (narrow):** ensure index-filter full publish remains authoritative over any prior `cardOverrides` (already true for new manifests; add regression that a post-failure / post-success state cannot reintroduce removed tags via overrides without rebuilding indexes — or document and test that card-only path must never run for tag/category field changes — already classifier-enforced).
5. Docs: incident already recorded; update ARCHITECTURE/ADR notes if recovery behavior changes; RISK_REGISTER entry if FetchError persistence is new.
6. **Separate human checkpoint** after implement: one owner-approved production republish to drain the current stuck generation 9 backlog (exact mechanism in Approach — not invoked in Plan/Review pass).

### Out of Scope

- Firestore schema-parity audit; resize/registration/branding/TD-029
- Custom domain / GA4 / taxonomy redesign / adding tags or categories
- Silent `rebuildCatalogSnapshots` / production data repair / Stage 2 / any deploy in this Plan→Review pass
- Broad cache disabling or Portal direct Firestore catalog reads as workaround
- Full catalog rebuild on every metadata change as the primary fix

---

## Affected Areas

### Files / Modules (expected)

| Path | Role |
|------|------|
| `functions/src/catalogSnapshots/publishCatalogSnapshots.ts` | `markAndPublishAfterDebounce`, `publishKind`, Storage save/load — recovery + retries |
| `functions/src/catalogSnapshots/portalCatalogChangeClassifier.ts` | Confirm tags remain `index-filter` (likely unchanged) |
| `functions/src/catalogSnapshots/*.test.ts` | Failing-before / recovery / FetchError retry tests |
| `packages/shared/src/catalog-snapshots/*` | Only if shared helpers extracted for recovery predicates |
| `docs/architecture/ARCHITECTURE.md` / `DECISIONS.md` ADR-FP-120 | Document failed-publish recovery |
| `docs/project/RISK_REGISTER.md` | FetchError / stuck dirty coordination |

Mark unverified helpers at implement as `[NEEDS REPO CHECK]`.

### Architecture Impact

- [x] Details: Preserve ADR-FP-120 debounce/lease/full vs card-only split. Add durable recovery for failed full publishes — not a new read model.

### Security Impact

- [x] Details: No client privilege expansion; no Portal Firestore catalog reads; Storage rules unchanged. Republish remains Admin/Function-only.

### Data Model Impact

- [x] None for `designs.tags` shape. Coordination doc fields already exist.

### Backend Impact

- [x] Details: Functions change + production Functions deploy checkpoint after implement. Optional one-time republish checkpoint to clear stuck prod generation. No Firestore Rules change expected.

### UI / UX Impact

- [x] None intentional. Portal becomes correct after successful republish.

### Migration Impact

- [x] No schema migration. **Operational catch-up:** one successful portal-catalog publish required to refresh stale gen-8 assets after code/deploy (or interim owner-approved rebuild).

---

## Approach

1. **Reproduce failing-before in tests:** seed ready design with tags `A,B`; build/publish generated assets; remove `B`; force `publishPortal`/`publishKind` to throw `FetchError`; assert coordination `requested > published` and generated tag assets still contain `B`.
2. **Implement Storage write/read retries** with bounded backoff for transient fetch failures inside portal-catalog publish helpers.
3. **Implement durable wake/recovery:** when coordination shows dirty/failed and `requestedGeneration > publishedGeneration`, ensure a follow-up pass runs (e.g. second debounce pass already partially exists — fix early `return` on lease-active without losing dirty bit; and/or scheduled/onCall-safe retry path that does **not** require another design edit). Prefer extending existing `markAndPublishAfterDebounce` / lease loop over a new architecture.
4. **Regression:** successful recovery publish removes `B` from discover/card, `filters/tags/B`, facet, and search terms; keeps `A`; category change still `index-filter`.
5. **Secondary:** add explicit test that tag/category field changes never take the card-only override path.
6. **Docs + risk register.**
7. **Stop for deploy phrases:** Functions deploy; then owner-approved production republish to clear stuck state; then owner Portal QA; Stage 2 remains separately gated.

### Preserve

- Firestore canonical; ADR-FP-120 manifests; 15s debounce; 10m lease; batch rebuild; card-only for true card-only fields; tag aliases/taxonomy; category behavior.

---

## Test Strategy

### Automated (required)

| Case | Expect |
|------|--------|
| Tag removal classifies `index-filter` | unchanged / reinforced |
| Category change classifies `index-filter` | unchanged |
| Failing-before: publish throws → stale tag remains in projected assets / coordination failed | fail under current recovery behavior; pass after |
| Passing-after: recovery clears removed tag everywhere; retains others | pass |
| Zero tags allowed if product allows empty array | publish omits design from all tag filters |
| Card-only path not used when tags change | pass |
| Lease-active skip does not permanently drop a higher `requestedGeneration` | pass |

### Manual (after deploy + republish)

| Check | Expect |
|-------|--------|
| Remove one of several tags on ready design | Portal card/detail/filter/facet/search drop it after publish settles |
| Change category | Still publishes |
| Hard refresh / Incognito | Matches |
| Studio still shows correct tags immediately | OK |

---

## Human Checkpoints Anticipated

| Checkpoint | Phrase / action |
|------------|-----------------|
| Implement | `APPROVE PORTAL CATALOG TAG REMOVAL PUBLICATION FIX IMPLEMENTATION` |
| Production Functions deploy | Separate phrase after implement review |
| Production republish / catch-up | Separate phrase — may be targeted retry **or** owner-approved `rebuildCatalogSnapshots`; **not** silent |
| Owner Portal QA | `PASS` / `FAIL` / `PASS WITH NOTES` |
| Resume Stage 2 | Separate authorization |

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| FetchError is non-transient (permissions/network) | Diagnose in implement; retries won’t help — escalate with logs |
| Recovery storms | Bound retries; keep lease |
| Catch-up republish load | One-shot after deploy; prefer incremental wake over unnecessary full bootstrap unless required |

**Rollback:** Redeploy prior Functions revision; prior Storage generation remains addressable via manifest history / previousContentVersion where retained.

---

## Open Questions

1. Exact Storage operation that threw `FetchError` (download vs save vs metadata) — confirm from Functions logs during implement `[NEEDS REPO CHECK]`.
2. Whether catch-up should be a narrow “retry portal-catalog publish” callable vs existing `rebuildCatalogSnapshots` — prefer narrow if safe; owner chooses at deploy checkpoint.

Neither blocks Formal Review of the remediation direction.

---

## Implementation approval phrase (after Formal Review approves)

```text
APPROVE PORTAL CATALOG TAG REMOVAL PUBLICATION FIX IMPLEMENTATION
```

Do **not** implement, deploy, invoke `rebuildCatalogSnapshots`, modify production data, resume Stage 2, or begin domain cutover until that phrase (and later deploy/republish phrases) are given.
