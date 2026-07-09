import type { ImportIpcResult } from "../import/importIpc.types";

export type InboxAlertSoundKind = "request_queued_to_show" | "show_queue_full";

export interface SelectInboxAlertSoundRequest {
  soundKind: InboxAlertSoundKind;
  userId: string;
}

export interface SelectInboxAlertSoundResult {
  canceled: boolean;
  fileName?: string;
  soundKind?: InboxAlertSoundKind;
}

export interface GetInboxAlertSoundPlayableUrlRequest {
  soundKind: InboxAlertSoundKind;
  userId: string;
}

export interface GetInboxAlertSoundPlayableUrlResult {
  playableUrl: string;
}

export interface ClearInboxAlertSoundRequest {
  soundKind: InboxAlertSoundKind;
  userId: string;
}

export interface ClearInboxAlertSoundResult {
  cleared: boolean;
}

export interface FreshPrintsInboxAlertApi {
  clearLocalSound(
    request: ClearInboxAlertSoundRequest,
  ): Promise<ImportIpcResult<ClearInboxAlertSoundResult>>;
  getLocalSoundPlayableUrl(
    request: GetInboxAlertSoundPlayableUrlRequest,
  ): Promise<ImportIpcResult<GetInboxAlertSoundPlayableUrlResult>>;
  selectAndSaveLocalSound(
    request: SelectInboxAlertSoundRequest,
  ): Promise<ImportIpcResult<SelectInboxAlertSoundResult>>;
}
