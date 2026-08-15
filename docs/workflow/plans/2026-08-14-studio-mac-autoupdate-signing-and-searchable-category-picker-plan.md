# Plan: Studio 1.0.6 — Mac signing, searchable categories, Staff Gang Sheets, AI Review thumb sync

| Field | Value |
|-------|-------|
| Date | 2026-08-14 |
| Author | Agent |
| Amended | **2026-08-14** — C+D; **2026-08-15** Implement C+D + C corrective; **2026-08-15** Workstream **C shared Staff Gang Sheets** product-flow amendment (this doc) |
| Status | **plan_amended_pending_review** — C shared-sheet amendment; **do not implement until Review approves**; A/B + D prior bindings unchanged; A2 still credential-gated |
| Workflow | managed-phase |
| Goal id | `studio-mac-autoupdate-signing-and-searchable-category-picker` |
| Related | A/B review; C+D amendment review; C+D impl review; C corrective impl review; this C shared-sheet amendment → **formal Review required** |
| Target release | Studio **`1.0.6`** |
| Branch | `feature/studio-1.0.6-mac-signing-and-searchable-category` |
| Impact classification | Studio app + Firebase Rules/Functions/indexes (DEV) only (not FreshForge starter surface) |

---

## Goal

Ship one approved implementation plan for the **next** Fresh Prints Studio release covering two **independently testable** workstreams:

- **Workstream A** — Permanently fix macOS automatic updates that download correctly but fail during Squirrel.Mac install because current Mac builds use ad-hoc signing (`mac.identity: "-"`).
- **Workstream B** — Make Studio category selection searchable (with normal scrolling preserved) on Design edit and AI Review / AI Processing surfaces.

**This Plan phase produces documentation only. No implementation, secrets creation, or release publication.**

---

## Background

| Fact | Source |
|------|--------|
| Current production Studio | **`v1.0.5`** (`apps/studio/package.json` = `1.0.5`; closed goal + CURRENT-STATE) |
| Mac packaging | `apps/studio/electron-builder.json5` → `mac.identity: "-"`, `hardenedRuntime: false`, `gatekeeperAssess: false` |
| Release workflow | `.github/workflows/studio-release.yml` — Mac stable currently **requires** `distribution_mode: internal-unsigned`; `signed` fails closed for Mac until Apple credential phase |
| Prior corrective | Studio 1.0.4 ad-hoc signing fixed Gatekeeper “damaged / CodeResources”; DEPLOYMENT explicitly documented Mac auto-update apply as unsupported until Developer ID |
| Owner failure | Apple Silicon: check → find → download arm64 ZIP OK → Squirrel extract → **`SQRLCodeSignatureErrorDomain`** → UI logs `[studio-update] check failed: unknown` |

Phase alignment: post-release Studio corrective + Studio staff usability refinement. Phase 9 remains parked. Portal / Firebase / Algolia unchanged.

---

## Scope

### In Scope

**Workstream A**

- Persistent Mac signing identity (Developer ID Application)
- Mac release workflow signing + x64/arm64 continuity
- Updater install validation + error classification / UX
- One-time bridge from ad-hoc installs
- Notarization recommendation (same release vs immediate follow-up)
- CI signing verification updates

**Workstream B**

- Searchable category selector on Design edit + AI Review/Processing
- Local in-memory filter of already-loaded category options
- Preserve scroll/browse; keyboard usability
- Small shared UI change (extend existing `Select` or thin category wrapper)
- Focused unit/component tests

**Workstream C** (amendment)

- Staff Gang Sheets via extended `upcomingShows` + reused `showAllocations`
- Show Queue UI tab + Portal/Rules/Functions isolation
- Completion + idempotent next-cycle callable
- Focused Rules/unit/contract tests

**Workstream D** (amendment)

- AI Review left-rail thumbnail background sync from existing `artworkBackgroundHex`
- Renderer-only; no backend refetch

### Out of Scope

- Portal category UI
- Category creation / taxonomy schema / Firestore / Storage / Algolia
- AI prompt / category-generation changes
- Design Library **filter** category dropdown (browse filter, not design-assignment) — unless owner expands scope in review
- Tag search
- Disabling Squirrel signature validation / weakening updater security
- Embedding signing credentials in the repo
- Production publish / DNS / Phase 9 / payments
- Unrelated Studio form-control refactors

---

## Affected Areas

### Architecture Impact

- [x] Details: Studio packaging/signing + main-process updater error mapping; renderer category UI only. No Firebase/API layer changes for Workstream B.

### Security Impact

- [x] Details: Apple Developer ID certificate + GitHub Actions secrets; temporary CI keychain; never log cert material. No relaxation of updater signature checks.

### Data Model Impact

- [x] None (category id/name semantics unchanged)

### Backend Impact

- [x] None (no new APIs). Release workflow / secrets only for A.

### UI / UX Impact

- [x] Details: Category dropdown gains in-menu search on two Studio surfaces; updater failure copy for install/signature failures.

### Migration Impact

- [x] Forward: one-time manual Mac reinstall for currently ad-hoc-signed staff installs before auto-update works.
- [x] Rollback: revert identity to ad-hoc + workflow internal-unsigned (auto-update remains broken); or withhold publish.

---

# WORKSTREAM A — Mac auto-update signing corrective

## A1. Exact root cause

1. **Packaging identity is ad-hoc.** `electron-builder.json5` sets `"identity": "-"`. CI forces `CSC_IDENTITY_AUTO_DISCOVERY=false` and verifies **ad-hoc** via `verify-packaged-mac-codesign.mjs … adhoc`.
2. **Squirrel.Mac requires a persistent signing identity** for cross-version install. After a successful download/extract, Squirrel validates the new `.app` against the running app’s code-signing requirements. Ad-hoc signatures do not provide a stable Developer ID / Team ID chain that satisfies update install validation → **`SQRLCodeSignatureErrorDomain` / “code failed to satisfy specified code requirement(s)”**.
3. **This is not a download/arch/yml bug.** Owner evidence matches: correct arm64 ZIP selected and downloaded; failure is **install/signature**, not feed selection.
4. **Error UX bug compounds diagnosis.** `studioUpdateService.ts` registers `updater.on("error", …)` with hard-coded context `"check"`, so install-time failures are logged/surfaced as check failures (`[studio-update] check failed: unknown`). `toSafeStudioUpdateError` has no `install` context and no signature-failure category.

## A2. Exact files expected to change

| Path | Change |
|------|--------|
| `apps/studio/electron-builder.json5` | Replace ad-hoc `identity: "-"` with Developer ID path; enable `hardenedRuntime` (required for notarization / modern Developer ID Electron); revisit `gatekeeperAssess` |
| `.github/workflows/studio-release.yml` | Mac credential import; allow `distribution_mode: signed` for Mac when secrets present; update codesign verify mode; bump finalize expected version hard-pin (`1.0.5` → next); docs comments |
| `apps/studio/scripts/verify-packaged-mac-codesign.mjs` | Add `developer-id` expected mode (Authority Developer ID Application; Team ID set; reject ad-hoc for signed builds) |
| `.github/workflows/studio-release-signing-policy.test.ts` | Update assertions for Developer ID path + Mac signed policy (current file still asserts some `1.0.4` Mac wording vs workflow `1.0.5` — reconcile during implement) |
| `apps/studio/electron/ipc/studioUpdate/studioUpdateService.ts` | Track updater phase (`check` / `download` / `install`); pass correct context into error handler; set install phase around `quitAndInstall` |
| `apps/studio/electron/ipc/studioUpdate/studioUpdateService.test.ts` | Phase/context coverage |
| `packages/shared/src/studioUpdate/studioUpdateErrorMapping.ts` | Add `install` context + `install-failed` (and optional signature-specific safe category); map structural codes only |
| `packages/shared/src/studioUpdate/studioUpdateErrorMapping.test.ts` | New cases |
| `apps/studio/package.json` | Version bump to next release (recommend `1.0.6`) |
| `docs/standards/DEPLOYMENT.md` | Replace ad-hoc Mac auto-update limitation with Developer ID (+ notarization status) |
| Mac smoke / release checklists under `docs/workflow/reviews/` | Fresh checklists for signed N→N+1 |
| Optional | Small CI helper script for keychain import if not inlined in workflow |

**No existing dedicated Mac notarization script** was found in-repo (search covered signing/notarization scripts). Notarization, if included, uses electron-builder / `@electron/notarize` conventions driven by env secrets — introduce only as needed.

## A3. Signing architecture

```
Apple Developer Program
  └─ Certificate: Developer ID Application (Fresh Prints)
        └─ Export .p12 (private key + cert) — owner machine / secure store
              └─ GitHub Actions encrypted secrets (never in git)
                    └─ macos-latest job: temp keychain → import → unlock
                          └─ electron-builder --mac (arm64 then x64)
                                └─ same identity on both arches
                                      └─ verify-packaged-mac-codesign developer-id
                                            └─ (optional) notarize + staple DMG/ZIP/.app
                                                  └─ merge latest-mac.yml → draft release
```

**Bundle ID:** keep `appId: "com.freshprints.app"` unchanged (required continuity).

**Preferred identity:** **Apple Developer ID Application** (not Mac App Store, not ad-hoc, not development signing).

**Same identity across:** arm64 package, x64 package, and successive versions N and N+1.

## A4. Secret requirements (names are planned; values never created in Plan)

Minimum for **Developer ID signing** (electron-builder conventional):

| Secret | Purpose |
|--------|---------|
| `MAC_CSC_LINK` or `CSC_LINK` | Base64-encoded `.p12` (or documented equivalent) containing Developer ID Application + private key |
| `MAC_CSC_KEY_PASSWORD` or `CSC_KEY_PASSWORD` | Password for the `.p12` |

Prefer **Mac-prefixed** secret names (`MAC_CSC_*`) to avoid colliding with Windows `WINDOWS_CSC_*` / `WIN_CSC_*` already used in the workflow.

Optional for **notarization** (if same corrective):

| Secret | Purpose |
|--------|---------|
| `APPLE_API_KEY` (contents) + `APPLE_API_KEY_ID` + `APPLE_API_ISSUER` | Preferred App Store Connect API key path |
| *or* `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` + `APPLE_TEAM_ID` | Alternate Apple ID notarization path |

**Never:** commit `.p12`, passwords, API keys; print secrets in logs; store secrets in Firestore/settings/app code.

## A5. Certificate import lifecycle (CI)

On each `build-macos` run when `distribution_mode=signed` (stable signed path):

1. Create a temporary keychain with a random password.
2. Import the `.p12` from the secret into that keychain.
3. Configure keychain search list / partition list so `codesign` / electron-builder can use the identity non-interactively.
4. Set `CSC_LINK` / `CSC_KEY_PASSWORD` (or electron-builder-equivalent env) for the packaging steps only.
5. Package arm64, then x64, each verifying Developer ID signature.
6. **Always** delete/cleanup the temporary keychain in a `if: always()` step so credentials do not linger on the runner.

Prerelease/validation builds may remain ad-hoc **or** use the same signed path when secrets exist — decide in review: recommendation = **prerelease may stay ad-hoc for cheap validation**, but **any build intended to prove N→N+1 updater must be Developer ID signed**.

## A6. Developer ID recommendation

**Adopt Developer ID Application as the permanent Mac production signing identity.**

Rationale: only path that makes Squirrel.Mac cross-version install valid without disabling signature checks (forbidden). Matches prior DEPLOYMENT / smoke checklist deferral notes.

## A7. Notarization recommendation

| Option | Pros | Cons |
|--------|------|------|
| **A — Same corrective** | Staff Gatekeeper friction largely resolved with signing fix | Extra Apple credentials + CI time; more human checkpoints |
| **B — Immediately following gated step** | Unblocks auto-update sooner if notarization creds lag | Fresh installs may still need Open Anyway until B ships |

**Plan recommendation:** Prefer **notarization in the same next Studio release if App Store Connect API credentials can be configured before implement**. If not, ship **Developer ID signing first** (fixes Squirrel) and treat notarization as an **immediately following gated follow-up** — do not block auto-update corrective on notarization alone.

`hardenedRuntime: true` should be enabled with Developer ID (and is required for notarization). Entitlements for Electron (JIT / library validation exceptions as required by electron-builder defaults) must be reviewed during implement — do not invent custom weakenings beyond Electron’s documented notarization profile.

## A8. One-time migration / bridge path

| Population | Path |
|------------|------|
| Current ad-hoc installs (`v1.0.5` and earlier Mac internal builds) | **Cannot** reliably auto-update onto the first Developer ID build. Staff must **manually download and install** the first Developer ID DMG (arch-matched), replacing the ad-hoc app. |
| After first Developer ID install | Auto-update N → N+1 works when both are signed with the **same** Developer ID Application identity. |
| Windows | Unchanged by this workstream (existing Windows signing policy remains). |

Document the bridge clearly in DEPLOYMENT + release notes / smoke checklist. Do not attempt to “patch” ad-hoc→Developer ID via Squirrel.

## A9. Updater test matrix

| # | Test | Pass criteria |
|---|------|----------------|
| 1 | Signing identity verification | `codesign -d -vvv` shows Developer ID Application; Team ID present; not ad-hoc |
| 2 | Bundle ID | Remains `com.freshprints.app` |
| 3 | arm64 package | Strict deep verify OK; sharp arch OK |
| 4 | x64 package | Strict deep verify OK; sharp arch OK |
| 5 | Same identity across arches | Same Authority / Team ID on arm64 and x64 |
| 6 | Same identity across versions | N and N+1 share Developer ID Application Team ID |
| 7 | Updater metadata | Merged `latest-mac.yml` lists both arch ZIPs; arch-safe filenames |
| 8 | Real N → N+1 | Installed Developer ID N finds N+1, downloads, restart, install, relaunch at N+1 |
| 9 | Apple Silicon smoke | Full staff smoke on M-series |
| 10 | Intel Mac smoke | Full staff smoke on Intel (Big Sur 11.7.11 floor unchanged) |
| 11 | Failure UX | Forced/simulated signature or install failure shows install-oriented safe message (not “check failed”) |
| 12 | Ad-hoc bridge | Documented; owner confirms manual reinstall once |

## A10. Error UX correction

1. Extend `toSafeStudioUpdateError` context: `"check" | "download" | "install"`.
2. Add category e.g. `install-failed` with fixed copy such as: *“The update downloaded but could not be installed. Download the latest Mac installer from the approved Releases page, or try again later.”* (final wording in implement/review; never include raw SQRL strings).
3. Map structural signals only: error `name` / `code` / domain markers for code-signature failures (e.g. presence of known updater codes) — **never** forward raw `message` text to renderer (existing security rule).
4. In `studioUpdateService`:
   - Pass `"download"` from download catch (already does).
   - Track current phase so the global `error` event uses `"install"` after `quitAndInstall` / during apply, not `"check"`.
   - Keep logs limited to `safeError.logHint`.
5. Renderer Settings update UI should display the safe `errorMessage` already on state (verify copy is not hard-coded to “check” only).

## A11. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Apple Developer Program / cert not ready | High | Human checkpoint before implement of signing path; Plan remains valid |
| Ad-hoc fleet confused by failed auto-update | Medium | Bridge docs + install-failed UX; optional Settings note for Mac |
| Notarization failures block release | Medium | Prefer Developer ID-first if notarization unstable |
| Hardened runtime / Electron entitlement mismatch | Medium | Follow electron-builder notarization defaults; CI verify before publish |
| Secret mishandling | High | Encrypted secrets only; keychain cleanup; never echo |
| finalize version hard-pin drift | Low | Update workflow pin + signing-policy tests with version bump |
| Scope creep into Windows cert purchase | Low | Windows policy unchanged unless owner expands |

## A12. Human checkpoints (Workstream A)

- [ ] Owner Plan approval (this document)
- [ ] Apple Developer certificate creation / export
- [ ] GitHub Actions Mac signing secret creation
- [ ] Notarization credential setup (if included)
- [ ] Production branch promotion
- [ ] Stable Studio build + dual-platform smoke
- [ ] Stable Studio publication
- [ ] Manual Mac N→N+1 updater proof + one-time ad-hoc reinstall communication

---

# WORKSTREAM B — Searchable Studio category picker

## B1. Exact existing category-selector surfaces found

| Surface | Role | Category control |
|---------|------|------------------|
| Design Library → Edit design modal | Assign category on approved catalog design | `Select` labeled “Category” |
| Staff Inbox design edit host | Reuses same edit modal | Same as above |
| AI Review / AI Processing workspace | Assign category in “Final Catalog Information” | `Select` labeled “Category” |

**Out of this workstream’s required surfaces (identified, not in owner AC):** Design Library filter bar category dropdown (`DesignLibraryFilterControls`) — also uses shared `Select`, but it filters the library browse, not design metadata assignment.

## B2. Exact file paths

| Path | Role |
|------|------|
| `apps/studio/src/renderer/src/shared/components/Select.tsx` | Shared custom dropdown (listbox + portal menu). **Not** a native `<select>`. Already scrollable (`max-height: 16rem` in `inputs.css`). |
| `apps/studio/src/renderer/src/features/designs/components/DesignFormFields.tsx` | Edit modal category field → `<Select label="Category" name="categoryId" …>` |
| `apps/studio/src/renderer/src/features/designs/components/EditDesignModal.tsx` | Builds `categoryOptions` from `categories` prop (active + current inactive allowed) |
| `apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx` | Passes `categories` into `EditDesignModal` |
| `apps/studio/src/renderer/src/features/staff-inbox/components/StaffInboxDesignEditHost.tsx` | Hosts `EditDesignModal` (inherits fix) |
| `apps/studio/src/renderer/src/features/ai-review/components/AiReviewFormPanel.tsx` | AI Review category `<Select name="aiReviewCategory" …>` |
| `apps/studio/src/renderer/src/features/ai-review/components/AiReviewWorkspace.tsx` | Passes `categoryOptions` into form panel |
| `apps/studio/src/renderer/src/features/ai-review/pages/AiReviewPage.tsx` | Builds options from taxonomy hook |
| `apps/studio/src/renderer/src/features/designs/hooks/useGeneratedDesignLibraryTaxonomy.ts` | Loaded/materialized taxonomy source |
| `apps/studio/src/renderer/src/styles/components/inputs.css` | `.form-select-menu` scroll styles |

**No Combobox component** exists under `apps/studio`. No separate CategoryPicker today.

## B3. Current category data source

| Surface | Source | Notes |
|---------|--------|-------|
| AI Review | `useGeneratedDesignLibraryTaxonomy(user)` → active categories only | Prefers taxonomy materialization / disk cache; fail-closed (no silent empty) |
| Design edit (normal Library browse) | Same generated taxonomy via `DesignLibraryPage` `categories` (= `displayCategories`) | Same architecture |
| Design edit (archived browse) | `useCategories` Firestore list when archived policy loads full taxonomy | Still **preloaded array** into modal options — search remains local |
| Option shape | `{ label: category.name, value: category.id }` (+ “No category” empty value) | IDs/semantics unchanged |

**Legacy note:** Materialization path is primary; Firestore list is fallback / archived-management path. Plan does **not** redesign taxonomy. Search filters the **already-built options array** only — no per-keystroke Firestore.

## B4. Shared vs duplicated

- **Shared primitive:** both surfaces already use `Select`.
- **Duplicated wiring:** each builds `categoryOptions` locally (acceptable).
- **Warranted approach:** extend `Select` with an optional **`searchable`** mode (default `false`) and enable it only on the two Category fields. Do **not** enable on Placement or unrelated selects.
- Alternative (also acceptable): thin `CategorySelect` wrapper around searchable `Select` API — only if implement prefers isolating category-only copy (“Search categories…”, “No categories found”). Avoid a new component library.

## B5. Proposed searchable-picker UX

When `searchable` Category select opens:

```
Category
┌─────────────────────────────┐
│ Search categories...        │  ← small input at top of popup
├─────────────────────────────┤
│ Animals                     │  ← full list when query empty
│ Anime                       │
│ … scrollable …              │
└─────────────────────────────┘
```

Typing `chr` filters labels case-insensitively / partial match → e.g. Christian, Christmas. Clearing restores full list. Empty results → quiet “No categories found”. Selecting closes menu and writes the same `value` (category id or `""`) as today. Reopen shows current selection label on the trigger. Prefer **clearing search query on close** so reopen is never stuck filtered.

Scrolling remains first-class; search is never required.

## B6. Shared component warranted?

**Yes, narrowly:** one searchable enhancement on existing `Select`, consumed by:

1. `DesignFormFields` Category field  
2. `AiReviewFormPanel` Category field  

No broad form-system rewrite.

## B7. Filtering behavior

- Case-insensitive `label.includes(query)` (or equivalent) on display name only
- Immediate / local / sync — no debounce-required network
- Does not mutate taxonomy, create categories, change IDs, or touch AI suggestion generation (`AiReviewSuggestionsSection` unchanged)
- Active/authorization rules remain whatever options the parent already passed
- “No category” option: keep visible when query empty; when filtering, include only if its label matches (or always keep at top — implement chooses; document in review). Prefer: filter like other options; empty query shows it first as today.

## B8. Keyboard behavior

Preserve/enhance existing `Select` keyboard model:

- Open via click / Enter / Space / Arrow
- On open with searchable: focus search input
- Typing filters
- ArrowUp/ArrowDown move highlight within **filtered** list
- Enter selects highlighted
- Escape closes (and clears search)
- Selected option remains `aria-selected` / visual selected state
- Do not build a command palette

Note: `AiReviewFormPanel` currently passes `onFocus`/`onBlur` into `Select`, but `Select` does not declare those props — pre-existing no-op. When extending `Select`, either wire focus/blur for shortcut suppression or leave unchanged if out of scope; do not break AI Review shortcut gating.

## B9. Tests (Workstream B)

| Area | Approach |
|------|----------|
| Filter helper / Select searchable logic | Unit tests: empty query, case-insensitive, partial, no results, clear restores |
| Selection semantics | Selecting filtered option emits same `value` as unfiltered |
| Search reset | Close clears query |
| Surfaces | Lightweight contract tests or component tests asserting Category fields pass `searchable` |
| Non-regression | Placement / other Select usages remain non-searchable |
| No taxonomy reads | Assert no service calls in filter path (pure function) |

Repo checks: `npm run lint`; Studio `npx tsc --noEmit` from `apps/studio/`; focused `npx tsx --test …`; `git diff --check`.

## B10. Confirmation: no backend / taxonomy change required

**Confirmed.** Category search is a renderer filter over already-loaded `SelectOption[]`. Taxonomy materialization, Firestore category docs, AI enrichment, and design `categoryId` field semantics stay unchanged.

---

## Combined approach (implementation sequencing)

After Plan **owner approval** + Review approval:

1. **Workstream B first (optional but recommended for parallel safety)** — pure renderer; no Apple secrets; separately testable in `dev:studio`.
2. **Workstream A** — after Apple cert + GitHub secrets human checkpoint:
   - electron-builder + workflow + codesign verifier
   - updater error mapping
   - version bump to next (`1.0.6` recommended)
   - DEPLOYMENT / smoke docs
3. **Test** — unit/policy tests; Mac signed CI prerelease validation; owner manual QA for category UX; Mac N→N+1 + Intel/Apple Silicon smoke.
4. **Promote / publish** — separate human checkpoints (unchanged Studio release gates).

Either order is acceptable if A is blocked on credentials; **do not block B on Apple**.

---

## Combined acceptance criteria

### Workstream A

- [ ] Mac production packages use Developer ID Application (not ad-hoc) for the next stable Studio release
- [ ] arm64 + x64 share the same signing identity / Team ID
- [ ] CI fails closed if Developer ID verification fails on signed builds
- [ ] Secrets only in GitHub Actions; no credentials in repo
- [ ] Real N→N+1 auto-update succeeds on Developer ID installs
- [ ] Ad-hoc → Developer ID one-time manual bridge documented
- [ ] Install/signature failures no longer mislabeled as “check failed”
- [ ] Squirrel validation not disabled
- [ ] Notarization included **or** explicitly deferred with follow-up gate recorded

### Workstream B

- [ ] Design edit modal category selector searchable
- [ ] AI Processing / AI Review category selector searchable
- [ ] Both still allow normal scrolling
- [ ] Search input in open picker; empty search = full list
- [ ] Case-insensitive partial filter; clear restores list
- [ ] Quiet no-results state
- [ ] Selection stores same category id semantics
- [ ] Selected value displays correctly on reopen
- [ ] Search state does not leak across designs (clear on close)
- [ ] No Firestore per keystroke; no taxonomy writes; no new data model
- [ ] AI category generation unchanged
- [ ] Keyboard usability preserved

### Shared release hygiene

- [ ] `npm run lint` / Studio typecheck / focused tests / `git diff --check` as applicable
- [ ] Never claim tests passed without running them
- [ ] No production publish during Plan/Review/Implement without human gate

---

## Test Strategy (summary)

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Lint | `npm run lint` | yes |
| Studio typecheck | `npx tsc --noEmit` (from `apps/studio/`) | yes |
| Signing policy tests | `npx tsx --test .github/workflows/studio-release-signing-policy.test.ts` | yes (A) |
| Updater error mapping | `npx tsx --test packages/shared/src/studioUpdate/studioUpdateErrorMapping.test.ts` (+ service tests) | yes (A) |
| Category/Select unit tests | `npx tsx --test <new focused tests>` | yes (B) |
| Diff hygiene | `git diff --check` | yes |
| Studio packaging | CI `studio-release` prerelease validation | yes before stable (A) |

### Manual

- Category picker UX on Design edit + AI Review (both scroll + search paths)
- Mac Developer ID install + N→N+1 updater
- Apple Silicon + Intel smoke
- Confirm ad-hoc installs instructed to manual-upgrade once

---

## Human Checkpoints Anticipated

- [x] Owner Plan approval (**STOP here**)
- [ ] Review phase approval
- [ ] Apple Developer certificate + GitHub Mac secrets (+ notarization creds if in-scope)
- [ ] Manual UI review (category picker)
- [ ] Production promotion
- [ ] Stable build / smoke / publication

---

## Risks & Mitigations (combined)

| Risk | Severity | Mitigation |
|------|----------|------------|
| Mixing workstreams delays ship | Medium | Keep separately testable; ship B without A if certs lag (version bump strategy agreed in review) |
| Extending `Select` affects non-category fields | Low | Opt-in `searchable`; default false |
| Staff still on ad-hoc after signed release | Medium | Bridge communication + install-failed UX |
| See A11 for signing risks | | |

---

## Rollback Plan

- **B:** Revert searchable Select changes; category assignment remains previous `Select`.
- **A:** Revert to ad-hoc identity + internal-unsigned Mac policy (auto-update remains broken — last resort only); or withhold GitHub Release publish.
- Never “fix” updater by disabling signature validation.

---

## Documentation Updates Required

- [ ] `docs/standards/DEPLOYMENT.md` (Mac signing + updater)
- [ ] `docs/project/DECISIONS.md` (ADR for Developer ID Mac distribution, if review wants)
- [ ] Mac smoke / release checklists
- [ ] `references/project-chatgpt-handoff/CURRENT-STATE.md` at signoff
- [ ] Other: workflow comments / signing-policy tests

---

---

# WORKSTREAM C — Staff Gang Sheets (Plan amendment)

> **SUPERSEDING AMENDMENT (2026-08-15) — Shared Staff Gang Sheets**  
> Sections **C-SHARED-*** below replace the prior **assignment / lane / dual-origin** product model.  
> Keep the implemented architecture: `upcomingShows` + `showAllocations` + Show Queue + export + Portal isolation + complete→next.  
> **Do not implement until Formal Review approves this amendment.**  
> Historical C0–C15 below remain as discovery context; where they conflict with **C-SHARED-***, **C-SHARED-*** wins.

---

## C-SHARED-0. Amendment goal (narrow product-flow correction)

Keep current Staff Gang Sheet architecture, but:

1. Make Staff Gang Sheets **shared** by authorized Studio staff (no assignee).
2. Fix Show Queue **Add Request** eligibility / empty list.
3. Keep **one** Add Request control; remove Staff timer **and** countdown UI.
4. Let Studio Print Requests use existing Add to Show flow with a **Staff Gang Sheet** destination tab.
5. Restrict Staff destinations to **`studio_internal` only**.

Not a rewrite. Not a new collection. Designs still never become queued/printed.

---

## C-SHARED-1. Architecture preserved (exact)

| Piece | Path / behavior | Keep? |
|-------|-----------------|-------|
| Collection | `upcomingShows` with `source: "staff_gang_sheet"` | Yes |
| Allocations | `showAllocations` via `upcomingShowService.allocatePrintRequestItem` | Yes |
| Show Queue UI | `apps/studio/.../upcoming-shows/pages/UpcomingShowsPage.tsx` — tabs **Shows \| Staff Gang Sheets** | Yes |
| Capacity | Omit `maxTotalQuantity` → unlimited via `assessShowCapacity` | Yes |
| Export | `useExportShowZip` / `useExportGangSheetPng` + Electron exporters | Yes |
| Completion | Callable `functions/src/completeStaffGangSheetAndOpenNext.ts` + Studio wrapper | Yes (narrow to shared) |
| Portal isolation | `listPortalAllocatableShows`, `queuePortalPrintRequestToShow`, calendar visibility, Rules | Yes |
| Recently Requested | `onShowAllocationCreated` skip for staff source | Yes |
| Helpers | `packages/shared/src/utils/staffGangSheet.ts` | Yes (tighten origins; drop assignment semantics) |
| Corrective surface selection | `showQueueSurfaceSelection.ts` (URL must not flip Staff → Shows) | Yes |

**Do not add** another collection, allocation model, or Staff-specific request DB.

---

## C-SHARED-2. Current Studio Add to Show flow (discovered)

| Surface | Path | Label today | Modal |
|---------|------|-------------|-------|
| Studio Print Requests | `apps/studio/.../print-requests/pages/PrintRequestsPage.tsx` (~1115–1126) | **`Add to Show`** | Opens `AddToShowModal` |
| Studio Add modal | `apps/studio/.../print-requests/components/AddToShowModal.tsx` | — | Loads `useUpcomingShows`, builds calendar via `@fresh-prints/show-picker` |
| Show Queue Add Request | `UpcomingShowsPage.tsx` → same `AddToShowModal` with `fixedShowId` | **`Add Request`** (header + Attached section) | Fixed-show path |
| Portal | `apps/portal/.../PortalQueueToShowModal.tsx` + callables | Portal copy (“add … to a show’s print run”) — **not** the Studio button string | **Must not** gain Staff tab or Studio label |

**Amendment C3:** Studio Print Requests button only → **`Add to Show / Gang Sheet`**. Portal copy unchanged. Do **not** rename a shared component that would change Portal.

---

## C-SHARED-3. Modal / picker architecture (discovered + narrow extension)

| Layer | Path | Role today |
|-------|------|------------|
| Modal | `AddToShowModal.tsx` | Legs, capacity split, override, celebration; hosts picker |
| Shared calendar | `packages/show-picker` (`ShowPicker`, `buildShowPickerOptions`) | Date-grouped calendar + capacity bars |
| Studio calendar input | `AddToShowModal` `calendarShows` | **Already excludes** `isStaffGangSheetShow` (line ~146–148) |
| Studio allocatable filter | `allocatableShows` | Includes origin gate via `canAllocateOriginToShowSource` |

**Gap:** Staff sheets are stripped from the calendar, so Studio Print Request → Add to Show **cannot** target a Staff Gang Sheet today. Show Queue `fixedShowId` path still can.

**Narrow Studio-only extension (preferred):**

1. Inside `AddToShowModal` only (Studio), when **not** `fixedShowId`, add destination tabs: **Shows** | **Staff Gang Sheet**.
2. **Shows tab:** existing `ShowPicker` + capacity/split/Whatnot behavior unchanged.
3. **Staff Gang Sheet tab:** no calendar; show the single current open Staff sheet (or “No open Staff Gang Sheet”); confirm allocates remaining quantity with **no** capacity/split/override UX.
4. Do **not** auto-create a Staff sheet from this modal.
5. Portal never mounts this modal / these tabs.
6. Prefer **not** teaching generic `ShowPicker` about Staff tabs unless Review finds duplication unavoidable — keep Staff destination UI local to Studio `AddToShowModal`.

---

## C-SHARED-4. Revised minimum Staff Gang Sheet schema

| Field | Status |
|-------|--------|
| `source: "staff_gang_sheet"` | **KEEP** (required) |
| `staffGangSheetCycleNumber: number` | **KEEP** (required, ≥ 1) |
| `whatnotShowId` | **ABSENT** |
| `maxTotalQuantity` | **ABSENT** (unlimited) |
| `assignedStaffUserId` | **REMOVE / no longer required** — stop writing; stop Rules/type requirements; tolerate legacy DEV docs with leftover field until optional cleanup |
| Ownership replacement | **None** — shared staff lane |

Types: `packages/shared/src/types/upcomingShow/upcomingShow.types.ts` (+ enums).  
Rules: `staffGangSheetUpcomingShowFieldsValid` — drop assignee string requirement; create still owner/admin.

---

## C-SHARED-5. Assignment-related code / query / UI to remove

| Area | Exact path | Change |
|------|------------|--------|
| Create lane service | `upcomingShowService.createStaffGangSheetLane` | No assignee input; uniqueness = **one open shared Staff sheet** globally (any open/full/printing staff source), not per helper |
| Create modal UI | `UpcomingShowsPage.tsx` create-staff modal (~1760+) | Remove staff search + Assign Select; create #1 with confirm only |
| Permissions | `permissionService.canManageStaffGangSheetShow` | Any active staff for `source === staff_gang_sheet` (remove `assignedStaffUserId === user.id`) |
| Helper lane filter | `UpcomingShowsPage` (~341) | Remove “my assigned lane” filtering |
| Rules update | `firestore.rules` `staffCanUpdateUpcomingShow` | Allow `isStaff()` on staff sheets with immutable `source` + `staffGangSheetCycleNumber`; drop assignee equality gate |
| Rules create validator | `staffGangSheetUpcomingShowFieldsValid` | Drop required `assignedStaffUserId` |
| Callable | `completeStaffGangSheetAndOpenNext.ts` | Shared N → N+1; no assignee on next; open-lane query by `source` + `productionStatus` |
| Index | `firestore.indexes.json` | Remove `source + assignedStaffUserId + productionStatus`; add `source + productionStatus` **only if** callable/service queries that pair |
| Copy | List/detail “Assigned lane / Assigned · Cycle” | Replace with shared cycle copy (e.g. Cycle N / Staff Gang Sheet #N) |
| Tests | `permissionService.staffGangSheet.test.ts`, `tests/firebase/staffGangSheet.rules.test.ts`, callable tests | Rewrite for shared model |

---

## C-SHARED-6. Why Add Request currently returns no requests (root cause)

**Source path (reused, correct):**

- `useShowQueuePrintRequests` → merges `usePrintRequests("working"|"queued"|"printing")`
- `buildShowQueuePrintRequestOptions` → excludes already-on-show + fully printed
- Staff post-filter in `UpcomingShowsPage` `requestOptions` (~970–989):

```ts
canAllocateOriginToShowSource({ source: selectedShow.source, requestOrigin: request.requestOrigin })
```

**Root causes (compound):**

1. **Strict `requestOrigin` membership** — `canAllocateOriginToShowSource` returns **false** when `requestOrigin` is missing/undefined. Legacy / partially backfilled docs that only have `isInternal: true` never match the allowlist → **all rows dropped**.
2. **Placeholder option dropped** — `{ label: "Choose a request", value: "" }` fails `requests.find` → filter removes it → Select looks **completely empty** (not “no eligible requests”).
3. **Prior product allowlist** included `studio_customer`; owner QA may still see empty if the loaded pages are mostly `portal_customer` or origin-less docs.
4. **Not a missing Staff query** — do not invent a new collection; fix filter + empty-state UX. Optionally resolve effective origin consistently with badge logic (`requestOrigin` else `isInternal` → treat as `studio_internal`) — **Review must confirm** whether inferred internal is allowed; preferred binding for this amendment: **persisted `requestOrigin === "studio_internal"` only**, with clear empty copy when none.

**Also confirmed product gap:** Print Request calendar path cannot pick Staff sheets today (`calendarShows` excludes them) — separate from Show Queue empty Select, addressed by C-SHARED-3.

---

## C-SHARED-7. Revised internal-request query / filter

| Rule | Value |
|------|-------|
| ALLOW | `requestOrigin === "studio_internal"` |
| DENY | `studio_customer`, `portal_customer`, missing/other |
| Apply to | (1) Studio Add to Show / Gang Sheet → Staff tab (2) Show Queue Staff → Add Request options (3) service allocate guard already via `canAllocateOriginToShowSource` |

Update `STAFF_GANG_SHEET_ALLOWED_ORIGINS` in `packages/shared/src/utils/staffGangSheet.ts` to **`studio_internal` only**.

Keep using `buildShowQueuePrintRequestOptions` + origin filter; preserve placeholder option when filtering Staff options.

---

## C-SHARED-8. Studio-only Shows | Staff Gang Sheet picker-tab design

| Tab | Behavior |
|-----|----------|
| **Shows** | Existing `ShowPicker` calendar, capacity, split, Whatnot — no regressions |
| **Staff Gang Sheet** | Display current open shared Staff sheet; allocate eligible `studio_internal` request; no calendar; no capacity/split; if none → “No open Staff Gang Sheet”; create only from Show Queue |

Studio-only. Portal: no tab.

---

## C-SHARED-9. One Add Request button design

Today: **two** identical controls in `UpcomingShowsPage` — detail header (~1177) **and** Attached print requests section (~1565).

**Keep one:** prefer the **detail header** action (same row as Export / Mark Complete — current Show Queue action hierarchy).  
**Remove:** section-header duplicate for Staff (and optionally Whatnot for consistency — prefer remove Staff duplicate only if Review wants zero Whatnot churn; recommendation: **remove the Attached-section button for both** surfaces so hierarchy stays one primary Add Request).

Completed Staff sheets: `canShowAddRequestAction` false (existing allocation block + completed status).

---

## C-SHARED-10. Timer + countdown removal (Staff only)

| Concern | Path | Staff (`source == staff_gang_sheet`) | Whatnot |
|---------|------|--------------------------------------|---------|
| Production timer card | `UpcomingShowsPage.tsx` ~1334–1460 (`show-production-timer-*`, `useShowProductionTimer`) | **Hide entire card** — currently gated only by `canManageUpcomingShows` (Staff incorrectly sees timer) | Unchanged |
| Timer ↔ Mark Complete | Staff **Mark Complete** uses `completeStaffGangSheetAndOpenNext` (~1279), **not** `productionTimer.markFinished` | Completion **not** coupled to timer start; safe to hide timer | Timer finish path unchanged |
| Schedule / “time until show” | List subtitle uses cycle copy; detail hides Whatnot schedule facts for Staff already | Ensure **no** countdown / starts-in / days-hours-minutes / past-show timer copy for Staff | Keep scheduled labels + timer past-show messaging |
| Portal cutoff countdown | `packages/show-picker` `getCutoffMeta` / `showQueueCutoff.ts` | Studio `AddToShowModal` does **not** pass cutoff meta today; Staff tab must not add countdown | Portal unchanged |

**Explicit:** suppress **both** production timer and any schedule-countdown messaging for Staff — do not assume hiding one removes the other.

Lifecycle for Staff: **OPEN → Mark Complete → COMPLETED** (reuse `productionStatus`; no new status model).

---

## C-SHARED-11. Permission changes

| Capability | Behavior |
|------------|----------|
| Owner / admin | Create initial shared Staff #1; manage all; complete |
| Helper | Use shared open Staff sheet (add/export/complete) per existing Staff Show Queue capability — **no** own-lane assignment |
| Customer / Portal | No access |

Express via `permissionService` (narrow `canManageStaffGangSheetShow` / create methods). Do not scatter role checks. Do not weaken Portal Rules.

Callable auth: any staff may complete shared open sheet (not assignee-only).

---

## C-SHARED-12. Completion callable changes

Reuse `completeStaffGangSheetAndOpenNext`:

- Complete current shared #N → create shared #N+1 **without** `assignedStaffUserId`
- Open uniqueness: query `source == staff_gang_sheet` AND `productionStatus == open` (exclude self) — at most one open successor
- Keep TX safety + idempotent retry when already completed + one open next
- Do **not** create a replacement callable

---

## C-SHARED-13. Index changes

| Index | Action |
|-------|--------|
| `upcomingShows`: `source` + `assignedStaffUserId` + `productionStatus` | **Remove** from `firestore.indexes.json` (obsolete) |
| `upcomingShows`: `source` + `productionStatus` | **Add only if** callable/service uses that composite query (expected for open-lane uniqueness) |
| Speculative indexes | **Do not add** |

Production does not yet have Staff feature. After implement: **DEV** index redeploy required. Document in deploy record; no Plan-time deploy.

---

## C-SHARED-14. DEV data reconciliation (do not mutate during Plan)

| Need | Notes |
|------|-------|
| Docs with `assignedStaffUserId` | Extra field OK temporarily if Rules stop requiring it; reads should ignore |
| Preferred cleanup (human-authorized later) | Complete/recreate shared #1 **or** FieldValue.delete assignee on next write; optional one-time DEV script — **not** during Plan |
| Multiple open assigned lanes | May violate new “one open shared” invariant — owner may need to complete extras before create |
| Index | Drop old composite after code no longer queries it |

---

## C-SHARED-15. Exact files expected to change (this amendment)

| Area | Paths |
|------|-------|
| Shared | `packages/shared/src/utils/staffGangSheet.ts` (+ tests); `upcomingShow.types.ts` docs/fields; possibly `productionTimerDiagnostics.ts` |
| Studio service | `upcomingShowService.ts` create/complete/allocate permission paths |
| Studio UI | `UpcomingShowsPage.tsx` (+ CSS if needed); create modal; timer/countdown suppress; one Add Request; shared copy |
| Studio Print Requests | `PrintRequestsPage.tsx` label only |
| Add to Show | `AddToShowModal.tsx` — destination tabs Shows \| Staff Gang Sheet |
| Permissions | `permissionService.ts` + `permissionService.staffGangSheet.test.ts` |
| Functions | `completeStaffGangSheetAndOpenNext.ts` (+ tests) |
| Rules | `firestore.rules` + `tests/firebase/staffGangSheet.rules.test.ts` |
| Indexes | `firestore.indexes.json` |
| Docs | `DATA_MODEL.md`, `DECISIONS.md` (ADR update), this plan |
| Focused tests | Origin filter; modal tabs; permissions; callable shared next; UI one-button / no timer |

**Unchanged unless regression found:** Portal components, ZIP/gang exporters, Recently Requested skip (already staff-aware), Whatnot create/timer.

---

## C-SHARED-16. Revised acceptance criteria (Workstream C)

- [ ] Existing Staff Gang Sheet architecture reused (`upcomingShows` + `showAllocations`)
- [ ] Manual initial Staff Gang Sheet creation remains (Show Queue; no auto-create from Add modal)
- [ ] Creating Staff Gang Sheet requires **no** staff assignment / no assignee picker
- [ ] Staff Gang Sheets are shared by authorized Studio staff
- [ ] `assignedStaffUserId` removed / not required for Staff documents
- [ ] Studio Print Request action says **Add to Show / Gang Sheet**
- [ ] Portal still does **not** use that Studio label / has no Staff tab
- [ ] Studio Add to Show modal contains **Shows** + **Staff Gang Sheet** destinations
- [ ] Shows destination preserves existing calendar / capacity / split
- [ ] Staff destination shows current open Staff sheet (or clear empty message)
- [ ] Staff destination invisible in Portal
- [ ] Staff accepts **`studio_internal` only**; denies `studio_customer` + `portal_customer`
- [ ] Show Queue has exactly **ONE** Add Request action for Staff
- [ ] Add Request lists eligible internals (not empty when eligible docs exist)
- [ ] Allocation continues through `showAllocations`; unlimited capacity preserved
- [ ] Staff detail has **no** production timer and **no** show countdown / time-until-show UI
- [ ] Mark Complete still works; completing #N creates shared #N+1; history retained; idempotent
- [ ] ZIP/gang export continues; Portal isolation + Recently Requested skip intact
- [ ] Ordinary Whatnot Shows do not regress (timer, countdown/schedule, capacity, Portal)

---

## C-SHARED-17. Test plan (focused)

Automated:

- Shared create without assignee; uniqueness one open Staff sheet
- Helper/owner/admin can manage shared sheet; customer cannot
- `STAFF_GANG_SHEET_ALLOWED_ORIGINS` = internal only; customer origins denied
- Add Request option builder keeps placeholder; filters origins correctly
- Studio label vs Portal isolation (unit/contract)
- AddToShowModal destination tabs: Shows calendar unchanged; Staff tab open/empty; no Staff tab when Portal (N/A mount)
- Completion creates unassigned next; idempotency
- Rules: staff update without assignee; create owner/admin; Portal reject staff IDs
- Timer/countdown not rendered for staff source (component contract / render test where practical)
- Portal isolation + Recently Requested regression tests remain green
- Whatnot timer/capacity paths untouched

Manual DEV QA (after Review + implement + authorized DEV redeploy):

- Create shared #1; add internal from Print Request Staff tab; Add Request list populated; one button; no timer/countdown; Mark Complete → #2; Portal cannot see Staff; Whatnot unaffected

---

## C-SHARED-18. Human checkpoints (this amendment)

| Checkpoint | When | Plan action |
|------------|------|-------------|
| Formal Review of this C-SHARED amendment | **Before implement** | Required |
| DEV Rules / Functions / index redeploy | After implement | Owner authorize; not during Plan |
| DEV Staff fixture cleanup (assignee fields / extra open lanes) | If create blocked by legacy opens | Owner; not during Plan |
| Production promote | Later release gate | Forbidden now |
| A2 Apple signing / `MAC_CSC_*` | Separate Workstream A | Still blocked; unchanged |

---

## C-SHARED-19. FreshForge next command

After this Plan amendment is saved:

**`Continue Workflow`** → **Review** this Workstream C shared-sheet amendment  
(or explicit **Review** / `Run Phase` while phase is Review).

**Do not** Implement / Test / Deploy until Review status is `approved` or `approved_with_changes`.

---

## C0. Architecture discovery (exact paths)

### Canonical model

| Concern | Exact path |
|---------|------------|
| `UpcomingShow` type | `packages/shared/src/types/upcomingShow/upcomingShow.types.ts` |
| Enums (`UpcomingShowSource`, `ShowProductionStatus`, …) | `packages/shared/src/types/upcomingShow/upcomingShow.enums.ts` |
| `ShowAllocation` type | `packages/shared/src/types/showAllocation/showAllocation.types.ts` |
| Capacity (`maxTotalQuantity` undefined = **unlimited**) | `packages/shared/src/utils/showCapacity.ts` |
| Allocation eligibility | `packages/shared/src/utils/showAllocationEligibility.ts` |
| Schedule tab / past-show rules | `packages/shared/src/utils/showScheduleGrouping.ts` |
| DATA_MODEL | `docs/architecture/DATA_MODEL.md` |

**Confirmed:** Phase 7 uses **`upcomingShows` as the print run**. No parallel live print-run collection. **`UpcomingShowSource` today is only `"whatnot"`**. No `kind` field exists — **`source` is the existing discriminator**.

**Capacity:** `assessShowCapacity` already treats `maxTotalQuantity === undefined` as unlimited (`isFull: false`). Staff Gang Sheets must **omit** `maxTotalQuantity` — **never** fake `999999` / `MAX_SAFE_INTEGER`.

**Schedule:** Shows **without** `scheduledStartAt` classify as **upcoming** (`getShowScheduleTab`) — suitable for Staff Gang Sheets.

### Studio Show Queue UI

| Concern | Exact path |
|---------|------------|
| Route `/show-queue` | `apps/studio/src/renderer/src/routes/AppRoutes.tsx` |
| Master-detail page | `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx` |
| Add to show modal | `apps/studio/src/renderer/src/features/print-requests/components/AddToShowModal.tsx` |
| Show service (allocations + completion) | `apps/studio/src/renderer/src/features/upcoming-shows/services/upcomingShowService.ts` |
| List/detail hooks | `…/hooks/useUpcomingShows.ts`, `useShowAllocations.ts`, `useExportShowZip.ts`, `useExportGangSheetPng.ts`, `useShowProductionTimer.ts` |
| Gang builder page | `apps/studio/src/renderer/src/features/gang-sheets/pages/GangSheetBuilderPage.tsx` |
| Export main process | `apps/studio/electron/services/export/exportShowZip.ts`, `exportGangSheetPng.ts` |
| Permissions | `apps/studio/src/renderer/src/features/permissions/services/permissionService.ts` (`canViewUpcomingShows` / `canManageUpcomingShows` = **all staff**; settings/import = owner/admin) |

**No separate Show detail page** — detail is the right panel of `UpcomingShowsPage`.

### Portal / Functions isolation points

| Concern | Exact path |
|---------|------------|
| List allocatable shows | `functions/src/listPortalAllocatableShows.ts` |
| Queue request to show | `functions/src/queuePortalPrintRequestToShow.ts` (+ validation lib) |
| Calendar visibility helper | `functions/src/lib/portalCalendarShowVisibility.ts` |
| Portal progress / schedules | `functions/src/getPortalShowPrintProgress.ts`, `getPortalPrintRequestShowSchedules.ts` |
| Portal picker service | `apps/portal/features/print-requests/services/portalShowSelectionService.ts` |
| Portal modal | `apps/portal/features/print-requests/components/PortalQueueToShowModal.tsx` |
| Recently Requested trigger | `functions/src/onShowAllocationCreated.ts` |
| Rules | `firestore.rules` (`upcomingShows` ~1590; `showAllocations` ~1793; `upcomingShowRequiredFieldsValid` requires non-empty `whatnotShowId` + allowlisted keys) |
| Indexes | `firestore.indexes.json` (showAllocations composites; no upcomingShows composite today) |

### Print request origins (for eligibility)

`PrintRequestOrigin` = `studio_internal` | `studio_customer` | `portal_customer` (`packages/shared/src/types/printRequest/printRequest.types.ts`).

---

## C1. Collection decision

| Proposal | Verdict |
|----------|---------|
| New `staffGangSheets` / parallel allocations | **Rejected** — duplicates Phase 7; unjustified |
| Extend `upcomingShows` + reuse `showAllocations` | **Required preferred path** |

**Why reuse works:** production lifecycle, allocations, ZIP/gang export, timer, and Studio master-detail already key off `upcomingShowId`. Discriminator + Portal/Rules filters are sufficient.

---

## C2. Minimum new persisted fields

Prefer expanding existing `source` (already the discriminator) rather than inventing a parallel `kind`.

### Required type / enum changes

| Field | Change |
|-------|--------|
| `UpcomingShowSource` | Expand from `"whatnot"` → `"whatnot" \| "staff_gang_sheet"` |
| `source` | Discriminator on every Staff Gang Sheet document |

### Required new fields on `UpcomingShow` (staff_gang_sheet only)

| Field | Purpose | Why not reuse alone |
|-------|---------|---------------------|
| `assignedStaffUserId: string` | Lane owner (helper). Authorization + “exactly one open cycle per lane” | `createdBy` alone is unsafe if owner/admin completes/creates on behalf of the helper |
| `staffGangSheetCycleNumber: number` | Deterministic labels: “Staff Gang Sheet #N” + unique synthetic identity | Title alone is not durable for idempotent next-cycle creation |

### Reused fields (no duplicates)

| Field | Staff Gang Sheet usage |
|-------|------------------------|
| `productionStatus` | `open` → `printing` (optional) → `completed` / history; **never** drive to `full` via capacity |
| `maxTotalQuantity` | **Omit / leave undefined** (true unlimited) |
| `maxQuantityOverridden` | Keep `false`; hide override UI |
| `allocatedQuantity` | Existing denormalized sum |
| `title` | Display “Staff Gang Sheet #{n}” |
| `scheduledStartAt` | **Omit** (stays “upcoming” for schedule helpers) |
| `whatnotShowId` | **Source-conditional optional (C+D Review binding):** required only when `source === "whatnot"`; **omit** when `source === "staff_gang_sheet"` — **do not** fabricate synthetic Whatnot IDs |
| `whatnotUrl` / Whatnot sync fields | Omit / idle defaults; hide in UI |
| `status` / `syncStatus` | Inert non-Whatnot defaults (`scheduled` / `idle`); hide Whatnot health chrome |
| `isArchived`, timer fields, `createdBy`/`updatedBy`/timestamps | Unchanged semantics |
| `showAllocations.*` | Unchanged allocation schema |

### Rules / allowlist

`upcomingShowRequiredFieldsValid` **must** be amended to:

1. Allow `assignedStaffUserId`, `staffGangSheetCycleNumber` on allowlist
2. Validate `source == "staff_gang_sheet"` with required assignment + cycle fields and **no** required `whatnotShowId`
3. Keep Whatnot path requiring real non-empty `whatnotShowId` unchanged
4. Enforce immutability of `source`, `assignedStaffUserId`, `staffGangSheetCycleNumber` after create
5. **Helper assignment enforcement in Rules** (C+D Review): helpers may only write Staff cycles where `assignedStaffUserId == request.auth.uid`; owner/admin unrestricted for Staff; Whatnot staff writes unchanged in spirit

### Indexes

Studio `listUpcomingShows` is a full-collection fetch with client-side sort — Staff tab history may filter that list in memory (**no speculative history index**).

**C+D Review-approved composite only if implement uses this open-lane uniqueness query (e.g. in complete+next TX):**

```
upcomingShows: source ASC + assignedStaffUserId ASC + productionStatus ASC
```

Query shape: `source == staff_gang_sheet` AND `assignedStaffUserId == <uid>` AND `productionStatus == open`.

Do not add further composites without a real additional query.

---

## C3. Exact files expected to change (C)

| Area | Paths |
|------|-------|
| Shared types/enums/utils | `upcomingShow.types.ts`, `upcomingShow.enums.ts`; capacity/eligibility/schedule helpers as needed; possibly small `isStaffGangSheetShow()` helper |
| Studio service | `upcomingShowService.ts` (create lane cycle, complete+next, list filters, allocate capacity bypass already via undefined max) |
| Studio UI | `UpcomingShowsPage.tsx` (+ CSS); tabs **Shows** / **Staff Gang Sheets**; conditional hide Whatnot/capacity chrome; labels |
| Add-to-show | `AddToShowModal.tsx` — only list eligible Staff cycles when targeting Staff; skip capacity split/override for `staff_gang_sheet` |
| Permissions | `permissionService.ts` + `permission.types.ts` — assignment-aware Staff Gang Sheet capabilities (no hardcoded UID/email) |
| Rules | `firestore.rules` |
| Indexes | `firestore.indexes.json` |
| Functions | `listPortalAllocatableShows.ts`, `queuePortalPrintRequestToShow.ts` (+ validation), `portalCalendarShowVisibility.ts`, `onShowAllocationCreated.ts` (skip Recently Requested bump for staff gang sheet shows), any show-id customer callables |
| Docs | `DATA_MODEL.md`, `DECISIONS.md` (ADR), `BACKEND.md` if needed |
| Tests | Shared capacity/eligibility; Rules tests; Functions unit tests; Studio service/UI contract tests |

**Not expected:** new exporter; new Portal UI; new `staffGangSheets` collection.

---

## C4. Reuse vs new (scope minimization)

| Piece | Reuse? | Why |
|-------|--------|-----|
| `upcomingShows` | Yes | Canonical production batch |
| `showAllocations` | Yes | Authoritative allocations |
| `upcomingShowService.allocatePrintRequestItem` | Yes | Same integrity; capacity path already unlimited when max undefined |
| ZIP / gang PNG export | Yes | Consumes allocations by show id |
| `markShowPrintingFinished` / completion reconciliation | Yes, with staff-specific next-cycle step |
| `UpcomingShowsPage` master-detail | Yes, with tab + conditional chrome |
| `AddToShowModal` | Yes, with filtered targets + no capacity UX |
| New collection/service/exporter | **No** unless Review finds Rules/identity impossible — not expected |

---

## C5. Capacity / allocation behavior

1. Create Staff cycles with **`maxTotalQuantity` omitted**.
2. Never auto-set `productionStatus: "full"` for `staff_gang_sheet`.
3. Hide capacity, remaining, override, and split-due-to-capacity UI for Staff.
4. Preserve non-capacity allocation validation (item identity, permissions, non-canceled targets, etc.).
5. Normal Whatnot shows unchanged.

---

## C6. Permission model

**Existing:** `canManageUpcomingShows` = all active staff (helpers included). Settings/Whatnot import remain owner/admin.

**Proposed minimum:**

| Capability | Behavior |
|------------|----------|
| Owner / admin | View/manage **all** Staff Gang Sheet lanes; create/assign lanes; complete any cycle |
| Helper | View/manage **only** cycles where `assignedStaffUserId === currentUser.id`; add requests; export; mark complete on own open cycle |
| Customer | Never |

Implement via `permissionService` methods (e.g. `canViewStaffGangSheets`, `canManageStaffGangSheet(show)`) — **no** scattered `role ===` checks; **no** hardcoded person identity in source.

**Product decision (narrow):** Who may **create/assign** a new helper lane?

- **Recommendation:** owner/admin only create/assign `assignedStaffUserId`; helpers operate the assigned open cycle.
- Confirm in Review if every helper auto-gets a lane vs explicit assignment.

---

## C7. Portal isolation strategy (hard)

Defense in depth — **not** CSS hide:

1. **Callables:** `listPortalAllocatableShows`, `queuePortalPrintRequestToShow`, progress/schedule readers — **exclude/reject** `source === "staff_gang_sheet"` (and synthetic ids) even if a customer knows the document id.
2. **Calendar helper:** `shouldIncludePortalCalendarShow` must never surface Staff cycles (omit schedule + explicit source filter when reading Admin list).
3. **Rules:** Customers already cannot client-read `upcomingShows`; keep that. Ensure Staff docs remain staff-only.
4. **Recently Requested:** `onShowAllocationCreated` must **not** increment design popularity when parent show `source === "staff_gang_sheet"` (load show in TX or denormalize a safe flag — prefer reading show `source`).
5. **Portal UI:** No Staff cycles in picker DTOs.

Whatnot Portal Add to Show remains unchanged.

---

## C8. Request eligibility recommendation

**C+D Review binding:**

| Origin | Decision |
|--------|----------|
| `studio_internal` | **ALLOW** |
| `studio_customer` | **ALLOW** — Studio “Staff Created” requests (staff-controlled) |
| `portal_customer` | **DENY** |

Do **not** invent a new request-origin type. Portal callables must still reject Staff show IDs.

---

## C9. Completion + auto-cycle design

1. Staff clicks **Mark Complete** on open cycle N (reuse existing finish/complete path where possible).
2. In a **single Firestore transaction** (Studio service and/or trusted callable — prefer transaction in existing service layer; escalate to callable if Rules cannot express atomicity):
   - Assert cycle N is still `open`/`printing` (not already completed)
   - Set cycle N → `completed` (+ existing finish audit fields)
   - Assert **no other** open cycle exists for same `assignedStaffUserId` + `source=staff_gang_sheet`
   - Create cycle N+1 `open` with same `assignedStaffUserId`, `staffGangSheetCycleNumber: N+1`, synthetic `whatnotShowId`, unlimited capacity
3. Idempotency: second click / retry sees N already completed and N+1 present → no-op success
4. Exactly one open cycle per assigned lane (Rules + TX enforce)

**Do not** implement next-cycle as an unguarded React `addDoc`.

History: completed cycles remain queryable via existing `productionStatus` filters / Staff tab history UI.

---

## C10. Export reuse

Reuse `useExportShowZip` / `useExportGangSheetPng` / Electron export services unchanged for allocation consumption. Only branch filenames/labels if they assume Whatnot title/URL. Physical sheet splitting remains existing exporter behavior (unlimited **allocation** capacity ≠ one infinite PNG).

---

## C11. Studio UX

Within Show Queue (`UpcomingShowsPage`):

- Tabs (or equivalent): **Shows** | **Staff Gang Sheets**
- Staff copy: “Staff Gang Sheet #N”, OPEN, request/print counts, Add Request, Export, Mark Complete
- Hide: Whatnot URL/ID, schedule chrome when unused, capacity / available / override / split messaging
- Reuse components with conditional sections — avoid wholesale clones

---

## C12. Workstream C acceptance criteria

> **Superseded by C-SHARED-16** (shared Staff Gang Sheets amendment, 2026-08-15). Historical checklist below is archival only.

- [ ] Reuses `upcomingShows` (no parallel collection)
- [ ] Reuses `showAllocations`
- [ ] Discriminator via expanded `source: staff_gang_sheet` (+ cycle fields; **no** assignee)
- [ ] No fake numeric capacity; Whatnot capacity unchanged
- [ ] Unlimited from capacity perspective; no capacity/split/override UI for Staff
- [ ] Normal allocation integrity preserved
- [ ] Shared staff + owner/admin authorization via permissionService
- [ ] Customers/Portal never see Staff cycles; callables reject IDs
- [ ] Whatnot-specific fields / timer / countdown hidden in Staff UI
- [ ] Existing gang-sheet/ZIP export reused
- [ ] Mark Complete preserves history; auto-creates next **shared** open cycle
- [ ] Completion/next-cycle idempotent; one open shared Staff sheet
- [ ] No parallel Print Request production state; designs never queued/printed
- [ ] Whatnot Show Queue does not regress

---

## C13. Migrations / indexes / rules

| Change | Notes |
|--------|-------|
| Rules | Shared staff validators; drop assignee requirement; Portal isolation unchanged-or-strengthened |
| Indexes | Replace assignee composite with `source` + `productionStatus` if queried |
| Data migration | No production Staff data; optional DEV assignee cleanup (human) |
| Functions deploy | Required for callable + Portal filters before production use |

---

## C14. Risks (C)

| Risk | Severity | Mitigation |
|------|----------|------------|
| Accidentally listing Staff shows in Portal | High | Multi-layer filters + callable reject + tests |
| Recently Requested polluted by Staff allocations | Medium | Skip bump when show source is staff_gang_sheet |
| Synthetic `whatnotShowId` confuses Whatnot import | Medium | No synthetic IDs; import upsert only `source=whatnot` |
| Helper authorization too broad/narrow | Medium | Shared staff capability via permissionService + Rules |
| Completion race creates two open cycles | High | Transaction + uniqueness assert on shared open query |
| Schedule/past helpers regress Whatnot | Medium | Staff omits `scheduledStartAt`; keep Whatnot paths unchanged |
| Empty Add Request list | High | Fix origin filter + placeholder; `studio_internal` only |

---

## C15. Human checkpoints (C)

> Prefer **C-SHARED-18**. Historical list updated:

- [ ] Formal Review approval of **C-SHARED** amendment before implement
- [x] Lane assignment model — **resolved: shared, no assignee**
- [x] Request origins — **resolved: `studio_internal` only**
- [ ] DEV Rules/Functions/index redeploy after implement (owner authorize)
- [ ] Optional DEV fixture cleanup for assignee / multiple open lanes
- [ ] Production Rules/Functions deploy before prod reliance
- [ ] Manual Studio QA for Staff tab + Whatnot regression
- [ ] A2 Apple signing remains separately blocked

---

# WORKSTREAM D — AI Review left-rail background preview sync (Plan amendment)

## D0. Architecture discovery (exact paths)

| Concern | Exact path |
|---------|------------|
| Page | `apps/studio/src/renderer/src/features/ai-review/pages/AiReviewPage.tsx` |
| Workspace (main preview) | `apps/studio/src/renderer/src/features/ai-review/components/AiReviewWorkspace.tsx` |
| Left list | `apps/studio/src/renderer/src/features/ai-review/components/AiReviewQueueList.tsx` |
| Thumb component | `apps/studio/src/renderer/src/features/designs/components/DesignThumbnailPanel.tsx` |
| Preview mat control (immediate save) | `apps/studio/src/renderer/src/features/designs/components/ArtworkBackgroundPreviewControl.tsx` |
| Form mat fields | `apps/studio/src/renderer/src/features/designs/components/ArtworkBackgroundFields.tsx` |
| Inbox state | `apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts` (`draftForm`, `liveDesign`) |
| Resolve helpers | `apps/studio/src/renderer/src/features/designs/utils/designFormMapper.ts` (`resolveFormArtworkBackgroundHex`, …) |
| Shared constants | `packages/shared/src/constants/design/artworkBackground.constants.ts` |
| Persisted field | `designs.artworkBackgroundHex` |

**Root cause:** Main preview passes `artworkBackgroundHex={previewArtworkBackgroundHex}` into `DesignThumbnailPanel`. Left list mounts `DesignThumbnailPanel` **without** that prop → theme default mat only.

**Persistence unchanged:** `artworkBackgroundHex` on the design; draft uses preset + custom hex. Preview control already saves and updates `liveDesign` in memory.

---

## D1. Proposed minimal change

1. Resolve the **selected** design’s effective mat the same way the workspace does (draft preferred → else design).
2. Pass into `AiReviewQueueList`:
   - `selectedDesignId`
   - `selectedArtworkBackgroundHex` (resolved)
   - and/or per-row `design.artworkBackgroundHex` for non-selected rows (optional polish; selected sync is required)
3. `AiReviewQueueList` → `DesignThumbnailPanel artworkBackgroundHex={…}` for the matching row.
4. **No** list refetch, taxonomy reload, derivative generation, or new API.

---

## D2. Exact files expected to change (D)

| Path | Change |
|------|--------|
| `AiReviewQueueList.tsx` | Accept/pass mat hex props |
| `AiReviewPage.tsx` and/or `AiReviewWorkspace.tsx` | Wire resolved selected hex into list |
| Focused tests | Contract/unit: selected row updates; others unchanged |
| Optional CSS | Only if thumb needs existing `--color-artwork-preview-bg` tweak (prefer none) |

**Out of scope unless free via shared helper:** Design Library grid, Portal thumbs.

---

## D3. Workstream D acceptance criteria

- [ ] Main preview background selection unchanged
- [ ] Changing selected background immediately updates that design’s left thumb
- [ ] No refresh/navigation required
- [ ] Only matching row updates; others unchanged
- [ ] Same effective color as main preview
- [ ] Switching designs preserves per-design behavior per existing save semantics
- [ ] No new derivatives / artwork mutation / Firestore list refetch / new API
- [ ] Persistence semantics unchanged
- [ ] AI Review navigation tabs do not regress

---

## D4. Tests (D)

Automated:

- Selected hex prop reaches queue thumb
- Successive color changes
- Unrelated rows unchanged
- Switch selection restores correct per-design mats (draft vs persisted)

Manual QA (owner):

1. Open AI Review → select transparent design  
2. Note left thumb → change background → main + left update immediately to same color  
3. Select another design → independent  
4. Return to first → correct per current save behavior  

---

## D5. Risks (D)

| Risk | Severity | Mitigation |
|------|----------|------------|
| Draft vs saved mismatch on non-selected rows | Low | Selected uses draft resolve; others use `design.artworkBackgroundHex` |
| Over-scoping Library thumbs | Low | Explicit out of scope |

---

## Combined 1.0.6 sequencing (amended)

Current state (2026-08-15):

1. **B** — **implemented**; owner DEV QA **PASS**  
2. **D** — **implemented**; owner DEV QA **PASS** (not pending Review)  
3. **C** — prior Staff Gang Sheet implementation + corrective exist; **C-SHARED** product-flow amendment is **Plan-amended**, awaiting **Formal Review** (then Implement → authorized DEV deploy as required → owner QA). Do **not** treat C as waiting on the historical C+D Review.  
4. **A1** — done  
5. **A2** — Apple credential-gated (`MAC_CSC_*` / Developer ID) — **unchanged**  
6. **Combined Test → Signoff → promote/publish** — only after revised C (C-SHARED) is implemented, DEV-deployed as required, and owner QA passes; preserve prior A/B/D bindings  

---

## Open Questions

### A/B (prior — partially resolved)

- [x] Studio version **1.0.6** (review-bound; package pinned in implement slice)
- [ ] Notarization same-release vs follow-up at A2 checkpoint
- [x] `MAC_CSC_*` naming
- [x] Design Library filter Category searchable — **no**

### C (C-SHARED binding — resolved)

Obsolete assignment / dual-origin open questions are **closed**. Binding decisions:

- [x] Staff Gang Sheets are **shared** by authorized Studio staff — **no assignee** / no `assignedStaffUserId` requirement
- [x] Manual initial creation remains (owner/admin creates #1 from Show Queue; no auto-create on first allocation or from Add modal)
- [x] Eligibility: **`studio_internal` only**
- [x] **`studio_customer` denied**
- [x] **`portal_customer` denied**
- [x] Staff allocations do **not** affect Recently Requested

No new unresolved C product questions from this amendment.

### D (closed)

- [x] Implemented; owner DEV QA **PASS** — **not** pending Review; do not reopen

---

## Approval

### A/B (unchanged)

- Review doc: docs/workflow/reviews/2026-08-14-studio-mac-autoupdate-signing-and-searchable-category-picker-review.md
- Verdict: **approved_with_changes** (2026-08-14) — **still binding**

### C+D amendment (historical — completed)

- Review doc: `docs/workflow/reviews/2026-08-14-studio-1.0.6-workstreams-c-d-plan-amendment-review.md`
- Verdict: **approved_with_changes** (historical)
- C+D Implement + impl reviews + C corrective: completed history (see workflow state / review docs)
- **D:** closed for Review purposes — implemented + owner QA PASS; **do not reopen**

### C-SHARED amendment (current)

- Plan: **amended** (sections **C-SHARED-*** in this document)
- Formal Review: **pending**
- Implementation: **blocked** until Review status is `approved` or `approved_with_changes`

---

## Next FreshForge command after this Plan amendment

```text
Continue Workflow
```

→ **Formal Review of the C-SHARED amendment ONLY** (preserve all prior A/B/D bindings).  
**STOP** — no C-SHARED implementation, Test, or Deploy in this step. Do not reopen B or D. A2 remains Apple credential-gated.