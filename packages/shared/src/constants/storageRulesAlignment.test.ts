import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { MAX_SINGLE_PNG_SIZE_BYTES } from "../constants/importValidation.constants";
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
      rules.includes("100 * 1024 * 1024")
        || rules.includes(`request.resource.size < ${CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES}`),
      "storage.rules must cap customer source uploads at 100 MB",
    );
    assert.ok(
      rules.includes("2 * 1024 * 1024 * 1024")
        || rules.includes(`request.resource.size < ${CUSTOMER_UPLOAD_MAX_ZIP_COMPRESSED_BYTES}`),
      "storage.rules must cap customer ZIP uploads at 2 GB",
    );
    assert.ok(
      rules.includes('fileName == "source"'),
      "customers may only write the source object name",
    );
  });
});
