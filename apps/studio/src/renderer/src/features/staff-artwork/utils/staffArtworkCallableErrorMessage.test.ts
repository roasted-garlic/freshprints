import assert from "node:assert/strict";
import { FirebaseError } from "firebase/app";
import { describe, it } from "node:test";

import { resolveStaffArtworkCallableErrorMessage } from "./staffArtworkCallableErrorMessage";

describe("resolveStaffArtworkCallableErrorMessage", () => {
  it("keeps the callable message and human-readable show/print-request blockers", () => {
    const error = new FirebaseError(
      "functions/failed-precondition",
      "Cannot send to AI Review while this artwork is still used.",
    ) as FirebaseError & { customData: unknown };
    error.customData = {
      serverResponse: {
        data: {
          details: {
            reason: "deletion_blockers",
            blockers: ["print_request_item"],
          },
        },
      },
    };

    const message = resolveStaffArtworkCallableErrorMessage(error);
    assert.match(message, /Cannot send to AI Review/);
    assert.match(message, /print request/);
    assert.match(message, /completed show/);
    assert.doesNotMatch(message, /\[failed-precondition\]/);
  });

  it("does not expose an unbounded non-callable value", () => {
    assert.equal(
      resolveStaffArtworkCallableErrorMessage({}),
      "Unable to promote Staff Artwork.",
    );
  });
});
