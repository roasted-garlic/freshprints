# Prompt Building Guide

How to craft effective prompts for **Cursor + FreshForge** or other coding agents working on Fresh Prints.

---

## Prompt template (copy and fill)

```markdown
## Goal
[One sentence — what should exist when done]

## FreshForge
- Command: Managed Phase / Continue Workflow
- Roadmap phase: [e.g. Phase 5, sub-phase 5D]
- Plan required: yes/no (yes for code changes)

## Context
- Current state: [paste key lines from CURRENT-STATE.md]
- Related ADR: [e.g. ADR-FP-029 if AI enrichment]

## Scope

### In scope
- [Bullet 1]
- [Bullet 2]

### Out of scope
- [Explicit exclusions]

## Architecture constraints
- Workspace: [Imports / AI Review / Design Library]
- Layer: [Component / Hook / Service / Function]
- Must not: [e.g. direct Firebase from component]

## Files to inspect first
- [From 08-tech-stack-repo-map.md]

## Acceptance criteria
- [ ] [Testable outcome 1]
- [ ] [Testable outcome 2]
- [ ] `npm run lint` passes
- [ ] [Manual test step if UI]

## Docs to read (repo access)
1. docs/architecture/ARCHITECTURE.md
2. [Topic-specific doc]
3. .cursor/workflow/state.md
```

---

## Prompt types

### 1. New feature (managed phase)

Always include:
- Roadmap phase alignment
- "Create plan in `docs/workflow/plans/` before implementation"
- FreshForge gate reminder: Review approval required

Example opener:
> Managed Phase: Plan a Phase 5D feature to warn on duplicate catalog titles during AI Review approval. Read CURRENT-STATE and 06-data-model-essentials first.

### 2. Bug fix

Include:
- Reproduction steps
- Expected vs actual behavior
- Which workspace/route is affected
- Whether bug is in renderer, main process, or Cloud Functions

Example:
> Bug: Re-run AI on Rejected tab does not preserve design selection. See ADR-FP-027. Fix in ai-review hooks only — no prompt changes.

### 3. AI enrichment / prompt change

Always include:
- Current prompt version target (`catalog-enrich-openai-v15`)
- Whether change is prompt-only vs validation-only vs both
- Reminder: "Prompt handles intent; validation handles structure"
- List affected modules: provider, parse, retry, title rules, visible text validation

Example:
> Continue Workflow: Implement Phase 8 placeholder rejection in catalogEnrichmentResponse.ts before save. Do not change prompt text yet. Add tests.

### 4. UI/UX polish

Include:
- Route and component names
- Reference STYLE_GUIDE.md for theme/patterns
- Manual test checkpoint request
- Screenshot description if available

### 5. External planning only (no repo access)

Upload:
1. `CURRENT-STATE.md`
2. Topic file(s) from handoff package
3. Paste `00-START-HERE-PROMPT.md`

Ask for:
- Cursor-ready prompt (using template above)
- Risk list
- Phase alignment check
- Files to verify in repo

---

## Good vs bad prompts

### Good
> "Add confidence badge to AI suggestions panel when field confidence < 0.70. Phase 5E. Hook reads existing aiSuggestions.confidence. Badge uses existing theme tokens. Manual test: import design, check Needs Review tab."

### Bad
> "Make AI review better"
> "Fix the Firebase stuff"
> "Add mobile app support"

---

## Phase alignment checks

Before sending to Cursor, verify:

| Question | If no → |
|----------|---------|
| Is this in the current roadmap phase? | Defer or note dependency |
| Does an approved plan exist? | Start with Plan phase |
| Is human checkpoint active? | Stop — deploy/approval first |
| Does it violate non-goals? | Remove from scope |

---

## AI enrichment-specific checklist

When changing enrichment behavior:

- [ ] Prompt version bumped if prompt text changes?
- [ ] Parse layer handles messy JSON?
- [ ] Retry logic updated?
- [ ] Title rules consistent?
- [ ] Category resolver still exact-match first?
- [ ] Tests added/updated in `functions/src/ai/*.test.ts`?
- [ ] Functions deploy noted as human step?
- [ ] ADR updated if architectural?

---

## Refresh discipline

Update `CURRENT-STATE.md` before every external planning session. Stale state causes wrong phase advice and duplicate work.
