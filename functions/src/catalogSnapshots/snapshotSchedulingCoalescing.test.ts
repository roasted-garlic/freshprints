import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { Timestamp } from "firebase-admin/firestore";

import { shouldBecomeDebounceWaiter } from "./publishCatalogSnapshots";

function read(relativePath: string): string {
  return readFileSync(relativePath, "utf8");
}

/**
 * Regression coverage for snapshot scheduling coalescing
 * (post-launch-catalog-and-processing-stability, Workstream C).
 *
 * Cloud Functions gives no cross-invocation shared memory, so a plain
 * per-invocation setTimeout debounce meant every qualifying trigger
 * invocation in a burst independently slept and raced for the publish
 * lease. shouldBecomeDebounceWaiter is the pure decision at the heart of
 * the fix: exactly one invocation per debounce window claims the waiter
 * role (persisted via a Firestore transaction, not in-memory); every other
 * invocation in the same window marks dirty and returns immediately.
 */
describe("shouldBecomeDebounceWaiter", () => {
  it("claims the waiter role when no debounce claim exists yet", () => {
    assert.equal(shouldBecomeDebounceWaiter({}, Date.now()), true);
  });

  it("joins an existing unexpired claim instead of becoming a second waiter", () => {
    const now = Date.now();
    const data = {
      debounceOwner: "owner-a",
      debounceExpiresAt: Timestamp.fromMillis(now + 10_000),
    };
    assert.equal(shouldBecomeDebounceWaiter(data, now), false);
  });

  it("reclaims the waiter role once the prior claim has expired", () => {
    const now = Date.now();
    const data = {
      debounceOwner: "owner-a",
      debounceExpiresAt: Timestamp.fromMillis(now - 1),
    };
    assert.equal(shouldBecomeDebounceWaiter(data, now), true);
  });

  it("claims the role when an owner string exists but the expiry field is missing/malformed", () => {
    // Defensive: a malformed or legacy document (e.g. missing
    // debounceExpiresAt) must not silently and permanently block every
    // future publish by always reporting "joined".
    assert.equal(
      shouldBecomeDebounceWaiter({ debounceOwner: "owner-a" }, Date.now()),
      true,
    );
  });

  it("claims the role when the expiry is set but the owner is empty", () => {
    const now = Date.now();
    assert.equal(
      shouldBecomeDebounceWaiter(
        { debounceOwner: "", debounceExpiresAt: Timestamp.fromMillis(now + 10_000) },
        now,
      ),
      true,
    );
  });

  // Implementation-review finding, fixed in the same pass: the claim must
  // outlive the sleep-then-publish window, not just the sleep. If the
  // claim expired the moment the 15s debounce sleep ended, a second
  // invocation arriving while the first waiter's runPublicationCatchUpLoop
  // was still in flight (which can legitimately take much longer than 15s
  // under lease contention/retries) would become a second waiter — safe,
  // since the lease still blocks a concurrent scan, but it defeats the
  // point of coalescing.
  it("still holds the claim after the debounce sleep window elapses, while a publish could still be in flight", () => {
    const claimedAt = Date.now();
    const debounceMs = 15_000;
    const data = {
      debounceOwner: "waiter-a",
      debounceExpiresAt: Timestamp.fromMillis(claimedAt + debounceMs + 10 * 60_000),
    };
    const nowAfterSleep = claimedAt + debounceMs + 1;
    assert.equal(
      shouldBecomeDebounceWaiter(data, nowAfterSleep),
      false,
      "a claim scoped to only the debounce sleep would incorrectly let a second invocation " +
        "become a waiter the instant the sleep ends, even though the first waiter's publish " +
        "attempt is very likely still running",
    );
  });
});

describe("markAndPublishAfterDebounce wiring", () => {
  it("every design/category/tag trigger routes through the coalescing claim, not a bare per-invocation setTimeout", () => {
    const source = read("functions/src/catalogSnapshots/publishCatalogSnapshots.ts");

    // The old shape called markDirty(kind) directly followed by an
    // unconditional setTimeout for every invocation. The fixed shape must
    // route every scheduling call through markAndPublishAfterDebounce with
    // an explicit schedulingReason, so attribution logs can distinguish
    // why a rebuild was scheduled.
    assert.match(
      source,
      /await markAndPublishAfterDebounce\("catalog-reference", "category-write"\);/,
    );
    assert.match(
      source,
      /await markAndPublishAfterDebounce\("catalog-reference", "tag-write"\);/,
    );
    assert.match(
      source,
      /await markAndPublishAfterDebounce\("portal-catalog", "design-write"\);/,
    );

    const debounceFunctionBlock = source.slice(
      source.indexOf("async function markAndPublishAfterDebounce("),
      source.indexOf("export const rebuildCatalogSnapshots"),
    );
    assert.match(debounceFunctionBlock, /markDirtyAndClaimDebounceWaiter\(\s*\n?\s*kind,\s*\n?\s*DEBOUNCE_MS \+ LEASE_MS,?\s*\n?\s*\);/);
    assert.match(debounceFunctionBlock, /if \(!isWaiter\) \{\s*return;\s*\}/);
    assert.match(debounceFunctionBlock, /releaseDebounceClaimIfOwned\(kind, waiterOwner\)/);
  });

  it("attribution logs cover scheduling, publication start/completion, and lease contention without document contents", () => {
    const source = read("functions/src/catalogSnapshots/publishCatalogSnapshots.ts");

    assert.match(source, /logger\.info\("catalog-snapshot-scheduling"/);
    assert.match(source, /logger\.info\("catalog-snapshot-publication"/);
    assert.match(source, /logger\.warn\("catalog-snapshot-publication"/);

    // Approximate source document counts are logged via the existing
    // accounting object (readyDesignsRead/categoriesRead/tagsRead) — never
    // document field values, artwork metadata, or customer data.
    assert.match(source, /readyDesignsRead: published\.accounting\.readyDesignsRead/);
    assert.doesNotMatch(source, /logger\.(info|warn|error)\("catalog-snapshot-(scheduling|publication)"[^)]*title/);
  });

  it("the existing transactional publish lease remains the sole concurrency boundary — the new claim does not gate publishKind itself", () => {
    const source = read("functions/src/catalogSnapshots/publishCatalogSnapshots.ts");
    const publishKindBlock = source.slice(
      source.indexOf("async function publishKind("),
      source.indexOf("async function markAndPublishAfterDebounce("),
    );

    assert.match(publishKindBlock, /snapshot-publication-lease-active/);
    assert.doesNotMatch(publishKindBlock, /debounceOwner|debounceExpiresAt/);
  });
});
