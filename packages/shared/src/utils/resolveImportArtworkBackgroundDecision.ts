import {
  ARTWORK_BACKGROUND_PRESET_GREY,
  ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK,
} from "../constants/design/artworkBackground.constants";
import type {
  ArtworkBackgroundSource,
  ImportArtworkBackgroundMode,
  ImportHalftoneMode,
} from "../types/design/artworkBackgroundSource.types";
import type { HalftoneStaffDecisionPersisted } from "../types/halftone/halftone.types";
/** Per-image quick picker on Imports (more specific than session Background). */
export type ImportItemBackgroundOverride = "auto" | "light" | "dark";
/** Per-image halftone toggle; `auto` follows session All halftones. */
export type ImportItemHalftoneOverride = "auto" | "on" | "off";
export interface ResolveImportArtworkBackgroundDecisionInput {
  backgroundMode: ImportArtworkBackgroundMode;
  halftoneMode: ImportHalftoneMode;
  /** From Electron/code detector — ignored when backgroundMode is not `auto` (after item override). */
  autoSuggestsDark: boolean;
  /** Per-image Light/Dark; `auto` (default) falls through session rules. */
  itemBackgroundOverride?: ImportItemBackgroundOverride;
  /** Per-image halftone; `auto` (default) follows session All halftones. */
  itemHalftoneOverride?: ImportItemHalftoneOverride;
}
export interface ResolveImportArtworkBackgroundDecisionResult {
  /** `null` = omit field (default light/grey display). */
  hex: string | null;
  /** `null` = no provenance write (default light path). */
  source: ArtworkBackgroundSource | null;
}
/**
 * Precedence for import `artworkBackgroundHex` / preview mat:
 * 1. Per-image explicit Light/Dark → `import_override`
 * 2. Session explicit All light / All dark → `import_override`
 * 3. All-halftone batch → dark → `import_halftone_default`
 * 4. Auto detector → dark → `code_auto`
 * 5. Default light (omit)
 *
 * Halftone marking is separate — never inferred from dark background alone.
 */
export function resolveImportArtworkBackgroundDecision(
  input: ResolveImportArtworkBackgroundDecisionInput,
): ResolveImportArtworkBackgroundDecisionResult {
  const itemOverride = input.itemBackgroundOverride ?? "auto";
  if (itemOverride === "dark") {
    return {
      hex: ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK,
      source: "import_override",
    };
  }
  if (itemOverride === "light") {
    return {
      hex: null,
      source: "import_override",
    };
  }
  if (input.backgroundMode === "all_dark") {
    return {
      hex: ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK,
      source: "import_override",
    };
  }
  if (input.backgroundMode === "all_light") {
    return {
      hex: null,
      source: "import_override",
    };
  }
  // backgroundMode === "auto"
  if (
    resolveImportItemHalftoneEffective({
      halftoneMode: input.halftoneMode,
      itemHalftoneOverride: input.itemHalftoneOverride,
    })
  ) {
    return {
      hex: ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK,
      source: "import_halftone_default",
    };
  }
  if (input.autoSuggestsDark) {
    return {
      hex: ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK,
      source: "code_auto",
    };
  }
  return { hex: null, source: null };
}
/** CSS hex for Imports preview mats (always concrete — grey when omit). */
export function resolveImportPreviewBackgroundCssHex(
  input: ResolveImportArtworkBackgroundDecisionInput,
): string {
  const decision = resolveImportArtworkBackgroundDecision(input);
  return decision.hex ?? ARTWORK_BACKGROUND_PRESET_GREY;
}
/** Whether this import item is marked halftone (session + per-image override). */
export function resolveImportItemHalftoneEffective(input: {
  halftoneMode: ImportHalftoneMode;
  itemHalftoneOverride?: ImportItemHalftoneOverride;
}): boolean {
  const override = input.itemHalftoneOverride ?? "auto";
  if (override === "on") {
    return true;
  }
  if (override === "off") {
    return false;
  }
  return input.halftoneMode === "all_halftones";
}

/** Human label for Auto resolution chip: Light vs Dark (session + detector only). */
export function resolveImportAutoResolvedMatLabel(input: {
  backgroundMode: ImportArtworkBackgroundMode;
  halftoneMode: ImportHalftoneMode;
  autoSuggestsDark: boolean;
  itemHalftoneOverride?: ImportItemHalftoneOverride;
}): "Light" | "Dark" {
  const css = resolveImportPreviewBackgroundCssHex({
    ...input,
    itemBackgroundOverride: "auto",
  });
  return css === ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK ? "Dark" : "Light";
}
export interface BuildImportDesignBackgroundAndHalftoneFieldsInput {
  backgroundMode: ImportArtworkBackgroundMode;
  halftoneMode: ImportHalftoneMode;
  autoSuggestsDark: boolean;
  itemBackgroundOverride?: ImportItemBackgroundOverride;
  itemHalftoneOverride?: ImportItemHalftoneOverride;
  callerId: string;
}
export interface ImportDesignBackgroundAndHalftoneFields {
  artworkBackgroundHex?: string;
  artworkBackgroundSource?: ArtworkBackgroundSource;
  halftoneStaffDecision?: HalftoneStaffDecisionPersisted;
  halftoneDecisionSource?: "import_batch";
}
/** Fields to merge into `createDesign` for an import session. */
export function buildImportDesignBackgroundAndHalftoneFields(
  input: BuildImportDesignBackgroundAndHalftoneFieldsInput,
): ImportDesignBackgroundAndHalftoneFields {
  const decision = resolveImportArtworkBackgroundDecision({
    backgroundMode: input.backgroundMode,
    halftoneMode: input.halftoneMode,
    autoSuggestsDark: input.autoSuggestsDark,
    itemBackgroundOverride: input.itemBackgroundOverride,
    itemHalftoneOverride: input.itemHalftoneOverride,
  });
  const fields: ImportDesignBackgroundAndHalftoneFields = {};
  if (decision.hex) {
    fields.artworkBackgroundHex = decision.hex;
  }
  if (decision.source) {
    fields.artworkBackgroundSource = decision.source;
  }
  if (
    resolveImportItemHalftoneEffective({
      halftoneMode: input.halftoneMode,
      itemHalftoneOverride: input.itemHalftoneOverride,
    })
  ) {
    fields.halftoneStaffDecision = {
      value: true,
      decidedBy: input.callerId,
      isExplicitOverride: true,
    };
    fields.halftoneDecisionSource = "import_batch";
  }
  return fields;
}

