# Plan: Studio Mac auto-update signing + searchable category picker

| Field | Value |
|-------|-------|
| Date | 2026-08-14 |
| Author | Agent |
| Status | approved_with_changes |
| Workflow | managed-phase |
| Goal id | `studio-mac-autoupdate-signing-and-searchable-category-picker` |
| Related | docs/workflow/reviews/2026-08-14-studio-mac-autoupdate-signing-and-searchable-category-picker-review.md |
| Target release | **Next Studio release after production `v1.0.5`** — recommend bump `apps/studio/package.json` → **`1.0.6`** (owner confirms; do not invent alternate numbers) |
| Impact classification | Studio app + release infrastructure only (not FreshForge starter surface) |

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

## Open Questions

- [ ] Owner confirms next Studio version number (**recommend `1.0.6`** after `1.0.5`)
- [ ] Notarization **same release** vs **immediate follow-up** (recommendation above)
- [ ] Mac-prefixed secret names vs reusing generic `CSC_*` (recommendation: `MAC_CSC_*`)
- [ ] Whether Design Library **filter** category dropdown should also become searchable (default **no** unless owner expands)

---

## Approval

- Review doc: docs/workflow/reviews/2026-08-14-studio-mac-autoupdate-signing-and-searchable-category-picker-review.md
- Verdict: **approved_with_changes** (2026-08-14)

Binding implement constraints from review: Studio **1.0.6** pin; notarization only if secrets ready else defer; Mac CI dual path (prerelease without Apple secrets; stable signed fail-closed); searchable Category only on edit + AI Review; `MAC_CSC_*` naming; B may proceed before Apple secrets; ad-hoc bridge docs required.

---

## Next FreshForge command after Review

```text
Continue Workflow
```

→ **Implement** approved scope + required changes. Stop for Apple cert/GitHub Mac secret human checkpoint before signed Mac packaging CI depends on those secrets.