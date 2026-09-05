# Owner QA Checkpoint: Automatic Explicit Content Classification

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Environment | Local Studio → `fresh-prints-dev` |
| Deploy record | `docs/workflow/reviews/2026-09-05-catalog-explicit-content-automation-dev-deploy-record.md` |
| Status | **PASS** (owner reply recorded 2026-09-05) |
| Autonomous | **OFF** (`shadow` / live false) — unchanged |

---

## Owner result

```text
OWNER EXPLICIT CONTENT AUTOMATION QA: PASS
```

Recorded: 2026-09-05. Section A (Settings + manual Explicit UI) accepted.

During QA, a chip-input bug was fixed: vocabulary list was incorrectly capped at design-tag max (20) while defaults are ~45 terms — Enter silently dropped new terms. Fix raised Explicit vocabulary chip limits to 200/64 and stopped using design-tag parse path.

---

## Prerequisites

1. Run **local Studio** from current `development` working tree (Settings UI is client-side; not a Studio publish).
2. Confirm Studio targets `fresh-prints-dev`.
3. Functions allowlist already deployed (see deploy record).

---

## A — Run NOW (Settings + manual Explicit UI)

### TEST 1 — Settings section

Open **Settings → AI Enrichment → Explicit Content** sub-tab.

| Check | Expected |
|-------|----------|
| Section “Explicit Content Automation” | Present on the Explicit Content sub-tab |
| Copy | Clear: words/phrases auto-mark otherwise-approved designs; deterministic |
| Defaults | With field **absent** in Firestore, list shows approved default vocabulary |
| Layout | Fits Studio theme; no broken scroll; Catalog Reprocessing is on its own sub-tab |

**Result:** PASS (owner overall PASS)

---

### TEST 2 — Add term

Add temporary term: `qaexplicitfixture`  
Save → reload Settings.

| Check | Expected |
|-------|----------|
| Save | Succeeds |
| Persistence | Term still present after reload |
| Server | Via trusted callable (not client Firestore write) |

**Result:** PASS (owner overall PASS)

---

### TEST 3 — Edit term

Change `qaexplicitfixture` → `qaexplicitfixture2`  
Save → reload.

| Check | Expected |
|-------|----------|
| Old removed | Yes |
| New present | Yes |
| No duplicates | Yes |

**Result:** PASS (owner overall PASS)

---

### TEST 4 — Delete term

Delete `qaexplicitfixture2`  
Save → reload.

| Check | Expected |
|-------|----------|
| Removed | Yes |
| Defaults/other terms | Unaffected |

**Result:** PASS (owner overall PASS)

---

### TEST 5 — Intentional empty list `[]`

**Do not clear live vocabulary** in this QA.

Automated tests already cover `[]` semantics. Prefer that evidence.

If you insist on live `[]` test: snapshot exact list → clear → verify → **restore exact prior list** → verify. Prefer not.

**Result:** SKIP (automated) — accepted per checkpoint preference

---

### TEST 6 — Per-design Explicit copy

Open AI Review or Design edit with Explicit Content.

| Check | Expected |
|-------|----------|
| Old “AI never sets this” | **Gone** |
| New copy | Staff manual + Autonomous may set from owner-configured matches |

**Result:** PASS (owner overall PASS)

---

### TEST 7 — Manual Explicit toggle

On a **safe DEV design** (not a WS5 authority-sensitive candidate):

Toggle Explicit Content → save → reload → restore original if practical.

**Result:** PASS (owner overall PASS)

---

### TEST 8 — Manual censored terms

Same fixture: add temporary per-design censored term → save → reload → restore.

**Result:** PASS (owner overall PASS)

---

### Settings cache

After a vocabulary save, update callable clears in-process cache (`clearAiEnrichmentRuntimeCache` verified in deployed bundle). No need to wait 60s for invalidation on that instance.

**Result:** PASS (bundle-verified + owner overall PASS)

---

### Portal masking (optional)

Safe DEV fixture found: design `rdM12xCaaOh3S5MIYQyw` (`isExplicitContent=true`, has `censoredTerms`, status ready).

If convenient: Portal Censored mode masks configured terms.  
If skipped: automated masker tests remain authoritative → record **SKIP** or **[FIXTURE USED]**.

**Result:** Not separately noted by owner — overall PASS; automated masker tests remain authoritative if Portal skipped

---

## B — Deferred to WS5 (do NOT test now)

Do **not** enable Autonomous. Do **not** run WS5 canary.

Deferred until separately authorized WS5:

1. Otherwise-auto-approve + artwork match → Ready + `isExplicitContent=true` + masker-effective `censoredTerms` (requires `shouldPublishReady`)
2. Settings-load fail-closed live path under Autonomous
3. Six-candidate replay + publication audit
4. Human-authority overwrite protection via live reprocess (automated coverage sufficient pre-WS6)

### Fixture note for future WS5

Scanned parked six candidates against default vocabulary (persisted `visibleText` / `readableTextLines` + title/description):

**No artwork hit on any of the six.**

→ **[FIXTURE GAP — WS5 EXPLICIT AUTO-CLASSIFICATION CANARY]**

Before WS5, owner should approve a safe DEV-only strategy (new/imported fixture with controlled artwork text matching a configured term). Do not fabricate/mutate designs in this QA pass.

---

## After owner QA PASS

**Owner QA PASS recorded.** Next **separate** authorization:

1. Narrowly refresh parked WS5 enablement checkpoint (Function revisions, vocab absent→defaults / live state after QA saves, fail-closed reason, six-candidate replay, Explicit canary fixture strategy, 4 Auto / 2 Needs Review expectation)
2. Then (later) WS5 Autonomous enablement canary — still not authorized here

**Do not** mutate `catalogWorkflowMode` or `catalogAutonomousLiveEnabled` until WS5 is explicitly authorized.
