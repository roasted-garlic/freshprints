# Diagnosis: AI Review approve permission-denied (companion / censored QA)

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Owner reports | `DEV COMPANION CENSORED QA: FAIL` + follow-up evidence that metadata/companion writes persist while approve fails |
| Status | **Root cause proven; Rules fix deployed to `fresh-prints-dev` only — await owner re-QA** |

---

## Owner evidence (authoritative)

On `fresh-prints-dev`:

1. Expects companions OFF + Explicit Content OFF → **Approve succeeds**
2. Explicit Content ON only → Approve **fails** permission-denied; after navigate away/return **`isExplicitContent` still ON**
3. Expects companions ON → Approve **fails** permission-denied; companion expectation state **still persisted**

Conclusion: metadata / companion writes succeed; failure is the **final** `designs/{designId}` transition to `status: "ready"`.

---

## Emulator sequences

| Sequence | Result (before fix) | Result (after fix) |
|----------|---------------------|--------------------|
| Minimal: write `isExplicitContent` then → ready | ALLOW | ALLOW |
| Minimal: companion denorm then → ready | ALLOW | ALLOW |
| Minimal control → ready | ALLOW | ALLOW |
| **Live-shaped** design (large `aiSuggestions` + explicit/companion fields) → ready | **DENY** | **ALLOW** |

Independent field-write and approve-alone tests were insufficient; the fail mode required **sequential persisted state on a production-sized AI enrichment document**.

---

## Exact rejecting condition

Not a field allowlist gap for `isExplicitContent` / `companionSetId` / `companionSetIncomplete` (those validators already existed and accept the types).

**Rejecting mechanism:** Firestore Rules **1000-expression evaluation limit** on `match /designs/{designId}` `allow update` (@ L967+), surfaced as:

```text
PERMISSION_DENIED: Unable to evaluate the expression as the maximum of 1000 expressions
to evaluate has been reached. for 'update' @ L967
```

**Predicate that burned the budget:** `clientAiFieldsUnchanged()` previously deep-compared:

```
request.resource.data.get("aiSuggestions", null) == resource.data.get("aiSuggestions", null)
```

(and the same for `aiAnalysis`). Deep `==` on large catalog-enrich `aiSuggestions` maps consumes expressions proportional to map size. Approving after new optional fields / adding `readyAt`/`aiReviewedAt` pushed evaluation over the limit → SDK `permission-denied` → UI *"You do not have permission to perform this action."*

Why Explicit/Companions OFF could still pass: fewer optional-field present-branches + same large map was near the ceiling; the ready transition with extra optional timestamps + present companion/explicit fields tipped over.

---

## Fix (smallest Rules correction)

Replace deep map equality with `diff().affectedKeys()`:

```javascript
function clientAiFieldsUnchanged() {
  return !request.resource.data.diff(resource.data).affectedKeys()
    .hasAny(["aiSuggestions", "aiAnalysis", "aiProcessingStage"]);
}
```

Same security intent (clients cannot forge AI pipeline fields); constant-cost relative to enrichment payload size.

Regression tests:

- `tests/firebase/designCatalogApprovalSequential.rules.test.ts`
- `tests/firebase/designCatalogApprovalExpressionBudget.rules.test.ts` (large `aiSuggestions` + Seq 1/2/3 + forge deny)

---

## Deploy

| Target | Action |
|--------|--------|
| `fresh-prints-dev` | `firestore:rules` only |
| `fresh-prints-prod` | **not touched** |
| Algolia / App Hosting / Studio package / myprintrequest.com | **not touched** |

---

## Owner re-QA

Retry the three sequences on Studio → `fresh-prints-dev`. Reply:

- `DEV COMPANION CENSORED QA: PASS`
- `DEV COMPANION CENSORED QA: FAIL: …`
- `DEV COMPANION CENSORED QA: PASS WITH NOTES: …`
