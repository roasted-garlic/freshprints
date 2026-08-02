# Final Studio remediations clean commit manifest

Production base: `11960852f45f948e37a1a5aeb3b09699882cd1fd`

| Original commit | Clean commit | Subject | Remediation | Contents / dependencies |
|---|---|---|---|---|
| `ca315f2391b4961dc97ddbe87bf351c335405c6a` | `925530d` | preserve matched Whatnot show updates | Whatnot | Studio hook/service, merge helper, focused tests, Plan/Review/Test/Implementation Review/checkpoint; independent |
| `7f92b103c968499e6b8f569eefadc0896957b88e` | `fcfc645` | show donated design overflow menu | Customer upload | Shared intake/menu behavior, CSS, focused tests and workflow artifacts; base for positioning/dialog work |
| `1bbd2594ca7595dba6a98e2dc59c77a3972914a7` | `23197e8` | position donated menu below trigger | Customer upload positioning | Portaled fixed positioning and collision fallback, tests and Amendment 1 artifacts; depends on `7f92b10` |
| `3ea70f7a365bf77900bb94dd191b680ee3b3e840` | `f48543a` | add safe donation delete dialogs | Customer upload Amendment 2 | In-app exclusion/deletion dialogs, permission service, metadata-only exclusion, deletion callables/helpers/tests and artifacts; depends on overflow work |
| `830f6e7267914aec0248bf95dce76d0643c3af66` | `d57d933` | complete safe upload deletion | Customer upload Amendment 3 | Schema-owned asset manifest, fail-closed validation, retry-safe cleanup, direct design dependency check, tests and artifacts; depends on Amendment 2 |
| `1873b10d7874b36ba4cf95d2d0421e9c1f11bdd0` | `5a75e56` | add customer upload restore parity | Customer upload Amendment 4 | Visible Restore to Pending modal/parity, focused tests and artifacts; depends on Amendments 1–3 |

All implementation cherry-picks used `-x`. Shared state/handoff conflicts were resolved to the production side; a separate narrow documentation commit records release state. The downward-positioning commit is conclusively `1bbd2594ca7595dba6a98e2dc59c77a3972914a7`.
