import { useMemo, type ChangeEvent } from "react";

import type { EffectiveDpiQualityLevel } from "../../../../../../shared/types/printSize/printSize.enums";
import { PRINT_INCHES_DECIMAL_PLACES } from "../../../../../../shared/constants/printSize.constants";
import {
  getEffectiveDpiQualityLabel,
  getEffectiveDpiQualityMessage,
  resolveEffectiveDpiQualityLevel,
} from "../../../../../../shared/utils/effectiveDpiQuality";
import {
  applyStaffPrintHeightChange,
  applyStaffPrintWidthChange,
  computeStaffEffectiveDpi,
} from "../../../../../../shared/utils/staffPrintSizeEdit";
import { Checkbox } from "../../../shared/components/Checkbox";
import { TextInput } from "../../../shared/components/TextInput";
import type { DesignFormValues } from "../types/designForm.types";
import { getEffectiveDpiQualityClassName } from "../utils/designPrintSizeDisplay";

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

  const effectiveDpiState = useMemo((): EffectiveDpiDisplayState | null => {
    if (!hasPixelDimensions) {
      return null;
    }

    const printWidthInches = parsePrintInches(formValues.printWidthInches);
    const printHeightInches = parsePrintInches(formValues.printHeightInches);

    if (printWidthInches === null || printHeightInches === null) {
      return null;
    }

    const effectiveDpi = computeStaffEffectiveDpi({
      pixelWidth,
      pixelHeight,
      printWidthInches,
      printHeightInches,
      printAspectRatioLocked: formValues.printAspectRatioLocked,
    });

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
  }, [
    formValues.printAspectRatioLocked,
    formValues.printHeightInches,
    formValues.printWidthInches,
    hasPixelDimensions,
    pixelHeight,
    pixelWidth,
  ]);

  function handlePrintWidthChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value;

    if (!hasPixelDimensions) {
      onChange({ printWidthInches: nextValue });
      return;
    }

    const parsedWidth = parsePrintInches(nextValue);

    if (parsedWidth === null) {
      onChange({ printWidthInches: nextValue });
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
      onChange({ printWidthInches: nextValue });
      return;
    }

    onChange({
      printWidthInches: formatPrintInches(result.printWidthInches),
      printHeightInches: formatPrintInches(result.printHeightInches),
    });
  }

  function handlePrintHeightChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value;

    if (!hasPixelDimensions) {
      onChange({ printHeightInches: nextValue });
      return;
    }

    const parsedHeight = parsePrintInches(nextValue);

    if (parsedHeight === null) {
      onChange({ printHeightInches: nextValue });
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
      onChange({ printHeightInches: nextValue });
      return;
    }

    onChange({
      printWidthInches: formatPrintInches(result.printWidthInches),
      printHeightInches: formatPrintInches(result.printHeightInches),
    });
  }

  function handleAspectRatioLockedChange(event: ChangeEvent<HTMLInputElement>) {
    const locked = event.target.checked;

    if (!locked || !hasPixelDimensions) {
      onChange({ printAspectRatioLocked: locked });
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
          Pixel dimensions are unavailable. Print size cannot be edited for this design.
        </p>
      ) : null}

      <div className="design-form-grid design-form-grid-two">
        <TextInput
          label="Pixel Width"
          name="pixelWidth"
          readOnly
          type="number"
          value={formValues.pixelWidth}
        />
        <TextInput
          label="Pixel Height"
          name="pixelHeight"
          readOnly
          type="number"
          value={formValues.pixelHeight}
        />
      </div>

      <div className="design-form-grid design-form-grid-two">
        <TextInput
          disabled={!hasPixelDimensions}
          label="Print Width (inches)"
          name="printWidthInches"
          onChange={handlePrintWidthChange}
          step="0.01"
          type="number"
          value={formValues.printWidthInches}
        />
        <TextInput
          disabled={!hasPixelDimensions}
          label="Print Height (inches)"
          name="printHeightInches"
          onChange={handlePrintHeightChange}
          step="0.01"
          type="number"
          value={formValues.printHeightInches}
        />
      </div>

      <Checkbox
        checked={formValues.printAspectRatioLocked}
        disabled={!hasPixelDimensions}
        label="Aspect Ratio Locked"
        name="printAspectRatioLocked"
        onChange={handleAspectRatioLockedChange}
      />

      <div className="design-form-grid design-form-grid-two">
        <TextInput
          label="Effective DPI"
          name="effectiveDpi"
          readOnly
          type="number"
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
            effectiveDpiState.qualityLevel === "preferred"
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
