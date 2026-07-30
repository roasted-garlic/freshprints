import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CUSTOMER_UPLOAD_MAX_ZIP_ENTRIES,
  CUSTOMER_UPLOAD_ZIP_IMAGE_PROCESSING_CONCURRENCY,
} from "../../../packages/shared/src/constants/customerUpload/customerUploadLimits.constants";
import { mapWithConcurrency } from "../../../packages/shared/src/utils/boundedConcurrencyQueue";

import {
  aggregateZipProcessingResults,
  type ZipImageFileResult,
  type ZipImageTaskInput,
} from "./finalizeCustomerUploadZipAggregation";

describe("aggregateZipProcessingResults", () => {
  it("counts ready and failed images correctly from an all-fulfilled batch", () => {
    const images: ZipImageTaskInput[] = [
      { uploadId: "u1", entryName: "a.png" },
      { uploadId: "u2", entryName: "b.png" },
      { uploadId: "u3", entryName: "c.png" },
    ];
    const settled = [
      { status: "fulfilled" as const, index: 0, value: { uploadId: "u1", entryName: "a.png", technicalStatus: "ready" as const } },
      {
        status: "fulfilled" as const,
        index: 1,
        value: {
          uploadId: "u2",
          entryName: "b.png",
          technicalStatus: "failed" as const,
          technicalFailureCode: "background_not_transparent",
          technicalFailureMessage: "Background is not transparent.",
        },
      },
      { status: "fulfilled" as const, index: 2, value: { uploadId: "u3", entryName: "c.png", technicalStatus: "ready" as const } },
    ];

    const result = aggregateZipProcessingResults(images, settled);

    assert.equal(result.readyCount, 2);
    assert.equal(result.failedCount, 1);
    assert.equal(result.fileResults.length, 3);
    assert.equal(result.unexpectedRejections.length, 0);
  });

  it("folds a rejected task in as a failed image with correct entry/uploadId association", () => {
    const images: ZipImageTaskInput[] = [
      { uploadId: "u1", entryName: "a.png" },
      { uploadId: "u2", entryName: "b.png" },
    ];
    const settled = [
      { status: "fulfilled" as const, index: 0, value: { uploadId: "u1", entryName: "a.png", technicalStatus: "ready" as const } },
      { status: "rejected" as const, index: 1, reason: new Error("unexpected boom") },
    ];

    const result = aggregateZipProcessingResults(images, settled);

    assert.equal(result.readyCount, 1);
    assert.equal(result.failedCount, 1);
    assert.equal(result.unexpectedRejections.length, 1);
    assert.equal(result.unexpectedRejections[0].image.uploadId, "u2");

    const failedResult = result.fileResults.find((r) => r.uploadId === "u2");
    assert.ok(failedResult);
    assert.equal(failedResult?.entryName, "b.png");
    assert.equal(failedResult?.technicalStatus, "failed");
    assert.equal(failedResult?.technicalFailureCode, "processing_failed");
    assert.equal(failedResult?.technicalFailureMessage, "unexpected boom");
  });

  it("one image's failure does not affect sibling images' outcomes", () => {
    const images: ZipImageTaskInput[] = Array.from({ length: 5 }, (_, i) => ({
      uploadId: `u${i}`,
      entryName: `${i}.png`,
    }));
    const settled = images.map((image, index) =>
      index === 2
        ? { status: "rejected" as const, index, reason: new Error("bad entry") }
        : {
            status: "fulfilled" as const,
            index,
            value: { uploadId: image.uploadId, entryName: image.entryName, technicalStatus: "ready" as const },
          },
    );

    const result = aggregateZipProcessingResults(images, settled);

    assert.equal(result.readyCount, 4);
    assert.equal(result.failedCount, 1);
    for (const image of images) {
      const found = result.fileResults.find((r) => r.uploadId === image.uploadId);
      assert.ok(found, `expected a result for ${image.uploadId}`);
    }
  });

  it("handles an empty batch", () => {
    const result = aggregateZipProcessingResults([], []);
    assert.equal(result.readyCount, 0);
    assert.equal(result.failedCount, 0);
    assert.deepEqual(result.fileResults, []);
    assert.deepEqual(result.unexpectedRejections, []);
  });

  it("handles a single-entry batch", () => {
    const images: ZipImageTaskInput[] = [{ uploadId: "solo", entryName: "solo.png" }];
    const settled = [
      { status: "fulfilled" as const, index: 0, value: { uploadId: "solo", entryName: "solo.png", technicalStatus: "ready" as const } },
    ];
    const result = aggregateZipProcessingResults(images, settled);
    assert.equal(result.readyCount, 1);
    assert.equal(result.failedCount, 0);
  });

  it("is deterministic when driven through the real bounded-concurrency queue with randomized completion order", async () => {
    const images: ZipImageTaskInput[] = Array.from({ length: 30 }, (_, i) => ({
      uploadId: `u${i}`,
      entryName: `${i}.png`,
    }));

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const settled = await mapWithConcurrency(images, 3, async (image, index): Promise<ZipImageFileResult> => {
        // Randomize settlement order so index !== completion order.
        await new Promise((resolve) => setTimeout(resolve, (index * 7) % 11));
        if (index % 5 === 0) {
          return {
            uploadId: image.uploadId,
            entryName: image.entryName,
            technicalStatus: "failed",
            technicalFailureCode: "image_exceeds_limits",
            technicalFailureMessage: "too big",
          };
        }
        return { uploadId: image.uploadId, entryName: image.entryName, technicalStatus: "ready" };
      });

      const result = aggregateZipProcessingResults(images, settled);
      // i % 5 === 0 for i in [0..29]: 0,5,10,15,20,25 -> 6 failures
      assert.equal(result.failedCount, 6, `attempt ${attempt}`);
      assert.equal(result.readyCount, 24, `attempt ${attempt}`);
      assert.equal(result.fileResults.length, 30, `attempt ${attempt}`);

      // Every uploadId must appear exactly once, correctly associated with its own entryName.
      for (const image of images) {
        const matches = result.fileResults.filter((r) => r.uploadId === image.uploadId);
        assert.equal(matches.length, 1, `expected exactly one result for ${image.uploadId}`);
        assert.equal(matches[0].entryName, image.entryName);
      }
    }
  });

  it(
    `never runs more than the real CUSTOMER_UPLOAD_ZIP_IMAGE_PROCESSING_CONCURRENCY ` +
      `(${CUSTOMER_UPLOAD_ZIP_IMAGE_PROCESSING_CONCURRENCY}) simultaneous "sharp pipelines" ` +
      `across a maximum-entry (${CUSTOMER_UPLOAD_MAX_ZIP_ENTRIES}-image) batch, and aggregates ` +
      `correctly afterward`,
    async () => {
      const images: ZipImageTaskInput[] = Array.from(
        { length: CUSTOMER_UPLOAD_MAX_ZIP_ENTRIES },
        (_, i) => ({ uploadId: `u${i}`, entryName: `${i}.png` }),
      );

      let activeSharpPipelines = 0;
      let maxActiveSharpPipelines = 0;

      const settled = await mapWithConcurrency(
        images,
        CUSTOMER_UPLOAD_ZIP_IMAGE_PROCESSING_CONCURRENCY,
        async (image): Promise<ZipImageFileResult> => {
          activeSharpPipelines += 1;
          maxActiveSharpPipelines = Math.max(maxActiveSharpPipelines, activeSharpPipelines);
          // Simulate the multi-stage async pipeline (decode -> trim -> upscale -> encode) with a
          // real await boundary so overlapping tasks are actually exercised, not just scheduled.
          await new Promise((resolve) => setTimeout(resolve, 1));
          activeSharpPipelines -= 1;
          return { uploadId: image.uploadId, entryName: image.entryName, technicalStatus: "ready" };
        },
      );

      assert.ok(
        maxActiveSharpPipelines <= CUSTOMER_UPLOAD_ZIP_IMAGE_PROCESSING_CONCURRENCY,
        `expected at most ${CUSTOMER_UPLOAD_ZIP_IMAGE_PROCESSING_CONCURRENCY} simultaneous pipelines, saw ${maxActiveSharpPipelines}`,
      );
      assert.equal(activeSharpPipelines, 0, "no pipeline should remain active after settlement (no leaked permits)");

      const result = aggregateZipProcessingResults(images, settled);
      assert.equal(result.readyCount, CUSTOMER_UPLOAD_MAX_ZIP_ENTRIES);
      assert.equal(result.failedCount, 0);
      assert.equal(result.fileResults.length, CUSTOMER_UPLOAD_MAX_ZIP_ENTRIES);
    },
  );
});
