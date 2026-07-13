# Prompt Building Guide

How to craft effective prompts for **Cursor + FreshForge** or other coding agents on Fresh Prints.

---

## Prompt template (copy and fill)

```markdown
## Goal
[One sentence — what should exist when done]

## FreshForge
- Command: Managed Phase / Continue Workflow
- Roadmap / goal: [e.g. portal-customer-artwork-upload r7 follow-up]
- Plan required: yes/no (yes for code changes)

## Context
- Current state: [paste key lines from CURRENT-STATE.md]
- Related ADR: [e.g. ADR-FP-073, ADR-FP-075]

## Scope

### In scope
- …

### Out of scope
- … (e.g. Phase 9 Custom Requests, production deploy)

## Architecture constraints
- App: Studio / Portal / Functions / shared
- Layer: Component / Hook / Service / Callable
- Must not: direct Firebase from components; trust client for upload validation

## Files to inspect first
- [From 08-tech-stack-repo-map.md]

## Acceptance criteria
- [ ] …
- [ ] Tests / typecheck / functions build as applicable
- [ ] Manual checkpoint if UI

## Docs to read (repo access)
1. .cursor/workflow/state.md
2. docs/architecture/ARCHITECTURE.md
3. [Topic doc]
```

---

## Prompt types

### 1. New feature (managed phase)
Include roadmap alignment + “create plan before implementation” + review gate.

### 2. Bug fix
Include repro, expected vs actual, which app (Portal :3100 / Studio / Functions).

### 3. Customer upload / request flow
Always reference `05-workflows-summary.md` and ADR-FP-073/074/075. Reminder: finalize is server-authoritative; don’t invent client-only security.

### 4. AI enrichment
Current target **`catalog-enrich-v21`**. Prompt vs validation vs both; Functions deploy is a human step.

### 5. External planning only
Upload `CURRENT-STATE.md` + topic files; paste `00-START-HERE-PROMPT.md`; ask for Cursor-ready prompt + risks.

---

## Good vs bad

**Good:** “Portal request cards must hard-block save below 200 DPI using shared `assessPrintRequestItemSize`. Update Studio tests. No import floor change (72 remains for catalog import).”

**Bad:** “Make uploads faster somehow” / “Add a mobile app” / “Auto-approve customer art into the library.”

---

## Phase alignment checks

| Question | If no → |
|----------|---------|
| Matches current managed goal / phase? | Defer |
| Approved plan exists? | Start Plan phase |
| Human checkpoint active? | Stop until owner replies |
| Violates non-goals / ADRs? | Remove from scope |

---

## Refresh discipline

Update `CURRENT-STATE.md` before every external planning session. Stale state causes wrong advice and duplicate work.
