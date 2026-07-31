# Plan Amendment: Minimal Turborepo Support for App Hosting (Goal #13 `production-release`)

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Parent goal | `production-release` (Goal #13) |
| Trigger | First App Hosting rollout failed twice with identical error: `Missing dependency lock file at path '/workspace/apps/portal'`. Owner reviewed the real Cloud Build log and confirmed: Firebase's framework/monorepo detection runs **before** any `buildCommand` override and checks for a lock file at `rootDir` (`apps/portal`) — a `buildCommand`/`runCommand` override cannot route around this. |
| Scope of this phase | Narrow Plan + Formal Review only for this specific fix. Does not reopen any other part of the approved `production-release` Plan/Review. |

---

## 1. Root cause (confirmed, not guessed)

- Fresh Prints is an npm-workspaces monorepo: root `package.json` has `"workspaces": ["apps/*", "packages/*"]`, a single `package-lock.json` at the repo root, and `apps/portal` has no lock file of its own — correct, standard npm-workspace behavior.
- Firebase App Hosting's buildpack has **official first-class monorepo support only for Nx and Turborepo** (`https://firebase.google.com/docs/app-hosting/monorepos`). Plain npm workspaces are not a recognized monorepo shape.
- Two rollout attempts confirmed via real Cloud Build logs (owner-verified in Console, not inferred) that detection fails looking for a lock file inside `rootDir` (`apps/portal`) before `buildCommand` executes — so the `buildCommand`/`runCommand` override added in commit `ef8d12b` (merged to `production` as `35ef8e1`) is **ineffective** and must be removed.

## 2. Fix: add minimal Turborepo support

Per Firebase's own documented Turborepo monorepo file layout, add exactly:

1. **`turbo` as a root devDependency** (Turborepo itself requires this for `turbo.json` to be meaningful).
2. **`turbo.json` at the repo root** with the current (2.x) `tasks` schema (not the deprecated 1.x `pipeline` key), scoped to a `build` task only — the minimum needed for App Hosting's detection to recognize this as a supported Turborepo monorepo:
   ```json
   {
     "$schema": "https://turborepo.com/schema.json",
     "tasks": {
       "build": {
         "dependsOn": ["^build"],
         "outputs": [".next/**", "!.next/cache/**"]
       }
     }
   }
   ```
3. **Keep `rootDir: ./apps/portal`** in `firebase.json`'s `apphosting` config unchanged — Firebase's own doc states Turborepo mode still requires pointing `rootDir` at the target app subdirectory, not the monorepo root ("Turborepo users must specify a target app directory because there is no concept of a default project in Turborepo").
4. **Remove `buildCommand`/`runCommand`** from `apps/portal/apphosting.yaml` (added in `ef8d12b`) — confirmed ineffective, and removing them restores the Next.js framework adapter's automatic optimizations that were disabled by having them set.
5. **Keep the single root `package-lock.json`** — do not create any lock file inside `apps/portal`. No change to npm workspaces configuration itself.

## 3. Explicit non-goals

- Does not restructure `apps/`/`packages/` layout.
- Does not change any application/business logic.
- Does not change dependency versions except adding `turbo` itself.
- Does not touch Cloud Functions, Firestore/Storage Rules, indexes, secrets, or any other already-completed deployment-order step.
- Does not retry the App Hosting rollout until this fix is verified locally, committed to `development`, merged to `production` via PR, and the exact merged commit is confirmed.

## 4. Known risk (flagged, not fully resolved by this fix)

An open, unresolved firebase-tools GitHub issue (#9562) describes `npm ci` failures inside App Hosting's Turborepo build for npm-workspaces monorepos, where transitive dependencies hoisted to the root `node_modules` are reported as "missing from lock file" for unrelated packages (e.g. `acorn`, `markdown-it`). This is a different failure mode than the one just diagnosed (that one was the framework-detection lockfile check; this one would surface later, inside the actual `npm ci` step, if it happens at all). **This Plan does not claim the fix is guaranteed on the first retry** — the next rollout attempt is itself the real verification; if a new, different failure appears, it will be diagnosed on its own merits rather than assumed to be the same class of problem.

## 5. Verification (required before commit, all must exit 0)

1. `npm ci` (repo root, confirms the added `turbo` devDependency installs cleanly and the lockfile stays internally consistent)
2. `npx turbo run build --filter=@fresh-prints/portal` (confirms Turborepo can resolve and build the Portal workspace target through its own task graph, including its `@fresh-prints/shared` / `@fresh-prints/show-picker` workspace dependencies)
3. `npm run typecheck --workspace @fresh-prints/portal`
4. `npm run build:portal` (existing direct npm build path — confirms turbo did not change the actual build output or break the non-turbo path)
5. `npm run lint` (repo-wide)
6. YAML validation of the corrected `apps/portal/apphosting.yaml` (no `buildCommand`/`runCommand`, `env` block intact)
7. `git diff --check`

## 6. Sequence

1. Implement (this Plan, after Formal Review approval).
2. Verify all six checks above.
3. Confirm `apps/portal` still resolves `@fresh-prints/shared` and `@fresh-prints/show-picker` (part of check 2/3 above — a broken workspace resolution would fail typecheck or the turbo build).
4. Commit to `development`.
5. **Stop at the `development`→`production` PR checkpoint** — do not merge, do not retry the App Hosting rollout, until the owner confirms the PR is merged and the exact production commit is verified via `git fetch`/`git rev-parse`.

## 7. Record of prior attempts (for the goal's permanent record)

- **Attempt 1** (commit `9437d4b`, no build override): failed — `Missing dependency lock file at path '/workspace/apps/portal'`.
- **Attempt 2** (commit `35ef8e1`, `buildCommand`/`runCommand` override added): failed identically — confirmed via real Cloud Build log inspection that App Hosting's framework-detection step runs before `buildCommand` and checks `rootDir` for a lock file regardless of the override.
- **This Plan (attempt 3, pending):** add officially-documented minimal Turborepo support instead of a build-command workaround.
