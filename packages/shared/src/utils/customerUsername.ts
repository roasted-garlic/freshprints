export const CUSTOMER_USERNAME_MIN_LENGTH = 3;
export const CUSTOMER_USERNAME_MAX_LENGTH = 32;

export const RESERVED_CUSTOMER_USERNAMES = [
  "internal",
  "admin",
  "owner",
  "support",
  "portal",
  "print",
  "prints",
  "customer",
  "customers",
  "staff",
  "team",
  "freshprints",
  "funkyfreshprints",
] as const;

const CUSTOMER_USERNAME_PATTERN = /^[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]$/;
const RESERVED_CUSTOMER_USERNAME_SET = new Set<string>(RESERVED_CUSTOMER_USERNAMES);

export interface CustomerUsernameValidationResult {
  isValid: boolean;
  username: string;
  error?: string;
}

export function normalizeCustomerUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function validateCustomerUsername(value: string): CustomerUsernameValidationResult {
  const username = normalizeCustomerUsername(value);

  if (!username) {
    return { isValid: false, username, error: "Customer username is required." };
  }

  if (username.length < CUSTOMER_USERNAME_MIN_LENGTH || username.length > CUSTOMER_USERNAME_MAX_LENGTH) {
    return { isValid: false, username, error: "Customer username must be 3-32 characters." };
  }

  if (!CUSTOMER_USERNAME_PATTERN.test(username)) {
    return {
      isValid: false,
      username,
      error:
        "Customer username must use lowercase letters, numbers, underscores, or hyphens, and start and end with a letter or number.",
    };
  }

  if (RESERVED_CUSTOMER_USERNAME_SET.has(username)) {
    return { isValid: false, username, error: "That customer username is reserved." };
  }

  return { isValid: true, username };
}

export function requireValidCustomerUsername(value: string): string {
  const result = validateCustomerUsername(value);

  if (!result.isValid) {
    throw new Error(result.error ?? "Enter a valid customer username.");
  }

  return result.username;
}
