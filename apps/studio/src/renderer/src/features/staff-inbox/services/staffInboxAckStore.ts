import type { StaffInboxCompletedItem, StaffInboxItem } from "@fresh-prints/shared/staffInbox/staffInbox.types";

export interface StaffInboxAckRecord {
  acknowledgedAtMillis: number;
  createdAtMillis: number;
  itemId: string;
  kind: StaffInboxItem["kind"];
  printRequestId?: string;
  printRequestTab?: StaffInboxItem["printRequestTab"];
  subtitle: string;
  title: string;
  upcomingShowId?: string;
}

interface StaffInboxAckStorageV2 {
  records: StaffInboxAckRecord[];
  version: 2;
}

const STORAGE_KEY_PREFIX = "fresh-prints-staff-inbox-acks";

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}:${userId}`;
}

function parseLegacyKind(itemId: string): StaffInboxItem["kind"] {
  if (itemId.startsWith("portal_queued:")) {
    return "portal_queued";
  }

  if (itemId.startsWith("show_queue_full:")) {
    return "show_queue_full";
  }

  return "portal_queued";
}

function parseStorage(raw: string): StaffInboxAckStorageV2 {
  const parsed = JSON.parse(raw) as unknown;

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "version" in parsed &&
    parsed.version === 2 &&
    "records" in parsed &&
    Array.isArray(parsed.records)
  ) {
    return {
      version: 2,
      records: parsed.records.filter(isAckRecord),
    };
  }

  if (Array.isArray(parsed)) {
    return {
      version: 2,
      records: parsed
        .filter((value): value is string => typeof value === "string")
        .map((itemId) => ({
          itemId,
          kind: parseLegacyKind(itemId),
          printRequestId: itemId.split(":")[1],
          title: "Completed inbox item",
          subtitle: "Marked done before detail history was enabled.",
          printRequestTab: itemId.startsWith("portal_queued:") ? "queued" : undefined,
          createdAtMillis: 0,
          acknowledgedAtMillis: 0,
        })),
    };
  }

  return { version: 2, records: [] };
}

function isAckRecord(value: unknown): value is StaffInboxAckRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as StaffInboxAckRecord;

  return (
    typeof record.itemId === "string" &&
    (record.kind === "portal_queued" || record.kind === "show_queue_full") &&
    typeof record.title === "string" &&
    typeof record.subtitle === "string" &&
    typeof record.acknowledgedAtMillis === "number"
  );
}

export function loadStaffInboxAckRecords(userId: string): StaffInboxAckRecord[] {
  if (!userId.trim()) {
    return [];
  }

  try {
    const raw = localStorage.getItem(getStorageKey(userId));

    if (!raw) {
      return [];
    }

    return parseStorage(raw).records;
  } catch {
    return [];
  }
}

export function loadAcknowledgedStaffInboxItemIds(userId: string): Set<string> {
  return new Set(loadStaffInboxAckRecords(userId).map((record) => record.itemId));
}

function saveStaffInboxAckRecords(userId: string, records: StaffInboxAckRecord[]): void {
  if (!userId.trim()) {
    return;
  }

  try {
    const payload: StaffInboxAckStorageV2 = {
      version: 2,
      records,
    };
    localStorage.setItem(getStorageKey(userId), JSON.stringify(payload));
  } catch {
    // Ignore storage failures.
  }
}

export function acknowledgeStaffInboxItem(userId: string, item: StaffInboxItem): StaffInboxAckRecord[] {
  const records = loadStaffInboxAckRecords(userId).filter((record) => record.itemId !== item.id);
  const nextRecord: StaffInboxAckRecord = {
    itemId: item.id,
    kind: item.kind,
    printRequestId: item.printRequestId,
    upcomingShowId: item.upcomingShowId,
    title: item.title,
    subtitle: item.subtitle,
    printRequestTab: item.printRequestTab,
    createdAtMillis: item.occurredAtMillis,
    acknowledgedAtMillis: Date.now(),
  };

  const nextRecords = [nextRecord, ...records];
  saveStaffInboxAckRecords(userId, nextRecords);
  return nextRecords;
}

export function restoreStaffInboxItem(userId: string, itemId: string): StaffInboxAckRecord[] {
  const nextRecords = loadStaffInboxAckRecords(userId).filter((record) => record.itemId !== itemId);
  saveStaffInboxAckRecords(userId, nextRecords);
  return nextRecords;
}

export function mapAckRecordsToCompletedItems(records: StaffInboxAckRecord[]): StaffInboxCompletedItem[] {
  return records.map((record) => ({
    id: record.itemId,
    kind: record.kind,
    printRequestId: record.printRequestId,
    upcomingShowId: record.upcomingShowId,
    title: record.title,
    subtitle: record.subtitle,
    printRequestTab: record.printRequestTab,
    occurredAtMillis: record.createdAtMillis || record.acknowledgedAtMillis,
    acknowledgedAtMillis: record.acknowledgedAtMillis,
  }));
}
