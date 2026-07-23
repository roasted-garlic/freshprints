# Plan: Portal How To / FAQ (text + video FAQs)

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Author | Planning Agent |
| Status | approved_with_changes (review 2026-07-22) |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-22-portal-how-to-faq-review.md |

---

## Goal

Ship a public Fresh Prints Portal **How To / FAQ** page with searchable trust content: **text FAQs** and **video FAQs** (embedded hosts). Page must be SEO-friendly under ADR-FP-116 (indexable on production host only; included in sitemap when indexing is enabled / as a static public URL), discoverable from Portal navigation, and maintainable without a CMS for v1.

---

## Background

Owner pre-production sequence (2026-07-22):

1. `portal-seo-foundations` — **Done** (approved_with_notes)
2. **`portal-how-to-faq`** (this phase)
3. `portal-google-analytics`
4. `production-release`

SEO foundations already provide fail-closed indexing, robots allow lists, and sitemap static entries. FAQ is the next trust/SEO surface after crawl foundations.

---

## Scope

### In Scope

- Public Portal route for How To / FAQ (proposed path: **`/help`** or **`/faq`** — confirm nav label/path with owner; default implement path **`/help`** with page title **How To & FAQ** unless owner picks otherwise)
- Page lives under Portal `(app)` shell (header/sidebar) like other customer pages
- Guest-accessible: add path to `isPortalPublicBrowsePath` (same soft-auth family as `/` and `/catalog`)
- **Text FAQs:** accordion or definition-list pattern; questions + answers from a typed content module
- **Video FAQs:** section of items with title, short description, and **embed URL** (YouTube and/or Vimeo); responsive iframe embeds; no video file upload in this phase
- **SEO:**
  - Route `generateMetadata` / page metadata: title, description, canonical, `robots` gated by `isPortalSearchIndexingEnabled` (ADR-FP-116)
  - Add path to `portalRobotsAllowPaths()` when indexing enabled
  - Add static entry to `app/sitemap.ts` (always list URL like `/catalog`; indexing gate still controls robots)
- **Nav:** secondary entry that fits Portal patterns — prefer **sidebar footer** link near Donate Designs (not primary Browse/Upload/Custom nav), label **[TBD]** default **Help** or **How To**
- **Content model (v1 decision):** typed TypeScript content module under `apps/portal/features/help/` (e.g. `portalHelpContent.ts`) exporting FAQ and video entries. Placeholder copy marked **`[TBD]`** where owner has not supplied final text/URLs. Owner edits by PR / file edit — no CMS, no Firestore content collection in this phase.
- Unit tests for: public-browse path inclusion, robots allow path, sitemap static URL builder if extracted, metadata robots gate for the help route helper
- Docs: brief ROADMAP note; optional short DEPLOYMENT / ARCHITECTURE mention of public `/help` (or chosen path); ADR only if a lasting content-model decision warrants it (prefer short DECISIONS note if review wants one)

### Out of Scope

- Google Analytics / GA4 (`portal-google-analytics`)
- Production Firebase / App Hosting / Search Console cutover (`production-release`)
- Create with AI / Create My Design product work
- Stripe / design-fee billing
- CMS, Studio FAQ editor, Firestore-backed FAQ documents
- Video file upload to Storage / transcoding
- Multi-language i18n
- Full knowledge-base / search engine / chatbot
- Ranking guarantees or paid SEO campaigns
- Changing AuthGate policy beyond adding the FAQ path as public browse

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/app/(app)/help/page.tsx` (or `/faq` — finalize at implement from owner answer; plan default `/help`)
- `apps/portal/features/help/` — content module + presentational components (FAQ list, video embeds)
- `apps/portal/features/auth/utils/portalPublicBrowsePath.ts` (+ tests)
- `apps/portal/features/brand/portalSearchIndexing.ts` (+ tests) — allow path
- `apps/portal/app/sitemap.ts` — static entry
- `apps/portal/features/navigation/components/PortalSidebar.tsx` (footer link) and/or header/footer as needed
- `apps/portal/app/globals.css` — minimal page styles matching Portal patterns
- Docs: `ROADMAP.md`; optionally `ARCHITECTURE.md` / `DEPLOYMENT.md` / `DECISIONS.md`

### Architecture Impact

- [x] Details: Portal-only feature module `features/help/`. UI components render from content module; no direct backend calls. Content is code, not BaaS. Soft-auth public browse path extended.

### Security Impact

- [x] Details: Public read-only page; no new secrets; no PII. Embeds only from allowlisted hosts (YouTube / Vimeo URL patterns validated in content helper — reject arbitrary iframes). Do not load scripts from untrusted origins. CSP: follow existing Portal posture; if embeds require frame-src updates, document in DEPLOYMENT and do not weaken unrelated policies. No new Cloud Functions or rules.

### Data Model Impact

- [x] None (no Firestore / Storage schema)

### Backend Impact

- [x] None required (no new Functions/env). Optional future CMS deferred.

### UI / UX Impact

- [x] Details: New public page + sidebar footer nav link. Accordion FAQs + video section. Manual UI review required for copy, embed layout, mobile. Use existing Portal typography/buttons; avoid card clutter per style guide unless interaction needs a container.

### Migration Impact

- [x] None

---

## Approach

1. **Route + metadata** — Add `/help` page under `(app)`. Server or static metadata with title/description; `robots` index only when `isPortalSearchIndexingEnabled`; canonical absolute URL via `getPortalSiteOrigin`.
2. **Public browse + SEO lists** — Include `/help` (and `/help/**` if needed) in `isPortalPublicBrowsePath`, `portalRobotsAllowPaths`, and sitemap static entries.
3. **Content module** — Define types:
   - `PortalTextFaq { id, question, answerMarkdownOrPlain }`
   - `PortalVideoFaq { id, title, description?, embedUrl, provider: 'youtube' | 'vimeo' }`
   - Export arrays; seed with a few structural placeholders (`[TBD]` questions/answers; empty or sample embed URLs commented / flagged until owner supplies).
4. **URL validation** — Pure helper: accept only known YouTube/Vimeo embed or watch URL shapes; map to safe embed `src`; skip/invalid items never render raw HTML.
5. **UI** — Text FAQ accordion (accessible expand/collapse); video grid/list with title + responsive 16:9 iframe (`title`, `loading="lazy"`, `allow`/`referrerPolicy` sensible defaults). Page intro: brand-aligned H1 + one short supporting sentence.
6. **Nav** — Sidebar footer link above or below Donate (secondary). Default label **Help**; owner may rename to **How To** / **FAQ**.
7. **Tests + docs** — Unit tests for path/robots/sitemap/URL helper; update ROADMAP status; short architecture/deployment note if useful.

### Content model rationale (v1)

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **Typed TS content module** | Simple, reviewable in PR, no schema/rules, works offline | Requires deploy to change copy | **Choose for v1** |
| MDX files | Nice for long prose | Extra toolchain; overkill for short FAQs | Defer |
| Firestore CMS | Owner-editable without deploy | Schema, rules, Studio UI, security review | Out of scope |

Owner-editable path for v1: edit `portalHelpContent.ts` (or split JSON imported by the module) and redeploy Portal App Hosting.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit | `npx tsx --test` on help/public-browse/robots/sitemap-related tests | yes |
| Typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Lint | via Portal build / eslint if touched | yes (as part of build) |
| Build | `npm run build:portal` or workspace build | yes |
| Integration | N/A | no |
| E2E | N/A | no |
| Backend/rules | N/A | no |

### Manual

- [x] Details: Guest + signed-in visit `/help`; accordion + video embeds; nav link; mobile layout; view-source robots/canonical on `.dev` (expect noindex); confirm sitemap includes `/help`.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review
- [ ] Design approval — light (layout follows Portal; copy TBD)
- [x] Business logic decision — FAQ copy, video URLs, nav label/path (open questions; implement may ship placeholders)
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [x] Other: **APPROVE IMPLEMENTATION** before code changes

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Placeholder `[TBD]` copy ships to prod later | medium | Mark clearly; owner replaces before `production-release`; avoid indexing meaningful empty content on prod until filled |
| Broken/blocked embeds (CSP, cookies) | medium | Validate URLs; lazy iframes; manual QA on `.dev` |
| Nav clutter | low | Footer secondary link only; not primary nav |
| Scope creep into CMS | low | Explicit out of scope |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert Portal App Hosting deploy / remove `/help` route + nav link + SEO list entries. No data migration.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md — only if FAQ becomes a marketed surface (optional short bullet)
- [x] ARCHITECTURE.md — brief Portal public routes note
- [ ] DATA_MODEL.md
- [ ] BACKEND.md
- [ ] TESTING.md — only if new commands
- [x] DEPLOYMENT.md — public FAQ URL + sitemap/robots allow note
- [ ] STYLE_GUIDE.md — only if new pattern needed
- [ ] DECISIONS.md — short ADR if review wants durable “content module not CMS” record
- [x] Other: ROADMAP pre-prod sequence status

---

## Open Questions

- [ ] **Nav label:** Help vs How To vs FAQ vs How To & FAQ?
- [ ] **URL path:** `/help` (default) vs `/faq` vs `/how-to`?
- [ ] **Initial FAQ copy:** owner-supplied list vs ship structural `[TBD]` placeholders for layout QA?
- [ ] **Video host:** YouTube only, Vimeo only, or both? Any existing Fresh Prints channel URLs?
- [ ] **Sidebar placement:** above Donate, below Donate, or also a Discover/home link?

Non-blocking for plan approval: implement may use defaults (`/help`, label **Help**, both hosts supported, placeholders) until owner answers; final copy/videos expected before production-release.

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-22-portal-how-to-faq-review.md
- Verdict: **approved_with_changes** — implement only after owner **APPROVE IMPLEMENTATION**; follow review required changes (defaults `/help` + Help, plain-text answers, YouTube/Vimeo helper, SEO list wiring, `[TBD]` placeholders OK).

---

## Addendum (2026-07-23): Studio-managed FAQ and How To

| Field | Value |
|-------|-------|
| Date | 2026-07-23 |
| Author | Planning Agent |
| Status | approved_with_changes (review 2026-07-23) |
| Related review | docs/workflow/reviews/2026-07-23-portal-faq-how-to-settings-review.md |
| Supersedes | ADR-FP-117 content-as-code-only decision (amended by ADR-FP-118) |

### Goal delta

Owner wants FAQ / How To content editable in **Studio Settings** (live Firestore), not only via the typed TS module. Portal titles/nav must use the consistent phrasing **FAQ and How To**. Path stays **`/help`**.

### Scope added

**In scope**

- Firestore `settings/portalHelp` (follow existing `settings/*` patterns)
- Shared strongly typed model + parsers/resolvers:
  - Text FAQs: `id`, `question`, `answer`, `order`
  - How To videos: `id`, `title`, `description?`, `videoUrl` (HTTPS YouTube/Vimeo only), `order`
- Public Firestore **read** (Portal guests); client **writes denied**; owner/admin updates via Admin callable `updatePortalHelpSettings` (same pattern as social meta / brand logos validation-on-server)
- Studio Settings tab/section **FAQ and How To**: add / edit / reorder / remove text FAQs and video items; validate video URLs client-side before save
- Portal: load live settings (subscribe or one-shot); missing doc **or empty FAQs** → bundled FAQ defaults from `portalHelpContent.ts`; **empty videos** → Coming soon UI (no dummy video slots). Partial Studio content: non-empty FAQ list stays from Firestore. *(Owner 2026-07-23 follow-up.)*
- Rename nav label / page H1 / SEO title to **FAQ and How To** (keep `/help`)
- Docs: ADR-FP-118; DATA_MODEL / BACKEND / DEPLOYMENT brief notes; workflow state
- Unit tests: shared URL validation + settings resolve/parse; Portal (+ Studio if feasible) typecheck

**Out of scope (unchanged + explicit)**

- Google Analytics; production-release / production rules-Functions deploy without owner approval
- Video file upload / Storage for videos (URL embeds only)
- Changing path away from `/help`

### Affected areas (addendum)

- `packages/shared/src/constants/portal/portalHelpSettings.constants.ts` (+ video URL helper + tests)
- `functions/src/updatePortalHelpSettings.ts` + `functions/src/index.ts` export
- `firestore.rules` — `settings/portalHelp` public read, write false
- Studio: settings service / hook / section / SettingsPage tab (owner+admin via `canManageSettings`)
- Portal: help content loader service + client page content; title constants; sidebar label; meta tests
- Docs: DECISIONS (ADR-FP-118), DATA_MODEL, BACKEND, DEPLOYMENT, ROADMAP note

### Architecture / security / data

- Architecture: shared constants + Studio/Portal services; UI does not invent validation — callable enforces.
- Security: public read of non-sensitive FAQ copy only; HTTPS YouTube/Vimeo only for embeds; plain-text answers; no arbitrary iframe hosts; owner/admin write via callable only.
- Data model: new `settings/portalHelp` doc; no migration job (missing → code defaults).
- Backend: new callable; soft-deploy Functions + rules on `fresh-prints-dev` after implement (human gate for production).

### Test strategy (addendum)

| Check | Required |
|-------|----------|
| Unit (shared resolve/parse + HTTPS YT/Vimeo) | yes |
| Portal typecheck | yes |
| Studio typecheck (if feasible) | yes |
| Functions typecheck / unit if cheap | preferred |
| Manual QA: Studio Settings CRUD + Portal `/help` live content + title | yes (re-run) |

### Rollback

Revert callable + rules + Studio/Portal UI; Portal falls back to bundled module. Delete or ignore `settings/portalHelp` doc.

### Open questions (resolved by owner request 2026-07-23)

- [x] Title / nav: **FAQ and How To**
- [x] Path: keep `/help`
- [x] Content source: Studio Settings + Firestore (not TS-only)
- [x] Permissions: owner/admin (`canManageSettings` / callable role check)
