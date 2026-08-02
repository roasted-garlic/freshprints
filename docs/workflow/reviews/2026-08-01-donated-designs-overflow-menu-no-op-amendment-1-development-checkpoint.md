# Revised Development Checkpoint: Donated Designs overflow menu Amendment 1

Date: 2026-08-01
Status: **implementation complete; amended owner QA pending**

- Owner-requested default placement: below the three-dot trigger.
- Approach: body portal plus fixed, measured trigger positioning; automatic upward fallback only for genuine viewport collision.
- Intake `overflow: hidden` remains unchanged; menu z-index remains `var(--z-dropdown, 20)`.
- Existing action, owner gate, preview/confirmation/deletion flow, accessibility, focus, outside-click, selected-design context, and tab cleanup are preserved.
- Automated checks: focused 19/19, Studio TypeScript, production build/package, lint, and whitespace PASS.
- Current development owner QA is not signed off; it must restart against this amendment.
- Separate Whatnot remediation is unchanged.
- No production promotion, deployment, installer, settings/data, Stage 2, or domain action occurred.
