import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  PORTAL_CLAIM_DURATION_MS,
  PORTAL_MIN_PUBLICATION_INTERVAL_MS,
  PORTAL_QUIET_MS,
  PUBLISH_ATTEMPT_MARGIN_MS,
} from "./portalPublicationRateGuard";
import { PORTAL_PUBLICATION_PASS_LIMIT } from "./publicationRecovery";

function read(relativePath: string): string {
  return readFileSync(relativePath, "utf8");
}

/**
 * Source-wiring assertions for Amendment 9 P4 (like coalescing tests).
 * Proves the publisher path uses approved constants and W2 export surface.
 */
describe("Amendment 9 P4 publication guard source wiring", () => {
  it("PORTAL_PUBLICATION_PASS_LIMIT = 1 is used for the portal automatic path", () => {
    assert.equal(PORTAL_PUBLICATION_PASS_LIMIT, 1);
    const source = read("functions/src/catalogSnapshots/publishCatalogSnapshots.ts");
    const portalPassBlock = source.slice(
      source.indexOf("async function runPortalAutomaticPublicationPass("),
      source.indexOf("export async function runPublicationCatchUpLoop("),
    );
    assert.match(portalPassBlock, /passLimit:\s*PORTAL_PUBLICATION_PASS_LIMIT/);
    assert.doesNotMatch(
      portalPassBlock,
      /passLimit:\s*PUBLICATION_PASS_LIMIT/,
      "automatic portal path must not use the catalog-reference pass limit of 3",
    );
  });

  it("nextEligiblePublishAt is written with publishedGeneration on successful portal publish", () => {
    const source = read("functions/src/catalogSnapshots/publishCatalogSnapshots.ts");
    const publishKindBlock = source.slice(
      source.indexOf("async function publishKind("),
      source.indexOf("async function markAndPublishAfterDebounce("),
    );
    assert.match(publishKindBlock, /publishedGeneration:\s*generation/);
    assert.match(publishKindBlock, /nextEligiblePublishAt:\s*Timestamp\.fromMillis\(/);
    assert.match(
      publishKindBlock,
      /publishedAtMs \+ PORTAL_MIN_PUBLICATION_INTERVAL_MS/,
    );
  });

  it("bypassMinInterval is used on rebuild and retry drain paths", () => {
    const source = read("functions/src/catalogSnapshots/publishCatalogSnapshots.ts");
    assert.match(
      source,
      /publishKind\("portal-catalog",\s*\{\s*bypassMinInterval:\s*true\s*\}\)/,
    );
    const rebuildBlock = source.slice(
      source.indexOf("export const rebuildCatalogSnapshots"),
      source.indexOf("export async function drainPortalCatalogPublicationCatchUp"),
    );
    assert.match(rebuildBlock, /bypassMinInterval:\s*true/);
    const drainBlock = source.slice(
      source.indexOf("export async function drainPortalCatalogPublicationCatchUp"),
      source.indexOf("export const retryPortalCatalogPublication"),
    );
    assert.match(drainBlock, /bypassMinInterval:\s*true/);
  });

  it("onPortalCatalogPublicationStateWritten is exported from functions index", () => {
    const indexSource = read("functions/src/index.ts");
    assert.match(
      indexSource,
      /onPortalCatalogPublicationStateWritten/,
    );
    const source = read("functions/src/catalogSnapshots/publishCatalogSnapshots.ts");
    assert.match(
      source,
      /export const onPortalCatalogPublicationStateWritten = onDocumentWritten/,
    );
  });

  it("portal automatic path uses PORTAL_CLAIM_DURATION_MS", () => {
    assert.equal(
      PORTAL_CLAIM_DURATION_MS,
      PORTAL_QUIET_MS + PORTAL_MIN_PUBLICATION_INTERVAL_MS + PUBLISH_ATTEMPT_MARGIN_MS,
    );
    const source = read("functions/src/catalogSnapshots/publishCatalogSnapshots.ts");
    const debounceBlock = source.slice(
      source.indexOf("async function markAndPublishAfterDebounce("),
      source.indexOf("async function requestPortalDeferredWake("),
    );
    assert.match(debounceBlock, /PORTAL_CLAIM_DURATION_MS/);
    assert.match(debounceBlock, /claimDurationMs/);
    assert.match(
      source,
      /claimPortalDebounceWaiterOnly\(\s*\n?\s*PORTAL_CLAIM_DURATION_MS,?\s*\n?\s*\)/,
    );
  });

  it("catalog-reference still uses DEBOUNCE_MS + PUBLISH_ATTEMPT_MARGIN_MS", () => {
    const source = read("functions/src/catalogSnapshots/publishCatalogSnapshots.ts");
    const debounceBlock = source.slice(
      source.indexOf("async function markAndPublishAfterDebounce("),
      source.indexOf("async function requestPortalDeferredWake("),
    );
    assert.match(debounceBlock, /DEBOUNCE_MS \+ PUBLISH_ATTEMPT_MARGIN_MS/);
    assert.match(source, /const DEBOUNCE_MS = 15_000;/);
  });

  it("isNonReadyIndexFilterChurn / classifier operational skip is wired on design trigger", () => {
    const source = read("functions/src/catalogSnapshots/publishCatalogSnapshots.ts");
    assert.match(source, /isNonReadyIndexFilterChurn\(before, after\)/);
    assert.match(source, /non-ready-index-filter-skipped/);
    const classifier = read("functions/src/catalogSnapshots/portalCatalogChangeClassifier.ts");
    assert.match(classifier, /export function isNonReadyIndexFilterChurn/);
    assert.match(
      classifier,
      /neither side ready → published set unchanged → skip full schedule/,
    );
  });

  it("deferred wake is requested only after debounce claim release", () => {
    const source = read("functions/src/catalogSnapshots/publishCatalogSnapshots.ts");
    const debounceBlock = source.slice(
      source.indexOf("async function markAndPublishAfterDebounce("),
      source.indexOf("async function requestPortalDeferredWake("),
    );
    const releaseIdx = debounceBlock.indexOf("releaseDebounceClaimIfOwned(kind, waiterOwner)");
    const wakeIdx = debounceBlock.indexOf('requestPortalDeferredWake("deferred-wake-requested")');
    assert.ok(releaseIdx > -1, "expected claim release in markAndPublishAfterDebounce");
    assert.ok(wakeIdx > -1, "expected deferred wake after portal pass");
    assert.ok(
      wakeIdx > releaseIdx,
      "requestPortalDeferredWake must run after releaseDebounceClaimIfOwned",
    );

    const portalPassBlock = source.slice(
      source.indexOf("async function runPortalAutomaticPublicationPass("),
      source.indexOf("export async function runPublicationCatchUpLoop("),
    );
    assert.doesNotMatch(
      portalPassBlock,
      /await requestPortalDeferredWake/,
      "runPortalAutomaticPublicationPass must not request W2 while caller may still hold claim",
    );
  });
});
