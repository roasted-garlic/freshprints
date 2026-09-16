import {
  parsePortalDevCustomerAccessSettingsInput,
  type PortalDevCustomerAccessSettings,
  type PortalDevCustomerAccessSettingsInput,
} from "@fresh-prints/shared/constants/portal/portalDevCustomerAccess.constants";
import { callTracedFunction } from "../../../config/tracedCallable";

export const portalDevCustomerAccessSettingsService = {
  /**
   * Load via trusted callable (not client Firestore). Avoids Rules timing gaps and matches
   * write path; owner/admin enforced server-side.
   */
  async get(): Promise<PortalDevCustomerAccessSettings> {
    return callTracedFunction<Record<string, never>, PortalDevCustomerAccessSettings>(
      "getPortalDevCustomerAccessSettings",
      { source: "portalDevCustomerAccessSettingsService.get" },
    )({});
  },

  async update(
    settings: PortalDevCustomerAccessSettingsInput,
  ): Promise<PortalDevCustomerAccessSettings> {
    const parsed = parsePortalDevCustomerAccessSettingsInput(settings);
    if (!parsed) {
      throw new Error(
        "DEV customer access requires an approvedEmails array of valid email strings.",
      );
    }
    return callTracedFunction<
      PortalDevCustomerAccessSettingsInput,
      PortalDevCustomerAccessSettings
    >("updatePortalDevCustomerAccessSettings", {
      source: "portalDevCustomerAccessSettingsService.update",
    })(parsed);
  },
};
