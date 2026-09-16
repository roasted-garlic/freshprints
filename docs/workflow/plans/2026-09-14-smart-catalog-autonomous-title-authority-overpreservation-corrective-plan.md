# Smart Catalog Autonomous title-authority over-preservation corrective — plan

Date: 2026-09-14  
Environment: `fresh-prints-dev` only  
Precondition: owner must restore DEV to `shadow` / `catalogAutonomousLiveEnabled=false` / Pass 2 OFF.

## Problem

The second DEV soak generated valid AI catalog titles but persisted six low-quality existing roots:
`a large group 2`, `and this ios why I wanted 2`, `Be a nice human`, `chucky`, `DR pepper png 1-11`,
and `drinks coffee black 2`. Every row had `catalogTitleSource=legacy_unknown`, no positive title
authority metadata, valid description/category/Smart Profile, `system:catalog-autonomy` approval,
and synced Firestore/publication/Algolia. The provider and title generation are healthy.

## Root cause

`resolveFinalCatalogCopy` currently treats a non-empty, structurally valid source-less root as usable
unless it matches a narrow placeholder shape. It also infers `staff` from `createdBy != updatedBy`.
Neither condition proves that the exact title was intentionally authored or approved. The resolver
returns `titleSource=root`; the same value is then used by the automation decision and atomic Ready
write, so the low-quality root survives unchanged into publication and Algolia.

## Bounded implementation

1. Define provenance mechanically: only explicit `staff`, explicit `trusted_import`, and explicit
   `ai_generated` protect an existing title. `import_filename` is always untrusted source-derived
   title provenance; `legacy_unknown` is always untrusted absent positive evidence.
2. Remove `createdBy != updatedBy` inference. A generic staff metadata edit, approval, reprocess,
   or Ready transition must not establish title authority.
3. When a valid AI candidate exists, resolve `import_filename` and `legacy_unknown` roots to the
   candidate and persist `catalogTitleSource=ai_generated`. If no candidate exists, fail closed
   rather than silently authorizing the unknown root.
4. Preserve explicit staff-authored title edits, explicit trusted-import titles, and existing
   explicitly AI-generated titles. Keep description/category resolution, Smart Profile merge,
   publication, stale-attempt guard, and Shadow no-write behavior unchanged.
5. Keep Rules/client provenance allowlists narrow: client title edits may write only `staff`;
   import/customer promotion writes `import_filename`; Functions own `ai_generated` and
   `legacy_unknown`. Do not broaden client authority based on staff identity or generic edits.

## Regression and verification

- Resolver fixtures: all six new low-quality titles plus the prior four filename-like titles,
  explicit staff title, explicit trusted-import title, explicit AI title, untrusted legacy title with
  valid candidate, generic staff metadata edit without title edit, and Ready/approval transition.
- Queue and reprocess contracts prove the selected title and provenance are atomically persisted;
  malformed candidate remains Needs Review; Shadow remains no-write.
- Run full Functions AI tests, build, Studio typecheck/lint, targeted Rules suites, and deployed
  source parity.
- Deterministic acceptance: `drinks coffee black 2` + `Skull Coffee Black Butterfly Floral`
  resolves to the AI title; a genuinely staff-edited title remains unchanged.
- After owner restore, deploy only the reviewed DEV closure (the five Functions plus Rules), verify
  archives/revisions, run a bounded Processing-queue soak, capture candidate/final title pairs and
  classify accepted AI / protected human / protected trusted-import / unexpected root retention.
  Unexpected root retention and all malformed Ready counters must be zero.

## Non-goals and production boundary

No prompt/provider change, repair/backfill, production deployment/settings/data/Algolia mutation,
or production reprocessing is authorized. Stop before Owner QA unless the bounded DEV soak and
independent adversarial review pass.
