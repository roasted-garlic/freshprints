import { requireValidCustomerUsername } from "./customerUsername";

const LEGACY_REQUEST_SEQUENCE_PAD_LENGTH = 4;
const REQUEST_SEQUENCE_PAD_LENGTH = 3;
const DEFAULT_INTERNAL_BASE_NAME = "internal";
const INTERNAL_BASE_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{0,30}[a-z0-9])?$/;

function formatRequestSequence(sequence: number, padLength = REQUEST_SEQUENCE_PAD_LENGTH): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error("Print request sequence must be a positive integer.");
  }

  return String(sequence).padStart(padLength, "0");
}

export function normalizeInternalBaseName(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/^[^a-z0-9]+/, "")
    .replace(/[^a-z0-9]+$/, "");

  return normalized || DEFAULT_INTERNAL_BASE_NAME;
}

export function requireValidInternalBaseName(value: string): string {
  const normalized = normalizeInternalBaseName(value);

  if (normalized.length > 32 || !INTERNAL_BASE_NAME_PATTERN.test(normalized)) {
    throw new Error("Internal base name must be 1-32 lowercase letters, numbers, underscores, or hyphens.");
  }

  return normalized;
}

export function formatCustomerPrintRequestName(username: string, sequence: number): string {
  return `${requireValidCustomerUsername(username)}-CR${formatRequestSequence(sequence)}`;
}

export function formatInternalPrintRequestName(baseName: string, sequence: number): string {
  return `${requireValidInternalBaseName(baseName)}-IR${formatRequestSequence(sequence)}`;
}

export function formatLegacyInternalPrintRequestName(sequence: number): string {
  return `internal-${formatRequestSequence(sequence, LEGACY_REQUEST_SEQUENCE_PAD_LENGTH)}`;
}

export function formatLegacyCustomerPrintRequestName(username: string, sequence: number): string {
  return `${requireValidCustomerUsername(username)}-${formatRequestSequence(sequence, LEGACY_REQUEST_SEQUENCE_PAD_LENGTH)}`;
}
