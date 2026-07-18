import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assistedCreationProofFileExtension,
  buildAssistedCreationCustomerDownloadFileName,
  buildAssistedCreationProofStoredFileName,
  formatAssistedCreationProofUploadStamp,
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
