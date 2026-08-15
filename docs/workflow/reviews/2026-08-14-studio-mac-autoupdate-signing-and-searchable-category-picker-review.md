# Review: Studio Mac auto-update signing + searchable category picker

| Field | Value |
|-------|-------|
| Date | 2026-08-14 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-08-14-studio-mac-autoupdate-signing-and-searchable-category-picker-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

The plan correctly roots the Mac updater failure in ad-hoc signing vs Squirrel.Mac requirements, pairs it with a real install-phase error-mapping fix, and keeps category search as a local renderer filter on the two design-assignment surfaces. Scope, security posture (no validation bypass; secrets out of repo), and human checkpoints are adequate for implementation after the listed binding changes.

Owner `Continue Workflow` is treated as Plan acceptance for Review; Apple certificate/secret setup remains a later human gate before Workstream A signed CI can succeed.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Two workstreams; Portal/taxonomy/AI generation/Phase 9 excluded; Design Library filter explicitly out unless expanded |
| Architecture alignment | pass | Packaging/updater main process + shared Select; taxonomy materialization unchanged |
| Security impact addressed | pass | Developer ID + temp keychain; no Squirrel disable; safe error mapping (no raw messages) |
| Data model impact addressed | pass | None; category id/name semantics preserved |
| Backend impact addressed | pass | No Firebase/API; release workflow/secrets only for A |
| Test strategy adequate | pass | Signing policy, error mapping, Select filter units, Mac N→N+1 + dual-arch smoke |
| Human checkpoints identified | pass | Certs, secrets, notarization, promote, stable build/publish, manual QA |
| Roadmap alignment | pass | Post-1.0.5 Studio corrective; Phase 9 parked |
| Documentation plan | pass | DEPLOYMENT, smoke checklists, optional ADR, CURRENT-STATE at signoff |
| No silent scope expansion | pass | Separately testable; B may proceed without Apple secrets |

---

## Architecture Review

**Findings:**
- Workstream A correctly targets `electron-builder.json5`, `studio-release.yml`, codesign verifier, and updater error phase tracking — matches confirmed repo state (`identity: "-"`, Mac `signed` fail-closed, `updater.on("error")` → `"check"`).
- Workstream B correctly identifies shared custom `Select` (not native `<select>`) used by `DesignFormFields` and `AiReviewFormPanel`; optional `searchable` is the right narrow extension.
- Staff Inbox edit path inherits via `EditDesignModal` — acceptable bonus, not scope creep.
- Taxonomy: AI Review + normal Library browse use `useGeneratedDesignLibraryTaxonomy`; archived browse may use Firestore `useCategories` — plan correctly keeps search local to prebuilt options.

**Required changes:**
- [x] Pin Studio version bump to **`1.0.6`** at implement unless owner explicitly overrides before coding starts.
- [x] Do **not** enable searchable on Design Library filter or Placement/`Select` callers unless owner expands scope in writing.
- [x] When updating Mac CI, keep **prerelease/validation** able to run without Apple secrets (ad-hoc or unsigned-policy path) so development CI is not hard-blocked on cert availability; stable `signed` Mac path requires secrets and fails closed if incomplete.

---

## Security Review

**Findings:**
- Plan forbids disabling Squirrel validation / weakening updater checks — mandatory.
- `MAC_CSC_*` naming preferred over colliding with Windows `WINDOWS_CSC_*` — accept.
- Error mapping must continue to use structural signals only; never forward SQRL/raw `message` to renderer.
- Notarization credentials are optional for the auto-update fix; Developer ID is the load-bearing control.

**Required changes:**
- [x] Default notarization decision at implement start: **include in same release only if App Store Connect API (or Apple ID) secrets are already configured**; otherwise ship Developer ID signing + document notarization as immediate follow-up goal — do not block A on notarization.
- [x] Keychain cleanup must run `if: always()` on Mac signed packaging jobs.

**Human approval needed before production:**
- [x] Apple Developer ID certificate creation/export
- [x] GitHub Actions Mac signing secret creation
- [x] Notarization credential setup (if same release)
- [x] Production promotion, stable build, smoke, publication

---

## Data Model Review

**Findings:**
- No schema, status, or taxonomy write changes. Category search must not create categories or alter `categoryId` semantics.

**Required changes:**
- [ ] None

---

## Backend Review

**Findings:**
- No Cloud Functions / Rules / Firestore query changes for B.
- Finalize workflow still hard-pins Studio version `1.0.5` and Mac policy text still mix `1.0.4`/`1.0.5` — must move with the version bump and Developer ID policy rewrite.

**Required changes:**
- [x] Update finalize expected-version pin and signing-policy tests in the **same** change set as `apps/studio/package.json` → `1.0.6`.
- [x] Rewrite Mac distribution step so `distribution_mode: signed` is allowed when Mac secrets are complete; keep `internal-unsigned` as explicit ad-hoc exception only if still needed for emergency — prefer signed as the production Mac path going forward.

---

## Testing Review

**Findings:**
- A matrix (identity, arches, N→N+1, failure UX, bridge) is sufficient.
- B filter/selection/reset/surface coverage is sufficient.
- Honest reporting rules acknowledged.

**Required changes:**
- [x] Add/adjust unit coverage that `updater` global `error` during install phase maps to install-oriented category/copy (not check-failed).
- [x] Codesign verifier must gain a real `developer-id` mode assertion (not only `any`).

---

## Documentation Review

**Findings:**
- DEPLOYMENT Mac ad-hoc / auto-update limitation section must be rewritten for Developer ID (+ notarization status).
- Smoke checklists must replace “ad-hoc expected / auto-update unsupported” with signed N→N+1 + one-time bridge instructions.

---

## Required Changes (if approved_with_changes)

1. **Version:** Implement bumps Studio to **`1.0.6`** (and matching workflow finalize pin + policy tests) unless owner overrides before implement.
2. **Notarization:** Same-release only if notarization secrets exist at implement; otherwise Developer ID first + deferred notarization follow-up — do not block auto-update on notarization.
3. **Mac CI dual path:** Stable `signed` requires complete Mac secrets (fail closed if partial); prerelease/validation must remain runnable without those secrets.
4. **Scope hold:** Category searchable only on Design edit + AI Review Category fields; not Library filter / Placement / other Selects.
5. **Secret naming:** Prefer `MAC_CSC_LINK` + `MAC_CSC_KEY_PASSWORD` (document in DEPLOYMENT); never commit material.
6. **Sequencing:** Workstream B may implement/test immediately; Workstream A packaging that needs live certs stops at human checkpoint until secrets exist — updater error-mapping code may ship without secrets.
7. **Bridge:** Release notes / smoke checklist must state ad-hoc `≤1.0.5` Mac installs need one manual Developer ID DMG install before auto-update works.

---

## Blockers (if blocked)

None for Review. Implementation of **signed Mac packaging** remains gated on Apple cert + GitHub secrets human checkpoint (not a Plan blocker).

---

## Verdict Rationale

Plan is accurate against repo evidence, security-safe, and appropriately split. `approved_with_changes` locks version pin, notarization default, CI dual-path, and scope holds so implement cannot silently expand or hard-block all CI on missing Apple secrets.

---

## Next Step

1. Update plan status to reflect review verdict (optional amend note).
2. Begin **Implement** per approved scope + required changes above.
3. **Stop** before configuring Apple certificates/GitHub Mac secrets until owner confirms readiness — then resume Workstream A signing CI.
4. No production promote/publish without separate human gates.
