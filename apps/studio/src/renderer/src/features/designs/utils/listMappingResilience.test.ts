import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Documents the list-mapping resilience pattern used by Studio design / show / allocation loaders:
 * incomplete docs are skipped (with a warn) instead of failing the entire list.
 */
function mapListWithSkip<T>(
  docs: Array<{ id: string; map: () => T }>,
  onSkip: (id: string, message: string) => void,
): T[] {
  return docs.flatMap((entry) => {
    try {
      return [entry.map()];
    } catch (error) {
      onSkip(entry.id, error instanceof Error ? error.message : String(error));
      return [];
    }
  });
}

describe("studio list mapping resilience", () => {
  it("keeps valid entries when one document throws", () => {
    const skipped: string[] = [];
    const result = mapListWithSkip(
      [
        { id: "ok-1", map: () => ({ id: "ok-1" }) },
        {
          id: "bad-1",
          map: () => {
            throw new Error("incomplete");
          },
        },
        { id: "ok-2", map: () => ({ id: "ok-2" }) },
      ],
      (id) => {
        skipped.push(id);
      },
    );

    assert.deepEqual(
      result.map((entry) => entry.id),
      ["ok-1", "ok-2"],
    );
    assert.deepEqual(skipped, ["bad-1"]);
  });
});
