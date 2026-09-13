import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveThemeCategory } from "./catalogThemeCategoryResolver";

const APPROVED_CATEGORIES = [
  { id: "cat-family", name: "Family", description: "Motherhood, parenting, fatherhood, and family relationship themes." },
  {
    id: "cat-pop",
    name: "Pop Culture & Characters",
    description:
      "Characters, fandoms, movies, TV, cartoons, games, memes — not primarily music-based. Choose Music & Bands for band/musician/album identity.",
  },
  {
    id: "cat-music",
    name: "Music & Bands",
    description:
      "Music, bands, singers, musicians, concerts, albums, instruments, and music-lover identity. Prefer over Pop when music is the buyer intent.",
  },
  {
    id: "cat-faith-worship",
    name: "Faith & Worship",
    description: "Christian faith, religion, spirituality, worship, prayer, scripture, and church identity.",
  },
  {
    id: "cat-inspirational",
    name: "Inspirational Quotes & Affirmations",
    description: "Motivational quotes, affirmations, positivity, and uplifting sayings.",
  },
  { id: "cat-humor", name: "Humorous Quotes", description: "Funny sayings and comedic quote-driven designs." },
  {
    id: "cat-funny",
    name: "Funny & Sarcastic",
    description: "Humor, sarcasm, snark, attitude, joke value, or witty phrase as the strongest buyer reason.",
  },
  {
    id: "cat-animals",
    name: "Animals",
    description:
      "Use when an animal, pet, breed, or farm animal identity is the main subject. Choose Cute & Whimsical when exaggerated cute or whimsical aesthetic dominates.",
  },
  {
    id: "cat-cute",
    name: "Cute & Whimsical",
    description:
      "Use when the primary buyer appeal is cute, playful, charming, whimsical, quirky, storybook, or childlike aesthetic rather than the literal subject alone.",
  },
  {
    id: "cat-occupations",
    name: "Occupations",
    description: "Jobs, careers, professions, and workplace identity including nurses and teachers as roles.",
  },
  {
    id: "cat-holiday",
    name: "Holiday & Seasonal",
    description: "Holidays, seasons, Halloween, Christmas, and calendar celebrations.",
  },
  {
    id: "cat-school",
    name: "School & Education",
    description: "School, classroom, education, and academic themes.",
  },
  {
    id: "cat-food",
    name: "Food & Drink",
    description: "Food, beverages, recipes, and culinary themes.",
  },
  {
    id: "cat-cannabis",
    name: "Cannabis & 420",
    description: "Cannabis, weed, marijuana leaves, 420 culture, and stoner humor themes.",
  },
  {
    id: "cat-zodiac",
    name: "Astrology & Zodiac",
    description: "Zodiac signs, horoscopes, astrology, birth signs, and celestial personality themes.",
  },
  { id: "cat-faith", name: "Faith", description: "Christian, religious, and faith-based designs." },
  { id: "cat-teacher", name: "Teacher", description: "Teacher, school, and classroom themed designs." },
];

/**
 * Shared lean joke-primary evidence for F-CAW-F-class designs.
 * Same bag for Animals exact and Food & Drink exact — no secret "humorous joke" description.
 * Themes carry humor/sarcasm; title/desc/visibleText alone are not humor-lexical enough.
 */
const JOKE_PRIMARY_LEAN_SIGNALS = {
  title: "F-caw-f Raven",
  description: "A black raven with outstretched wings and bold distressed lettering above the bird.",
  visibleText: ["F-CAW-F"],
  subjects: ["raven"],
  themes: ["humor", "sarcasm", "animal humor"],
  interests: [] as string[],
  searchConcepts: [] as string[],
  matchedTags: [] as string[],
};

const IDS_BY_NAME: Record<string, string> = Object.fromEntries(
  APPROVED_CATEGORIES.map((category) => [category.name.toLowerCase(), category.id]),
);

describe("resolveThemeCategory", () => {
  it("exact-matches a raw category that copies an approved name (case/punctuation tolerant), trusting the AI directly", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "pop culture and characters",
        title: "Wednesday Addams Portrait",
        description: "An illustrated portrait of the recognizable character Wednesday Addams.",
        matchedTags: ["wednesday", "characters"],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Pop Culture & Characters");
    assert.equal(result.categoryId, "cat-pop");
  });

  it("review note 1 golden case (fallback scorer): raw category 'Humorous Quotes & Sayings' (not an exact approved name) with motherhood/skeleton/quote tags resolves to Family", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Humorous Quotes & Sayings",
        title: "Motherhood Rocks Skeleton",
        description:
          "A skeleton with its hair in a messy bun and a bandana, giving the rock on hand gesture. The text says 'Some days I rock it - Some days it rocks me - Either way we're rockin' MOTHERHOOD'.",
        matchedTags: ["motherhood", "skeleton", "quote", "funny"],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Family");
    assert.equal(result.categoryId, "cat-family");
  });

  it("does not force Pop Culture & Characters just because a skeleton/cartoon style is present (fallback scorer, no exact category match)", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Pop Culture Style",
        title: "Motherhood Skeleton Design",
        description: "A cartoon skeleton illustration celebrating motherhood.",
        matchedTags: ["motherhood", "skeleton", "cartoon"],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Family");
  });

  it("resolves Faith when faith/religious terms are present (fallback scorer, no exact category match)", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Inspirational",
        title: "Blessed and Faithful",
        description: "A design with a cross and the word blessed, celebrating Christian faith.",
        matchedTags: ["faith", "blessed", "cross"],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Faith & Worship");
  });

  it("resolves Teacher when school/teacher terms are present (fallback scorer, no exact category match)", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "School Life",
        title: "Best Teacher Ever",
        description: "A design celebrating teachers and the classroom.",
        matchedTags: ["teacher", "school"],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Teacher");
  });

  it("does not force Humorous Quotes from a bare quote signal without a humor signal (fallback scorer, no exact category match)", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Quotes",
        title: "Motherhood Quote Design",
        description: "A design with an inspirational quote about motherhood.",
        matchedTags: ["motherhood", "quote"],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.notEqual(result.categoryName, "Humorous Quotes");
  });

  it("resolves Humorous Quotes when both quote and humor signals are present with no stronger competing theme (fallback scorer, no exact category match)", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Funny Sayings",
        title: "Funny Quote Design",
        description: "A funny quote design with a comedic joke about coffee.",
        matchedTags: ["funny", "quote", "coffee"],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Humorous Quotes");
  });

  it("resolves a genuine recognizable character to Pop Culture & Characters (fallback scorer, no exact category match)", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Pop Culture Characters and Franchises",
        title: "Wednesday Addams Portrait",
        description: "An illustrated portrait of the recognizable character Wednesday Addams.",
        matchedTags: ["wednesday", "characters"],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Pop Culture & Characters");
  });

  it("returns undefined (not the raw candidate) when no approved category clears the minimum score", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Nature Landscapes",
        title: "Abstract Shapes",
        description: "An abstract geometric pattern with no clear theme.",
        matchedTags: [],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, undefined);
    assert.equal(result.categoryId, undefined);
  });

  it("only picks from approved categories, never invents or returns the raw candidate literally", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Completely Made Up Category",
        title: "Random Design",
        description: "Nothing that matches any approved category.",
        matchedTags: [],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    if (result.categoryName) {
      assert.ok(APPROVED_CATEGORIES.some((category) => category.name === result.categoryName));
    } else {
      assert.equal(result.categoryName, undefined);
    }
  });

  it("owner #1 lean bag: joke-primary overrides exact Animals → Funny & Sarcastic", () => {
    const result = resolveThemeCategory(
      {
        ...JOKE_PRIMARY_LEAN_SIGNALS,
        rawCategory: "Animals",
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Funny & Sarcastic");
    assert.equal(result.categoryId, "cat-funny");
  });

  it("owner #1 lean bag parity: SAME signals + exact Food & Drink → Funny & Sarcastic", () => {
    const result = resolveThemeCategory(
      {
        ...JOKE_PRIMARY_LEAN_SIGNALS,
        rawCategory: "Food & Drink",
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Funny & Sarcastic");
    assert.equal(result.categoryId, "cat-funny");
  });

  it("owner #1 lean bag: exact Funny & Sarcastic remains Funny & Sarcastic", () => {
    const result = resolveThemeCategory(
      {
        ...JOKE_PRIMARY_LEAN_SIGNALS,
        rawCategory: "Funny & Sarcastic",
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Funny & Sarcastic");
    assert.equal(result.categoryId, "cat-funny");
  });

  // CASE B — animal is the product; at most one weak humor lexical; no pun/joke structure.
  // Signal bag: funny tag only; no themes/searchConcepts humor structure; portrait copy.
  it("CASE B incidental humor: exact Animals + single weak funny tag + no joke structure → Animals", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Animals",
        title: "Golden Retriever Portrait",
        description: "A realistic portrait of a golden retriever dog.",
        visibleText: [],
        subjects: ["golden retriever"],
        themes: [],
        interests: [],
        searchConcepts: [],
        matchedTags: ["dog", "retriever", "pet", "funny"],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Animals");
    assert.equal(result.categoryId, "cat-animals");
  });

  it("owner #9 class: cannabis-primary humor overrides exact Funny & Sarcastic → Cannabis & 420", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Funny & Sarcastic",
        title: "Just Hit It Marijuana Leaves",
        description: "Athletic branding merged with cannabis culture and marijuana leaf imagery.",
        matchedTags: ["cannabis", "marijuana", "funny", "weed"],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Cannabis & 420");
    assert.equal(result.categoryId, "cat-cannabis");
  });

  it("owner #12 class: zodiac/astrology overrides exact Pop Culture → Astrology & Zodiac", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Pop Culture & Characters",
        title: "Aries Lively Versatile Passionate Courageous Positive Adventurous Ram",
        description: "A ram design featuring Aries zodiac traits and astrology personality words.",
        matchedTags: ["aries", "zodiac", "astrology", "ram"],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Astrology & Zodiac");
    assert.equal(result.categoryId, "cat-zodiac");
  });

  it("owner #13 golden: franchise + father wording keeps exact Pop Culture (not Family)", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Pop Culture & Characters",
        title: "I Am Their Father Darth Vader Star Wars",
        description: "Darth Vader holding a lightsaber with the text I AM THEIR FATHER.",
        matchedTags: ["starwars", "darthvader", "dad", "movie", "fandom", "grogu", "bobafett"],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Pop Culture & Characters");
    assert.equal(result.categoryId, "cat-pop");
  });

  it("themes-fed humor path: lean copy + themes humor/sarcasm, no funny tags → Funny over Animals", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Animals",
        title: "Raven Lettering Design",
        description: "A black bird with bold distressed lettering above.",
        visibleText: ["HELLO"],
        subjects: ["raven"],
        themes: ["humor", "sarcasm"],
        matchedTags: [],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Funny & Sarcastic");
  });

  it("searchConcepts-fed pun/joke path: no themes, pun+funny in searchConcepts → Funny over Animals", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Animals",
        title: "Raven Lettering Design",
        description: "A black bird with bold distressed lettering above.",
        visibleText: [],
        subjects: ["raven"],
        themes: [],
        searchConcepts: ["funny bird pun", "sarcastic raven", "animal pun"],
        matchedTags: [],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Funny & Sarcastic");
  });

  it("visibleText slogan alone: short slogan + no non-visibleText humor → NO humor override (Animals)", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Animals",
        title: "Raven",
        description: "A raven illustration.",
        visibleText: ["F-CAW-F"],
        subjects: ["raven"],
        themes: [],
        interests: [],
        searchConcepts: [],
        matchedTags: [],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Animals");
  });

  it("exact-match remains stable when no stronger competing dominant-intent family applies", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Animals",
        title: "Golden Retriever Portrait",
        description: "A realistic portrait of a golden retriever dog.",
        matchedTags: ["dog", "retriever", "pet"],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Animals");
    assert.equal(result.categoryId, "cat-animals");
  });
});

/** Live-shaped Judas Priest Painkiller SP (Wt5eILv4uyCnYNoJI8uZ) — no artist hardcodes in production rule. */
const JUDAS_PRIEST_MUSIC_SIGNALS = {
  title: "Judas Priest Painkiller",
  description:
    'The design features the text "Judas Priest" in a metallic, jagged font above a winged figure riding a motorcycle with a dragon head.',
  visibleText: ["Judas Priest", "PAINKILLER"],
  subjects: ["character", "dragon"],
  objects: ["motorcycle", "wings"],
  themes: ["music", "heavy metal", "iconic"],
  interests: ["music", "heavy metal", "rock music", "pop culture"],
  professionsGroups: ["musicians"],
  searchConcepts: [
    "band logo",
    "album art",
    "song art",
    "metal band",
    "heavy metal music",
    "rock band",
    "dragon biker",
    "winged biker",
    "epic fantasy",
    "fiery scene",
  ],
};

describe("resolveThemeCategory — Music vs Pop dominant-intent (resolver-only)", () => {
  it("Judas Priest Painkiller: exact Pop + multi music SP → Music & Bands (with tags)", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Pop Culture & Characters",
        ...JUDAS_PRIEST_MUSIC_SIGNALS,
        matchedTags: ["warrior", "band"],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Music & Bands");
    assert.equal(result.categoryId, "cat-music");
  });

  it("Judas Priest Painkiller: Music override still succeeds with matchedTags empty (tag-retirement compatible)", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Pop Culture & Characters",
        ...JUDAS_PRIEST_MUSIC_SIGNALS,
        matchedTags: [],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Music & Bands");
  });

  it("Judas Priest without professionsGroups still overrides when themes/interests/searchConcepts agree", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Pop Culture & Characters",
        title: JUDAS_PRIEST_MUSIC_SIGNALS.title,
        description: JUDAS_PRIEST_MUSIC_SIGNALS.description,
        visibleText: JUDAS_PRIEST_MUSIC_SIGNALS.visibleText,
        subjects: JUDAS_PRIEST_MUSIC_SIGNALS.subjects,
        objects: JUDAS_PRIEST_MUSIC_SIGNALS.objects,
        themes: JUDAS_PRIEST_MUSIC_SIGNALS.themes,
        interests: JUDAS_PRIEST_MUSIC_SIGNALS.interests,
        searchConcepts: JUDAS_PRIEST_MUSIC_SIGNALS.searchConcepts,
        matchedTags: [],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Music & Bands");
  });

  it("Dolly sheet-music competitive: exact Pop + music SP → Music & Bands", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Pop Culture & Characters",
        title: "Dolly Parton I Will Always Love You Sheet Music Portrait",
        description: "A portrait of Dolly Parton with sheet music and the song title I Will Always Love You.",
        visibleText: ["I WILL ALWAYS LOVE YOU", "DOLLY PARTON"],
        subjects: ["Dolly Parton", "person"],
        objects: ["hat", "music sheet"],
        themes: ["music", "iconic", "love song"],
        interests: ["country music", "music", "singers"],
        professionsGroups: ["musicians"],
        searchConcepts: [
          "country singer",
          "sheet music design",
          "iconic singer",
          "music fan gift",
          "music legend",
        ],
        matchedTags: [],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Music & Bands");
  });

  it("Scooby Pop negative: exact Pop + cartoon/animation → stays Pop (no Music override)", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Pop Culture & Characters",
        title: "Scooby-doo Bursting Through",
        description: "Scooby-Doo bursting through a wall in classic cartoon style.",
        visibleText: [],
        subjects: ["Scooby-Doo", "dog"],
        objects: ["hole", "collar"],
        themes: ["pop culture", "animation", "iconic", "playful"],
        interests: ["animation", "cartoons", "pop culture", "dogs"],
        searchConcepts: [
          "Scooby Doo character",
          "cartoon dog",
          "kids cartoon",
          "TV show character",
          "animated character",
        ],
        matchedTags: [],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Pop Culture & Characters");
  });

  it("Faith exact remains Faith & Worship (never Music-stolen)", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Faith & Worship",
        title: "I Can Do All Things Through Christ Who Strengthens Me Cross",
        description: "A cross with the Philippians verse about Christ.",
        visibleText: ["I CAN", "DO", "ALL", "THINGS THROUGH", "CHRIST"],
        themes: ["faith", "inspirational", "religious"],
        interests: ["christianity"],
        searchConcepts: ["Christian message", "scripture art", "worship", "Jesus Christ"],
        matchedTags: ["jesus", "god"],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Faith & Worship");
  });

  it("Pop exact with faith-dominant evidence blocks Music override; structured challenge may select Faith", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Pop Culture & Characters",
        title: "Jesus Band Worship Night",
        description: "A faith design mentioning a worship band and prayer.",
        themes: ["faith", "worship", "music"],
        interests: ["christianity", "music"],
        professionsGroups: ["musicians"],
        searchConcepts: ["church worship", "prayer", "band logo", "album art"],
        matchedTags: [],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    // Music override must not win (faith life-role gate). Generalized challenge may prefer Faith.
    assert.notEqual(result.categoryName, "Music & Bands");
    assert.equal(result.categoryName, "Faith & Worship");
  });

  it("Inspirational exact remains Inspirational (no Pop→Music path)", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Inspirational Quotes & Affirmations",
        title: "If You See Someone Without A Smile Give Em Yours Dolly",
        description: "An inspirational Dolly quote about sharing a smile.",
        themes: ["positivity", "kindness", "inspiration", "inspirational"],
        interests: ["inspirational"],
        searchConcepts: ["dolly parton quote", "be kind", "famous quotes"],
        matchedTags: [],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Inspirational Quotes & Affirmations");
  });

  it("incidental lone music word in Pop copy does not override without identity + multi-dimension agreement", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Pop Culture & Characters",
        title: "Mario Kart Victory",
        description: "A playful racing scene with a hint of background music notes.",
        themes: ["gaming", "cartoon"],
        interests: ["nintendo", "gaming"],
        searchConcepts: ["mario kart", "video game character", "cartoon racer"],
        matchedTags: [],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Pop Culture & Characters");
  });

  it("movie/franchise Pop stays Pop even if one music hobby interest appears", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Pop Culture & Characters",
        title: "Star Wars Poster",
        description: "An iconic movie franchise poster design.",
        themes: ["movie", "franchise", "fandom"],
        interests: ["movies", "music"],
        searchConcepts: ["star wars", "darth vader", "movie poster"],
        matchedTags: [],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Pop Culture & Characters");
  });

  it("professionsGroups musicians contributes to music dimension agreement", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Pop Culture & Characters",
        title: "Stage Performer Portrait",
        description: "A portrait celebrating a live performer.",
        themes: ["music"],
        interests: [],
        professionsGroups: ["musicians"],
        searchConcepts: ["concert tour", "band merch"],
        matchedTags: [],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Music & Bands");
  });
});

/** Live-shaped Highland cow SP (swcJl3RvjTFsf5hp04Ze) — aesthetic-dominant, not cow-hardcoded. */
const HIGHLAND_COW_CUTE_SIGNALS = {
  title: "Highland Cow With Flowers And Bow",
  description:
    "A whimsical illustrated highland cow with oversized expressive eyes, a decorative bow, and flowers.",
  visibleText: [] as string[],
  subjects: ["highland cow", "cow"],
  objects: ["bow", "flowers"],
  styles: ["illustration", "cute", "whimsical", "hand-drawn", "graphic"],
  themes: ["cute", "whimsical", "country life", "animal love"],
  interests: ["animals", "pets", "country life", "farming"],
  searchConcepts: [
    "cute cow",
    "adorable animal",
    "animal with flowers",
    "animal with bow",
    "whimsical cow",
    "cute farm",
  ],
  matchedTags: ["cartoon", "country", "western"],
};

describe("resolveThemeCategory — exact-match structured-evidence challenge (Cute / Animals)", () => {
  it("Highland cow: exact Animals + strong cute SP → Cute & Whimsical (with tags)", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Animals",
        ...HIGHLAND_COW_CUTE_SIGNALS,
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Cute & Whimsical");
    assert.equal(result.categoryId, "cat-cute");
  });

  it("Highland cow: Cute override still succeeds with matchedTags empty (tag-retirement compatible)", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Animals",
        ...HIGHLAND_COW_CUTE_SIGNALS,
        matchedTags: [],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Cute & Whimsical");
  });

  it("literal dog breed Animals negative: exact Animals stays Animals", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Animals",
        title: "Golden Retriever Portrait",
        description: "A realistic portrait of a golden retriever dog.",
        subjects: ["golden retriever", "dog"],
        objects: [],
        styles: ["realistic", "portrait"],
        themes: ["pets", "dog breed"],
        interests: ["animals", "dogs", "pets"],
        searchConcepts: ["golden retriever", "dog lover", "pet portrait"],
        matchedTags: [],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Animals");
  });

  it("ordinary highland cow Animals negative: animal identity dominates without aesthetic stack", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Animals",
        title: "Highland Cow",
        description: "A straightforward illustration of a highland cow in a field.",
        subjects: ["highland cow", "cow"],
        objects: [],
        styles: ["illustration"],
        themes: ["farm animals", "livestock"],
        interests: ["animals", "farming", "cattle"],
        searchConcepts: ["highland cattle", "scottish cow", "farm animal"],
        matchedTags: [],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Animals");
  });

  it("cute styling present but not dominant: weak single cute token does not overturn Animals", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Animals",
        title: "Farm Cat",
        description: "A farm cat sitting on a fence.",
        subjects: ["cat"],
        objects: [],
        styles: ["illustration"],
        themes: ["pets"],
        interests: ["animals", "cats"],
        searchConcepts: ["farm cat", "cute pet"],
        matchedTags: [],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Animals");
  });

  it("Cute cross-subject whimsical pumpkin: exact Animals → Cute & Whimsical", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Animals",
        title: "Whimsical Smiling Pumpkin",
        description: "A playful storybook pumpkin with oversized eyes and a charming grin.",
        subjects: ["pumpkin"],
        objects: ["bow"],
        styles: ["cute", "whimsical", "storybook"],
        themes: ["cute", "whimsical", "playful"],
        interests: ["halloween decor"],
        searchConcepts: ["cute pumpkin", "whimsical pumpkin", "adorable autumn"],
        matchedTags: [],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Cute & Whimsical");
  });

  it("protected Holiday exact is not stolen by cute aesthetic challenge", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Holiday & Seasonal",
        title: "Cute Halloween Ghost",
        description: "A cute whimsical ghost for Halloween.",
        subjects: ["ghost"],
        styles: ["cute", "whimsical"],
        themes: ["halloween", "cute", "whimsical"],
        interests: ["halloween"],
        searchConcepts: ["cute halloween ghost", "whimsical spooky"],
        matchedTags: [],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Holiday & Seasonal");
  });

  it("protected Occupations exact is not stolen by cute aesthetic challenge", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Occupations",
        title: "Whimsical Nurse",
        description: "A cute whimsical nurse character celebrating nursing.",
        subjects: ["nurse"],
        styles: ["cute", "whimsical"],
        themes: ["nursing", "cute", "whimsical"],
        interests: ["nurses", "healthcare"],
        professionsGroups: ["nurses"],
        searchConcepts: ["cute nurse", "whimsical nurse art"],
        matchedTags: [],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Occupations");
  });

  it("protected Faith exact remains Faith with cute styling present", () => {
    const result = resolveThemeCategory(
      {
        rawCategory: "Faith & Worship",
        title: "Cute Scripture Lamb",
        description: "A cute whimsical lamb with a faith scripture verse.",
        subjects: ["lamb"],
        styles: ["cute", "whimsical"],
        themes: ["faith", "worship", "cute"],
        interests: ["christian"],
        searchConcepts: ["scripture", "cute faith art"],
        matchedTags: [],
        approvedCategories: APPROVED_CATEGORIES,
      },
      IDS_BY_NAME,
    );

    assert.equal(result.categoryName, "Faith & Worship");
  });
});
