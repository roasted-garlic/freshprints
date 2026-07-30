export function canStartDesignOriginalDownload<TDesign extends object>(
  design: TDesign | null,
  isAllowed: boolean,
  isBusy: boolean,
): design is TDesign {
  return design !== null && isAllowed && !isBusy;
}
