import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DesignSmartProfile } from "@fresh-prints/shared/types/catalog/smartProfile.types";

import { buildSmartProfileProvenanceFields } from "./smartProfileDisplay";

describe("buildSmartProfileProvenanceFields", () => {
  it("shows profile + normalizer versions and omits prompt version", () => {
    const profile = {
      provenance: {
        version: "smart-profile-v1",
        promptVersion: "catalog-enrich-v34",
        normalizerVersion: "smart-profile-normalizer-v6",
        provider: "google",
        model: "gemini-2.5-flash-lite",
      },
    } as DesignSmartProfile;

    const fields = buildSmartProfileProvenanceFields(profile);
    const labels = fields.map((field) => field.label);

    assert.equal(fields.find((f) => f.label === "Profile version")?.value, "smart-profile-v1");
    assert.equal(
      fields.find((f) => f.label === "Normalizer version")?.value,
      "smart-profile-normalizer-v6",
    );
    assert.equal(labels.includes("Prompt version"), false);
  });

  it("falls back to em dash when normalizer version is missing", () => {
    const profile = {
      provenance: {
        version: "smart-profile-v1",
      },
    } as DesignSmartProfile;

    const fields = buildSmartProfileProvenanceFields(profile);
    assert.equal(fields.find((f) => f.label === "Normalizer version")?.value, "—");
  });
});
