# Plan: Portal Current Request empty-state + cart drawer polish

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | ADR-FP-076, ADR-FP-079 |

---

## Goal

Align Portal UX with the intended **cart-style Current Request** (ADR-FP-076): customers always experience an open Current Request (virtual empty until first add) without needing “Start request” first; keep **Clear request** only in the right-side cart drawer as a small control beside the summary line; replace drawer **Close** with an **X**.

## Background

Owner reported (1) no open request while signed in until Start/Add, and (2) duplicate Clear request in left sidebar + large Clear beside Review Request.

**Product truth (ADR-FP-076):** Authenticated customers always *experience* a Current Request. Firestore `draft`/`editing` docs are created **lazily** on the first persistent action (catalog add, upload attach, etc.). This avoids empty carts flooding Studio Working (ADR-FP-079). The header basket + drawer already represent the perpetual cart; the `/requests` empty page still pushes legacy “Start request” copy, which feels broken.

## Scope

### In Scope

1. **Empty `/requests` UX** — stop implying customers must Start request before browsing; copy + primary CTA = browse designs / open Current Request basket; remove or demote eager Start request from the zero-history empty state (keep creation path via first catalog/upload action).
2. **Working-tab empty copy** — describe virtual Current Request / basket, not “when you start a new request”.
3. **Clear request** — remove from left sidebar (and related confirm modal/CSS); keep only in Current Request drawer; move to a compact control next to `N designs · N prints`; footer = Review Request only (when applicable).
4. **Close** — replace text “Close” with `XIcon` (slightly larger hit target / font size); keep `aria-label="Close Current Request"`.

### Out of Scope

- Eager Firestore create on login (would contradict ADR-FP-076 / Working triage empty-cart problem)
- Production deploy
- Changing Clear callable / soft-archive behavior
- Bottom nav / header basket redesign beyond what’s needed for empty-state CTAs

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/app/(app)/requests/page.tsx`
- `apps/portal/features/print-requests/utils/portalPrintRequestTabCopy.ts` (+ tests if present)
- `apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx`
- `apps/portal/features/navigation/components/PortalSidebar.tsx`
- `apps/portal/styles/shell.css`
- Docs: optional one-line note in ADR-FP-076 consequences if copy guidance needed — prefer code-only unless docs drift

### Architecture Impact

- [x] None — presentation/copy only; same provider/lazy create contract

### Security Impact

- [x] None

### Data Model Impact

- [x] None

### Backend Impact

- [x] None

### UI / UX Impact

- [x] Details: requests empty state; cart drawer header/footer; sidebar footer

### Migration Impact

- [x] None

---

## Approach

1. Update empty-page + working-tab copy helpers.
2. Requests page empty state: primary **Browse designs**; secondary optional **Open Current Request** (opens drawer); remove Start request from this empty state (or hide when virtual empty always — prefer remove).
3. Drawer header: summary row with inline compact Clear (only when `workingRequest` exists); X close button.
4. Drawer footer: Review Request only (link still works for virtual empty → working tab).
5. Strip Clear UI + modal from `PortalSidebar`; remove unused clear CSS if orphaned.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Tab copy unit tests (if any) | `npx tsx --test` on related portal/shared tests | if exist |
| Lint touched files | IDE / existing portal lint | best effort |

### Manual

| Scenario | Expected |
|----------|----------|
| Signed in, never started request | Basket opens empty Current Request; no need to Start request; `/requests` does not demand Start |
| Add design from catalog | Creates working request; appears in Working |
| Clear in drawer only | Sidebar has no Clear; drawer Clear is small by summary; confirm still works |
| Close | X closes drawer |

---

## Human Checkpoints Anticipated

- Manual UI pass on empty state + drawer chrome (PASS / FAIL / PASS WITH NOTES)

---

## Risks & Rollback

| Risk | Mitigation |
|------|------------|
| Users who relied on Start request for empty doc | Catalog Add / Upload still create; Review may land on working empty |
| Clear harder to find | Keep labeled text control near summary |

Rollback: revert Portal UI files.

---

## Open Questions

None — keep **lazy** create per ADR-FP-076; fix misleading empty UX rather than eager create on login.

---

## Amendment (2026-07-13, owner during manual checkpoint)

- Empty Stash drawer layout inspired by reference (centered empty state + Browse / Upload CTAs); **do not** adopt comic/neon styling.
- Rename customer-facing **Basket** → **Your Stash** (subtitle still “Current Request”).
- Filled Stash footer remains Review Request only; Clear stays compact by summary.