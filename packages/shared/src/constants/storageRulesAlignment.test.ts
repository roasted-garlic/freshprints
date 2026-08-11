import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { MAX_SINGLE_PNG_SIZE_BYTES } from "../constants/importValidation.constants";
import {
  ASSISTED_CREATION_MAX_PROOF_BYTES,
  ASSISTED_CREATION_MAX_REFERENCE_BYTES,
} from "./assistedCreation/assistedCreation.constants";
import {
  CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES,
  CUSTOMER_UPLOAD_MAX_ZIP_COMPRESSED_BYTES,
} from "./customerUpload/customerUploadLimits.constants";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("storage.rules alignment", () => {
  it("matches MAX_SINGLE_PNG_SIZE_BYTES", async () => {
    const rulesPath = path.join(REPO_ROOT, "storage.rules");
    const rules = await readFile(rulesPath, "utf8");

    assert.ok(
      rules.includes("150 * 1024 * 1024")
        || rules.includes(`request.resource.size < ${MAX_SINGLE_PNG_SIZE_BYTES}`),
      "storage.rules must cap originals at 150 MB (sync with MAX_SINGLE_PNG_SIZE_BYTES)",
    );
  });

  it("matches customer upload source and ZIP byte caps", async () => {
    const rulesPath = path.join(REPO_ROOT, "storage.rules");
    const rules = await readFile(rulesPath, "utf8");

    assert.ok(
      rules.includes("customer-uploads"),
      "storage.rules must include customer-uploads paths",
    );
    assert.ok(
      rules.includes("80 * 1024 * 1024")
        || rules.includes(`request.resource.size < ${CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES}`),
      "storage.rules must cap customer source uploads at 80 MB",
    );
    assert.ok(
      rules.includes("2 * 1024 * 1024 * 1024")
        || rules.includes(`request.resource.size < ${CUSTOMER_UPLOAD_MAX_ZIP_COMPRESSED_BYTES}`),
      "storage.rules must cap customer ZIP uploads at the 2 GB ceiling",
    );
    assert.ok(
      rules.includes('fileName == "source"'),
      "customers may only write the source object name",
    );
    assert.ok(
      rules.includes("isAnonymousAuth") || rules.includes('sign_in_provider == "anonymous"'),
      "storage.rules must allow anonymous guest donation source writes under own UID",
    );
  });

  it("allows public read of ready design derivatives without requiring isCustomer()", async () => {
    const rulesPath = path.join(REPO_ROOT, "storage.rules");
    const rules = await readFile(rulesPath, "utf8");

    const helperStart = rules.indexOf("function isReadyDesignDerivative");
    assert.ok(helperStart >= 0, "storage.rules must define isReadyDesignDerivative");
    const helperEnd = rules.indexOf("function isCanonicalOriginalFileName", helperStart);
    const helper = rules.slice(helperStart, helperEnd > helperStart ? helperEnd : undefined);

    assert.ok(
      !helper.includes("isCustomer()"),
      "isReadyDesignDerivative must not require isCustomer() (public catalog browse #13)",
    );
    assert.ok(
      helper.includes('status == "ready"'),
      "isReadyDesignDerivative must still require ready design status",
    );
    assert.ok(
      helper.includes("isCanonicalDerivativeFileName"),
      "isReadyDesignDerivative must still require canonical filename",
    );
  });

  it("matches ASSISTED_CREATION_MAX_REFERENCE_BYTES exactly — fails if either drifts independently", async () => {
    const rulesPath = path.join(REPO_ROOT, "storage.rules");
    const rules = await readFile(rulesPath, "utf8");

    const helperStart = rules.indexOf("function isValidAssistedCreationImage");
    assert.ok(helperStart >= 0, "storage.rules must define isValidAssistedCreationImage");
    const helperEnd = rules.indexOf("function isValidAssistedCreationProof", helperStart);
    const helper = rules.slice(helperStart, helperEnd > helperStart ? helperEnd : undefined);

    // storage.rules writes byte ceilings as an arithmetic expression (e.g. "40 * 1024 * 1024"),
    // not a pre-computed literal — extract the actual expression the Rules file enforces and
    // multiply its factors the same way, so this test fails if either side drifts independently
    // rather than duplicating a second handwritten "40" that could silently go stale.
    const sizeCheckMatch = helper.match(/request\.resource\.size\s*<=\s*([0-9*\s]+?)\s*&&/);
    assert.ok(
      sizeCheckMatch,
      `storage.rules isValidAssistedCreationImage() must contain a "request.resource.size <= <expr> &&" check (helper text: ${helper})`,
    );
    const rulesBytes = sizeCheckMatch![1]
      .split("*")
      .map((factor) => Number(factor.trim()))
      .reduce((product, factor) => product * factor, 1);
    assert.equal(
      rulesBytes,
      ASSISTED_CREATION_MAX_REFERENCE_BYTES,
      `storage.rules enforces ${rulesBytes} bytes but ASSISTED_CREATION_MAX_REFERENCE_BYTES is ` +
        `${ASSISTED_CREATION_MAX_REFERENCE_BYTES} — these must match exactly`,
    );
    assert.ok(
      helper.includes('"image/jpeg", "image/png", "image/webp"'),
      "isValidAssistedCreationImage must still require the three allowed reference-image types",
    );
  });

  it("matches ASSISTED_CREATION_MAX_PROOF_BYTES exactly — fails if either drifts independently", async () => {
    const rulesPath = path.join(REPO_ROOT, "storage.rules");
    const rules = await readFile(rulesPath, "utf8");

    const helperStart = rules.indexOf("function isValidAssistedCreationProof");
    assert.ok(helperStart >= 0, "storage.rules must define isValidAssistedCreationProof");
    const helperEnd = rules.indexOf("match /assisted-creation/{userId}/{requestId}/proofs", helperStart);
    const helper = rules.slice(helperStart, helperEnd > helperStart ? helperEnd : undefined);

    // Inclusive ceiling (`<=`) must match Studio/Functions `size > MAX` reject convention.
    const sizeCheckMatch = helper.match(/request\.resource\.size\s*<=\s*([0-9*\s]+?)\s*&&/);
    assert.ok(
      sizeCheckMatch,
      `storage.rules isValidAssistedCreationProof() must contain "request.resource.size <= <expr> &&" (helper: ${helper})`,
    );
    const rulesBytes = sizeCheckMatch![1]
      .split("*")
      .map((factor) => Number(factor.trim()))
      .reduce((product, factor) => product * factor, 1);
    assert.equal(
      rulesBytes,
      ASSISTED_CREATION_MAX_PROOF_BYTES,
      `storage.rules enforces ${rulesBytes} bytes but ASSISTED_CREATION_MAX_PROOF_BYTES is ` +
        `${ASSISTED_CREATION_MAX_PROOF_BYTES} — these must match exactly`,
    );
    assert.doesNotMatch(helper, /<\s*80\s*\*\s*1024\s*\*\s*1024|<\s*25\s*\*\s*1024\s*\*\s*1024/);
    assert.ok(
      helper.includes('"image/jpeg", "image/png", "image/webp"'),
      "isValidAssistedCreationProof must still require the three allowed proof types",
    );
  });

  it("includes owner-writable public-readable brand logo paths at 2 MiB PNG", async () => {
    const rulesPath = path.join(REPO_ROOT, "storage.rules");
    const rules = await readFile(rulesPath, "utf8");

    assert.ok(rules.includes("match /brand/{appId}/{slotId}/{fileName}"), "brand logo match path");
    assert.ok(
      rules.includes("2 * 1024 * 1024"),
      "storage.rules must cap brand logos at 2 MiB",
    );
    assert.ok(
      rules.includes('request.resource.contentType == "image/png"'),
      "brand logos must require image/png",
    );
  });

  it("includes owner-writable public-readable static Global OG paths at 5 MiB", async () => {
    const rulesPath = path.join(REPO_ROOT, "storage.rules");
    const rules = await readFile(rulesPath, "utf8");

    assert.ok(
      rules.includes("match /portal-social-meta/static-og/{fileName}"),
      "static OG match path",
    );
    assert.ok(
      rules.includes("5 * 1024 * 1024"),
      "storage.rules must cap static OG images at 5 MiB",
    );
    assert.ok(
      rules.includes('request.resource.contentType == "image/webp"'),
      "static OG uploads must allow image/webp",
    );
  });
});
