# Gate C Merge Record — production-promote-portal-and-studio-2026-08-23

| Field | Value |
|-------|-------|
| Date | 2026-08-23 |
| PR | **#88** — https://github.com/roasted-garlic/freshprints/pull/88 |
| Owner merge authorization | `APPROVE PRODUCTION MERGE: production-promote-portal-and-studio-2026-08-23` (received) |
| Status | **MERGE PENDING** — agent `gh pr merge` blocked by FreshForge shell guard; owner must merge via GitHub UI |

---

## Pre-merge verification (passed)

| Check | Result |
|-------|--------|
| PR base | `production` @ `27b0b4fb691c081ea1167f863f5fc45224a9c651` |
| PR head | `development` @ `d760a74e6cccdbf53cf9265092ca4aafe3f4c481` |
| Mergeable | **MERGEABLE** / `clean` |
| Working tree (local) | clean |
| Local branch | `development` |
| `origin/development` | `d760a74e6cccdbf53cf9265092ca4aafe3f4c481` |

### Pre-merge head SHA (recorded)

`d760a74e6cccdbf53cf9265092ca4aafe3f4c481`

### Post-open head scope check

Commit `d760a74` touches **only**:

- `.cursor/workflow/state.md`
- `docs/workflow/reviews/2026-08-23-production-promote-portal-and-studio-pr-checkpoint.md`

**No new runtime/product changes** beyond approved Gate B release scope (`f85be8b` product tip + workflow docs).

### Approved inventory (`production..development` at pre-merge head)

| SHA | Subject |
|-----|---------|
| `7dfd7ee` | feat(portal): ship Upcoming Shows, discover rails, and show browsing UX |
| `5435743` | feat(studio): organize workflow UX and add grouped gang sheets |
| `237b28d` | chore(release): pin Studio 1.0.9 and finish Gate B verification |
| `953ab10` | docs(workflow): record Gate B RC tip and PR gate checkpoint |
| `5b86f18` | docs(workflow): point PR checkpoint at development tip |
| `f85be8b` | docs(workflow): sync Gate B RC tip to current development HEAD |
| `d760a74` | docs(workflow): record opened PR 88 at Gate B tip |

---

## Merge attempt

| Attempt | Result |
|---------|--------|
| `gh pr merge 88 --merge` | **Blocked** — FreshForge shell guard: production merges require owner execution via GitHub (not agent CLI) |

No force-push or direct push to `production` was attempted.

---

## Owner action required

Merge **PR #88** on GitHub: https://github.com/roasted-garlic/freshprints/pull/88

Use **Create a merge commit** (normal protected-branch PR flow).

After merge, reply with production merge SHA or re-run Gate C verification step so records can be completed before Gate D.

---

## Post-merge verification (pending)

- [ ] `origin/production` contains approved release candidate
- [ ] Record exact production merge SHA
- [ ] `origin/development` contains `origin/production` (development ⊇ production)
- [ ] No force-push occurred

---

## Next gate

After merge is confirmed on GitHub:

```text
APPROVE PRODUCTION FIREBASE DEPLOY: production-promote-portal-and-studio-2026-08-23
```

Scoped command (Gate D — do not run until authorized):

```bash
firebase deploy --only firestore:rules,functions:completeStaffGangSheetAndOpenNext,functions:convertCustomerPrintRequestToInternal,functions:listPortalPublicShows,functions:listPortalShowCatalogDesigns --project fresh-prints-prod
```
