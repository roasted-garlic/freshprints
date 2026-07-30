import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assistedCreationCatalogShareProofTitle,
  chronologicalAssistedCreationImageProofNumber,
  countAssistedCreationImageProofs,
  isAssistedCreationCatalogShareProof,
  isAssistedCreationImageProof,
} from "./assistedCreationProofKind";

describe("assistedCreationProofKind", () => {
  it("treats omit and proof_image as image proofs", () => {
    assert.equal(isAssistedCreationCatalogShareProof(undefined), false);
    assert.equal(isAssistedCreationCatalogShareProof({ kind: "proof_image" }), false);
    assert.equal(isAssistedCreationImageProof({}), true);
    assert.equal(isAssistedCreationImageProof({ kind: "proof_image" }), true);
  });

  it("detects catalog_share rows", () => {
    assert.equal(isAssistedCreationCatalogShareProof({ kind: "catalog_share" }), true);
    assert.equal(isAssistedCreationImageProof({ kind: "catalog_share" }), false);
  });

  it("counts only image proofs", () => {
    assert.equal(
      countAssistedCreationImageProofs([
        { kind: "catalog_share" },
        {},
        { kind: "proof_image" },
        { kind: "catalog_share" },
      ]),
      2,
    );
  });

  it("numbers image proofs chronologically and skips catalog rows", () => {
    const proofs = [
      { id: "c1", kind: "catalog_share" as const },
      { id: "p1", kind: "proof_image" as const },
      { id: "c2", kind: "catalog_share" as const },
      { id: "p2" },
    ];
    assert.equal(chronologicalAssistedCreationImageProofNumber(proofs, "c1"), 0);
    assert.equal(chronologicalAssistedCreationImageProofNumber(proofs, "p1"), 1);
    assert.equal(chronologicalAssistedCreationImageProofNumber(proofs, "p2"), 2);
    assert.equal(chronologicalAssistedCreationImageProofNumber(proofs, "missing"), 0);
  });

  it("resolves Design Library proof row titles", () => {
    assert.equal(
      assistedCreationCatalogShareProofTitle({
        catalogDesignTitle: "  Neon Cat  ",
        fileName: "fallback",
      }),
      "Neon Cat",
    );
    assert.equal(
      assistedCreationCatalogShareProofTitle({ fileName: "  Snapshot title  " }),
      "Snapshot title",
    );
    assert.equal(assistedCreationCatalogShareProofTitle({ fileName: "" }), "Design Library");
    assert.equal(assistedCreationCatalogShareProofTitle(undefined), "Design Library");
  });
});
