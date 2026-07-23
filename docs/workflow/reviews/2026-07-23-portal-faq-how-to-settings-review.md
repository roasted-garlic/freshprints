# Review: Portal FAQ and How To — Studio settings addendum

| Field | Value |
|-------|-------|
| Date | 2026-07-23 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-22-portal-how-to-faq-plan.md (Addendum 2026-07-23) |
| Verdict | **approved_with_changes** |

---

## Summary

Owner-directed scope expansion from content-as-code (ADR-FP-117) to Studio-managed `settings/portalHelp` with public Portal read and owner/admin callable writes is sound and matches existing brand-logo / social-meta patterns. Conditional approval locks title phrasing, HTTPS-only embeds, public-read safety, and a re-run of manual QA.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | GA / production-release / video upload out |
| Architecture alignment | pass | Shared constants + services; callable write |
| Security impact addressed | pass | Public read of non-sensitive copy; HTTPS YT/Vimeo; write false + callable |
| Data model impact addressed | pass | `settings/portalHelp`; no migration job |
| Backend impact addressed | pass | New callable + rules |
| Test strategy adequate | pass | Shared unit + typecheck + manual re-QA |
| Human checkpoints identified | pass | Manual QA re-run; production deploy separate |
| Roadmap alignment | pass | Still pre-prod item 2 |
| Documentation plan | pass | ADR-FP-118 + DATA_MODEL / BACKEND / DEPLOYMENT |
| No silent scope expansion | pass | Explicit addendum; owner request |

---

## Architecture Review

**Findings:**

- Prefer shared `portalHelpSettings.constants` + shared video URL helper used by Studio, Functions, and Portal.
- Portal client subscribe to public settings matches `brandLogos`; keep page shell SSR metadata with static **FAQ and How To** title.
- Bundled TS module remains fallback only when Firestore doc is missing — not a second editor path in Studio.

**Required changes:**

- [x] Doc id **`portalHelp`**; section title **FAQ and How To**; Portal nav/H1/SEO title same phrasing; path **`/help`**.
- [x] Owner/admin gate via `permissionService.canManageSettings` + callable `["owner","admin"]` (not owner-only like social meta).

---

## Security Review

**Findings:**

- Public read is acceptable for FAQ/How To marketing copy (same class as brand logo URLs).
- Must reject non-HTTPS and non-YouTube/Vimeo video URLs on callable and client.
- Plain-text answers only; no HTML from settings.

**Required changes:**

- [x] Firestore: `allow read: if true`; `allow write: if false` for `settings/portalHelp`.
- [x] Tighten video helper to **HTTPS only** (no `http:`).

**Human approval needed before production:**

- [x] Production Functions + rules deploy remains a separate owner gate (not this phase).

---

## Data Model Review

**Findings:**

- Additive settings doc; missing → code defaults; no backfill required.

**Required changes:**

- [x] Document entity in DATA_MODEL.md with field limits and order semantics.

---

## Backend Review

**Findings:**

- Callable `updatePortalHelpSettings` mirrors `updatePortalSocialMetaSettings` validation style with owner/admin like AI enrichment.

**Required changes:**

- [x] Export from `functions/src/index.ts`; note in BACKEND.md.

---

## Test Review

**Required changes:**

- [x] Unit tests for parse/resolve + HTTPS YouTube/Vimeo validation.
- [x] Update Portal help meta test for title **FAQ and How To**.
- [x] Do not claim manual PASS; open/update manual checkpoint for Studio + Portal.

---

## Required Changes Before Implementation

1. Implement addendum as specified; superseding content source per ADR-FP-118.
2. Title consistency: **FAQ and How To** everywhere user-facing.
3. HTTPS-only embed validation in shared helper.
4. Re-open manual QA covering Studio Settings CRUD and Portal `/help`.

---

## Approval

- Verdict: **approved_with_changes**
- Owner request 2026-07-23 constitutes direction to implement the addendum without a separate APPROVE IMPLEMENTATION pause (requirements fully specified).
- Production deploy of rules/Functions still requires explicit owner approval later.
