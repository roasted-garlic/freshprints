const ABOUT_MODAL_DISMISSED_FOREVER_KEY = 'fresh-prints-portal-about-modal-dismissed';
const ABOUT_MODAL_SNOOZE_UNTIL_KEY = 'fresh-prints-portal-about-modal-snooze-until';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function getAboutModalDismissedForeverStorageKey(): string {
  return ABOUT_MODAL_DISMISSED_FOREVER_KEY;
}

export function getAboutModalSnoozeUntilStorageKey(): string {
  return ABOUT_MODAL_SNOOZE_UNTIL_KEY;
}

export function isAboutModalSnoozed(
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

export function buildAboutModalSnoozeUntilIso(
  nowMs: number,
  durationMs: number = TWENTY_FOUR_HOURS_MS,
): string {
  return new Date(nowMs + durationMs).toISOString();
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

export function readAboutModalDismissedForever(): boolean {
  return safeGetItem(ABOUT_MODAL_DISMISSED_FOREVER_KEY) === '1';
}

export function writeAboutModalDismissedForever(): void {
  safeSetItem(ABOUT_MODAL_DISMISSED_FOREVER_KEY, '1');
  safeRemoveItem(ABOUT_MODAL_SNOOZE_UNTIL_KEY);
}

export function readAboutModalSnoozeUntil(): string | null {
  return safeGetItem(ABOUT_MODAL_SNOOZE_UNTIL_KEY);
}

export function writeAboutModalSnoozeUntil(iso: string): void {
  safeSetItem(ABOUT_MODAL_SNOOZE_UNTIL_KEY, iso);
}

export function dismissAboutModal(options: {
  dontShowAgain: boolean;
  nowMs?: number;
}): void {
  if (options.dontShowAgain) {
    writeAboutModalDismissedForever();
    return;
  }
  writeAboutModalSnoozeUntil(buildAboutModalSnoozeUntilIso(options.nowMs ?? Date.now()));
}

export function shouldShowAboutModalOnVisit(nowMs: number = Date.now()): boolean {
  if (readAboutModalDismissedForever()) {
    return false;
  }
  return !isAboutModalSnoozed(nowMs, readAboutModalSnoozeUntil());
}
