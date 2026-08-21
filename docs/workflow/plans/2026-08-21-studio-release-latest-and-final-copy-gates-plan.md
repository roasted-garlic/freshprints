# Plan: Permanent Studio GitHub Latest + final release-copy gates

| Field | Value |
|-------|-------|
| Date | 2026-08-21 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Goal id | `studio-release-latest-and-final-copy-gates` |
| Related | docs/workflow/reviews/2026-08-21-studio-release-latest-and-final-copy-gates-review.md |

---

## Goal

Make every future **successfully published** stable Studio GitHub Release (after owner `APPROVE STUDIO PUBLISH: X.Y.Z` and dual-platform smoke) automatically receive **final published copy** and GitHub **Latest**, with verification that `draft=false`, `/releases/latest` matches that release, and the body contains no draft warning. Keep draft creation and owner publish authorization. Do **not** publish or edit **1.0.8** (`374575547`) in this goal.

## Background

### Current publication mechanism (repo check)

| Stage | Mechanism | What it does |
|-------|-----------|----------------|
| Draft create/update | `.github/workflows/studio-release.yml` `finalize-release` | `gh api POST /releases` (or reuse same-SHA draft). `draft=true`. Uploads 8 assets by **release ID**. |
| Draft body | Inline in that workflow | `Fresh Prints Studio ${VERSION} (Windows + Mac x64 + Mac arm64). DRAFT — do not publish until dual-platform smoke passes. Build ${BUILD_SHA}.` |
| Publish | **Not in the workflow.** Separate owner checkpoint | Ad-hoc `gh api -X PATCH repos/…/releases/{id} -f draft=false` (1.0.4, 1.0.8). **No helper script exists.** |
| Latest | Not set | PATCH never sends `make_latest`. |
| Final body | Not set | PATCH never replaces the draft warning. |

Workflow comment: `This workflow does NOT publish the release.` Signing-policy tests assert `does NOT publish` and `draft=true`.

### Root cause (1.0.8)

1. **Latest missed:** Publish only set `draft=false`. GitHub REST `make_latest` was not sent; `/releases/latest` was not verified.
2. **Draft copy survived:** Finalize **intends** the DRAFT warning on drafts. Publish did not replace `body`. There is no shared final-copy template and no fail-closed check for `DRAFT` / `do not publish` after publish.

Owner is correcting 1.0.8 separately. Treat that as historical evidence only.

---

## Scope

### In Scope

- Draft-vs-final copy contract (one source of truth)
- Owner-gated publish helper that sets `draft=false`, `make_latest=true`, final body, then verifies
- Workflow still creates **drafts only** (may use the shared draft-copy helper)
- `studio-release-signing-policy.test.ts` + helper unit tests
- `docs/standards/DEPLOYMENT.md` publish command + signoff checklist
- FreshForge plan/review/test/signoff for this process goal

### Out of Scope

- Studio product code, Portal, App Hosting, Functions, Rules, indexes, Algolia
- Mac/Windows **signing** policy; asset bytes; version bump
- Phase 9
- Re-editing published **1.0.8** unless owner explicitly asks

---

## Affected Areas

### Files / Modules (expected)

| File | Change |
|------|--------|
| `.github/scripts/studio-github-release-copy.mjs` | **New.** `draftBody(version, sha)`, `finalBody(version, sha)`, `assertPublishedCopy(body)` (reject `DRAFT`, `do not publish`, case-insensitive equivalents). Final copy: version, Windows+Mac x64+arm64, source SHA, Windows auto-update, Mac `internal-unsigned` / manual DMG / auto-update install unsupported (ADR-FP-136). |
| `.github/scripts/publish-studio-stable-github-release.mjs` | **New.** After owner phrase only: GET release by ID; require `draft=true`; PATCH `draft=false`, `make_latest=true`, `body=finalBody`; GET `/releases/{id}` and `/releases/latest`; fail closed unless `draft=false`, latest id matches, asset count **8**, `target_commitish` matches, `assertPublishedCopy` passes. Print ID, tag, SHA, Latest, asset count. Do not rename assets or change binaries. |
| `.github/scripts/publish-studio-stable-github-release.test.ts` | **New.** Unit tests for copy + PATCH payload + stale-copy rejection (no live GitHub). |
| `.github/workflows/studio-release.yml` | Draft POST `body` from `draftBody` (node one-liner / small call). Keep `draft=true`. Do **not** auto-publish. Optional: if reusing same-SHA draft, PATCH **draft body only** (still `draft=true`) so warning stays. |
| `.github/workflows/studio-release-signing-policy.test.ts` | Assert workflow still does **not** publish; still `draft=true`; draft create still uses draft warning (via script or matching string); no `make_latest` on finalize. |
| `docs/standards/DEPLOYMENT.md` | Publication = helper after `APPROVE STUDIO PUBLISH: X.Y.Z` + smoke. Signoff must record `draft=false`, tag, SHA, asset count **8**, GitHub Latest (`/releases/latest` id), no stale draft text. |

### Architecture / Security / Data / Backend / UI / Migration

- [x] None for product layers. GitHub Releases API only, after existing owner phrase. `GH_TOKEN` / `gh` auth unchanged. Helper must not log tokens.

---

## Approach

1. Formal Review → **STOP** before implement.
2. After `APPROVE IMPLEMENT: studio-release-latest-and-final-copy-gates`: add copy + publish scripts and tests; wire draft body in `studio-release.yml`; update DEPLOYMENT.md.
3. Do not dispatch `studio-release.yml`. Do not PATCH 1.0.8.
4. Test phase: signing-policy + new unit tests; no installer rebuild.
5. Signoff: process complete when tests pass and docs list the publish checklist. Future releases use the helper; this goal does not publish a version.

Owner publish remains:

```text
APPROVE STUDIO PUBLISH: X.Y.Z
```

Then (documented, not run in this goal):

```text
node .github/scripts/publish-studio-stable-github-release.mjs --release-id <id> --version X.Y.Z --sha <40-char>
```

Raw `PATCH -f draft=false` alone is **insufficient** after this change.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Copy + publish helper | `npx tsx --test .github/scripts/publish-studio-stable-github-release.test.ts` | yes |
| Signing / workflow contract | `npx tsx --test .github/workflows/studio-release-signing-policy.test.ts` | yes |
| Lint | `npm run lint` | yes if TS/JS in eslint glob; else document skip |
| Studio tsc / Vite / installer | no | no product/packaging change |

Helper tests must prove: final body has version + SHA; no DRAFT warning; PATCH includes `make_latest=true` and `draft=false`; verify step would fail if `/releases/latest` id differs.

### Manual

- [x] None required this goal (no new published release).
- Future 1.0.9+ signoff uses the DEPLOYMENT.md checklist (Latest badge + body).

---

## Human Checkpoints Anticipated

| Gate | Phrase |
|------|--------|
| Implement | `APPROVE IMPLEMENT: studio-release-latest-and-final-copy-gates` |
| Publish a Studio version | still `APPROVE STUDIO PUBLISH: X.Y.Z` — **not** this goal |

- [x] Production deploy of a Studio installer: **not** this goal
- [ ] Other: do not edit 1.0.8

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Auto-publish in workflow | High | Forbidden; tests assert finalize stays draft-only |
| `make_latest` API drift | Medium | Verify `/releases/latest` id, not only PATCH ack |
| Editing 1.0.8 | High | Out of scope unless new owner phrase |
| Raw PATCH still used from memory | Medium | DEPLOYMENT.md: helper is the only publish command |

---

## Rollback Plan

Revert the script + workflow + doc commits on `development`. Existing published releases unchanged. Draft finalize still works if workflow draft-body call is reverted to the previous inline string.

---

## Documentation Updates Required

- [x] `docs/standards/DEPLOYMENT.md` — publish helper + signoff checklist
- [ ] DECISIONS.md — not required (process contract, not new ADR)
- [x] ROADMAP / handoff at signoff

---

## Open Questions

- [x] None. 1.0.8 correction is owner-local and out of this implement.

---

## Approval

- Review doc: docs/workflow/reviews/2026-08-21-studio-release-latest-and-final-copy-gates-review.md
- Verdict: approved
