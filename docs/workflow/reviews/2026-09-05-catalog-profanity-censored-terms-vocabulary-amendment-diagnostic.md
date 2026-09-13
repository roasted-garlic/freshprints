# Amendment Diagnostic: Existing Censored Terms Cannot Drive Autonomous Filter

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Parent corrective | `pre-ws5-catalog-profanity-autonomous-safety-gate` |
| Plan | `docs/workflow/plans/2026-09-04-catalog-profanity-autonomous-safety-gate-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-04-catalog-profanity-autonomous-safety-gate-review.md` |
| Trigger | Owner amendment: reuse Studio “Words/phrases to censor” as Autonomous vocabulary |
| Status | **STOPPED — OWNER DECISION REQUIRED** |
| Verdict | **[NEEDS OWNER DECISION — EXISTING CENSORED TERMS CANNOT SAFELY DRIVE AUTONOMOUS FILTER]** |

---

## Mechanical finding (authoritative)

The Studio UI the owner cited (“Explicit Content” + “Words/phrases to censor”) is **not** a global Settings vocabulary.

It is a **per-design staff field** written during AI Review / Design Library edit:

| Item | Exact value |
|------|-------------|
| Persisted field | `censoredTerms?: string[]` |
| Document | `designs/{designId}` |
| Settings document | **None** — not under `settings/*` |
| Storage format | Optional string array; missing/empty ⇒ no Portal masking; kept when Explicit later turned off (inactive until Explicit on again) |
| Normalization on write | Client chip parse via `parseTagsInput` / `normalizeDesignTags`; empty list → `deleteField()` |
| Studio UI | `AiReviewFormPanel` + `DesignFormFields` — field visible only when `isExplicitContent` is true |
| Studio write path | Staff draft → `aiReviewInboxService` / `designService.updateDesign` → Firestore design doc (Rules: `catalogMetadataOnlyUpdate` / design validators allow `censoredTerms`) |
| Portal read/mask path | Design hydrate → `resolvePortalCensoredDisplayText` / `maskCensoredDesignText` — masks title/description only when `isExplicitContent === true` and customer is in Censored mode |
| Server Autonomous consumer today | **None** — Functions only **preserve** `censoredTerms` on reprocess clear lists; no enrichment read of a shared vocabulary |
| Cache | N/A for a global vocab (does not exist). Per-design field is live on the design document. |
| Takes effect without deploy | Portal masking: **yes** (per-design write). Autonomous filter: **not applicable** (no shared vocab). |

Contract preserved in UI copy:

> Human classification only. Portal shows censored artwork by default; AI never sets this.

ADR / DATA_MODEL: Explicit Content is human-only; AI must not set `isExplicitContent`.

---

## Why this cannot safely drive Autonomous filtering

Autonomous decision runs in enrichment **before** staff review:

```
import/promote → enrich → computeCatalogAutomationDecision → Needs Review | auto Ready
```

At that moment, for a new/imported design:

- `isExplicitContent` is typically unset/false
- `censoredTerms` is typically missing/empty (staff has not entered per-design terms yet)

Using `designs/{id}.censoredTerms` as the Autonomous vocabulary would therefore:

1. **Almost always be empty** on first Autonomous pass → gate never fires when needed most
2. **Invert product intent** — terms today are staff *display* masks for a design already classified Explicit, not a pre-approval denylist
3. **Cannot give “one owner vocabulary”** without a new global settings field (scope change)

There is **no** existing owner-managed global censored-term list in Studio Settings for the server to load.

---

## Explicit Content toggle (unchanged recommendation)

Regardless of vocabulary source:

- AI / Autonomous **must not** set `isExplicitContent`
- Match → hard Autonomous blocker → Needs Review → staff may manually enable Explicit + enter terms
- Do not change “AI never sets this” copy

---

## Empty vocabulary (if a shared source existed)

Owner expected: empty configured list → no profanity match from this gate; no hidden fallback denylist.

That empty-list rule is fine **for a true settings vocabulary**. It is **not** a usable Autonomous safety posture when the only existing field is per-design and empty at decision time.

---

## STOP — required owner decisions

### Primary

**[NEEDS OWNER DECISION — EXISTING CENSORED TERMS CANNOT SAFELY DRIVE AUTONOMOUS FILTER]**

Choose one:

| Option | Meaning |
|--------|---------|
| **A. Global Settings vocabulary (scope change)** | Add a new authorized Studio Settings field (e.g. under `settings/*`) for shared Autonomous + optional Portal-default terms; server loads it for the matcher. Requires plan amendment + re-review: **[NEEDS OWNER DECISION — CENSORED TERMS INTEGRATION SCOPE CHANGE]** |
| **B. Code-owned curated denylist (original Formal Review)** | Proceed with reviewed code-owned list (owner-approved vocabulary contents); Portal per-design `censoredTerms` remains display-only and separate |
| **C. Hybrid** | Global Settings list for Autonomous; keep per-design `censoredTerms` for Portal masking only (aligned copy optional later). Also a scope change vs current Plan/FR |
| **D. Decline Autonomous profanity gate** | Leave WS5 blocked or proceed without this gate (owner risk acceptance) |

### Do not authorize without choosing

- Silent second code-owned list while claiming “uses Studio censored terms”
- Using per-design `censoredTerms` as Autonomous source
- Auto-setting `isExplicitContent` on match
- Implementation / DEV deploy / Autonomous / WS5 canary

---

## Answers owner asked (IR-style preview)

| # | Question | Answer |
|---|----------|--------|
| 1 | Exact field/path | `designs/{designId}.censoredTerms` — **not** a settings doc |
| 2 | Studio write path | AI Review / Design edit staff update → Firestore design |
| 3 | Portal read/mask path | `maskCensoredDesignText` / `resolvePortalCensoredDisplayText` |
| 4 | New server-side read path | **Not viable** against existing field for Autonomous |
| 5 | Vocabulary cached? | No global vocab exists |
| 6 | Cache invalidation | N/A |
| 7 | Changes without deploy? | Per-design Portal masking: yes. Autonomous shared vocab: N/A |
| 8 | Explicit remains human-only? | **YES** (must stay) |
| 9 | AI writes Explicit? | **NO** (must stay) |
| 10 | Duplicate vocabulary created? | **NO** this pass (stopped before implement) |
| 11 | Empty vocabulary behavior | Per-design empty ⇒ no Portal mask; cannot serve Autonomous |
| 12 | Portal behavior changed? | **NO** |
| 13 | Autonomous hard-block? | **Not implemented** — blocked on owner decision |
| 14 | Customer Print Request changed? | **NO** |

---

## Workflow impact

- Profanity corrective Implement remains **blocked**
- WS5 remains **BLOCKED ON PROFANITY SAFETY CORRECTIVE**
- Prior Plan/Formal Review retained; this amendment **does not** approve reuse of per-design terms
- No implementation, deploy, Autonomous, canary, production, commit/push

---

## Next step

Await owner choice among **A / B / C / D** above. Then revise Plan + Formal Review (or proceed with B as originally reviewed) before Implement.
