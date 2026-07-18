# Recent Completed Work

> Signed-off or largely complete work. External agents should not re-plan or duplicate this.

## 2026-07-17 - Assisted approved proof download + Portal proof UX signed off

- Goal `assisted-approved-proof-download` (+ CORS + notes/overview residuals) **approved_with_notes**
- Owner manual QA **PASS** ("PASS this") — callable file download; Overview 14-day; Approved labels; Notes dedupe; Studio modal absorbed
- Signoff: `docs/workflow/reviews/2026-07-17-assisted-approved-proof-download-signoff.md`
- Still parked (no PASS invented): terminal messaging closed; customer cancel reason
## 2026-07-17 — Portal notification history + Ctrl+Enter + Studio deep-link signed off

- Goals **approved_with_notes**; owner `PASS` batch:
  - `portal-notification-history-modal` (unread Alerts + history modal + deep-links; absorbed click-vanish/badge)
  - `assisted-messages-ctrl-enter-send` (Portal + Studio)
  - `studio-messages-deeplink-scroll-read-on-reply` (Studio Messages inbox deep-link — confirmed)
- Web-push / VAPID **not** PASS — next: VAPID setup + push QA
- Signoffs under `docs/workflow/reviews/2026-07-17-*-signoff.md` for those three goals

## 2026-07-17 — Portal duplicate + resize permissions signed off

- Goal `portal-duplicate-resize-permissions` **approved_with_notes**; owner manual QA `PASS` (“Portal duplicate/resize is fixed and PASSED”)
- Client: block optimistic `pending_dup_*` edits; item-only update; size/qty validation; notes `deleteField()`
- Optional: `firestore.rules` harden still needs owner `APPROVE DEV DEPLOY` → fresh-prints-dev
- Signoff: `docs/workflow/reviews/2026-07-17-portal-duplicate-resize-permissions-signoff.md`

## 2026-07-17 — Studio Message history signed off

- Goal `studio-message-history` **approved_with_notes**; owner manual QA `PASS` (“I would call this PASS”)
- Studio Messages: unread-only dropdown + Message history modal for acked updates (mirrors Portal Alerts)
- Signoff: `docs/workflow/reviews/2026-07-17-studio-message-history-signoff.md`


## 2026-07-16 — Phase 9C Assisted Creation signed off

- Goal `phase-9c-assisted-creation` **approved_with_notes**; owner manual QA `PASS`
- Portal brief/update/proof/revision/approval flow; Studio Assisted inbox/proof workflow; secured callables/rules/storage
- Signoff: `docs/workflow/reviews/2026-07-16-phase-9c-assisted-creation-signoff.md`

## 2026-07-14 — Portal Halftone filter toggle signed off

- Goal `portal-catalog-halftone-filter-toggle` **approved_with_notes**
- Standalone Halftone switch; hide tag from Tags modal; mobile sheet + Portal chrome polish
- Signoff: `docs/workflow/reviews/2026-07-14-portal-catalog-halftone-filter-toggle-signoff.md`

## 2026-07-13 — Add-to-show stay on detail + Portal polish batch signed off

- Goal `print-request-add-to-show-selection-bounce` **approved_with_notes**
- Signoff: `docs/workflow/reviews/2026-07-13-print-request-add-to-show-selection-bounce-signoff.md`

## 2026-07-13 — Studio import auto-start AI processing signed off

- Goal `studio-import-auto-start-ai-processing` **approved**
- Signoff: `docs/workflow/reviews/2026-07-13-studio-import-auto-start-ai-processing-signoff.md`

## Earlier

Portal empty-state / stash; image quality ADR-FP-080; catalog donate; Working triage; Phase 8 Portal MVP.

---

## Deferred / backlog

- **portal-notifications-web-push** — VAPID + browser push QA (in-app Alerts already live)
- Optional Functions redeploy: “New message” / “New proof” copy (`APPROVE DEV DEPLOY`)
- Optional `firestore.rules` harden from duplicate/resize (`APPROVE DEV DEPLOY`)
- Brevo (after push, or if push deferred)
- Image load caching (under discussion)
- Google login for Portal (under discussion)
- Production Portal App Hosting deploy
- `studio-apps-folder-monorepo-normalization`

See `CURRENT-STATE.md` for live status.

