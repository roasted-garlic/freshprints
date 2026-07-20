# Recent Completed Work

> Signed-off or largely complete work. External agents should not re-plan or duplicate this.

## 2026-07-20 - Portal account auth (#7–#10) + owner delete user

- **#7–#10** Portal reset password / change email / deletion request + Studio Test Data owner delete individual user; owner **PASS**
- Polish: Notifications **Back to settings**; Google Change email = new-account least resistance (no Sync); Delete user modal wider (~52rem), theme-matched confirm typography, copy button for `DELETE USER`, **list-only scroll** (no outer modal scrollbar)
- Signoff: `docs/workflow/reviews/2026-07-20-portal-account-auth-settings-7-10-signoff.md` (**approved**); ADR-FP-104
- Small Managed **#7–#10 Done**; next **#11** OG social meta, then **#12**

## 2026-07-20 - Show queue cutoff + countdown (#5) + library newest-first (#6)

- **#5** Studio cutoff setting + Functions enforce + Portal compact countdown; owner **PASS** (layout/copy/mobile polish)
- Signoff: `docs/workflow/reviews/2026-07-20-show-queue-cutoff-countdown-signoff.md` (**approved**); ADR-FP-103
- **#6** Portal catalog already `createdAt` desc default browse — owner **PASS** covered already; verification note only (no new code)
- Verification: `docs/workflow/reviews/2026-07-20-design-library-newest-first-verification.md`
- Small Managed **#5** + **#6 Done**

## 2026-07-20 - Upload page mobile actions layout (#4)

- Mobile: Back + Add to Request **side by side**; footer quota/room callout **full width**
- CSS-only `apps/portal/styles/customer-uploads.css`; Donate shares footer; ADR-FP-102 unchanged
- Typecheck pass; Portal soft-reload Ready; owner visual **PASS** 2026-07-20
- Signoff: `docs/workflow/reviews/2026-07-20-upload-page-mobile-actions-layout-signoff.md` (**approved_with_notes**)
- Small Managed Items **#4 Done**; next **#5** show queue cutoff (active)

## 2026-07-20 - Simple request-per-show limit (ADR-FP-102) + Portal UX polish

- Sole limit `L`; Cap A daily + Cap B remainder/choose-prints removed; atomic full-queue-or-reject
- UX: L banner/help, full helper, show callouts, qty-0, full card label, Upload overlay/slot/hydrate/ownership, upload/donate quota badges
- Owner **PASS** (“call all that PASSED”); signoff **approved_with_notes**
- Uniqueness keep confirmed (owner 2026-07-20); multi-request-under-L won't do
- Signoff: `docs/workflow/reviews/2026-07-19-simple-request-per-show-limit-signoff.md`
- Small Managed Items **#3 Done**

## 2026-07-19 - Portal copy/UX polish batch (PASS)

- Cap B split callout title+body (`Each Customer Is Limited to…`); bidding acknowledgments **v3** (gang-sheet paragraph + funkyfreshprints.com); split qty auto-select; yellowish past-show chips
- Owner **PASS on everything**; Cap B allotment bug phase **not** closed
- Signoff: `docs/workflow/reviews/2026-07-19-portal-copy-ux-polish-batch-signoff.md`
- Bidding ack signoff updated: `docs/workflow/reviews/2026-07-18-portal-bidding-acknowledgment-signoff.md` (**approved**, v3)

## 2026-07-19 - Cap A exhausted card/modal copy polish

- Cards/modals: only **“Daily print limit reached”**; banner + Current Request drawer keep situational helper
- Owner soft-reload QA **PASS**; signoff **approved**
- Signoff: `docs/workflow/reviews/2026-07-19-cap-a-exhausted-card-modal-copy-signoff.md`
- Cap B allotment bug remains the active managed phase (not closed by this polish)

## 2026-07-19 - Portal cart/detail UX batch (duplicate preparing + cart polish)

- Optimistic duplicate: preparing UI; size/qty editable while pending; flush on real id
- Newest-first detail + cart; per-size cart rows (`W x H · Qty N`); Clear + quota meta bar; mobile scrollbar chrome hidden
- Owner **PASS on everything**; signoff **approved**
- Signoff: `docs/workflow/reviews/2026-07-19-duplicate-preparing-feedback-signoff.md`
- Closed related manual QA: cart newest-first, detail newest-first, cart per-size

## 2026-07-18 - Portal caps live Settings refresh

- Cap A banner, Current Request drawer quota, and upload daily quotas refetch on focus/visibility + ~45s poll
- Settings docs stay owner-only; callables already live-read limits (no Functions deploy)
- Signoff: `docs/workflow/reviews/2026-07-18-portal-caps-live-settings-refresh-signoff.md` (**approved_with_notes**)
- Owner tip: Save in Studio → focus Portal or wait ≤45s
- Left help-modal widen + Cap B to parallel agent

## 2026-07-18 - Small Managed Items #1 Add to Request PASS

- Assisted approved proof → **Add to Request** / Current Request; owner **PASS** ("working well")
- Signoff: `docs/workflow/reviews/2026-07-18-assisted-approved-proof-add-to-print-request-signoff.md` (**approved_with_notes**)
- Related Custom pill / Current Request chrome absorbed; unrelated Portal duplicate-order remains parked
- Next: #2 upload caps + Studio Settings

## 2026-07-18 - Brevo IP/blocklist PASS + owner clarifying closeouts

- Brevo proof-ready email IP/blocklist → **approved_with_notes**; owner **PASS** (console/provider; no app code)
- Signoff: `docs/workflow/reviews/2026-07-18-brevo-proof-email-ip-block-signoff.md`
- Studio wipe presets confirmed closed (prior signoff same day)
- ROADMAP/state clarifications: Phase 9A/9C in progress/complete in dev (not untouched); image caching already done; account linking = Firebase console setting; Whatnot staff-assisted import built vs live scheduled sync not planned
- Workflow idle / DONE

## 2026-07-18 - Studio Test Data Reset presets + wipe expansion signed off

- Goal `studio-test-data-reset-presets` -> **approved_with_notes**; owner manual QA **PASS**
- Short wipe labels; presets including **All (-) Designs**; expanded Etsy/Custom orphan wipe targets
- `wipeOperationalTestData` already deployed to `fresh-prints-dev` (required for leftovers)
- Signoff: `docs/workflow/reviews/2026-07-18-studio-test-data-reset-presets-signoff.md`
- Brevo first-proof IP/blocklist later closed same day (owner PASS) — see entry above

## 2026-07-17 - Parked owner-QA batch (PASS all) signed off

- Owner directed **PASS all** for remaining parked items after proof-download closeout
- `assisted-terminal-messaging-closed` -> **approved_with_notes** - `docs/workflow/reviews/2026-07-17-assisted-terminal-messaging-closed-signoff.md`
- `assisted-customer-cancel-reason` -> **approved_with_notes** - `docs/workflow/reviews/2026-07-17-assisted-customer-cancel-reason-signoff.md`
- `skeleton-not-halloween` optional live smoke -> **PASS** / closed (signoff updated)
- Workflow idle; no parked owner-QA left from that closeout list

## 2026-07-17 - Assisted approved proof download + Portal proof UX signed off

- Goal `assisted-approved-proof-download` (+ CORS + notes/overview residuals) **approved_with_notes**
- Owner manual QA **PASS** ("PASS this") - callable file download; Overview 14-day; Approved labels; Notes dedupe; Studio modal absorbed
- Signoff: `docs/workflow/reviews/2026-07-17-assisted-approved-proof-download-signoff.md`
- Follow-up parked QA later closed via owner **PASS all** (see above)

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

