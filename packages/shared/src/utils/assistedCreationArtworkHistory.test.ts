import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildAssistedCreationArtworkHistoryNewestFirst } from "./assistedCreationArtworkHistory";

describe("buildAssistedCreationArtworkHistoryNewestFirst", () => {
  it("returns proofs only when no finalSource exists", () => {
    const items = buildAssistedCreationArtworkHistoryNewestFirst({
      proofs: [
        {
          id: "proof-1",
          storagePath: "assisted-creation/u/r/proofs/1.png",
          createdAtMillis: 100,
          proofNumber: 1,
          isApprovedProof: false,
        },
      ],
      finalSource: null,
    });

    assert.equal(items.length, 1);
    assert.equal(items[0]?.kind, "proof");
  });

  it("includes Final Artwork as a separate history item", () => {
    const items = buildAssistedCreationArtworkHistoryNewestFirst({
      proofs: [
        {
          id: "proof-1",
          storagePath: "assisted-creation/u/r/proofs/1.png",
          createdAtMillis: 100,
          proofNumber: 1,
          isApprovedProof: true,
        },
      ],
      finalSource: {
        id: "final-1",
        storagePath: "assisted-creation/u/r/final/final-1.png",
        uploadedAtMillis: 200,
      },
    });

    assert.equal(items.length, 2);
    assert.equal(items[0]?.kind, "final_artwork");
    assert.equal(items[0]?.label, "Final Artwork");
    assert.equal(items[1]?.kind, "proof");
    assert.equal(items[1]?.isApprovedProof, true);
  });
});
