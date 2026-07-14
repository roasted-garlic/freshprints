const ARTWORK_QUALITY_MODAL_SNOOZE_STORAGE_KEY =
  'fresh-prints-portal-artwork-quality-modal-snooze-until';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function getArtworkQualityModalSnoozeStorageKey(): string {
  return ARTWORK_QUALITY_MODAL_SNOOZE_STORAGE_KEY;
}

export function isArtworkQualityModalSnoozed(
  nowMs: number,
  snoozeUntilIso: string | null | undefined,
): boolean {
  if (!snoozeUntilIso) {
    return false;
  }

  const snoozeUntilMs = Date.parse(snoozeUntilIso);
  if (Number.isNaN(snoozeUntilMs)) {
    return false;
  }

  return nowMs < snoozeUntilMs;
}

export function buildArtworkQualityModalSnoozeUntilIso(
  nowMs: number,
  durationMs: number = TWENTY_FOUR_HOURS_MS,
): string {
  return new Date(nowMs + durationMs).toISOString();
}

export function readArtworkQualityModalSnoozeUntil(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(ARTWORK_QUALITY_MODAL_SNOOZE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeArtworkQualityModalSnoozeUntil(iso: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(ARTWORK_QUALITY_MODAL_SNOOZE_STORAGE_KEY, iso);
  } catch {
    // Fail open — preference is best-effort only.
  }
}

export function shouldOpenArtworkQualityModalOnMount(nowMs: number = Date.now()): boolean {
  return !isArtworkQualityModalSnoozed(nowMs, readArtworkQualityModalSnoozeUntil());
}
