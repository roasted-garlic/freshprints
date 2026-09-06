import {
  resolveLeanCatalogTitle,
  isStyleWordHeavyTitle,
  isDescriptionLikeCatalogTitle,
  normalizeCatalogTitle,
  sanitizeCatalogDescription,
} from "../src/ai/catalogTitleRules";
import {
  stripOcrDumpFromDescription,
  synthesizeSemanticCatalogDescription,
} from "../../packages/shared/src/utils/visibleTextQuality";

const playgroundTitles = [
  "Retro Pin-Up Woman Holding Cucumber",
  "Retro Pin-Up Woman Holding Cucumber with Humorous Phrase",
  "Retro Pin-Up Girl Holding Cucumber with Sarcastic Phrase",
  "Pin-up Woman Holding Cucumber Sarcastic Saying",
  "Retro Woman with Cucumber and Vulgar Phrase",
  "When Life Gives You Cucumbers Go Fuck Yourself Woman",
];

const readable = ["WHEN LIFE GIVES YOU", "Cucumbers", "GO FUCK YOURSELF..."];
const descStrong =
  'A vintage-style pin-up woman with styled blonde hair holds a cucumber. The text reads "WHEN LIFE GIVES YOU CUCUMBERS" and "GO FUCK YOURSELF...". The overall concept is humorous and provocative.';
const descThin =
  'The design features a retro art style with a distressed texture. The text "WHEN LIFE GIVES YOU CUCUMBERS GO FUCK YOURSELF..." is prominently displayed.';

for (const t of playgroundTitles) {
  const lean = resolveLeanCatalogTitle({
    candidateTitle: t,
    tags: [],
    uploadFileStem: "upload",
    description: descStrong,
    readableTextLines: readable,
    centralSubject: "woman",
    subjects: ["woman", "cucumber"],
    objects: ["cucumber"],
  });
  console.log(
    JSON.stringify({
      playground: t,
      normalized: normalizeCatalogTitle(t),
      styleHeavy: isStyleWordHeavyTitle(t),
      descLike: isDescriptionLikeCatalogTitle(t),
      processingLean: lean,
    }),
  );
}

console.log("--- descriptions ---");
console.log("strong scrubbed:", stripOcrDumpFromDescription(sanitizeCatalogDescription(descStrong)));
console.log("thin scrubbed:", stripOcrDumpFromDescription(sanitizeCatalogDescription(descThin)));
console.log(
  "synth:",
  synthesizeSemanticCatalogDescription({ centralSubject: "woman", visibleText: readable }),
);
