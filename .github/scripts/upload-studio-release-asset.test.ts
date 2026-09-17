import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const helperSource = readFileSync(path.join(__dirname, "upload-studio-release-asset.sh"), "utf8");
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
    helperSource,
    /\[\s+\"\$HTTP_CODE\"\s+=\s+\"200\"\s+\]\s+\|\|\s+\[\s+\"\$HTTP_CODE\"\s+=\s+\"201\"\s+\]/,
  );
});

test("transient GitHub statuses and network failures are bounded and backed off", () => {
  assert.equal(shouldRetry("500", 0), true);
  assert.equal(shouldRetry("502", 0), true);
  assert.equal(shouldRetry("", 28), true);
  assert.match(helperSource, /MAX_ATTEMPTS=\"\$\{RELEASE_ASSET_MAX_ATTEMPTS:-5\}\"/);
  assert.match(helperSource, /429\|500\|502\|503\|504/);
  assert.match(helperSource, /1\) echo 5/);
  assert.match(helperSource, /2\) echo 15/);
  assert.match(helperSource, /3\) echo 30/);
  assert.match(helperSource, /\*\) echo 60/);
  assert.match(helperSource, /--connect-timeout 20/);
  assert.match(helperSource, /--max-time 300/);
});

test("non-transient HTTP failures fail closed instead of retrying indefinitely", () => {
  assert.equal(shouldRetry("400", 0), false);
  assert.equal(shouldRetry("401", 0), false);
  assert.equal(shouldRetry("404", 0), false);
  assert.match(helperSource, /Non-transient asset upload failure/);
  assert.match(helperSource, /Asset upload exhausted/);
});

test("cleanup and verification are constrained to the exact release and same asset name", () => {
  assert.match(helperSource, /releases\/\$\{RELEASE_ID\}\/assets/);
  assert.match(helperSource, /select\(\.name == \$name\)/);
  assert.match(helperSource, /releases\/assets\/\$\{asset_id\}/);
  assert.match(helperSource, /\.draft == true and \.target_commitish == \$expected_sha/);
  assert.match(helperSource, /Verified \$\{NAME\} on exact release_id=/);
  assert.match(helperSource, /Keeping already-valid \$\{NAME\}/);
});

test("workflow keeps release identity gates, canonical verification, validation-only safety, and Mac compression setting", () => {
  assert.match(workflowSource, /RELEASE_TARGET_SHA=\"\$BUILD_SHA\"/);
  assert.match(workflowSource, /bash \.github\/scripts\/upload-studio-release-asset\.sh/);
  assert.match(workflowSource, /compression-level: 0/);
  assert.match(workflowSource, /VALIDATION_ONLY_NO_RELEASE_MUTATION=1/);
  assert.match(workflowSource, /done < canonical-asset-names\.txt/);
  assert.match(workflowSource, /FINALIZE_OK release_id=\$\{RELEASE_ID\}/);
  assert.doesNotMatch(workflowSource, /EXISTING_ASSETS=.*releases\/\$\{RELEASE_ID\}\/assets/);
});
