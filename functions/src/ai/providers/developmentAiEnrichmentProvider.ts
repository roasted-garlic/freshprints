import type { AiEnrichmentInput, AiEnrichmentProvider, AiEnrichmentResult } from "./AiEnrichmentProvider";

import {
  DEVELOPMENT_CATALOG_ENRICHMENT_PROMPT_VERSION,
  normalizeCatalogTitle,
  resolveCatalogDescription,
  resolveCatalogTitle,
} from "../catalogTitleRules";



function resolveCategory(

  input: AiEnrichmentInput,

): { categoryId?: string; categoryName?: string } {

  const firstCategoryName = input.categoryNames[0];



  if (!firstCategoryName) {

    return {};

  }



  return {

    categoryName: firstCategoryName,

    categoryId: input.categoryIdsByName[firstCategoryName.toLowerCase()],

  };

}



function buildDevelopmentTitle(input: AiEnrichmentInput, categoryName?: string): string {

  const categorySubject = categoryName?.trim();



  if (categorySubject) {

    const fromCategory = normalizeCatalogTitle(`${categorySubject} Artwork`);



    if (fromCategory && fromCategory.split(" ").length >= 2) {

      return fromCategory;

    }

  }



  return "Artwork Pending Title";

}



export const developmentAiEnrichmentProvider: AiEnrichmentProvider = {

  providerId: "development",

  modelId: "heuristic-v2",

  promptVersion: DEVELOPMENT_CATALOG_ENRICHMENT_PROMPT_VERSION,



  async enrichDesign(input: AiEnrichmentInput): Promise<AiEnrichmentResult> {

    const category = resolveCategory(input);

    const tags = [

      category.categoryName?.toLowerCase(),

      "imported",

      "artwork",

    ].filter(Boolean) as string[];

    const primarySubject = category.categoryName ?? "Artwork";

    const title = resolveCatalogTitle({

      candidateTitle: buildDevelopmentTitle(input, category.categoryName),

      primarySubject,

      tags,

      uploadFileStem: input.uploadFileStem,

    });

    const descriptionResult = resolveCatalogDescription({

      candidateDescription: `Imported artwork ready for catalog review. Replace the placeholder title after reviewing the image.`,

      title,

      primarySubject,

      style: "illustrated",

      theme: "general",

      tags,

      artworkContainsText: false,

    });



    return {

      suggestions: {

        title,

        description: descriptionResult.description,

        categoryId: category.categoryId,

        categoryName: category.categoryName,

        tags: [...new Set(tags)],

        confidence: 0.45,

        fieldConfidence: {

          title: 0.25,

          description: 0.5,

          categoryId: category.categoryId ? 0.45 : 0.2,

          tags: 0.4,

        },

        provider: "development",

        model: "heuristic-v2",

        promptVersion: DEVELOPMENT_CATALOG_ENRICHMENT_PROMPT_VERSION,

        generatedAt: new Date().toISOString(),

      },

      analysis: {

        primarySubject,

        secondarySubjects: [],

        theme: "general",

        style: "unknown",

        audience: "general",

        colorPalette: [],

        artworkContainsText: false,
        visibleText: [],
        overallConfidence: 0.45,

        estimatedPrintComplexity: "standard",

      },

    };

  },

};


