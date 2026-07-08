import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { MAX_SINGLE_PNG_SIZE_BYTES } from "../constants/importValidation.constants";

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
});
