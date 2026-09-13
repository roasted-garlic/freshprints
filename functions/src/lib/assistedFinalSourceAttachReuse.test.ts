import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assistedUploadMatchesArtworkSource,
  selectReusableAssistedArtworkUpload,
} from "./assistedFinalSourceAttachReuse";

describe("assistedUploadMatchesArtworkSource", () => {
  const readyUpload = {
    technicalStatus: "ready",
    productionStoragePath: "customer-uploads/u1/up1/production.png",
  };

  it("matches the same finalSource id", () => {
    assert.equal(
      assistedUploadMatchesArtworkSource(
        { ...readyUpload, assistedFinalSourceId: "final-2" },
        {
          hasFinalSource: true,
          assistedFinalSourceId: "final-2",
          approvedProofId: "proof-1",
        },
      ),
      true,
    );
  });

  it("rejects a different finalSource id", () => {
    assert.equal(
      assistedUploadMatchesArtworkSource(
        { ...readyUpload, assistedFinalSourceId: "final-1" },
        {
          hasFinalSource: true,
          assistedFinalSourceId: "final-2",
          approvedProofId: "proof-1",
        },
      ),
      false,
    );
  });

  it("matches proof-only lineage when no finalSource is active", () => {
    assert.equal(
      assistedUploadMatchesArtworkSource(
        { ...readyUpload, assistedProofId: "proof-9" },
        {
          hasFinalSource: false,
          assistedFinalSourceId: null,
          approvedProofId: "proof-9",
        },
      ),
      true,
    );
  });

  it("rejects uploads that are not production-ready", () => {
    assert.equal(
      assistedUploadMatchesArtworkSource(
        {
          technicalStatus: "processing",
          productionStoragePath: "customer-uploads/u1/up1/production.png",
          assistedFinalSourceId: "final-2",
        },
        {
          hasFinalSource: true,
          assistedFinalSourceId: "final-2",
          approvedProofId: "proof-1",
        },
      ),
      false,
    );
  });
});

describe("selectReusableAssistedArtworkUpload", () => {
  it("returns the newest matching upload", () => {
    const older = {
      exists: true,
      data: () => ({
        technicalStatus: "ready",
        productionStoragePath: "customer-uploads/u1/old/production.png",
        assistedFinalSourceId: "final-1",
        updatedAt: { toMillis: () => 100 },
      }),
    };
    const newer = {
      exists: true,
      data: () => ({
        technicalStatus: "ready",
        productionStoragePath: "customer-uploads/u1/new/production.png",
        assistedFinalSourceId: "final-1",
        updatedAt: { toMillis: () => 200 },
      }),
    };

    const selected = selectReusableAssistedArtworkUpload(
      [older, newer] as never[],
      {
        hasFinalSource: true,
        assistedFinalSourceId: "final-1",
        approvedProofId: "proof-1",
      },
    );

    assert.equal(selected, newer);
  });
});
