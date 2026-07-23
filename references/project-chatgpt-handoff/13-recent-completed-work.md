# Recent Completed Work

> Signed-off or largely complete work. External agents should not re-plan or duplicate this.

## 2026-07-23 - Portal FAQ and How To (approved_with_notes)

- Public `/help` + Studio Settings CMS (`settings/portalHelp`); nav **Help** vs H1 **FAQ and How To**; Coming soon videos; seeded 8 FAQs on fresh-prints-dev
- Buy-yourself FAQ + Whatnot limits copy; no em dashes; theme picker hidden on `/help`
- Owner manual **PASS** 2026-07-23; ADR-FP-117 / ADR-FP-118
- Signoff: `docs/workflow/reviews/2026-07-23-portal-how-to-faq-signoff.md`
- Next queued: `portal-google-analytics` (not started)
## 2026-07-22 - Portal SEO foundations (approved_with_notes)

- Fail-closed robots (prod host only), sitemap + 1h revalidate, SSR `/share/design/{id}` in Portal shell, stable public OG images (ADR-FP-116)
- Guest Sign in CTA on catalog modal; share landing centering + theme picker polish
- Automated 20/20 + Portal typecheck/build pass; owner manual **PASS** 2026-07-22
- Signoff: `docs/workflow/reviews/2026-07-22-portal-seo-foundations-signoff.md`
- Next: `portal-how-to-faq` (plan + review ready; await APPROVE IMPLEMENTATION)

## 2026-07-22 - Brand logo uploads (approved_with_notes)

- Studio Settings four PNG slots (Studio/Portal × full/collapsed); Storage finalize + display-size callables; AR-locked W×H boxes; separate Portal header vs sidebar controls (defaults height 52)
- Soft-deployed to `fresh-prints-dev` (incl. mid-session `updateBrandLogoDisplaySizes`); production deploy **not** done
- Session polish: guest mobile Login hide, logo flash cache, height-only chrome sizing
- Adjacent out-of-band: Studio Design Library `createdAt` desc enforcement
- Owner **PASS** 2026-07-22; ADR-FP-114
- Signoff: `docs/workflow/reviews/2026-07-22-brand-logo-uploads-signoff.md`
- Next: idle — optional APPROVE production brand-logo Functions/rules; else await next goal

## 2026-07-22 - Firestore usage efficiency (approved_with_notes)

- Duplicate listener consolidation, AI Review counts, Portal library deferred hydrate, slim shell loads, bounded gallery, DEV tracer
- B4 / Wave C deferred; no production/rules/Functions deploy
- Owner **PASS** 2026-07-22
- Signoff: `docs/workflow/reviews/2026-07-22-firestore-usage-efficiency-signoff.md`

## 2026-07-21 - Studio design download + newest sort (approved)

- Design details modal full-res Download (`originalPath`); Design Library default `createdAt` desc
- AI Review sort unchanged; unit 8/8 + eslint pass; Studio `tsc` TS5103 pre-existing documented
- Owner **PASS** 2026-07-21
- Signoff: `docs/workflow/reviews/2026-07-21-studio-design-download-and-newest-sort-signoff.md`
- Next: idle — await owner next managed goal

## 2026-07-21 - AI text title completeness (approved)

- Catalog titles keep full readable phrases; intermittency harden so reprocess stays stable
- Prompt `catalog-enrich-v25` / ADR-FP-113 amendments; Functions title unit + build pass
- Owner **PASS** (incl. soft-deploy + **3×** Sarcasm reprocess)
- Signoff: `docs/workflow/reviews/2026-07-21-ai-text-title-completeness-signoff.md`

## 2026-07-21 - #12/#13 Function redeploy leftovers PASS

- Owner **PASS**: with #14 already soft-deployed, #12 (`staffSuggestAssistedCreationCatalogDesign`) and #13 donation-path Function leftovers treated as live on `fresh-prints-dev`
- Small Managed **#1–#14** all Done; soft redeploy parked cleared

## 2026-07-21 - PASS ALL batch (noreply + AI context + #14 + OG letterbox)

- Owner **PASS ALL** closed four parked items
- Signoffs: `noreply-myprintrequest-email-sender-signoff.md`, `custom-request-ai-context-and-final-source-workflow-signoff.md`, `portal-og-letterbox-and-global-image-toggles-signoff.md`
- Soft-deploy: `onShowAllocationCreated` → `fresh-prints-dev` (exit 0); Small Managed **#14 Done**

## 2026-07-21 - Assisted Creation proof preview hang (approved)

- Studio + Portal proof thumbs hung on unbounded `getBytes` (ADR-FP-110); fixed signed-URL-first + timeouts (ADR-FP-112)
- Owner **PASS**; signoff: `docs/workflow/reviews/2026-07-21-assisted-creation-proof-preview-hang-signoff.md`
- Soft-deploy not required (client-only)

## 2026-07-21 - Portal assisted resume + guest auth overlay (approved)

- Assisted hub Reset/Continue mirrors Find; mobile Login required overlay raised above bottom nav
- Owner **PASS**; soft-signoff: `docs/workflow/reviews/2026-07-21-portal-assisted-resume-and-auth-overlay-signoff.md`

## 2026-07-21 - Custom request details parity + Addenda A–C (approved)

- Shared answer display rows; exact-wording draft; mood chips; Review card parity
- Owner **PASS** (checkpoint had been parked; PASS recorded with next-phase brief — not invented earlier)
- Soft-signoff: `docs/workflow/reviews/2026-07-21-custom-request-details-parity-signoff.md`

## 2026-07-21 - #12 Design Library proof-line (soft-signoff approved_with_notes)

- Owner **PASS** on Design Library proof-line UX (believes already passed; recorded)
- Soft-signoff: `docs/workflow/reviews/2026-07-21-library-design-sharing-proof-line-followup-signoff.md`
- Functions soft-deploy leftovers later **PASS** 2026-07-21 (owner: live given #14)
- Small Managed **#12 Done**

## 2026-07-21 - #13 login-required donate product PASS

- Owner: donation works great; login gate fine → product **PASS**
- Donation Functions redeploy leftover later **PASS** 2026-07-21 (owner: live given #14)
- ADR-FP-106

## 2026-07-21 - Portal customer temporary artwork background preview (approved)

- Compact **Background** swatch in design details → nested **Background Color** picker (16 shirt colors + custom hex); temporary local preview only
- Unit 4/4 + Portal typecheck; owner **PASS** (incl. title copy); no Firestore/OG writes; no soft-deploy
- Signoff: `docs/workflow/reviews/2026-07-21-portal-customer-temp-artwork-bg-preview-signoff.md`

## 2026-07-21 - Studio tag footer + Design Library Halftone + AI Processing artwork bg (approved_with_notes)

- Tag modal footer Clear left / Cancel+Apply right; Studio Design Library Halftone dock toggle; AI Needs Review artwork background on approve
- Owner **PASS**; signoff: `docs/workflow/reviews/2026-07-21-studio-tag-footer-halftone-filter-ai-artwork-bg-signoff.md`

## 2026-07-21 - Library OG rotation interval + per-design artwork backgrounds (approved_with_notes)

- Configurable library OG intervals (daily→30s) + Pick next; `artworkBackgroundHex` mats + OG letterbox; Functions soft-deployed to fresh-prints-dev
- Owner **PASS** (same “PASS on the previous work” covered this parked checkpoint); signoff: `docs/workflow/reviews/2026-07-21-library-og-rotation-interval-and-per-design-artwork-bg-signoff.md`

## 2026-07-20 - #13 Public browse + guest chrome / overlay (approved_with_notes)

- Public catalog browse without sign-in; guest chrome; in-shell dimmed auth overlay; login/register card styling
- Addendum A guest donate in repo then retired same day (login required); print-request uploads stay portal-customer only
- Owner UI **PASS** 2026-07-20; login-required donate product **PASS** 2026-07-21
- Signoff: `docs/workflow/reviews/2026-07-20-portal-public-browse-login-gated-actions-signoff.md` (**approved_with_notes**); ADR-FP-106
- Soft follow-up: donation Functions redeploy if guest-path retirement not live
- Small Managed **#13 Done**; **#14** closed later same week (soft-deploy 2026-07-21)

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



