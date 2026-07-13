# Coding Standards (Summary)

> Full doc: `docs/standards/CODING_STANDARDS.md`

## Priorities

1. Readability over cleverness  
2. Consistency over personal preference  
3. Simplicity over complexity  
4. Maintainability over speed  

## TypeScript

- Strict typing on persisted models and API contracts  
- Avoid `any` — prefer `unknown` + narrowing  
- Shared types in `packages/shared/src/` — single source of truth  

## Layer rules

| Layer | Owns | Must not |
|-------|------|----------|
| Component | Rendering, local UI state | Business rules, direct Firebase |
| Hook | UI state, wiring services | Low-level SDK details |
| Service | Business logic, validation | React rendering |
| Cloud Function | Trusted server work | Trusting client for validation |
| Electron main | Files, ZIP, sharp | React / Firebase UI |

## Naming

- Services: `*Service.ts`  
- Hooks: `use*`  
- Types: `*.types.ts`  
- Tests: `*.test.ts` adjacent to source  
- Components: PascalCase  

## Feature organization

```
features/<domain>/
  components/ hooks/ pages/ services/ types/ utils/
```

Portal customer uploads: `apps/portal/features/customer-uploads/`  
Studio intake: `apps/studio/.../features/customer-uploads/`

## Error handling

- Services throw mapped errors; UI shows user-safe messages  
- Log details in Functions — no secrets/PII  

## Firestore writes

- Strip `undefined`; use `serverTimestamp()` for audit fields  
- Permission / callable auth before sensitive writes  

## Dependencies

- No new packages without plan/review acknowledgment  

## Change discipline

- Narrow reversible diffs; update docs when behavior changes  
- Add/update tests when behavior changes  
