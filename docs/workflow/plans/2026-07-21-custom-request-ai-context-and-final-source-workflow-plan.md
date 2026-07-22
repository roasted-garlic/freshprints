# Plan: Custom Request AI Context Export, Final Source Delivery, Workflow Navigation, and Proof Asset Hardening

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal ID | `custom-request-ai-context-and-final-source-workflow` |
| Related | docs/workflow/reviews/2026-07-21-custom-request-ai-context-and-final-source-workflow-review.md |

---

## Goal

Improve Fresh Prints Assisted Creation (Custom Requests) so staff can copy a complete AI-ready design context from Studio (no AI API), customer proof approval moves the request into a **Final Source Needed** preparation stage (not completed), Studio follows the request after Start Work, Portal communicates waiting-for-final-artwork clearly, and proof previews no longer expose convenient human-readable filenames or direct Storage URLs in `img src`.

**Hard gate:** Plan → Review → **owner implementation approval** → Implement → Test → Signoff. No app code, Functions deploy, or rules changes until the owner explicitly approves implementation.

---

## Background

Owner Managed Phase brief (2026-07-21). Aligns with Phase 9 Custom Designs / Assisted Creation, ADR-FP-088 (proofing), ADR-FP-093/094 (approved proof download + Add to Request), ADR-FP-108 (`catalog_share`). Prior soft-signoffs (assisted resume + details parity) closed the same day; workflow was idle before this goal.

**Repo naming note:** Product “Custom Request” = collection `assistedCreationRequests` / feature folders `assisted-creation` (Portal) and `customer-requests` Assisted section (Studio). Brief paths like `apps/*/custom-requests/` and `packages/shared/.../customRequest/` **do not exist** — superseded by Assisted Creation (legacy wipe target `customRequests` only).

---

## Scope

### In Scope

1. **Studio AI Context Profile Modal** — copy-only JSON + prompt builders; no AI provider integration
2. **Proof approval → Final Source Needed → staff final upload → complete + Portal final download**
3. **Studio follow-request navigation** after successful Start Work (shared status→tab helper)
4. **Proof preview filename / delivery hardening** — opaque Storage names for new uploads; Portal `getBytes` → object URL; no friendly Save-As on preview

### Out of Scope

- AI API keys, Gemini/OpenAI callables, credits, automatic image generation
- Production deploy
- Destructive rename/migration of existing proof Storage objects
- New parallel request/proof/upload product systems
- DRM / context-menu disable as “security”
- Silent expansion into Etsy recommendations or print-request redesign

---

## Owner deliverable index (1–20)

| # | Deliverable | Section |
|---|-------------|---------|
| 1 | Current status / tab map | §1 |
| 2 | Current Start Work flow | §2 |
| 3 | Current proof approval flow | §3 |
| 4 | Current proof / final-source data model | §4 |
| 5 | Current Storage + Portal display flow | §5 |
| 6 | Exact verified files to modify | §6 |
| 7 | JSON schema mapped to real answer fields | §7 |
| 8 | Example context with references | §8 |
| 9 | Example context without references | §9 |
| 10 | Exact AI prompt text | §10 |
| 11 | Final Source Needed proposal | §11 |
| 12 | Proof hardening approach + browser limits | §12 |
| 13 | Migration / compatibility | §13 |
| 14 | Security review | §14 |
| 15 | Test matrix | §15 |
| 16 | Manual QA script | §16 |
| 17 | Rollback | §17 |
| 18 | Human checkpoints | §18 |
| 19 | Documentation updates | §19 |
| 20 | **Implementation approval request** | §20 |

---

## §1 Current Custom Request status and Studio tab map

**Persisted statuses** (`AssistedCreationStatus` in `packages/shared/src/constants/assistedCreation/assistedCreation.constants.ts`):

| Status | Open? | Terminal? | Studio stage tab (`AssistedStageTab`) |
|--------|-------|-----------|----------------------------------------|
| `submitted` | yes | no | **New** |
| `in_progress` | yes | no | **In progress** |
| `proof_ready` | yes | no | **Proof ready** |
| `revision_requested` | yes | no | **Revisions** |
| `approved` | no | yes | **Completed** |
| `rejected` | no | yes | **Completed** |
| `cancelled` | no | yes | **Completed** |

Source: `STAGE_STATUSES` / `stageForStatus` in `AssistedCreationRequestsSection.tsx`.

**Open-request rule:** one open request per customer among `submitted | in_progress | proof_ready | revision_requested` (`ASSISTED_CREATION_OPEN_STATUSES`). Any new Final Source status **must** be added to open statuses.

**There is no existing “Final Source Needed” status or tab** — `[CONFIRMED]`.

---

## §2 Current Start Work transition flow

```text
Studio Overview → Staff actions → Start work
  → assistedCreationRequestsService.updateStatus({ action: "start_work" })
  → callable staffUpdateAssistedCreationStatus (functions/src/assistedCreationRequests.ts)
  → assertAssistedCreationTransition: submitted → in_progress (staff)
  → toast; list refresh via Firestore listener
```

**Gap:** After success, Studio does **not** switch stage tab or keep selection via a shared navigator. Request moves to In progress tab; staff often remain on New with an empty/wrong selection.

Same pattern for `resume_work`: `revision_requested` → `in_progress`.

---

## §3 Current proof approval transition flow

```text
Portal Status panel (status === proof_ready)
  → customerRespondToAssistedCreationProof({ decision: "approve" | "request_revision" })
  → on approve: toStatus = "approved" (TERMINAL today)
  → sets approvedProofId + approvedAt (proof_image) OR approvedCatalogDesignId + approvedAt (catalog_share)
  → sibling proof Storage purge (proof_image only; ADR-FP-093)
  → Portal shows approved + Download / Add to Request (14-day / ADR-FP-094)
```

**Gap vs product goal:** Approve completes the request. No Final Source Needed stage; no separate final artwork asset.

`catalog_share` (ADR-FP-108): approve uses server-stored suggestion; no `approvedProofId`; Add to Request uses catalog attach — **must not regress**.

---

## §4 Current proof and final-source data model

**Proof row** (`AssistedCreationProof`): `id`, `kind?` (`proof_image` | `catalog_share`), `storagePath`, `fileName`, `contentType`, `sizeBytes`, optional note/purge/catalog fields.

**Storage (image proofs):** `assisted-creation/{customerUid}/{requestId}/proofs/{fileName}`  
**Current basename:** `proof-{n}-{mmddyyyy}-{HHmm}.{ext}` via `buildAssistedCreationProofStoredFileName` — human-readable; contradicts Workstream 4 for *new* uploads.

**Final source:** **Does not exist** as a separate entity today. “Final” delivery = approved proof bytes via `customerGetAssistedCreationApprovedProofFile` (base64 callable) after status `approved`.

**Answers:** `AssistedCreationAnswers` with `answersVersion: 1` only — no second readable version found (`ASSISTED_CREATION_ANSWERS_VERSION = 1`). Legacy = same v1 docs.

**Reference images:** `AssistedCreationReferenceImage` = `{ id, storagePath, fileName, contentType, sizeBytes, uploadedAt }` — **no per-image note or per-image usage**. Usage is request-level `answers.referenceUsage: AssistedCreationReferenceUsage[]`.

**Request has no customer `title` field** — only `id` + `answers.rawDescription` / requestType. Brief JSON `title` / `selected_path` must map carefully (see §7).

---

## §5 Current proof Storage and Portal display flow

| Surface | How preview loads | `img src` |
|---------|-------------------|-----------|
| Portal thumbs / status / proofs modal | `assistedCreationService.getDownloadUrl(storagePath)` → Firebase `getDownloadURL` | **Signed Storage URL** (readable Content-Disposition often includes `fileName`) |
| Studio proofs list / modal | same `getDownloadUrl` | Signed Storage URL |
| Portal approved **Download** button | `customerGetAssistedCreationApprovedProofFile` → base64 → blob → `createObjectURL` + intentional name | N/A (explicit download) |
| Studio Electron save | `downloadUrlToFile(url, fileName)` | Uses signed URL + stored name |

Studio service already has `downloadBytes` (`getBytes`) for CORS-safe Electron paths but **previews still use getDownloadURL**.

**Storage rules:** customer or staff may `read` proof objects under their path; owner/admin write proofs. Authenticated read still yields signed URLs with original object names — hence Save Image As exposes `proof-…png`.

---

## §6 Exact verified files to modify (expected)

### Shared
- `packages/shared/src/constants/assistedCreation/assistedCreation.constants.ts` — statuses, open/terminal, limits for final asset
- `packages/shared/src/utils/assistedCreationTransitions.ts` (+ tests)
- `packages/shared/src/types/assistedCreation/assistedCreation.types.ts` — `finalSource` (or equivalent) + status
- `packages/shared/src/types/assistedCreation/assistedCreationActions.types.ts` — new callables / action unions
- `packages/shared/src/utils/assistedCreationProofFileName.ts` (+ tests) — opaque name builder for *new* proofs; keep legacy readers
- **New:** `packages/shared/src/utils/assistedCreationAiContextProfile.ts` (+ `.test.ts`) — JSON mapper
- **New:** `packages/shared/src/utils/assistedCreationAiArtworkPrompt.ts` (+ `.test.ts`) — prompt + optional ref sentence
- **New:** `packages/shared/src/utils/assistedCreationStageTab.ts` (+ `.test.ts`) — status → Studio tab id
- Display / retention / Add-to-Request helpers as impacted by new open status and final asset
- `packages/shared/src/utils/assistedCreationApprovedProofRetention.ts` / AddToRequest — decide final-source gating `[NEEDS PRODUCT CONFIRM]`

### Functions
- `functions/src/assistedCreationRequests.ts` — approve → `final_source_needed` (proof_image); catalog_share path; new final-upload callable
- **New or extend:** staff attach final source + complete transition
- `functions/src/customerGetAssistedCreationApprovedProofFile.ts` / download helpers — final vs proof download; preview byte delivery if chosen
- `functions/src/index.ts` exports
- `functions/src/lib/assistedCreationProofPurge.ts` — do not purge final source as a “sibling proof”
- Test Data Reset wipe under `assisted-creation/` already recursive — confirm final subpath covered (likely yes)

### Studio
- `apps/studio/.../customer-requests/components/AssistedCreationRequestsSection.tsx` — AI Context action + modal; Final Source Needed tab; upload final; Start Work navigation
- `apps/studio/.../customer-requests/services/assistedCreationRequestsService.ts` — opaque proof upload names; final upload; `getBytes` for previews `[preferred]`
- **New:** AI Context modal component (thin UI over shared builders)
- Styles under `staff-inbox.css` / customer-requests CSS as needed
- `wipeTargetOptions.ts` copy if documenting final assets

### Portal
- `AssistedCreationStatusPanel.tsx`, `AssistedCreationDetailPanels.tsx`, `AssistedCreationMediaThumbs.tsx` — waiting copy; no final download until complete; proof preview via bytes→object URL
- `assistedCreationService.ts` — `getBytes` / preview helper; final download callable
- `assisted-creation.css` / display helpers

### Rules / indexes
- `storage.rules` — new `.../final/{fileId}` match (mirror proofs write policy)
- `firestore.rules` — only if client-visible field validation exists for status enums `[NEEDS REPO CHECK on exact status string checks]`
- Indexes: none expected unless new queries by status alone

### Docs (same workflow)
- `DATA_MODEL.md`, `BACKEND.md`, `DECISIONS.md` (new ADR), `ROADMAP.md`, `SECURITY.md` if delivery pattern changes, `TESTING.md` if commands added

**Brief paths that do not exist (do not invent edits):**
- `apps/studio/.../custom-requests/**` — **missing**
- `apps/portal/features/custom-requests/**` — **missing**
- `packages/shared/src/types/customRequest/**` — **missing**

---

## §7 Proposed JSON schema mapped to real fields

**Builder:** pure `buildAssistedCreationAiContextProfile(request)` in shared — never inline in React.

### Field map (`answersVersion: 1`)

| JSON path | Source | Omit when |
|-----------|--------|-----------|
| `image_context_profile.schema_version` | constant `1` | never |
| `type` | constant `"graphic design"` | never |
| `use_case` | constant `"DTF transfer / apparel print"` | never |
| `request_summary.request_id` | `request.id` | never |
| `request_summary.title` | **omit** (no title field) — or optional truncated `rawDescription` **only if owner wants a label**; default **omit** to avoid inventing titles | always omit unless product says otherwise |
| `request_summary.selected_path` | `answers.requestType` (enum value) | empty |
| `request_summary.fulfillment_mode` | `request.fulfillmentMode ?? "proof_image"` | never (default) |
| `customer_submission.raw_description` | `answers.rawDescription` | empty |
| `customer_submission.request_type` | labeled or raw `requestType` | empty |
| `customer_submission.contains_text` | `containsText` | empty |
| `customer_submission.exact_text` | `[exactText]` when `containsText === "exact_wording"` | otherwise omit array |
| `customer_submission.text_capitalization_notes` | exact-wording only | empty / wrong mode |
| `customer_submission.text_punctuation_notes` | exact-wording only | empty / wrong mode |
| `customer_submission.text_line_breaks_exact` | bool when exact wording + true | false/omit |
| `customer_submission.text_layout_flexible` | bool when exact wording | non-exact |
| `customer_submission.primary_subject` | `primarySubject` | empty |
| `customer_submission.additional_subjects` | `additionalSubjects` | empty |
| `customer_submission.subject_action` | `subjectAction` | empty |
| `customer_submission.props` | `props` | empty |
| `customer_submission.setting` | `setting` | empty |
| `customer_submission.occasion` | `occasion` | empty |
| `customer_submission.audience` | string → optional single-element array or string (prefer string to match model) | empty |
| `customer_submission.personalization_types` | `personalizationTypes[]` | empty array |
| `customer_submission.exact_requirements` | `exactRequirements[]` | empty |
| `customer_submission.flexibility_level` | `flexibilityLevel` | empty |
| `customer_submission.style_preferences` | `stylePreferences[]` | empty |
| `customer_submission.mood` | mood string (normalized chips) | empty |
| `customer_submission.included_colors` | `includedColors` | empty |
| `customer_submission.excluded_colors` | `excludedColors` | empty |
| `customer_submission.garment_color` | `garmentColor` | empty |
| `customer_submission.composition` | `composition` | empty |
| `customer_submission.reference_usage` | labeled `referenceUsage[]` (request-level) | empty |
| `design_brief.*` | **derived only from populated answers** — concise reorganization; **no invented requirements** | empty sections omitted |
| `reference_images[]` | only if `referenceImages.length > 0` | no refs → omit key |
| `reference_images[i].reference` | `REFERENCE_IMAGE_{i+1}` stable order = array order shown to staff | — |
| `reference_images[i].usage` | join/label of request-level `referenceUsage` (same for all images — **no per-image usage in model**) | if usage empty, omit `usage` key |
| `reference_images[i].customer_note` | **no field in model** — omit always unless later schema adds notes | always omit today |
| `output_requirements` | constants from brief (PNG, white bg, 12×12, etc.) | never |

**Must exclude:** email, UID, staffNotes, revisionHistory, payment, signed URLs, storagePath, fileName, base64, tokens, auth.

**`additional_answers`:** use only if a populated field cannot fit typed sections; prefer explicit keys above for losslessness.

`[NEEDS REPO CHECK]` / product: confirm whether `audience` should be array-wrapped; confirm omit vs short-title from description.

---

## §8 Example context profile **with** references

Illustrative (values fictional; structure matches mapper):

```json
{
  "image_context_profile": {
    "schema_version": 1,
    "type": "graphic design",
    "use_case": "DTF transfer / apparel print",
    "request_summary": {
      "request_id": "abc123RequestId",
      "selected_path": "animal_object_character",
      "fulfillment_mode": "proof_image"
    },
    "customer_submission": {
      "raw_description": "A playful fox holding a coffee cup",
      "request_type": "animal_object_character",
      "contains_text": "no_words",
      "primary_subject": "fox",
      "subject_action": "holding a coffee cup",
      "style_preferences": ["bold", "minimal"],
      "mood": "playful, witty",
      "included_colors": "orange, cream",
      "excluded_colors": "neon green",
      "composition": "centered_main_subject",
      "reference_usage": ["layout_reference", "subject_reference"]
    },
    "design_brief": {
      "concept": "A playful fox holding a coffee cup",
      "required_visuals": ["fox", "holding a coffee cup"],
      "style_direction": ["bold", "minimal", "playful", "witty"],
      "color_direction": ["include: orange, cream", "avoid: neon green"],
      "layout_direction": "centered_main_subject",
      "must_avoid": ["neon green"]
    },
    "reference_images": [
      {
        "reference": "REFERENCE_IMAGE_1",
        "usage": "Layout reference, Subject reference"
      },
      {
        "reference": "REFERENCE_IMAGE_2",
        "usage": "Layout reference, Subject reference"
      }
    ],
    "output_requirements": {
      "format": "PNG",
      "background": "pure white",
      "target_quality": "high-resolution DTF-ready artwork",
      "maximum_canvas": "12 x 12 inches",
      "rendering_style": "clean vector-style illustration",
      "color_method": "flat solid colors with clearly separated fills"
    }
  }
}
```

---

## §9 Example context profile **without** references

Same as §8 but **no** `reference_images` key; `customer_submission.reference_usage` omitted if empty; prompt omits reference sentence (§10).

---

## §10 Final exact AI prompt text

**Base (always):**

```text
Create the requested DTF apparel artwork from the JSON context below. Preserve all required wording and customer-specified details. Use a centered, balanced composition with crisp vector-style shapes, smooth curves, bold readable typography, and a limited high-contrast palette of flat, solid, clearly separated colors. Use a pure white background, with slightly off-white internal white elements when needed. Do not use gradients, transparency, blur, glow, realistic rendering, soft shading, blended colors, textures, distress, grunge, halftones, fuzzy edges, mockups, color-palette strips, color-count labels, text decorations, random decorations, or unrelated elements. Return only the finished artwork.
```

**When `referenceImages.length > 0`, insert after the first sentence:**

```text
Use the attached reference images only as directed by the reference_images entries, preserving the requested layout, subject, proportions, wording, and overall vibe while cleaning and simplifying the artwork for vectorization.
```

**When no references:** that sentence must not appear.

**Full AI Input** = prompt + `\n\n` + `JSON.stringify(profile, null, 2)`.

Constants live in shared builders, not duplicated in UI.

---

## §11 Proposed Final Source Needed state and tab behavior

### Persisted status (proposed)

| Field | Value |
|-------|-------|
| Enum | `final_source_needed` |
| Studio tab id | `final_source_needed` |
| Studio label | **Final Source Needed** |
| Open? | **yes** (blocks second open request) |
| Terminal? | **no** |
| Portal tone | “Proof approved” waiting copy — not Completed |

### Transition changes

| Actor | From → To | When |
|-------|-----------|------|
| Customer | `proof_ready` → `final_source_needed` | Approve **proof_image** fulfillment (record `approvedProofId`/`approvedAt`/`rating`/note; sibling purge as today) |
| Customer | `proof_ready` → `approved` | Approve **catalog_share** — **keep ADR-FP-108 direct complete** (catalog design is the deliverable) `[PRODUCT CONFIRM in §20]` |
| Customer | `proof_ready` → `revision_requested` | unchanged |
| Staff | `final_source_needed` → `approved` | **Only** after final source upload+persist succeeds (same callable preferred) |
| Staff | `final_source_needed` → `cancelled` / `rejected` | with reason (allowlists) |
| Staff | ~~force complete without final~~ | **forbidden** |

**Do not** treat `approved` as “waiting for final.” Keep `approved` terminal = ready for final download / history.

### Final source data (proposed)

```ts
finalSource?: {
  id: string;           // opaque
  storagePath: string;  // assisted-creation/{uid}/{requestId}/final/{opaqueId}
  fileName: string;     // intentional friendly name for authorized download only
  contentType: string;
  sizeBytes: number;
  uploadedByUid: string;
  uploadedAt: Timestamp;
};
```

Separate from `proofs[]`. Do not overwrite approved proof.

### Studio UI

- New stage tab between Proof ready and Completed (order: New → In progress → Revisions → Proof ready → **Final Source Needed** → Completed).
- Actions: **Upload Final Artwork** (owner/admin per existing proof upload permission).
- On success: toast + navigate to Completed with same request selected (reuse §3 navigation helper).

### Portal UI

After `final_source_needed`:

- Heading: **Proof approved**
- Body: `Fresh Prints is preparing your final high-resolution artwork. We will let you know when it is ready to download.`
- Keep approved proof visible; **no** re-approve; **no** Download Final Artwork yet; **no** completed chrome.

After `approved` **with** `finalSource` (proof path):

- **Download Final Artwork** → authorized byte/callable download with friendly filename.
- Add to Request: prefer copying **final source** (update ADR-FP-094 semantics) `[PRODUCT CONFIRM]`.

After `approved` via **catalog_share**: unchanged catalog download/Add-to-Request.

### Notifications `[NEEDS REPO CHECK]`

Optional in-app/email when final ready — **not required by brief**; defer unless owner wants it in this phase (default: **out of scope**; Portal polling/list refresh sufficient).

---

## §12 Proof-asset delivery and filename hardening + browser limits

### Approach

1. **New proof uploads:** Storage object id = cryptographically opaque (e.g. UUID / nanoid-like), **extensionless**, correct `contentType`; Firestore `fileName` for staff may store opaque id or separate `displayLabel: "Proof N"` — **never** date/sequence in Storage key.
2. **Legacy proofs:** leave objects; present via bytes→object URL so Save-As does not use Storage basename.
3. **Portal preview:** service `getBytes(storagePath)` (authenticated SDK) → `Blob` → `URL.createObjectURL` → `img src`; revoke on replace/unmount; `draggable={false}`; alt = generic `"Proof"` (already partially done).
4. **No proof Download button** on preview surfaces.
5. **Explicit final download** only when completed + finalSource present.
6. Prefer reusing Portal patterns from approved-proof file callable if `getBytes` from client is insufficient under rules — rules already allow customer read; `getBytes` should work. If Electron/Studio CORS issues: Studio already has `downloadBytes`.

### Browser copy limits (honest)

Customers can still screenshot, DevTools, or cache bytes. This phase = **filename obfuscation + avoid durable signed URL in DOM + authz**, not DRM. Do not disable context menu as the security control.

---

## §13 Data compatibility and migration

| Item | Plan |
|------|------|
| Existing proofs | No rename; presentation-layer fix only |
| Existing `approved` requests | Remain terminal; still serve proof download / Add-to-Request as today |
| New approvals (proof_image) | → `final_source_needed` |
| In-flight `proof_ready` | Unchanged until customer responds |
| Backfill | **None** required |
| Wipe | `assisted-creation/` Storage wipe already covers nested `final/`; document in wipe copy |
| Rules | Additive `final/` path; status enum updates in shared + callables |

Rollback of enum: avoid deploying clients that write `final_source_needed` without Functions that understand it (deploy Functions first or same release window on `fresh-prints-dev`).

---

## §14 Security review

| Concern | Mitigation |
|---------|------------|
| Cross-customer proof/final access | Callable + Storage path ownership (`customerUid === auth.uid`); staff via role checks |
| Status spoofing | Server-only transitions via existing callables |
| Path injection | Server validates storagePath prefix under request; never trust client path for final attach |
| Signed URL leakage | Prefer bytes→object URL for preview; strip paths from errors/logs |
| PII in AI JSON | Exclude UID/email/staff notes/history |
| New HTTP binary endpoint | Avoid if `getBytes` works; if added → auth, ownership, rate limit, security review, human gate |
| catalog_share purge | Empty `storagePath` / kind gating unchanged (ADR-FP-108) |
| Secrets | None new |

Human approval before: rules change, new delivery endpoint, Functions deploy to `fresh-prints-dev`, any production action (production OOS).

---

## §15 Test matrix

### Automated (add/update)

| # | Case |
|---|------|
| 1 | Context profile from answersVersion 1 |
| 2 | “Legacy” readable = v1 docs with sparse fields |
| 3 | Exact customer text preserved |
| 4 | Empty optionals omitted |
| 5 | Reference numbering stable order |
| 6 | No reference key/prompt sentence without attachments |
| 7 | No URLs/tokens/paths/PII in JSON |
| 8–9 | Prompt with/without refs |
| 10–12 | Approve → `final_source_needed`; open not terminal; complete rejected without final |
| 13–14 | Final upload success → `approved`; failure stays `final_source_needed` |
| 15–16 | Staff auth final upload; customer ownership download |
| 17–19 | Start Work tab mapping; selection preserved; failure no navigate |
| 20–22 | Preview not Storage URL; opaque naming; legacy readable |
| 23–24 | catalog_share + classic proof regressions |
| 25 | Wipe target docs mention final assets if needed |

### Commands (record honestly when run)

```bash
npm run lint
npm run typecheck --workspace @fresh-prints/portal
# Studio: npm --prefix apps/studio exec tsc -- --noEmit
npm --prefix functions run build
npx tsx --test packages/shared/src/utils/assistedCreation*.test.ts
# plus focused Studio/Portal util tests added in implement
```

Build Studio/Portal as in TESTING.md when UI ships.

---

## §16 Manual QA script (owner checkpoint after implement)

### AI Context
1. Open Assisted request with refs → AI Context → all populated answers; no URLs; REFERENCE_IMAGE_n order matches UI → Copy Full AI Input pastes clean.
2. Repeat without refs → no reference mention.

### Start Work navigation
1. Start Work from New (and any other surface showing the action) → land on In progress; same request selected; detail open.

### Proof approval lifecycle
1. Upload proof → customer approve → **not** Completed → Studio Final Source Needed → Portal waiting copy → no final download.

### Proof preview filename
1. Portal proof img src not permanent Storage URL → Save Image As opaque basename → cross-customer denied.

### Final source
1. Failed upload stays Final Source Needed → success completes → Download Final Artwork with friendly name.

Owner replies: `PASS` | `FAIL: …` | `PASS WITH NOTES: …`

---

## §17 Rollback strategy

- Feature-flag not required for `fresh-prints-dev`; revert PR / redeploy prior Functions + clients.
- If `final_source_needed` docs exist in Firestore, Functions must keep reading them or migrate back to `approved` only with owner approval (avoid silent data rewrite).
- Opaque Storage names: no need to roll back objects; dual-read filenames remains.
- Rules: restore previous `storage.rules` if final path unused.

---

## §18 Human checkpoints

1. **Plan + Review complete → owner implementation approval** ← **current stop**
2. New persisted status enum (`final_source_needed`)
3. Migration/backfill (none planned; reconfirm)
4. Firestore / Storage rules changes
5. Any new HTTPS/callable asset-delivery endpoint beyond existing patterns
6. Functions deploy to `fresh-prints-dev`
7. Manual Studio/Portal QA
8. Production — **not authorized**

---

## §19 Documentation Updates Required

- [x] DATA_MODEL.md — status + `finalSource`
- [x] BACKEND.md — callables / delivery
- [x] DECISIONS.md — new ADR (AI context copy-only; final-source stage; opaque proofs)
- [x] ROADMAP.md — Phase 9 polish note
- [ ] SECURITY.md — if delivery pattern changes materially
- [ ] TESTING.md — only if new standard commands
- [ ] ARCHITECTURE.md — light if needed

---

## §20 Implementation approval request

**Owner: please approve implementation of this plan as reviewed.**

Proposed verdict path after Review: `approved` or `approved_with_changes` → you reply e.g. **`APPROVE IMPLEMENTATION`** (or list required changes). Until then: **no code, no deploy, no rules edits.**

### Open product confirms (non-blocking for planning; confirm at approval)

1. **`catalog_share` approve** stays direct → `approved` (recommended) vs also enters Final Source Needed.
2. **Add to Request** after proof path: copy **final source** (recommended) vs still copy approved proof.
3. **Final-ready notification** in/out of this phase (recommended: out).
4. **AI JSON `title`:** omit (recommended) vs short description snippet.

---

## Approach (implementation order — after approval only)

1. Shared status + transitions + tests  
2. Functions: approve → `final_source_needed`; final upload+complete; catalog_share untouched  
3. Studio tabs + Final upload UI + Start Work navigation helper  
4. AI Context modal + shared builders  
5. Opaque proof naming + Portal/Studio bytes→object URL previews  
6. Portal waiting + final download UX  
7. Rules + docs + wipe notes  
8. Automated tests → manual checkpoint → signoff  

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Status enum blast radius (open lists, badges, emails) | high | Shared constants + exhaustive switch audits + tests |
| ADR-FP-093/094 coupling to `approved` | high | Explicit product confirms; update helpers together |
| Save-As still sometimes shows MIME extension | low | Accept; basename opaque |
| Large final files vs callable base64 limits | medium | Prefer Storage `getBytes` or raise/stream pattern; mirror proof size limits |
| Staff confusion on new tab | medium | Clear label + navigation follow |

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-21-custom-request-ai-context-and-final-source-workflow-review.md
- Verdict: pending
