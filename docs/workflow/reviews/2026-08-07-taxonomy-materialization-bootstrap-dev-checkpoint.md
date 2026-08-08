# Dev Bootstrap Checkpoint — Taxonomy materialization (blocked pending Functions deploy)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Owner phrase | `APPROVE DEV TAXONOMY MATERIALIZATION BOOTSTRAP` |
| Project | `fresh-prints-dev` (intended) |
| Follow-up | `taxonomy-read-spike-elimination` |
| Result | **STOPPED — bootstrap not executed** |
| Reason | Only approved bootstrap path requires undeployed Functions |

---

## Pre-bootstrap check (passed / blocked)

| Check | Result |
|-------|--------|
| Target project would be `fresh-prints-dev` | Confirmed intent |
| `tags`/`categories` remain authoritative | Yes (source) |
| Writes only `taxonomyMaterialization/**` | Yes (shared rebuild) |
| Approved tags + active categories only | Yes (builder) |
| No generated portal-catalog / catalog-reference writes | Yes |
| No design / Storage / production | Confirmed |
| Bootstrap without Functions/Rules deploy | **FAIL — see below** |

---

## Approved bootstrap mechanism (repo check)

| Mechanism | Path | Live on `fresh-prints-dev`? |
|-----------|------|------------------------------|
| Shared rebuild | `functions/src/taxonomy/rebuildTaxonomyMaterialization.ts` → `rebuildTaxonomyMaterialization` | Logic in source only |
| Callable | `rebuildTaxonomyMaterializationCallable` in `functions/src/taxonomy/onTaxonomySourceWritten.ts` | **Not deployed** |
| Triggers | `onTagTaxonomySourceWritten` / `onCategoryTaxonomySourceWritten` | **Not deployed** |
| Ops script | None in approved Implement | **Absent** |

Plan wording allowed “one-shot rebuild callable/**script**”; Implement shipped **callable + triggers only** — no Admin SDK ops script.

Per owner gate: **do not improvise** a new local script; **do not deploy** under this phrase.

---

## Minimal deploy required before bootstrap (owner approval needed)

**Project:** `fresh-prints-dev` only.

**Minimum for one-shot bootstrap (no Rules deploy required for Admin write):**

```bash
firebase deploy --only functions:rebuildTaxonomyMaterializationCallable --project fresh-prints-dev
```

Then invoke the callable as an authenticated owner/admin (Studio callable bridge or Firebase callable client), e.g. function name:

`rebuildTaxonomyMaterializationCallable`

**Notes:**

- Rules deploy is **not** required for the callable’s Admin SDK write of `taxonomyMaterialization/**`.
- Rules deploy **is** still required later for Studio **client** reads of materialization (`isStaff()`).
- Steady-state writers also need the taxonomy source triggers deployed (separate from one-shot bootstrap):

```bash
firebase deploy --only \
  functions:rebuildTaxonomyMaterializationCallable,\
  functions:onTagTaxonomySourceWritten,\
  functions:onCategoryTaxonomySourceWritten \
  --project fresh-prints-dev
```

Suggested owner sequence after this STOP:

1. Approve **minimal Functions deploy** (callable ± triggers) to `fresh-prints-dev`
2. Re-authorize bootstrap / invoke callable
3. Verify meta + chunks
4. Later: Rules deploy for staff client read + loader flip validation

---

## Confirmations (this pass)

- NO bootstrap mutation executed
- NO Functions deploy
- NO Rules deploy
- NO Storage change
- NO production
- NO PR merge

**STOP.**
