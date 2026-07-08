import type { Design, UpdateDesignInput } from "../types/design.types";
import type { DesignFormValues } from "../types/designForm.types";
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

export function mapDesignToFormValues(design: Design): DesignFormValues {
  return {
    title: design.title,
    description: design.description ?? "",
    categoryId: design.categoryId ?? "",
    tagsInput: formatTagsInput(design.tags),
  };
}

export function buildEditDesignUpdateInput(formValues: DesignFormValues): UpdateDesignInput {
  return {
    title: formValues.title,
    description: formValues.description,
    categoryId: formValues.categoryId,
    tags: parseTagsInput(formValues.tagsInput),
  };
}
