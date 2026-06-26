import { useMemo } from "react";

import type { EffectiveDpiQualityLevel } from "../../../../../../shared/types/printSize/printSize.enums";
import { PRINT_INCHES_DECIMAL_PLACES } from "../../../../../../shared/constants/printSize.constants";
import {
  getEffectiveDpiQualityLabel,
  getEffectiveDpiQualityMessage,
  getEffectiveDpiQualityClassName,
  resolveEffectiveDpiQualityLevel,
} from "../../../../../../shared/utils/effectiveDpiQuality";
import {
  applyStaffPrintHeightChange,
  applyStaffPrintWidthChange,
  computeStaffEffectiveDpi,
  type StaffPrintSizeInput,
} from "../../../../../../shared/utils/staffPrintSizeEdit";
import { Checkbox } from "../../../shared/components/Checkbox";
import { PrintDimensionInput } from "../../../shared/components/PrintDimensionInput";
import { TextInput } from "../../../shared/components/TextInput";
import type { DesignFormValues } from "../types/designForm.types";

interface DesignPrintSettingsFieldsProps {
  formValues: Pick<
    DesignFormValues,
    | "pixelWidth"
    | "pixelHeight"
    | "printWidthInches"
    | "printHeightInches"
    | "printAspectRatioLocked"
  >;
  onChange: (updates: Partial<DesignFormValues>) => void;
}

const PRINT_DIMENSION_STEP_INCHES = 0.25;

function parsePixelDimension(value: string): number | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number(trimmedValue);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function parsePrintInches(value: string): number | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number(trimmedValue);

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return parsedValue;
}

function formatPrintInches(value: number): string {
  return value.toFixed(PRINT_INCHES_DECIMAL_PLACES);
}

type EffectiveDpiDisplayState =
  | { error: string }
  | {
      effectiveDpi: number;
      qualityLevel: EffectiveDpiQualityLevel;
      qualityLabel: string;
      qualityMessage: string;
    };

export function DesignPrintSettingsFields({
  formValues,
  onChange,
}: DesignPrintSettingsFieldsProps) {
  const pixelWidth = parsePixelDimension(formValues.pixelWidth);
  const pixelHeight = parsePixelDimension(formValues.pixelHeight);
  const hasPixelDimensions = pixelWidth !== null && pixelHeight !== null;

  const staffPrintSizeInput = useMemo((): StaffPrintSizeInput | null => {
    if (!hasPixelDimensions) {
      return null;
    }

    const printWidthInches = parsePrintInches(formValues.printWidthInches);
    const printHeightInches = parsePrintInches(formValues.printHeightInches);

    if (printWidthInches === null || printHeightInches === null) {
      return null;
    }

    return {
      pixelWidth,
      pixelHeight,
      printWidthInches,
      printHeightInches,
      printAspectRatioLocked: formValues.printAspectRatioLocked,
    };
  }, [
    formValues.printAspectRatioLocked,
    formValues.printHeightInches,
    formValues.printWidthInches,
    hasPixelDimensions,
    pixelHeight,
    pixelWidth,
  ]);

  const effectiveDpiState = useMemo((): EffectiveDpiDisplayState | null => {
    if (!staffPrintSizeInput) {
      return null;
    }

    const effectiveDpi = computeStaffEffectiveDpi(staffPrintSizeInput);

    if (typeof effectiveDpi !== "number") {
      return { error: effectiveDpi.error };
    }

    const qualityLevel = resolveEffectiveDpiQualityLevel(effectiveDpi);

    return {
      effectiveDpi,
      qualityLevel,
      qualityLabel: getEffectiveDpiQualityLabel(qualityLevel),
      qualityMessage: getEffectiveDpiQualityMessage(qualityLevel),
    };
  }, [staffPrintSizeInput]);

  function commitPrintWidth(rawValue: string) {
    if (!hasPixelDimensions) {
      onChange({ printWidthInches: rawValue.trim() });
      return;
    }

    const parsedWidth = parsePrintInches(rawValue);

    if (parsedWidth === null || parsedWidth <= 0) {
      onChange({ printWidthInches: rawValue.trim() });
      return;
    }

    const currentHeight =
      parsePrintInches(formValues.printHeightInches) ?? pixelHeight / 300;
    const result = applyStaffPrintWidthChange(parsedWidth, {
      pixelWidth,
      pixelHeight,
      printWidthInches: parsedWidth,
      printHeightInches: currentHeight,
      printAspectRatioLocked: formValues.printAspectRatioLocked,
    });

    if ("error" in result) {
      onChange({ printWidthInches: rawValue.trim() });
      return;
    }

    onChange({
      printWidthInches: formatPrintInches(result.printWidthInches),
      printHeightInches: formatPrintInches(result.printHeightInches),
    });
  }

  function commitPrintHeight(rawValue: string) {
    if (!hasPixelDimensions) {
      onChange({ printHeightInches: rawValue.trim() });
      return;
    }

    const parsedHeight = parsePrintInches(rawValue);

    if (parsedHeight === null || parsedHeight <= 0) {
      onChange({ printHeightInches: rawValue.trim() });
      return;
    }

    const currentWidth =
      parsePrintInches(formValues.printWidthInches) ?? pixelWidth / 300;
    const result = applyStaffPrintHeightChange(parsedHeight, {
      pixelWidth,
      pixelHeight,
      printWidthInches: currentWidth,
      printHeightInches: parsedHeight,
      printAspectRatioLocked: formValues.printAspectRatioLocked,
    });

    if ("error" in result) {
      onChange({ printHeightInches: rawValue.trim() });
      return;
    }

    onChange({
      printWidthInches: formatPrintInches(result.printWidthInches),
      printHeightInches: formatPrintInches(result.printHeightInches),
    });
  }

  function adjustPrintWidth(direction: "decrease" | "increase") {
    if (!hasPixelDimensions) {
      return;
    }

    const currentWidth =
      parsePrintInches(formValues.printWidthInches) ?? pixelWidth / 300;
    const delta = direction === "increase" ? PRINT_DIMENSION_STEP_INCHES : -PRINT_DIMENSION_STEP_INCHES;
    const nextWidth = Math.max(PRINT_DIMENSION_STEP_INCHES, currentWidth + delta);

    commitPrintWidth(formatPrintInches(nextWidth));
  }

  function adjustPrintHeight(direction: "decrease" | "increase") {
    if (!hasPixelDimensions) {
      return;
    }

    const currentHeight =
      parsePrintInches(formValues.printHeightInches) ?? pixelHeight / 300;
    const delta = direction === "increase" ? PRINT_DIMENSION_STEP_INCHES : -PRINT_DIMENSION_STEP_INCHES;
    const nextHeight = Math.max(PRINT_DIMENSION_STEP_INCHES, currentHeight + delta);

    commitPrintHeight(formatPrintInches(nextHeight));
  }

  function handleAspectRatioLockedChange(checked: boolean) {
    if (!checked || !hasPixelDimensions) {
      onChange({ printAspectRatioLocked: checked });
      return;
    }

    const currentWidth =
      parsePrintInches(formValues.printWidthInches) ?? pixelWidth / 300;
    const currentHeight =
      parsePrintInches(formValues.printHeightInches) ?? pixelHeight / 300;
    const result = applyStaffPrintWidthChange(currentWidth, {
      pixelWidth,
      pixelHeight,
      printWidthInches: currentWidth,
      printHeightInches: currentHeight,
      printAspectRatioLocked: true,
    });

    if ("error" in result) {
      onChange({ printAspectRatioLocked: true });
      return;
    }

    onChange({
      printAspectRatioLocked: true,
      printWidthInches: formatPrintInches(result.printWidthInches),
      printHeightInches: formatPrintInches(result.printHeightInches),
    });
  }

  return (
    <section aria-labelledby="design-print-settings-title" className="design-form-print-settings">
      <h3 className="design-form-print-settings-title" id="design-print-settings-title">
        Print Settings
      </h3>

      {!hasPixelDimensions ? (
        <p className="design-form-hint">
          Source image dimensions are unavailable. Print size cannot be edited for this design.
        </p>
      ) : (
        <p className="design-form-source-image-note">
          Source image: {pixelWidth} × {pixelHeight} px (read-only)
        </p>
      )}

      <div className="design-form-grid design-form-grid-two">
        <PrintDimensionInput
          disabled={!hasPixelDimensions}
          label="Print Width (inches)"
          name="printWidthInches"
          onBlur={commitPrintWidth}
          onChange={(value) => onChange({ printWidthInches: value })}
          onStep={adjustPrintWidth}
          step={PRINT_DIMENSION_STEP_INCHES}
          value={formValues.printWidthInches}
        />
        <PrintDimensionInput
          disabled={!hasPixelDimensions}
          label="Print Height (inches)"
          name="printHeightInches"
          onBlur={commitPrintHeight}
          onChange={(value) => onChange({ printHeightInches: value })}
          onStep={adjustPrintHeight}
          step={PRINT_DIMENSION_STEP_INCHES}
          value={formValues.printHeightInches}
        />
      </div>

      <Checkbox
        checked={formValues.printAspectRatioLocked}
        disabled={!hasPixelDimensions}
        label="Aspect Ratio Locked"
        name="printAspectRatioLocked"
        onChange={(event) => handleAspectRatioLockedChange(event.target.checked)}
      />

      <div className="design-form-grid design-form-grid-two">
        <TextInput
          label="Effective DPI"
          name="effectiveDpi"
          readOnly
          type="text"
          value={
            effectiveDpiState && "effectiveDpi" in effectiveDpiState
              ? String(effectiveDpiState.effectiveDpi)
              : ""
          }
        />
        <div className="design-print-quality-field">
          <p className="design-print-quality-label">DPI quality</p>
          {effectiveDpiState && "effectiveDpi" in effectiveDpiState ? (
            <p
              className={getEffectiveDpiQualityClassName(effectiveDpiState.qualityLevel)}
              role="status"
            >
              {effectiveDpiState.qualityLabel}
            </p>
          ) : (
            <p className="design-details-muted">—</p>
          )}
        </div>
      </div>

      {effectiveDpiState && "qualityMessage" in effectiveDpiState ? (
        <p
          className={
            effectiveDpiState.qualityLevel === "optimal"
              ? "auth-message auth-message-success"
              : "auth-message auth-message-warning"
          }
          role="status"
        >
          {effectiveDpiState.qualityMessage}
        </p>
      ) : null}

      {effectiveDpiState && "error" in effectiveDpiState ? (
        <p className="auth-message auth-message-warning" role="status">
          {effectiveDpiState.error}
        </p>
      ) : null}
    </section>
  );
}
