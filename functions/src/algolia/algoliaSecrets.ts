import { defineSecret } from "firebase-functions/params";

/**
 * Algolia Admin API key — write/index only. Never ship to Portal.
 *
 * Kept in an Algolia-only module so unrelated Functions (e.g. enqueueAiEnrichment)
 * that import `lib/secrets` do not register this secret into Firebase deployment
 * discovery (`declaredParams`) while Algolia is optional/OFF.
 */
export const algoliaAdminApiKeySecret = defineSecret("ALGOLIA_ADMIN_API_KEY");
