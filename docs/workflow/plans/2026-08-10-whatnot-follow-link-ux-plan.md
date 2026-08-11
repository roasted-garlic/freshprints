# Plan: Fresh Prints Whatnot follow/link UX (hotfix amendment)

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase / hotfix amendment (same branch) |
| Parent | `prelaunch-catalog-search-count-and-first-visit-ux` |
| Branch | `hotfix/portal-design-modal-scroll-preservation` @ `1d3df79…` |
| Combined with | (1) design-modal scroll (2) Discover complete-library count (3) **this** |
| Related | docs/workflow/reviews/2026-08-10-whatnot-follow-link-ux-plan-review.md |

---

## Goal

Make Whatnot follow obvious on Portal: shared About callout (`/help` + first-visit modal), a required FAQ with a safe clickable CTA, and a sidebar footer link above Help — all pointing at one canonical profile URL.

---

## Repo checks (verified)

| Topic | Finding |
|-------|---------|
| Shared external links | No existing Whatnot/portal external-links module; closest pattern is Portal-local URL constants (e.g. bidding modal `funkyfreshprints.com`) and `packages/shared/src/constants/portal/*` |
| Canonical URL home | Add `packages/shared/src/constants/portal/portalExternalLinks.constants.ts` with `FRESH_PRINTS_WHATNOT_PROFILE_URL` + handle — single source for Portal About/FAQ/sidebar |
| FAQ resolution | `usePortalHelpContent` uses Firestore FAQs when non-empty; `PORTAL_TEXT_FAQS` alone is insufficient |
| FAQ answers | Plain text only today; no `dangerouslySetInnerHTML` |
| Static assets | `apps/portal/public/brand/` for logos; lucide used in sidebar |
| Dashboard Icons Whatnot | Collection is Apache-2.0; **trademark** of Whatnot brand mark is not granted by that license → prefer lucide `ExternalLink` fallback (do not block feature; no CDN hotlink) |
| About reuse | `PortalHelpAboutPanel` already shared by `/help` + first-visit modal |

---

## Scope

### In Scope
- Canonical Whatnot URL constant (shared)
- About callout inside `PortalHelpAboutPanel` only
- Required FAQ merge at Portal content-resolution layer + FAQ CTA without HTML
- Sidebar “Follow on Whatnot” above Help (external `<a>`)
- CSS for About callout + sidebar external footer link
- Focused tests; update combined Implementation Review / PR checkpoint

### Out of Scope
- Firestore `settings/portalHelp` mutation / migration
- Studio FAQ editor changes (optional fields unused by Studio)
- Merge/deploy/Studio publish
- Changing scroll or Discover-count implementations except docs

---

## Approach

### 1. Canonical constant
`FRESH_PRINTS_WHATNOT_PROFILE_URL = 'https://www.whatnot.com/user/funkyfreshprints'`
`FRESH_PRINTS_WHATNOT_HANDLE = '@funkyfreshprints'`

### 2. About
Constants for heading/body/CTA label in `portalHelpContent.ts`; render a secondary callout in `PortalHelpAboutPanel` (visually quieter than the important highlight) with `<a target="_blank" rel="noopener noreferrer">`.

### 3. FAQ merge
- Define `PORTAL_REQUIRED_WHATNOT_FAQ` with stable id `follow-fresh-prints-on-whatnot` plus Portal-only `externalCta: { href, label }`.
- Extend Portal presentation type: `PortalTextFaq = PortalHelpTextFaq & { externalCta?: … }` (shared Firestore type stays plain text).
- `mergePortalHelpFaqsWithRequired(faqs)`: dedupe by id (and by exact question match); ensure required FAQ present; place early (e.g. after first FAQ or fixed `order` then stable sort).
- Apply in `usePortalHelpContent` for Firestore, missing, and error paths (always).
- `PortalHelpFaqList`: if `externalCta`, render React `<a>` after plain-text paragraphs — never HTML injection.

### 4. Sidebar
External `<a>` immediately above Help; `onClick={closeDrawer}`; `title` when collapsed; class aligned with help/footer style but not `aria-current`/active route; lucide `ExternalLink` icon.

### 5. Icon
**Approach: lucide-react `ExternalLink`** — Dashboard Icons Apache-2.0 OK for file copyright, but Whatnot trademark risk → fallback per plan. No new package, no CDN.

---

## Test Strategy

| Check | Required |
|-------|----------|
| About CTA / modal reuse / FAQ merge / sidebar order+rel | yes |
| Rerun scroll + Discover count + existing About tests | yes |
| Portal typecheck, lint, `build:portal`, `git diff --check` | yes |

---

## Human Checkpoints
- [x] Stop before production merge / second App Hosting / Studio / final QA

---

## Risks

| Risk | Mitigation |
|------|------------|
| Studio FAQ duplicates Whatnot FAQ | Dedupe by id + question |
| Accidental HTML FAQ path | Explicit React link only for `externalCta` |
| Callout competes with warning | Distinct quieter styles |

---

## Rollback
Revert this amendment commit on the hotfix branch.

---

## Approval
Pending Formal Review.
