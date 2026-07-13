# Tech Stack and Repo Map

## Stack

| Layer | Technology |
|-------|------------|
| Studio desktop | Electron + Vite + vite-plugin-electron |
| Portal web | Next.js 15 (App Router) — **dev port 3100** |
| UI | React 18 + TypeScript 5 |
| Routing | Studio: react-router HashRouter; Portal: Next.js routes |
| Backend | Firebase (Auth, Firestore, Storage, Functions) |
| Image processing | sharp (Electron main + Functions) |
| ZIP | yauzl / yazl |
| Icons | lucide-react |
| Shared calendar | `@fresh-prints/show-picker` |

## Commands

```bash
npm run dev            # Studio + Portal concurrently
npm run dev:studio     # Electron + Vite
npm run dev:portal     # Next.js http://localhost:3100
npm run tunnel:portal  # cloudflared → localhost:3100
npm run build:studio
npm run build:portal
npm run lint
```

Functions:

```bash
cd functions && npm run build
firebase deploy --only functions:... --project fresh-prints-dev
```

Unit tests (examples):

```bash
npx tsx --test packages/shared/src/**/*.test.ts
npx tsx --test apps/studio/src/**/*.test.ts apps/portal/**/*.test.ts
npx tsx --test functions/src/lib/customerUpload*.test.ts
```

See `docs/standards/TESTING.md`.

## Top-level structure

```
fresh-prints/
├── apps/
│   ├── portal/                 # @fresh-prints/portal
│   │   ├── app/                # Next routes
│   │   └── features/
│   │       ├── catalog/
│   │       ├── print-requests/
│   │       ├── customer-uploads/
│   │       ├── auth/
│   │       └── …
│   └── studio/                 # @fresh-prints/studio
│       ├── electron/           # Main process (import, export, sharp)
│       └── src/renderer/src/
│           └── features/       # designs, imports, ai-review, print-requests,
│                               # upcoming-shows, customer-uploads, users, …
├── packages/
│   ├── shared/src/             # types, utils, constants (incl. customerUpload/)
│   └── show-picker/
├── functions/src/              # Cloud Functions
├── firestore.rules / storage.rules
├── docs/
└── references/project-chatgpt-handoff/
```

## Shared imports

Use `@fresh-prints/shared/...` from apps. Functions import via relative `../../packages/shared/src/...`.

**Do not confuse** with Studio-only `apps/studio/src/renderer/src/shared/` UI kits.

## Workflow state

`.cursor/workflow/state.md` — authoritative for managed phases.
