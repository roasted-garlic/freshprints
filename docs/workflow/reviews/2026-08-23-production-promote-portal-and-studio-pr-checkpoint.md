# Checkpoint: Production PR (Gate C) — production-promote-portal-and-studio-2026-08-23

| Field | Value |
|-------|-------|
| Date | 2026-08-23 |
| Status | **AWAITING OWNER APPROVAL** — do not open/merge until phrase |
| Base | `production` @ `27b0b4fb691c081ea1167f863f5fc45224a9c651` |
| Head | `development` @ `5b86f181328164d07224d7bb00b1b5216f8601f8` |

---

## Pre-merge inventory (`production..development`)

| SHA | Subject |
|-----|---------|
| `7dfd7ee` | feat(portal): ship Upcoming Shows, discover rails, and show browsing UX |
| `5435743` | feat(studio): organize workflow UX and add grouped gang sheets |
| `237b28d` | chore(release): pin Studio 1.0.9 and finish Gate B verification |
| `953ab10` | docs(workflow): record Gate B RC tip and PR gate checkpoint |
| `5b86f18` | docs(workflow): point PR checkpoint at development tip |

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

## Proposed PR

- Title: `Promote Portal show discovery + Studio 1.0.9 release candidate`
- Base: `production`
- Head: `development` (`5b86f18`)

## Owner phrase required before agent opens PR

```text
APPROVE PRODUCTION PR: production-promote-portal-and-studio-2026-08-23
```

After PR is open, merge still requires the standing production merge checkpoint / owner merge authorization if enforced separately.
