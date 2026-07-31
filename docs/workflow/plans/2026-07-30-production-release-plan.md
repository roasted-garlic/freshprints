# Plan: `production-release` (Goal #13)

| Field | Value |
|-------|-------|
| Date | 2026-07-30 (amended 2026-07-31) |
| Author | Planning Agent |
| Phase | Plan (amended — domain-last sequencing) |
| Depends on | Goals #9–#12 all signed off/closed (confirmed in `.cursor/workflow/state.md`) |
| Scope of this phase | **Plan and Formal Review only for this amendment.** No custom-domain, DNS, Auth Authorized Domains, OAuth, App Hosting, Firebase deploy, CORS reapply, or production-data action is authorized by the 2026-07-31 sequencing amendment. |
| Related amendment review | `docs/workflow/reviews/2026-07-31-production-release-domain-last-sequencing-review.md` |

---

## 1. Purpose

Define the exact, evidence-based scope, sequencing, and human-checkpoint structure required to
take Fresh Prints from `fresh-prints-dev`-only operation to a live production Firebase project and
public Portal domain, without inventing any file, API, branch, or mechanism not already present in
this repository.

Every claim below is either sourced from a specific repo file (cited) or explicitly marked
`[NEEDS REPO CHECK]` / `[NEEDS OWNER INPUT]`.

---

## 2. Current State Summary (from repo inspection)

- `.firebaserc` defines exactly one project alias: `"default": "fresh-prints-dev"`. **No
  production Firebase project id exists anywhere in this repository.**
- `functions/.env.fresh-prints-dev` is the only project-specific Functions env file present;
  `functions/.env.example` documents the shape. No `functions/.env.<prod-project-id>` file exists.
- `apps/portal/.env.local` and `.env.example` contain only dev-shaped values; no
  `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set anywhere (`apps/portal/.env.example:17`, commented out).
- `apps/portal/apphosting.yaml` contains only `runConfig` (minInstances/maxInstances/concurrency) —
  no environment variables, no backend id override. The App Hosting backend id
  (`fresh-prints-portal`) is defined in `firebase.json` under `apphosting[0].backendId`, tied to
  `rootDir: ./apps/portal`.
- Production domains `myprintrequest.com` (and optional `www.`) are referenced throughout code and
  docs as the intended production host, but are **not yet configured** in any deployed Firebase
  project — they exist today only as string constants gating dormant/fail-closed behavior
  (SEO indexing, GA4, email continue-URLs).
- `docs/standards/DEPLOYMENT.md` Environments table lists Production URL as `[TBD]`.
- `docs/architecture/BACKEND.md` Backend Provider table lists Account/project ID as
  `[NEEDS HUMAN INPUT — do not store secrets here]`.

**Conclusion: this repository has never been deployed to a production Firebase project.**
`production-release` is a first-time production launch, not a promotion of already-deployed
infrastructure.

---

## 3. Launch-Readiness Inventory

### 3.1 What ships to production

| Component | Ships | Source |
|---|---|---|
| Fresh Prints Portal (Next.js, App Hosting) | Yes | `apps/portal/` per `firebase.json` apphosting block |
| Firebase Cloud Functions (`functions/src/index.ts` exports) | Yes — production allowlist to be finalized in §3.3 | `functions/` |
| Firestore Rules | Yes | `firestore.rules` (1,799 lines) |
| Firestore Indexes | Yes | `firestore.indexes.json` (1,177 lines) |
| Storage Rules | Yes | `storage.rules` (253 lines) |
| Fresh Prints Studio (Electron) | **No** — internal staff tool, distributed out-of-band, not a Firebase deployment target. Studio connects to whichever Firebase project its build config points at; production Studio distribution is an internal IT/build-signing question outside this plan's Firebase deployment scope. `[NEEDS OWNER INPUT]` on production Studio distribution process (installer signing, staff rollout) — not blocking Firebase production launch. |

### 3.2 What is explicitly excluded from production

- **Test Data Reset page and `wipeOperationalTestData` callable** — already excluded by two
  independent, code-level gates that do not require any release-time action:
  - Studio UI: `isOperationalWipeUiEnabled()` (`apps/studio/src/renderer/src/features/test-data-reset/utils/operationalWipeUiGate.ts:12`) returns `import.meta.env.DEV && isOperationalWipeAllowedProjectId(...)`. Production Studio builds (`import.meta.env.DEV === false`) never render this UI regardless of which Firebase project they point at.
  - Server: `wipeOperationalTestData` itself refuses non-allowlisted project ids and requires `owner` role (`docs/standards/DEPLOYMENT.md:72`, confirmed by `OPERATIONAL_WIPE_ALLOWED_PROJECT_IDS`).
  - **Decision required:** whether `wipeOperationalTestData` is deployed to the production project at all. Recommendation: **do not deploy it to production** — it has no legitimate production use, and omitting it removes any reliance on the runtime gate. `[NEEDS OWNER INPUT]`.
- **`inventoryCatalogImageStorage` (dev-only diagnostic callable, Goal #12)** — per
  `docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-signoff.md`
  Risks table: "Explicitly excluded from any future production deployment scope unless separately
  reviewed and approved." **This plan does not authorize its production deployment.** Excluded from
  the production Functions allowlist (§3.3).
- **`CatalogImageStorageInventoryPanel.tsx` / `catalogImageStorageInventoryService.ts`** (Studio,
  Goal #12) — inherits the same `isOperationalWipeUiEnabled()` dev-build gate as Test Data Reset
  (state.md 2026-07-30 log entry); excluded from production Studio builds by the same mechanism.
  No separate action required, but production Studio build must be confirmed non-dev
  (`import.meta.env.DEV === false`) — standard Vite production build behavior, not a custom step.
- **GA4 real Measurement ID** — per `docs/workflow/reviews/2026-07-27-portal-google-analytics-signoff-checkpoint.md`,
  analytics code is fully built and inert; enabling it is explicitly deferred to this
  (`production-release`) goal as its own checkpoint (§3.6).
- **`DESIGN_STORAGE_ROOTS.display`** — unused Storage path constant retained only for source/
  deployed-dev-function parity (Goal #12 signoff Risks table); no production Storage object exists
  under it; harmless to ship as an unused constant, or may be removed in a future cleanup pass —
  not a production blocker either way.

### 3.3 Firebase Functions production deployment allowlist

`functions/src/index.ts` exports every Cloud Function in the codebase (confirmed during Goal #12
diff review this pass — the file re-exports all catalog-snapshot, print-request, customer-upload,
assisted-creation, Etsy, email, AI-enrichment, and admin/ops functions). Per `DEPLOYMENT.md`'s
repeated warning ("never bare `--only functions` while the orphan remote function warning
remains"), production deployment must use an **explicit function-name allowlist**, not a bare
`firebase deploy --only functions`.

**Recommended allowlist = all exports in `functions/src/index.ts` EXCEPT:**
- `inventoryCatalogImageStorage` (§3.2 — dev-only diagnostic, not approved for production)
- `wipeOperationalTestData` (§3.2 — pending owner decision; recommend exclude)

`[NEEDS REPO CHECK]` — the exact current full export list from `functions/src/index.ts` must be
re-enumerated at deployment time (not copied from an earlier session's memory) since Functions are
added frequently in this repository. The Implementation phase (not this Plan) should run
`node -e "console.log(Object.keys(require('./functions')))"` (per `DEPLOYMENT.md:171`) against a
fresh build immediately before constructing the production deploy command, and diff it against this
excluded list.

### 3.4 Firestore Rules / Storage Rules / Indexes deployment scope

- `firestore.rules`, `storage.rules`, `firestore.indexes.json` are project-agnostic files — the
  same files deployed to `fresh-prints-dev` today are the ones that would deploy to production.
  No production-specific rules variant exists or is needed.
- **Recommendation:** deploy all three to the production project in full, exactly as currently
  committed, immediately after project creation and before any Functions or App Hosting deploy —
  mirroring the dev-project bring-up order implied throughout `DEPLOYMENT.md`.
- `[NEEDS REPO CHECK]` — confirm `firestore.indexes.json` has no environment-specific composite
  index that only makes sense for dev-seeded data volumes; a full read of the 1,177-line file was
  out of scope for this Plan pass and should occur immediately before the indexes deploy step.

### 3.5 App Hosting / Portal production deployment scope

- Backend id `fresh-prints-portal`, root dir `apps/portal` (`firebase.json`).
- Production Portal env vars required on App Hosting (per `apps/portal/.env.example` and
  `DEPLOYMENT.md`):
  - `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`,
    `_MESSAGING_SENDER_ID`, `_APP_ID`, `_VAPID_KEY` — all sourced from the **new production**
    Firebase project's config once it exists. `[NEEDS OWNER INPUT]` (project does not exist yet).
  - `NEXT_PUBLIC_PORTAL_ORIGIN=https://myprintrequest.com` — required explicitly per
    `DEPLOYMENT.md:193` and `BACKEND.md:307` (non-dev project id alone is not guaranteed to
    resolve correctly per the documented fallback chain; setting it explicitly is the documented
    recommended path).
  - `NEXT_PUBLIC_GA_MEASUREMENT_ID` — **only** after the GA4 checkpoint (§3.6) is separately
    approved; must remain unset until then.
- `apphosting.yaml` currently has no `env:` block — Firebase App Hosting env vars for a new backend
  are typically set via `firebase apphosting:secrets:set` / Console, not committed to
  `apphosting.yaml` (which holds only non-secret run config here). `[NEEDS REPO CHECK]` — confirm
  App Hosting env-var configuration mechanism for this Firebase CLI/project version before
  Implementation; do not invent an `apphosting.yaml` env schema not already validated for this
  project.

### 3.6 GA4 production configuration and verification checkpoint

Per the `portal-google-analytics` signoff checkpoint, this goal is where GA4 goes live. Required,
in order, all requiring explicit owner approval before proceeding to the next:

1. Owner creates the real GA4 property (external Google Analytics console action — not a repo
   action).
2. Owner disables GA4 Enhanced Measurement at the property level (per the Amendment 3 architecture
   decision — the Portal controller assumes Enhanced Measurement is off; leaving it on would
   double-count page views).
3. Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` on the production App Hosting backend only (never on dev).
4. Live DebugView verification of the Section 6c.4 "hard PASS/BLOCKED" privacy gate — this
   requires the real property and cannot be simulated; this is the actual go/no-go checkpoint for
   analytics collection.
5. Privacy Policy / consent determination — explicitly still undecided per the signoff checkpoint's
   "What is explicitly NOT included" list. `[NEEDS OWNER INPUT]`.

**If any of 1–4 fail or are deferred, Portal still ships with analytics fully inert** (the existing
fail-closed config resolver in `apps/portal/features/analytics/services/portalAnalyticsConfig.ts`
requires both a non-empty Measurement ID and a production-host match) — GA4 is not a hard blocker
for the rest of production-release, but should be sequenced deliberately since Enhanced Measurement
must be disabled *before* first real traffic to avoid a permanent double-count contamination of
early production analytics history.

### 3.7 Environment variable and Secret Manager inventory

**Firebase Secret Manager secrets referenced in code** (names only, per `BACKEND.md` and
`DEPLOYMENT.md`):

| Secret | Used by | Production action needed |
|---|---|---|
| `GEMINI_API_KEY` | AI enrichment Functions | Set on production project before deploying any AI-enrichment function |
| `RESEND_API_KEY` | Invitation + proof-notice email | Set on production project |
| `BREVO_API_KEY` | Alternate email provider (selected via `settings/emailProviders`) | Set on production project only if Brevo is the selected provider; otherwise optional |
| `ETSY_X_API_KEY` | `searchEtsyRecommendations`, `staffSearchEtsyRecommendationApiResults` | Set on production project |

**Firebase Functions parameterized config (non-secret):**

| Param | Production value |
|---|---|
| `INVITATION_FROM_EMAIL` | `Fresh Prints <noreply@myprintrequest.com>` (per ADR-FP-111; verify no stale `.env.<prod-project-id>` override exists once that file is created) |
| `PROOF_NOTICE_FROM_EMAIL` | Same |

**Sender domain verification:** `myprintrequest.com` (or `noreply@myprintrequest.com`) must be
verified in Resend and/or Brevo **before** first live send — explicitly flagged in
`DEPLOYMENT.md:302-303`. `[NEEDS OWNER INPUT]` — confirm current verification status; this repo
cannot observe external provider dashboards.

**`PORTAL_BASE_URL`:** must **not** be set on the production project — accepted only as a
localhost Functions-emulator override (`BACKEND.md:293`, `functions/.env.fresh-prints-dev:8`).
Production continue-URLs resolve from the hardcoded project-id map
(`fresh-prints-dev` → `.dev`, production project → `.com`); that map's production branch
`[NEEDS REPO CHECK]` — must be re-confirmed against the actual production project id once assigned,
since the current map is keyed by project id string and a not-yet-created production project has no
confirmed id yet.

### 3.8 Production domains and authorized domains

- Intended production customer host: `myprintrequest.com` (+ optional `www.`) — referenced
  consistently across SEO, OG, GA4, and email code as the fail-closed/production gate value.
- Firebase Authentication **Authorized domains** must include `myprintrequest.com` (and `www.` if
  used) before Portal auth (email/password, Google) will function on that host
  (`BACKEND.md:296-297`).
- Custom domain connection (DNS, App Hosting custom domain binding, SSL) is a Firebase
  Console/DNS-provider action outside repo scope. `[NEEDS OWNER INPUT]` — DNS registrar access and
  final domain decision (apex `myprintrequest.com` vs `www` canonical) rest with the owner.

### 3.9 Password-reset / action URL configuration

- Firebase Auth email action (password reset, email verification) continue URLs resolve through
  the same project-id → host map described in §3.7, terminating at `…/login`
  (`BACKEND.md:289-297`). No separate Firebase Console template configuration is documented as
  required beyond ensuring Authorized domains (§3.8) are correct — Firebase's default action-email
  templates are used. `[NEEDS REPO CHECK]` — confirm no custom Firebase Auth email template
  exists in Console for the dev project that would need replicating; this cannot be verified from
  repo source alone.

### 3.10 SEO readiness and generated-catalog discoverability

Per `docs/workflow/reviews/2026-07-22-portal-seo-foundations-signoff.md` (status
`approved_with_notes`) and its 2026-07-23 reaffirmation:

- `robots.ts` / `sitemap.ts` fail-closed logic is host-string-gated to `myprintrequest.com` already
  — **no code change needed**, only correct `NEXT_PUBLIC_PORTAL_ORIGIN` / actual request host at
  runtime.
- Indexing gate: `isPortalSearchIndexingEnabled()` — confirmed still present
  (`apps/portal/features/brand/portalSearchIndexing.ts`), only true for `myprintrequest.com`.
- **Deferred to this goal, per that signoff's own "Deferred Items":** Google Search Console
  registration/verification for the production domain — an external Google-console action, not a
  repo action. `[NEEDS OWNER INPUT]`.
- Sitemap dynamic ready-design URLs require Admin SDK credentials to resolve at request time
  (`sitemap.ts` falls back to static-only URLs without them per the signoff) — production App
  Hosting must have working Admin SDK credentials (standard for App Hosting backends bound to their
  own project; no custom credential wiring identified in repo).
- Structured data / canonical URLs: `/share/design/{id}` SSR landing already emits `generateMetadata`
  with canonical absolute URLs per the signoff; no additional work identified.

### 3.11 Branch and release strategy

- Current branch: `master` (confirmed via git status at session start). Recent commits merge
  directly to `master` (e.g. `02519a5`, `846dc07`, `63140a5`, `e048c29`, `679189e` — no visible
  release-branch or tag convention in recent history).
- **No release-branch, tagging, or CI/CD pipeline convention exists in this repository today.**
  `docs/standards/TESTING.md` CI Expectations section is explicitly `[TBD — document when CI is
  configured]`. There is no `.github/workflows/` deployment automation referenced anywhere in the
  docs read this pass.
- **This plan does not invent a branch strategy.** Recommendation for owner decision: continue the
  existing pattern (direct-to-`master`, manual `firebase deploy` commands run by a human after
  explicit approval) for the initial production launch, since introducing CI/CD is a separate,
  larger initiative outside this goal's scope. `[NEEDS OWNER INPUT]` — confirm this is acceptable
  for a first production launch, or whether a release-branch/tag convention should be introduced
  first (which would itself need its own Plan).

### 3.12 Production data migration determination

- **No data migration is required or proposed.** The production Firebase project does not yet
  exist; there is no existing production data to migrate *from*, and Goal #12 confirmed no pending
  migration/backfill exists in the codebase (signoff artifact, "Confirmed Unchanged Behavior").
  Production launch is a **cold start** — Firestore, Storage, and Auth begin empty in the new
  project.
- `[NEEDS OWNER INPUT]` — confirm no seed/reference data (e.g. initial `settings/*` documents,
  initial categories/tags) needs to be manually created in production before the Portal becomes
  usable. Several Settings-backed features have code-default fallbacks when their Firestore doc is
  missing (e.g. `portalHelp`, `printRequestLimits`, `customerUploadQuotas`, `emailProviders`), so a
  fully cold start is technically survivable, but the owner may prefer to pre-configure these via
  Studio Settings immediately after first deploy rather than rely on defaults indefinitely.

### 3.13 Test Data exclusion verification

Covered in full in §3.2. Restated as an explicit release-checklist item: confirm the production
Studio distributable is a **release build** (`import.meta.env.DEV === false`), which is the
existing, code-level, non-optional guarantee — no additional flag or configuration step exists or
is needed beyond building Studio in production mode via the standard `npm run build:studio` path.

### 3.14 Dependency-closure and uncommitted-work audit

`[NEEDS REPO CHECK — Implementation phase]` — at the moment production deployment actually begins
(not during this Plan/Review pass), re-run:
- `git status` (working tree must be clean or all changes must be an explicitly reviewed,
  intentional part of the release)
- Confirm `package-lock.json` / `functions/package-lock.json` are committed and in sync with their
  `package.json` (no phantom dependency drift between dev-tested code and what a fresh
  `npm ci` would install in production).

This audit was **not** performed as part of this Plan pass since it must reflect working-tree state
at actual deploy time, not at Plan-writing time — running it now would give a false sense of
currency that could be stale by the time implementation begins.

### 3.15 Clean build and lint requirements

Restating `docs/standards/TESTING.md` "Required Checks Before Signoff" table as the mandatory
pre-deploy gate for this goal specifically:

| Check | Command |
|---|---|
| Lint | `npm run lint` |
| Studio typecheck | `npx tsc --noEmit` (from `apps/studio/`) |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` |
| Functions build | `npm --prefix functions run build` |
| Portal build | `npm run build:portal` |
| Studio installer (if producing a production Studio build this pass) | `npm run build:studio` |

All must exit 0 immediately before any production deploy command runs, on the exact commit being
deployed — not a cached/stale result from an earlier session.

### 3.16 Production smoke-test checklist (post-deploy, pre-announcement)

> **Superseded for remaining work by §7 (2026-07-31 domain-last sequencing amendment).**
> Keep this historical checklist for provenance. New work must classify each check as
> **domain-independent** (run on the production hosted App Hosting URL) or **domain-dependent**
> (deferred until after `APPROVE MYPRINTREQUEST.COM CUTOVER`). Do not treat a hosted.app pass as a
> canonical-domain pass.

Not exhaustive rules-unit-testing (no `@firebase/rules-unit-testing` production run is proposed —
rules are identical to already-tested dev rules); this is a live-traffic sanity pass:

1. Firestore Rules deployed — confirm via Console last-published timestamp (repo cannot self-verify
   deploy status, per `DEPLOYMENT.md:156`).
2. Storage Rules deployed — same Console verification.
3. Guest catalog browse on `https://myprintrequest.com/` loads ready designs (public read rules
   working).
4. Customer registration + email/password login succeeds (Authorized domains correctly configured).
5. `robots.txt` on the production host returns the **allow** variant (not fail-closed `Disallow: /`)
   — confirms `NEXT_PUBLIC_PORTAL_ORIGIN`/host resolution is correct in production, not accidentally
   still matching the fail-closed default.
6. `/sitemap.xml` returns ready designs (confirms Admin SDK credentials work in the deployed App
   Hosting backend).
7. One real Print Request created end-to-end (Portal create → Studio visible) to confirm
   Firestore/Functions/Rules are all correctly wired together in the new project.
8. One real customer upload (small test image) to confirm Storage Rules + `finalizeCustomerUpload`
   work end-to-end.
9. One transactional email (e.g. registration or invitation) actually delivers, confirming Resend/
   Brevo sender verification (§3.7) is genuinely live, not just configured.
10. `/share/design/{id}` for one real ready design renders correct OG tags (Facebook Debugger
    "Fetch new information") — confirms `getPortalOgShareImage` and canonical URL resolution work
    against the production host.

### 3.17 Rollback strategy

| Component | Rollback mechanism |
|---|---|
| Portal (App Hosting) | App Hosting keeps prior rollout revisions; roll back via Firebase Console/CLI to the previous successful rollout. `[NEEDS REPO CHECK]` — confirm exact CLI rollback command for the installed Firebase CLI version at implementation time; not fabricated here. |
| Functions | Redeploy the previous Git commit's `functions/` build with the same explicit allowlist (§3.3). Cloud Functions does not have a one-command "previous revision" rollback exposed via `firebase deploy`; the documented pattern elsewhere in this repo (`DEPLOYMENT.md` Wave C rollback section) is "revert the consuming app/Functions revision" — i.e., redeploy from the prior commit. |
| Firestore Rules | Redeploy the prior commit's `firestore.rules` via `firebase deploy --only firestore:rules`. Firebase also retains rules version history in Console (manual revert option). |
| Storage Rules | Same pattern as Firestore Rules, via `firebase deploy --only storage`. |
| Firestore Indexes | Index removal/rollback requires deleting the specific composite index via Console/CLI; not a single blanket command. Index changes are additive-safe in general (existing queries keep working) so rollback urgency is low. |
| Configuration (env vars / secrets) | Revert the specific App Hosting env var or Secret Manager version via Console/CLI; Secret Manager retains prior secret versions by default. |
| GA4 | Unset `NEXT_PUBLIC_GA_MEASUREMENT_ID` on App Hosting and redeploy Portal — analytics code is fail-closed by design and returns to fully inert immediately. |

No database rollback is proposed since §3.12 establishes this is a cold-start launch with no
pre-existing production data at risk.

### 3.18 Human checkpoints (explicit, in sequence)

1. **Approve this Plan and Formal Review** (this checkpoint).
2. **Production Firebase project creation** — external Google Cloud/Firebase Console action;
   owner must create the project and provide its project id before any further step.
3. **Firestore Rules + Storage Rules + Indexes deploy** to the new production project — human
   approval required per `BACKEND.md:352` ("Human approval required for production rule changes").
4. **Secret Manager population** (§3.7) — human approval required per repo-wide secrets policy.
5. **Functions deploy** (explicit allowlist, §3.3) — human approval required.
6. **App Hosting env var configuration + Portal deploy** — human approval required.
7. ~~**Custom domain + Authorized domains configuration** before smoke testing~~ — **SUPERSEDED
   2026-07-31** by §7. Custom domain is now the **final** production setup action, only after
   domain-independent setup + smoke + readiness gate. Approval phrase:
   `APPROVE MYPRINTREQUEST.COM CUTOVER`.
8. ~~**Production smoke test** as a single pre-domain block~~ — **SUPERSEDED 2026-07-31** by §7
   Stages 2 and 4 (domain-independent vs domain-dependent).
9. **GA4 go-live checkpoint** (§3.6) — separate, explicit human approval, sequenced **after**
   Portal is otherwise confirmed stable on the canonical domain (still after domain cutover +
   domain-dependent smoke).
10. **Public announcement / soft-launch** — entirely an owner business decision
    (`[NEEDS OWNER INPUT]`).

Every one of these remains **unauthorized by this Plan/Formal Review pass** unless a later
owner approval phrase is recorded. The 2026-07-31 sequencing amendment authorizes **documentation
only**.

### 3.19 Post-launch monitoring checklist

- Firebase Console → Functions: error rate / execution count for first 24–48h.
- Firebase Console → Firestore: read/write volume sanity check against expected early-launch
  traffic (catches an unexpected rules misconfiguration causing runaway reads).
- Resend/Brevo dashboard: delivery/bounce rate for first transactional emails.
- GA4 DebugView / Realtime (once §3.6 is complete): confirm real page views arriving, confirm no
  double-counting (Enhanced Measurement correctly disabled).
- Sentry/error-tracking: `[NEEDS REPO CHECK]` — no error-tracking/monitoring service (Sentry, etc.)
  was identified in dependencies read this pass; if none exists, Firebase Console + Functions logs
  are the only monitoring surface, which is a real production-readiness gap worth the owner's
  explicit acknowledgment. `[NEEDS OWNER INPUT]`.

---

## 4. Explicit Non-Goals of This Plan

- Does not create the production Firebase project.
- Does not deploy anything anywhere.
- Does not set any secret, env var, or domain configuration.
- Does not decide the GA4 Privacy Policy / consent question.
- Does not decide production Studio distribution/signing process.
- Does not introduce a CI/CD pipeline or branch strategy not already present in the repo.
- Does not modify `firestore.rules`, `storage.rules`, `firestore.indexes.json`, or any Functions
  source in this pass.

---

## 5. Open `[NEEDS OWNER INPUT]` Items (consolidated)

1. Production Studio distribution/signing process (§3.1).
2. Whether `wipeOperationalTestData` is deployed to production at all (§3.2 — recommend no).
3. App Hosting env-var mechanism confirmation before Implementation (§3.5 — repo-check, but flagging owner awareness).
4. Confirm Resend/Brevo sender-domain verification status for `myprintrequest.com` (§3.7).
5. Final domain decision (apex vs `www` canonical) and DNS registrar access (§3.8).
6. Confirm no custom Firebase Auth email template exists that needs replicating (§3.9).
7. Google Search Console registration for the production domain (§3.10).
8. Branch/release strategy for this and future launches — continue direct-to-`master` manual
   deploys, or introduce a release-branch convention first (§3.11).
9. Whether to pre-seed any `settings/*` documents before first real traffic, or rely on code
   defaults (§3.12).
10. GA4 Privacy Policy / consent determination (§3.6 item 5).
11. Whether error-tracking/monitoring beyond Firebase Console is desired before or shortly after
    launch (§3.19).
12. Soft-launch vs immediate public announcement (§3.18 item 10).

---

## 6. Open `[NEEDS REPO CHECK]` Items (to resolve immediately before Implementation, not now)

1. Exact current `functions/src/index.ts` export list (§3.3) — must be re-enumerated fresh at
   deploy time.
2. Full read of `firestore.indexes.json` (1,177 lines) for any dev-volume-specific index (§3.4).
3. App Hosting env-var configuration mechanism for the installed Firebase CLI version (§3.5).
4. Production branch of the project-id → host map in the email/Portal-URL resolver, once the actual
   production project id is known (§3.7).
5. Exact Firebase CLI rollback command for App Hosting at implementation time (§3.17).
6. Whether any error-tracking dependency exists that was missed in this pass's dependency scan
   (§3.19).
7. Working-tree/dependency-closure audit (§3.14) — deliberately deferred to deploy time.

---

## 7. Amendment (2026-07-31): Domain-last production sequencing

### 7.1 Owner decision (authoritative)

The owner does **not** want `myprintrequest.com` pointed at App Hosting yet.

The existing Coming Soon page must remain live until every production setup and verification that
can be completed **without** the custom domain is finished.

Connecting `myprintrequest.com` is the **final launch switch** before domain-dependent smoke
testing.

This decision **supersedes** any earlier Plan/DEPLOYMENT wording that implied the custom domain
should be connected before completing available production readiness checks.

### 7.2 Why production already works on hosted.app

- Production Portal is live at
  `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app`.
- Production Storage CORS and empty-catalog Discover are owner-tested **PASS**.
- `storage.cors.production.json` documents the live bucket CORS; Git does not control the already
  applied bucket config.
- Apex `myprintrequest.com` still serves Coming Soon and must remain unchanged until Stage 4.

### 7.3 Previous remaining order (superseded)

From `DEPLOYMENT.md` / original §3.18 remaining intent:

1. Initial settings / reference data (categories, email providers, catalog bootstrap)
2. **Domain + Authorized Domains**
3. **Smoke tests (mixed / mostly written against the canonical domain)**
4. GA4 / Search Console (later)

### 7.4 Revised remaining order (required)

| Stage | Name | Domain change? |
|-------|------|----------------|
| **1** | Complete production setup **without** changing the public domain | No |
| **2** | Domain-independent production smoke tests on hosted.app | No |
| **3** | Final pre-domain readiness gate (`APPROVE MYPRINTREQUEST.COM CUTOVER`) | No |
| **4** | Domain cutover + domain-dependent smoke tests | Yes — only after exact approval |
| Later | GA4 go-live; Search Console | Separate checkpoints after Stage 4 |

### 7.5 Stage 1 — Domain-independent production setup

Complete or verify (no DNS / App Hosting custom-domain / Authorized Domains changes):

- [ ] Studio `settings/emailProviders`: invitation **Resend**, proof-notice **Brevo**
- [ ] Production owner account + role verification
- [ ] 18 active categories; 1,122 approved tags
- [ ] Valid catalog-reference + portal-catalog manifests; Studio + Portal generated catalog usable
- [ ] Minimum production catalog / workflow data approved for testing (as needed)
- [ ] One upcoming production show for workflow testing
- [ ] Minimum test customer data required for smoke testing
- [ ] Rules, indexes, Functions, secrets, Storage, App Hosting configuration verification
- [ ] Resend + Brevo sender-domain verification status (dashboard; no live customer email required)
- [ ] Gemini + Etsy API availability verification
- [ ] Production App Hosting build/config verification (hosted.app stable)
- [ ] Production Storage CORS verification (hosted.app Origin)
- [ ] Rollback instructions + current Coming Soon DNS/configuration **recorded** (not changed)

### 7.6 Stage 2 — Domain-independent smoke tests

Run on `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` (and production
Studio). Classify each item: **runnable now** / **domain-dependent deferred** / **blocked**.

Domain-independent examples (run when fixtures exist; do not fake a canonical-domain pass):

- Portal loads from hosted.app; project is `fresh-prints-prod`; no `fresh-prints-dev` UI/leaks
- Studio production sign-in/permissions; workspaces load; no Test Data Reset in production build
- Catalog browse / Discover; empty or populated catalog behavior
- Catalog import / AI enrichment / review / ready-state (when approved test data exists)
- Upcoming show create/manage; print-request create/edit where hosted-domain auth supports it
- 200 effective-DPI save blocking; request qty limit 25; show qty limit 25
- Customer upload + Donate Design processing; transparency/format validation; Studio intake
- Add to Show / Show Queue; Start / Pause / Resume / Finish production
- Storage asset access; CORS from hosted.app Origin
- Resend/Brevo **configuration presence** without requiring canonical-domain email links
- Gemini / Etsy callable behavior
- No unexpected Firestore fallback or production errors

**Deferred as domain-dependent (Stage 4):** apex/www HTTPS/redirects; Auth on canonical host;
Google sign-in on canonical host; invitation/proof-notice **links** using
`https://myprintrequest.com`; `robots.txt`/`sitemap.xml`/`share` canonical checks against apex;
no Coming Soon on apex; no hosted.app leaks in user-facing canonical links.

### 7.7 Stage 3 — Final pre-domain readiness gate

Documented owner checkpoint before any DNS change. Required proof:

- [ ] All domain-independent smoke tests passed or have explicitly accepted notes
- [ ] No unresolved production blockers
- [ ] Hosted Portal URL stable; Studio stable
- [ ] Production data needed for final smoke exists
- [ ] Email providers selected; sender domains verified
- [ ] Production Storage CORS correct
- [ ] Exact Firebase App Hosting custom-domain DNS records known
- [ ] Current Cloudflare Coming Soon DNS configuration recorded
- [ ] Rollback path to restore Coming Soon documented
- [ ] Firebase Auth Authorized Domains steps prepared (not applied)
- [ ] Google sign-in configuration steps prepared (not applied)
- [ ] Domain-dependent smoke checklist prepared
- [ ] Owner explicitly approves cutover

**Required approval phrase:** `APPROVE MYPRINTREQUEST.COM CUTOVER`

Forbidden before that phrase: DNS, App Hosting custom domains, Cloudflare changes, Firebase
Authorized Domains, Google OAuth configuration changes.

### 7.8 Stage 4 — Domain cutover + domain-dependent smoke

Only after `APPROVE MYPRINTREQUEST.COM CUTOVER`:

1. Connect `myprintrequest.com` to `fresh-prints-portal` App Hosting backend
2. Configure approved `www.myprintrequest.com` redirect behavior
3. Replace Coming Soon DNS **only** with exact Firebase-provided records
4. Wait for domain verification + SSL readiness
5. Add `myprintrequest.com` to Firebase Auth Authorized Domains
6. Add `www.myprintrequest.com` only if connected/used in the approved redirect
7. Verify Google sign-in for the canonical domain
8. Verify Storage CORS from apex (and www if it serves the app)
9. Run domain-dependent smoke immediately

Domain-dependent smoke must include: apex loads production Portal; valid HTTPS; HTTP→HTTPS;
approved www redirect; no loop; canonical host correct; registration/login/logout/session on
canonical domain; Google sign-in on canonical domain; Resend invitation delivered + opens
canonical Portal; Brevo proof-notice delivered; all email links use
`https://myprintrequest.com`; password-reset/Auth links correct where applicable; production
`robots.txt` allow variant; `/sitemap.xml` correct; `/share/design/{id}` metadata from canonical
domain; Storage assets without CORS errors from apex (and www if applicable); print-request +
customer upload on canonical domain; no hosted.app leaks where canonical URL is required; no
Coming Soon on apex; no development project identifiers.

### 7.9 Rollback (before Stage 4 DNS change)

Record the exact Cloudflare Coming Soon DNS records before cutover. If cutover fails, restore
those records and Coming Soon configuration rather than improvising. Do not leave the apex on a
broken App Hosting binding.

### 7.10 Immediate next production task (after this amendment is reviewed)

**Stage 1 remaining domain-independent setup**, starting with Studio
`settings/emailProviders` (`inviteProvider: resend`, `proofNoticeProvider: brevo`) if not already
set, then remaining Stage 1 fixtures (show + minimum test catalog/customer data as needed), then
Stage 2 hosted.app smoke.

**Do not connect `myprintrequest.com`.**
