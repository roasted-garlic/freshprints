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
    assert.match(debounceFunctionBlock, /markDirtyAndClaimDebounceWaiter\(\s*\n?\s*kind,\s*\n?\s*DEBOUNCE_MS \+ PUBLISH_ATTEMPT_MARGIN_MS,?\s*\n?\s*\);/);
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

/**
 * Regression coverage for the ready-boundary publisher stall
 * (post-launch-catalog-and-processing-stability, Owner QA Amendment 1).
 *
 * Live fresh-prints-dev logs showed 18 consecutive "joined-existing-debounce-window" scheduling
 * events with zero "claimed-debounce-waiter" and zero "catalog-snapshot-publication" events in
 * the same window — consistent with a debounce claim left stuck by a waiter invocation that was
 * killed by its own Cloud Functions timeout mid-publish, skipping the `finally` release block
 * entirely. Root cause: the claim's expiry (DEBOUNCE_MS + LEASE_MS ≈ 10m15s) vastly outlived the
 * trigger functions' default 60-second timeout, so a genuinely slow publish (a full collection
 * scan + many Storage writes, easily exceeding the ~45s remaining after the 15s sleep) reliably
 * got killed before it could release its claim, silently absorbing every subsequent design write
 * — including every owner approval — into a dead claim for up to ~10 minutes at a time.
 */
describe("ready-boundary publisher stall fix (Owner QA Amendment 1)", () => {
  it("the debounce claim duration no longer depends on LEASE_MS — it uses a small, dedicated publish-attempt margin", () => {
    const source = read("functions/src/catalogSnapshots/publishCatalogSnapshots.ts");

    assert.match(source, /const PUBLISH_ATTEMPT_MARGIN_MS = 90_000;/);
    assert.match(source, /DEBOUNCE_MS \+ PUBLISH_ATTEMPT_MARGIN_MS/);
    assert.doesNotMatch(source, /DEBOUNCE_MS \+ LEASE_MS/);
  });

  it("the claim's total liability window is far smaller than LEASE_MS, so a killed waiter self-heals in roughly two minutes, not ten", () => {
    const source = read("functions/src/catalogSnapshots/publishCatalogSnapshots.ts");
    const debounceMsMatch = source.match(/const DEBOUNCE_MS = (\d+)_?(\d*);/);
    const marginMatch = source.match(/const PUBLISH_ATTEMPT_MARGIN_MS = (\d+)_?(\d*);/);
    const leaseMsMatch = source.match(/const LEASE_MS = (\d+) \* (\d+)_?(\d*);/);
    assert.ok(debounceMsMatch && marginMatch && leaseMsMatch, "expected to find all three duration constants");

    const debounceMs = Number(`${debounceMsMatch![1]}${debounceMsMatch![2]}`);
    const marginMs = Number(`${marginMatch![1]}${marginMatch![2]}`);
    const leaseMs = Number(leaseMsMatch![1]) * Number(`${leaseMsMatch![2]}${leaseMsMatch![3]}`);

    const claimTotalMs = debounceMs + marginMs;
    assert.ok(
      claimTotalMs < leaseMs / 3,
      `expected the claim's total liability window (${claimTotalMs}ms) to be far smaller than ` +
        `LEASE_MS (${leaseMs}ms) — a stuck claim must self-heal in roughly two minutes, not ten`,
    );
  });

  it("all three trigger functions explicitly set a timeoutSeconds comfortably covering the sleep-plus-publish window, not the 60s platform default", () => {
    const source = read("functions/src/catalogSnapshots/publishCatalogSnapshots.ts");

    for (const triggerName of [
      "onCategorySnapshotSourceWritten",
      "onTagSnapshotSourceWritten",
      "onPortalCatalogSnapshotSourceWritten",
    ]) {
      const declarationIndex = source.indexOf(`export const ${triggerName} = onDocumentWritten(`);
      assert.ok(declarationIndex > -1, `expected to find the ${triggerName} declaration`);
      const declarationBlock = source.slice(declarationIndex, declarationIndex + 200);
      assert.match(
        declarationBlock,
        /timeoutSeconds: 300/,
        `expected ${triggerName} to explicitly set timeoutSeconds: 300`,
      );
      // Confirms the options-object call form (document path moved inside { document: ... }),
      // not the old 2-argument (bare path string, handler) form that has no way to set a timeout.
      assert.match(declarationBlock, /\{ document: "[^"]+", timeoutSeconds: 300 \}/);
    }
  });

  it("300s comfortably exceeds DEBOUNCE_MS + PUBLISH_ATTEMPT_MARGIN_MS with margin, so the claim expires and a fresh waiter can retry before the function's own timeout would recur", () => {
    const source = read("functions/src/catalogSnapshots/publishCatalogSnapshots.ts");
    const debounceMsMatch = source.match(/const DEBOUNCE_MS = (\d+)_?(\d*);/);
    const marginMatch = source.match(/const PUBLISH_ATTEMPT_MARGIN_MS = (\d+)_?(\d*);/);
    assert.ok(debounceMsMatch && marginMatch);

    const debounceMs = Number(`${debounceMsMatch![1]}${debounceMsMatch![2]}`);
    const marginMs = Number(`${marginMatch![1]}${marginMatch![2]}`);
    const claimTotalSeconds = (debounceMs + marginMs) / 1000;

    assert.ok(
      300 > claimTotalSeconds,
      `expected the 300s function timeout to exceed the claim's own ${claimTotalSeconds}s total window`,
    );
  });
});
