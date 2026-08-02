# Amendment Review: Portal design issue report success UX

Date: 2026-08-01
Verdict: **APPROVED**

## Scope reviewed

- Replace post-submit thank-you + form helper with a centered success state.
- Animated checkbox (CSS stroke draw) using existing success color tokens.
- Short copy: **Report sent** / **We’ll take a look.** plus **Done**.
- Accessibility: `aria-live`, updated dialog title on success, `prefers-reduced-motion`.

## Findings

- Narrow Portal UI-only change; no auth, data, or backend impact.
- Pre-submit form copy and actions remain unchanged.
- CSS-only animation avoids new dependencies.
- Contract tests can lock success classes and exclude the retired thank-you string.

No blocking finding. Proceed to implement.
