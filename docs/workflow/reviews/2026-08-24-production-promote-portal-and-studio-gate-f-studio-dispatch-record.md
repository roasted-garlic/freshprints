# Gate F — Studio 1.0.9 draft dispatch record

| Field | Value |
|-------|-------|
| Date | 2026-08-24 |
| Goal | `production-promote-portal-and-studio-2026-08-23` |
| Authorization | `AUTHORIZE STUDIO 1.0.9 RELEASE DISPATCH: STABLE INTERNAL-UNSIGNED FROM PRODUCTION f35c96dda23ce83f99f75ab3f942c5edfcfcfdd2` |
| Status | **DRAFT CREATED** — **NOT PUBLISHED** |
| Publish | **NOT authorized** — await `APPROVE STUDIO PUBLISH: 1.0.9` |

---

## Preflight (passed)

| Check | Result |
|-------|--------|
| `origin/production` | **`f35c96dda23ce83f99f75ab3f942c5edfcfcfdd2`** — exact match |
| Studio `package.json` version on production | **1.0.9** |
| `studio-release.yml` finalize expects | **1.0.9** |
| Signing-policy test expects | **1.0.9** |
| PR #89 delta vs `94a1ed0` — Studio runtime | **none** (Portal/docs/workflow only) |
| Release mode | `stable` + `internal-unsigned` |
| Platform matrix | Windows + Mac x64 + Mac arm64 |
| `v1.0.8` published release | **unchanged** — ID `374575547`, `isDraft=false`, still **Latest** |

---

## Dispatch

| Item | Value |
|------|-------|
| Workflow | `Studio release` (`.github/workflows/studio-release.yml`) |
| Run ID | **`32754684436`** |
| Run URL | https://github.com/roasted-garlic/freshprints/actions/runs/32754684436 |
| Trigger | `workflow_dispatch` |
| `--ref` | `production` |
| `ref` input | **`f35c96dda23ce83f99f75ab3f942c5edfcfcfdd2`** |
| `release_type` | `stable` |
| `distribution_mode` | `internal-unsigned` |
| `headSha` | **`f35c96dda23ce83f99f75ab3f942c5edfcfcfdd2`** |
| Overall conclusion | **success** |

### Exact command

```powershell
gh workflow run "Studio release" --repo roasted-garlic/freshprints --ref production `
  -f ref=f35c96dda23ce83f99f75ab3f942c5edfcfcfdd2 `
  -f release_type=stable `
  -f distribution_mode=internal-unsigned
```

---

## Job matrix

| Job | Status | Duration | Platform artifacts |
|-----|--------|----------|-------------------|
| `build-windows` | **success** | 4m 36s | Windows NSIS + `latest.yml` |
| `build-macos` | **success** | 12m 45s | Mac **x64** + **arm64** DMG + ZIP + merged `latest-mac.yml` |
| `finalize-release` | **success** | 2m 15s | Draft attach + asset verification |

### CI artifacts (run)

- `studio-windows-32754684436`
- `studio-macos-32754684436`
- `studio-release-evidence-32754684436`

---

## Draft GitHub Release

| Item | Value |
|------|-------|
| Release ID | **`375869566`** |
| Name | **1.0.9** |
| Tag | `untagged-ac82c9de5862b0ae7d2d` (unique tag; avoids collision with prior drafts) |
| `target_commitish` | **`f35c96dda23ce83f99f75ab3f942c5edfcfcfdd2`** |
| `draft` | **true** |
| `published_at` | *(none — draft)* |
| Published **v1.0.8** | **unchanged** (still Latest) |

### Draft assets attached

| Asset | Platform |
|-------|----------|
| `Fresh-Prints-Windows-1.0.9-Setup.exe` | Windows |
| `Fresh-Prints-Windows-1.0.9-Setup.exe.blockmap` | Windows |
| `Fresh-Prints-Mac-x64-1.0.9-Installer.dmg` | Mac x64 |
| `Fresh-Prints-Mac-x64-1.0.9-Installer.zip` | Mac x64 |
| `Fresh-Prints-Mac-arm64-1.0.9-Installer.dmg` | Mac arm64 |
| `Fresh-Prints-Mac-arm64-1.0.9-Installer.zip` | Mac arm64 |
| `latest.yml` | Windows updater metadata |
| `latest-mac.yml` | Mac updater metadata |

---

## Warnings (non-blocking)

| Warning | Notes |
|---------|-------|
| Node.js 20 deprecation on GitHub Actions runners | Forced to Node 24; informational |
| `INTERNAL-UNSIGNED STABLE BUILD (Mac x64+arm64)` | Expected — ad-hoc signed, not notarized (ADR-FP-136 / A2 declined) |

**Failures:** none.

---

## Not in this gate

- GitHub release **publish** / **Latest**
- Firebase / App Hosting / DNS
- Mac signing policy change
- Mutation of **v1.0.8** artifacts

---

## Owner smoke checklist (draft assets)

Install from draft release **375869566** (or CI artifacts). Production Firebase config expected.

### Windows
- [ ] Install `Fresh-Prints-Windows-1.0.9-Setup.exe`
- [ ] App shows version **1.0.9**
- [ ] Login; production Firebase
- [ ] Print Requests by show; Customer/Internal lists
- [ ] Convert Customer → Internal (callable live from Gate D)
- [ ] Internal Gang Sheet Mark Complete → Printed path
- [ ] Needs Review search; Design Library search + scroll
- [ ] **Standard** gang sheet export
- [ ] **Grouped** gang sheet export
- [ ] Settings / updater UI shows 1.0.9 metadata

### Mac x64 + Mac arm64 (each)
- [ ] Install DMG (Open Anyway / right-click Open — unsigned expected)
- [ ] Version **1.0.9**; production Firebase
- [ ] Same functional smoke as Windows where applicable
- [ ] **Do not** expect Mac auto-update **install** (unsupported)

---

## Next phrase (publish only — separate gate)

```text
APPROVE STUDIO PUBLISH: 1.0.9
```

**STOP before publish.**
