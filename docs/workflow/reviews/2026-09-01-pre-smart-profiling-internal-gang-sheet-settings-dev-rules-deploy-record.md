# DEV Deploy Record — Internal Gang Sheet Settings Firestore Rules Enablement

**Date:** 2026-09-01  
**Goal context:** `pre-smart-profiling-print-request-and-gang-sheet-polish` (WS3 owner DEV QA continues)  
**Purpose:** Enable Studio writes to `settings/internalGangSheet` on `fresh-prints-dev`  
**Owner authorization:** DEV Firestore Rules deploy (implicit via WS3 owner QA unblock)  
**Production:** **NOT AUTHORIZED / untouched**

---

## Symptom

During owner DEV QA on Internal Gang Sheets, saving **Internal Gang Sheet settings** (layout + pricing/weight) failed with:

```text
Missing or insufficient permissions.
```

Show Queue settings saves on the same role (owner/admin) succeeded after the prior WS3 Rules deploy.

---

## Root cause

- Application code and Studio service already write `settings/internalGangSheet`.
- **`internalGangSheetSettingsFieldsValid`** and **`match /settings/internalGangSheet`** existed in the **local working tree** `firestore.rules` but were **not yet committed** on `development` @ `40fe7fd0`.
- Prior DEV Firestore Rules deploy for WS3 (`docs/workflow/reviews/2026-09-01-pre-smart-profiling-ws3-configurable-gang-sheet-pricing-dev-rules-deploy-record.md`) promoted only **`settings/showQueue`** pricing-field allowlist changes @ committed `40fe7fd0` — **not** `settings/internalGangSheet`.
- Live DEV therefore had no rule match for `settings/internalGangSheet` → default deny on client `setDoc`.

---

## Git / source verification

| Field | Value |
|-------|-------|
| Branch | `development` |
| HEAD SHA (implementation baseline) | `40fe7fd075058a0ccfc60ceafd997e6b64f23890` |
| HEAD commit | `feat: configurable gang-sheet pricing and weight tiers in Show Queue settings` |
| Working tree `firestore.rules` vs HEAD | **NOT clean** — **+41 lines** uncommitted |
| Uncommitted delta scope | **Only** `internalGangSheetSettingsFieldsValid` + `match /settings/internalGangSheet` |
| Deploy source file | **Working-tree** `firestore.rules` (not committed HEAD alone) |

### Committed vs deployed gap

| Rules block | In `40fe7fd0` (pre-alignment) | After this commit |
|-------------|--------------------------------|-------------------|
| `settings/showQueue` pricing fields | **yes** | **yes** |
| `settings/internalGangSheet` | **no** | **yes** |

**Git alignment (owner-approved):** The +41-line `settings/internalGangSheet` block is committed to `development` in the same pass as this record update so committed Git matches Rules already live on `fresh-prints-dev`. **No additional Firebase deploy** — live DEV unchanged.

---

## Permission contract — `settings/internalGangSheet`

```javascript
match /settings/internalGangSheet {
  allow read: if isStaff();

  allow create, update: if isOwnerOrAdmin()
    && internalGangSheetSettingsFieldsValid(request.resource.data)
    && request.resource.data.updatedBy == request.auth.uid;

  allow delete: if false;
}
```

| Operation | Who |
|-----------|-----|
| **read** | Active staff (`owner`, `admin`, `helper`) via `isStaff()` |
| **create / update** | Active **owner or admin** only via `isOwnerOrAdmin()` |
| **delete** | **Denied** (all roles) |

Allowed write fields (optional numbers + audit):

- `gangSheetWidthInches`, `gangSheetSideMarginInches`, `gangSheetTopBottomMarginInches`, `gangSheetGutterInches`, `gangSheetMaxLengthInches`, `gangSheetLabelFontSizePx`
- `gangSheetSectionPriceCutoffInches`, `gangSheetSmallTierPriceUsd`, `gangSheetSmallTierWeightOz`, `gangSheetLargeTierPriceUsd`, `gangSheetLargeTierWeightOz`
- `updatedBy` (must equal `request.auth.uid`), `updatedAt` (timestamp)

**Customer write access:** **none** — customers are not staff and cannot satisfy `isOwnerOrAdmin()`.

---

## Full Rules deploy scope audit

Firebase deploys the **entire** `firestore.rules` file. Baseline = last documented DEV deploy @ **`40fe7fd0`** (WS3 Show Queue pricing fields).

| Effective change | Class | Notes |
|------------------|-------|-------|
| `settings/internalGangSheet` + validator | **B — newly deployed now** | Unblocks Internal Gang Sheet settings saves |
| `settings/showQueue` gang-sheet pricing allowlist | **A — already deployed previously** | WS3 record @ `40fe7fd0` |
| AI Review `artworkBackgroundSource` on `catalogMetadataOnlyUpdate` | **A — already deployed previously** | In chain from `56717c53` / `bea7f18b` |
| `showAllocations` read (`isStaff()` or customer owns print request) | **A — already deployed previously** | No `customerOwnsCustomerDoc` drift |
| Other `settings/*` documents | **A — unchanged** | No new customer write paths |
| Customer-facing collection writes | **A — unchanged** | No broadening detected in deploy delta |

**Unexpected / unrelated newly-live changes:** **none** beyond the intended `settings/internalGangSheet` block (verified: working-tree diff vs `40fe7fd0` is exactly +41 lines for that block).

Prior deploy history **not rewritten**:

- `docs/workflow/reviews/2026-09-01-dev-firestore-rules-alignment-drift-correction-deploy-record.md` (@ `56717c53`)
- `docs/workflow/reviews/2026-09-01-pre-smart-profiling-ws3-configurable-gang-sheet-pricing-dev-rules-deploy-record.md` (@ `40fe7fd0`)

---

## Firebase deploy — `fresh-prints-dev`

| Field | Value |
|-------|-------|
| Project | `fresh-prints-dev` |
| Resource | Firestore Rules only |
| Command | `firebase deploy --only firestore:rules --project fresh-prints-dev` |
| Source | Working-tree `firestore.rules` (HEAD `40fe7fd0` + uncommitted internal-gang-sheet block) |
| Exit code | **0** |
| Result | **Deploy complete** — `firestore: released rules firestore.rules to cloud.firestore` |
| Compile warnings | Pre-existing unused-function warnings only; compile **successful** |

### Not deployed

- Production (`fresh-prints` / `fresh-prints-prod`)
- Cloud Functions
- Storage Rules
- Firestore indexes
- Hosting / App Hosting

---

## Post-deploy / owner QA

| Item | Status |
|------|--------|
| Owner retry Internal Gang Sheet settings save | **expected PASS** after this deploy |
| WS3 managed goal signoff | **NOT AUTHORIZED** — owner WS3 QA still in progress |
| Git / DEV Rules alignment | **done** — `firestore.rules` internal-gang-sheet block committed to `development` (no redeploy) |

---

## Production promotion (future — not performed)

Recorded in `docs/standards/DEPLOYMENT.md` → DEV-only pending production promotion inventory.

Production must receive **committed** `development` `firestore.rules` including both:

1. WS3 `settings/showQueue` pricing fields (@ `40fe7fd0`)
2. `settings/internalGangSheet` block (committed to `development` — git aligned with live DEV)
