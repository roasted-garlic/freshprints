# Development Checkpoint: Donated Designs overflow menu no-op

Date: 2026-08-01
Starting commit: `ca315f2391b4961dc97ddbe87bf351c335405c6a`
Status: **development implementation complete; owner QA pending**

- Root cause: downward absolute menu was mounted but clipped by the intake panel's `overflow: hidden` boundary.
- Existing approved action retained: **Delete unused upload…** only.
- Fix: explicit upward intake placement, focus behavior, design-specific label, and selected-row/filter state reset.
- Automated verification: 15/15 focused tests, Studio TypeScript, production build/package, lint, and whitespace PASS.
- Manual authenticated development Studio QA: pending.
- The separate Whatnot show-update owner-QA checkpoint remains unchanged and pending.
- Stage 2 remains paused; custom-domain cutover remains blocked.
- No production action, deployment, installer release, data/settings/capacity mutation, domain, DNS, analytics, or tag action occurred.
