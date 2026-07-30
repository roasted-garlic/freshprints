import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildPersistedUploadSessionIds } from "./uploadSessionRows";

describe("upload session rows", () => {
  it("persists latest active and new rows while omitting rows without an upload id", () => {
    assert.deepEqual(
      buildPersistedUploadSessionIds([
        { uploadId: "latest-existing" },
        { uploadId: null },
        { uploadId: "new-upload" },
      ]),
      ["latest-existing", "new-upload"],
    );
  });
});
