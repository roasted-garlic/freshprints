# Implementation Review: Combined Portal hotfix (scroll + Discover count + Whatnot)

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Reviewer | Review Agent (independent) |
| Diff basis | `hotfix/portal-design-modal-scroll-preservation` vs `f5584451…` |
| Verdict | **approved** |

---

## Summary

Final combined hotfix correctly delivers (1) designId scroll preservation, (2) Discover authoritative ready-library placeholder count, and (3) Whatnot follow UX across About (shared panel), required FAQ merge with typed CTA, and sidebar external link. No Firestore mutation, no HTML injection, no full-catalog hydration.

---

## Checklist

| Concern | Verdict |
|---------|---------|
| Scroll preservation intact | **pass** |
| Discover count not pool length | **pass** |
| Canonical Whatnot URL single-sourced | **pass** (`portalExternalLinks.constants`) |
| About reuse via PortalHelpAboutPanel | **pass** |
| Required FAQ survives Studio FAQs | **pass** (`mergePortalHelpFaqsWithRequired`) |
| No dangerouslySetInnerHTML | **pass** |
| Sidebar above Help + external attrs | **pass** |
| Icon approach | **pass** — lucide `ExternalLink` (Dashboard Icons Apache-2.0 OK for pack copyright; Whatnot trademark risk → fallback) |
| Backend/security expansion | **pass** — none |

---

## Required corrections
None.

## Next step
Owner open/merge combined production PR → second App Hosting rollout. Do not deploy from this review alone.
