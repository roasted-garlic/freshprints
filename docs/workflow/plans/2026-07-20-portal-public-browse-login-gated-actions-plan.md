# Plan: Portal public browse + login-gated actions (#13)

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Author | Planning Agent |
| Status | approved_with_changes |
| Workflow | managed-phase |
| Related | ROADMAP Small Managed Item **#13**; `docs/workflow/reviews/2026-07-20-portal-public-browse-login-gated-actions-review.md` |

---

## Goal

Anyone can **view** Fresh Prints Portal catalog content (home discovery, design library, design detail / deep-link modal, share landing → catalog) without signing in. **Login (or register / complete-profile) is required for any mutating or account action** — add to request, favorites, uploads, donate writes, show queue selection, custom/assisted requests, account settings, notifications that require identity, etc. Guests see viewable content; CTAs that need auth prompt login/register with safe `returnTo`.

This is a product shift from today’s AuthGate-everything `(app)` layout.

---

## Background

- ROADMAP Small Managed **#13** (owner elevated ahead of default **#12**).
- Related: #11 OG / social sharing — crawlers already hit public `/share/design/[id]` (Admin SDK meta). Humans following share links currently bounce to `/login` via AuthGate after client redirect to `/catalog?designId=…`. Public browse makes that human path work.
- Current Firestore/Storage already allow **authenticated customers** to read `status == "ready"` designs and derivatives; guests cannot. Portal `AuthGate` wraps all `(app)` routes and redirects unauthenticated users to login.
- SECURITY.md Phase 8+ already anticipated Portal read of approved catalog metadata only; docs still say “not implemented in Phase 2A” in places and still describe customers as having no catalog read in older Desktop sections — this phase must update the living security narrative.

---

## Scope

### In Scope

1. **Portal AuthGate / routing**
   - Redesign so public browse routes render under app shell **without** forcing login.
   - Keep auth redirects for account / mutation-primary routes (or equivalent hard gate).
   - Preserve profile-completion redirect for signed-in incomplete customers.
   - Preserve existing `returnTo` validation (`portalReturnUrl.ts`).

2. **Public vs gated surface matrix** (product defaults — see Open Questions for non-blocking assumptions)

   | Surface | Guest | Notes |
   |---------|-------|-------|
   | `/`, `/catalog`, `/catalog/library`, `?designId=` deep link | **View** | Primary public browse |
   | `/share/design/[id]` | **View** (already) | Keep; client redirect to catalog deep link should work for guests after rules |
   | Add to request / heart / queue / start request CTAs | **Login CTA** | Same `returnTo` pattern |
   | `/favorites` (Liked), `/requests/**`, `/donate`, `/custom-designs/**`, `/account/**`, `/dashboard` if still used as private home | **Auth required** | Hard gate via AuthGate or route-level gate |
   | Upload / donate **writes**, print-request callables, favorites writes | **Auth required** | Already enforced server-side; UI must not imply guest success |

3. **Firestore rules** — public **read** only for catalog browse sets:
   - `designs/{id}` where `resource.data.status == "ready"`
   - `categories/{id}` where `resource.data.isActive == true`
   - `tags/{id}` where `resource.data.status == "approved"`
   - No new public writes anywhere.
   - Staff rules unchanged; customer read may remain as today or collapse into shared “catalog-public-read” helpers.

4. **Storage rules** — public **read** of `/thumbnails/{file}` and `/previews/{file}` only when the matching design is `ready` (same derivative naming checks as today). `/originals/` stays staff-only. Customer-upload paths stay customer/staff only.

5. **UI / UX**
   - Guest-safe shell: providers must no-op when signed out (Favorites already clears; PrintRequest / Notifications must not error-spam).
   - Header / nav: Sign in / Register for guests; Account stays auth-gated destination.
   - Action buttons: Login CTA (modal or navigate to `/login?returnTo=…`) instead of silent failure.
   - Catalog browse works without Firebase Auth session.

6. **Docs** — SECURITY.md, ARCHITECTURE/BACKEND notes as needed, DECISIONS ADR if product/security posture is architectural, ROADMAP #13 status, TESTING notes if rules test approach is documented.

7. **Test strategy** — typecheck, focused unit tests, rules verification approach, manual guest browse QA (see below).

### Out of Scope

- **#12** library design share on custom requests (stays **Queued**).
- Production Firebase project rules deploy / production Portal App Hosting release (human approval later).
- Field-level Firestore redaction / separate public catalog projection collection (mitigation note only).
- App Check, CDN caching of catalog, rate-limit infrastructure.
- Making Studio guest-accessible.
- Changing callable auth requirements (they already require auth) except verifying none accidentally become public.
- Anonymous Firebase Auth / guest customer records for browse.
- Changing OG/share Admin SDK path (#11 complete).
- Facebook/CF bot 403 fixes (separate findings doc).

---

## Affected Areas

### Files / Modules (expected)

**Portal**
- `apps/portal/features/auth/components/AuthGate.tsx` — split public vs protected behavior
- `apps/portal/app/(app)/layout.tsx` — may keep shell always; gate selectively
- Possibly route group split: `(public)` vs `(authenticated)` **or** pathname allowlist inside AuthGate (prefer minimal structural change)
- `apps/portal/features/auth/utils/portalReturnUrl.ts` — reuse; extend if register CTA needs same helper
- Catalog action components / hooks (add-to-request, favorite toggle, upload entry points)
- `PortalAppShell` / header / bottom nav — guest chrome
- Providers that assume auth under shell (`PortalPrintRequestProvider`, `PortalNotificationsProvider`, favorites)

**Rules**
- `firestore.rules` — `isCustomerReadableDesign` / Category / Tag → public catalog read helpers
- `storage.rules` — `isReadyDesignDerivative` without requiring `isCustomer()`

**Docs**
- `docs/standards/SECURITY.md`
- `docs/architecture/BACKEND.md` (Storage public vs private row)
- `docs/project/DECISIONS.md` (short ADR)
- `docs/project/ROADMAP.md` (#13)
- Optionally `docs/standards/TESTING.md` if rules verification commands are added

**Tests**
- Portal unit tests for AuthGate / return URL / route classification
- Shared or rules-alignment string tests if that pattern is used (see existing quota alignment tests)
- Manual guest QA checklist

### Architecture Impact

- [x] Details:
  - Portal remains customer-facing web app; Studio unchanged.
  - Layering: UI gates for UX; **Firestore/Storage rules + callables remain the security boundary**.
  - Prefer: allowlist of **public path prefixes** + soft action gates, rather than duplicating catalog into a new public API.
  - AuthProvider stays mounted for all routes (already in `providers.tsx`) so guests can transition to login without remount churn where possible.

### Security Impact

- [x] Details: **High** — expands who can read ready catalog docs and derivative images.

**What becomes public**
- Full Firestore documents for `ready` designs (same document-level exposure authenticated customers already have today), including fields Portal UI does not display (`originalPath`, staff UIDs, AI review metadata, etc.). Storage **bytes** for originals remain staff-only.
- Active categories and approved tags metadata.
- Thumbnail/preview WebP files for ready designs.

**What must stay private**
- All writes; originals; non-ready designs; inactive categories; non-approved tags; customers, print requests, favorites, uploads, notifications, settings (except any already-public-by-Admin share path), staff collections.

**Mandatory rules**
- Public read predicates must be resource-data constrained (`status == "ready"`, etc.) so list queries cannot leak other statuses.
- No `allow read: if true` on broad collections.
- Verify callables still throw `unauthenticated` / `permission-denied` for guests.
- **Deploy gates:** rules to `fresh-prints-dev` only after review + human approval for shared-project deploy; production rules deploy is a separate human checkpoint.

**Document-level exposure acceptance**
- Accept same field surface as current customer read for ready designs. Field-level public projection is explicitly out of scope; note residual risk in Risks.

### Data Model Impact

- [x] Details: No schema / status / entity changes. Permission narrative only: unauthenticated may **read** catalog-ready subset.

### Backend Impact

- [x] Details:
  - Firestore + Storage security rules changes (deployed via Firebase CLI / existing process).
  - No new env vars or Functions required for browse.
  - Callables unchanged; confirm no accidental public callable.
  - Share meta Admin SDK path unchanged.

### UI / UX Impact

- [x] Details:
  - Guests see catalog home + library + design modal without login interstitial.
  - Mutation CTAs → login/register with `returnTo` back to design/action context.
  - Auth-primary pages redirect guests to login (same AuthGate messaging pattern, scoped).
  - Manual UI checkpoint required (guest + authenticated regression).

### Migration Impact

- [x] Forward steps:
  1. Land Portal code that tolerates guest browse **after** or **with** rules that allow public catalog read (order: prefer rules-first on **dev** so UI does not fail permission-denied, or ship UI that handles denial gracefully until rules deploy — implementer chooses; document in test report).
  2. Deploy Firestore + Storage rules to **fresh-prints-dev** with human approval.
  3. Soft-reload Portal; manual guest QA.
  4. Production rules + Portal deploy only on explicit later approval.

- [x] Rollback / compatibility:
  - Revert rules to previous `isCustomer()`-gated helpers → guests lose browse again (Portal AuthGate can be reverted in same release).
  - No data migration; no backfill.
  - Authenticated customers continue to work under either rules version.

---

## Approach

1. **Classify routes**
   - Implement a single `isPortalPublicBrowsePath(pathname)` (or route-group) used by AuthGate and any chrome that differs for guests.
   - Public: `/`, `/catalog` (+ nested library). Share stays outside `(app)`.
   - Protected: favorites, requests, donate, custom-designs, account, and any other mutation-primary routes under `(app)`.

2. **AuthGate redesign**
   - If public path + unauthenticated: render children (app shell) — do **not** `router.replace('/login')`.
   - If protected path + unauthenticated: keep current redirect + `returnTo`.
   - If authenticated but needs profile completion: keep complete-profile redirect (all app paths).
   - Loading / unavailable account states unchanged.

3. **Guest-safe providers**
   - Audit shell providers: skip Firestore listeners / callables when `!isAuthenticated`.
   - Favorites toggle / add-to-request: early return → navigate to login with `returnTo` (include `designId` when relevant).

4. **Login CTAs**
   - Reuse `buildPortalAuthHref('/login', returnTo)`; add register entry where UX expects.
   - Prefer one small shared helper/component for “Sign in to …” rather than one-off copy per button.

5. **Rules**
   - Introduce helpers e.g. `isPublicCatalogDesign()`, `isPublicCatalogCategory()`, `isPublicCatalogTag()` based on resource fields (no auth required).
   - `allow read: if isStaff() || isPublicCatalogDesign() || isCustomerReadableDesign()` — or fold customer into public helper if equivalent.
   - Storage: `isReadyDesignDerivative` checks design `ready` without `isCustomer()`.
   - Double-check queries: Portal already uses `where('status','==','ready')` — compatible with rules that filter on `resource.data.status`.

6. **Docs + ADR**
   - Update SECURITY.md Portal catalog section; fix outdated “customers have no read” Desktop leftover if it conflicts.
   - ADR: public browse of ready catalog; mutations remain auth-gated.

7. **Do not** expand to #12 or production deploys in this phase.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Unit tests (AuthGate path classify, returnTo, CTA helper if added) | `npx tsx --test apps/portal/**/*.test.ts` (scoped files) | yes |
| Shared/rules alignment tests if added | same monorepo test runner | yes if files added |
| Lint | project lint if touched packages configure it | if applicable |
| Build | Portal build | no (unless implement touches config) |
| Integration / E2E | none dedicated | no |
| Backend/rules | Emulator rules unit tests **if** feasible in-repo; else documented manual rules matrix + string alignment tests | yes — honest: today no `@firebase/rules-unit-testing` suite; plan accepts **documented rules matrix + manual permission probes** on dev after human-approved rules deploy, plus any cheap alignment tests |

### Manual

- [x] Details — Manual Test Checkpoint (guest + signed-in regression):

1. Signed out → open `/catalog` and `/` → designs load with thumbnails; open `?designId=` modal.
2. Signed out → share URL `/share/design/{readyId}` → lands on catalog design without login wall.
3. Signed out → Add to request / Like → login with `returnTo`; after login, return to context (deep link preserved).
4. Signed out → `/requests`, `/favorites`, `/donate`, `/account`, `/custom-designs` → redirected to login.
5. Signed in customer → catalog + add/like/request flows still work.
6. Signed out → cannot read non-ready design by id (permission denied / not found UX).
7. Storage: guest can load ready thumbnail/preview URLs used by Portal; originals still denied.
8. Studio staff catalog unchanged.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (guest browse + CTA flows)
- [ ] Design approval (visual polish optional; functional CTAs required)
- [ ] Business logic decision — **defaults documented in Open Questions; escalate only if owner rejects defaults**
- [x] Production deploy — **out of scope**; separate approval
- [ ] Database migration — N/A
- [ ] Auth / external service setup — N/A (no new providers)
- [x] Secrets / env vars — N/A
- [x] Other: **Human approval before deploying Firestore/Storage rules to any shared Firebase project** (`fresh-prints-dev` during Test; production later)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Public scrapers enumerate ready catalog + derivative images | Medium | Accepted product tradeoff; originals blocked; no public writes |
| Ready design docs expose `originalPath` / AI / staff UIDs to anyone | Medium | Same as current customer document read; UI does not show; originals unreadable; future projection out of scope |
| Rules too broad leak non-ready designs | Critical | Resource predicates + query alignment; manual probes; review Security checklist |
| AuthGate only (client) without matching rules | Critical | Rules are in scope; never ship “public UI” against private rules as the security model |
| Guest shell providers cause permission-denied noise | Medium | No-op when unauthenticated |
| Rules deploy to wrong project / prod accidental | High | Human checkpoint; confirm project id before deploy |
| Scope creep into #12 | Medium | Explicit out of scope; state tracks #13 only |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

1. Redeploy previous `firestore.rules` / `storage.rules` snapshots.
2. Revert Portal AuthGate / CTA changes.
3. Guests again redirected to login; customers unaffected if rules rolled back carefully.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md — only if customer-facing product description needs a sentence
- [x] ARCHITECTURE.md — brief Portal auth boundary note if present section exists
- [ ] DATA_MODEL.md — optional permission note on designs read
- [x] BACKEND.md — Storage “Public vs private” row
- [x] TESTING.md — if documenting rules probe / new test commands
- [ ] DEPLOYMENT.md — note rules deploy human gate if missing
- [ ] STYLE_GUIDE.md — only if new CTA pattern is standardized
- [x] DECISIONS.md — ADR for public browse
- [x] Other: SECURITY.md (primary), ROADMAP.md #13

---

## Open Questions

Defaults below are **planning assumptions** so Review can proceed without blocking. Owner may override before or during Implement.

1. **Donate / Upload pages:** Hard-auth entire route vs allow viewing with disabled form + Login CTA?  
   **Default:** Hard-auth `/donate` and upload-centric request artwork routes (mutation-primary). Catalog remains the public browse surface.

2. **Home `/`:** Fully public (same as catalog discovery)?  
   **Default:** Yes — it is `CatalogHomePageContent`.

3. **Show list visibility:** Guests see upcoming shows?  
   **Default:** No — show selection is an action; leave behind login. No public `shows` Firestore read in this phase.

4. **Favorite/request counts on cards:** Visible to guests?  
   **Default:** Yes (already on ready design docs / catalog mapping).

5. **Register CTA vs Login only on action gates?**  
   **Default:** Login primary; Register link available on login page (existing).

- [x] None blocking if defaults accepted

---

## Approval

- Review doc: `docs/workflow/reviews/2026-07-20-portal-public-browse-login-gated-actions-review.md`
- Verdict: **approved_with_changes** (2026-07-20) — bind Open Question defaults; rules predicate discipline; SECURITY/BACKEND/ADR updates; human approval before any shared-project rules deploy

---

## Addendum A — Owner guest-mode polish + guest donations (2026-07-20)

**Source:** Owner feedback after #13 Implement (screenshots + explicit product requests). Treated as **owner-approved scope expansion** for #13 (not a new roadmap item). Brief re-review: `docs/workflow/reviews/2026-07-20-portal-public-browse-login-gated-actions-addendum-a-review.md`.

### A1–A3 / A5 — UI / AuthGate polish (within original #13 intent)

| # | Change |
|---|--------|
| A1 | **Current Request** chrome (header + bottom-nav FAB) **hidden** unless fully signed-in portal customer (`isAuthenticated`). |
| A2 | Guest header CTA label: **Sign in / Register** (not “Sign in”). |
| A3 | Sidebar footer: **Donate Designs** above a row of **theme toggle \| Sign in / Register** (Sign in / Register styled like Sign out). Remove the separate guest Account/Sign-in row above that row. |
| A5 | Soft-auth / hard-auth destinations guests cannot use stay **inside the app shell** (sidebar visible). Main content shows a **dimmed transparent overlay** with short copy + Sign in / Register / Browse designs. Overlay CTAs go to styled `/login` and `/register`. Public browse (`/`, `/catalog/**`) and guest `/donate` unchanged (no overlay). Bare `/login-required` interstitial remains for bookmarks/deep links only — not the primary nav pattern. |

### A4 — Guest catalog donations (scope expansion; was hard-auth `/donate`)

**Product:** Logged-out users may open `/donate` and complete catalog donations **without** registering. Attribution through the system uses a documented **guest** sentinel (not a Studio staff `customers.isGuest` print-request target).

**Identity model (architecture-aligned — no public unauthenticated writes):**

1. Portal starts a **Firebase Anonymous Auth** session when a guest begins donate upload (UID for Storage path ownership, rate-limit docs, finalize leases).
2. AuthProvider treats anonymous sessions as **`bootstrapStatus: anonymous-guest`**, `isAuthenticated: false` (guest chrome stays; no complete-profile redirect).
3. Callables remain the Firestore write boundary. Donation-purpose callables accept either a full portal customer **or** an anonymous Auth user.
4. Print-request uploads and all other mutation callables stay **portal-customer only**.

**Attribution sentinel (DATA_MODEL):**

| Field | Guest donation value | Notes |
|-------|----------------------|-------|
| `uploaderType` | `'guest'` | New optional field on batch + upload docs |
| `customerId` | `'guest'` | Sentinel string — **not** a `customers/{id}` doc |
| `createdBy` | `'guest'` | Batch audit; not the anon UID |
| `customerUid` | Firebase Auth UID (anonymous) | Technical owner for Storage path `/customer-uploads/{uid}/…`, quotas, leases |

Registered customers keep today’s fields (`uploaderType: 'customer'` or omit for legacy; `createdBy` / `customerId` = real ids).

**Security**

| Layer | Rule |
|-------|------|
| Storage | No `auth == null` writes. Anonymous may create/update `source` (and zip archive if allowed) only under `userId == request.auth.uid`. Prefer **images-only** for guests (block ZIP create) to shrink abuse surface. |
| Firestore | Client create/update/delete of uploads stays **denied**. Anonymous may **read** own `customerUploads` / `customerUploadBatches` where `customerUid == auth.uid` and `uploaderType == 'guest'` (progress listeners). |
| Callables | `unauthenticated` without Auth; anonymous **cannot** use print-request purpose; ownership checks still `customerUid == auth.uid`. |
| Quota | Guest donations use a **stricter** daily finalize-image cap than registered donation (code constant; document in TESTING/SECURITY). Same UID-keyed rate-limit collection. |
| Spam / abuse | Residual: Anonymous Auth can be rotated; App Check not in this addendum (follow-up). Document residual risk. |
| PII | Guests are not prompted for email/name in this addendum; no PII required. Consent checkboxes still required for donate confirm. |

**Deploy (human approval — do not auto-deploy):**

1. Enable **Anonymous** sign-in in Firebase Auth console (dev, then prod later).
2. Deploy updated **Cloud Functions** (create/finalize/confirm/quota/halftone donation paths).
3. Deploy **Storage** + **Firestore** rules (anonymous upload read/write predicates).
4. Portal App Hosting / hosting release as usual after Test.

**Quota story:** Registered donate still uses settings/`donationFinalizeImageLimit` (default 1000). Guests use `CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT_DONATION_GUEST` (default **20**/Central day per anonymous UID). No Current Request room cap (donations never attach to requests).

**Out of addendum A:** Linking anonymous UID → registered account after sign-up; App Check; production rules deploy without approval; #12.

### Addendum A — UX revision (2026-07-20, owner)

Replaces A5 interstitial-as-destination for menu / AuthGate hard redirects:

1. Guests keep the **sidebar (and shell chrome)** at all times when hitting gated nav.
2. Gated routes stay on-path inside `(app)`; **dimmed overlay** on main content blocks interaction and prompts sign-in.
3. Overlay / chrome CTAs → styled **`/login`** and **`/register`** (shared `portal-auth-card` / `portal-login-required-*` visual language with former login-required page).
4. `/login-required` kept for deep links only; AuthGate no longer `replace`s guests there.
