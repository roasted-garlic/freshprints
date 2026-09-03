const ARTWORK_QUALITY_MODAL_DISMISSED_FOREVER_KEY =
  'fresh-prints-portal-artwork-quality-modal-dismissed';
const ARTWORK_QUALITY_MODAL_SNOOZE_STORAGE_KEY =
  'fresh-prints-portal-artwork-quality-modal-snooze-until';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function getArtworkQualityModalDismissedForeverStorageKey(): string {
  return ARTWORK_QUALITY_MODAL_DISMISSED_FOREVER_KEY;
}

export function getArtworkQualityModalSnoozeStorageKey(): string {
  return ARTWORK_QUALITY_MODAL_SNOOZE_STORAGE_KEY;
}

function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Fail open — preference is best-effort only.
  }
}

function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Fail open.
  }
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

export function readArtworkQualityModalDismissedForever(): boolean {
  return safeGetItem(ARTWORK_QUALITY_MODAL_DISMISSED_FOREVER_KEY) === '1';
}

export function writeArtworkQualityModalDismissedForever(): void {
  safeSetItem(ARTWORK_QUALITY_MODAL_DISMISSED_FOREVER_KEY, '1');
  safeRemoveItem(ARTWORK_QUALITY_MODAL_SNOOZE_STORAGE_KEY);
}

export function readArtworkQualityModalSnoozeUntil(): string | null {
  return safeGetItem(ARTWORK_QUALITY_MODAL_SNOOZE_STORAGE_KEY);
}

export function writeArtworkQualityModalSnoozeUntil(iso: string): void {
  safeSetItem(ARTWORK_QUALITY_MODAL_SNOOZE_STORAGE_KEY, iso);
}

/** Primary confirm with Don't show again checked → forever dismiss. Unchecked → close only. */
export function dismissArtworkQualityModal(options: { dontShowAgain: boolean }): void {
  if (options.dontShowAgain) {
    writeArtworkQualityModalDismissedForever();
  }
}

export function shouldOpenArtworkQualityModalOnMount(nowMs: number = Date.now()): boolean {
  if (readArtworkQualityModalDismissedForever()) {
    return false;
  }
  return !isArtworkQualityModalSnoozed(nowMs, readArtworkQualityModalSnoozeUntil());
}
