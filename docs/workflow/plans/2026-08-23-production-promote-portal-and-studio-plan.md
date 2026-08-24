# Plan: Production promote Portal + Studio (2026-08-23)

| Field | Value |
|-------|-------|
| Date | 2026-08-23 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Managed goal | `production-promote-portal-and-studio-2026-08-23` |
| Related | docs/workflow/reviews/2026-08-23-production-promote-portal-and-studio-review.md |

---

## Goal

Promote all currently accepted Fresh Prints product work from `development` tip `54357435e978359b180a2201aa207831dd927411` to `production` via PR, deploy the exact production Firebase allowlist required by that delta, roll out Portal App Hosting from the approved production merge SHA, prepare and publish Studio **1.0.9** from that same production source through the existing release workflow, then close with production reconciliation and ChatGPT handoff updates. **No production mutation until Plan + Formal Review are complete and each gate’s human checkpoint is approved.**

---

## Background / verified baselines (2026-08-23)

| Item | Verified value | Notes |
|------|----------------|-------|
| Checkout | `C:\coding\fresh-prints` on `development` | No worktree |
| Working tree | clean | Matches owner report |
| `origin/development` | `54357435e978359b180a2201aa207831dd927411` | Matches owner tip |
| `origin/production` | `27b0b4fb691c081ea1167f863f5fc45224a9c651` | Merge PR **#87** (Studio release finalization safeguards) — **not** the historical handoff tip `32101904` |
| Merge-base | `4a43790c20790745df34e639b42e2ace9707371c` | Docs closeout for 1.0.8 |
| Commits `production..development` | **2** | See inventory |
| Published Studio | **v1.0.8** | `target_commitish` `32101904b29476e514d0f9a9e8fd5c5b508a7d14`; Latest |
| Studio package on tip | **1.0.8** | Must bump before next stable |
| Tags | `v1.0.8` present; **no** `v1.0.9` | Next stable = **1.0.9** |
| Live Portal (last verified record) | `fresh-prints-portal-build-2026-08-21-001` @ `7716d4a97f83c2dbe5602fb3e149875d6d7f38c9` | PR **#84**; **≠** current `production` tip; re-verify before Gate E |
| Canonical Portal | `https://myprintrequest.com` | Unchanged |
| Phase 9 | **PARKED** | Must remain excluded |

Handoff correction: historical “production Git = `32101904`” is the **Studio 1.0.8 build source**, an ancestor of current `production`. Live App Hosting source (`7716d4a`) is also an ancestor of current `production` but **lags** production Git (PRs #85–#87 landed on Git without a Portal rebuild).

ChatGPT handoff package `references/project-chatgpt-handoff/` is **gitignored** (`references/` in `.gitignore`) and **absent on disk** in this checkout. Gate G must recreate/update it locally so ChatGPT handoff stays current (owner reminder).

---

## Gate A — `production..development` inventory

### Commits

| SHA | Subject | Classification |
|-----|---------|----------------|
| `7dfd7ee054b1126c70e8f6d94830ff1751c9e029` | feat(portal): ship Upcoming Shows, discover rails, and show browsing UX | **A** product (pending DEV-signoff confirmation — see Class E note) |
| `54357435e978359b180a2201aa207831dd927411` | feat(studio): organize workflow UX and add grouped gang sheets | **A** — formal Signoff **approved** + owner `OWNER DEV QA: PASS` |

**129 files**, +8798 / −459 vs `origin/production...origin/development`.

### Product area breakdown

| Area | Delta? | Notes |
|------|--------|-------|
| Portal | Yes | `/shows`, Discover rails, auth return-to, username UX, search normalization consumer, nav/help |
| Studio | Yes | Print Requests convert/actions, Show Queue Standard+Grouped gang sheets, Needs Review search, Design Library scroll/search, Normalized Files modal CSS |
| Shared | Yes | Search normalization, show discovery, conversion/completion helpers, gang sheet layouts/fingerprints/filenames |
| Cloud Functions | Yes | New + updated callables (see Gate D) |
| Firestore Rules | Yes | Conversion closure fields + client spoofing block |
| Storage Rules | **No** | Empty diff |
| Firestore indexes | **No** | Empty diff |
| App Hosting / `apphosting.yaml` / `firebase.json` | **No** | Empty diff |
| Studio release workflow | **No** in this range | Version still 1.0.8; Gate B adds 1.0.9 pins |
| Docs / workflow | Yes | Plans, reviews, ADR-FP-142/143, ROADMAP, DATA_MODEL, BACKEND |

### Classification summary

| Class | Contents |
|-------|----------|
| **A — promote** | Commit `5435743` (Studio workflow + grouped gang sheets) — signed off. Commit `7dfd7ee` (show discovery / conversion / search / Our Shows UX) — **owner listed as signed-off intent**; see Class E gate. |
| **B — release prep** | Studio **1.0.9** pins (`package.json`, `studio-release.yml`, signing-policy test); release copy; Gate B verification suite |
| **C — docs/workflow** | Existing plan/review/test/signoff artifacts in range; this production plan/review/records; ROADMAP; ChatGPT handoff |
| **D — already live** | Portal App Hosting still at `7716d4a` / build-2026-08-21-001; production Functions/Rules **do not** yet include this delta (DEV-only deploy 2026-08-22); published Studio **1.0.8** |
| **E — stop / confirm** | **Missing formal Signoff docs** for `customer-request-show-discovery-and-search-correctives` and `our-shows-page-ux-and-print-request-actions`. Test reports still show manual QA open / unchecked. Workflow state previously noted Our Shows signoff “still open.” **Do not treat Class E as silently Class A.** Owner must confirm DEV acceptance for promotion (phrase below) before Gate B/C. No Phase 9, no unfinished branches outside these two commits. |

**Class E runtime product code inside the promote range:** the entire `7dfd7ee` product surface is Class E until owner confirms DEV signoff. There is **no other** unfinished commit in `production..development`.

### Signed-off changes being promoted (after Class E confirmation)

**Batch 1 — Customer / request / show / search (`7dfd7ee` + ADRs):**
- Customer → Internal conversion (`convertCustomerPrintRequestToInternal`)
- Internal Gang Sheet completion reconciliation (`completeStaffGangSheetAndOpenNext` + lib)
- Username registration usability / normalization
- Public Our Shows / Show Designs calendar + galleries
- Show browsing callables (`listPortalPublicShows`, `listPortalShowCatalogDesigns`)
- Portal + Studio search normalization
- Auth return-to / deep-link
- Discover show-related rails
- Related Studio Print Request action placement (Our Shows UX follow-on)

**Batch 2 — Studio workflow organization (`5435743`, Signoff approved):**
- Print Requests grouped by show
- Condensed Normalized Files modal
- Needs Review search
- Design Library scroll preservation
- Grouped gang sheet mode + efficiency regression protection
- Shared search consumer (Portal catalog) — no separate Portal feature beyond helper parity

### Excluded

| Item | Why |
|------|-----|
| Phase 9 | PARKED |
| Broad Functions deploy | Forbidden; use allowlist only |
| Storage Rules / indexes | No diff |
| DNS / Auth / Secret Manager changes | Not in delta |
| Apple Developer ID / Mac signed | ADR-FP-136 declined; keep `internal-unsigned` |
| Publishing Studio from `development` | Forbidden — production SHA only |
| App Hosting from `development` | Forbidden — production SHA only |
| Direct / force-push to `production` | Forbidden |

---

## Scope

### In Scope

1. **Gate B** — On `development`: pin Studio **1.0.9**; run full pre-production verification; commit/push release-candidate tip
2. **Gate C** — PR `development` → `production`; merge after owner approval; record merge SHA
3. **Gate D** — Scoped production Firebase: Firestore Rules + exact Function allowlist
4. **Gate E** — App Hosting rollout from **exact production merge SHA**; Portal smoke + owner QA
5. **Gate F** — Studio 1.0.9 draft → multi-platform smoke → publish + Latest (owner-gated)
6. **Gate G** — Reconciliation; ROADMAP; production records; Signoff; **ChatGPT handoff** recreate/update under `references/project-chatgpt-handoff/`

### Out of Scope

- Phase 9
- Database migrations / customer data mutation beyond safe smoke
- Changing Mac signing policy
- Broad Firebase deploys
- Promoting anything beyond the verified `production..development` (+ Gate B pin commit)

---

## Proposed Studio version

| Check | Result |
|-------|--------|
| Published Latest | `v1.0.8` |
| Package / workflow pin today | `1.0.8` |
| Tag `v1.0.9` | **absent** |
| **Proposed next stable** | **`1.0.9`** |

Pin surfaces (same as 1.0.8 process):
- `apps/studio/package.json`
- `.github/workflows/studio-release.yml` (finalize expected version + Mac gate numeral only)
- `.github/workflows/studio-release-signing-policy.test.ts`

Do **not** publish until Gate F owner phrase.

---

## Gate D — Exact Firebase production delta

### Functions allowlist (CREATE or UPDATE)

| Function | Op | Why |
|----------|----|-----|
| `completeStaffGangSheetAndOpenNext` | **update** | Finish-sheet + internal request Printed reconciliation |
| `convertCustomerPrintRequestToInternal` | **create** | Customer → Internal conversion |
| `listPortalPublicShows` | **create** | Public Our Shows calendar |
| `listPortalShowCatalogDesigns` | **create** | Public show gallery (catalog-only DTO) |

Supporting libs ship inside those Function bundles (`portalShowCatalogDesigns`, `staffGangSheetShowFinishReconciliation`, queue-tab helpers). **Do not** deploy unrelated Functions.

### Exact production command (after Gate C; source = production merge SHA)

```bash
firebase deploy --only firestore:rules,functions:completeStaffGangSheetAndOpenNext,functions:convertCustomerPrintRequestToInternal,functions:listPortalPublicShows,functions:listPortalShowCatalogDesigns --project fresh-prints-prod
```

### Rules / indexes / secrets / storage

| Resource | Required? |
|----------|-----------|
| Firestore Rules | **Yes** — conversion linkage fields + `optionalFieldUnchanged` spoofing block |
| Storage Rules | **No** |
| Firestore indexes | **No** (empty diff; DEV QA also required none) |
| Secrets / env | **No new** secrets for this delta; App Hosting continues existing Secret Manager mappings |
| Migrations | **None** |

### Region / runtime

Verify post-deploy: each Function **ACTIVE**, expected region/runtime per existing Functions baseline (do not change runtimes in this goal).

---

## Gate E — Portal rollout sequence

1. Re-verify live build/revision/source (expect rollback target `fresh-prints-portal-build-2026-08-21-001` @ `7716d4a` unless drift)
2. Confirm Gate D Functions + Rules already live on `fresh-prints-prod`
3. Confirm App Hosting env/Secret Manager mappings unchanged (do not print secret values)
4. Create rollout from **exact production merge SHA** (never `development`):

```bash
firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit <PRODUCTION_MERGE_SHA> --force --non-interactive
```

5. Record build ID, revision, traffic %, rollback build
6. Concise production smoke (see checklist)
7. Owner Portal production QA → then Studio Gate F may proceed in parallel only if backend already live (Studio draft may start after Git+Firebase; publish after smoke)

---

## Gate F — Studio release sequence

1. Confirm package/workflow pins = **1.0.9** on production merge SHA
2. Dispatch stable `internal-unsigned` from **production** source (Windows + Mac x64 + Mac arm64)
3. **DRAFT** first — do not auto-publish
4. Smoke matrix: Windows, Mac x64, Mac arm64 (manual install; Mac auto-update install **unsupported**)
5. Verify version, production Firebase config, branding/icon, updater metadata, release copy
6. Owner `APPROVE STUDIO PUBLISH: 1.0.9` → publish + Latest/final-copy gates per existing workflow
7. Do not mutate/delete `v1.0.8` artifacts

### Studio smoke must include

Login; Print Requests by show; Customer/Internal lists; Convert Customer→Internal; Internal Gang Sheet complete→Printed; Normalized Files modal; Needs Review search; Design Library search + scroll; **Standard** gang sheet; **Grouped** gang sheet (incl. repeated same-user requests); Settings/update UI.

---

## Gate B — Pre-production verification (required commands)

Run on release-candidate `development` after 1.0.9 pin (exact scripts from repo):

| Check | Command | Required |
|-------|---------|----------|
| Diff hygiene | `git diff --check` | yes |
| Root lint | `npm run lint` | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Portal production build | `npm run build:portal` | yes (needs local Portal env) |
| Studio typecheck | `cd apps/studio && npx tsc --noEmit` | yes |
| Studio Vite build | `cd apps/studio && npx vite build` | yes |
| Studio packaging validation | per `DEPLOYMENT.md` / existing release prep (`npm run build:studio` or documented package path) | yes |
| Functions build | `npm --prefix functions run build` | yes |
| Signing-policy tests | `npx tsx --test .github/workflows/studio-release-signing-policy.test.ts` | yes (after 1.0.9 pin) |
| Focused regressions | gang sheet efficiency + grouped + fingerprint + export validation + search + grouping suites | yes |
| Firestore rules unit tests | only if present/required by `TESTING.md` for rules changes | if applicable |

Do not proceed on failed required checks. Diagnose env vs code for Portal build failures (prior `NEXT_PUBLIC_FIREBASE_*` missing).

---

## Rollback targets (before any mutation)

| Layer | Rollback |
|-------|----------|
| Git | No force-push; revert via forward-fix PR if needed |
| Portal App Hosting | `fresh-prints-portal-build-2026-08-21-001` @ `7716d4a` (re-confirm at Gate E) |
| Firebase Rules | Previous Rules from `27b0b4f` / pre-deploy production Rules snapshot |
| Functions | Redeploy prior production Function sources from `27b0b4f` for updated Function; delete/disable newly created Functions only if safe and owner-approved |
| Studio | Keep **v1.0.8** published; do not delete old release assets |

---

## Production smoke checklists

### Portal

- Homepage / catalog
- Case- and separator-insensitive search
- Our Shows public page + gallery
- Private customer uploads **not** exposed
- Login gate for Add to Request
- Auth return-to
- Discover show rails
- Username registration UX (safe)
- Working Request / Print Request basics
- Converted/Closed presentation (safe)

### Studio (packaged)

- See Gate F list above; Standard path regression mandatory

---

## Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Missing formal DEV Signoffs for `7dfd7ee` batch | **High** | Hard checkpoint before Gate B/C; write retrospective signoffs after owner confirm |
| Portal depends on new public show callables | High | Gate D before Gate E; smoke callables |
| Conversion Rules vs client updates | High | Deploy Rules with Functions; verify spoofing blocked |
| Live App Hosting ≠ production Git tip today | Medium | Explicit rollout from new merge SHA; record drift closure |
| Studio 1.0.9 packaging deferred from prior Signoff | Medium | Full Gate B suite before PR |
| ChatGPT handoff missing on disk | Low | Recreate under `references/` at Gate G |
| Mac auto-update install unsupported | Accepted | ADR-FP-136; document in release notes |
| Agent Firebase CLI hooks | Medium | Owner may run deploy/rollout commands; agent verifies read-only |

---

## Human checkpoints (ordered)

1. **Approve this Plan + Formal Review** (this stop)
2. **Confirm DEV signoff for Class E batch** (phrase below) — may combine with (1)
3. Gate B complete → **authorize production PR merge**
4. Gate D → **authorize production Firebase deploy**
5. Gate E → **authorize App Hosting rollout** + owner Portal QA
6. Gate F → **authorize Studio draft dispatch**, then **publish 1.0.9**

---

## Documentation updates required

- [x] ROADMAP (at Signoff)
- [x] Production deploy / App Hosting / Studio release records
- [x] This plan + Formal Review + Test report + Signoff
- [x] DECISIONS only if new ADR needed (none expected beyond existing FP-142/143)
- [x] **ChatGPT handoff** — recreate/update `references/project-chatgpt-handoff/CURRENT-STATE.md` (+ recent-completed / roadmap as present)

---

## Open questions

- [x] Resolved by inventory: next Studio version = **1.0.9**
- [ ] Owner confirm Class E → Class A for show-discovery + Our Shows (required)
- [ ] Re-verify live App Hosting at Gate E start (may still be build-2026-08-21-001)

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-23-production-promote-portal-and-studio-review.md`
- Verdict: pending Formal Review
