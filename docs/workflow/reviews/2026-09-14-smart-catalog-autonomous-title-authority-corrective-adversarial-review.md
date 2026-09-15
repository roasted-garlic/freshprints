# Adversarial review — title-authority corrective (pre-DEV promotion)

Date: 2026-09-14  
Environment: `fresh-prints-dev` source review only

## Disposition

**STATIC PASS WITH OWNER-RESTORE BLOCKER — not an acceptance or Owner QA pass.**

The review checked the title resolver, queue persistence, owner Ready reprocess demotion, import
and promotion writers, Studio staff title edit, Firestore metadata allowlist, and focused tests.
No provider output, Smart Profile, description/category, publication, or Algolia behavior was
changed by this title-specific patch.

## Checks

- Explicit `catalogTitleSource` is allowlisted and optional for legacy records.
- Local import/customer promotion stamps `import_filename`; Staff Artwork and authenticated Studio
  title edits stamp `staff`; queue AI replacement stamps `ai_generated`; reprocess does not clear
  title provenance.
- Legacy source inference uses source metadata or a differing staff editor before bounded
  source-less placeholder detection. `PNG 4`, `PNG 6`, `ProjectWhite`, and `M4170303i1mimi` now
  resolve to the valid candidate in deterministic tests.
- The automation decision and atomic Ready write consume the same final title. Needs Review does
  not write a replacement root title/source, and candidate hard blockers remain authoritative.
- Focused title/persistence/reprocess/authority contracts pass `24/24`; full Functions AI passes
  `432/432`; Functions build, Studio TypeScript, targeted ESLint, and diff hygiene pass. Targeted
  design rules expression suites pass `32/32`; unrelated full-rules print-request/show-queue
  expression-budget cases remain an existing emulator limitation.

## Remaining owner gate

The latest read-only DEV settings check still reports
`catalogWorkflowMode=autonomous`, `catalogAutonomousLiveEnabled=true`, Pass 2 OFF. The owner must
restore DEV through the authenticated Studio control to `shadow` / live `false` / Pass 2 OFF before
any DEV Function/rules promotion or second live Processing-queue soak. No shell bypass or direct
Firestore/Admin write was used. Production remains untouched and outside this phase.
