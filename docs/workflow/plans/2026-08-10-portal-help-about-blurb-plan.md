# Plan: Portal Help — About myprintrequest.com blurb

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase (narrow UX/copy) |
| Related | docs/workflow/reviews/2026-08-10-portal-help-about-blurb-review.md |

---

## Goal

Add a stylish, stand-alone intro panel at the top of Portal `/help` that clearly explains what **myprintrequest.com** is and what customers are there to do — especially that print requests are for **their own** Whatnot purchases, not to fill the show for others — without duplicating FAQ detail (limits, quotas, step-by-step).

## Background

Owner request during Goal #13 QA. Help page currently has only a one-line lead under the H1; customers must open FAQs to learn the portal’s purpose.

## Scope

### In Scope
- Stand-alone “About this portal” panel on `/help` (not an accordion)
- Bundled copy constants (code-owned; not Studio/`settings/portalHelp` editable in this phase)
- CSS matching Portal help / shell dark theme
- Shorten page lead so it does not compete with the new panel
- Owner visual/copy QA on DEV (or local)

### Out of Scope
- Studio Help Settings editor for this blurb
- Firestore schema / ADR for editable about copy
- FAQ answer rewrites (except ensuring no hard contradiction)
- Production deploy / myprintrequest.com cutover
- Placement / companion QA (still separate; still awaiting owner PASS)

---

## Affected Areas

### Files / Modules (expected)
- `apps/portal/features/help/portalHelpContent.ts` (or shared constants for intro only)
- `apps/portal/features/help/components/PortalHelpPageContent.tsx`
- `apps/portal/features/help/components/PortalHelpAboutPanel.tsx` (new)
- `apps/portal/styles/help.css`
- Optional small content wiring test
- `packages/shared/.../portalHelpSettings.constants.ts` — only if adjusting `PORTAL_HELP_INTRO` / page description

### Architecture Impact
- [x] None (presentation + bundled copy)

### Security Impact
- [x] None (static copy; no HTML injection — plain text / React text nodes only)

### Data Model Impact
- [x] None

### Backend Impact
- [x] None

### UI / UX Impact
- [x] Details: Help page gains a featured about panel under the header, above FAQ

### Migration Impact
- [x] None

---

## Approach

1. Add `PORTAL_HELP_ABOUT_*` copy (title + paragraphs; highlight that requests are for the signed-in shopper).
2. Render `PortalHelpAboutPanel` between page header and FAQ section.
3. Style as a distinct card: soft accent border/background, eyebrow, clear H2, readable body — not accordion chrome.
4. Keep FAQ for limits / how-to detail; about panel points readers downward.
5. Manual owner QA for tone and visual fit.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Unit (content wiring / meta if touched) | portal help-related node tests | yes if files exist |
| Typecheck / lint | only if project scripts already used for portal | as available |

### Manual
- Open `/help` — about panel visible without expanding anything
- Copy covers: what portal is, Whatnot print requests, for-you not for-others, browse vs sign-in
- No quota/limit numbers in the blurb
- Mobile + desktop readable

---

## Human Checkpoints

- Owner visual/copy approval on the about panel

## Risks and Rollback

- Risk: copy too long → trim paragraphs after QA
- Rollback: remove panel component + CSS; restore previous intro constant

## FreshForge Impact Classification

N/A (Fresh Prints product app, not starter surface)
