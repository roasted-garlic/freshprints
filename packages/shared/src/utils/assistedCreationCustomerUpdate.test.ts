import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canCustomerUpdateAssistedCreation } from "../constants/assistedCreation/assistedCreation.constants";
import { parseAssistedCreationReferenceImageUpdateInputs } from "./assistedCreationValidation";

describe("canCustomerUpdateAssistedCreation", () => {
  it("allows updates only while submitted", () => {
    assert.equal(canCustomerUpdateAssistedCreation("submitted"), true);
    assert.equal(canCustomerUpdateAssistedCreation("in_progress"), false);
    assert.equal(canCustomerUpdateAssistedCreation("proof_ready"), false);
    assert.equal(canCustomerUpdateAssistedCreation("revision_requested"), false);
    assert.equal(canCustomerUpdateAssistedCreation("approved"), false);
    assert.equal(canCustomerUpdateAssistedCreation("rejected"), false);
    assert.equal(canCustomerUpdateAssistedCreation("cancelled"), false);
  });
});

describe("parseAssistedCreationReferenceImageUpdateInputs", () => {
  const existing = [
    {
      id: "ref-1",
      storagePath: "assisted-creation/uid-1/pending/ref-1",
      fileName: "a.png",
      contentType: "image/png",
      sizeBytes: 100,
    },
  ];

  it("keeps existing images when raw is omitted", () => {
    const result = parseAssistedCreationReferenceImageUpdateInputs(undefined, {
      customerUid: "uid-1",
      requireCloneUpload: false,
      existingImages: existing,
    });
    assert.deepEqual(result, existing);
  });

  it("allows retaining an existing image and adding a new pending upload", () => {
    const result = parseAssistedCreationReferenceImageUpdateInputs(
      [
        existing[0],
        {
          id: "ref-2",
          storagePath: "assisted-creation/uid-1/pending/ref-2",
          fileName: "b.jpg",
          contentType: "image/jpeg",
          sizeBytes: 200,
        },
      ],
      {
        customerUid: "uid-1",
        requireCloneUpload: false,
        existingImages: existing,
      },
    );
    assert.equal(result.length, 2);
    assert.equal(result[1]?.id, "ref-2");
  });

  it("rejects paths that are neither existing nor pending for the caller", () => {
    assert.throws(
      () =>
        parseAssistedCreationReferenceImageUpdateInputs(
          [
            {
              id: "evil",
              storagePath: "assisted-creation/other/pending/evil",
              fileName: "x.png",
              contentType: "image/png",
              sizeBytes: 10,
            },
          ],
          {
            customerUid: "uid-1",
            requireCloneUpload: false,
            existingImages: existing,
          },
        ),
      /Invalid reference image path/,
    );
  });
});
