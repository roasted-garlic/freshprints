# Decisions and Constraints

> Full log: `docs/project/DECISIONS.md` — newest ADRs first.

## Platform (immutable without ADR revision)

| Decision | Rule |
|----------|------|
| ADR-FP-008 | Two apps only: Studio + Portal |
| ADR-FP-009 | Three Studio design workspaces: Imports, AI Review, Design Library |
| No native mobile | Portal is responsive web |

## Brand / Settings (recent)

| ADR | Summary |
|-----|---------|
| ADR-FP-114 | Owner-uploaded Studio + Portal brand logos (`settings/brandLogos`, Storage `brand/**`); finalize + display-size callables; AR-locked boxes; separate Portal header/sidebar controls (defaults height 52); soft-deployed fresh-prints-dev; production deploy gated |

## Catalog lifecycle

| Rule | Detail |
|------|--------|
| Design statuses | `imported`, `processing`, `ready`, `rejected`, `archived` |
| Deprecated on designs | `queued`, `printed` |
| Approval | Staff AI Review / catalogApprovalService only |
| Library scope | `ready` only by default |

## Print Requests & Portal

| ADR | Summary |
|-----|---------|
| ADR-FP-071 | **One working print request** per Portal customer |
| ADR-FP-106 | **Public browse** + login-gated actions; guest overlay; guest catalog donate via Anonymous Auth + `guest` attribution (rules/Functions/Auth deploy human-gated) |
| ADR-FP-107 | Recently Requested = `lastAddedToShowAt` via `onShowAllocationCreated` (soft-deployed fresh-prints-dev 2026-07-21) |
| ADR-FP-103 | Portal add-to-show **cutoff hours** before show start (Studio Show Queue setting; Functions enforce; Studio staff exempt) |
| ADR-FP-066 | Customers add to shows via callables only; single show; full request; no override/re-queue |
| ADR-FP-065 | Shared `@fresh-prints/show-picker` |
| ADR-FP-064 | Production timer drives customer Printing tab |
| ADR-FP-075 | Standard item saves require **≥ 200 effective DPI**; 200–299 warn; ≥300 no warn |
| ADR-FP-030 | `requestCount` / `lastRequestedAt` are lightweight metadata only |
| — | Portal default catalog browse sorts **`createdAt` desc** (Studio-newest); Popular / Most Liked / Recently Requested keep metric sorts |

## Customer uploads (Phase 8 fast-follow)

| ADR | Summary |
|-----|---------|
| ADR-FP-073 | Customer artwork = `customerUploads`, not designs until staff promote; dual item source model; not Phase 9 |
| ADR-FP-074 | Library permission **optional** (default on); ownership required; staff may promote but must see declines |
| ADR-FP-080 | Pixel-based sizing `image-quality-v2` (≤6× toward 12″; 10″ request default; extended >2× staff-only); **human-only** halftone — no auto detector |
| ADR-FP-014 | Sequential AI Processing queue; no concurrent import enqueue; Auto advance default ON; post-import sequential auto-start when Auto advance on (amended 2026-07-13) |

## Custom Designs

| ADR / decision | Summary |
|----------------|---------|
| ADR-FP-088 | Assisted Creation uses its own request collection and status/proof machine; one open request; owner/admin mutate; helper read-only |
| Owner decision 2026-07-16 | Proof-ready emails use Resend first behind a provider-neutral interface; Brevo is deferred; owner Studio settings eventually select invite and proof-notice providers independently |

## AI enrichment (recent)

| ADR | Summary |
|-----|---------|
| ADR-FP-044 / v21 | Business-context Gemini prompt; server-side tag/category resolve |
| ADR-FP-042 / 043 | Optional tag rerank + suggestion author (defaults off) |
| ADR-FP-040 | Gemini provider (OpenAI path removed) |

## Architecture constraints

- Single Firebase project for Studio and Portal  
- Services / callables own Firebase access — not components  
- Firestore = metadata; Storage = files  
- Studio permissions via `permissionService`  

## FreshForge workflow

```
Plan → Review → Implement → Test → Signoff
```

No implementation without approved plan; no silent scope expansion; human checkpoints block production actions.

## Product out of scope

Ecommerce checkout, shipping, order payment (except optional Phase 9 design fee), customer Studio access, marketplace, native mobile, treating customer PNG uploads as Custom Request Q&A.
