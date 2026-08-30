/**
 * Gate I — build read-only 25-design owner manual sample checklist.
 * No mutations.
 *
 *   node functions/scripts/gate-i-build-owner-checklist-dev.mjs
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const FUNCTIONS_ROOT = resolve(import.meta.dirname, "..");
const require = createRequire(resolve(FUNCTIONS_ROOT, "package.json"));
const { initializeApp: initAdmin, applicationDefault, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const PROJECT_ID = "fresh-prints-dev";
const JOB_ID = "zFzAwEIwCXFWC8dce0f4";
const OUT_JSON = resolve(
  REPO_ROOT,
  "docs/workflow/reviews/_gate-i-owner-sample-checklist-data.json",
);
const OUT_MD = resolve(
  REPO_ROOT,
  "docs/workflow/reviews/2026-08-25-smart-catalog-intelligence-slice-5-gate-i-owner-checklist.md",
);

function ensureAdmin() {
  if (getApps().length === 0) {
    initAdmin({ credential: applicationDefault(), projectId: PROJECT_ID });
  }
  return getFirestore();
}

function arr(v) {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()) : [];
}

function inferDiversityTags(design, profile, outcome) {
  const tags = new Set();
  const title = String(design.title ?? "").toLowerCase();
  const desc = String(design.description ?? design.aiSuggestions?.description ?? "").toLowerCase();
  const blob = [
    title,
    desc,
    ...arr(profile?.subjects),
    ...arr(profile?.themes),
    ...arr(profile?.interests),
    ...arr(profile?.visibleText),
    ...arr(profile?.searchConcepts),
    ...arr(outcome.automationReasonCodes),
  ]
    .join(" ")
    .toLowerCase();

  const hasVisibleText = arr(profile?.visibleText).length > 0 || arr(design.aiSuggestions?.visibleText).length > 0;
  if (hasVisibleText || /\b(text|quote|saying|letter)\b/.test(blob)) tags.add("text-heavy");
  if (/\b(dog|cat|cow|bear|bird|fish|animal|puppy|kitten|dino|dinosaur|frog|bunny|rabbit|deer|moose|wolf|fox|horse|pig|duck|chicken|turkey|goat|sheep|highland)\b/.test(blob)) tags.add("animal");
  if (arr(profile?.professionsGroups).length > 0 || /\b(nurse|teacher|doctor|chef|mechanic|farmer|police|firefighter|military|trucker|worker|profession)\b/.test(blob)) tags.add("profession-group");
  if (/\b(christmas|halloween|thanksgiving|easter|valentine|fourth of july|4th of july|st patrick|holiday|xmas)\b/.test(blob)) tags.add("holiday");
  if (/\b(funny|humor|sarcasm|sarcastic|joke|meme|pun|snark)\b/.test(blob)) tags.add("humor-sarcasm");
  if (/\b(faith|jesus|god|church|christian|bible|inspirational|blessed|prayer)\b/.test(blob)) tags.add("faith-inspirational");
  if (/\b(cannabis|marijuana|weed|420|pot leaf|thc)\b/.test(blob)) tags.add("cannabis");
  if (/\b(explicit|adult|sexy|nude|beer|wine|whiskey|alcohol|smoking)\b/.test(blob) || design.isExplicitContent === true) tags.add("adult-theme");
  if (/\b(people|person|man|woman|boy|girl|human|character|face|portrait|raccoon|jimothy)\b/.test(blob) || arr(profile?.subjects).some((s) => /people|person|human|raccoon/i.test(s))) tags.add("people-character");
  if (arr(profile?.subjects).length >= 2 || arr(profile?.objects).length >= 3) tags.add("visually-complex");
  if (arr(profile?.subjects).length <= 1 && !hasVisibleText) tags.add("sparse-minimal");
  if (outcome.categoryGap === true || (outcome.automationReasonCodes ?? []).some((c) => c.includes("category"))) tags.add("category-ambiguity");
  if (arr(profile?.subjects).some((s) => s.split(/\s+/).length >= 2)) tags.add("specific-subject-identity");

  return [...tags];
}

function pickStratified(outcomes) {
  const byId = new Map(outcomes.map((o) => [o.designId || o.id, o]));
  const would = outcomes.filter((o) => o.wouldAutoApprove === true);
  const unresolved = outcomes.filter(
    (o) => o.verifierOutcome === "unresolved" || o.hardBlocked === true,
  );
  const categoryGap = outcomes.filter((o) => o.categoryGap === true);
  const categoryGapId = categoryGap[0]?.designId || categoryGap[0]?.id;

  const picked = [];
  const used = new Set();

  function take(list, n, stratum) {
    for (const o of list) {
      if (picked.length >= 25 || picked.filter((p) => p.sampleStratum === stratum).length >= n) break;
      const id = o.designId || o.id;
      if (used.has(id)) continue;
      used.add(id);
      picked.push({ ...o, sampleStratum: stratum });
    }
  }

  // 12 would-auto-approve
  take(would, 12, "would-auto-approve");
  // 10 unresolved (category gap may overlap)
  take(unresolved, 10, "verifier-unresolved");
  // 1 category-gap if not already included
  if (categoryGapId && !used.has(categoryGapId)) {
    const o = byId.get(categoryGapId);
    if (o) {
      used.add(categoryGapId);
      picked.push({ ...o, sampleStratum: "category-gap" });
    }
  } else if (categoryGapId && used.has(categoryGapId)) {
    // already counted — freed slot goes to unresolved
    take(unresolved.filter((o) => !used.has(o.designId || o.id)), 1, "verifier-unresolved");
  }

  // 2 diversity — prefer designs not yet picked with diverse tags (filled after design load)
  return { picked, used, would, unresolved, categoryGapId, needDiversity: 2 };
}

async function main() {
  const db = ensureAdmin();
  const outcomeSnap = await db
    .collection("catalogReprocessJobs")
    .doc(JOB_ID)
    .collection("outcomes")
    .get();

  const outcomes = outcomeSnap.docs.map((d) => ({ id: d.id, designId: d.id, ...d.data() }));
  const { picked, used, would, unresolved, categoryGapId, needDiversity } = pickStratified(outcomes);

  // Load all outcome designs for diversity scoring
  const candidatePool = outcomes.filter((o) => !used.has(o.designId || o.id));
  const enriched = [];

  async function enrichOutcome(o, sampleStratum) {
    const id = o.designId || o.id;
    const snap = await db.collection("designs").doc(id).get();
    if (!snap.exists) {
      return { designId: id, missing: true, sampleStratum };
    }
    const d = snap.data();
    const profile = d.smartProfile ?? {};
    const prov = profile.provenance ?? {};
    const categoryName =
      d.categoryName ??
      d.aiSuggestions?.categoryName ??
      d.aiSuggestions?.category ??
      null;
    const description = d.description ?? d.aiSuggestions?.description ?? null;
    const diversityTags = inferDiversityTags(d, profile, o);
    return {
      designId: id,
      sampleStratum,
      outcomeStratumDetail: {
        wouldAutoApprove: o.wouldAutoApprove === true,
        verifierOutcome: o.verifierOutcome ?? null,
        hardBlocked: o.hardBlocked === true,
        categoryGap: o.categoryGap === true,
      },
      studioContext: {
        title: d.title ?? null,
        description,
        categoryId: d.categoryId ?? d.aiSuggestions?.categoryId ?? null,
        categoryName,
        thumbnailPath: d.thumbnailPath ?? d.previewPath ?? null,
        previewPath: d.previewPath ?? null,
        aiReviewStatus: d.aiReviewStatus ?? null,
        status: d.status ?? null,
      },
      automation: {
        automationDecision: o.automationDecision ?? prov.automationDecision ?? null,
        automationReasonCodes: arr(o.automationReasonCodes ?? prov.automationReasonCodes),
        verifierInvoked: o.verifierInvoked ?? prov.verifierInvoked ?? null,
        verifierOutcome: o.verifierOutcome ?? null,
        wouldAutoApprove: o.wouldAutoApprove === true,
        hardBlocked: o.hardBlocked === true,
      },
      smartProfileSummary: {
        subjects: arr(profile.subjects),
        themes: arr(profile.themes),
        interests: arr(profile.interests),
        professionsGroups: arr(profile.professionsGroups),
        occasions: arr(profile.occasions),
        places: arr(profile.places),
        visibleText: arr(profile.visibleText),
        searchConcepts: arr(profile.searchConcepts),
        styles: arr(profile.styles),
        colors: arr(profile.colors),
      },
      provenance: {
        promptVersion: prov.promptVersion ?? o.promptVersion ?? null,
        normalizerVersion: prov.normalizerVersion ?? o.normalizerVersion ?? null,
      },
      diversityTags,
      ownerVerdict: null,
      ownerNotes: null,
    };
  }

  for (const p of picked) {
    enriched.push(await enrichOutcome(p, p.sampleStratum));
  }

  // Diversity picks: maximize unique diversity tags across sample
  const coveredTags = new Set(enriched.flatMap((e) => e.diversityTags ?? []));
  const diversityCandidates = [];
  for (const o of candidatePool) {
    const id = o.designId || o.id;
    const snap = await db.collection("designs").doc(id).get();
    if (!snap.exists) continue;
    const d = snap.data();
    const tags = inferDiversityTags(d, d.smartProfile ?? {}, o);
    const novel = tags.filter((t) => !coveredTags.has(t)).length;
    diversityCandidates.push({ o, novel, tags });
  }
  diversityCandidates.sort((a, b) => b.novel - a.novel || b.tags.length - a.tags.length);

  for (let i = 0; i < needDiversity && i < diversityCandidates.length; i++) {
    const { o, tags } = diversityCandidates[i];
    const row = await enrichOutcome(o, "diversity");
    row.diversityTags = tags;
    enriched.push(row);
    for (const t of tags) coveredTags.add(t);
  }

  // If still under 25, fill from mixed strata
  while (enriched.length < 25) {
    const remaining = outcomes.filter((o) => !enriched.some((e) => e.designId === (o.designId || o.id)));
    if (remaining.length === 0) break;
    const o = remaining[enriched.length % remaining.length];
    enriched.push(await enrichOutcome(o, o.wouldAutoApprove ? "would-auto-approve" : "verifier-unresolved"));
  }

  const finalSample = enriched.slice(0, 25);
  const composition = {
    wouldAutoApprove: finalSample.filter((s) => s.sampleStratum === "would-auto-approve").length,
    verifierUnresolved: finalSample.filter((s) => s.sampleStratum === "verifier-unresolved").length,
    categoryGap: finalSample.filter((s) => s.sampleStratum === "category-gap").length,
    diversity: finalSample.filter((s) => s.sampleStratum === "diversity").length,
    uniqueDesignIds: new Set(finalSample.map((s) => s.designId)).size,
  };

  const payload = {
    jobId: JOB_ID,
    projectId: PROJECT_ID,
    generatedAt: new Date().toISOString(),
    composition,
    diversityCoverage: [...new Set(finalSample.flatMap((s) => s.diversityTags ?? []))].sort(),
    categoryGapDesignId: categoryGapId ?? null,
    availableCounts: {
      wouldAutoApprove: would.length,
      verifierUnresolved: unresolved.length,
      categoryGap: outcomes.filter((o) => o.categoryGap === true).length,
    },
    sample: finalSample,
  };

  writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2));

  let md = `# Gate I Owner Manual Sample — Slice 5 AI Review Queue Reprocess

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Project | **fresh-prints-dev** |
| Job ID | \`${JOB_ID}\` |
| Sample size | **25** |
| Purpose | Owner manual quality + **automation decision** review |

---

## Sample composition

| Stratum | Count |
|---------|------:|
| would-auto-approve | ${composition.wouldAutoApprove} |
| verifier-unresolved / hard-block | ${composition.verifierUnresolved} |
| category-gap | ${composition.categoryGap} |
| diversity | ${composition.diversity} |
| Unique design IDs | ${composition.uniqueDesignIds} |

Category-gap design ID: \`${categoryGapId ?? "(none)"}\`

Diversity tags represented across sample: ${payload.diversityCoverage.length ? payload.diversityCoverage.join(", ") : "(see per-design tags)"}

---

## How to review in Studio

1. Open **AI Review → Needs Review**.
2. Search or open each **design ID** below.
3. Use thumbnail/title to confirm the correct design.
4. For each design, record verdict using the format at the end.

**Do not approve, reject, or re-run AI during Gate I.**

---

## Owner review questions (each design)

1. **TITLE** — useful and recognizable?
2. **DESCRIPTION** — accurate and objective?
3. **CATEGORY** — correct?
4. **SUBJECTS** — correct and sufficiently specific?
5. **OTHER PROFILE DIMENSIONS** — themes/interests/professions/occasions/places useful and supported?
6. **VISIBLE TEXT** — materially correct?
7. **SEARCH CONCEPTS** — would these help a customer find this design?
8. **UNSUPPORTED CONCEPTS** — invented people/professions/audiences/holidays/identities?
9. **IMPORTANT OMISSIONS** — missed concepts that would hurt discovery?
10. **AUTOMATION DECISION** — should this have been safe to auto-approve, or was Needs Review appropriate?

---

## Critical analysis focus

### Would-auto-approve stratum (${composition.wouldAutoApprove} designs)

Count after review:

- **True safe approvals**
- **False-positive auto-approvals** (HIGH severity: wrong category/subject, unsupported identity, bad title, visible-text failure, misleading profile)

### Verifier-unresolved / hard-block stratum (${composition.verifierUnresolved} designs)

Count after review:

- **Correct conservative blocks**
- **False blocks** (design was actually safe to auto-approve)

**Priority:** precision of unattended approval > approval rate.

---

## Per-design checklist

`;

  finalSample.forEach((row, idx) => {
    const n = idx + 1;
    const sp = row.smartProfileSummary ?? {};
    md += `### ${n}. \`${row.designId}\`

| Field | Value |
|-------|--------|
| **Sample stratum** | ${row.sampleStratum} |
| **Title** | ${row.studioContext?.title ?? "(missing)"} |
| **Category** | ${row.studioContext?.categoryName ?? row.studioContext?.categoryId ?? "(missing)"} |
| **Thumbnail** | \`${row.studioContext?.thumbnailPath ?? row.studioContext?.previewPath ?? "(none)"}\` |
| **Automation decision** | ${row.automation?.automationDecision ?? "(none)"} |
| **Would auto-approve** | ${row.automation?.wouldAutoApprove ? "yes" : "no"} |
| **Verifier** | invoked=${row.automation?.verifierInvoked ? "yes" : "no"} · outcome=${row.automation?.verifierOutcome ?? "—"} |
| **Hard blocked** | ${row.automation?.hardBlocked ? "yes" : "no"} |
| **Diversity tags** | ${(row.diversityTags ?? []).join(", ") || "—"} |

**Reason codes:** ${(row.automation?.automationReasonCodes ?? []).join("; ") || "—"}

**Smart Profile summary**

- subjects: ${(sp.subjects ?? []).join(", ") || "—"}
- themes: ${(sp.themes ?? []).join(", ") || "—"}
- interests: ${(sp.interests ?? []).join(", ") || "—"}
- professions/groups: ${(sp.professionsGroups ?? []).join(", ") || "—"}
- occasions: ${(sp.occasions ?? []).join(", ") || "—"}
- places: ${(sp.places ?? []).join(", ") || "—"}
- visibleText: ${(sp.visibleText ?? []).join(" | ") || "—"}
- searchConcepts: ${(sp.searchConcepts ?? []).slice(0, 12).join("; ") || "—"}${(sp.searchConcepts ?? []).length > 12 ? " …" : ""}

**Description (AI suggestion / design):** ${row.studioContext?.description ? row.studioContext.description.slice(0, 400) + (row.studioContext.description.length > 400 ? "…" : "") : "—"}

**Owner verdict:** _PASS / PASS WITH NOTES / FAIL PROFILE / FAIL AUTOMATION_

**Notes:**

---

`;
  });

  md += `## Gate I summary metrics (owner fills after review)

| # | Metric | Count |
|---|--------|------:|
| 1 | Sample size | 25 |
| 2 | Would-auto-approve reviewed | |
| 3 | Unresolved/hard-block reviewed | |
| 4 | Profile PASS | |
| 5 | PASS WITH NOTES | |
| 6 | FAIL PROFILE | |
| 7 | Auto-approve true positives | |
| 8 | Auto-approve false positives | |
| 9 | Unresolved correct blocks | |
| 10 | Unresolved false blocks | |
| 11 | Category errors | |
| 12 | Subject errors | |
| 13 | Unsupported-concept errors | |
| 14 | Title errors | |
| 15 | visibleText errors | |
| 16 | Search Concepts quality issues | |
| 17 | Repeated systemic pattern | |

## Recommendation (owner)

- [ ] **READY FOR SLICE 5 SIGNOFF**
- [ ] **NEEDS CORRECTIVE**

Reply with per-design verdicts and completed summary metrics.

`;

  writeFileSync(OUT_MD, md);
  console.log(`Wrote ${OUT_MD}`);
  console.log(`Wrote ${OUT_JSON}`);
  console.log("Composition:", JSON.stringify(composition));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
