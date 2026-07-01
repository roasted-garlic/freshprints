# Plan — AI Playground Pretty JSON Output

- **Date:** 2026-07-01
- **Mode:** Managed Phase
- **Goal slug:** `ai-playground-pretty-json-output`
- **Roadmap phase:** Phase 5 maintenance — AI Processing / Settings Playground
- **Gate:** Plan → **Review (STOP here)** → Implement → Test → Signoff
- **Human checkpoint:** None expected. This is a local renderer display change.

---

## 1. Goal

Improve Settings AI Playground result readability:

- When the playground response output is JSON, display it as pretty formatted JSON.
- If the response is not JSON, display the original output unchanged.

---

## 2. Scope

| File | Change |
|---|---|
| `src/renderer/src/features/settings/utils/aiPlaygroundOutputFormatter.ts` | Add a small display formatter that tries to parse exact JSON or a fully fenced ` ```json ... ``` ` block and returns `JSON.stringify(parsed, null, 2)` when successful. |
| `src/renderer/src/features/settings/utils/aiPlaygroundOutputFormatter.test.ts` | Add focused tests for minified JSON, fenced JSON, arrays, invalid JSON, and prose. |
| `src/renderer/src/features/settings/pages/SettingsPage.tsx` | Render the formatted output in the result `<pre>` and copy the same visible formatted output. |
| `.cursor/workflow/state.md` | Track this managed phase through signoff. |
| `docs/workflow/reviews/2026-07-01-ai-playground-pretty-json-output-test-report.md` | Record verification. |
| `docs/workflow/reviews/2026-07-01-ai-playground-pretty-json-output-signoff.md` | Record signoff. |

No prompt, Cloud Function, provider, data model, Firebase, settings persistence, or AI Processing pipeline changes.

---

## 3. Detection Rules

Format only when one of these succeeds:

1. The trimmed output parses directly with `JSON.parse`.
2. The trimmed output is entirely wrapped in a Markdown code fence, optionally labeled `json`,
   and the fence body parses with `JSON.parse`.

Leave everything else unchanged. This avoids stripping useful prose or accidentally extracting a
partial JSON object from a longer explanation.

---

## 4. UI Behavior

- The result modal still shows `Response output`.
- JSON appears indented with 2 spaces inside the existing `<pre>`.
- Non-JSON output stays exactly as returned.
- The copy button copies the displayed formatted output, not the raw unformatted JSON string.

---

## 5. Verification

Run:

1. `npx tsx src/renderer/src/features/settings/utils/aiPlaygroundOutputFormatter.test.ts`
2. `npx tsc --noEmit`
3. `npm run lint`
4. `git diff --check`

Manual/inspection checks:

- Minified JSON response displays as multiline pretty JSON.
- Fenced `json` response displays without the fences and is pretty formatted.
- Non-JSON prose remains unchanged.
- Copy button copies the visible formatted output.

---

## 6. Acceptance Criteria

- [ ] AI Playground JSON output is pretty formatted in the result modal.
- [ ] Fenced JSON output is detected and pretty formatted.
- [ ] Non-JSON output remains unchanged.
- [ ] Copy button copies the visible formatted output.
- [ ] Focused formatter tests pass.
- [ ] TypeScript, lint, and whitespace checks pass.

---

## 7. Out Of Scope

- Changing the AI prompt.
- Changing the playground Cloud Function response shape.
- Parsing or normalizing AI Processing output.
- Adding a JSON tree viewer.
- Persisting playground results.
