import assert from "node:assert/strict";
import Module, { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const functionsDirectory = path.resolve(scriptDirectory, "..");
const requireCompiled = createRequire(import.meta.url);
const originalLoad = Module._load;
let sharpLoadCount = 0;

Module._load = function monitoredModuleLoad(request, parent, isMain) {
  if (request === "sharp") {
    sharpLoadCount += 1;
  }
  return originalLoad.call(this, request, parent, isMain);
};

try {
  const prepareModulePath = path.join(
    functionsDirectory,
    "lib",
    "functions",
    "src",
    "ai",
    "prepareAiAnalysisImage.js",
  );
  const customerUploadModulePath = path.join(
    functionsDirectory,
    "lib",
    "functions",
    "src",
    "lib",
    "customerUploadProcessing.js",
  );
  const portalOgModulePath = path.join(
    functionsDirectory,
    "lib",
    "functions",
    "src",
    "lib",
    "portalOgImageCompose.js",
  );

  const prepareModule = requireCompiled(prepareModulePath);
  requireCompiled(customerUploadModulePath);
  requireCompiled(portalOgModulePath);
  assert.equal(sharpLoadCount, 0, "sharp must remain unloaded during compiled module discovery");

  const onePixelPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+5R5qAAAAAElFTkSuQmCC",
    "base64",
  );
  const first = await prepareModule.prepareAiAnalysisImage(onePixelPng);
  assert.equal(first.contentType, "image/webp");
  assert.equal(sharpLoadCount, 1, "first image invocation must load sharp exactly once");

  await prepareModule.prepareAiAnalysisImage(onePixelPng);
  assert.equal(sharpLoadCount, 1, "subsequent invocation must reuse the cached sharp module");
} finally {
  Module._load = originalLoad;
}
