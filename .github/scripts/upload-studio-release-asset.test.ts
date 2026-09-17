import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workflowSource = readFileSync(
  path.join(__dirname, "../workflows/studio-release.yml"),
  "utf8",
);

const transientStatuses = new Set(["429", "500", "502", "503", "504"]);
const shouldRetry = (httpCode: string, curlExit: number) =>
  curlExit !== 0 || transientStatuses.has(httpCode);

test("successful 200 and 201 responses are accepted without retry", () => {
  assert.equal(shouldRetry("200", 0), false);
  assert.equal(shouldRetry("201", 0), false);
  assert.match(
    workflowSource,
    /\[\s+\"\$HTTP_CODE\"\s+=\s+\"200\"\s+\]\s+\|\|\s+\[\s+\"\$HTTP_CODE\"\s+=\s+\"201\"\s+\]/,
  );
});

test("transient GitHub statuses and network failures are bounded and backed off", () => {
  assert.equal(shouldRetry("500", 0), true);
  assert.equal(shouldRetry("502", 0), true);
  assert.equal(shouldRetry("", 28), true);
  assert.match(workflowSource, /MAX_UPLOAD_ATTEMPTS=5/);
  assert.match(workflowSource, /429\|500\|502\|503\|504/);
  assert.match(workflowSource, /1\) echo 5/);
  assert.match(workflowSource, /2\) echo 15/);
  assert.match(workflowSource, /3\) echo 30/);
  assert.match(workflowSource, /\*\) echo 60/);
  assert.match(workflowSource, /--connect-timeout 20/);
  assert.match(workflowSource, /--max-time 300/);
});

test("non-transient HTTP failures fail closed instead of retrying indefinitely", () => {
  assert.equal(shouldRetry("400", 0), false);
  assert.equal(shouldRetry("401", 0), false);
  assert.equal(shouldRetry("404", 0), false);
  assert.match(workflowSource, /Non-transient asset upload failure/);
  assert.match(workflowSource, /Asset upload exhausted/);
});

test("cleanup and verification are constrained to the exact release and same asset name", () => {
  assert.match(workflowSource, /releases\/\$\{RELEASE_ID\}\/assets/);
  assert.match(workflowSource, /select\(\.name == \$name\)/);
  assert.match(workflowSource, /releases\/assets\/\$\{asset_id\}/);
  assert.match(workflowSource, /\.draft == true and \.target_commitish == \$expected_sha/);
  assert.match(workflowSource, /Verified \$\{name\} on exact release_id=/);
  assert.match(workflowSource, /Keeping already-valid \$\{name\}/);
});

test("workflow keeps release identity gates, canonical verification, validation-only safety, and Mac compression setting", () => {
  assert.match(workflowSource, /--arg expected_sha \"\$BUILD_SHA\"/);
  assert.match(workflowSource, /upload_release_asset\(\) \{/);
  assert.match(workflowSource, /compression-level: 0/);
  assert.match(workflowSource, /VALIDATION_ONLY_NO_RELEASE_MUTATION=1/);
  assert.match(workflowSource, /done < canonical-asset-names\.txt/);
  assert.match(workflowSource, /FINALIZE_OK release_id=\$\{RELEASE_ID\}/);
  assert.doesNotMatch(workflowSource, /EXISTING_ASSETS=.*releases\/\$\{RELEASE_ID\}\/assets/);
});
