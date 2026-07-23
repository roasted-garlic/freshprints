/**
 * Seed Firestore `settings/portalHelp` FAQ list on fresh-prints-dev only.
 * Videos stay empty (Portal Coming soon). Uses Firebase CLI OAuth + Firestore REST
 * (same pattern as smoke harnesses) — no production writes.
 *
 * Usage (from repo root):
 *   npx tsx functions/scripts/seed-portal-help-faqs.ts
 *
 * Optional dry run:
 *   DRY_RUN=1 npx tsx functions/scripts/seed-portal-help-faqs.ts
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

import { PORTAL_TEXT_FAQS } from "../../apps/portal/features/help/portalHelpContent.ts";
import {
  PORTAL_HELP_SETTINGS_DOC_ID,
  parsePortalHelpSettingsInput,
  type PortalHelpTextFaq,
} from "../../packages/shared/src/constants/portal/portalHelpSettings.constants.ts";

const PROJECT_ID = "fresh-prints-dev";

function loadCliAccessToken(): string {
  const confPath = resolve(homedir(), ".config/configstore/firebase-tools.json");
  const conf = JSON.parse(readFileSync(confPath, "utf8")) as {
    tokens?: { access_token?: string };
  };
  const token = conf.tokens?.access_token;
  if (!token) {
    throw new Error("Firebase CLI access token missing. Run firebase login.");
  }
  return token;
}

function str(value: string) {
  return { stringValue: value };
}

function int(value: number) {
  return { integerValue: String(value) };
}

function faqFields(faq: PortalHelpTextFaq) {
  return {
    mapValue: {
      fields: {
        id: str(faq.id),
        question: str(faq.question),
        answer: str(faq.answer),
        order: int(faq.order),
      },
    },
  };
}

async function patchPortalHelp(
  accessToken: string,
  faqs: PortalHelpTextFaq[],
): Promise<void> {
  const url =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/settings/${PORTAL_HELP_SETTINGS_DOC_ID}` +
    `?updateMask.fieldPaths=faqs&updateMask.fieldPaths=videos&updateMask.fieldPaths=updatedAt&updateMask.fieldPaths=updatedBy`;

  const body = {
    fields: {
      faqs: {
        arrayValue: {
          values: faqs.map(faqFields),
        },
      },
      videos: {
        arrayValue: { values: [] },
      },
      updatedAt: {
        timestampValue: new Date().toISOString(),
      },
      updatedBy: str("seed-portal-help-faqs"),
    },
  };

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore PATCH settings/${PORTAL_HELP_SETTINGS_DOC_ID} failed: ${res.status} ${text}`);
  }
}

async function readPortalHelp(accessToken: string): Promise<{ faqCount: number; videoCount: number }> {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/settings/${PORTAL_HELP_SETTINGS_DOC_ID}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore GET settings/${PORTAL_HELP_SETTINGS_DOC_ID} failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as {
    fields?: {
      faqs?: { arrayValue?: { values?: unknown[] } };
      videos?: { arrayValue?: { values?: unknown[] } };
    };
  };
  return {
    faqCount: json.fields?.faqs?.arrayValue?.values?.length ?? 0,
    videoCount: json.fields?.videos?.arrayValue?.values?.length ?? 0,
  };
}

async function main() {
  if (PROJECT_ID !== "fresh-prints-dev") {
    throw new Error(`Refusing to seed project ${PROJECT_ID}`);
  }

  const parsed = parsePortalHelpSettingsInput({
    faqs: PORTAL_TEXT_FAQS,
    videos: [],
  });
  if (!parsed) {
    throw new Error("parsePortalHelpSettingsInput rejected FAQ payload");
  }

  const dashHits = parsed.faqs.flatMap((faq) => {
    const hits: string[] = [];
    if (/[—–]/.test(faq.question)) hits.push(`${faq.id} question`);
    if (/[—–]/.test(faq.answer)) hits.push(`${faq.id} answer`);
    return hits;
  });
  if (dashHits.length > 0) {
    throw new Error(`Em/en dashes found in FAQ copy: ${dashHits.join(", ")}`);
  }

  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Doc: settings/${PORTAL_HELP_SETTINGS_DOC_ID}`);
  console.log(`FAQs: ${parsed.faqs.length}`);
  console.log(`Videos: ${parsed.videos.length} (empty → Coming soon)`);
  for (const faq of parsed.faqs) {
    console.log(`  [${faq.order}] ${faq.id}: ${faq.question}`);
  }

  if (process.env.DRY_RUN === "1") {
    console.log("DRY_RUN=1 — no write.");
    return;
  }

  const accessToken = loadCliAccessToken();
  await patchPortalHelp(accessToken, parsed.faqs);
  const readback = await readPortalHelp(accessToken);
  console.log(
    `Wrote settings/${PORTAL_HELP_SETTINGS_DOC_ID} (faqCount=${readback.faqCount}, videoCount=${readback.videoCount}).`,
  );
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
