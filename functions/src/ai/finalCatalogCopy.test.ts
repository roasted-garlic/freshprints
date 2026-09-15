import assert from "node:assert/strict";
import test from "node:test";

import {
  isImportPlaceholderTitle,
  resolveFinalCatalogCopy,
} from "./finalCatalogCopy";

const categories = [
  { id: "animals", name: "Animals", isActive: true },
  { id: "uncat", name: "Uncategorized", isActive: true },
];

test("resolves complete root catalog authority without replacing it", () => {
  const result = resolveFinalCatalogCopy({
    root: {
      title: "Staff Curated Dogs",
      description: "A staff-authored description.",
      categoryId: "animals",
      catalogTitleSource: "staff",
    },
    candidate: {
      title: "AI Dog Portrait",
      description: "An AI description.",
      categoryId: "animals",
    },
    importSourceFileName: "dogs.png",
    categories,
  });

  assert.equal(result.valid, true);
  assert.equal(result.title, "Staff Curated Dogs");
  assert.equal(result.description, "A staff-authored description.");
  assert.equal(result.categoryId, "animals");
  assert.equal(result.titleSource, "root");
  assert.equal(result.catalogTitleSource, "staff");
});

test("fills filename, blank description, and missing category from the AI candidate", () => {
  const result = resolveFinalCatalogCopy({
    root: {
      title: "just_hit_it",
      description: "",
      categoryId: undefined,
    },
    candidate: {
      title: "Just Hit It Weed Logo",
      description: "A weed logo with bold lettering.",
      categoryId: "animals",
    },
    importSourceFileName: "just_hit_it.png",
    categories,
  });

  assert.equal(result.valid, true);
  assert.equal(result.title, "Just Hit It Weed Logo");
  assert.equal(result.description, "A weed logo with bold lettering.");
  assert.equal(result.categoryId, "animals");
  assert.deepEqual(result.reasonCodes, []);
  assert.equal(result.titleSource, "candidate");
});

test("preserves a genuine root title while filling only missing catalog fields", () => {
  const result = resolveFinalCatalogCopy({
    root: { title: "Staff Dogs", description: "", categoryId: undefined, catalogTitleSource: "staff" },
    candidate: {
      title: "AI Dog Portrait",
      description: "A Boston terrier portrait with a floral bow tie.",
      categoryId: "animals",
    },
    importSourceFileName: "343 Boston Terrier.png",
    categories,
  });

  assert.equal(result.valid, true);
  assert.equal(result.title, "Staff Dogs");
  assert.equal(result.titleSource, "root");
  assert.equal(result.descriptionSource, "candidate");
  assert.equal(result.categorySource, "candidate");
});

test("fails closed when candidate catalog copy is incomplete", () => {
  const result = resolveFinalCatalogCopy({
    root: { title: "just_hit_it", description: "", categoryId: "uncat" },
    candidate: { title: "just_hit_it", description: "", categoryId: "missing" },
    importSourceFileName: "just_hit_it.png",
    categories,
  });

  assert.equal(result.valid, false);
  assert.ok(result.reasonCodes.includes("catalog_copy_title_placeholder"));
  assert.ok(result.reasonCodes.includes("catalog_copy_description_missing"));
  assert.ok(result.reasonCodes.includes("catalog_copy_category_unresolved"));
});

test("replaces an Uncategorized sentinel with the active candidate category", () => {
  const result = resolveFinalCatalogCopy({
    root: {
      title: "Staff Dogs",
      description: "A staff-authored description.",
      categoryId: "uncat",
    },
    candidate: {
      title: "AI Dog Portrait",
      description: "A Boston terrier portrait with a floral bow tie.",
      categoryId: "animals",
    },
    categories,
  });

  assert.equal(result.valid, true);
  assert.equal(result.categoryId, "animals");
  assert.equal(result.categorySource, "candidate");
});

test("recognizes known defaults and opaque legacy basenames only", () => {
  assert.equal(isImportPlaceholderTitle("Imported design"), true);
  assert.equal(isImportPlaceholderTitle("Customer upload"), true);
  assert.equal(isImportPlaceholderTitle("b41e81c7d8"), true);
  const sourceLess = resolveFinalCatalogCopy({
    root: { title: "just_hit_it", description: "", categoryId: undefined },
    candidate: {
      title: "Just Hit It Weed Logo",
      description: "A weed logo with bold lettering.",
      categoryId: "animals",
    },
    categories,
  });
  assert.equal(sourceLess.valid, true);
  assert.equal(sourceLess.title, "Just Hit It Weed Logo");
  const legacy = resolveFinalCatalogCopy({
    root: { title: "343 Boston Terrier", description: "", categoryId: undefined },
    candidate: {
      title: "Boston Terrier Floral Bow Tie Portrait",
      description: "A Boston terrier portrait with a floral bow tie.",
      categoryId: "animals",
    },
    categories,
  });
  assert.equal(legacy.valid, true);
  assert.equal(legacy.title, "Boston Terrier Floral Bow Tie Portrait");
  assert.equal(isImportPlaceholderTitle("1984"), false);
  assert.equal(isImportPlaceholderTitle("Staff Dogs", "dogs.png"), false);
  const numericHuman = resolveFinalCatalogCopy({
    root: { title: "1984 Love", description: "A complete description.", categoryId: "animals" },
    candidate: { title: "AI Title", description: "An AI description.", categoryId: "animals" },
    importSourceFileName: "dogs.png",
    categories,
  });
  assert.equal(numericHuman.title, "AI Title");
  const incompleteNumericHuman = resolveFinalCatalogCopy({
    root: { title: "1984 Love", description: "", categoryId: undefined },
    candidate: {
      title: "AI Title",
      description: "An AI description.",
      categoryId: "animals",
    },
    categories,
  });
  assert.equal(incompleteNumericHuman.title, "AI Title");
  assert.equal(incompleteNumericHuman.description, "An AI description.");
});

test("replaces the observed source-less filename-like legacy titles", () => {
  for (const [rootTitle, candidateTitle] of [
    ["PNG 4", "Skeleton Taking Toaster Bath"],
    ["PNG 6", "Skeleton Takes a Toaster Bath"],
    ["ProjectWhite", "Project Keeping Jesus Busy Christian Faith Heart"],
    ["M4170303i1mimi", "Floral Mimi Typography Graphic"],
  ] as const) {
    const result = resolveFinalCatalogCopy({
      root: { title: rootTitle, description: "", categoryId: undefined },
      candidate: { title: candidateTitle, description: "A valid catalog description.", categoryId: "animals" },
      categories,
    });
    assert.equal(result.valid, true);
    assert.equal(result.title, candidateTitle);
    assert.equal(result.titleSource, "candidate");
    assert.equal(result.catalogTitleSource, "ai_generated");
  }
});

test("replaces low-quality legacy roots even when they are structurally valid", () => {
  for (const [rootTitle, candidateTitle] of [
    ["a large group 2", "Skeleton Relaxing with Coffee, Saying \"No Thanks\""],
    ["drinks coffee black 2", "Skull Coffee Black Butterfly Floral"],
    ["DR pepper png 1-11", "Dr Pepper Est. 1885 Logo"],
    ["chucky", "Chucky Relaxing on Duck Float with Skull Cup"],
    ["Be a nice human", "Be A Nice Human Script Design"],
    ["and this is why I wanted 2", "Skull Butterfly Roses Stay Home Saying"],
  ] as const) {
    const result = resolveFinalCatalogCopy({
      root: { title: rootTitle, description: "Existing valid description.", categoryId: "animals" },
      candidate: { title: candidateTitle, description: "A valid catalog description.", categoryId: "animals" },
      categories,
    });
    assert.equal(result.valid, true);
    assert.equal(result.title, candidateTitle);
    assert.equal(result.titleSource, "candidate");
    assert.equal(result.catalogTitleSource, "ai_generated");
  }
});

test("explicit staff and trusted import authority protect a title even when copy is incomplete", () => {
  for (const catalogTitleSource of ["staff", "trusted_import"] as const) {
    const result = resolveFinalCatalogCopy({
      root: {
        title: "ProjectWhite",
        description: "",
        categoryId: undefined,
        catalogTitleSource,
      },
      candidate: { title: "AI Replacement", description: "A valid catalog description.", categoryId: "animals" },
      categories,
    });
    assert.equal(result.valid, true);
    assert.equal(result.title, "ProjectWhite");
    assert.equal(result.titleSource, "root");
    assert.equal(result.catalogTitleSource, catalogTitleSource);
  }
});

test("generic staff edits do not establish title authority", () => {
  const staff = resolveFinalCatalogCopy({
    root: { title: "PNG 4", description: "", categoryId: undefined, createdBy: "owner", updatedBy: "editor" },
    candidate: { title: "Human Curated Title", description: "A valid catalog description.", categoryId: "animals" },
    categories,
  });
  assert.equal(staff.title, "Human Curated Title");
  assert.equal(staff.catalogTitleSource, "ai_generated");

  const imported = resolveFinalCatalogCopy({
    root: { title: "PNG 4", description: "", categoryId: undefined, sourceCustomerUploadId: "upload-1" },
    candidate: { title: "AI Replacement", description: "A valid catalog description.", categoryId: "animals" },
    categories,
  });
  assert.equal(imported.title, "AI Replacement");
  assert.equal(imported.catalogTitleSource, "ai_generated");
});

test("untrusted roots fail closed when no valid AI candidate exists", () => {
  const result = resolveFinalCatalogCopy({
    root: { title: "drinks coffee black 2", description: "Existing description.", categoryId: "animals" },
    candidate: {},
    categories,
  });
  assert.equal(result.valid, false);
  assert.equal(result.title, undefined);
  assert.ok(result.reasonCodes.includes("catalog_copy_title_untrusted"));
});

test("explicit AI-generated title remains protected on reprocess", () => {
  const result = resolveFinalCatalogCopy({
    root: {
      title: "Skull Coffee Black Butterfly Floral",
      description: "Existing description.",
      categoryId: "animals",
      catalogTitleSource: "ai_generated",
    },
    candidate: { title: "New AI Title", description: "A valid description.", categoryId: "animals" },
    categories,
  });
  assert.equal(result.valid, true);
  assert.equal(result.title, "Skull Coffee Black Butterfly Floral");
  assert.equal(result.catalogTitleSource, "ai_generated");
});

test("matches Windows source paths and extension-stripped numeric basenames", () => {
  const result = resolveFinalCatalogCopy({
    root: { title: "My_Design", description: "", categoryId: undefined },
    candidate: { title: "AI Canonical Design", description: "A valid catalog description.", categoryId: "animals" },
    importSourceFileName: "C:\\imports\\My_Design.PNG",
    categories,
  });
  assert.equal(result.title, "AI Canonical Design");

  const numeric = resolveFinalCatalogCopy({
    root: { title: "12345", description: "", categoryId: undefined },
    candidate: { title: "AI Numbered Design", description: "A valid catalog description.", categoryId: "animals" },
    importSourceFileName: "12345.png",
    categories,
  });
  assert.equal(numeric.title, "AI Numbered Design");
});
