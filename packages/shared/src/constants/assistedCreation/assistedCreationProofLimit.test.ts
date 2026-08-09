import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  ASSISTED_CREATION_MAX_PROOF_BYTES,
  ASSISTED_CREATION_MAX_REFERENCE_BYTES,
} from "./assistedCreation.constants";

/** Mirrors Studio/Functions inclusive proof size gate: reject when size > MAX. */
function isProofSizeAccepted(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= ASSISTED_CREATION_MAX_PROOF_BYTES;
}

describe("ASSISTED_CREATION_MAX_PROOF_BYTES (80 MB staff proofs)", () => {
  it("is exactly 80 MiB", () => {
    assert.equal(ASSISTED_CREATION_MAX_PROOF_BYTES, 80 * 1024 * 1024);
  });

  it("accepts small and just-below-max proofs", () => {
    assert.equal(isProofSizeAccepted(1), true);
    assert.equal(isProofSizeAccepted(ASSISTED_CREATION_MAX_PROOF_BYTES - 1), true);
  });

  it("accepts exactly 80 MB (inclusive boundary)", () => {
    assert.equal(isProofSizeAccepted(ASSISTED_CREATION_MAX_PROOF_BYTES), true);
  });

  it("rejects one byte over 80 MB", () => {
    assert.equal(isProofSizeAccepted(ASSISTED_CREATION_MAX_PROOF_BYTES + 1), false);
  });

  it("does not change customer reference-image per-file ceiling", () => {
    assert.equal(ASSISTED_CREATION_MAX_REFERENCE_BYTES, 40 * 1024 * 1024);
  });
});

describe("Studio proof error copy uses the shared constant", () => {
  const service = readFileSync(
    "apps/studio/src/renderer/src/features/customer-requests/services/assistedCreationRequestsService.ts",
    "utf8",
  );

  it("formats Proof must be N MB from ASSISTED_CREATION_MAX_PROOF_BYTES", () => {
    assert.match(
      service,
      /Proof must be \$\{ASSISTED_CREATION_MAX_PROOF_BYTES \/ \(1024 \* 1024\)\} MB or smaller/,
    );
    assert.doesNotMatch(service, /Proof must be 25 MB/);
  });

  it("does not hard-code a 25 MB proof ceiling", () => {
    assert.doesNotMatch(service, /25 \* 1024 \* 1024/);
  });
});

describe("Functions trusted-server proof size uses the shared constant", () => {
  it("assistedCreationRequests compares against ASSISTED_CREATION_MAX_PROOF_BYTES", () => {
    const source = readFileSync("functions/src/assistedCreationRequests.ts", "utf8");
    assert.match(source, /sizeBytes > ASSISTED_CREATION_MAX_PROOF_BYTES/);
    assert.doesNotMatch(source, /25 \* 1024 \* 1024/);
  });
});
