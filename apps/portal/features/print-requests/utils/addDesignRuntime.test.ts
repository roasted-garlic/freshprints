import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
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

  it("uses the latest toast function and invokes the latest Undo action exactly once", () => {
    const messages: string[] = [];
    const showSuccessRef: {
      current: (
        message: string,
        options: { action: { label: string; onClick: () => void } },
      ) => void;
    } = {
      current: () => undefined,
    };
    let latestUndoCount = 0;
    showSuccessRef.current = (message, options) => {
      messages.push(message);
      options.action.onClick();
    };

    announceCurrentDesignAdded({
      title: "Cat",
      showSuccessRef,
      onUndo: () => {
        latestUndoCount += 1;
      },
    });

    assert.deepEqual(messages, ["Added “Cat” to your Current Request."]);
    assert.equal(latestUndoCount, 1);
  });
});
