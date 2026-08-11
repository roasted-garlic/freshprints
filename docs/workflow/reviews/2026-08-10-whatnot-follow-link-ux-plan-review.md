# Review: Fresh Prints Whatnot follow/link UX (plan)

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-08-10-whatnot-follow-link-ux-plan.md |
| Verdict | **approved** |

---

## Summary

Plan correctly places a single shared Whatnot profile URL, reuses `PortalHelpAboutPanel`, merges a required FAQ at the Portal resolution layer (so Studio-managed FAQs cannot hide it), and adds a safe React FAQ CTA without HTML. Lucide fallback for the icon is justified given Whatnot trademark risk despite Apache-2.0 icon-pack copyright.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Portal UX only; no Firestore mutation |
| Architecture alignment | pass | Shared constant; presentation-layer FAQ merge |
| Security | pass | `noopener noreferrer`; no `dangerouslySetInnerHTML` |
| Data / Backend | pass | No settings write |
| Test strategy | pass | Merge/dedupe/link/sidebar/About coverage |
| No silent scope expansion | pass | Same hotfix branch; three-item combined PR |

---

## Independent verification

| Claim | Verdict |
|-------|---------|
| Firestore FAQs replace bundled when non-empty | Confirmed in `usePortalHelpContent` |
| About panel shared by modal + `/help` | Confirmed |
| FAQ renderer plain text only | Confirmed |
| No existing Whatnot shared constant | Confirmed |
| `apps/portal/public/brand/` exists | Confirmed |

---

## Required changes
- [ ] None

## Next Step
Implement on current hotfix branch → tests → combined Implementation Review → update PR checkpoint; **do not merge**.
