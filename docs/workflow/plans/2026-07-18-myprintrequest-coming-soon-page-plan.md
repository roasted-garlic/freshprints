# Plan: MyPrintRequest.com Coming Soon Page

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-18-myprintrequest-coming-soon-page-review.md |

---

## Goal

Ship self-contained, modern, minimal static sites for **MyPrintRequest.com** — **coming soon** and **maintenance** — that use the Fresh Prints Request Portal logo, match its neon brand language, and can be uploaded as-is to Cloudflare (Pages or static hosting). Both live under `splash/`.

## Background

`myprintrequest.com` currently hits an error page. Owner wants a branded placeholder while the Portal goes live. Must be pure HTML/CSS/JS (no React/Next build) in its own folder for easy Cloudflare upload.

Prior workflow (Portal duplicate item order controls — manual QA) is **parked** for this short visual deliverable.

## Scope

### In Scope
- Parent folder: `splash/` with `CONTENTS.txt`
- Subfolders: `coming-soon/` and `maintenance/`
- Each: `index.html`, `styles.css`, `script.js`, optimized logo under `assets/`, `_headers`
- Neon-minimal composition aligned with Request Portal logo (pink / cyan / yellow on black)
- Responsive desktop + mobile
- Light motion (entrance + ambient accents) via CSS/JS only

### Out of Scope
- Email capture / backend / forms requiring APIs
- Connecting to Firebase or Portal app
- Changing DNS / Cloudflare dashboard (human)
- Production Portal deploy
- App code changes under `apps/`

---

## Affected Areas

### Files / Modules (expected)
- `coming-soon/index.html` (new)
- `coming-soon/styles.css` (new)
- `coming-soon/script.js` (new)
- `coming-soon/assets/fresh-prints-request-portal-logo.png` (copied/optimized from portal brand asset)
- `coming-soon/_headers` (optional Cloudflare)

### Architecture Impact
- [x] None (standalone static site; not part of Portal/Studio apps)

### Security Impact
- [x] Details: Public static page only; no secrets, no auth, no user data collection

### Data Model Impact
- [x] None

### Backend Impact
- [x] None

### UI / UX Impact
- [x] Details: New public marketing/placeholder page; requires human visual approval before Cloudflare go-live

### Migration Impact
- [x] None (Cloudflare upload replaces error page; rollback = restore prior Cloudflare config)

---

## Approach

1. Park duplicate-item QA workflow in state; start this managed phase.
2. Copy + web-optimize the Request Portal logo into `coming-soon/assets/`.
3. Build a single-viewport composition: logo as hero brand signal, one headline (“Coming Soon”), one short supporting line, subtle neon atmosphere (no fake dashboard/cards).
4. Add 2–3 intentional motions (fade/rise entrance, soft ambient glow drift, optional subtle scan or accent pulse).
5. Verify locally by opening `index.html`; leave Cloudflare DNS/upload to owner.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Typecheck | n/a | no |
| Lint | n/a | no |
| Unit tests | n/a | no |
| Build | n/a (static) | no |
| Integration | n/a | no |
| E2E | n/a | no |
| Backend/rules | n/a | no |

### Manual
- [x] Details: Open `coming-soon/index.html` in browser; check logo, typography, mobile width, motion; owner visual PASS before Cloudflare upload

---

## Human Checkpoints Anticipated
- [x] Manual UI/UX review
- [x] Design approval
- [x] Production deploy (Cloudflare upload / DNS — human only)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Logo PNG too large for first paint | medium | Export web-optimized asset in `assets/` |
| Neon aesthetic clashes with app STYLE_GUIDE light UI | low | Page is marketing placeholder; intentionally matches logo, not Studio shell |
| Cloudflare mis-upload (wrong root) | low | Keep flat folder with `index.html` at folder root |

---

## Rollback Plan

Remove or replace Cloudflare Pages/static files; restore previous Cloudflare error/custom page config.

---

## Documentation Updates Required
- [ ] None required for product docs (standalone deployable artifact)
- [ ] Optional later: note in DEPLOYMENT.md if owner wants permanent process — deferred

---

## Open Questions
- [x] None blocking (no email capture; no social links unless owner adds later)

---

## Approval
- Review doc: docs/workflow/reviews/2026-07-18-myprintrequest-coming-soon-page-review.md
- Verdict: approved
