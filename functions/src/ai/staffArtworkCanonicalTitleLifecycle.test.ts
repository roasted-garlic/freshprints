import assert from "node:assert/strict";
import test from "node:test";

import { buildPortalCatalogAlgoliaRecord } from "../algolia/buildPortalCatalogAlgoliaRecord";
import { resolveStaffArtworkAiGeneratedTitle } from "./finalCatalogCopy";

type StaffArtworkHistoryFixture = {
  history: string;
  root: {
    title: string;
    catalogTitleSource?: "staff" | "import_filename";
    sourceStaffArtworkId: string;
    importSourceFileName?: string;
  };
  priorAiTitle?: string;
};

const fixtures: StaffArtworkHistoryFixture[] = [
  {
    history: "new Staff Artwork",
    root: {
      title: "a1b2c3d4e5",
      catalogTitleSource: "import_filename",
      sourceStaffArtworkId: "staff-new",
      importSourceFileName: "new-cow.png",
    },
  },
  {
    history: "pre-corrective Staff Artwork",
    root: {
      title: "b2c3d4e5f6",
      catalogTitleSource: "staff",
      sourceStaffArtworkId: "staff-legacy",
    },
  },
  {
    history: "already waiting in AI Processing",
    root: {
      title: "c3d4e5f6a7",
      catalogTitleSource: "staff",
      sourceStaffArtworkId: "staff-waiting",
    },
  },
  {
    history: "pre-corrective Staff Artwork promoted after corrective",
    root: {
      title: "e5f6a7b8c9",
      catalogTitleSource: "staff",
      sourceStaffArtworkId: "staff-post-corrective-promote",
      importSourceFileName: "legacy-cow.png",
    },
  },
  {
    history: "previously AI-processed and sent through AI again",
    root: {
      title: "d4e5f6a7b8",
      catalogTitleSource: "staff",
      sourceStaffArtworkId: "staff-reprocessed",
    },
    priorAiTitle: "Previous AI Cow Title",
  },
];

test("Staff Library origin converges on one canonical title through approval and Portal projection", () => {
  for (const fixture of fixtures) {
    const beforeAi = { ...fixture.root };
    const acceptedAiTitle = `Accepted ${fixture.history} title`;
    const aiTitleFields = resolveStaffArtworkAiGeneratedTitle({
      root: beforeAi,
      candidateTitle: acceptedAiTitle,
      importSourceFileName: beforeAi.importSourceFileName,
      sourceStaffArtworkId: beforeAi.sourceStaffArtworkId,
    });

    assert.equal(beforeAi.title, fixture.root.title);
    assert.equal(beforeAi.catalogTitleSource, fixture.root.catalogTitleSource);
    assert.deepEqual(aiTitleFields, {
      title: acceptedAiTitle,
      catalogTitleSource: "ai_generated",
    });

    // Autonomous Ready spreads finalCatalogFields first, then Staff-origin title fields.
    // Simulate that order so a residual trusted-root final write cannot stick.
    const simulatedFinalCatalogFields = {
      title: beforeAi.title,
      catalogTitleSource: beforeAi.catalogTitleSource,
    };
    const afterAi = {
      ...beforeAi,
      ...simulatedFinalCatalogFields,
      ...aiTitleFields,
      aiSuggestions: { title: acceptedAiTitle },
      priorAiTitle: fixture.priorAiTitle,
      status: "imported",
      aiReviewStatus: "needs_review",
    };
    assert.equal(afterAi.aiSuggestions.title, acceptedAiTitle);
    assert.equal(afterAi.title, acceptedAiTitle);

    // AI Review seeds the approval form from aiSuggestions.title. Approval then persists the
    // reviewed title through designService.updateDesign before the ready transition.
    const approvalDraftTitle = afterAi.aiSuggestions.title;
    const afterApproval = {
      ...afterAi,
      title: approvalDraftTitle,
      catalogTitleSource: "staff" as const,
      status: "ready",
      aiReviewStatus: "approved",
    };
    assert.equal(afterApproval.title, acceptedAiTitle);
    assert.equal(afterApproval.catalogTitleSource, "staff");

    const designLibraryTitle = afterApproval.title;
    assert.equal(designLibraryTitle, acceptedAiTitle);

    const portalRecord = buildPortalCatalogAlgoliaRecord({
      designId: `design-${fixture.root.sourceStaffArtworkId}`,
      data: {
        ...afterApproval,
        description: "Accepted catalog description.",
        categoryId: "animals",
        readyAt: { toMillis: () => 1 },
      },
      categoriesById: new Map([["animals", { id: "animals", name: "Animals" }]]),
    });
    assert.ok(portalRecord);
    assert.equal(portalRecord.title, acceptedAiTitle);
  }
});
