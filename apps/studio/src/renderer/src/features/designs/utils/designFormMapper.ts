import {
  ARTWORK_BACKGROUND_PRESET_GREY,
  ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK,
  ARTWORK_BACKGROUND_PRESET_WHITE,
  isDefaultArtworkBackgroundHex,
  normalizeArtworkBackgroundHex,
  resolveArtworkBackgroundHex,
} from "@fresh-prints/shared/constants/design/artworkBackground.constants";
import { parseArtworkPlacement } from "@fresh-prints/shared/constants/design/artworkPlacement.constants";

import type { Design, UpdateDesignInput } from "../types/design.types";
import type { ArtworkBackgroundPreset, DesignFormValues } from "../types/designForm.types";
import { normalizeDesignTags, sanitizeDesignTagsForDisplay } from "../utils/designTagNormalizer";

export function formatTagsInput(tags: string[]): string {
  return tags.join(", ");
}

function splitTagsInput(tagsInput: string): string[] {
  return tagsInput
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function tryParseTagsInput(tagsInput: string): string[] {
  return sanitizeDesignTagsForDisplay(splitTagsInput(tagsInput)).tags;
}

export function parseTagsInput(tagsInput: string): string[] {
  return normalizeDesignTags(splitTagsInput(tagsInput));
}

export function mapArtworkBackgroundToForm(design: Design): Pick<
  DesignFormValues,
  "artworkBackgroundPreset" | "artworkBackgroundCustomHex"
> {
  const stored = normalizeArtworkBackgroundHex(design.artworkBackgroundHex);
  if (!stored || stored === ARTWORK_BACKGROUND_PRESET_GREY) {
    return { artworkBackgroundPreset: "grey", artworkBackgroundCustomHex: "" };
  }
  if (stored === ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK) {
    return { artworkBackgroundPreset: "lightBlack", artworkBackgroundCustomHex: "" };
  }
  if (stored === ARTWORK_BACKGROUND_PRESET_WHITE) {
    return { artworkBackgroundPreset: "white", artworkBackgroundCustomHex: "" };
  }
  return { artworkBackgroundPreset: "custom", artworkBackgroundCustomHex: stored };
}

export function mapDesignToFormValues(design: Design): DesignFormValues {
  return {
    title: design.title,
    description: design.description ?? "",
    categoryId: design.categoryId ?? "",
    tagsInput: formatTagsInput(design.tags),
    censoredTermsInput: formatTagsInput(design.censoredTerms ?? []),
    artworkPlacement: design.artworkPlacement ?? "",
    isExplicitContent: design.isExplicitContent ?? false,
    ...mapArtworkBackgroundToForm(design),
  };
}

export function resolveFormArtworkBackgroundHex(formValues: DesignFormValues): string {
  if (formValues.artworkBackgroundPreset === "grey") {
    return ARTWORK_BACKGROUND_PRESET_GREY;
  }
  if (formValues.artworkBackgroundPreset === "lightBlack") {
    return ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK;
  }
  if (formValues.artworkBackgroundPreset === "white") {
    return ARTWORK_BACKGROUND_PRESET_WHITE;
  }
  return resolveArtworkBackgroundHex(formValues.artworkBackgroundCustomHex);
}

/**
 * Returns hex to persist, or `null` to clear the field (default grey).
 * Returns `undefined` when custom input is invalid (caller should show validation).
 */
export function buildArtworkBackgroundUpdateValue(
  formValues: Pick<DesignFormValues, "artworkBackgroundPreset" | "artworkBackgroundCustomHex">,
): string | null | undefined {
  if (formValues.artworkBackgroundPreset === "grey") {
    return null;
  }
  if (formValues.artworkBackgroundPreset === "lightBlack") {
    return ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK;
  }
  if (formValues.artworkBackgroundPreset === "white") {
    return ARTWORK_BACKGROUND_PRESET_WHITE;
  }
  const normalized = normalizeArtworkBackgroundHex(formValues.artworkBackgroundCustomHex);
  if (!normalized) {
    return undefined;
  }
  if (isDefaultArtworkBackgroundHex(normalized)) {
    return null;
  }
  return normalized;
}

export function buildEditDesignUpdateInput(formValues: DesignFormValues): UpdateDesignInput | null {
  const artworkBackgroundHex = buildArtworkBackgroundUpdateValue(formValues);
  if (formValues.artworkBackgroundPreset === "custom" && artworkBackgroundHex === undefined) {
    return null;
  }

  return {
    title: formValues.title,
    description: formValues.description,
    categoryId: formValues.categoryId,
    tags: parseTagsInput(formValues.tagsInput),
    censoredTerms: parseTagsInput(formValues.censoredTermsInput ?? ""),
    artworkBackgroundHex: artworkBackgroundHex ?? null,
    artworkPlacement: parseArtworkPlacement(formValues.artworkPlacement ?? "") ?? null,
    isExplicitContent: formValues.isExplicitContent ?? false,
  };
}

export function inferArtworkBackgroundPreset(hex: string): ArtworkBackgroundPreset {
  const normalized = resolveArtworkBackgroundHex(hex);
  if (normalized === ARTWORK_BACKGROUND_PRESET_GREY) {
    return "grey";
  }
  if (normalized === ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK) {
    return "lightBlack";
  }
  if (normalized === ARTWORK_BACKGROUND_PRESET_WHITE) {
    return "white";
  }
  return "custom";
}
