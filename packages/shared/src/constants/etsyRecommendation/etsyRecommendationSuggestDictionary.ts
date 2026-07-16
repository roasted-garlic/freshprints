import {
  ETSY_RECOMMENDATION_OCCASION_OPTIONS,
  ETSY_RECOMMENDATION_SUBJECT_OPTIONS,
} from "./etsyRecommendation.constants";

export interface EtsyRecommendationSuggestEntry {
  id: string;
  label: string;
  apiToken: string;
  aliases?: readonly string[];
}

function entry(
  id: string,
  label: string,
  apiToken: string,
  aliases?: readonly string[],
): EtsyRecommendationSuggestEntry {
  return aliases?.length ? { id, label, apiToken, aliases } : { id, label, apiToken };
}

/** Extra high-signal DTF subjects beyond the legacy curated chip list. */
const EXTRA_SUGGEST_ENTRIES: readonly EtsyRecommendationSuggestEntry[] = [
  entry("doctor", "Doctor", "doctor", ["md", "physician"]),
  entry("goose", "Goose", "goose", ["geese"]),
  entry("geese", "Geese", "geese", ["goose"]),
  entry("raccoon", "Raccoon", "raccoon", ["racoon", "trash panda"]),
  entry("frog", "Frog", "frog", ["toad"]),
  entry("grinch", "Grinch", "grinch"),
  entry("jason_voorhees", "Jason Voorhees", "jason voorhees", ["jason", "friday the 13th"]),
  entry("freddy_krueger", "Freddy Krueger", "freddy krueger", ["freddy", "nightmare on elm street"]),
  entry("pennywise", "Pennywise", "pennywise", ["it clown"]),
  entry("addams_family", "Addams Family", "addams family", ["adams family"]),
  entry("wednesday_addams", "Wednesday Addams", "wednesday addams", ["wednesday"]),
  entry("gomez_addams", "Gomez Addams", "gomez addams", ["gomez"]),
  entry("friends_tv", "Friends", "friends", ["friends tv", "central perk"]),
  entry("charlie_brown", "Charlie Brown", "charlie brown", ["peanuts"]),
  entry("snoopy", "Snoopy", "snoopy"),
  entry("goofy", "Goofy", "goofy"),
  entry("cars_movie", "Cars", "cars", ["lightning mcqueen", "mcqueen"]),
  entry("80s", "80s", "80s", ["1980s", "eighties", "80's"]),
  entry("90s", "90s", "90s", ["1990s", "nineties", "90's"]),
  entry("70s", "70s", "70s", ["1970s", "seventies", "70's"]),
  entry("2000s", "2000s", "2000s", ["y2k"]),
  entry("owl", "Owl", "owl"),
  entry("fox", "Fox", "fox"),
  entry("wolf", "Wolf", "wolf"),
  entry("eagle", "Eagle", "eagle"),
  entry("shark", "Shark", "shark"),
  entry("turtle", "Turtle", "turtle"),
  entry("penguin", "Penguin", "penguin"),
  entry("bunny", "Bunny", "bunny", ["rabbit"]),
  entry("moose", "Moose", "moose"),
  entry("deer", "Deer", "deer"),
  entry("axolotl", "Axolotl", "axolotl"),
  entry("corgi", "Corgi", "corgi"),
  entry("labrador", "Labrador", "labrador", ["lab"]),
  entry("pitbull", "Pitbull", "pitbull", ["pit bull"]),
  entry("poodle", "Poodle", "poodle"),
  entry("husky", "Husky", "husky"),
  entry("astronaut", "Astronaut", "astronaut"),
  entry("chef", "Chef", "chef", ["cook"]),
  entry("mechanic", "Mechanic", "mechanic"),
  entry("farmer", "Farmer", "farmer"),
  entry("trucker", "Trucker", "trucker"),
  entry("hairdresser", "Hairdresser", "hairdresser", ["stylist"]),
  entry("lawyer", "Lawyer", "lawyer", ["attorney"]),
  entry("accountant", "Accountant", "accountant"),
  entry("engineer", "Engineer", "engineer"),
  entry("veterinarian", "Veterinarian", "veterinarian", ["vet"]),
  entry("dental", "Dental / dentist", "dentist", ["dental"]),
  entry("batman", "Batman", "batman"),
  entry("spiderman", "Spider-Man", "spiderman", ["spider man", "spidey"]),
  entry("superman", "Superman", "superman"),
  entry("wonder_woman", "Wonder Woman", "wonder woman"),
  entry("joker", "Joker", "joker"),
  entry("harley_quinn", "Harley Quinn", "harley quinn"),
  entry("disney", "Disney", "disney"),
  entry("mickey", "Mickey Mouse", "mickey mouse", ["mickey"]),
  entry("minnie", "Minnie Mouse", "minnie mouse", ["minnie"]),
  entry("stitch", "Stitch", "stitch", ["lilo stitch"]),
  entry("elsa", "Elsa", "elsa", ["frozen"]),
  entry("mario", "Mario", "mario"),
  entry("luigi", "Luigi", "luigi"),
  entry("pokemon", "Pokemon", "pokemon", ["pokémon"]),
  entry("pikachu", "Pikachu", "pikachu"),
  entry("harry_potter", "Harry Potter", "harry potter"),
  entry("hogwarts", "Hogwarts", "hogwarts"),
  entry("star_wars", "Star Wars", "star wars"),
  entry("mandalorian", "Mandalorian", "mandalorian", ["baby yoda", "grogu"]),
  entry("stranger_things", "Stranger Things", "stranger things"),
  entry("barbie", "Barbie", "barbie"),
  entry("ken", "Ken", "ken"),
  entry("cowboy", "Cowboy", "cowboy"),
  entry("cowgirl", "Cowgirl", "cowgirl"),
  entry("mermaid", "Mermaid", "mermaid"),
  entry("pirate", "Pirate", "pirate"),
  entry("alien", "Alien", "alien"),
  entry("zombie", "Zombie", "zombie"),
  entry("vampire", "Vampire", "vampire"),
  entry("werewolf", "Werewolf", "werewolf"),
  entry("pumpkin", "Pumpkin", "pumpkin"),
  entry("snowman", "Snowman", "snowman"),
  entry("reindeer", "Reindeer", "reindeer"),
  entry("santa", "Santa", "santa", ["santa claus"]),
  entry("elf", "Elf", "elf"),
  entry("rainbow", "Rainbow", "rainbow"),
  entry("mushroom", "Mushroom", "mushroom"),
  entry("butterfly", "Butterfly", "butterfly"),
  entry("bee", "Bee", "bee"),
  entry("sun", "Sun", "sun"),
  entry("moon", "Moon", "moon"),
  entry("star", "Star", "star"),
  entry("guitar", "Guitar", "guitar"),
  entry("book", "Book / reading", "book", ["reading", "reader"]),
  entry("camera", "Camera", "camera"),
  entry("makeup", "Makeup", "makeup", ["beauty"]),
  entry("sneaker", "Sneaker", "sneaker", ["shoes"]),
  entry("jeep", "Jeep", "jeep"),
  entry("motorcycle", "Motorcycle", "motorcycle", ["bike"]),
  entry("boat", "Boat", "boat"),
  entry("airplane", "Airplane", "airplane", ["plane"]),
  entry("beach", "Beach", "beach"),
  entry("mountain", "Mountain", "mountain"),
  entry("lake", "Lake", "lake"),
  entry("christmas_tree", "Christmas tree", "christmas tree"),
  entry("hanukkah", "Hanukkah", "hanukkah", ["chanukah"]),
  entry("pride", "Pride", "pride"),
  entry("nurse_life", "Nurse life", "nurse life"),
  entry("teacher_life", "Teacher life", "teacher life"),
  entry("mama", "Mama", "mama"),
  entry("papa", "Papa", "papa"),
  entry("mimi", "Mimi", "mimi"),
  entry("nana", "Nana", "nana"),
  entry("daddy", "Daddy", "daddy"),
  entry("nephew", "Nephew", "nephew"),
  entry("niece", "Niece", "niece"),
  entry("aunt", "Aunt", "aunt", ["auntie"]),
  entry("uncle", "Uncle", "uncle"),
  entry("bride", "Bride", "bride"),
  entry("groom", "Groom", "groom"),
  entry("bridesmaid", "Bridesmaid", "bridesmaid"),
  entry("softball", "Softball", "softball"),
  entry("volleyball", "Volleyball", "volleyball"),
  entry("hockey", "Hockey", "hockey"),
  entry("golf", "Golf", "golf"),
  entry("wrestling", "Wrestling", "wrestling"),
  entry("cheerleader", "Cheerleader", "cheerleader"),
  entry("band", "Band", "band"),
  entry("drama", "Drama", "drama"),
  entry("science", "Science", "science"),
  entry("math", "Math", "math"),
  entry("pickleball", "Pickleball", "pickleball"),
  entry("golf_cart", "Golf cart", "golf cart"),
  entry("camper", "Camper / RV", "camper", ["rv"]),
  entry("four_wheeler", "Four wheeler", "four wheeler", ["atv"]),
  entry("highland_cow_face", "Highland cow face", "highland cow face"),
];

function fromLegacyPickers(): EtsyRecommendationSuggestEntry[] {
  const fromSubjects = ETSY_RECOMMENDATION_SUBJECT_OPTIONS.map((option) =>
    entry(option.id, option.label, option.apiToken),
  );
  const fromOccasions = ETSY_RECOMMENDATION_OCCASION_OPTIONS.map((option) =>
    entry(`occasion_${option.id}`, option.label, option.apiToken),
  );
  return [...fromSubjects, ...fromOccasions];
}

function dedupeById(entries: readonly EtsyRecommendationSuggestEntry[]): EtsyRecommendationSuggestEntry[] {
  const seen = new Set<string>();
  const out: EtsyRecommendationSuggestEntry[] = [];
  for (const item of entries) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

/** Full suggest dictionary (legacy subjects + occasions + extras). Expand in follow-ups. */
export const ETSY_RECOMMENDATION_SUGGEST_DICTIONARY: readonly EtsyRecommendationSuggestEntry[] =
  dedupeById([...fromLegacyPickers(), ...EXTRA_SUGGEST_ENTRIES]);

export interface SuggestDictionaryMatch {
  entry: EtsyRecommendationSuggestEntry;
  /** Normalized phrase that matched (label, alias, or apiToken). */
  matchedPhrase: string;
}

function normalizeMatchKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** All searchable phrases for an entry, longest first for greedy match. */
export function suggestEntryPhrases(entry: EtsyRecommendationSuggestEntry): string[] {
  const phrases = new Set<string>();
  phrases.add(normalizeMatchKey(entry.label));
  phrases.add(normalizeMatchKey(entry.apiToken));
  for (const alias of entry.aliases ?? []) {
    const normalized = normalizeMatchKey(alias);
    if (normalized) {
      phrases.add(normalized);
    }
  }
  return [...phrases].filter(Boolean).sort((a, b) => b.length - a.length || a.localeCompare(b));
}

/**
 * Autocomplete / typeahead: case-insensitive includes on label, apiToken, aliases.
 * Pass `entries` to search a merged list (static + admin overlays); defaults to static seed.
 */
export function matchSuggestDictionary(
  query: string,
  limit = 12,
  entries: readonly EtsyRecommendationSuggestEntry[] = ETSY_RECOMMENDATION_SUGGEST_DICTIONARY,
): EtsyRecommendationSuggestEntry[] {
  const needle = normalizeMatchKey(query);
  if (!needle || needle.length < 1) {
    return [];
  }
  const scored: Array<{ entry: EtsyRecommendationSuggestEntry; score: number }> = [];
  for (const item of entries) {
    const phrases = suggestEntryPhrases(item);
    let best = Number.POSITIVE_INFINITY;
    for (const phrase of phrases) {
      if (phrase === needle) {
        best = 0;
        break;
      }
      if (phrase.startsWith(needle)) {
        best = Math.min(best, 1);
      } else if (phrase.includes(needle)) {
        best = Math.min(best, 2);
      }
    }
    if (best < Number.POSITIVE_INFINITY) {
      scored.push({ entry: item, score: best });
    }
  }
  scored.sort(
    (a, b) =>
      a.score - b.score ||
      a.entry.label.length - b.entry.label.length ||
      a.entry.label.localeCompare(b.entry.label),
  );
  return scored.slice(0, limit).map((row) => row.entry);
}

/** Flat list of { phrase, entry } sorted longest-phrase-first for greedy subject parsing. */
let cachedPhraseIndex: Array<{ phrase: string; entry: EtsyRecommendationSuggestEntry }> | null =
  null;

export function getSuggestDictionaryPhraseIndex(): Array<{
  phrase: string;
  entry: EtsyRecommendationSuggestEntry;
}> {
  if (cachedPhraseIndex) {
    return cachedPhraseIndex;
  }
  const rows: Array<{ phrase: string; entry: EtsyRecommendationSuggestEntry }> = [];
  for (const item of ETSY_RECOMMENDATION_SUGGEST_DICTIONARY) {
    for (const phrase of suggestEntryPhrases(item)) {
      rows.push({ phrase, entry: item });
    }
  }
  rows.sort((a, b) => b.phrase.length - a.phrase.length || a.phrase.localeCompare(b.phrase));
  cachedPhraseIndex = rows;
  return rows;
}
