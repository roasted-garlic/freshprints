# Coding Standards (Summary)

> Full doc: `docs/standards/CODING_STANDARDS.md`

## Priorities

1. Readability over cleverness
2. Consistency over personal preference
3. Simplicity over complexity
4. Maintainability over speed

## TypeScript

- Strict typing on all persisted models and API contracts
- Avoid `any` — use `unknown` + narrowing when needed
- Shared types in `shared/types/` — single source of truth

## Layer rules

| Layer | Owns | Must not |
|-------|------|----------|
| Component | Rendering, local UI state | Business rules, direct Firebase |
| Hook | UI state, wiring services | Low-level SDK details |
| Service | Business logic, validation | React rendering |
| Main process | Files, ZIP, sharp | React, Firebase UI |

## Naming

- Services: `*Service.ts` (e.g. `designService.ts`)
- Hooks: `use*` (e.g. `useAiProcessingQueue.ts`)
- Types: `*.types.ts`
- Tests: `*.test.ts` adjacent to source
- Components: PascalCase files and exports

## Feature organization

Group by domain under `features/`:

```
features/ai-review/
  components/
  hooks/
  pages/
  services/
  types/
  utils/
```

## Error handling

- Services throw typed or mapped errors
- UI shows user-safe messages
- Log details server-side (Functions) — no secrets or PII in logs

## Firestore writes

- Strip `undefined` before writes (`firestoreDocument.ts` helpers)
- Use `serverTimestamp()` for audit fields
- Permission check in service before every write

## Dependencies

- Do not add packages without plan/review acknowledgment
- Prefer existing project utilities over new packages

## Change discipline

- Narrow, reversible diffs
- No unrelated formatting churn
- No dead code or commented-out blocks
- Update docs when behavior changes
- Add/update tests when behavior changes

## Code review triggers

Request review when touching:
- Shared utilities used across features
- Public API surfaces
- New architectural patterns
- Performance-sensitive paths
- Auth, rules, or permission model
