import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { UploadCancelToken } from "./uploadCancelToken";

describe("UploadCancelToken", () => {
  it("starts not cancelled", () => {
    const token = new UploadCancelToken();
    assert.equal(token.isCancelled, false);
  });

  it("flips isCancelled after cancel()", () => {
    const token = new UploadCancelToken();
    token.cancel();
    assert.equal(token.isCancelled, true);
  });

  it("cancels every currently-registered task when cancel() is called", () => {
    const token = new UploadCancelToken();
    let firstCancelled = false;
    let secondCancelled = false;

    token.registerTask({ cancel: () => (firstCancelled = true) });
    token.registerTask({ cancel: () => (secondCancelled = true) });

    token.cancel();

    assert.equal(firstCancelled, true);
    assert.equal(secondCancelled, true);
  });

  it("immediately cancels a task registered after the token was already cancelled", () => {
    const token = new UploadCancelToken();
    token.cancel();

    let cancelled = false;
    token.registerTask({ cancel: () => (cancelled = true) });

    assert.equal(cancelled, true);
  });

  it("unregister removes a task so it is not cancelled by a later cancel() call", () => {
    const token = new UploadCancelToken();
    let cancelled = false;
    const unregister = token.registerTask({ cancel: () => (cancelled = true) });

    unregister();
    token.cancel();

    assert.equal(cancelled, false);
  });

  it("a second cancel() call is a no-op (does not re-invoke already-cancelled tasks)", () => {
    const token = new UploadCancelToken();
    let cancelCount = 0;
    token.registerTask({ cancel: () => (cancelCount += 1) });

    token.cancel();
    token.cancel();

    assert.equal(cancelCount, 1);
  });
});
