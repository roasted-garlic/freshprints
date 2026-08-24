# Checkpoint: Production PR (Gate C) — production-promote-portal-and-studio-2026-08-23

| Field | Value |
|-------|-------|
| Date | 2026-08-23 |
| Status | **OPEN** — awaiting merge authorization |
| PR | **#88** — https://github.com/roasted-garlic/freshprints/pull/88 |
| Title | Promote Portal show discovery + Studio 1.0.9 release candidate |
| Base | `production` @ `27b0b4fb691c081ea1167f863f5fc45224a9c651` |
| Head at open | `development` @ `f85be8bacc4f361e682f5654dd48db0de625111f` |
| Mergeable | **MERGEABLE** / `CLEAN` |
| Checks | none reported on `development` at open |

---

## Pre-open confirmations (2026-08-23)

| Check | Result |
|-------|--------|
| Working tree clean | yes (before local checkpoint fill) |
| Branch | `development` |
| `origin/development` | `f85be8bacc4f361e682f5654dd48db0de625111f` |
| `origin/production` | `27b0b4fb691c081ea1167f863f5fc45224a9c651` |
| Scope | Only approved release commits below |

Owner phrase `APPROVE PRODUCTION PR: production-promote-portal-and-studio-2026-08-23` opens the PR only — **not** merge.

---

## Final inventory (`production..development` at open)

| SHA | Subject |
|-----|---------|
| `7dfd7ee` | feat(portal): ship Upcoming Shows, discover rails, and show browsing UX |
| `5435743` | feat(studio): organize workflow UX and add grouped gang sheets |
| `237b28d` | chore(release): pin Studio 1.0.9 and finish Gate B verification |
| `953ab10` | docs(workflow): record Gate B RC tip and PR gate checkpoint |
| `5b86f18` | docs(workflow): point PR checkpoint at development tip |
| `f85be8b` | docs(workflow): sync Gate B RC tip to current development HEAD |

## Includes

- Signed-off Portal/Studio product work (show discovery + Studio workflow/grouped sheets)
- Retrospective DEV Signoffs for `7dfd7ee` batch
- Studio **1.0.9** pins + Gate B verification fixes
- Firestore Rules + Functions source for scoped prod deploy (Gate D — not yet)

## Does not include

- Production Firebase deploy
- App Hosting rollout
- Studio draft/publish
- Phase 9
- Merge of this PR (separate phrase required)

## Merge phrase (next)

```text
APPROVE PRODUCTION MERGE: production-promote-portal-and-studio-2026-08-23
```
