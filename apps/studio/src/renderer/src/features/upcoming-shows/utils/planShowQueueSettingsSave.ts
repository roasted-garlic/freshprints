/**
 * Plans a Show Queue Settings Save so Apply-checked saves never double-write
 * `defaultMaxTotalQuantity` through the client settings path.
 */

export interface ShowQueueSettingsSavePlanInput {
  applyToExistingShows: boolean;
  /** Parsed default capacity; `undefined` means blank / no limit in the form. */
  defaultMaxTotalQuantity: number | undefined;
  whatnotShowBaseUrl: string | undefined;
  portalQueueCutoffHoursBeforeStart: number;
}

export interface ShowQueueSettingsClientUpdate {
  defaultMaxTotalQuantity?: number;
  whatnotShowBaseUrl?: string;
  portalQueueCutoffHoursBeforeStart: number;
}

export interface ShowQueueSettingsSavePlan {
  clientSettingsUpdate: ShowQueueSettingsClientUpdate;
  invokeApplyCallable: boolean;
  /** Present only when `invokeApplyCallable` is true. `null` clears the default. */
  applyPayload?: { defaultMaxTotalQuantity: number | null };
}

export function planShowQueueSettingsSave(
  input: ShowQueueSettingsSavePlanInput,
): ShowQueueSettingsSavePlan {
  const nonQuota = {
    whatnotShowBaseUrl: input.whatnotShowBaseUrl,
    portalQueueCutoffHoursBeforeStart: input.portalQueueCutoffHoursBeforeStart,
  };

  if (!input.applyToExistingShows) {
    return {
      clientSettingsUpdate: {
        ...nonQuota,
        defaultMaxTotalQuantity: input.defaultMaxTotalQuantity,
      },
      invokeApplyCallable: false,
    };
  }

  return {
    clientSettingsUpdate: nonQuota,
    invokeApplyCallable: true,
    applyPayload: {
      defaultMaxTotalQuantity:
        input.defaultMaxTotalQuantity === undefined ? null : input.defaultMaxTotalQuantity,
    },
  };
}

export function formatApplyDefaultMaxSuccessMessage(input: {
  updatedShowCount: number;
  skippedBelowAllocatedCount: number;
}): string {
  const base =
    input.updatedShowCount === 0
      ? "Saved global quota. No eligible existing shows needed an update."
      : `Saved global quota and updated ${input.updatedShowCount} existing show${input.updatedShowCount === 1 ? "" : "s"}.`;

  if (input.skippedBelowAllocatedCount <= 0) {
    return base;
  }

  return `${base} Skipped ${input.skippedBelowAllocatedCount} show${input.skippedBelowAllocatedCount === 1 ? "" : "s"} where the new max is below current allocated quantity.`;
}
