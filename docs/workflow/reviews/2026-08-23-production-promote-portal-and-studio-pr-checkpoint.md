# Checkpoint: Production PR (Gate C) — production-promote-portal-and-studio-2026-08-23

| Field | Value |
|-------|-------|
| Date | 2026-08-23 |
| Status | **AWAITING OWNER APPROVAL** — do not open/merge until phrase |
| Base | `production` @ `27b0b4fb691c081ea1167f863f5fc45224a9c651` |
| Head | `development` @ `237b28db90e45b31548e6c091203b5e9435de09b` |

---

## Pre-merge inventory (`production..development`)

| SHA | Subject |
|-----|---------|
| `7dfd7ee` | feat(portal): ship Upcoming Shows, discover rails, and show browsing UX |
| `5435743` | feat(studio): organize workflow UX and add grouped gang sheets |
| `237b28d` | chore(release): pin Studio 1.0.9 and finish Gate B verification |

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
- Head: `development` (`237b28d`)

## Owner phrase required before agent opens PR

```text
APPROVE PRODUCTION PR: production-promote-portal-and-studio-2026-08-23
```

After PR is open, merge still requires the standing production merge checkpoint / owner merge authorization if enforced separately.
