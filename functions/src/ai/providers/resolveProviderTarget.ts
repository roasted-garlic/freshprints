export const GEMINI_CHAT_COMPLETIONS_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

export interface ProviderTarget {
  providerId: "google";
  baseUrl: string;
}

export function resolveProviderTarget(): ProviderTarget {
  return {
    providerId: "google",
    baseUrl: GEMINI_CHAT_COMPLETIONS_URL,
  };
}
