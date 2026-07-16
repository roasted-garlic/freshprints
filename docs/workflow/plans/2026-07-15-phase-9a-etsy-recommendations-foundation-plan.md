# Plan: Phase 9A — Etsy Recommendations Foundation

| Field | Value |
|-------|-------|
| Date | 2026-07-15 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase |
| Goal id | `phase-9a-etsy-recommendations-foundation` |
| Related | docs/workflow/reviews/2026-07-15-phase-9a-etsy-recommendations-foundation-review.md |

---

## Goal

Build the first clean Phase 9 Portal experience around **Etsy recommendations only**, starting from current `master` with **no** archived Phase 9 code as the architectural base.

Deliver:

1. Polished route-selection page with three cards
2. One working path: **Help Me Find a Design**
3. Two disabled coming-soon cards: **Create My Design with AI**, **Fresh Prints Assisted Creation**
4. Short Etsy-specific questionnaire (two content screens + review)
5. One canonical Etsy search query used for both the direct Etsy link and the server-side API request
6. Authenticated Firebase callable → server-side Etsy client → normalized listing cards in Portal
7. Loading / empty / error / fallback states
8. Mobile- and desktop-friendly UI

Product principle: questions exist **only** to build an effective Etsy search query (plus customer-facing review). No universal Custom Request questionnaire. No AI / Assisted Creation fields.

---

## Background

- Roadmap Phase 9 historically described broader Custom Request Q&A + Etsy referral + optional design fee (`docs/project/ROADMAP.md`, planned `customRequests` in `DATA_MODEL.md`).
- Prior Phase 9 implementation was **archived outside master** and removed from master.
- Owner authorized a clean restart: treat current `master` as source of truth; do not merge/cherry-pick/copy archived Phase 9.

### Master audit (2026-07-15)

| Check | Result |
|-------|--------|
| Branch | `master` tracks `origin/master` |
| HEAD | `274ded5` |
| Working tree | clean |
| `apps/portal/features/custom-requests` | **ABSENT** |
| `apps/portal/app/(app)/custom-request` | **ABSENT** |
| Shared `customRequest*` | **ABSENT** |
| Functions Phase 9 callables | **ABSENT** |
| Studio `features/custom-requests` | **ABSENT** |
| Docs-only planned `customRequests` | Present in DATA_MODEL / ROADMAP (not shipped) |
| Local gitignored orphan | `functions/src/lib/customRequestTransitions.ts` references missing archived types — **must not be committed or used** |

**Verdict:** Master has no Phase 9 application implementation. Safe to build greenfield.

---

## Scope

### In Scope

- Portal entry + nav label **Custom Designs**
- Route page heading **How can we help with your design?**
- Three route cards (1 active, 2 disabled coming-soon)
- Etsy questionnaire (2 screens + review)
- Shared validation + canonical query builder + direct URL builder
- Minimal persisted Etsy recommendation request (`schemaVersion: 1`)
- Authenticated callables (submit/upsert + search)
- Server-side Etsy client + Secret Manager (`ETSY_X_API_KEY`)
- Normalized listing DTO + Portal results UI
- Rate limiting, call budget, error/fallback states
- Local draft behavior
- Automated tests
- Docs updates
- Dev deploy after human secret checkpoint
- One consolidated visual smoke checkpoint
- Signoff after owner PASS / accepted PASS WITH NOTES

### Out of Scope

- Wiring AI or Assisted Creation
- AI prompts/providers/secrets
- Studio Custom Request inbox / staff design workflow
- Reference uploads, rights questionnaires
- Proofs, revisions, credits, tokens, payments
- Etsy checkout, order verification, file download
- Save/favorite listings
- Pagination / Load More / infinite scroll
- Persistent Etsy listing cache
- Standard Print Request changes
- Customer artwork-upload pipeline changes
- Design Library / Show Queue changes
- Production deployment
- Using archived Phase 9 code

---

## FreshForge impact classification

| Area | Impact |
|------|--------|
| Starter Surface | No (project app docs only; not FreshForge starter packaging) |
| Development Tooling | Minor: fix `functions/.gitignore` `lib/` trap so `functions/src/lib` can be committed |
| Distribution/Installer | None |
| Documentation | Yes — architecture/data/backend/security/testing/roadmap/decisions/tech debt + workflow artifacts |
| Development History | None |

---

## Affected Areas

### Files / Modules (verified paths)

#### Portal — [VERIFIED]

| Path | Action |
|------|--------|
| `apps/portal/features/navigation/constants/portalNavItems.ts` | Add Custom Designs nav item |
| `apps/portal/features/navigation/components/PortalNavIcon.tsx` | Icon for new id |
| `apps/portal/features/navigation/components/PortalBottomNav.tsx` | Include in bottom nav if primary |
| `apps/portal/app/(app)/custom-designs/page.tsx` | New thin route page |
| `apps/portal/features/etsy-recommendations/` | New feature folder (components, hooks, pages, services, utils, constants) |
| `apps/portal/styles/etsy-recommendations.css` | Feature styles |
| `apps/portal/app/layout.tsx` | Import CSS |

#### Shared — [VERIFIED patterns]

| Path | Action |
|------|--------|
| `packages/shared/src/types/etsyRecommendation/` | Request, answers, listing DTO, action types |
| `packages/shared/src/constants/etsyRecommendation/` | Schema version, limits, draft key |
| `packages/shared/src/utils/etsyRecommendationValidation.ts` (+ test) | Parse/validate answers + request |
| `packages/shared/src/utils/etsyRecommendationQueryBuilder.ts` (+ test) | Canonical query + URL |
| `packages/shared/src/utils/etsyRecommendationListingUrl.ts` (+ test) | Official listing URL validation |

#### Functions — [VERIFIED patterns; hygiene required]

| Path | Action |
|------|--------|
| `functions/.gitignore` | Change `lib/` → `/lib/` so only compile output is ignored |
| `functions/src/lib/secrets.ts` | Ensure `ETSY_X_API_KEY` defineSecret is present and committed (local stub already exists; must ship via gitignore fix) |
| `functions/src/submitEtsyRecommendationRequest.ts` | Create/update active request |
| `functions/src/searchEtsyRecommendations.ts` | Search callable (secret-bound) |
| `functions/src/completeEtsyRecommendationRequest.ts` | Mark completed |
| `functions/src/cancelEtsyRecommendationRequest.ts` | Cancel |
| `functions/src/lib/etsy/*` | Client interface, live client, normalizer, rate limit helpers |
| `functions/src/index.ts` | Export callables |
| Do **not** commit | `functions/src/lib/customRequestTransitions.ts` (archived leftover) |

**Critical hygiene:** `functions/.gitignore` currently ignores any `lib/` directory, so `functions/src/lib/**` is not on `origin/master` despite being imported by tracked callables. Phase 9A **must**:

1. Change `functions/.gitignore` from `lib/` to `/lib/` (compile output only).
2. Commit existing production `functions/src/lib` helpers required for Functions to build/deploy, plus new Etsy helpers under `functions/src/lib/etsy/`.
3. **Never commit** `functions/src/lib/customRequestTransitions.ts` (archived leftover). Delete it locally before staging if present so it cannot be added accidentally.

This is a deployability fix, not Phase 9 product scope expansion.

#### Firebase

| Path | Action |
|------|--------|
| `firestore.rules` | Add ownership read rules for `etsyRecommendationRequests`; deny client writes; deny client access to rate-limit collection |
| `firestore.indexes.json` | Add index for customer active-request query if needed (`customerId` + `status` + `updatedAt`) |
| Secrets | Bind `ETSY_X_API_KEY` only to `searchEtsyRecommendations` |

#### Docs

Update: `DATA_MODEL.md`, `BACKEND.md`, `SECURITY.md`, `TESTING.md`, `ROADMAP.md`, `DECISIONS.md`, `TECH_DEBT.md` as needed; workflow plan/review/implementation/test/manual/signoff artifacts; `.cursor/workflow/state.md`; `references/project-chatgpt-handoff/CURRENT-STATE.md`.

### Architecture Impact

- [x] Details: New Portal feature `etsy-recommendations` following `Component → Hook → Service → Firebase Callable`. Portal never calls Etsy. Studio unchanged. No third app.

### Security Impact

- [x] Details: Auth required; customer ownership checks; server-owned writes; Secret Manager only; reject arbitrary client queries/limits/offsets; sanitize listing URLs; no secrets in logs/errors/Firestore/Portal; rate limits; Etsy trademark disclosure.

### Data Model Impact

- [x] Details: New collection `etsyRecommendationRequests` (Phase 9A). Planned legacy `customRequests` sketch in DATA_MODEL remains deferred / superseded for this slice. No migration/backfill.

### Backend Impact

- [x] Details: New callables + Etsy Open API v3 client + secret + server-only rate-limit collection.

### UI / UX Impact

- [x] Details: New nav entry, route cards, questionnaire, results. Manual visual smoke required.

### Migration Impact

- [x] None (new collection; no backfill). No production migration.

---

## Approach

### 1. Navigation and entry

- Nav label: **Custom Designs**
- Route: `/custom-designs`
- Page heading: **How can we help with your design?**
- Supporting sentence (short): help the customer choose how they want design help; only Etsy path works today.
- Include **Custom Designs** in both sidebar (`portalNavItems`) and **PortalBottomNav** (required, not optional).
- Nav icon: Lucide **`Palette`** in `PortalNavIcon.tsx`.
- Do not expose Phase 9 / API / schema / callable jargon.

### 2. Route-selection cards

| Card | Status | Title | Description | Action / badge |
|------|--------|-------|-------------|----------------|
| 1 | Active | Help Me Find a Design | Tell us what you are looking for and we will search Etsy for designs that may match. | Primary: `Find a design` |
| 2 | Disabled | Create My Design with AI | Choose a design style and tell us what you want the design to include. | Badge: `Coming soon` |
| 3 | Disabled | Fresh Prints Assisted Creation | Send Fresh Prints the details for a design you would like us to help create. | Badge: `Coming soon` |

Disabled cards: no navigation, no data writes, proper `disabled` / `aria-disabled` semantics, visible focus, not broken-looking.

### 3. Questionnaire (exactly two content screens + review)

**Screen 1 — What are you looking for?**

- Field: `description` (required, multiline)
- Label: `Describe the design you want`
- Helper: `Describe the subject, phrase, occasion, role, character, team, theme, or idea you want to find.`

**Screen 2 — Search details**

- Field: `wording` (optional, multiline) — Label: `Wording to search for` — Helper: `Enter any words or phrase you want included in the search.`
- Field: `mustHaveDetails` (optional, multiline) — Label: `Other must-have details` — Helper: `Include any colors, names, dates, characters, teams, family roles, occasions, or other details that matter.`
- Do not promise exact phrase presence in every listing.

**Review**

- Show: route title, description, wording if set, must-have details if set
- Hide empty fields / encoded URLs / internal tokens
- Primary: `Search Etsy`
- Secondary: `Edit details`

**Do not ask:** AI style, composition, garment, print size, references, rights/IP, staff creation, payment, etc.

### 4. Clean request contract

Version field: **`schemaVersion: 1`** (number). Constant: `ETSY_RECOMMENDATION_SCHEMA_VERSION = 1`.

Rationale: repository has no established `schemaVersion`/`answersVersion` convention; prompt prefers `schemaVersion`. Named constant mirrors upload terms-version style.

```ts
interface EtsyRecommendationRequest {
  id: string;
  schemaVersion: 1;
  customerId: string;
  customerUid: string; // auth uid for rules/ownership (match upload patterns)
  route: "etsy_recommendations";
  status: "active" | "completed" | "cancelled";
  answers: {
    description: string;
    wording?: string;
    mustHaveDetails?: string;
  };
  canonicalQuery: string;
  etsySearchUrl: string; // derived from canonicalQuery; safe to store (not a secret)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Collection:** `etsyRecommendationRequests`  
**Why not planned `customRequests`:** that DATA_MODEL sketch includes fees, in-house queue fields, and a different questionnaire model. Phase 9A is Etsy-recommendations-only; keep a clean first collection. Document deferred AI/Assisted as future phases. Update DATA_MODEL accordingly.

**Lifecycle (minimal):**

- Draft stays in `localStorage` until submit
- **One active** request per customer
- If an `active` request already exists and the customer submits a **new** questionnaire (`Search Etsy` from review), Portal must show an explicit confirmation before calling submit to replace/reopen that active search
- **Search again** on the results page for the same `requestId` does not require replace confirmation
- Edit search returns to the questionnaire (draft/prefill from current answers); submitting then follows the same replace-confirm rule when an active doc already exists
- Customer may mark `completed` (`Done`) or `cancelled`
- Completed/cancelled remain historical; **no large history UI** in 9A (optional tiny “resume active” if one exists on entry)
- No production/approval/proof/payment statuses

**Writes:** Admin SDK via callables only. Clients read own docs.

### 5. Canonical query builder

**One query only.** No Best Matches / More Results / fallback variants.

Inputs: `description` + optional `wording` + optional `mustHaveDetails`.

Algorithm (deterministic, unit-tested):

1. Trim each field; collapse internal whitespace to single spaces
2. Drop empty optionals
3. Concatenate non-empty parts in order: description, wording, mustHaveDetails (space-separated)
4. Tokenize on whitespace; remove exact duplicate tokens case-insensitively while preserving first-seen order and original casing of first occurrence
5. Preserve multi-word phrases as entered (no AI rewriting; no DTF jargon injection)
6. Enforce max length (e.g. 200 chars) with word-boundary trim if needed
7. Return `canonicalQuery` string

Then:

- `etsySearchUrl = https://www.etsy.com/search?q=${encodeURIComponent(canonicalQuery)}`
- API `keywords` = same `canonicalQuery` (not re-derived from URL)

Tests must prove: decode URL `q` === canonical query sent to Etsy client.

Customer copy may say **Open this search on Etsy** — never promise identical result sets/ordering vs Etsy.com.

### 6. Official Etsy API findings

Sources consulted (official / OpenAPI-derived client docs):

| Item | Finding | Status |
|------|---------|--------|
| Active listings search | `GET /v3/application/listings/active` (`findAllListingsActive`) | Verified from OpenAPI client reference |
| Host | `https://api.etsy.com/v3/` or `https://openapi.etsy.com/v3/` | Official Request Standards |
| Auth header | `x-api-key: keystring:shared_secret` on every request | Official Authentication / Request Standards |
| OAuth for this op | Public application search; OAuth required for scoped private endpoints — **not required for active listing search** | Verified from official auth docs + endpoint nature |
| Keyword param | `keywords` | Verified |
| Limit | Server-fixed (request e.g. 25, display max 12 after normalize); API max 100; never client-configurable | Verified max 100 |
| Sort | **Locked:** `sort_on=score` for keyword relevance (Etsy requires search options for sort); not client-configurable | Locked by Review |
| Images / shop on search | `findAllListingsActive` OpenAPI params do **not** include `includes` | Verified |
| Batch hydration | `GET /v3/application/listings/batch` (`getListingsByListingIds`) supports `includes=Images,Shop` | Verified |
| Price fields | Expect money-like fields on listing/hydration payloads (`amount` + `divisor` + `currency_code` or equivalent). Normalize to `priceAmount` string + `currencyCode`. Mock both present and missing. Confirm exact live field names at smoke without expanding the DTO. | Mock now; `[NEEDS LIVE SMOKE]` field-name confirm |
| Rate-limit headers | Present on Etsy responses (exact header names confirmed at live smoke) | `[NEEDS LIVE SMOKE]` |
| Attribution | Commercial Access criteria require prominent: `The term 'Etsy' is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed or certified by Etsy, Inc.` | Official getting-started / Commercial Access criteria — include in Portal UI |
| Application access | Personal App (or Commercial) required for buyer-facing tools beyond own shop; Seller App is own-shop only | Official docs — **human checkpoint before live calls** |
| Displaying listing content terms | Must follow API Terms of Use (caching, distinction from Etsy, no scraping) | Official — no persistent listing cache in 9A |

**API call budget (max 2 per customer search):**

1. Search: `listings/active?keywords=...&limit=<server>`  
2. Optional hydration: `listings/batch?listing_ids=...&includes=Images,Shop` when search results lack image/shop fields

No pagination. No automatic multi-page fetch. Transient failures return recoverable errors for customer-triggered retry (retry still ≤ 2 calls).

**Result count:** display **12** listings max. Server may request e.g. 15–25 then normalize/filter invalid rows down to 12.

### 7. Callables

| Callable | Purpose | Secrets |
|----------|---------|---------|
| `submitEtsyRecommendationRequest` | Validate answers, build canonical query + URL, create/replace active request | none |
| `searchEtsyRecommendations` | Auth + ownership + load persisted query + Etsy search + normalize | `ETSY_X_API_KEY` |
| `completeEtsyRecommendationRequest` | `active` → `completed` | none |
| `cancelEtsyRecommendationRequest` | `active` → `cancelled` | none |

**Search request (client → server):**

```ts
interface SearchEtsyRecommendationsRequest {
  requestId: string;
}
```

Reject/ignore: raw query, arbitrary URL, listing IDs, sort, limit, offset, pagination tokens.

**Search response:**

```ts
interface SearchEtsyRecommendationsResponse {
  requestId: string;
  canonicalQuery: string;
  etsySearchUrl: string;
  listings: EtsyRecommendationListing[];
  status: "ok" | "empty";
}

interface EtsyRecommendationListing {
  listingId: number;
  title: string;
  listingUrl: string;
  imageUrl: string | null;
  shopName: string | null;
  priceAmount: string | null;
  currencyCode: string | null;
}
```

Errors: structured user-safe codes (`unauthenticated`, `permission-denied`, `not-found`, `failed-precondition`, `resource-exhausted`, `unavailable`, `internal`) without secrets/stack/raw Etsy bodies.

### 8. Secret handling

- Secret name: `ETSY_X_API_KEY` (complete `keystring:shared_secret` value)
- Bind **only** to `searchEtsyRecommendations`
- Injected mock Etsy client for unit tests (no network)
- Live client used only after human secret + access checkpoint

### 9. Rate limiting and caching

Reuse customer-upload pattern conceptually:

- Collection: `etsyRecommendationRateLimits` (server-only; rules deny all client access)
- Per customer/day and per request/day counters for search submissions
- Concurrent search guard (simple lease or in-transaction counter)

Caching:

- No Firestore listing cache
- No raw Etsy response persistence
- Optional in-memory coalescing ≤ 5 minutes (not required for correctness)

### 10. Portal results UI

- Heading: **Etsy recommendations**
- Summary: `Searching for: {canonicalQuery}`
- Grid of up to 12 cards: image / title / shop / price / `View on Etsy` (official URL, new tab)
- Actions: `Edit search`, `Search again`, `Open this search on Etsy`, `Done`, optional `Cancel request`
- Disclosure + trademark statement (text-only)
- States: skeleton loading, empty, API unavailable + retry + direct link, rate-limit wait, graceful missing optional fields
- Images: plain `<img>` (Portal does not use `next/image` remotePatterns today) — no Next config change required

### 11. Draft behavior

- Versioned localStorage key, e.g. `fp.etsyRecommendation.draft.v1`
- Store: step, description, wording, mustHaveDetails
- Resume / start over with confirm
- Clear malformed/old drafts
- No archived-draft compatibility

### 12. Accessibility

Keyboard nav, visible focus, labels, disabled-card semantics, associated errors, focus on step change, accessible loading status, touch-friendly controls, mobile viewport.

### 13. Implementation sequence

1. Fix `functions/.gitignore`; commit needed `functions/src/lib` (exclude archived orphan)
2. Shared types/constants/validation/query/URL utils + tests
3. Functions: submit/complete/cancel + search with mockable client + rate limits + tests
4. Portal feature UI + service + nav + CSS
5. Firestore rules/indexes
6. Docs
7. Automated test matrix
8. Stop for Etsy secret / access checkpoint
9. Dev deploy + bounded live smoke
10. Consolidated visual checkpoint
11. Signoff after PASS

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Shared full sweep | `npx tsx --test "packages/shared/src/**/*.test.ts"` | yes |
| Focused query/validation | `npx tsx --test packages/shared/src/utils/etsyRecommendation*.test.ts` | yes |
| Functions focused | `npx tsx --test functions/src/searchEtsyRecommendations.test.ts functions/src/submitEtsyRecommendationRequest.test.ts` (and related) | yes |
| Functions broader | `npx tsx --test "functions/src/**/*.test.ts"` | yes (document pre-existing failures) |
| Functions build | `npm --prefix functions run build` | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Portal build | `npm run build:portal` | yes |
| Root lint | `npm run lint` | yes (document pre-existing blockers) |
| Firestore rules | Manual review + deploy notes; no formal rules test suite exists | document |
| Emulator live Etsy | **Forbidden** before secret checkpoint; mocked only | — |

Cover matrix from owner prompt: cards, questionnaire, contract, query builder equivalence, authz, mocked Etsy client, results states, regression (Print Requests / uploads / Studio untouched).

### Manual

- [x] One consolidated Portal visual smoke after mocked tests + secret checkpoint + dev deploy (see checkpoint doc at that time)

---

## Human Checkpoints Anticipated

- [x] Etsy developer application / access purpose confirmation (if not resolvable from docs alone)
- [x] Etsy secret configuration in `fresh-prints-dev` (owner responds `ETSY SECRET CONFIGURED` — never paste secret in chat)
- [x] Consolidated visual smoke test
- [x] Production deploy — **not authorized**
- [ ] Migration/backfill — none expected

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Etsy app access insufficient for buyer-facing search | high | Mock-complete implementation; stop before live calls; clear owner instructions |
| `functions/src/lib` gitignore trap | high | Fix `/lib/`; commit required helpers; exclude archived orphan |
| Etsy search results lack images without hydration | medium | Budgeted batch includes Images,Shop |
| API vs website result mismatch | low | Honest copy; shared canonical query only |
| Rate-limit / quota abuse | medium | Server rate limits; reject arbitrary queries |
| Scope creep into AI/Assisted | medium | Disabled cards only; Review gate |

---

## Rollback Plan

- Dev: undeploy new Functions / revert Portal hosting deploy for this feature; rules can deny new collection
- No production deploy in this phase
- Feature is additive; disable nav entry if needed

---

## Documentation Updates Required

- [x] DATA_MODEL.md — replace/clarify planned Custom Requests with Phase 9A `etsyRecommendationRequests`
- [x] BACKEND.md — callables + Etsy secret
- [x] SECURITY.md — secret + disclosure notes
- [x] TESTING.md — new test commands
- [x] ROADMAP.md — Phase 9A in progress / slice definition
- [x] DECISIONS.md — ADR for clean 9A restart + collection choice
- [x] TECH_DEBT.md — gitignore trap; deferred AI/Assisted
- [x] Workflow artifacts + state + CURRENT-STATE

---

## Open Questions

- [x] Resolved by prompt: clean master restart; Etsy-only; one query; schemaVersion 1; disabled AI/Assisted cards; stop points
- [ ] Etsy Personal/Commercial app approval status — **human checkpoint before live API**
- [ ] Whether `ETSY_X_API_KEY` already exists in `fresh-prints-dev` — check at secret checkpoint without reading value

---

## Deferred work (explicit next phases)

1. Create My Design with AI (separate managed phase after 9A signoff — do not auto-start)
2. Fresh Prints Assisted Creation
3. Broader Custom Request fee / staff queue / Studio inbox
4. Multi-query search strategies / pagination (only if product later requires)

---

## Acceptance criteria checklist

Matches owner prompt acceptance list (clean master, one canonical query, server-side API, 12 results, no pagination, secrets safe, Studio/Print Requests/uploads unchanged, visual checkpoint, no production).

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-15-phase-9a-etsy-recommendations-foundation-review.md
- Verdict: **approved** (after amendments addressing `approved_with_changes`)
- Amendments applied 2026-07-15: bottom nav required; Palette icon; Functions lib commit scope + orphan exclusion; `sort_on=score` locked; price normalization notes; replace-active confirmation UX.
