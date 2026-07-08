/// <reference types="vite/client" />

import type { FreshPrintsPreloadApi } from "@fresh-prints/shared/types/import/importIpc.types";

declare global {
  interface Window {
    freshPrints: FreshPrintsPreloadApi;
  }
}

export {};
