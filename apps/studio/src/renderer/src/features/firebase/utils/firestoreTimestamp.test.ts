import assert from "node:assert/strict";
import { Timestamp } from "firebase/firestore";
import { describe, it } from "node:test";

import {
  mapFirestoreIsoString,
  mapFirestoreTimestamp,
  resolveDesignDocumentTimestamps,
} from "./firestoreTimestamp";

describe("firestoreTimestamp", () => {
  it("maps resolved Firestore timestamps", () => {
    const timestamp = Timestamp.fromMillis(1_700_000_000_000);
    assert.equal(mapFirestoreTimestamp(timestamp), timestamp);
    assert.equal(mapFirestoreTimestamp(null), undefined);
    assert.equal(mapFirestoreTimestamp({}), undefined);
  });

  it("falls back createdAt/updatedAt when one is pending", () => {
    const createdAt = Timestamp.fromMillis(1_700_000_000_000);
    const resolved = resolveDesignDocumentTimestamps({ createdAt, updatedAt: null });

    assert.ok(resolved);
    assert.equal(resolved.createdAt, createdAt);
    assert.equal(resolved.updatedAt, createdAt);
  });

  it("returns null when both timestamps are unresolved", () => {
    assert.equal(resolveDesignDocumentTimestamps({ createdAt: null, updatedAt: null }), null);
  });

  it("maps generatedAt from Timestamp or ISO string", () => {
    const timestamp = Timestamp.fromMillis(1_700_000_000_000);
    assert.equal(mapFirestoreIsoString("2026-01-01T00:00:00.000Z"), "2026-01-01T00:00:00.000Z");
    assert.equal(mapFirestoreIsoString(timestamp), timestamp.toDate().toISOString());
  });
});
