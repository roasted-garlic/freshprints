import assert from "node:assert/strict";
import test from "node:test";

import { entryToFilterableDesign, type ReadyIndexEntry } from "./generatedReadyDesignMapping";
import { sortDesignLibraryResults } from "./sortDesignLibraryResults";

test("healthy generated Design Library records sort and render-bound mapping does not crash", () => {
  const entries: ReadyIndexEntry[] = [
    {
      id: "design-a",
      title: "Older",
      tags: [],
      createdAtMs: 100,
    },
    {
      id: "design-z",
      title: "Newer",
      tags: [],
      createdAtMs: 200,
    },
  ];
  const filterableDesigns = entries.map(entryToFilterableDesign);

  const sorted = sortDesignLibraryResults({
    designs: filterableDesigns,
    generatedEntries: entries,
    useGeneratedOrdering: true,
  });

  assert.deepEqual(
    sorted.map((design) => design.id),
    ["design-z", "design-a"],
  );
});
