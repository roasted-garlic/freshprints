import type { SmartProfileEditableDimensionKey } from "@fresh-prints/shared/constants/smartProfile.constants";

/**
 * User-friendly labels for Smart Profile dimensions in import preset UI.
 * Maps from the actual dimension key to display label.
 */
export const SMART_PROFILE_DIMENSION_LABELS: Record<SmartProfileEditableDimensionKey, string> = {
  subjects: "Subject / Person",
  objects: "Objects",
  styles: "Styles",
  themes: "Themes",
  interests: "Interests",
  professionsGroups: "Professions & Groups",
  occasions: "Occasions",
  places: "Place / Location",
  colors: "Colors",
  visibleText: "Visible Text",
  searchConcepts: "Search Concepts",
};

/**
 * Ordered list of dimension keys for consistent UI display.
 * Most commonly used dimensions first.
 */
export const SMART_PROFILE_DIMENSION_DISPLAY_ORDER: readonly SmartProfileEditableDimensionKey[] = [
  "subjects",
  "themes", 
  "styles",
  "interests",
  "occasions",
  "places",
  "objects",
  "colors",
  "professionsGroups",
  "visibleText",
  "searchConcepts",
] as const;

/**
 * Helper to get user-friendly label for a dimension key.
 */
export function getSmartProfileDimensionLabel(key: SmartProfileEditableDimensionKey): string {
  return SMART_PROFILE_DIMENSION_LABELS[key];
}