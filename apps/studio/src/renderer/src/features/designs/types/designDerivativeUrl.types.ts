export type DesignDerivativeUrlStatus = "idle" | "loading" | "resolved" | "unavailable";

export interface DesignDerivativeUrlState {
  status: DesignDerivativeUrlStatus;
  url: string | null;
}
