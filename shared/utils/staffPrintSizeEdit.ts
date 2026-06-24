import { MAX_REASONABLE_PRINT_WIDTH_INCHES } from "../constants/printSize.constants";
import type { PrintSizeSource } from "../types/printSize/printSize.enums";
import {
  calculateEffectiveDpi,
  preserveAspectRatioFromHeight,
  preserveAspectRatioFromWidth,
} from "./printSizeMath";

export interface StaffPrintSizeInput {
  pixelWidth: number;
  pixelHeight: number;
  printWidthInches: number;
  printHeightInches: number;
  printAspectRatioLocked: boolean;
}

export interface StaffPrintSizePersistenceFields {
  printWidthInches: number;
  printHeightInches: number;
  printAspectRatioLocked: boolean;
  effectiveDpi: number;
  printSizeSource: Extract<PrintSizeSource, "staff_edited">;
}

export function validateStaffPrintSizeInput(input: StaffPrintSizeInput): string | null {
  const { printWidthInches, printHeightInches } = input;

  if (!Number.isFinite(printWidthInches) || printWidthInches <= 0) {
    return "Print width must be greater than zero.";
  }

  if (!Number.isFinite(printHeightInches) || printHeightInches <= 0) {
    return "Print height must be greater than zero.";
  }

  if (printWidthInches > MAX_REASONABLE_PRINT_WIDTH_INCHES) {
    return `Print width cannot exceed ${MAX_REASONABLE_PRINT_WIDTH_INCHES} inches.`;
  }

  if (printHeightInches > MAX_REASONABLE_PRINT_WIDTH_INCHES) {
    return `Print height cannot exceed ${MAX_REASONABLE_PRINT_WIDTH_INCHES} inches.`;
  }

  return null;
}

export function computeStaffEffectiveDpi(input: StaffPrintSizeInput): number | { error: string } {
  const validationError = validateStaffPrintSizeInput(input);
  if (validationError) {
    return { error: validationError };
  }

  const effectiveDpiResult = calculateEffectiveDpi(
    input.pixelWidth,
    input.pixelHeight,
    input.printWidthInches,
    input.printHeightInches,
    input.printAspectRatioLocked,
  );

  if (!effectiveDpiResult.success) {
    return { error: effectiveDpiResult.error };
  }

  return effectiveDpiResult.effectiveDpi;
}

export function applyStaffPrintWidthChange(
  nextWidthInches: number,
  input: StaffPrintSizeInput,
): StaffPrintSizeInput | { error: string } {
  if (!input.printAspectRatioLocked) {
    return {
      ...input,
      printWidthInches: nextWidthInches,
    };
  }

  const preserved = preserveAspectRatioFromWidth(
    nextWidthInches,
    input.pixelWidth,
    input.pixelHeight,
  );

  if (!preserved.success) {
    return { error: preserved.error };
  }

  return {
    ...input,
    printWidthInches: preserved.printWidthInches,
    printHeightInches: preserved.printHeightInches,
  };
}

export function applyStaffPrintHeightChange(
  nextHeightInches: number,
  input: StaffPrintSizeInput,
): StaffPrintSizeInput | { error: string } {
  if (!input.printAspectRatioLocked) {
    return {
      ...input,
      printHeightInches: nextHeightInches,
    };
  }

  const preserved = preserveAspectRatioFromHeight(
    nextHeightInches,
    input.pixelWidth,
    input.pixelHeight,
  );

  if (!preserved.success) {
    return { error: preserved.error };
  }

  return {
    ...input,
    printWidthInches: preserved.printWidthInches,
    printHeightInches: preserved.printHeightInches,
  };
}

export function buildStaffPrintSizePersistenceFields(
  input: StaffPrintSizeInput,
): StaffPrintSizePersistenceFields | { error: string } {
  const effectiveDpi = computeStaffEffectiveDpi(input);

  if (typeof effectiveDpi !== "number") {
    return effectiveDpi;
  }

  return {
    printWidthInches: input.printWidthInches,
    printHeightInches: input.printHeightInches,
    printAspectRatioLocked: input.printAspectRatioLocked,
    effectiveDpi,
    printSizeSource: "staff_edited",
  };
}
