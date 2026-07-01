import assert from "node:assert/strict";
import test from "node:test";

import type { CatalogTag } from "../types/catalogTag.types";
import {
  assertCatalogTagAvailable,
  getCatalogTagDocumentId,
  normalizeCatalogTagInput,
  resolveCatalogTagCandidate,
} from "./catalogTagNormalizer";

function createTag(input: Partial<CatalogTag> & Pick<CatalogTag, "id" | "name">): CatalogTag {
  return {
    aliases: [],
    createdAt: {},
    createdBy: "owner",
    preferredWhen: "Use when relevant.",
    status: "approved",
    updatedAt: {},
    updatedBy: "owner",
    ...input,
  };
}

test("normalizeCatalogTagInput lowercases, trims, dedupes aliases, and removes alias matching name", () => {
  assert.deepEqual(
    normalizeCatalogTagInput({
      name: " Skeleton ",
      aliases: [" Bones ", "bones", "skeleton"],
      preferredWhen: " Use for bones. ",
    }),
    {
      name: "skeleton",
      aliases: ["bones"],
      preferredWhen: "Use for bones.",
    },
  );
});

test("getCatalogTagDocumentId creates stable slug ids", () => {
  assert.equal(getCatalogTagDocumentId("  Mama Bear! "), "mama-bear");
});

test("assertCatalogTagAvailable blocks alias collision against existing tag names", () => {
  assert.throws(
    () =>
      assertCatalogTagAvailable(
        normalizeCatalogTagInput({
          name: "bones",
          aliases: ["ribcage"],
          preferredWhen: "Use for bones.",
        }),
        [createTag({ id: "skeleton", name: "skeleton", aliases: ["bones"] })],
      ),
    /already uses "bones"/,
  );
});

test("assertCatalogTagAvailable includes archived tags in collision checks", () => {
  assert.throws(
    () =>
      assertCatalogTagAvailable(
        normalizeCatalogTagInput({
          name: "retro",
          aliases: [],
          preferredWhen: "Use for retro designs.",
        }),
        [createTag({ id: "retro", name: "retro", status: "archived" })],
      ),
    /already uses "retro"/,
  );
});

test("resolveCatalogTagCandidate maps aliases to canonical approved names", () => {
  assert.equal(
    resolveCatalogTagCandidate("Bones", [
      createTag({ id: "skeleton", name: "skeleton", aliases: ["bones"] }),
    ]),
    "skeleton",
  );
});

test("resolveCatalogTagCandidate ignores archived tags", () => {
  assert.equal(
    resolveCatalogTagCandidate("bones", [
      createTag({ id: "skeleton", name: "skeleton", aliases: ["bones"], status: "archived" }),
    ]),
    null,
  );
});
