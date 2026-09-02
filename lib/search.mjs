const SEARCH_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "att",
  "av",
  "de",
  "den",
  "det",
  "eller",
  "en",
  "ett",
  "for",
  "fran",
  "i",
  "in",
  "med",
  "mot",
  "och",
  "of",
  "om",
  "or",
  "pa",
  "som",
  "the",
  "till",
]);

const SEARCH_SYNONYMS = {
  ekonomi: ["ekonomi", "foretagsekonomi", "nationalekonomi", "affar", "business"],
  it: ["it", "informationsteknik", "informatik", "systemvetenskap", "data", "digital", "programmering", "mjukvara"],
  ai: ["ai", "artificiell", "intelligens", "machine", "learning"],
};

export function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function getSearchAlternatives(term) {
  if (term.length <= 2) return [term];
  return unique([term, ...(SEARCH_SYNONYMS[term] || [])]);
}

export function parseSearchQuery(value) {
  const phrase = normalizeSearchText(value);
  const terms = unique(phrase.split(/\s+/).filter((term) => term && !SEARCH_STOP_WORDS.has(term))).slice(0, 8);
  return {
    phrase,
    terms,
    groups: terms.map((term) => ({
      term,
      alternatives: getSearchAlternatives(term).slice(0, 8),
    })),
  };
}

function escapeRegExp(value) {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

export function isShortSearchTerm(term) {
  return term.length <= 2;
}

export function tokenRegex(term) {
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(term)}([^\\p{L}\\p{N}]|$)`, "u");
}

export function normalizedTextMatchesTerm(text, term) {
  const normalized = normalizeSearchText(text);
  if (!normalized) return false;
  return isShortSearchTerm(term) ? tokenRegex(term).test(normalized) : normalized.includes(term);
}

export function normalizedTextMatchesGroup(text, group) {
  return group.alternatives.some((term) => normalizedTextMatchesTerm(text, term));
}

export function matchesSearch(parts, search) {
  if (!search?.groups?.length) return true;
  const haystack = parts.filter(Boolean).join(" ");
  return search.groups.every((group) => normalizedTextMatchesGroup(haystack, group));
}

function fieldScore(text, group, primaryScore, synonymScore) {
  if (!text) return 0;
  if (normalizedTextMatchesTerm(text, group.term)) return primaryScore;
  return group.alternatives.slice(1).some((term) => normalizedTextMatchesTerm(text, term)) ? synonymScore : 0;
}

export function scoreSearchMatch(parts, search) {
  if (!search?.groups?.length) return 0;

  const title = normalizeSearchText(parts.title);
  const provider = normalizeSearchText(parts.provider);
  const category = normalizeSearchText(parts.category);
  const degree = normalizeSearchText(parts.degree);
  const city = normalizeSearchText(parts.city);
  const description = normalizeSearchText(parts.description);
  const tags = normalizeSearchText((parts.tags || []).join(" "));
  const phrase = search.phrase;

  let score = 0;

  if (phrase) {
    if (title === phrase) score += 5000;
    else if (title.startsWith(phrase)) score += 1800;
    else if (title.includes(phrase)) score += 1200;

    if (provider === phrase) score += 900;
    else if (provider.includes(phrase)) score += 450;
  }

  const allPrimaryTermsInTitle = search.groups.every((group) => normalizedTextMatchesTerm(title, group.term));
  const allTermsInTitle = search.groups.every((group) => normalizedTextMatchesGroup(title, group));
  if (allPrimaryTermsInTitle && search.groups.length > 1) score += 1400;
  else if (allTermsInTitle && search.groups.length > 1) score += 800;

  for (const group of search.groups) {
    score += fieldScore(title, group, 300, 180);
    score += fieldScore(tags, group, 170, 110);
    score += fieldScore(category, group, 150, 90);
    score += fieldScore(degree, group, 80, 45);
    score += fieldScore(provider, group, 70, 35);
    score += fieldScore(city, group, 55, 25);
    score += fieldScore(description, group, 45, 30);
  }

  return score;
}
