export {
  ARTWORK_PLACEMENT_UNSPECIFIED_LABEL,
  ARTWORK_PLACEMENT_VALUES,
  artworkPlacementLabel,
  parseArtworkPlacement,
} from "@fresh-prints/shared/constants/design/artworkPlacement.constants";
export type { ArtworkPlacement } from "@fresh-prints/shared/constants/design/artworkPlacement.constants";

import {
  ARTWORK_PLACEMENT_UNSPECIFIED_LABEL,
  ARTWORK_PLACEMENT_VALUES,
  artworkPlacementLabel,
} from "@fresh-prints/shared/constants/design/artworkPlacement.constants";

export interface ArtworkPlacementSelectOption {
  label: string;
  value: string;
}

/**
 * Studio `<Select>` options for the optional Placement field: a leading "Unspecified" entry
 * (empty string value, clears the field) followed by every allowlisted placement.
 */
export const ARTWORK_PLACEMENT_SELECT_OPTIONS: ArtworkPlacementSelectOption[] = [
  { label: ARTWORK_PLACEMENT_UNSPECIFIED_LABEL, value: "" },
  ...ARTWORK_PLACEMENT_VALUES.map((value) => ({ label: artworkPlacementLabel(value), value })),
];
