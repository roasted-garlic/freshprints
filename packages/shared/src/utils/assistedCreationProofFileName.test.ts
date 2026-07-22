import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assistedCreationProofFileExtension,
  buildAssistedCreationCustomerDownloadFileName,
  buildAssistedCreationFinalArtworkDownloadFileName,
  buildAssistedCreationOpaqueProofObjectId,
  buildAssistedCreationProofStoredFileName,
  formatAssistedCreationProofUploadStamp,
  isAssistedCreationOpaqueProofObjectId,
  isAssistedCreationStoredProofFileName,
} from "./assistedCreationProofFileName";

describe("assistedCreationProofFileName", () => {
  it("formats local mmddyyyy and HHmm without seconds", () => {
    const stamp = formatAssistedCreationProofUploadStamp(new Date(2026, 9, 17, 22, 4, 59));
    assert.deepEqual(stamp, { datePart: "10172026", timePart: "2204" });
  });

  it("builds proof-n-mmddyyyy-HHmm.ext", () => {
    const name = buildAssistedCreationProofStoredFileName({
      proofNumber: 6,
      uploadedAt: new Date(2026, 9, 17, 22, 4, 30),
      contentType: "image/png",
    });
    assert.equal(name, "proof-6-10172026-2204.png");
  });

  it("maps jpeg content type to jpg extension", () => {
    assert.equal(assistedCreationProofFileExtension("image/jpeg"), "jpg");
    assert.equal(
      buildAssistedCreationProofStoredFileName({
        proofNumber: 1,
        uploadedAt: new Date(2026, 0, 5, 9, 7, 0),
        contentType: "image/jpeg",
      }),
      "proof-1-01052026-0907.jpg",
    );
  });

  it("recognizes stored proof file names", () => {
    assert.equal(isAssistedCreationStoredProofFileName("proof-6-10172026-2204.png"), true);
    assert.equal(isAssistedCreationStoredProofFileName("Achy Breaky - Pocket 2.png"), false);
  });

  it("builds opaque extensionless object ids for new proof uploads", () => {
    const id = buildAssistedCreationOpaqueProofObjectId(
      () => "A1B2C3D4-E5F6-4789-A012-3456789ABCDE",
    );
    assert.equal(id, "a1b2c3d4-e5f6-4789-a012-3456789abcde");
    assert.equal(isAssistedCreationOpaqueProofObjectId(id), true);
    assert.equal(isAssistedCreationOpaqueProofObjectId("proof-1-01012026-1200.png"), false);
  });

  it("builds friendly final artwork download names", () => {
    assert.equal(
      buildAssistedCreationFinalArtworkDownloadFileName("image/png"),
      "Fresh-Prints-Final-Artwork.png",
    );
    assert.equal(
      buildAssistedCreationFinalArtworkDownloadFileName("image/jpeg"),
      "Fresh-Prints-Final-Artwork.jpg",
    );
  });

  it("customer download uses stored pattern or proof-n.ext — not original creative names", () => {
    assert.equal(
      buildAssistedCreationCustomerDownloadFileName({
        proofNumber: 6,
        fileName: "proof-6-10172026-2204.png",
        contentType: "image/png",
      }),
      "proof-6-10172026-2204.png",
    );
    assert.equal(
      buildAssistedCreationCustomerDownloadFileName({
        proofNumber: 6,
        fileName: "Achy Breaky - Pocket 2.png",
        contentType: "image/png",
      }),
      "proof-6.png",
    );
  });
});
