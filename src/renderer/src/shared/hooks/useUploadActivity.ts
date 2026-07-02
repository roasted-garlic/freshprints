import { useContext } from "react";

import { UploadActivityContext } from "../context/uploadActivityContext";

export function useUploadActivity() {
  const context = useContext(UploadActivityContext);

  if (!context) {
    throw new Error("useUploadActivity must be used within AppShell");
  }

  return context;
}
