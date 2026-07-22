# Human Checkpoint

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Workflow | managed-phase / test / custom request details parity |
| Reason | Manual UI verification: details parity + exact-wording draft + mood pills + Review card |
| Status | **resolved** |
| Resolution | **PASS** (owner, 2026-07-21) |

---

## What We Need From You

Confirm Portal and Studio custom-request details, the wizard Review card, mood pills, and exact-wording draft persistence all behave as below.

---

## Context

Studio was missing subject extras; both apps omitted wording notes/checkboxes and reference usage on details. Fix: shared `buildAssistedCreationAnswerDisplayRows`.

**Addendum A:** Exact wording draft preserved across wording radio switches.

**Addendum B:** Mood or vibe uses Etsy-style comma chips (`EtsyMultiValueInput`); `mood` stays a string; submit normalizes.

**Addendum C:** Wizard **Review your answers** used a shorter hardcoded list — **code fix** (reuse shared helper). **No Firebase / App Hosting deploy** required for Review; refresh local Portal after pull.

Plan: `docs/workflow/plans/2026-07-21-custom-request-details-parity-plan.md`

---

## Manual Test Required

**Feature / area:** Assisted Creation — details parity, Review card, mood pills, wording draft

**Why automated tests are insufficient:** Multi-step wizard UI + Portal/Studio display need human eyes.

**Environment:** local (Portal + Studio against same Firebase project)

**Prerequisites:**
- Portal and Studio running (refresh Portal after latest code)
- Ability to submit (or open) a custom / Assisted Creation request
- Staff login in Studio for the same request

### Steps

1. In Portal, start a **custom request**. Fill a mix of fields including:
   - Brief description + request type / wording radios
   - If exact wording: exact text + capitalization/punctuation notes + line-breaks / layout checkboxes
   - **Draft persistence (Words):** Select Exact wording, fill text + notes/checkboxes, switch away, switch **back**
     → **Expected:** Exact wording + notes/checkboxes still filled
   - Primary subject **and** Additional subjects, Action, Props, Setting
   - Styles + **Mood pills:** type `playful`, Enter/comma, add another vibe, remove one with ×
   - Navigate to another step and back to Style & mood
     → **Expected:** Remaining mood pills still present
   - Colors, composition, ≥1 reference image + reference-usage
2. Open wizard **Review your answers**
   → **Expected:** Every non-empty value appears (subject extras, mood, wording notes/bools when exact wording, reference usage, etc.). Empty fields stay hidden. Description + reference file count shown. No deploy needed — if rows still missing after refresh, report FAIL.
3. Submit the request.
4. Open request **details / Overview** in Portal
   → **Expected:** Same non-empty answer set as Review (minus file-count-only row if N/A); Mood shows clean comma-joined vibes.
5. In Studio, open the same request → Overview → Request details
   → **Expected:** Parity with Portal; refs preview or unavailable placeholder.

### Pass criteria

- [ ] Words step: switch away from Exact wording and back → exact wording still present
- [ ] Mood pills: create / remove / restore when navigating steps
- [ ] Review card shows all non-empty values (incl. mood, subject extras, wording notes/bools, reference usage)
- [ ] Portal + Studio details show same non-empty rows after submit
- [ ] Empty fields remain hidden
- [ ] No Firebase deploy was required for Review card fix (local code + refresh sufficient)

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

**Your result:** **PASS**

---

## Resolution Record

| Date | User response | Recorded in state | Follow-up |
|------|---------------|-------------------|-----------|
| 2026-07-21 | PASS (sent with next managed-phase brief; previously parked — agent had not invented PASS) | yes — soft-signoff approved | Soft-signoff complete |

---

## Resume Checklist

- [x] User feedback recorded in `.cursor/workflow/state.md` Decision Log
- [x] Soft-signoff written; parked checkpoint cleared
- [x] Next managed phase started (AI context / final-source)
