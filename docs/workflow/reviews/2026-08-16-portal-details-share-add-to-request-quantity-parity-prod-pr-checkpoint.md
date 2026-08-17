# Checkpoint: Production promotion PR — TD-030 qty parity (no merge)

| Field | Value |
|-------|-------|
| Date | 2026-08-16 |
| Managed goal | `portal-details-share-add-to-request-quantity-parity` |
| Signoff | `docs/workflow/reviews/2026-08-16-portal-details-share-add-to-request-quantity-parity-signoff.md` — **approved** |
| PR base | `origin/production` |
| Status | **PR opened — STOP for owner pre-merge audit** |
| PR | [#79](https://github.com/roasted-garlic/freshprints/pull/79) |
| Production base SHA | `62d790f8ca740e5c9d8c5b7c5b16b6feb7cbfdc0` |
| PR head SHA | `1eed706e6ad2c019064479d0f0468f1ccac670cc` |
| Merge | **NOT authorized** |
| App Hosting | **NOT authorized** |

---

## Scope (intended PR contents)

### Application
- `apps/portal/features/catalog/pages/ShareDesignPortalPageContent.tsx`
- `apps/portal/features/catalog/components/CatalogDesignDetailsRequestQty.test.ts`

### Workflow / project docs (this goal only)
- Plan, Formal Review, Implementation Review, test report, DEV QA / FAIL investigation / DEV data repair, Signoff, this checkpoint
- `docs/project/TECH_DEBT.md` — TD-030 → resolved
- Minimal ROADMAP / handoff / workflow state updates for goal close

### Explicitly excluded
- myprintrequest.com cutover artifacts
- Studio 1.0.7 / unrelated Portal plans (e.g. tag-alias)
- Functions, Rules, indexes, Storage, Algolia, Auth, DNS
- Production App Hosting rollout commands (run only after merge + owner phrase)

---

## After owner merge (later)

Authorization phrase (do not send until merge approved):

```
AUTHORIZE PROD APP HOSTING ROLLOUT: TD-030 QTY PARITY
```

Target: backend `fresh-prints-portal` / project `fresh-prints-prod` from the merged production tip.

---

## Owner pre-merge audit

Agent must return (and stop):

1. PR number + URL  
2. production base SHA  
3. PR head SHA  
4. complete changed-file list  
5. complete commit list in the PR  
6. `git diff --stat origin/production...HEAD`  
7. `git diff --name-status origin/production...HEAD`  
8. `git status --short`  
9. confirmation whether any files/commits are outside TD-030 scope  

**Do not merge. Do not roll out App Hosting.**
