import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  SUBMIT_NUDGE_TOAST_ACTION_LABEL,
  SUBMIT_NUDGE_TOAST_DURATION_MS,
  SUBMIT_NUDGE_TOAST_MESSAGE,
  announceCurrentDesignAdded,
  requireCurrentSignedIn,
} from "./addDesignRuntime";

describe("add-design current runtime dependencies", () => {
  it("uses the latest auth and router values at callback execution", () => {
    const userRef: { current: { uid: string } | null } = { current: null };
    const routerRef = { current: "old-router" };
    const redirects: string[] = [];
    routerRef.current = "latest-router";

    assert.equal(
      requireCurrentSignedIn({
        userRef,
        routerRef,
        designId: "design 1",
        redirect: (router, returnTo) => redirects.push(`${router}:${returnTo}`),
      }),
      false,
    );
    assert.deepEqual(redirects, ["latest-router:/catalog?designId=design%201"]);

    redirects.length = 0;
    assert.equal(
      requireCurrentSignedIn({
        userRef: { current: null },
        routerRef,
        designId: "design 1",
        returnTo: "/shows/show-123",
        redirect: (router, returnTo) => redirects.push(`${router}:${returnTo}`),
      }),
      false,
    );
    assert.deepEqual(redirects, ["latest-router:/shows/show-123"]);

    userRef.current = { uid: "latest-user" };
    assert.equal(
      requireCurrentSignedIn({
        userRef,
        routerRef,
        redirect: () => redirects.push("unexpected"),
      }),
      true,
    );
    assert.equal(redirects.length, 1);
  });

  it("announces a long-lived review/submit nudge instead of Undo", () => {
    const messages: string[] = [];
    const optionsSeen: Array<{
      action: { label: string; onClick: () => void };
      durationMs?: number;
    }> = [];
    const showSuccessRef: {
      current: (
        message: string,
        options: {
          action: { label: string; onClick: () => void };
          durationMs?: number;
        },
      ) => void;
    } = {
      current: () => undefined,
    };
    let reviewCount = 0;
    showSuccessRef.current = (message, options) => {
      messages.push(message);
      optionsSeen.push(options);
      options.action.onClick();
    };

    announceCurrentDesignAdded({
      showSuccessRef,
      onReviewRequest: () => {
        reviewCount += 1;
      },
    });

    assert.deepEqual(messages, [SUBMIT_NUDGE_TOAST_MESSAGE]);
    assert.equal(optionsSeen[0]?.action.label, SUBMIT_NUDGE_TOAST_ACTION_LABEL);
    assert.equal(optionsSeen[0]?.durationMs, SUBMIT_NUDGE_TOAST_DURATION_MS);
    assert.equal(reviewCount, 1);
  });
});
