# Decisions and Constraints

> Full log: `docs/project/DECISIONS.md` — newest ADRs first.

### ADR-FP-160: AI enrichment visible-text and catalog-copy quality (DEV signed off 2026-09-03)

- `visibleText` is semantic short intentional wording — not a raw OCR transcript
- Background/document text understood but not bulk-transcribed; Class C OCR fragments suppressed
- Titles describe what the design is; descriptions summarize (anti-OCR guards + AI-only sanitizer)
- Primary typography and false-positive-safe strings preserved (dates, scripture, `Smith & Co.`, etc.)
- Prompt **catalog-enrich-v32** / normalizer **smart-profile-normalizer-v6**; schema **smart-profile-v1**
- Subject canonicalization (ADR-FP-145 / v31/v5) preserved; Autonomous **OFF**

### ADR-FP-145 amendment (2026-09-03 — DEV signed off)

- Canonical/base depicted subjects required; redundant action/style/color/OCR/type-class phrases suppressed
- Genuine atomic compounds preserved; no curated subject allowlist
- AI collapse does not override staff edits or import presets
- Prompt **catalog-enrich-v31** / normalizer **smart-profile-normalizer-v5** (live stack now v32/v6; subject contract retained)

### ADR-FP-159: Customer-specific temporary Print Request + Show quota override (DEV signed off 2026-09-02)

- Optional `customers/{id}.printRequestQuotaOverride`; effective = active override ?? current global; clock expiry (no scheduler)
- Owner-only callable; Rules immutable; Portal consumers use effective limits; staff bypass preserved
- Studio Edit Customer → Quota Override: **linked** Temporary quota default; **Set independently** for unequal dimensions; Users active badge
- Audit: `account.quota_override_set` / `_cleared`; Cap A stays retired
- Production promotion deferred (include post-corrective callable)

## Roadmap sequencing (2026-08-31 — not an ADR)

Print Request **sizing + interactive upscale** (`print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale`) **DONE on DEV** (signoff 2026-08-31). **Smart Profiling** remains the next major candidate — **not started**. Production promotion separately gated.

### ADR-FP-080 amendment (2026-08-31 — accepted)

- Configurable Print Request default width (**10″** system fallback); **15″** automated import/upload target (`image-quality-v3`)
- Interactive upscale: one derivative per lineage; Studio + Portal; production export parity; non-destructive baseline

---

## Customer identity program — WS1–WS4 complete (DEV — 2026-08-30)

| Workstream | ADR / signoff | Status |
|------------|---------------|--------|
| WS1 Identity foundations | ADR-FP-150, ADR-FP-151, ADR-FP-148 | **DONE** |
| WS2 Transfer Username | ADR-FP-153 | **DONE** |
| WS3 Full Account Merge | ADR-FP-154 | **DONE** |
| WS4 Customer Activity + Deep Linking | *(no separate ADR — UI/read model)* | **DONE** |

**Production / coordinated identity promotion: NOT AUTHORIZED.**

### ADR-FP-156: Did Not Print bulk requeue + Needs Re-queue

Show Queue recovery: `requeue_unfulfilled`, `requeuedFromAllocationId` lineage, `needsStaffRequeue*` markers, Working `needs_requeue` triage filter.

### ADR-FP-155: DEV-only Show Queue fixture shows

`DEV-OVERRIDE` sentinel; `source: dev_fixture`; callable `upsertDevFixtureShow`; excluded from Whatnot sync.

### ADR-FP-154: Owner-authorized full customer account merge (WS3)

Resumable `customerMergeJobs`; survivor canonical; `mergedSourceCustomerIds`; source tombstone.

### ADR-FP-153: Owner-authorized verified duplicate username transfer (WS2)

`previewDuplicateAccountResolution` / `transferCustomerUsername`; distinct from merge.

### ADR-FP-151: History-free customer hard delete (dev-gated)

### ADR-FP-150: Reversible customer account disable

**Note:** ADR-FP-152 does **not** exist in `docs/project/DECISIONS.md` as of 2026-08-30.

---

## Customer identity — WS1 detail (2026-08-28)

### Account states (product distinctions)

| State | ADR / source | Reversible? | Username | History |
|-------|--------------|-------------|----------|---------|
| **Active** | — | — | Reserved while account exists | Full |
| **Disabled** | ADR-FP-150 | Yes — `restoreCustomerAccount` | Reserved | Full |
| **Closed / tombstoned** | ADR-FP-115 | No via normal Studio Re-enable | **Permanently reserved** | Full |
| **Hard deleted** | ADR-FP-151 | N/A | **Released** (history-free only) | Identity removed; business history must be absent |

**Disable Account** ≠ **Close Account Permanently** ≠ **Delete Account Permanently**.

### ADR-FP-150: Reversible customer account disable

| Constraint | Rule |
|------------|------|
| Fields | `customers.isDisabled`, `disabledAt`, `disabledBy`, `disabledReason?` |
| Callables | `disableCustomerAccount` / `restoreCustomerAccount` (owner) |
| Auth | Disable/enable Firebase Auth; `users.isActive` false/true |
| History | All print/upload history + `customerUsernames` preserved |
| Tombstone | `isDeleted` accounts cannot use disable/restore |

### ADR-FP-151: History-free customer hard delete (dev-gated)

| Constraint | Rule |
|------------|------|
| Callables | `previewHardDeleteCustomerAccount` + `hardDeleteCustomerAccount` (owner) |
| Eligibility | Fail closed — meaningful history blockers prevent Apply |
| Apply scope | Identity/bootstrap only — never cascades print graph |
| DEV gate | Apply on **`fresh-prints-dev` only** until explicit production authorization |
| Username | Released on successful history-free delete |
| Audit | `customerActivityEvents` preview/apply records |

### ADR-FP-115: Tombstone (Close Account Permanently) — unchanged by WS1

| Constraint | Rule |
|------------|------|
| Semantics | `isDeleted`; Auth **disable** (not delete); history retained |
| Username | `customerUsernames` **not** released |
| UI | Closed customers — no Re-enable/Restore in normal flow |

### ADR-FP-148: Portal identity self-service + snapshot propagation

| Constraint | Rule |
|------------|------|
| Portal | `updatePortalCustomerProfile` — 30-day username cooldown |
| Propagation | Snapshot fields on `printRequests` / `designIssueReports` — resumable worker |
| Immutable | `printRequests.name` never updated; `requestOrigin`, `isInternal`, `customerId` unchanged by username propagation |

### ADR-FP-071 + WS1 Portal editability (current behavior — no separate ADR)

| Constraint | Rule |
|------------|------|
| One working request | Per Portal customer among **Portal-editable** continuable requests |
| Portal-editable | `status` draft\|editing + `requestOrigin == portal_customer` + `isInternal != true` |
| `studio_customer` | Customer-owned Studio request — **not** Portal-editable |
| `studio_internal` | Internal requests — not customer Portal path |
| Legacy duplicates | Explicit Portal selection when multiple Portal-editable drafts exist; mutations target selection |
| Studio guard (WS1) | Do not create a second continuable Customer CR; exclude customers with open CR from picker — **new** duplicates blocked; legacy data not auto-repaired |

### Deferred (master plan — superseded)

- ~~WS2 duplicate resolution~~ — **DONE** (ADR-FP-153)
- ~~WS3 full account merge~~ — **DONE** (ADR-FP-154)
- ~~WS4 customer activity cards~~ — **DONE** (2026-08-30 signoff)

---

## Gate I corrective (2026-08-26 — ADR-FP-145)

| Constraint | Rule |
|------------|------|
| Prompt / normalizer | **catalog-enrich-v30** / **smart-profile-normalizer-v4** |
| Subjects | Anti-glue; preserve genuine specificity; no curated allowlist |
| Category | Decision-layer `category_dominant_intent_conflict` (resolver governance unchanged) |
| Subject gaps | Remain **hard** |
| Object soft-lane | Deferred except `daisy`↔`daisies` |
| Live Autonomous / Ready Catalog / prod | Separately gated; Slice 5 closed without enabling them |

Full ADR: `docs/project/DECISIONS.md` (ADR-FP-145).

## Grouped gang sheets (2026-08-23 — ADR-FP-143; three-mode extension 2026-08-27)

| Constraint | Rule |
|------------|------|
| Default | Legacy **efficiency / Standard** when `layoutMode` omitted |
| Sheet per Customer | `layoutMode: "grouped_by_customer"` — one physical sheet per customer nest segment; `whatnot_MM-DD-YYYY_grouped-gang-sheet` |
| Grouped by Customer | `layoutMode: "customer_grouped_continuous"` — continuous multi-customer sheets; `whatnot_MM-DD-YYYY_grouped-continuous-gang-sheet` |
| Grouping key | `customerId` → username snapshot → `internalBaseName` → `printRequestId` |
| Cache | Pairwise distinct fingerprints; do not cross-hydrate modes in modal |
| Labels | Section headings comma-join CR names; `-Continued` on spillover |

Full ADR + follow-up: `docs/project/DECISIONS.md` (ADR-FP-143).

## Public Our Shows (2026-08-22 — ADR-FP-142)

| Constraint | Rule |
|------------|------|
| Browse | Public `/shows` calendar + galleries (catalog designs only) |
| Mutations | Login-gated (Add to Request, qty, etc.) |
| Privacy | Never expose private customer-upload artwork in public DTOs |

Full ADR: `docs/project/DECISIONS.md` (ADR-FP-142).

## Customer → Internal conversion (2026-08-22 — ADR-FP-141)

| Constraint | Rule |
|------------|------|
| Callable | Creates **new** internal request; does not flip `isInternal` on original |
| Original | Archived with `closureKind: converted_to_internal` + linkage fields |
| Allocations | Pending/queued cancel only after confirm; `in_progress+` **blocks** |
| Rules | Closure fields Admin/callable-only |

Full ADR: `docs/project/DECISIONS.md` (ADR-FP-141).

## Studio Print Requests lists (2026-08-21 — ADR-FP-140)

| Constraint | Rule |
|------------|------|
| Discriminator | Persisted `printRequests.isInternal` — not names or `requestOrigin` |
| Customer list | `isInternal == false` (Studio + Portal customers) |
| Internal list | `isInternal == true` |
| Default | Customer Requests |
| Index (DEV) | `isInternal + queueTab + updatedAt DESC + __name__ DESC` on `fresh-prints-dev` |
| Out of scope | Show Queue still sees both kinds; no production index this goal |

Full ADR: `docs/project/DECISIONS.md` (ADR-FP-140).

## Print Request manual sizing (2026-08-20 — ADR-FP-075 / ADR-FP-080)

| Constraint | Rule |
|------------|------|
| Manual save | ≥200 effective DPI and ≤22″ on either side |
| 200–299 DPI | Warn and allow |
| ADR-FP-080 approved-max | Processing and **initial** requested size only — not a later save ceiling |
| Studio Add Designs | Existing items kept by request item ID; default size only for new items |

Full ADRs: `docs/project/DECISIONS.md` (ADR-FP-075, ADR-FP-080).

## Past Printing Finish (2026-08-20 — ADR-FP-139)

| Constraint | Rule |
|------------|------|
| Trigger | Whatnot show is Past (`scheduledStartAt <= now`) and still `printing` |
| Path | Existing `markShowPrintingFinished` (auto + **Mark Complete**) |
| Excluded | Staff Gang Sheets; `open` / canceled / archived / already completed |

Full ADR: `docs/project/DECISIONS.md` (ADR-FP-139).

## Analytics identifiers (2026-08-18 — ADR-FP-138)

| Constraint | Rule |
|------------|------|
| Allowed | PUBLIC catalog design ID after successful public-catalog resolve |
| Allowed locations | Modal virtual path/location; valid share path/location; `design_view` `content_id` |
| Still prohibited | Request / customer / auth / upload / assisted IDs, email, username, filename |
| Sanitizer | `/requests/:id` and unresolved `/share/design/:id` stay templated |

Full ADR: `docs/project/DECISIONS.md` (ADR-FP-138).

## Studio packaging / Mac (2026-08-15)

| ADR | Rule |
|-----|------|
| ADR-FP-136 | A2 Developer ID **declined indefinitely** — no paid Apple Developer Program, no `MAC_CSC_*`, no notarization. Mac remains ad-hoc / `internal-unsigned`; auto-update **install** unsupported. Windows updater unchanged. Revisit only by future explicit owner decision. |

## Repository workflow (2026-08-18 — ADR-FP-137)

| Constraint | Rule |
|------------|------|
| Checkout | Existing `C:\coding\fresh-prints` only |
| Working branch | **`development`** |
| Per-goal branches / worktrees | **Do not create** unless the owner explicitly requests one |
| FreshForge phases | Plan, Review, Implement, Test, DEV QA, Signoff on `development` |
| Promotion | PR `development` → `production` only; never direct push; never force-push protected branches |
| Deploys | App Hosting / production rollouts remain separate human checkpoints after merge |

Full ADR: `docs/project/DECISIONS.md` (ADR-FP-137). Details: `docs/standards/DEPLOYMENT.md`.

## Repository workflow (2026-08-13 closeout)

| Constraint | Rule |
|------------|------|
| Default branch for work | **`development`** (superseded in detail by ADR-FP-137 above) |
| Production tip pin (Studio 1.0.4 P4) | Historical closeout pin — do not reuse as current production tip |
| Promotion | PR into `production` only; never force-push protected branches |
| Cleanup | Prefer archive + prove redundancy before worktree/branch delete; never `git clean -fdx` |

## Platform (immutable without ADR revision)

| Decision | Rule |
|----------|------|
| ADR-FP-008 | Two apps only: Studio + Portal |
| ADR-FP-009 | Three Studio design workspaces: Imports, AI Review, Design Library |
| No native mobile | Portal is responsive web |

## Brand / Settings (recent)

| ADR | Summary |
|-----|---------|
| ADR-FP-114 | Owner-uploaded Studio + Portal brand logos (`settings/brandLogos`, Storage `brand/**`); finalize + display-size callables; AR-locked boxes; separate Portal header/sidebar controls (defaults height 52); soft-deployed fresh-prints-dev; production deploy gated |

## Catalog lifecycle

| Rule | Detail |
|------|--------|
| Design statuses | `imported`, `processing`, `ready`, `rejected`, `archived` |
| Deprecated on designs | `queued`, `printed` |
| Approval | Staff AI Review / catalogApprovalService only |
| Library scope | `ready` only by default |
| ADR-FP-120 (amended 2026-07-31) | Failed portal-catalog publish recovery: Storage retries, catch-up loop, `retryPortalCatalogPublication`; tags/category stay full index-filter republish |

## Print Requests & Portal

| ADR | Summary |
|-----|---------|
| ADR-FP-071 | **One working print request** per Portal customer (among Portal-editable continuable requests; `studio_customer` drafts are not Portal-editable — WS1 DEV 2026-08-28) |
| ADR-FP-106 | **Public browse** + login-gated actions; guest overlay; guest catalog donate via Anonymous Auth + `guest` attribution (rules/Functions/Auth deploy human-gated) |
| ADR-FP-107 | Recently Requested = `lastAddedToShowAt` via `onShowAllocationCreated` (soft-deployed fresh-prints-dev 2026-07-21) |
| ADR-FP-103 | Portal add-to-show **cutoff hours** before show start (Studio Show Queue setting; Functions enforce; Studio staff exempt) |
| ADR-FP-066 | Customers add to shows via callables only; single show; full request; no override/re-queue |
| ADR-FP-065 | Shared `@fresh-prints/show-picker` |
| ADR-FP-064 | Production timer drives customer Printing tab |
| ADR-FP-075 | Standard item saves require **≥ 200 effective DPI**; 200–299 warn; ≥300 no warn |
| ADR-FP-030 | `requestCount` / `lastRequestedAt` are lightweight metadata only |
| — | Portal default catalog browse sorts **`createdAt` desc** (Studio-newest); Popular / Most Liked / Recently Requested keep metric sorts |

## Customer uploads (Phase 8 fast-follow)

| ADR | Summary |
|-----|---------|
| ADR-FP-073 | Customer artwork = `customerUploads`, not designs until staff promote; dual item source model; not Phase 9 |
| ADR-FP-074 | Library permission **optional** (default on); ownership required; staff may promote but must see declines |
| ADR-FP-080 | Pixel-based sizing `image-quality-v2` (≤6× toward 12″; 10″ request default; extended >2× staff-only); **human-only** halftone — no auto detector |
| ADR-FP-014 | Sequential AI Processing queue; no concurrent import enqueue; Auto advance default ON; post-import sequential auto-start when Auto advance on (amended 2026-07-13) |

## Custom Designs

| ADR / decision | Summary |
|----------------|---------|
| ADR-FP-088 | Assisted Creation uses its own request collection and status/proof machine; one open request; owner/admin mutate; helper read-only |
| Owner decision 2026-07-16 | Proof-ready emails use Resend first behind a provider-neutral interface; Brevo is deferred; owner Studio settings eventually select invite and proof-notice providers independently |

## AI enrichment (recent)

| ADR | Summary |
|-----|---------|
| ADR-FP-044 / v21 | Business-context Gemini prompt; server-side tag/category resolve |
| ADR-FP-042 / 043 | Optional tag rerank + suggestion author (defaults off) |
| ADR-FP-040 | Gemini provider (OpenAI path removed) |

## Architecture constraints

- Single Firebase project for Studio and Portal  
- Services / callables own Firebase access — not components  
- Firestore = metadata; Storage = files  
- Studio permissions via `permissionService`  

## FreshForge workflow

```
Plan → Review → Implement → Test → Signoff
```

No implementation without approved plan; no silent scope expansion; human checkpoints block production actions.

## Product out of scope

Ecommerce checkout, shipping, order payment (except optional Phase 9 design fee), customer Studio access, marketplace, native mobile, treating customer PNG uploads as Custom Request Q&A.
