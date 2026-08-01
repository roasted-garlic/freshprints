# Formal Review: Production Portal catalog tag-removal publication

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Reviewer | Review Agent (independent of Planning Agent) |
| Plan | `docs/workflow/plans/2026-07-31-production-portal-catalog-tag-removal-publication-plan.md` |
| Incident | `docs/workflow/reviews/2026-07-31-production-portal-catalog-tag-removal-publication-incident.md` |
| Verdict | **approved** |

---

## Summary

The Plan correctly identifies a **failed portal-catalog republish** (`FetchError`, `requestedGeneration=9` /
`publishedGeneration=8`, `status=failed`) as the production root cause of stale tags, not missing
change detection or Studio write failure. Category “worked” because generation 8 already contained
the new category. The proposed fix—Storage retries plus durable recovery for failed/dirty
coordination, failing-before tests, and a separate owner-approved catch-up republish—is the
narrowest ADR-FP-120-aligned remediation. Secondary `cardOverrides` risk is correctly parked as
non-causal for the live incident.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | No silent rebuild; no Stage 2; Functions + recovery focused |
| Architecture alignment | pass | Preserves ADR-FP-120 full vs card-only split |
| Security impact addressed | pass | No Portal Firestore catalog workaround |
| Data model impact addressed | pass | No tag schema change |
| Backend impact addressed | pass | Functions + separate republish checkpoint |
| Test strategy adequate | pass | Failing-before stuck publish + multi-surface tag assertions |
| Human checkpoints identified | pass | Implement / Functions deploy / republish / QA / Stage 2 |
| Roadmap alignment | pass | Goal #13 Phase G; Stage 2 remains paused |
| Documentation plan | pass | Incident + ADR/risk updates |
| No silent scope expansion | pass | Out-of-scope list honored |

---

## Architecture Review

**Findings:**

- Classifier evidence confirmed: `tags` and `categoryId` share `INDEX_FILTER_FIELDS`
  (`portalCatalogChangeClassifier.ts` 17–24).
- Full publish rebuilds tag assets from cards (`publishCatalogSnapshots.ts` 476–485); no
  add-only merge bug for successful publishes.
- `buildPortalCatalogManifest` omits `cardOverrides`, so successful full publish clears override
  pointers — consistent with Plan’s secondary note.
- Recovery must not invent Portal Firestore reads or disable caching broadly.

**Required changes:** none.

---

## Security Review

**Findings:**

- Remediation stays server-side (Functions/Storage).
- Catch-up republish remains owner-gated — correct.
- No Rules relaxation proposed.

**Required changes:** none.

---

## Data Model Review

**Findings:**

- Canonical `designs.tags: string[]` already correct on prod; no migration.
- Coordination doc fields already carry the failure signal.

**Required changes:** none.

---

## Backend Review

**Findings:**

- Production coordination state is decisive evidence; Plan’s root cause is not speculative.
- Early `return` on `snapshot-publication-lease-active` (`markAndPublishAfterDebounce` ~758) can
  drop an in-flight wake without scheduling another pass — Plan correctly targets durable recovery.
- `FetchError` exact Storage call remains `[NEEDS REPO CHECK]` in logs during implement — acceptable
  open question; retries + recovery still required regardless.

**Required changes:** none before implement approval.

---

## Test Review

**Findings:**

- Failing-before stuck-publish scenario matches production.
- Multi-surface assertions (card, tag filter, facet, search) match the stale layers observed.
- Empty-tag and classifier regressions are appropriate.

**Required changes:** none.

---

## Risk Review

**Findings:**

- Non-transient FetchError correctly escalates to log diagnosis.
- Separate republish checkpoint avoids silent `rebuildCatalogSnapshots` in implement.

**Required changes:** none.

---

## Required Changes Before Implementation

None.

---

## Human Checkpoints Required

1. `APPROVE PORTAL CATALOG TAG REMOVAL PUBLICATION FIX IMPLEMENTATION`
2. Later: production Functions deploy phrase
3. Later: owner-approved catch-up republish (narrow retry or `rebuildCatalogSnapshots`)
4. Later: owner Portal QA; Stage 2 remains separately gated

---

## Verdict

**approved**

Exact next approval phrase:

```text
APPROVE PORTAL CATALOG TAG REMOVAL PUBLICATION FIX IMPLEMENTATION
```

Do not implement, deploy, invoke `rebuildCatalogSnapshots`, modify production data, resume Stage 2,
or begin custom-domain cutover until that phrase is received.
