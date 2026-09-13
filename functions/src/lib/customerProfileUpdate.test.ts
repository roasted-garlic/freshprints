import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Timestamp } from "firebase-admin/firestore";

import {
  appendUsernameHistory,
  assertPortalUsernameChangeAllowed,
  formatPortalUsernameCooldownMessage,
} from "./customerProfileUpdate";
import { PORTAL_USERNAME_CHANGE_COOLDOWN_MS } from "../../../packages/shared/src/types/customer/customerIdentity.types";

describe("customerProfileUpdate helpers", () => {
  it("allows staff username changes without cooldown", () => {
    const recent = Timestamp.fromMillis(Date.now() - 1000);
    const history = [{ username: "old-user", changedAt: recent }];
    assert.doesNotThrow(() => assertPortalUsernameChangeAllowed(recent, "staff", history));
  });

  it("allows first portal username change even when usernameUpdatedAt is recent", () => {
    const recent = Timestamp.fromMillis(Date.now() - 1000);
    assert.doesNotThrow(() => assertPortalUsernameChangeAllowed(recent, "portal", []));
    assert.doesNotThrow(() => assertPortalUsernameChangeAllowed(recent, "portal", undefined));
  });

  it("blocks portal username changes inside cooldown window after a prior change", () => {
    const recent = Timestamp.fromMillis(Date.now() - 1000);
    const history = [{ username: "old-user", changedAt: recent }];
    assert.throws(
      () => assertPortalUsernameChangeAllowed(recent, "portal", history),
      /change your username again/i,
    );
  });

  it("allows portal username changes after cooldown", () => {
    const old = Timestamp.fromMillis(Date.now() - PORTAL_USERNAME_CHANGE_COOLDOWN_MS - 1000);
    const history = [{ username: "old-user", changedAt: old }];
    assert.doesNotThrow(() => assertPortalUsernameChangeAllowed(old, "portal", history));
  });

  it("appends username history and caps at 10 entries", () => {
    const changedAt = Timestamp.fromMillis(1_700_000_000_000);
    const existing = Array.from({ length: 10 }, (_, index) => ({
      username: `user-${index}`,
      changedAt,
    }));

    const next = appendUsernameHistory(existing, "old-user", changedAt);
    assert.equal(next.length, 10);
    assert.equal(next[0]?.username, "user-1");
    assert.equal(next[9]?.username, "old-user");
  });

  it("formats cooldown message with next eligible date", () => {
    const message = formatPortalUsernameCooldownMessage(new Date("2026-09-26T00:00:00.000Z"));
    assert.match(message, /September 26, 2026/);
  });
});
