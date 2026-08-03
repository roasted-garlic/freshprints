# Test Report: Studio silent auto-update install and safe release notes

Date: 2026-08-02
Branch: `fix/studio-updater-silent-install-and-release-notes` (based on `origin/development`)

## Root-cause confirmation

### 1. NSIS wizard during automatic update

`restartAndInstallStudioUpdate()` called `autoUpdater.quitAndInstall(false, true)`. Per
electron-updater's own `AppUpdater.d.ts`: `isSilent` (first arg, Windows-only) "Runs the installer
in silent mode. Defaults to `false`." `false` is exactly what produces the interactive NSIS wizard
— confirmed directly from the type declaration, not assumed.

### 2. Raw HTML release notes

`info.releaseNotes` from electron-updater's `UpdateInfo` (`builder-util-runtime`'s
`updateInfo.d.ts`) is typed `string | Array<{ version: string; note: string | null }> | null` —
GitHub's rendered release-body HTML. The prior code only checked
`typeof info.releaseNotes === "string"` and passed it through unmodified into `StudioUpdateState`,
which `StudioUpdatesSettingsSection.tsx` rendered inside a raw `<pre>` with no sanitization or
bounding — the exact overflow and raw-tag-display the owner observed.

## PASS WITH NOTES checkpoint

`docs/workflow/reviews/2026-08-02-studio-updater-beta2-to-beta3-live-proof-checkpoint.md` — records
the full beta.2→beta.3 live proof as PASS WITH NOTES, both notes reproduced above.

## Silent-install implementation

`apps/studio/electron/ipc/studioUpdate/studioUpdateService.ts`'s
`restartAndInstallStudioUpdate()`: `autoUpdater.quitAndInstall(false, true)` →
`autoUpdater.quitAndInstall(true, true)`. No other line in that function changed — the existing
`canRestartAndInstall(state) || !hasPendingDownloadedUpdate || !autoUpdater` gate (unchanged) still
means this can only be reached after `update-downloaded` has fired and only via the explicit
IPC-triggered renderer call. `autoDownload = false` and `autoInstallOnAppQuit = false` are
unchanged. `apps/studio/electron-builder.json5`'s NSIS config (`oneClick: false`, etc.) is
untouched — confirmed via `git diff` showing zero changes to that file — because
`isSilent`/`quitAndInstall` governs only the automatic-update runtime path; the manually downloaded
first-time installer is launched directly by the user and is unaffected by this code.

## Release-note normalization design

New `packages/shared/src/studioUpdate/studioUpdateReleaseNotes.ts`, `normalizeStudioReleaseNotes()`:

- Accepts electron-updater's real `releaseNotes` shape (`string | Array<{version, note}> | null`,
  confirmed from `builder-util-runtime`'s type declarations before implementation) — array entries
  are joined with blank-line separators.
- No DOM parser or third-party HTML dependency added — confirmed via `grep` that no
  html-to-text/sanitize-html/dompurify/turndown/cheerio dependency already exists anywhere in the
  repo. GitHub release-note HTML is a small, predictable Markdown-rendered vocabulary (paragraphs,
  links, lists, headings, emphasis, code, line breaks) — not arbitrary untrusted web content — so a
  small, thoroughly tested tag-handling pass was chosen over adding a dependency for this narrow
  input shape, per the task's stated preference.
- `<script>`/`<style>` elements are stripped **including their text content** (never just
  unwrapped) — the one case where inner content must not survive.
- Block-level tags (`<p>`, `<div>`, headings, `<blockquote>`, `<li>`) become paragraph/line
  boundaries before their tags are stripped, so structure survives as plain-text spacing.
- `<a href="...">text</a>` becomes just `text` — the href is dropped, never rendered.
- Every other tag is stripped, keeping only its inner text.
- Common named entities (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`/`&apos;`, `&nbsp;`) and numeric
  entities (`&#NNN;`, `&#xHEX;`) are decoded.
- Runs of 3+ newlines collapse to exactly one blank line; trailing whitespace per line is trimmed.
- Empty or whitespace-only input (before or after conversion) returns `null`.
- Never uses `dangerouslySetInnerHTML`, an iframe, or a webview — output is always plain text
  rendered as plain text.

## Exact maximum-length and whitespace rules

- Max length: **2000 characters**. Longer output is sliced to exactly 2000 characters (trailing
  whitespace trimmed from the cut point) plus a single trailing `…`, for a final length of 2001
  characters — deterministic, verified by test.
- Whitespace: per-line trailing spaces/tabs stripped; 3+ consecutive newlines collapse to 2; leading/
  trailing whitespace of the whole result trimmed.

## Renderer/CSS implementation

`StudioUpdatesSettingsSection.tsx`: replaced the raw `<pre className="settings-field-hint">` with a
`<div className="settings-release-notes">` containing a `"What's new"` label and a
`<p className="settings-release-notes-body">` holding the already-safe plain text.

`settings.css` (new rules):
```
.settings-release-notes { display: grid; gap: var(--space-1); max-width: 100%; min-width: 0; }
.settings-release-notes-body {
  max-height: 12rem;
  max-width: 100%;
  overflow-wrap: anywhere;
  overflow-y: auto;
  white-space: pre-wrap;
  ...
}
```
This bounds vertical growth (scrolls internally past 12rem instead of growing the card), prevents
long unbroken strings from escaping horizontally (`overflow-wrap: anywhere`), and preserves
paragraph structure while still wrapping (`white-space: pre-wrap`). No inline styles — matches this
component's existing convention of dedicated CSS classes.

## Safe-error behavior preserved

`toSafeStudioUpdateError()` (`studioUpdateErrorMapping.ts`) was not modified. Release notes and
updater errors remain fully separate code paths — the normalizer only touches
`update-available`'s `releaseNotes` field.

## Files changed

- `apps/studio/electron/ipc/studioUpdate/studioUpdateService.ts` (silent install; release-notes normalization wired into `update-available`)
- `apps/studio/electron/ipc/studioUpdate/studioUpdateService.test.ts` (new — source-level regression guards)
- `apps/studio/src/renderer/src/features/settings/components/StudioUpdatesSettingsSection.tsx` (release-notes rendering)
- `apps/studio/src/renderer/src/styles/components/settings.css` (bounded, scrollable release-notes CSS)
- `apps/studio/package.json` (version bump to `1.0.0-beta.4`)
- `packages/shared/src/studioUpdate/studioUpdateReleaseNotes.ts` (new)
- `packages/shared/src/studioUpdate/studioUpdateReleaseNotes.test.ts` (new)
- `packages/shared/src/types/studioUpdate/studioUpdateIpc.types.ts` (doc comment update, no shape change)
- `docs/workflow/reviews/2026-08-02-studio-updater-beta2-to-beta3-live-proof-checkpoint.md` (new)
- `docs/workflow/reviews/2026-08-02-studio-updater-silent-install-and-release-notes-test-report.md` (this file)

## Tests added and results

| Suite | Count | Result |
|---|---|---|
| `studioUpdateReleaseNotes.test.ts` (new) | 12 | pass — covers paragraph conversion, anchor-text extraction, line breaks/lists/headings, entity decoding, script/style stripping, empty-input null, whitespace normalization, 2000-char truncation, representative real-world GitHub sample (asserts absence of every relevant raw tag), array-shape support, all-empty array → null, plain-text passthrough |
| `studioUpdateService.test.ts` (new) | 4 | pass — source-level regression guards: `quitAndInstall(true, true)` present; `quitAndInstall(false, true)` absent; gating condition intact; exactly one `quitAndInstall` call site in the file (see "Regression note" below for why this file can't be directly unit-tested) |
| All prior updater/generator suites | 23 | pass, unaffected |
| **Total** | **39** | **39/39 pass** |

**Regression note:** `studioUpdateService.ts` imports `electron` at module scope, which cannot be
safely loaded outside a real Electron process (consistent with this repo's existing convention —
no other file with a top-level `from "electron"` import is directly unit-tested via `tsx --test`).
The silent-install behavior is therefore verified two ways: (1) the source-level regression guard
above, and (2) direct inspection of the compiled output in a real packaged build (see "Packaged
beta.4 evidence" below) — not a live interactive Electron test, which requires the real installed-
app proof described in the parent task.

## Full verification results

| Check | Command | Result |
|---|---|---|
| Focused updater/release-note/generator tests | `npx tsx --test` (7 files) | **39/39 pass** |
| Studio typecheck | `npx tsc` (apps/studio) | exit 0 |
| Repo lint | `npm run lint` | exit 0, 0 warnings |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | exit 0 |
| Functions build | `npm run build` (functions/) | exit 0 |
| Studio production package build (prerelease config) | `tsc && vite build && electron-builder` | exit 0 — produced `Fresh Prints-Windows-1.0.0-beta.4-Setup.exe` |
| Whitespace | `git diff --check` | exit 0 |

## Rendering-inspection proof (long release notes cannot overflow the card)

No live GUI harness is available in this environment. Verified statically instead: confirmed via
`grep` that `settings.css` contains all four required bounding properties on
`.settings-release-notes-body` (`max-height: 12rem`, `overflow-y: auto`, `overflow-wrap: anywhere`,
`white-space: pre-wrap`), and that the parent `.settings-release-notes` is `max-width: 100%;
min-width: 0`. Combined with `normalizeStudioReleaseNotes`'s hard 2000-character cap, the rendered
text is both algorithmically bounded (can never be arbitrarily long) and CSS-bounded (can never
grow the card horizontally or vertically without limit). Final interactive visual confirmation
remains an owner checkpoint at the live beta.3 → beta.4 proof, per the parent task.

## Packaged beta.4 channel evidence

Extracted the actual built `app.asar` from a full `electron-builder` run (prerelease config).
Compiled main-process bundle: `function bs() { return "prerelease"; }` — literal, no env-var
lookup.

## Packaged beta.4 Firebase evidence

Same extraction, renderer bundle: `VITE_FIREBASE_PROJECT_ID:"fresh-prints-dev"` present as the
actual resolved config. Confirmed **zero** occurrences of `fresh-prints-prod` anywhere in the
extracted bundle (`dist/` and `dist-electron/`).

## Silent-install evidence in the packaged bundle

Same extraction: `Ie.quitAndInstall(!0, !0)` (minified `true, true`) — exactly **one** call site
for `quitAndInstall` in the entire compiled main bundle, confirming the silent-install change
reached the actual packaged artifact and is not called from anywhere else.

## Confirmation

- `1.0.0-beta.3` was not modified, deleted, or touched by any command in this pass.
- `1.0.0-beta.4` was **not** published — the package build above was local-only; build artifacts
  were removed after inspection and are not committed (gitignored).
- No production or Firebase action occurred. No `PROD_FIREBASE_*` value was read or referenced.
