/// <reference types="vite/client" />

import type { FreshPrintsPreloadApi } from "../shared/types/import/importIpc.types";

declare global {
  interface Window {
    freshPrints: FreshPrintsPreloadApi;
  }
}

export {};
