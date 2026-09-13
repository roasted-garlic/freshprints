import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  deriveAssistedCreationProofOptionLabel,
  normalizeStaffAssistedCreationProofBatch,
  resolveAssistedCreationCurrentRoundOptions,
} from "./assistedCreationProofRounds";
import type { AssistedCreationProof } from "../types/assistedCreation/assistedCreation.types";

describe("assistedCreationProofRounds", () => {
  it("derives Option A/B/C labels from order", () => {
    assert.equal(deriveAssistedCreationProofOptionLabel(0), "Option A");
    assert.equal(deriveAssistedCreationProofOptionLabel(1), "Option B");
    assert.equal(deriveAssistedCreationProofOptionLabel(2), "Option C");
  });

  it("resolves multi-option current round by currentProofRoundId", () => {
    const proofs: AssistedCreationProof[] = [
      {
        id: "old",
        storagePath: "p/old",
        fileName: "old",
        contentType: "image/png",
        sizeBytes: 1,
        createdBy: "s",
        createdAt: 1,
        proofRoundId: "r0",
        optionOrder: 0,
        optionLabel: "Option A",
      },
      {
        id: "a",
        storagePath: "p/a",
        fileName: "a",
        contentType: "image/png",
        sizeBytes: 1,
        createdBy: "s",
        createdAt: 2,
        proofRoundId: "r1",
        optionOrder: 1,
        optionLabel: "Option B",
      },
      {
        id: "b",
        storagePath: "p/b",
        fileName: "b",
        contentType: "image/png",
        sizeBytes: 1,
        createdBy: "s",
        createdAt: 3,
        proofRoundId: "r1",
        optionOrder: 0,
        optionLabel: "Option A",
      },
    ];
    const resolved = resolveAssistedCreationCurrentRoundOptions({
      proofs,
      currentProofRoundId: "r1",
    });
    assert.equal(resolved.proofRoundId, "r1");
    assert.deepEqual(
      resolved.options.map((p) => p.id),
      ["b", "a"],
    );
  });

  it("treats legacy proofs without round id as a one-option round", () => {
    const proofs: AssistedCreationProof[] = [
      {
        id: "p1",
        storagePath: "p/1",
        fileName: "1",
        contentType: "image/png",
        sizeBytes: 1,
        createdBy: "s",
        createdAt: 1,
      },
    ];
    const resolved = resolveAssistedCreationCurrentRoundOptions({ proofs, currentProofRoundId: null });
    assert.equal(resolved.proofRoundId, null);
    assert.equal(resolved.options[0]?.id, "p1");
  });

  it("normalizes singular proof and rejects duplicates / oversize rounds", () => {
    const one = normalizeStaffAssistedCreationProofBatch({
      proof: {
        id: "p1",
        storagePath: "assisted-creation/u/r/proofs/o1",
        fileName: "o1",
        contentType: "image/png",
        sizeBytes: 10,
      },
    });
    assert.equal(one.length, 1);
    assert.throws(() =>
      normalizeStaffAssistedCreationProofBatch({
        proofs: [
          {
            id: "p1",
            storagePath: "assisted-creation/u/r/proofs/o1",
            fileName: "o1",
            contentType: "image/png",
            sizeBytes: 10,
          },
          {
            id: "p1",
            storagePath: "assisted-creation/u/r/proofs/o2",
            fileName: "o2",
            contentType: "image/png",
            sizeBytes: 10,
          },
        ],
      }),
    );
  });
});
