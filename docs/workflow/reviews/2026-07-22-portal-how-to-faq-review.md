# Review: Portal How To / FAQ

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-22-portal-how-to-faq-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Plan correctly scopes a public Portal How To / FAQ with text + embedded video FAQs, reuses ADR-FP-116 fail-closed indexing, and prefers a typed content module over CMS. Conditional approval adds implementer constraints for path defaults, embed allowlisting, and placeholder-copy honesty so SEO trust content does not ship empty-looking answers on production later without owner review.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | GA / production-release / AI / Stripe / CMS out |
| Architecture alignment | pass | `features/help/` + public browse extension |
| Security impact addressed | pass | Allowlisted embeds; no secrets/rules |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | None |
| Test strategy adequate | pass | Unit + Portal typecheck/build + manual QA |
| Human checkpoints identified | pass | APPROVE IMPLEMENTATION; manual UI; copy TBD |
| Roadmap alignment | pass | Pre-prod item 2 |
| Documentation plan | pass | ARCHITECTURE / DEPLOYMENT / ROADMAP |
| No silent scope expansion | pass | |

---

## Architecture Review

**Findings:**

- Content-as-code is the right v1 choice; matches Portal maintainability and avoids premature CMS.
- Soft-auth public browse must include the FAQ path or guests will hit the login overlay incorrectly.
- Keep FAQ out of primary `portalNavItems` (Browse / Upload / Custom); sidebar footer is correct.

**Required changes:**

- [x] Implement default path **`/help`** and nav label **Help** unless owner answers open questions before implement starts; do not block implement on copy if placeholders are used.
- [x] Extract embed URL parsing to a pure helper with unit tests (YouTube + Vimeo only).

---

## Security Review

**Findings:**

- Public page is fine if read-only and embed hosts are constrained.
- Do not introduce `dangerouslySetInnerHTML` for FAQ answers unless answers are strictly escaped/plain; prefer plain text or a minimal markdown subset already used in Portal if one exists — otherwise plain text / simple paragraphs for v1.

**Required changes:**

- [x] FAQ answer rendering: plain text / simple line breaks for v1 (no arbitrary HTML from content module).
- [x] Reject non-YouTube/Vimeo URLs; never pass raw user/CMS strings into iframe `src` without validation (content module is trusted-at-build, still validate).

**Human approval needed before production:**

- [x] None for this phase (dev App Hosting only). Production content review belongs with `production-release`.

---

## Data Model Review

**Findings:**

- No persisted FAQ entities — good for v1.

**Required changes:**

- [ ] None

---

## Backend Review

**Findings:**

- No Functions/env required.

**Required changes:**

- [ ] None

---

## Testing Review

**Findings:**

- Coverage of public-browse, robots allow, sitemap static entry, and embed URL helper is sufficient automated surface.
- Manual QA must include mobile accordion + iframe layout.

**Required changes:**

- [x] Add/extend tests that `/help` appears in robots allow list and sitemap static entries when those helpers are updated.

---

## Documentation Review

**Findings:**

- DEPLOYMENT + ARCHITECTURE notes are enough; optional short DECISIONS entry for “FAQ content module not CMS” is nice-to-have, not required for implement start.

---

## Required Changes (if approved_with_changes)

1. Default route `/help`, nav label **Help** (sidebar footer), until owner overrides.
2. Plain-text (or existing safe markdown) answers only — no raw HTML from content.
3. Strict YouTube/Vimeo embed URL helper + unit tests.
4. Wire `/help` into public browse, robots allow, and sitemap static list in the same change set.
5. Seed content may use `[TBD]` placeholders for layout QA; do not invent marketing claims as if final.

---

## Blockers (if blocked)

1. None

---

## Verdict Rationale

**approved_with_changes** — Scope, security posture, and SEO gating align with ADR-FP-116 and the pre-prod sequence. Changes above are implementer constraints, not plan rewrites. Implementation must not start until owner **APPROVE IMPLEMENTATION** (project norm).

---

## Next Step

Await owner **APPROVE IMPLEMENTATION**, then implement approved scope (+ required changes). Open questions (copy, video URLs, final nav label/path) may be answered in parallel; defaults apply if unanswered.
