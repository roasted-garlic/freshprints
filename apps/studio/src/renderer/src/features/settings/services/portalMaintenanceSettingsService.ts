import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";

import {
  PORTAL_MAINTENANCE_SETTINGS_DOC_ID,
  parsePortalMaintenanceSettingsInput,
  resolvePortalMaintenanceSettings,
  type PortalMaintenanceTestCustomerOption,
  type PortalMaintenanceSettings,
  type PortalMaintenanceSettingsInput,
} from "@fresh-prints/shared/constants/portal/portalMaintenance.constants";
import { db } from "../../../config/firebase";
import { callTracedFunction } from "../../../config/tracedCallable";

export const portalMaintenanceSettingsService = {
  async listTestCustomers(): Promise<PortalMaintenanceTestCustomerOption[]> {
    return callTracedFunction<Record<string, never>, PortalMaintenanceTestCustomerOption[]>(
      "listPortalMaintenanceTestCustomers",
      { source: "portalMaintenanceSettingsService.listTestCustomers" },
    )({});
  },

  subscribe(
    onData: (settings: PortalMaintenanceSettings) => void,
    onError: (message: string) => void,
  ): Unsubscribe {
    return onSnapshot(
      doc(db, "settings", PORTAL_MAINTENANCE_SETTINGS_DOC_ID),
      (snapshot) => {
        if (!snapshot.exists()) {
          onData({ enabled: false });
          return;
        }
        const raw = snapshot.data();
        const parsed = parsePortalMaintenanceSettingsInput({
          enabled: raw?.enabled,
          heading: raw?.heading,
          message: raw?.message,
          maintenanceTestCustomerUid: raw?.maintenanceTestCustomerUid,
        });
        if (!parsed) {
          onError("Portal maintenance settings are malformed.");
          return;
        }
        onData({
          ...resolvePortalMaintenanceSettings(raw),
          enabled: parsed.enabled,
          ...(parsed.heading ? { heading: parsed.heading } : {}),
          ...(parsed.message ? { message: parsed.message } : {}),
          maintenanceTestCustomerUid: parsed.maintenanceTestCustomerUid,
        });
      },
      (error) => onError(error.message),
    );
  },

  async update(settings: PortalMaintenanceSettingsInput): Promise<PortalMaintenanceSettings> {
    const parsed = parsePortalMaintenanceSettingsInput(settings);
    if (!parsed) {
      throw new Error("Maintenance mode requires a boolean enabled value and valid heading/message.");
    }
    return callTracedFunction<PortalMaintenanceSettingsInput, PortalMaintenanceSettings>(
      "updatePortalMaintenanceState",
      { source: "portalMaintenanceSettingsService.update" },
    )(parsed);
  },
};
