# DEV QA — Studio smoke corrective A–E

| Field | Value |
|-------|-------|
| Date | 2026-08-12 |
| Branch | `hotfix/studio-smoke-corrective-a-e` |
| Base | `origin/production` `15c6492322157bf972168635787c8244898bfd9e` |
| Environment | **fresh-prints-dev** only |

## DEV deploy layers (before QA)

1. Firestore Rules (`settings/showQueue` → owner/admin write)
2. Functions: AI pipeline + `promoteCustomerUploadToAiReview` / `retryCustomerUploadProcessing` auth + `enqueueAiEnrichment` / `resetAiEnrichmentForProcessing`
3. Studio against DEV Firebase + DEV Algolia (search-only; **no** Algolia settings mutation)

Do **not** deploy production. Do **not** publish Studio 1.0.4 yet.

### Suggested commands (DEV)

```bash
# From repo root on hotfix branch, after confirming firebase project = fresh-prints-dev
firebase use fresh-prints-dev
firebase deploy --only firestore:rules
# Scoped functions — adjust allowlist to match project deploy practice:
firebase deploy --only functions:promoteCustomerUploadToAiReview,functions:retryCustomerUploadProcessing,functions:enqueueAiEnrichment,functions:resetAiEnrichmentForProcessing
# Plus any shared AI pipeline modules if deployed as part of those entry points
```

If the project deploys Functions as a group, document the exact allowlist used in the deploy checkpoint.

## Owner QA checklist

### A/B — Design Library (ready catalog)

- [ ] Open tag filter **before** Load More: a tag that exists only beyond the first page shows the correct full-catalog count
- [ ] Load More does **not** change that tag’s count merely by hydrating more cards
- [ ] Tag-only filter with few matches: Load More hidden/disabled when Algolia result exhausted
- [ ] Multi-page managed filter/search: Load More works until exhausted
- [ ] Text + tag / text + category still work
- [ ] Clear filters restores ordinary Firestore browse Load More
- [ ] Missing Algolia env fails closed (no invented counts)

### D — AI tags (D8-A)

- [ ] Manually assign a catalog tag on a design
- [ ] Re-run AI: same tag is **not** re-suggested; alias-equivalent also suppressed
- [ ] Human tag remains on the design and in AI Review Final Catalog after open/save
- [ ] Genuinely new AI tags still appear (up to 8 **additional**)
- [ ] Halftone / exclusions / category still behave

### E — Helper account (required — not owner)

Sign in as a real `role: helper` user on DEV:

- [ ] Uploaded Designs: **Send to AI Processing** on eligible Pending succeeds
- [ ] Retry/re-run AI where Owner/Admin can
- [ ] AI Review: edit title/description/category/tags/halftone; approve; reject
- [ ] No `permission-denied` on allowed actions
- [ ] **No** Show Queue Settings control
- [ ] Cannot manage users / owner-only settings / taxonomy approve / Whatnot Import Shows
- [ ] Assisted Creation remains helper read-only (ADR-FP-088)

### Regression

- [ ] Owner/Admin Show Queue Settings still works
- [ ] Owner/Admin AI Review unchanged
- [ ] Customer permissions unchanged

## Pass criteria

Reply with `PASS` / `FAIL: …` / `PASS WITH NOTES: …` after helper-account DEV QA.
