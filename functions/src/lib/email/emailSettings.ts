import {
  EMAIL_PROVIDER_SETTINGS_DOC_ID,
  resolveEmailProviderSettings,
  type EmailProviderSettings,
} from "../../../../packages/shared/src/constants/emailProviders.constants";
import { adminDb } from "../admin";

export async function loadEmailProviderSettings(): Promise<EmailProviderSettings> {
  const snapshot = await adminDb.collection("settings").doc(EMAIL_PROVIDER_SETTINGS_DOC_ID).get();
  return resolveEmailProviderSettings(snapshot.data());
}
