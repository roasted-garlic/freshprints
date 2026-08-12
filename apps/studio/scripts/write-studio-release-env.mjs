#!/usr/bin/env node
/**
 * Writes apps/studio/.env.local for Studio release packaging.
 * Shared by Windows and macOS CI jobs so stable fail-closed gates stay in parity.
 *
 * Never prints secret values. Exit non-zero on incomplete/incorrect stable config.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const studioRoot = path.join(__dirname, "..");
const outPath = path.join(studioRoot, ".env.local");

const releaseType = process.env.RELEASE_TYPE || "";
const isStable = releaseType === "stable";

function required(name) {
  const value = process.env[name];
  if (value == null || String(value).trim() === "") {
    return null;
  }
  return String(value);
}

const firebasePrefix = isStable ? "PROD_FIREBASE_" : "DEV_FIREBASE_";
const algoliaPrefix = isStable ? "PROD_ALGOLIA_" : "DEV_ALGOLIA_";

const apiKey = required(`${firebasePrefix}API_KEY`);
const authDomain = required(`${firebasePrefix}AUTH_DOMAIN`);
const projectId = required(`${firebasePrefix}PROJECT_ID`);
const storageBucket = required(`${firebasePrefix}STORAGE_BUCKET`);
const senderId = required(`${firebasePrefix}MESSAGING_SENDER_ID`);
const appId = required(`${firebasePrefix}APP_ID`);

const firebaseValues = [apiKey, authDomain, projectId, storageBucket, senderId, appId];
if (firebaseValues.some((v) => v == null)) {
  console.error(
    `Missing one or more ${firebasePrefix}* repository secrets. Refusing to build Studio with an incomplete or empty Firebase configuration.`,
  );
  process.exit(1);
}

if (isStable && projectId !== "fresh-prints-prod") {
  console.error(`Stable Studio releases must target Firebase project fresh-prints-prod. Got: ${projectId}`);
  process.exit(1);
}

if (isStable && projectId === "fresh-prints-dev") {
  console.error("Stable Studio packages must not use Firebase project fresh-prints-dev.");
  process.exit(1);
}

const lines = [
  `VITE_FIREBASE_API_KEY=${apiKey}`,
  `VITE_FIREBASE_AUTH_DOMAIN=${authDomain}`,
  `VITE_FIREBASE_PROJECT_ID=${projectId}`,
  `VITE_FIREBASE_STORAGE_BUCKET=${storageBucket}`,
  `VITE_FIREBASE_MESSAGING_SENDER_ID=${senderId}`,
  `VITE_FIREBASE_APP_ID=${appId}`,
];

const algoliaAppId = required(`${algoliaPrefix}APP_ID`);
const algoliaSearchKey = required(`${algoliaPrefix}SEARCH_API_KEY`);
const algoliaIndexName = required(`${algoliaPrefix}INDEX_NAME`);
const algoliaValues = [algoliaAppId, algoliaSearchKey, algoliaIndexName];
const algoliaMissing = algoliaValues.some((v) => v == null);

if (isStable && algoliaMissing) {
  console.error(
    `Missing one or more ${algoliaPrefix}* repository secrets (search-only). Refusing to build a stable Studio package without production Algolia search configuration.`,
  );
  process.exit(1);
}

if (!algoliaMissing) {
  if (isStable) {
    if (algoliaAppId !== "Z1FVCM5QUX") {
      console.error("Stable Studio Algolia app id must be Z1FVCM5QUX. Got a non-matching value (not printed).");
      process.exit(1);
    }
    if (algoliaIndexName !== "portal_catalog_ready_prod") {
      console.error(`Stable Studio Algolia index must be portal_catalog_ready_prod. Got: ${algoliaIndexName}`);
      process.exit(1);
    }
  }
  if (
    (String(algoliaIndexName).endsWith("_dev") || algoliaIndexName === "portal_catalog_ready_dev") &&
    isStable
  ) {
    console.error(`Stable Studio packages must not use a DEV Algolia index (${algoliaIndexName}).`);
    process.exit(1);
  }

  lines.push(
    "VITE_USE_ALGOLIA_CATALOG_SEARCH=true",
    `VITE_ALGOLIA_APP_ID=${algoliaAppId}`,
    `VITE_ALGOLIA_SEARCH_API_KEY=${algoliaSearchKey}`,
    `VITE_ALGOLIA_INDEX_NAME=${algoliaIndexName}`,
  );
  console.log(
    `Studio Algolia search-only environment configured for index: ${algoliaIndexName} (app id present; key not printed)`,
  );
} else if (!isStable) {
  console.log(
    "No DEV Algolia secrets configured; prerelease Studio will fail closed for managed catalog search (expected unless DEV_ALGOLIA_* secrets are set).",
  );
}

writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Studio Firebase environment configured for project: ${projectId}`);
