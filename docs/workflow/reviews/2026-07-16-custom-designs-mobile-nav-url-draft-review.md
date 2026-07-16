# Review: Custom Designs mobile nav, hierarchical URLs, draft resume

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-16-custom-designs-mobile-nav-url-draft-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Plan correctly scopes a Portal-only UX + routing fix: mobile action row density, flow-scoped path URLs, and activation of the existing localStorage draft helpers. Security choice to keep free-text out of the URL is sound. Approve with a few implementation constraints so resume behavior and routing stay predictable.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Parks prior phase; no backend |
| Architecture alignment | pass | Client wizard + path URL + local draft |
| Security impact addressed | pass | No answers in URL; path allowlist |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | None |
| Test strategy adequate | pass | URL/draft units + mobile manual QA |
| Human checkpoints identified | pass | Mobile visual QA |
| Roadmap alignment | pass | Extends Custom Designs / Phase 9A UX |
| Documentation plan | pass | ADR + architecture note |
| No silent scope expansion | pass | AI/assisted reserved only |

---

## Architecture Review

**Findings:**
- Optional catch-all under `custom-designs` is appropriate; keep a single page content component.
- URL module should own parse/build; wizard should not string-build paths.
- Resume rule in plan is slightly ambiguous between “open draft.step on Find” vs always screen1 — lock in Required Changes.

**Required changes:**
- [x] Lock resume: Find from choose with resumable draft → navigate to **draft.step** with restored answers (not always screen1). Explicit “start over” only from results / clear path.

---

## Security Review

**Findings:**
- Correct rejection of query-param answers.
- Validate path segments against allowlisted flow + step tokens; unknown segments → choose.
- localStorage may hold mild PII (subject text); acceptable for device-local draft; no logging of draft contents.

**Required changes:**
- [ ] None

**Human approval needed before production:**
- [ ] None

---

## Data Model Review

**Findings:**
- No Firestore changes.

**Required changes:**
- [ ] None

---

## Backend Review

**Findings:**
- None.

**Required changes:**
- [ ] None

---

## Testing Review

**Findings:**
- Add focused unit tests for new path parse/build and legacy query redirect mapping.
- Manual mobile QA is required before signoff.

**Required changes:**
- [ ] None

---

## Documentation Review

**Findings:**
- ADR required for URL + draft policy.
- Update any docs still documenting `?step=` as canonical.

---

## Required Changes (if approved_with_changes)

1. **Resume on Find:** If choose → Find and a resumable draft exists, open **`draft.step`** with restored answers (not always `screen1`). Fresh empty wizard only when no resumable draft (or after explicit clear/submit).
2. **Legacy redirect:** Implement as first hydrate step via `router.replace` to canonical path; do not leave dual-canonical query URLs after replace.
3. **Label:** Use **Next** on questionnaire WizardActions only; leave Review primary CTA as **Find designs**.
4. **Do not** change results `requestId` restore or server callables.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Bounded Portal UX/routing work with dormant draft code ready to wire. Constraints above remove resume ambiguity and keep security posture clear.

---

## Next Step

Implement approved scope with the required changes above; then test + mobile manual QA checkpoint.
