import { normalizeCustomerUsername } from "./customerUsername";

export interface FormatCustomerUsernameIdentityLabelInput {
  currentUsername?: string | null;
  usernameAtCreation?: string | null;
  /** When true (default), prefix usernames with @ in output. */
  includeAtPrefix?: boolean;
}

function normalizeUsernameValue(value: string | null | undefined): string {
  if (typeof value !== "string") {
    return "";
  }

  return normalizeCustomerUsername(value);
}

function withAtPrefix(username: string, includeAtPrefix: boolean): string {
  if (!username) {
    return "";
  }

  if (!includeAtPrefix || username.startsWith("@")) {
    return username;
  }

  return `@${username}`;
}

/**
 * Formats customer username identity for display.
 *
 * - Current only: `@newname`
 * - Historical mismatch: `@newname · was @oldname at submission`
 * - Missing at-creation (legacy): treat current as both (no redundant "was" copy)
 */
export function formatCustomerUsernameIdentityLabel(
  input: FormatCustomerUsernameIdentityLabelInput,
): string {
  const includeAtPrefix = input.includeAtPrefix !== false;
  const current = normalizeUsernameValue(input.currentUsername);
  const atCreationRaw =
    typeof input.usernameAtCreation === "string" ? input.usernameAtCreation.trim() : "";
  const atCreation = atCreationRaw ? normalizeUsernameValue(atCreationRaw) : "";

  if (!current) {
    return "Unknown customer";
  }

  const historical = atCreation || current;

  if (historical === current) {
    return withAtPrefix(current, includeAtPrefix);
  }

  return `${withAtPrefix(current, includeAtPrefix)} · was ${withAtPrefix(historical, includeAtPrefix)} at submission`;
}

export interface FormatCustomerIdentityLabelInput {
  currentUsername?: string | null;
  usernameAtCreation?: string | null;
  currentDisplayName?: string | null;
  displayNameAtCreation?: string | null;
  includeAtPrefix?: boolean;
}

/**
 * Formats customer identity for list/detail surfaces.
 * Display name is shown when present; username identity follows historical rules.
 */
export function formatCustomerIdentityLabel(input: FormatCustomerIdentityLabelInput): string {
  const displayName =
    typeof input.currentDisplayName === "string" ? input.currentDisplayName.trim() : "";
  const usernameLabel = formatCustomerUsernameIdentityLabel({
    currentUsername: input.currentUsername,
    usernameAtCreation: input.usernameAtCreation,
    includeAtPrefix: input.includeAtPrefix,
  });

  if (displayName) {
    return `${displayName} (${usernameLabel})`;
  }

  return usernameLabel;
}
