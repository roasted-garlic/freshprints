import type { DesignSmartProfile } from "@fresh-prints/shared/types/catalog/smartProfile.types";
import { SMART_PROFILE_EDITABLE_DIMENSION_KEYS } from "@fresh-prints/shared/constants/smartProfile.constants";

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
  if (!values || values.length === 0) {
    return "—";
  }

  if (key === "visibleText") {
    return values.join(" ");
  }

  return values.join(", ");
}

interface SmartProfileDimensionListsViewProps {
  className?: string;
  gridClassName?: string;
  profile: DesignSmartProfile;
}

export function SmartProfileDimensionListsView({
  className = "ai-review-suggestions-grid",
  gridClassName = "ai-review-suggestions-field",
  profile,
}: SmartProfileDimensionListsViewProps) {
  return (
    <dl className={className}>
      {SMART_PROFILE_EDITABLE_DIMENSION_KEYS.map((key) => (
        <div className={gridClassName} key={key}>
          <dt>{SMART_PROFILE_DIMENSION_LABELS[key]}</dt>
          <dd>{formatSmartProfileDimensionList(key, profile[key])}</dd>
        </div>
      ))}
    </dl>
  );
}
