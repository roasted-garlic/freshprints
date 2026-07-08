# Tech Stack and Repo Map

## Stack

| Layer | Technology |
|-------|------------|
| Studio desktop | Electron 30 + Vite 5 + vite-plugin-electron |
| Portal web | Next.js 15 (App Router) |
| UI | React 18 + TypeScript 5 |
| Routing | react-router-dom 7 (Studio HashRouter); Next.js routes (Portal) |
| Backend | Firebase 12 (Auth, Firestore, Storage, Functions) |
| Image processing | sharp 0.33 (Electron main + Functions) |
| ZIP | yauzl (read), yazl (write) |
| Icons | lucide-react |

## Commands

```bash
npm run dev:studio   # Electron + Vite dev
npm run dev:portal   # Next.js :3000
npm run build:studio # tsc + vite + electron-builder
npm run build:portal # Next.js production build
npm run lint
npx tsc --noEmit     # from apps/studio/
```

No root `npm test` — run `npx tsx --test` on `*.test.ts` files (see `docs/standards/TESTING.md`).

## Top-level structure

```
fresh-prints/
├── apps/
│   ├── portal/            # @fresh-prints/portal — Next.js (Firebase App Hosting)
│   └── studio/            # @fresh-prints/studio — Electron + Vite
│       ├── electron/      # Studio main process
│       └── src/renderer/src/  # Studio React UI
├── packages/
│   ├── shared/            # @fresh-prints/shared — cross-app types/utils
│   └── show-picker/       # @fresh-prints/show-picker — calendar UI
├── functions/src/         # Cloud Functions
├── firestore.rules
├── storage.rules
├── firebase.json          # App Hosting rootDir: apps/portal
├── docs/
└── references/
    ├── gang-sheet-builder-reference/
    └── project-chatgpt-handoff/
```

## Studio feature modules (`apps/studio/src/renderer/src/features/`)

| Folder | Domain |
|--------|--------|
| `auth/` | Login, session |
| `designs/` | Design Library |
| `imports/` | ZIP/folder import |
| `ai-review/` | AI Review |
| `print-requests/` | Print Requests |
| `upcoming-shows/` | Show Queue |
| `users/` | Team + customers |
| `settings/` | AI settings |

## Portal (`apps/portal/`)

| Area | Path |
|------|------|
| Routes | `apps/portal/app/` |
| Print requests | `apps/portal/features/print-requests/` |
| Catalog | `apps/portal/features/catalog/` |

## Shared code

Cross-app domain types and pure utils: `packages/shared/src/` — import as `@fresh-prints/shared/...`.

**Do not confuse** with `apps/studio/src/renderer/src/shared/` (Studio-only UI components).

## Workflow state

`.cursor/workflow/state.md`
