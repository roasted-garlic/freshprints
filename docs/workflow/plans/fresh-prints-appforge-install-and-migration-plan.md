# Plan: Fresh Prints AppForge Install and Migration

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/fresh-prints-appforge-install-and-migration-review.md |

---

## Goal

Initialize a safe local git checkpoint, bring the current AppForge starter runtime (`.cursor/`, `AGENTS.md`) into the Fresh Prints repo, and migrate Fresh Prints documentation into the AppForge folder structure without overwriting project-specific knowledge or modifying application source code.

## Background

Fresh Prints has project-specific documentation in a flat `docs/` layout and a Fresh Prints-specific `AGENTS.md`. The `.cursor/` workflow structure appears partially present with AppForge path conventions, but docs have not been migrated. This phase aligns documentation paths with AppForge standards so managed phase, intake, and bootstrap workflows operate correctly.

## Scope

### In Scope
- Git safety: migration branch `fresh-prints-appforge-migration`
- Pre-migration backup of `docs/` to `docs/_migration-backup/pre-appforge-migration/` (gitignored, not committed)
- Clone AppForge temporarily; copy/merge `AGENTS.md` and `.cursor/` only
- Move Fresh Prints docs per mapping to `docs/project/`, `docs/architecture/`, `docs/standards/`, `docs/intake/`, `docs/workflow/`
- Create missing baseline docs from AppForge templates (BACKEND.md, PROJECT_BRIEF.md, etc. if absent)
- Update path references in `AGENTS.md`, `docs/AI_RULES.md`, and `.cursor/**`
- Clean old root doc paths after migration
- Remove `.appforge-temp/`
- Validation and migration commit

### Out of Scope
- Application source code changes
- Firebase, Firestore rules, Storage rules, Auth, production config, secrets, billing, deployment
- Copying AppForge `docs/` wholesale or `docs/appforge-development/`
- Copying `scripts/`, `bin/`, `package.json`, `.github/`, etc.
- Pushing to remote
- Updating historical phase plan/review cross-references inside archived workflow artifacts (historical paths acceptable in archived docs)

---

## Affected Areas

### Files / Modules (expected)
- `AGENTS.md` — merge/update paths
- `.cursor/` — compare/merge with AppForge; update stale references
- `docs/**` — restructure; move plans/reviews/setup to workflow/
- `.gitignore` — add `docs/_migration-backup/`
- `.cursor/workflow/state.md` — reset to clean idle

### Architecture Impact
- [x] None (documentation and AI workflow only)

### Security Impact
- [x] None

### Data Model Impact
- [x] None

### Backend Impact
- [x] None (BACKEND.md created/updated as documentation only)

### UI / UX Impact
- [x] None

### Migration Impact
- [x] Forward steps:
  - Backup `docs/` to `docs/_migration-backup/pre-appforge-migration/`
  - Move files per mapping table
  - Fill gaps from AppForge starter templates
  - Update references; remove old root paths
- [x] Rollback / compatibility:
  - Git branch `fresh-prints-appforge-migration` from clean `master`
  - Backup folder retained locally (gitignored)
  - Revert via `git checkout master` if needed

---

## Approach

1. **Git safety** — `git status` (clean on `master`); create branch `fresh-prints-appforge-migration`; update `.gitignore`
2. **Backup** — Copy `docs/` → `docs/_migration-backup/pre-appforge-migration/`
3. **AppForge clone** — `git clone https://github.com/roasted-garlic/appforge.git .appforge-temp`
4. **Runtime copy** — Compare/merge `AGENTS.md` and `.cursor/`; preserve Fresh Prints-specific `AGENTS.md` content; merge AppForge updates where safe
5. **Doc migration** — Create target folders; move Fresh Prints files; preserve populated Fresh Prints content over generic AppForge templates
6. **Missing docs** — Create from `.appforge-temp/docs/` templates: BACKEND.md (link to FIREBASE.md), PROJECT_BRIEF.md, PROJECT_HEALTH.md, TECH_DEBT.md, DECISIONS.md, RISK_REGISTER.md, INTAKE_FINDINGS.md, TESTING.md, DEPLOYMENT.md if missing
7. **Path updates** — `AGENTS.md`, `docs/AI_RULES.md`, `.cursor/agents`, `.cursor/rules`, `.cursor/skills`, `.cursor/workflow`
8. **Cleanup** — Remove old root doc files; remove `.appforge-temp/`; verify stale path search
9. **Workflow state** — Reset `.cursor/workflow/state.md` to clean idle
10. **Validate** — `git status`, `npm run lint` if available; manual checklist
11. **Commit** — `Migrate Fresh Prints docs to AppForge workflow structure`

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Lint | `npm run lint` | yes (if script exists) |
| Typecheck | N/A in package.json | no |
| Unit tests | N/A in package.json | no |
| Build | skip (docs-only; build touches app) | no |

### Manual
- [x] AGENTS.md, .cursor/, docs/AI_RULES.md, docs/WORKFLOWS.md exist
- [x] docs/project/, architecture/, standards/, intake/, workflow/ exist
- [x] docs/architecture/FIREBASE.md preserved
- [x] Old root docs removed
- [x] Stale path grep clean (except intentional historical refs in archived artifacts)
- [x] `.appforge-temp/` removed
- [x] `state.md` clean idle

---

## Human Checkpoints Anticipated
- [ ] None (autonomous unless doc merge conflict)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Overwrite Fresh Prints-specific docs | High | Backup first; prefer Fresh Prints content over generic templates |
| AGENTS.md merge conflict | Medium | Compare side-by-side; preserve Fresh Prints project instructions |
| Stale paths in historical plans/reviews | Low | Update active entry points; archived artifacts may retain historical paths |
| Accidental appforge-development copy | Medium | Explicit exclusion list; verify and remove if present |

---

## Rollback Plan

1. `git checkout master`
2. `git branch -D fresh-prints-appforge-migration` if needed
3. Restore from `docs/_migration-backup/pre-appforge-migration/` if working tree corrupted

---

## Documentation Updates Required
- [x] AGENTS.md — migrated paths
- [x] docs/AI_RULES.md — migrated paths
- [x] .cursor/** — path references
- [x] docs/architecture/BACKEND.md — create/update with FIREBASE.md link

---

## Open Questions
- [x] None

---

## Approval
- Review doc: docs/workflow/reviews/fresh-prints-appforge-install-and-migration-review.md
- Verdict: pending
