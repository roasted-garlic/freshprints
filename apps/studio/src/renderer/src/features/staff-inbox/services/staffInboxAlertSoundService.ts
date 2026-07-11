import { isElectronDesktop } from "../../../shared/utils/isElectronDesktop";
import { compareStaffInboxAlertSoundKinds } from "@fresh-prints/shared/staffInbox/staffInboxAlertOrdering";
import type {
  StaffInboxAlertSettings,
  StaffInboxAlertSoundKind,
  StaffInboxAlertSoundSource,
} from "../types/staffInboxAlertSettings.types";
import { getDefaultStaffInboxAlertSoundUrl } from "./staffInboxDefaultAlertSounds";

const ALERT_SOUND_GAP_MS = 2_000;
const ALERT_SOUND_MAX_DURATION_MS = 30_000;

interface AlertSoundQueueItem {
  kind: StaffInboxAlertSoundKind;
  settings: StaffInboxAlertSettings;
  userId: string | undefined;
}

const alertSoundQueue: AlertSoundQueueItem[] = [];
let isProcessingAlertSoundQueue = false;

export const staffInboxAlertDesktopService = {
  isAvailable(): boolean {
    return isElectronDesktop();
  },

  async selectAndSaveLocalSound(userId: string, soundKind: StaffInboxAlertSoundKind) {
    if (!isElectronDesktop()) {
      throw new Error("Local sound upload requires the Fresh Prints desktop app.");
    }

    const result = await window.freshPrints.inboxAlert.selectAndSaveLocalSound({
      userId,
      soundKind,
    });

    if (!result.success) {
      throw new Error(result.error.message);
    }

    return result.data;
  },

  async clearLocalSound(userId: string, soundKind: StaffInboxAlertSoundKind) {
    if (!isElectronDesktop()) {
      return { cleared: false };
    }

    const result = await window.freshPrints.inboxAlert.clearLocalSound({
      userId,
      soundKind,
    });

    if (!result.success) {
      throw new Error(result.error.message);
    }

    return result.data;
  },
};

export async function resolveStaffInboxAlertPlayableUrl(
  userId: string | undefined,
  source: StaffInboxAlertSoundSource,
  soundKind: StaffInboxAlertSoundKind,
): Promise<string | null> {
  if (source.kind === "default" || !source.value.trim()) {
    return getDefaultStaffInboxAlertSoundUrl(soundKind);
  }

  if (source.kind === "url") {
    return source.value.trim();
  }

  if (!userId || !isElectronDesktop()) {
    return getDefaultStaffInboxAlertSoundUrl(soundKind);
  }

  const result = await window.freshPrints.inboxAlert.getLocalSoundPlayableUrl({
    userId,
    soundKind,
  });

  if (!result.success || !result.data.playableUrl) {
    return getDefaultStaffInboxAlertSoundUrl(soundKind);
  }

  return result.data.playableUrl;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function waitForAudioCompletion(audio: HTMLAudioElement): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;

    const settle = () => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeoutId);
      audio.removeEventListener("ended", settle);
      audio.removeEventListener("error", settle);
      resolve();
    };

    const timeoutId = window.setTimeout(settle, ALERT_SOUND_MAX_DURATION_MS);

    audio.addEventListener("ended", settle);
    audio.addEventListener("error", settle);
  });
}

async function playResolvedAlertSound(playableUrl: string): Promise<void> {
  const audio = new Audio(playableUrl);

  audio.volume = 0.9;

  try {
    await audio.play();
  } catch {
    return;
  }

  await waitForAudioCompletion(audio);
}

async function playAlertSoundNow(
  userId: string | undefined,
  settings: StaffInboxAlertSettings,
  kind: StaffInboxAlertSoundKind,
): Promise<void> {
  if (!settings.soundsEnabled) {
    return;
  }

  const source =
    kind === "request_queued_to_show" ? settings.requestQueuedToShow : settings.showQueueFull;
  const playableUrl = await resolveStaffInboxAlertPlayableUrl(userId, source, kind);

  if (!playableUrl) {
    return;
  }

  await playResolvedAlertSound(playableUrl);
}

async function processAlertSoundQueue(): Promise<void> {
  if (isProcessingAlertSoundQueue) {
    return;
  }

  isProcessingAlertSoundQueue = true;

  try {
    while (alertSoundQueue.length > 0) {
      const nextItem = alertSoundQueue.shift();

      if (!nextItem) {
        continue;
      }

      await playAlertSoundNow(nextItem.userId, nextItem.settings, nextItem.kind);

      if (alertSoundQueue.length > 0) {
        await delay(ALERT_SOUND_GAP_MS);
      }
    }
  } finally {
    isProcessingAlertSoundQueue = false;
  }
}

export function enqueueStaffInboxAlertSound(
  userId: string | undefined,
  settings: StaffInboxAlertSettings,
  kind: StaffInboxAlertSoundKind,
): void {
  if (!settings.soundsEnabled) {
    return;
  }

  alertSoundQueue.push({ userId, settings, kind });
  alertSoundQueue.sort((left, right) => compareStaffInboxAlertSoundKinds(left.kind, right.kind));
  void processAlertSoundQueue();
}

export async function playStaffInboxAlertSound(
  userId: string | undefined,
  settings: StaffInboxAlertSettings,
  kind: StaffInboxAlertSoundKind,
): Promise<void> {
  enqueueStaffInboxAlertSound(userId, settings, kind);
}

export async function previewStaffInboxAlertSound(
  userId: string | undefined,
  settings: StaffInboxAlertSettings,
  kind: StaffInboxAlertSoundKind,
): Promise<void> {
  const source =
    kind === "request_queued_to_show" ? settings.requestQueuedToShow : settings.showQueueFull;
  const playableUrl = await resolveStaffInboxAlertPlayableUrl(userId, source, kind);

  if (!playableUrl) {
    throw new Error("Unable to resolve an alert sound to preview.");
  }

  await playResolvedAlertSound(playableUrl);
}
