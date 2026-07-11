# Plan: Admin Test Data Reset page (selectable operational wipes)

| Field | Value |
|-------|-------|
| Date | 2026-07-10 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-10-admin-operational-test-data-wipe-review.md |

---

## Goal

Provide an **admin/owner-only Studio page** for scratch testing that can wipe operational Firestore data selectively or in presets — including a **“print-request stack”** wipe that clears requests and their show-queue attachments **without deleting upcoming shows** — while keeping accounts, catalog, taxonomy, settings, and Storage.

## Background

Manual Firebase Console cleanup after each “create request → queue to show” loop is slow. Human confirmed (2026-07-10):

- Wipe shows option: yes (as a selectable target, not forced)
- Reset design request counts: yes
- Owner + admin: yes
- Allowlist `fresh-prints-dev` only: yes
- **UX change:** dedicated page (not Settings section); pick targets one-by-one, all-at-once, or print-request-related-without-shows

## Scope

### In Scope

- New Studio route e.g. `/test-data-reset` — **Test Data Reset** page
- Sidebar link visible only when `manageSettings` **and** Firebase project is allowlisted
- Cloud Function `wipeOperationalTestData` with **target flags**
- Type-to-confirm (`WIPE TEST DATA`) before any wipe
- Presets + individual checkboxes (see Approach)
- Server project allowlist + owner/admin gate
- ADR + SECURITY/TESTING/DEPLOYMENT notes
- Deploy callable to `fresh-prints-dev` (human)

### Out of Scope

- Deleting Auth / `users` / customer identity / usernames
- Deleting designs, categories, tags, Storage
- Deleting `settings/*`
- Production project support
- Portal UI

---

## Wipe targets

| Target ID | UI label | Deletes / resets | Keeps |
|-----------|----------|------------------|-------|
| `printRequests` | Print requests & items | `printRequests`, `printRequestItems`; **also** clears `showAllocations`, `gangSheets`, `gangSheetItems` (attachments become invalid) | `upcomingShows`, accounts, catalog |
| `showQueueAttachments` | Show queue attachments only | `showAllocations`, `gangSheets`, `gangSheetItems` | requests, shows, accounts, catalog |
| `upcomingShows` | Upcoming shows | `upcomingShows` + remaining allocations/gang data for those shows | print requests, accounts, catalog |
| `sequences` | Request name sequences | `counters/printRequests` → `nextInternalRequestSequence = 1`; all `customers.*.nextPrintRequestSequence = 1`, `totalPrintRequests = 0` | customer docs otherwise |
| `designRequestStats` | Design request stats | Clear/zero `requestCount`, `lastRequestedAt` on designs | designs otherwise |

### Presets

| Preset | Selects |
|--------|---------|
| **Print-request reset (keep shows)** | `printRequests` + `sequences` + `designRequestStats` |
| **Select all** | every target including `upcomingShows` |
| **Clear selection** | none |

Individual checkboxes remain independently toggleable after applying a preset.

---

## Affected Areas

### Files / Modules (expected)

- `functions/src/wipeOperationalTestData.ts` (+ helpers)
- `functions/src/index.ts`
- `packages/shared` types for request/response/targets (preferred for Studio + Functions)
- `apps/studio/.../features/test-data-reset/` — page, service, constants
- `AppRoutes.tsx`, `Sidebar.tsx`
- `apps/studio/.../config/env.ts` or wipe allowlist util
- Styles under `styles/components/`
- Docs: DECISIONS, SECURITY, TESTING, DEPLOYMENT

### Architecture / Security / Data / Backend / UI

- Privileged Admin SDK callable; no rules change
- Destructive; allowlist + confirm + role gates
- No schema migration
- New Studio page; manual QA

---

## Approach

1. Shared target enum + request `{ confirmationPhrase, targets: Target[] }` / response with per-collection counts
2. Callable expands dependencies (e.g. `printRequests` ⇒ also wipe allocations + gang data)
3. Paginated batch deletes; then field resets
4. Studio page: keep/wipe legend, checkboxes, preset buttons, confirm modal, result summary
5. Hide nav + refuse route content when project not allowlisted (server still enforces)

---

## Test Strategy

### Automated

| Check | Required |
|-------|----------|
| Functions build / tsc | yes |
| Studio typecheck | yes |
| Lint (touched files) | yes |
| Unit tests for target expansion / phrase / allowlist helpers | yes |

### Manual

- [ ] Print-request reset preset: requests gone, shows remain, sequences restart at 001
- [ ] Wipe shows only: shows gone, requests remain
- [ ] Attachments only: allocations/gang gone, requests + shows remain
- [ ] Select all: full operational clear
- [ ] Wrong phrase / helper role / non-allowlisted project rejected
- [ ] Sidebar link only for admin/owner on allowlisted project

---

## Human Checkpoints

- [x] Product decisions confirmed
- [ ] Manual UI QA after implement
- [ ] Deploy `wipeOperationalTestData` to `fresh-prints-dev`

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Accidental prod wipe | Server allowlist; UI hidden; typed confirm |
| Orphan allocations | Target expansion always clears attachments with requests/shows |
| Timeout | Paginated batches; raised function timeout |

---

## Open Questions

- [x] None — human confirmed defaults + dedicated selectable page (2026-07-10)

---

## Approval

- Review doc: `docs/workflow/reviews/2026-07-10-admin-operational-test-data-wipe-review.md`
- Verdict: pending → approve in review after this revision
