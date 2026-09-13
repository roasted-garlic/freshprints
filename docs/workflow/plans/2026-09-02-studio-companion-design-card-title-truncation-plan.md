# Plan: Studio Companion Design card title truncation

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Goal slug | `studio-companion-design-card-title-truncation` |
| Related | docs/workflow/reviews/2026-09-02-studio-companion-design-card-title-truncation-review.md |

---

## Goal

In Studio **Companion Designs** member cards, long design titles must stay on **one line**, truncate with an **ellipsis** within available card width, and leave thumbnail, placement dropdown, and link/unlink controls layout-stable. Full title remains available via the existing native `title` attribute (no new tooltip dependency).

---

## Background

Owner screenshot shows a long companion-design title stretching across the card and crowding surrounding controls. Desired display resembles:

`To The Person Behind Me You Are Amazing Beautiful And Enough Remember Th...`

Short titles must continue to display normally.

---

## Audit findings (source of truth)

### Exact component

| Item | Path |
|------|------|
| Panel | `apps/studio/src/renderer/src/features/designs/components/CompanionSetPanel.tsx` |
| Card markup | Linked (and anchor) members rendered as `<li className="design-companion-member">` |
| Title element | `<span className="design-companion-member-title" title={member.title}>{member.title}</span>` (~L302–304) |
| Modal host | `DesignDetailsModal.tsx` dedicated Companion Designs modal hosts `CompanionSetPanel` |

### Exact CSS / style location

| Item | Path |
|------|------|
| Stylesheet | `apps/studio/src/renderer/src/styles/components/design-library.css` |
| Card layout | `.design-companion-member` (~L1002–1011) |
| Body / title row / title | `.design-companion-member-body`, `.design-companion-member-title-row`, `.design-companion-member-title` (~L1049–1070) |

### Current layout contract

```
.design-companion-member
  display: grid
  grid-template-columns: 2.75rem minmax(0, 1fr) auto
  → [thumb] [body] [unlink (optional)]

.design-companion-member-body
  display: flex; flex-direction: column
  align-items: flex-start   ← problem
  min-width: 0

.design-companion-member-title-row
  display: flex; min-width: 0
  → [title span] [optional THIS DESIGN badge]

.design-companion-member-title
  overflow: hidden
  text-overflow: ellipsis
  white-space: nowrap
  ← missing constrained flex shrink (min-width: 0 / flex: 1)
```

### Overflow root cause

Ellipsis rules **already exist** on `.design-companion-member-title`, and the grid middle column already uses `minmax(0, 1fr)`. Truncation still fails because:

1. **`.design-companion-member-body` uses `align-items: flex-start`**, so the title-row sizes to **content width** instead of stretching to the grid cell width. The title never receives a finite max width, so `text-overflow: ellipsis` never engages.
2. **`.design-companion-member-title` is a flex item without `min-width: 0` (and without `flex: 1`)**, so even once the row is constrained, the default flex `min-width: auto` can refuse to shrink below the full text intrinsic width—especially when a `THIS DESIGN` badge shares the row.

Failing element (shrink chain break): **title-row / title span under `align-items: flex-start`**, not the outer grid column.

### Full-title access (already present)

`title={member.title}` is already on the truncated span. Prefer **keep as-is**; do not add a new tooltip library or custom tooltip component.

### Out-of-scope note (picker)

`CompanionLinkPickerModal` / `.design-companion-picker-title` has similar ellipsis CSS; **not** in scope for this goal unless Owner QA finds the same overflow there.

---

## Scope

### In Scope

- CSS-only (preferred) fix so companion **member card** titles truncate responsively to available width.
- Preserve native `title` attribute for full-name hover access.
- Focused static UI/CSS contract test(s) matching existing CompanionSetPanel conventions.
- Owner QA checklist for visual confirmation at normal and narrower Studio widths.

### Out of Scope

- Thumbnail, placement dropdown behavior, link/unlink/loading logic changes.
- New tooltip dependency or redesign of Companion Designs modal.
- Companion link picker row truncation (unless same bug confirmed during QA and owner expands scope).
- Portal, Functions, Rules, indexes, migrations.
- Fixed pixel title widths keyed to one window size.

---

## Affected Areas

### Files / Modules (expected)

| File | Change |
|------|--------|
| `apps/studio/src/renderer/src/styles/components/design-library.css` | Minimal truncation shrink-chain fix |
| `apps/studio/src/renderer/src/features/designs/components/CompanionSetPanel.tsx` | Likely **no change** (keep `title={member.title}`); touch only if a testability class is required |
| New or adjacent `*.test.ts` under `features/designs/components/` (and/or CSS contract assertions) | Truncation + `title` + placement presence contract |

### Impact matrix

| Area | Impact |
|------|--------|
| Studio | **YES** |
| Functions | **NO** |
| Portal | **NO** |
| Firestore Rules | **NO** |
| Storage Rules | **NO** |
| Indexes | **NO** |
| Migration | **NO** |

### Architecture Impact

- [x] None (presentation CSS within existing designs feature styles)

### Security Impact

- [x] None

### Data Model Impact

- [x] None

### Backend Impact

- [x] None

### UI / UX Impact

- [x] Details: Companion Designs member cards — long titles ellipsize; short titles unchanged; hover shows full name via native `title`.

### Migration Impact

- [x] None

---

## Approach

### Exact minimal fix (preferred)

In `design-library.css` only:

1. **Constrain the title row to the body width** — either:
   - change `.design-companion-member-body` `align-items: flex-start` → `stretch`, **or**
   - keep flex-start and set `.design-companion-member-title-row { width: 100%; max-width: 100%; }` (and preferably the same for placement row if stretch is not used).
2. On `.design-companion-member-title`, add **`min-width: 0`** and **`flex: 1 1 auto`** (or `flex: 1; min-width: 0`) so the span shrinks inside the flex title-row.
3. Ensure the optional badge does not shrink away: badge already uses nowrap; add `flex-shrink: 0` on the badge wrapper only if needed after visual check.
4. **Do not** introduce arbitrary fixed title widths; rely on grid `minmax(0, 1fr)` + flex shrink.
5. Keep `title={member.title}` on the span.

Existing utility `.text-truncate` (`utilities.css`) matches overflow/ellipsis/nowrap but does **not** include `min-width: 0` / flex grow — prefer completing the companion-member CSS rather than relying on that class alone.

### Full-title accessibility behavior

- Native HTML `title` attribute on `.design-companion-member-title` (already wired).
- Visible truncated text remains the accessible name content of the span; `aria-label`s on preview/unlink buttons already include full `member.title`.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Focused contract test | Studio node test for new/updated companion title truncation file (pattern: `CompanionSetPanel.artworkPlacement.test.ts`) | yes |
| Typecheck / lint / broader suite | Per `docs/standards/TESTING.md` / studio package scripts as applicable for touched surface | yes (honest partial OK if only CSS+contract) |
| Build | Not required solely for CSS truncate unless package scripts always run with test gate | no unless CI demands |
| Integration / E2E / Rules | N/A | no |

Contract assertions (static source / CSS text — **no brittle pixel widths**):

1. `.design-companion-member-title` retains overflow + ellipsis + nowrap **and** shrink-friendly rules (`min-width: 0` and flex shrink/grow as planned).
2. Title-row (or body align) constrains width so truncation can apply (`width: 100%` / `align-items: stretch` as chosen).
3. `CompanionSetPanel.tsx` keeps `title={member.title}` on the title span.
4. Placement row / Select wiring remains present.
5. Card grid still uses `minmax(0, 1fr)` middle column (no horizontal-overflow contract regression via fixed wide title column).

### Manual (Owner QA)

- [x] Details: see Owner QA checklist below.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (Owner QA after implement/test)
- [ ] Design approval (not a visual redesign)
- [ ] Business logic decision
- [ ] Production deploy — **NOT AUTHORIZED**
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars

---

## Owner QA checklist (post-implement)

1. Open a design with a **very long** title that is linked as a companion (or is the anchor in Companion Designs).
2. Confirm title is **one line** with **ellipsis** when too long.
3. Hover title → native tooltip shows **full** name.
4. Placement dropdown remains fully usable; unlink (if peer) remains reachable; thumbnail unchanged.
5. Repeat at a **narrower** Studio / modal width — truncation still works; no horizontal scroll of the card row; controls not pushed off.
6. Short title companion still looks normal (no premature ellipsis / empty gap).

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Changing body `align-items` slightly shifts placement row width | Low | Prefer stretch or `width: 100%` only on title-row; Owner QA |
| Badge + title fight for space | Low | `flex: 1; min-width: 0` on title; badge `flex-shrink: 0` if needed |
| Scope creep into picker titles | Low | Explicitly out of scope unless owner expands |

---

## Rollback Plan

Revert CSS (and any test-only) commit on `development`. No data or rules rollback.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF / ARCHITECTURE / DATA_MODEL / BACKEND / TESTING / DEPLOYMENT / STYLE_GUIDE / DECISIONS — none expected for this micro-UI fix
- [x] Workflow artifacts only (plan, review, test report, signoff)

---

## Open Questions

- [x] None blocking — `[NEEDS OWNER DECISION]: none` for plan approval.
- Optional later: whether companion **picker** rows need the same shrink-chain fix (out of scope now).

---

## Approval

- Review doc: docs/workflow/reviews/2026-09-02-studio-companion-design-card-title-truncation-review.md
- Verdict: **approved** (2026-09-02)
- Status: ready_for_review → approved for implement (awaiting owner proceed)
