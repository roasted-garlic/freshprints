export async function refreshSelectedShowGangSheetCache<TShow extends { id: string }, TSettings>(
  input: {
    show: TShow | null;
    isPast: boolean;
    settings: TSettings;
    reset: () => void;
    clearForShow: (showId: string) => Promise<unknown>;
    refresh: (show: TShow, settings: TSettings) => Promise<unknown>;
  },
): Promise<void> {
  if (!input.show) {
    input.reset();
    return;
  }
  if (input.isPast) {
    await input.clearForShow(input.show.id);
    return;
  }
  await input.refresh(input.show, input.settings);
}
