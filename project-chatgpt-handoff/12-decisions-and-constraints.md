# Decisions and Constraints

> Full log: `docs/project/DECISIONS.md` — newest ADRs first.

## Platform (immutable without ADR revision)

| Decision | Rule |
|----------|------|
| ADR-FP-008 | Two apps only: Fresh Prints Studio + Fresh Prints Portal |
| ADR-FP-009 | Three Studio workspaces: Imports, AI Review, Design Library |
| No native mobile | Portal is responsive web; optional PWA only |

## Catalog lifecycle

| Decision | Rule |
|----------|------|
| Design statuses | `imported`, `processing`, `ready`, `rejected`, `archived` |
| Deprecated | `queued`, `printed` on designs — blocked for new writes |
| Approval | Only via `catalogApprovalService` — not Edit Design modal |
| Library scope | Approved catalog (`ready`) only by default |

## AI enrichment (recent ADRs)

| ADR | Summary |
|-----|---------|
| ADR-FP-029 | v15 prompt + parse coercion + category resolver + unified retry |
| ADR-FP-028 | Dual-arc OCR validation + re-run overlay stepper |
| ADR-FP-027 | Rejected tab actions navigate to target inbox tab |
| ADR-FP-026 | Descriptions required with server synthesis fallback |
| ADR-FP-025 | Text-only title color suffix rules |
| ADR-FP-024 | Configurable OpenAI vision model via Settings |

## Architecture constraints

- Single Firebase project for Studio and Portal
- Services own all Firebase SDK calls
- Single Firebase init module
- Firestore = metadata; Storage = files
- Permission checks centralized in `permissionService.ts`

## Workflow constraints (FreshForge)

```
Plan → Review → Implement → Test → Signoff
```

- No implementation without approved plan in `docs/workflow/plans/`
- No signoff without tests run or failures documented
- Scope never silently expands beyond approved plan
- Human checkpoint stops all implementation until resolved

## Product constraints

**In scope for Fresh Prints:**
- Design catalog management
- AI-assisted enrichment with staff review
- Print request planning (Phase 6+)
- Print run / show planning (Phase 7+)
- Production file export for gang sheets

**Out of scope:**
- Ecommerce checkout for catalog prints
- Shipping / fulfillment
- Order payment (except optional custom design fee, Phase 9)
- Customer Studio access
- Marketplace / social features
- Custom REST API for core CRUD

## Naming conventions (official)

| Name | Meaning |
|------|---------|
| Fresh Prints Studio | Electron desktop, staff |
| Fresh Prints Portal | Customer web app |
| AI Review / AI Processing | Workspace at `/ai-review` |
| Design Library | Approved catalog at `/designs` |

Do not use deprecated terms like "Approval Mode" as primary naming — use AI Review workspace.

## When proposing changes

1. Check current roadmap phase (`03-roadmap-and-phases.md`)
2. Check if ADR already covers the decision
3. If architectural → new ADR in `DECISIONS.md`
4. If security-related → review phase + human approval for production
5. If data model change → update `DATA_MODEL.md` + migration notes
