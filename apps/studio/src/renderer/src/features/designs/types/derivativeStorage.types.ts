export interface DerivativeDeleteOutcome {
  path: string;
  deleted: boolean;
  warning?: string;
}

export interface DeleteDesignDerivativesResult {
  thumbnail: DerivativeDeleteOutcome;
  preview: DerivativeDeleteOutcome;
}

export interface UploadDerivativeWebpResult {
  catalogPath: string;
}
