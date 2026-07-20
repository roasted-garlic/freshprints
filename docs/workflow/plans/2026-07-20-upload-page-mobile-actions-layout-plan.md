# Plan: Upload page mobile actions layout

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-20-upload-page-mobile-actions-layout-review.md |
| Roadmap | Small Managed Items Backlog #4 |

---

## Goal

On Portal Upload Designs (and shared customer-upload footer) at mobile widths, show **Back** and **+ Add to Request** **side by side** (not stacked), and make the footer quota / request-room callout **full width** above the actions. Desktop layout stays reasonable. Do not break Donate Designs if it shares the same footer markup/CSS.

## Background

Small Managed Item #4 (ROADMAP). Current mobile CSS (`@media (max-width: 40rem)` in `customer-uploads.css`) sets `.portal-customer-upload-footer` to `flex-direction: column` and `.portal-customer-upload-footer-actions` to `flex-direction: column-reverse` with full-width buttons — so Add stacks above Back. Owner wants a compact side-by-side action row and a full-width room/quota pill.

ADR-FP-102 / one-request-per-show uniqueness are **unchanged**.

## Scope

### In Scope

- CSS (and minimal markup class tweaks only if required) for Portal customer upload footer on mobile:
  - Actions row: Back + primary CTA side by side
  - Quota / room-hint callout: full width
- Soft-reload Portal on `fresh-prints-dev` (no Functions/storage deploy)
- Typecheck Portal if applicable; document tests
- Update ROADMAP / workflow state / CURRENT-STATE at signoff

### Out of Scope

- Backend, Functions, quotas logic, ADR-FP-102
- Desktop redesign beyond keeping current reasonable layout
- Production deploy; git commit
- Small Managed Items #5+

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/styles/customer-uploads.css` (primary)
- `apps/portal/features/customer-uploads/components/CustomerUploadPanel.tsx` (only if a layout class is needed; prefer CSS-only)
- `docs/project/ROADMAP.md` (mark #4 Done at signoff)
- `.cursor/workflow/state.md`
- `references/project-chatgpt-handoff/CURRENT-STATE.md` (if present)

### Architecture Impact

- [x] None — presentation CSS only; services/hooks unchanged

### Security Impact

- [x] None

### Data Model Impact

- [x] None

### Backend Impact

- [x] None

### UI / UX Impact

- [x] Details: Mobile Upload Designs footer (and Donate footer sharing same classes) — side-by-side actions; full-width callout

### Migration Impact

- [x] None

---

## Approach

1. Inspect current mobile footer rules (~40rem breakpoint).
2. Change mobile rules so:
   - Footer remains column (callout on its own row).
   - `.portal-customer-upload-quota` is `width: 100%` / stretch (full width).
   - `.portal-customer-upload-footer-actions` is a **row** (not `column-reverse`), `width: 100%`, equal or shared flex children.
   - Buttons in the actions row share horizontal space (`flex: 1 1 0` or similar) instead of `width: 100%` stacked.
3. Confirm Donate still looks acceptable (Cancel + Submit donation side by side; images/day pill full width).
4. Soft-reload Portal; run `npm run typecheck --workspace @fresh-prints/portal` (CSS-only → expect no TS delta); lint only if TSX touched.
5. Document manual mobile verify steps for owner (no blocking human checkpoint if automated checks pass; leave steps in test report).

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Lint | root `npm run lint` only if TSX changed | conditional |
| Unit tests | none expected (CSS) | no |
| Build | skip (narrow CSS) | no |
| Integration / E2E / Backend | n/a | no |

### Manual

- [x] Details: Owner (or agent browser) at ≤40rem / phone width on Upload Designs: Back and Add side by side; room callout full width. Spot-check Donate footer. Soft-reload only.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review — **non-blocking**: document verify steps; owner can PASS later or agent notes soft-reload ready
- [ ] Design approval
- [ ] Business logic decision
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Long button labels wrap awkwardly on narrow phones | low | `flex: 1`, allow wrap / min-width 0; keep leading icons |
| Donate footer regresses | low | Same intentional layout; spot-check Donate |
| Shared footer classes affect modal Cancel path | low | Same side-by-side is acceptable for Cancel + Add |

---

## Rollback Plan

Revert CSS (and any class) changes in the two Portal files; soft-reload Portal.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md / ARCHITECTURE / DATA_MODEL / BACKEND / TESTING / DEPLOYMENT / STYLE_GUIDE / DECISIONS — none required for CSS-only
- [x] Other: ROADMAP #4 → Done; workflow state; CURRENT-STATE handoff

---

## Open Questions

- [x] None

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-20-upload-page-mobile-actions-layout-review.md
- Verdict: approved
