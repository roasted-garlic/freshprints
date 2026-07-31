import { defineConfig, type Plugin } from 'vite'
import { build as esbuildBuild } from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'

/**
 * The Whatnot import split-window "shell" (right-side panel) is a second, separate
 * BrowserWindow with its own tiny preload and plain, unbundled HTML/CSS/JS — it has no app
 * framework of its own. `vite-plugin-electron/simple`'s preload option only supports a single
 * entry (it hardcodes `inlineDynamicImports: true`, which Rollup forbids for multiple inputs), so
 * this plugin builds the shell's preload with esbuild directly (already a transitive Vite
 * dependency — no new dependency added) and copies its two static assets into dist-electron/,
 * once per main-process build.
 */
function buildWhatnotImportShellAssets(): Plugin {
  return {
    name: 'build-whatnot-import-shell-assets',
    apply: 'build',
    async closeBundle() {
      const sourceDir = path.join(__dirname, 'electron/ipc/whatnotImport')
      const outDir = path.join(__dirname, 'dist-electron')

      // A sandboxed preload (webPreferences.sandbox: true) is loaded via Electron's sandboxed
      // preload bundle, which does not support native ES module import/export syntax regardless
      // of file extension — it must be plain CommonJS. Using format: 'esm' here (as the file's
      // .mjs extension might otherwise suggest) produces "Cannot use import statement outside a
      // module" and silently breaks contextBridge.exposeInMainWorld, since the script never runs.
      await esbuildBuild({
        entryPoints: [path.join(sourceDir, 'whatnotImportShellPreload.ts')],
        outfile: path.join(outDir, 'whatnotImportShellPreload.js'),
        bundle: true,
        platform: 'node',
        format: 'cjs',
        external: ['electron'],
        target: 'node18',
      })

      for (const fileName of ['whatnotImportShell.html', 'whatnotImportShellRenderer.js']) {
        fs.copyFileSync(path.join(sourceDir, fileName), path.join(outDir, fileName))
      }
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@fresh-prints/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@fresh-prints/show-picker': path.resolve(__dirname, '../../packages/show-picker/src'),
    },
  },
  build: {
    rollupOptions: {
      // A circular chunk dependency created by manualChunks (e.g. splitting `scheduler` away
      // from `react`/`react-dom`) only warns by default — Rollup still exits 0 — so a broken
      // packaged build can silently ship. Fail the build instead of warning for this specific
      // failure class; this is what actually shipped the white-screen production Studio build.
      onwarn(warning, warn) {
        if (warning.code === 'CIRCULAR_CHUNK') {
          throw new Error(`[build] Circular chunk detected: ${warning.message}`)
        }
        warn(warning)
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          // Package-boundary match (trailing '/'), not a bare substring match — a substring
          // match against 'node_modules/react' also matches unrelated packages like
          // react-router-dom while failing to catch `scheduler`, which react-dom requires at
          // module-init time. Splitting scheduler away from react/react-dom produces a circular
          // chunk dependency (vendor -> react-vendor -> vendor) that crashes on
          // `React.createContext` in packaged production builds only (Vite's dev server never
          // applies manualChunks, so this never reproduces via `npm run dev`).
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'react-vendor'
          }

          if (id.includes('node_modules/@firebase/auth') || id.includes('node_modules/firebase/auth')) {
            return 'firebase-auth'
          }

          if (id.includes('node_modules/@firebase/firestore') || id.includes('node_modules/firebase/firestore')) {
            return 'firebase-firestore'
          }

          if (id.includes('node_modules/@firebase/storage') || id.includes('node_modules/firebase/storage')) {
            return 'firebase-storage'
          }

          if (id.includes('node_modules/@firebase') || id.includes('node_modules/firebase')) {
            return 'firebase-core'
          }

          return 'vendor'
        },
      },
    },
  },
  plugins: [
    react(),
    buildWhatnotImportShellAssets(),
    electron({
      main: {
        // Shortcut of `build.lib.entry`.
        entry: 'electron/main.ts',
        vite: {
          resolve: {
            alias: {
              '@fresh-prints/shared': path.resolve(__dirname, '../../packages/shared/src'),
            },
          },
          build: {
            rollupOptions: {
              external: ['sharp'],
            },
          },
        },
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`.
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        input: path.join(__dirname, 'electron/preload.ts'),
      },
      // Ployfill the Electron and Node.js API for Renderer process.
      // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      renderer: process.env.NODE_ENV === 'test'
        // https://github.com/electron-vite/vite-plugin-electron-renderer/issues/78#issuecomment-2053600808
        ? undefined
        : {},
    }),
  ],
})
