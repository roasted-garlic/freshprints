import {
  ASSISTED_CREATION_COMPOSITION_OPTIONS,
  ASSISTED_CREATION_CONTAINS_TEXT_OPTIONS,
  ASSISTED_CREATION_EXACT_REQUIREMENT_OPTIONS,
  ASSISTED_CREATION_FLEXIBILITY_OPTIONS,
  ASSISTED_CREATION_PERSONALIZATION_OPTIONS,
  ASSISTED_CREATION_REQUEST_TYPE_OPTIONS,
  ASSISTED_CREATION_STYLE_OPTIONS,
  type AssistedCreationComposition,
  type AssistedCreationContainsText,
  type AssistedCreationExactRequirement,
  type AssistedCreationFlexibilityLevel,
  type AssistedCreationPersonalizationType,
  type AssistedCreationRequestType,
  type AssistedCreationStylePreference,
} from "@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants";

function labelFromOptions<T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
  value: T | string,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function labelForRequestType(value: string): string {
  return labelFromOptions(ASSISTED_CREATION_REQUEST_TYPE_OPTIONS, value as AssistedCreationRequestType);
}

export function labelForContainsText(value: string): string {
  return labelFromOptions(ASSISTED_CREATION_CONTAINS_TEXT_OPTIONS, value as AssistedCreationContainsText);
}

export function labelForFlexibility(value: string): string {
  return labelFromOptions(ASSISTED_CREATION_FLEXIBILITY_OPTIONS, value as AssistedCreationFlexibilityLevel);
}

export function labelForComposition(value: string): string {
  return labelFromOptions(ASSISTED_CREATION_COMPOSITION_OPTIONS, value as AssistedCreationComposition);
}

export function labelForExactRequirement(value: string): string {
  return labelFromOptions(
    ASSISTED_CREATION_EXACT_REQUIREMENT_OPTIONS,
    value as AssistedCreationExactRequirement,
  );
}

export function labelForStyle(value: string): string {
  return labelFromOptions(ASSISTED_CREATION_STYLE_OPTIONS, value as AssistedCreationStylePreference);
}

export function labelForPersonalization(value: string): string {
  return labelFromOptions(
    ASSISTED_CREATION_PERSONALIZATION_OPTIONS,
    value as AssistedCreationPersonalizationType,
  );
}

export function joinLabeledValues(
  values: string[] | undefined,
  labelFn: (value: string) => string,
): string {
  if (!values?.length) {
    return "";
  }
  return values.map(labelFn).join(", ");
}
