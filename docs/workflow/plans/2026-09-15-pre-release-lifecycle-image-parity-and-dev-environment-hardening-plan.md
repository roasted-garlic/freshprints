# Plan: Pre-release lifecycle, Show Queue image parity, and DEV environment hardening

| Field | Value |
|-------|-------|
| Date | 2026-09-15 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal slug | `pre-release-lifecycle-image-parity-and-dev-environment-hardening` |
| Related | Formal Review (pending) |

---

## Goal

Restore Internal Gang Sheet Mark Complete → Printed reconciliation for eligible Internal Print Requests; root-cause and correct production-vs-DEV Portal Admin Show Queue artwork rendering without weakening privacy; and make the development Portal unmistakably a development server while hardening DEV noindex / robots / sitemap behavior without changing production SEO (ADR-FP-116).

No production deployment, Portal publication, Studio release, Rules/Storage Rules mutation, or production data repair is authorized by this goal.

---

## Background

Owner observed three pre-release defects/hardening needs in one bounded bundle:

1. **A — Lifecycle:** Internal PRs on completed Internal Gang Sheets remain under Studio Print Requests → Queued instead of Printed.
2. **B — Image parity:** Artwork renders on the development Show Queue surface but not on the production-connected Show Queue surface.
3. **C — DEV safety:** Development Portal must show `THIS IS A DEVELOPMENT SERVER` and must not be search-indexable; production SEO must remain unchanged.

Prior related work:

- WS2 (2026-08-22) added server-side finish + reconcile into `completeStaffGangSheetAndOpenNext` (ADR path already in tip).
- ADR-FP-187 defines Portal Admin Show Queue View Designs via short-lived Admin signed derivative URLs.
- ADR-FP-116 defines fail-closed Portal indexing keyed to `myprintrequest.com` origin hostname.
- DEV Gen2 `signBlob` / TokenCreator self-binding is documented for `fresh-prints-dev` only (`docs/workflow/setup/firebase-signed-url-iam.md`).

Repo checkout: `development` @ `c7027a87` aligned with `origin/development`; working tree clean at Plan start. Prior goal `studio-staff-show-capacity-allocation-override` is closed/IDLE.

---

## Scope

### In Scope

#### Workstream A
- Prove and restore Internal Gang Sheet Mark Complete → eligible Internal PR Printed
- Allocation finish + request completion eligibility + `queueTab` persistence
- Studio post-complete cache / list freshness hardening
- Focused lifecycle tests (behavioral, not string-only)

#### Workstream B
- Root-cause Portal Admin Show Queue artwork parity (DEV vs production-connected)
- Narrow source fixes proven by evidence (error surfacing; optional Staff Artwork derivative preview if review keeps it in scope)
- Explicit separately gated production IAM/config checkpoint when required
- Privacy regressions for catalog / customer upload / Staff Artwork

#### Workstream C
- Persistent DEV-only Portal banner (`THIS IS A DEVELOPMENT SERVER`)
- Stronger DEV noindex contract (meta + `X-Robots-Tag` + empty/non-advertising sitemap)
- Production SEO regression protection for ADR-FP-116

### Out of Scope
- New Print Request statuses or Internal Gang Sheet redesign
- Manual “Move to Printed” staff workaround (unless Formal Review later proves reconcile cannot be repaired)
- Production deploy / Portal publication / Studio release
- Production data backfill / Rules / Storage Rules mutation
- Making Staff Artwork or customer uploads publicly readable
- Rewriting Show Queue image architecture without root cause
- Password-protecting the entire DEV site
- Unrelated SEO redesign or broad refactors

---

## Investigation answers (required 1–19)

### Workstream A

#### 1. Why do completed Internal Gang Sheet PRs currently remain Queued?

**Studio list truth:** Internal Print Requests lists are filtered by persisted `printRequests.queueTab` (plus `isInternal`), not by live client re-derivation of allocations for the list page.

**Tab derivation:** `derivePrintRequestListTab` keeps a request on **Queued** when:

- `status` is not `completed`, and
- printed qty (`allocation.status` in `printed` | `done`) is still **less than** requested item qty, and
- any non-canceled allocation qty remains (`totalAllocatedQuantity > 0`).

**Intended fix already in tip:** `completeStaffGangSheetAndOpenNext` (post-WS2) should:

1. Mark finishable allocations on that sheet `done` inside the TX (`finishShowAllocationsInTransaction`).
2. After commit, run `reconcilePrintRequestsAfterShowFinish` → maybe set `status: "completed"` → `recomputeAndPersistQueueTab`.

**Historical root cause (documented):** Pre-WS2, Mark Complete only closed the sheet cycle and opened N+1; allocations stayed `pending` → `queueTab` stayed `queued`.

**Current tip assessment:** The Functions path looks correct on paper. Remaining live failures are therefore one of:

| Hypothesis | How to prove (DEV read-only after Mark Complete) |
|---|---|
| **H1 — Deploy lag / old callable** | Sheet completes + next opens, but `showAllocations.status` still `pending`/`queued` |
| **H2 — Partial / multi-sheet by design** | Some allocations `done`, others still active elsewhere; Σ done &lt; Σ items |
| **H3 — Reconcile/recompute miss** | Allocations full `done`, `status` still non-completed, `queueTab` still `queued` |
| **H4 — UI cache only** | Firestore already `queueTab=printed` but Studio list stale until remount &gt;30s (does **not** explain refresh/restart) |

**Plan stance:** Do **not** invent a second lifecycle. Implementation must (a) add behavioral tests that lock the intended path, (b) harden Studio post-complete list freshness + optional client verify/sync parity with Whatnot Finish, (c) require a short **Owner DEV diagnostic** of one stuck (or freshly completed) Internal PR before claiming A fixed if tip Functions already match H1–H3 evidence.

#### 2. Which exact persisted/derived field keeps them there?

**Authoritative list field:** `printRequests.queueTab === "queued"`.

**Upstream drivers of that mirror:**

- `showAllocations.status` still non-printed for remaining qty, and/or
- `printRequests.status` not `completed`, and
- printed qty (`printed`|`done`) &lt; sum(`printRequestItems.quantity`).

#### 3. What is the existing intended reconciliation path?

```
UpcomingShowsPage Mark Complete
  → upcomingShowService.completeStaffGangSheetAndOpenNext
  → callable completeStaffGangSheetAndOpenNext
       TX: finishShowAllocationsInTransaction (pending|queued|in_progress → done)
           + upcomingShows.productionStatus = completed
           + create next staff_gang_sheet cycle
       post-TX: reconcilePrintRequestsAfterShowFinish
           → evaluatePrintRequestCompletionEligibility
           → maybe printRequests.status = completed
           → recomputeAndPersistQueueTab
                → computePrintRequestQueueTab → derivePrintRequestListTab → persist queueTab

Backup triggers: onShowAllocationQueueTabInputWritten / onPrintRequestStatusQueueTabInputWritten
```

Whatnot Finish uses a **client-orchestrated** finish + `reconcileCompletedPrintRequest` + `syncPrintRequestQueueTabBestEffort`. Internal Mark Complete is **callable-only** and currently does **not** clear `clearPrintRequestsPageCache()` after success (remove-from-sheet does).

#### 4. What constitutes an “eligible” request to move to Printed?

`evaluatePrintRequestCompletionEligibility`:

- `already_terminal` if `status` is `completed` | `archived`
- `not_eligible` if requested qty ≤ 0 **or** Σ printed (`printed`|`done`, non-canceled) **&lt;** Σ item quantities
- `eligible` otherwise → write `status: "completed"`

Printed tab also follows when `totalPrintedQuantity >= totalRequestedQuantity` even before/without status write, via `derivePrintRequestListTab`.

#### 5. How are multi-sheet/partial requests prevented from being marked Printed too early?

Reconciliation loads **all** `showAllocations` for the print request ID (every show/sheet). Completing Sheet A only finishes Sheet A’s finishable rows. The PR stays non-Printed until global printed qty covers all item qty. Covered by `printRequestCompletionEligibility.test.ts` (“partial multi-sheet work”).

#### 6. Exactly which files change? (A)

Expected (exact set finalized during Implement after diagnostic):

| File | Change |
|---|---|
| `functions/src/completeStaffGangSheetAndOpenNext.ts` | Optionally return reconciled `printRequestIds` / outcomes for Studio verify; keep idempotent finish |
| `functions/src/lib/staffGangSheetShowFinishReconciliation.ts` | Only if diagnostic proves finish/eligibility gap |
| `functions/src/completeStaffGangSheetAndOpenNext*.test.ts` (new behavioral) | Allocate-complete → `done` + `queueTab=printed`; partial; idempotent; isolation |
| `apps/studio/.../UpcomingShowsPage.tsx` | After successful Mark Complete: `clearPrintRequestsPageCache()`; optional best-effort queueTab sync for returned IDs |
| `apps/studio/.../upcomingShowService.ts` | Wire response fields / optional sync |
| `apps/studio/.../showQueueStaffGangSheetUi.contract.test.ts` (or sibling) | Assert cache clear on Mark Complete |
| Docs: `DATA_MODEL.md` / `BACKEND.md` / `DECISIONS.md` | Only if behavior semantics clarified |

No new statuses. No Rules changes.

---

### Workstream B

#### 7. Which exact image URL/source resolver differs or fails in production?

**Surface clarification (repo-proven):** Studio Show Queue list UI does **not** render artwork thumbnails. The only Show Queue surface that shows artwork is **Portal Admin** `/admin/show-queue` → **View Designs** modal.

**Resolver:**

```
PortalAdminViewDesignsModal
  → portalAdminShowQueueService.loadRequestDesigns
  → callable getPortalAdminShowQueueRequestDesigns
  → resolveArtworkPreview → signDerivativeUrl
       adminStorage.bucket().file(...).getSignedUrl({ action: "read", expires })
  → DTO imageUrl → <img> or "No preview"
```

Key file: `functions/src/getPortalAdminShowQueueRequestDesigns.ts`.

**Best-supported production failure mode:** Admin SDK V4 `getSignedUrl` fails on the production Gen2 runtime service account (missing `roles/iam.serviceAccountTokenCreator` self-binding), while DEV already has that binding per `docs/workflow/setup/firebase-signed-url-iam.md`. Failures are **swallowed**:

```ts
} catch {
  return {};
}
```

→ modal succeeds with empty `imageUrl` → **No preview** for every row.

#### 8. Is the defect code, data shape, Storage, auth, environment config, or deployment parity?

| Class | Likelihood |
|---|---|
| **Env / IAM / deployment parity** (prod Gen2 SA cannot `signBlob`) | Highest for catalog+upload “all No preview” on prod only |
| **Code amplifier** (silent catch; Staff Artwork always blank) | Confirmed |
| **Missing derivative objects** | Possible for some rows; weak as sole DEV-vs-prod explanation |
| **Storage Rules / CORS** | Unlikely for Admin signed `<img>` URLs |
| **Auth gate** | Would error the modal, not blank all previews |

**Honest limit:** Repo alone cannot prove production IAM; a **read-only production inspection checkpoint** is required before mutating production.

#### 9. Which artwork source types are affected?

| Source | Behavior |
|---|---|
| `catalog_design` | `previewPath` ?? `thumbnailPath` → signed URL — **suspected prod signing failure** |
| `customer_upload` | `previewStoragePath` ?? `thumbnailStoragePath` — **same** |
| `staff_artwork` | **Always returns no `imageUrl` by code** (both DEV and prod; intentional ADR-FP-187-era gap) |

If owner evidence shows Staff Artwork previews in DEV, re-check surface (may be a different UI). Repo tip does not sign Staff Artwork for this callable.

#### 10. Can the fix be completely implemented in source, or is a separately gated production action required?

| Fix | Gate |
|---|---|
| Confirm/apply prod Gen2 SA TokenCreator self-binding | **Separately gated production IAM** (human checkpoint). Not authorized by this Plan’s implementation approval alone. |
| Stop swallowing signing errors; log + surface truthful failure | Source-only on `development` |
| Optional: sign Staff Artwork **preview/thumbnail only** for admin callers | Source + Function deploy; still separately gated for prod promotion |
| Studio Show Queue list thumbs | Out of scope (feature does not exist) |

#### 11. How will the fix preserve private artwork boundaries?

Keep ADR-FP-187:

- Owner/admin callable only; prove show + PR allocation linkage before signing.
- Sign **derivatives only**; never originals, raw Storage paths, or durable URLs.
- Do **not** widen Storage Rules or make Staff Artwork public.
- Keep short TTL (`PORTAL_ADMIN_SHOW_QUEUE_IMAGE_TTL_MS` = 15 min).
- Missing/unavailable art fails closed to truthful empty/error — never substitute another customer’s art.

#### 12. Exactly which files/configs would change? (B)

| Area | Paths |
|---|---|
| Signing / preview | `functions/src/getPortalAdminShowQueueRequestDesigns.ts` |
| Helpers/tests | `functions/src/lib/portalAdminShowQueueRequestDesigns.ts` (+ tests) |
| Portal UX (optional) | `apps/portal/features/admin-show-queue/components/PortalAdminViewDesignsModal.tsx` |
| Docs | `docs/workflow/setup/firebase-signed-url-iam.md` (prod SA note), `BACKEND.md`, ADR-FP-187 note if Staff Artwork preview added |
| **Not in git** | Production Gen2 Compute SA TokenCreator self-binding (separate checkpoint) |

Unlikely: `storage.rules`, Studio `UpcomingShowsPage` list.

---

### Workstream C

#### 13. What is the authoritative DEV-vs-production environment signal?

**SEO / indexing gate (ADR-FP-116):** `isPortalSearchIndexingEnabled()` — hostname of `getPortalSiteOrigin()`, **not** `NODE_ENV` alone.

Production indexing host allowlist: `myprintrequest.com` / `www.myprintrequest.com`.

Origin resolution order (`getPortalSiteOrigin`):

1. `NEXT_PUBLIC_PORTAL_ORIGIN`
2. `NEXT_PUBLIC_FIREBASE_PROJECT_ID === 'fresh-prints-dev'` → `https://myprintrequest.dev`
3. `NODE_ENV === 'production'` + non-dev project id → `https://myprintrequest.com`
4. else → `http://localhost:3100`

**Banner gate (proposed):** Show when indexing is disabled **or** Firebase project id is `fresh-prints-dev`, so a mistaken prod origin override on DEV still shows the banner (SEO would still be wrong until origin is corrected — called out as risk). Never key banner solely on `NODE_ENV !== 'production'` (App Hosting DEV builds are `production`).

#### 14. Where should one global DEV banner live?

**Root** `apps/portal/app/layout.tsx` (or early inside `Providers`) so it covers `(app)`, `(admin)`, `/login`, `/register`, and other public auth routes.

Do **not** mount only in `PortalAppShell` (misses auth + admin).

Visual pattern: reuse danger/warning strip tokens (e.g. patterns from `.portal-maintenance-test-banner` / `.portal-print-request-quota-banner.is-exhausted`). Exact text: `THIS IS A DEVELOPMENT SERVER`. Non-dismissible. Prefer a sticky/fixed top strip that does not cover nav/dialogs/toasts; Formal Review locks sticky vs document-flow.

#### 15. How does existing ADR-FP-116 SEO generate robots metadata, `/robots.txt`, and `/sitemap.xml`?

| Surface | Today |
|---|---|
| Page robots meta | `buildPortalRootMetadata`: enabled → `{ index: true, follow: true }`; else `{ index: false, follow: true }` |
| `/robots.ts` | Non-prod: `Disallow: /` (no sitemap URL). Prod: allow/disallow lists + sitemap URL |
| `/sitemap.ts` | **Always** emits static + ready design URLs for resolved origin — **no** indexing gate |
| `X-Robots-Tag` | **Absent** (no middleware / headers) |

#### 16. What exact noindex strategy will DEV use?

Keep `isPortalSearchIndexingEnabled` as the single gate. Change only the **disabled** branch:

1. HTML robots: `{ index: false, follow: false, noarchive: true, nosnippet: true }` (and mirror Help/share helpers).
2. HTTP `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` when indexing disabled (middleware or conditional Next headers using the same helper).
3. Keep `robots.txt` fail-closed `Disallow: /`.
4. When indexing disabled, `sitemap.xml` returns `[]` (do not advertise DEV absolute URLs).
5. Leave the **enabled** production branch unchanged.

#### 17. How will already-discoverable DEV URLs receive noindex rather than merely being crawl-blocked?

Today meta already emits `index: false` on non-prod (good for crawlers that ignore `robots.txt` but honor meta). Gaps: still `follow: true`; no `noarchive`/`nosnippet`; no header; sitemap still lists DEV URLs; origin override to `.com` on DEV can flip indexing **on**.

Hardening (meta + header + empty sitemap) lets crawlers that can fetch the page see explicit noindex and stops sitemap advertisement.

#### 18. How will production indexing remain unchanged?

- Do not edit the `indexingEnabled === true` branch behavior (index/follow, robots allow/disallow, sitemap emission with prod origin).
- Only change `!indexingEnabled` paths.
- Tests must assert both `.com` and `.dev` / localhost matrices.
- Wrong origin on prod would fail-closed (safer than accidental DEV index).

#### 19. Exactly which files/configs change? (C)

| Area | Files |
|---|---|
| Gate / robots shape helpers | `apps/portal/features/brand/portalSearchIndexing.ts` (+ tests) |
| Root / page meta | `apps/portal/features/brand/portalSiteMeta.ts` (+ tests) |
| Help / share meta | `portalHelpMeta.ts`, `portalDesignShareMetaService.ts` (+ tests) |
| Sitemap | `apps/portal/app/sitemap.ts` |
| robots.txt | `apps/portal/app/robots.ts` (only if further tightening needed; already Disallow:/) |
| X-Robots-Tag | New `apps/portal/middleware.ts` and/or `next.config.ts` `headers` |
| Banner | New component + CSS; mount in `apps/portal/app/layout.tsx` / `providers.tsx` |
| Docs | `DEPLOYMENT.md` SEO section; optional ADR-FP-116 amendment note in `DECISIONS.md` |

---

## Approach (implementation order after owner approval)

1. **A diagnostic (Owner DEV, read-only):** After one Internal Mark Complete (or one currently stuck PR), record `printRequests.status`, `queueTab`, item qty sum, and per-allocation `status`/`allocatedQuantity`/`upcomingShowId`. Classify H1–H4.
2. **A implement:** Behavioral Functions tests + Studio cache clear (+ optional returned IDs / sync). Fix any proven code gap from diagnostic — no manual Move-to-Printed.
3. **B source harden:** Replace silent catch with structured logging + truthful client error/empty state; optional Staff Artwork derivative preview if Formal Review includes it; focused tests for signing failure vs missing object.
4. **B production checkpoint (separate):** Read-only IAM + logs + one authorized callable sample on prod. If TokenCreator missing, owner-authorized IAM binding only (no Rules change). Production Function redeploy only if source changes need promotion.
5. **C implement:** Banner in root layout; strengthen disabled robots meta; add `X-Robots-Tag`; empty DEV sitemap; production regression tests.
6. **Test phase** per Test Strategy; then **Owner DEV QA**; then Signoff. Production promotion remains separately unauthorized.

---

## Architecture Impact

- [x] Details: Preserve Component → Hook → Service → trusted Function boundary. No Firebase in UI. Lifecycle reconciliation remains server-authoritative for Internal Mark Complete. Image signing remains Admin callable (ADR-FP-187). SEO/env detection remains centralized in brand helpers.

## Security Impact

- [x] Details: Do not weaken Storage/Firestore Rules. Do not expose originals. Staff Artwork remains private. DEV banner/noindex must not leak onto production hosts. Production IAM change (if needed) is a separate human checkpoint.

## Data Model Impact

- [x] Details: No new entities/statuses. A uses existing `showAllocations.status`, `printRequests.status`, `printRequests.queueTab`. Optional callable response fields are non-persisted DTO only.

## Backend Impact

- [x] Details: Possible Functions changes in `completeStaffGangSheetAndOpenNext` and `getPortalAdminShowQueueRequestDesigns`. Possible Portal middleware/headers. No production deploy in this goal.

## UI / UX Impact

- [x] Details: Studio Mark Complete freshness; Portal Admin View Designs error honesty; Portal-wide DEV banner (manual QA). Formal Review picks sticky vs flow banner.

## Migration Impact

- [x] None for schema. Stuck historical PRs: if H1 (old finish never ran), a one-time owner-authorized DEV repair/backfill may be needed later — **out of scope** unless Formal Review adds a bounded DEV-only repair after diagnostic.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| A unit/contract | `npx tsx --test` on new/updated completeStaffGangSheet + eligibility + Studio contract tests | yes |
| B unit/contract | focused tests around `getPortalAdminShowQueueRequestDesigns` / resolveArtworkPreview failure modes | yes |
| C unit | `portalSearchIndexing`, `portalSiteMeta`, help/share meta, sitemap/robots contracts | yes |
| Shared grouping regression | `printRequestListGrouping` / queueTab recompute tests | yes if A touches |
| Studio typecheck | `npm --prefix apps/studio exec tsc -- --noEmit` | if Studio changes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | if Portal changes |
| Functions build | `npm --prefix functions run build` | if Functions change |
| Portal build | `npm run build:portal` | if SEO/middleware/layout change (note Windows `.next` EPERM risk; document if blocked) |
| Targeted lint | changed packages | yes |
| `git diff --check` | yes | yes |
| Rules tests | — | **no** (Rules out of scope) |

### Manual (Owner DEV QA)

- [ ] A: Internal PR fully on sheet → Mark Complete → Queued→Printed; refresh persists; partial multi-sheet stays Queued; Sheet B untouched; idempotent complete
- [ ] B (DEV): View Designs still shows catalog/upload previews; Staff Artwork policy as reviewed; signing failure surfaces truthfully
- [ ] B (prod smoke): **Not in this goal** — separately authorized after IAM/source promotion
- [ ] C: Banner on home, catalog, authenticated, admin; no banner on production build/config; DEV meta/header/robots/sitemap contracts; production SEO unchanged

---

## Human Checkpoints Anticipated

- [x] Owner explicit **implementation approval** after Formal Review (this prompt)
- [x] Owner DEV diagnostic for Workstream A (read-only Firestore sample) if tip Functions already contain WS2 and bug still reproduces
- [x] Manual UI/UX review (DEV banner + View Designs messaging)
- [x] **Separate** production IAM / Function promotion checkpoint for Workstream B (not authorized here)
- [ ] Production deploy — **forbidden**
- [ ] Database migration — none expected
- [ ] Secrets / env vars — only document; no production secret mutation

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| A tip code already correct; live bug is deploy/partial | Med | Diagnostic first; behavioral tests; avoid speculative status hacks |
| B assumed IAM wrong without prod evidence | High | Read-only prod checkpoint before IAM mutation; source harden regardless |
| Silent catch hides real data/path bugs | Med | Log + surface failure class |
| DEV banner/noindex leaks to prod | High | Same `isPortalSearchIndexingEnabled` tests for `.com` vs `.dev` |
| DEV `NEXT_PUBLIC_PORTAL_ORIGIN=.com` enables indexing | Med | Banner dual-gate on project id; document risk; keep SEO host allowlist |
| Empty sitemap breaks a DEV tooling expectation | Low | Document; robots already Disallow:/ |
| Scope creep into Studio queue thumbs | Med | Explicitly out of scope |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

- Revert source commits on `development`.
- Banner/SEO: disabled-branch-only changes; production branch untouched → low rollback risk.
- Do not reverse production IAM without owner approval if later applied.
- No schema migration to roll back.

---

## Documentation Updates Required

- [ ] DATA_MODEL.md — only if A semantics clarification needed
- [ ] BACKEND.md — B signing/IAM note; C middleware/headers if added
- [ ] DEPLOYMENT.md — C SEO DEV hardening; banner env contract
- [ ] DECISIONS.md — optional ADR-FP-116 amendment; ADR-FP-187 Staff Artwork preview note if added
- [ ] TESTING.md — new focused commands if added
- [ ] Handoff CURRENT-STATE / recent completed work — at Signoff

---

## Open Questions (for Formal Review / owner)

1. **A:** Prefer owner DEV diagnostic **before** Implement, or start Implement with hardening+tests and diagnose during Owner DEV QA?
2. **B:** Confirm broken surface is Portal Admin View Designs (not Studio list / export).
3. **B:** Include Staff Artwork derivative preview in this goal, or leave intentional blank + document?
4. **C:** Banner sticky/fixed vs in-flow under root layout?
5. **C:** Banner when `!indexingEnabled` only, or also when `fresh-prints-dev` project id (recommended dual-gate)?

---

## Approval

- Review doc: (pending Formal Review)
- Verdict: pending
- Implementation: **blocked until owner explicitly approves** after Formal Review
