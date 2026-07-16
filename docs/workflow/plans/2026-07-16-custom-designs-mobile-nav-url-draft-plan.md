# Plan: Custom Designs mobile nav, hierarchical URLs, draft resume

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-16-custom-designs-mobile-nav-url-draft-review.md |
| Parks | studio-customer-requests-suggestions (awaiting deploy + manual QA) |

---

## Goal

On Portal Custom Designs (`/custom-designs`):

1. Keep **Back** and **Next** side-by-side on mobile, and tighten vertical spacing so suggestion pills stay visible above the fold.
2. Replace flat `?step=subject` URLs with **flow-scoped** paths so each option card can own its own steps later.
3. Persist in-progress questionnaire answers in **localStorage** so refresh / deep links to a later step restore prior step inputs (without stuffing free-text into the URL).

---

## Background

- Only **Help Me Find a Design** is live; AI and Assisted are coming soon (`EtsyRouteChoosePath`).
- Current URL model is `?step=subject|style|wording|review|results` — not namespaced by flow.
- Mobile CSS forces `.etsy-wizard-actions .portal-button { flex: 1 1 100% }`, stacking Back/Continue.
- Draft helpers already exist (`etsyRecommendationDraftStorage.ts`, key `fp.etsyRecommendation.draft.v4`) but the wizard only **clears** drafts; it never loads/saves. Deep links intentionally open blank.
- Owner feedback: side-by-side mobile actions, less vertical chrome, URLs that scale to more options, and draft resume across steps.

---

## Scope

### In Scope

- Mobile layout: Back + Next side-by-side; rename Continue → **Next** on questionnaire steps (Review CTA stays “Find designs”).
- Tighten wizard vertical spacing on small screens (panel padding, lead/heading/action margins, step label, pill hint) without hiding pills.
- Hierarchical URL model for the find flow + redirect from legacy `?step=` links.
- Activate localStorage draft load/save/clear for the find questionnaire.
- Unit tests for URL parse/build and draft resume wiring helpers where practical.
- Docs: `ARCHITECTURE.md` / `BACKEND.md` or feature notes + `DECISIONS.md` ADR for URL + draft policy.

### Out of Scope

- Implementing AI or Assisted Creation flows (only reserve URL namespaces).
- Putting free-text answers into the URL query string.
- Server-side draft persistence / multi-device sync.
- Changing results `requestId` Firestore restore behavior.
- Production deploy (manual QA on local/dev only).
- Completing the parked Customer Requests Suggestions signoff.

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/app/(app)/custom-designs/` — optional catch-all route for path segments
- `apps/portal/features/etsy-recommendations/utils/etsyRecommendationUrlState.ts`
- `apps/portal/features/etsy-recommendations/hooks/useEtsyRecommendationWizard.ts`
- `apps/portal/features/etsy-recommendations/utils/etsyRecommendationDraftStorage.ts` (minor if needed)
- `apps/portal/features/etsy-recommendations/components/EtsyQuestionnaire.tsx`
- `apps/portal/styles/etsy-recommendations.css`
- Tests next to URL/draft utils
- `docs/architecture/*`, `docs/project/DECISIONS.md` as needed

### Architecture Impact

- [x] Details: Client wizard remains source of navigation state; URL becomes `{ flow, step, requestId? }` via path segments. Draft persistence is client-only, namespaced to the find flow. No new backend layers.

### Security Impact

- [x] Details: Do **not** put subject/style/wording in the URL (PII/share leakage, length). Draft stays in localStorage (device-local). Results remain server-owned via `requestId` + existing Firestore rules. Validate path segments against an allowlist.

### Data Model Impact

- [x] None (no Firestore schema change). Draft shape already matches answers; keep `v4` key or bump only if schema changes.

### Backend Impact

- [x] None

### UI / UX Impact

- [x] Details: Mobile action row; denser questionnaire chrome; path URLs; silent resume of draft when opening a find step (and optional light resume on choose if draft exists — prefer silent restore when URL already names a step).

### Migration Impact

- [x] Forward steps:
  1. New path URLs become canonical.
  2. On load, map legacy `/custom-designs?step=…` → `/custom-designs/find/…` via `router.replace`.
  3. Existing localStorage drafts (if any from earlier experiments) remain readable by current validators.
- [x] Rollback / compatibility: Revert route + URL helpers; old query links can be re-enabled. Draft clear is safe.

---

## Approach

### 1. Mobile actions + density

- In `@media (max-width: 559px)` for `.etsy-wizard-actions`:
  - Stop forcing `flex: 1 1 100%`.
  - Use `flex: 1 1 0; min-width: 0; nowrap` (or equal-width grid) so Back and Next sit on one row.
  - Keep min touch height (~44px) via existing portal buttons.
- Default continue label → **Next**.
- Mobile-only (or small-screen) spacing reductions:
  - Slightly less `.etsy-wizard-panel` padding.
  - Smaller `.etsy-wizard-lead` / `.etsy-wizard-panel .etsy-wizard-actions` top margins.
  - Explicit compact margins for `.etsy-wizard-step-label` and `.etsy-wizard-heading`.
  - Slightly tighter suggest-pill hint margins.
- Do not clip or hide `.etsy-suggest-pills`.

### 2. Hierarchical URLs

Canonical shapes:

| View | Path |
|------|------|
| Choose options | `/custom-designs` |
| Find · subject | `/custom-designs/find/subject` |
| Find · style | `/custom-designs/find/style` |
| Find · wording | `/custom-designs/find/wording` |
| Find · review | `/custom-designs/find/review` |
| Find · results | `/custom-designs/find/results?requestId=…` |

Reserved (not implemented UI): `/custom-designs/ai/…`, `/custom-designs/assisted/…`.

Implementation:

- Prefer App Router optional catch-all: `custom-designs/[[...segments]]/page.tsx` rendering existing page content (remove/replace flat `page.tsx`).
- Extend `etsyRecommendationUrlState` to parse/build from pathname + search (`flow` + `step` + `requestId`).
- Wizard sync: keep `router.replace` for URL canonicalization (same as today); browser history between steps is not a goal of this slice unless trivial.
- Legacy redirect: `?step=subject` → `/custom-designs/find/subject`, etc.

### 3. Draft persistence (localStorage, not URL params)

Decision: **answers live in localStorage; URL only encodes flow + step (+ results requestId).**

Rationale: free-text in query strings is shareable, ugly, and lossy; user already noted that landing on step 2 requires knowing step 1 — that is exactly draft resume.

Wire existing helpers:

1. After hydration (non-results): `loadEtsyRecommendationDraft()`; if valid, apply `subjectText` / `styleText` / `wording`.
2. Set view from URL step when present; if URL is choose and a resumable draft exists, restore answers and optionally jump to draft.step **or** stay on choose with restored fields when user re-enters find — prefer: deep-linked step wins for view; draft fills answers.
3. Debounced `saveEtsyRecommendationDraft` whenever questionnaire answers or draftable step change.
4. Clear draft on: successful submit, explicit start-over / goToChoose, discard.
5. **Stop** clearing draft on every deep-link hydrate (current behavior).
6. `beginFindDesign` / `startFreshWizard`: if starting fresh from choose, clear then empty; if we add “Resume”, use draft — for this slice, starting Find always clears only when user explicitly starts over from results; from choose, **resume draft into screen1** if resumable, else empty screen1. (Document exact rule in implement notes.)

**Recommended resume rule (implement):**

- Landing on `/custom-designs/find/{step}` → restore draft answers if present; show that step (even if draft was on another step).
- Landing on `/custom-designs` with resumable draft → keep choose UI; answers stay in storage until user taps Find (then open draft.step with answers) — avoids surprising auto-jump.
- Results URL → ignore questionnaire draft; clear draft after successful submit only.

### 4. Docs

- Short ADR: path-scoped Custom Designs URLs; drafts in localStorage not query params.
- Update architecture/backend notes that mention `?step=` if present.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npx tsc --noEmit -p apps/portal` (or repo script) | yes |
| Unit | URL parse/build + draft validation tests | yes |
| Lint | if configured for touched files | no (if no script) |
| Build | no full portal build unless typecheck insufficient | no |
| Integration / E2E / backend | N/A | no |

### Manual

- [ ] Mobile width (~390px): Back + Next one row; pills visible without excessive scroll.
- [ ] Walk find steps; refresh mid-flow; answers remain.
- [ ] Open `/custom-designs/find/style` with a saved draft; subject still filled.
- [ ] Legacy `?step=subject` redirects to `/custom-designs/find/subject`.
- [ ] Results still restore via `requestId`.
- [ ] Submit clears draft; new Find starts clean.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (mobile density + button row)
- [ ] Design approval — not required beyond owner visual check
- [ ] Business logic decision — none blocking (URL/draft policy locked in plan)
- [ ] Production deploy — out of scope
- [ ] Database migration — none
- [ ] Auth / external service setup — none
- [ ] Secrets / env vars — none

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Path routing breaks existing bookmarks | Med | Legacy `?step=` redirect |
| Draft restore surprises users on choose | Low | Stay on choose until Find; only auto-fill on find paths |
| Catch-all route conflicts with future static children | Low | Document reserved segment names (`find`, `ai`, `assisted`) |
| Over-tight spacing harms a11y | Low | Keep 44px touch targets; manual QA |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert portal route + URL/draft hook/CSS changes. Legacy query URLs work again if redirect removed. Clear `fp.etsyRecommendation.draft.v4` if needed.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [x] ARCHITECTURE.md (route note if Custom Designs documented)
- [ ] DATA_MODEL.md
- [x] BACKEND.md (if URL/draft mentioned)
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [x] DECISIONS.md (ADR)
- [x] Other: workflow plan/review/test/signoff

---

## Open Questions

- [x] None blocking — Continue → Next accepted by owner; answers not in URL (localStorage instead).

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-16-custom-designs-mobile-nav-url-draft-review.md
- Verdict: pending
