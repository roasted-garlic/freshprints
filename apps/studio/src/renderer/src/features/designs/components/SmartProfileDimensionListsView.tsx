import { SMART_PROFILE_EDITABLE_DIMENSION_KEYS } from "@fresh-prints/shared/constants/smartProfile.constants";
import type { DesignSmartProfile } from "@fresh-prints/shared/types/catalog/smartProfile.types";
import {
  formatSmartProfileDimensionList,
  SMART_PROFILE_DIMENSION_LABELS,
} from "../utils/smartProfileDimensionLists";

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
