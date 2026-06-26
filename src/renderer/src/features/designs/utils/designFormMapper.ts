import { resolveDesignPrintSizeForDisplay } from "../../../../../../shared/utils/designPrintSizeState";
import { PRINT_INCHES_DECIMAL_PLACES } from "../../../../../../shared/constants/printSize.constants";
import { buildStaffPrintSizePersistenceFields } from "../../../../../../shared/utils/staffPrintSizeEdit";
import type { Design, UpdateDesignInput } from "../types/design.types";
import type { DesignFormValues } from "../types/designForm.types";
import { normalizeDesignTags, sanitizeDesignTagsForDisplay } from "../utils/designTagNormalizer";

function parseRequiredPositiveNumber(value: string, fieldLabel: string): number {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new Error(`${fieldLabel} is required.`);
  }

  const parsedValue = Number(trimmedValue);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error(`${fieldLabel} must be a positive number.`);
  }

  return parsedValue;
}

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
  const resolvedPrintSize = resolveDesignPrintSizeForDisplay(design);

  return {
    title: design.title,
    description: design.description ?? "",
    categoryId: design.categoryId ?? "",
    tagsInput: formatTagsInput(design.tags),
    status: design.status,
    originalPath: design.originalPath,
    thumbnailPath: design.thumbnailPath,
    previewPath: design.previewPath ?? "",
    pixelWidth: design.width !== undefined ? String(design.width) : "",
    pixelHeight: design.height !== undefined ? String(design.height) : "",
    printWidthInches:
      resolvedPrintSize !== null
        ? resolvedPrintSize.printWidthInches.toFixed(PRINT_INCHES_DECIMAL_PLACES)
        : "",
    printHeightInches:
      resolvedPrintSize !== null
        ? resolvedPrintSize.printHeightInches.toFixed(PRINT_INCHES_DECIMAL_PLACES)
        : "",
    printAspectRatioLocked: resolvedPrintSize?.printAspectRatioLocked ?? true,
  };
}

export function buildEditDesignUpdateInput(
  design: Design,
  formValues: DesignFormValues,
): UpdateDesignInput {
  const resolvedPrintSize = resolveDesignPrintSizeForDisplay(design);

  if (!resolvedPrintSize) {
    throw new Error("Print settings cannot be saved without pixel dimensions.");
  }

  const printSizeFields = buildStaffPrintSizePersistenceFields({
    pixelWidth: resolvedPrintSize.pixelWidth,
    pixelHeight: resolvedPrintSize.pixelHeight,
    printWidthInches: parseRequiredPositiveNumber(
      formValues.printWidthInches,
      "Print width",
    ),
    printHeightInches: parseRequiredPositiveNumber(
      formValues.printHeightInches,
      "Print height",
    ),
    printAspectRatioLocked: formValues.printAspectRatioLocked,
  });

  if ("error" in printSizeFields) {
    throw new Error(printSizeFields.error);
  }

  const input: UpdateDesignInput = {
    title: formValues.title,
    description: formValues.description,
    categoryId: formValues.categoryId,
    tags: parseTagsInput(formValues.tagsInput),
    ...printSizeFields,
  };

  return input;
}
