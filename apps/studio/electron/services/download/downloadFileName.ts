import path from "node:path";

const FORBIDDEN_FILE_NAME_CHARACTERS = new Set('<>:"/\\|?*');

function isForbiddenFileNameCharacter(character: string): boolean {
  return character.charCodeAt(0) <= 0x1f || FORBIDDEN_FILE_NAME_CHARACTERS.has(character);
}

export function sanitizeDownloadFileName(raw: string): string {
  const base = path.basename(raw.trim() || "download");
  const cleaned = [...base]
    .map((character) => (isForbiddenFileNameCharacter(character) ? "_" : character))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned === "." || cleaned === "..") {
    return "download.bin";
  }
  return cleaned.slice(0, 180);
}
