import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CALLABLE_AUTH_REQUIRED_MESSAGE,
  ensureCallableAuthReady,
  type CallableAuthLike,
  type CallableAuthUserLike,
} from "./ensureCallableAuthReady";

function createAuth(options: {
  onAuthStateReady?: () => void | Promise<void>;
  currentUser: CallableAuthUserLike | null;
}): CallableAuthLike {
  return {
    authStateReady: async () => {
      await options.onAuthStateReady?.();
    },
    currentUser: options.currentUser,
  };
}

describe("ensureCallableAuthReady", () => {
  it("waits for Auth readiness before reading the current user and token", async () => {
    const order: string[] = [];
    let resolvedUser: CallableAuthUserLike | null = null;

    const auth: CallableAuthLike = {
      authStateReady: async () => {
        order.push("authStateReady");
        resolvedUser = {
          getIdToken: async () => {
            order.push("getIdToken");
            return "owner-id-token";
          },
        };
      },
      get currentUser() {
        order.push("currentUser");
        return resolvedUser;
      },
    };

    await ensureCallableAuthReady(auth);
    assert.deepEqual(order, ["authStateReady", "currentUser", "getIdToken"]);
  });

  it("rejects with a clear sign-in error when there is no current user", async () => {
    await assert.rejects(
      () =>
        ensureCallableAuthReady(
          createAuth({
            currentUser: null,
          }),
        ),
      (error: unknown) =>
        error instanceof Error &&
        error.message === CALLABLE_AUTH_REQUIRED_MESSAGE,
    );
  });

  it("does not treat Auth readiness alone as signed-in when currentUser stays null", async () => {
    let readyResolved = false;
    await assert.rejects(
      () =>
        ensureCallableAuthReady(
          createAuth({
            onAuthStateReady: () => {
              readyResolved = true;
            },
            currentUser: null,
          }),
        ),
      (error: unknown) =>
        error instanceof Error &&
        error.message === CALLABLE_AUTH_REQUIRED_MESSAGE,
    );
    assert.equal(readyResolved, true);
  });

  it("rejects when the ID token is empty and does not succeed", async () => {
    await assert.rejects(
      () =>
        ensureCallableAuthReady(
          createAuth({
            currentUser: {
              getIdToken: async () => "   ",
            },
          }),
        ),
      (error: unknown) =>
        error instanceof Error &&
        error.message === CALLABLE_AUTH_REQUIRED_MESSAGE,
    );
  });

  it("resolves after Auth readiness when a current user yields a token", async () => {
    let tokenRequested = false;
    await ensureCallableAuthReady(
      createAuth({
        currentUser: {
          getIdToken: async () => {
            tokenRequested = true;
            return "owner-id-token";
          },
        },
      }),
    );
    assert.equal(tokenRequested, true);
  });
});
