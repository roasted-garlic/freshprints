export type PortalAdminStaffArtworkUploadStatus =
  | 'queued'
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'failed';

export interface PortalAdminStaffArtworkUploadItem {
  id: string;
  fileName: string;
  file: File;
  status: PortalAdminStaffArtworkUploadStatus;
  progressPercent: number;
  staffArtworkId?: string;
  errorMessage?: string;
}

export interface CreateStaffArtworkUploadResponse {
  staffArtworkId: string;
  sourceStoragePath: string;
  reusedExisting: boolean;
}

export interface FinalizeStaffArtworkResponse {
  staffArtworkId: string;
  status: 'ready' | 'failed';
  alreadyReady: boolean;
  errorCode?: string;
  errorMessage?: string;
}
