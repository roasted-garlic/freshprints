export async function refreshSelectedShowGangSheetCache<TShow extends { id: string }, TSettings>(
  input: {
    show: TShow | null;
    /** When set but `show` is briefly null (e.g. pending timestamp remapping), do not reset. */
    selectedShowId?: string | null;
    isPast: boolean;
    settings: TSettings;
    reset: () => void;
    clearForShow: (showId: string) => Promise<unknown>;
    refresh: (show: TShow, settings: TSettings) => Promise<unknown>;
  },
): Promise<void> {
  if (!input.show) {
    // Only clear export state when nothing is selected. A transient null show while an id is still
    // selected (incomplete remapping after telemetry writes) must not wipe generated sheets.
    if (!input.selectedShowId) {
      input.reset();
    }
    return;
  }
  if (input.isPast) {
    await input.clearForShow(input.show.id);
    return;
  }
  await input.refresh(input.show, input.settings);
}
