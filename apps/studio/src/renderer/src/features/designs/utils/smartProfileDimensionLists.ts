import { SMART_PROFILE_EDITABLE_DIMENSION_KEYS } from "@fresh-prints/shared/constants/smartProfile.constants";
import { normalizeSmartProfileSubjectList } from "@fresh-prints/shared/utils/smartProfileNormalization";

export const SMART_PROFILE_DIMENSION_LABELS: Record<
  (typeof SMART_PROFILE_EDITABLE_DIMENSION_KEYS)[number],
  string
> = {
  subjects: "Subjects",
  objects: "Objects",
  styles: "Styles",
  themes: "Themes",
  interests: "Interests",
  professionsGroups: "Professions / Groups",
  occasions: "Occasions",
  places: "Places",
  colors: "Colors",
  visibleText: "Visible Text",
  searchConcepts: "Search Concepts",
};

export function formatSmartProfileDimensionList(
  key: (typeof SMART_PROFILE_EDITABLE_DIMENSION_KEYS)[number],
  values: string[] | undefined,
): string {
  const displayValues = key === "subjects" ? normalizeSmartProfileSubjectList(values) : values;
  if (!displayValues || displayValues.length === 0) {
    return "—";
  }

  if (key === "visibleText") {
    return displayValues.join(" ");
  }

  return displayValues.join(", ");
}
