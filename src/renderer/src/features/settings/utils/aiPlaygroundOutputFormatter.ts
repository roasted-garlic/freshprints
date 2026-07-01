const JSON_CODE_FENCE_PATTERN = /^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```$/i;

function prettyPrintJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function tryFormatJson(rawOutput: string): string | null {
  try {
    return prettyPrintJson(JSON.parse(rawOutput));
  } catch {
    return null;
  }
}

export function formatAiPlaygroundOutput(rawOutput: string): string {
  const trimmedOutput = rawOutput.trim();

  if (!trimmedOutput) {
    return rawOutput;
  }

  const directJson = tryFormatJson(trimmedOutput);

  if (directJson !== null) {
    return directJson;
  }

  const fencedJson = trimmedOutput.match(JSON_CODE_FENCE_PATTERN);

  if (!fencedJson?.[1]) {
    return rawOutput;
  }

  return tryFormatJson(fencedJson[1].trim()) ?? rawOutput;
}
