# Tech Stack and Repo Map

## Stack

| Layer | Technology |
|-------|------------|
| Desktop shell | Electron 30 |
| Build | Vite 5 + vite-plugin-electron |
| UI | React 18 + TypeScript 5 |
| Routing | react-router-dom 7 (HashRouter for Electron) |
| Backend | Firebase 12 (Auth, Firestore, Storage, Functions) |
| Image processing | sharp 0.33 (main process) |
| ZIP parsing | yauzl |
| Icons | lucide-react |

## Commands

```bash
npm run dev      # Electron + Vite dev
npm run build    # tsc + vite build + electron-builder
npm run lint     # ESLint
npx tsc --noEmit # Typecheck only
```

No `npm test` script yet — `*.test.ts` files exist; run manually or via future test runner.

## Top-level structure

```
fresh-prints/
├── electron/              Main process + IPC + import services
├── src/renderer/src/      React app
│   ├── features/          Feature modules
│   ├── routes/            AppRoutes, layouts
│   ├── config/            env.ts, firebase.ts
│   └── styles/            CSS including ai-review.css
├── shared/                Shared types, constants, utils
├── functions/src/         Cloud Functions + AI pipeline
├── firestore.rules
├── storage.rules
├── firestore.indexes.json
├── firebase.json
├── docs/                  Source of truth documentation
├── .cursor/               FreshForge workflow (rules, skills, state)
├── AGENTS.md              Cursor agent entry point
├── CLAUDE.md              Claude agent entry point
└── project-chatgpt-handoff/  This package (removable)
```

## Feature modules (`src/renderer/src/features/`)

| Folder | Domain |
|--------|--------|
| `auth/` | Login, session, AuthProvider, ProtectedRoute |
| `permissions/` | permissionService, RoleGate |
| `users/` | Team user management |
| `designs/` | Design Library, categories, CRUD, approval |
| `imports/` | ZIP/folder import, batch UI |
| `ai-review/` | AI Review inbox and workspace |
| `settings/` | AI enrichment settings |
| `firebase/` | Collection helpers, Firestore utils |
| `dashboard/` | Dev dashboard |
| `theme/` | Theme system |
| `show-queue/` | Legacy scaffold |
| `customer-requests/` | Legacy scaffold |

## Key files by task

| Task | Start here |
|------|------------|
| Add route | `src/renderer/src/routes/AppRoutes.tsx` |
| Add permission | `features/permissions/services/permissionService.ts` |
| Design CRUD | `features/designs/services/designService.ts` |
| Catalog approve/reject | `features/designs/services/catalogApprovalService.ts` |
| Import pipeline | `electron/services/` + `features/imports/` |
| AI Review UI | `features/ai-review/pages/AiReviewPage.tsx` |
| AI Review queue | `features/ai-review/hooks/useAiProcessingQueue.ts` |
| AI inbox queries | `features/ai-review/services/aiReviewInboxService.ts` |
| Enrichment pipeline | `functions/src/ai/aiEnrichmentPipeline.ts` |
| OpenAI provider | `functions/src/ai/providers/openAiVisionEnrichmentProvider.ts` |
| Shared design types | `shared/types/` |
| Storage paths | `shared/constants/design/designStoragePaths.ts` |
| Firestore collections | `features/firebase/constants/firestoreCollections.ts` |
| Workflow state | `.cursor/workflow/state.md` |

## Shared types

Cross-layer contracts live in `shared/types/` — import from both renderer and functions where applicable.

## Electron IPC pattern

Main process exposes safe APIs via preload:

```ts
window.freshPrints.files.selectZip()
```

Never expose raw Node APIs. Always `contextIsolation: true`.

## Firebase init

Single init in `src/renderer/src/config/firebase.ts`. Components never import `firebase/*` directly — use services.

## Test files (sample locations)

```
functions/src/ai/*.test.ts
features/designs/utils/*.test.ts
features/ai-review/utils/*.test.ts
features/permissions/**/*.test.ts
shared/utils/*.test.ts
```
