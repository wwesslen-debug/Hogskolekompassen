import { buildMatchResult, SCORE_GROUPS } from "@/lib/matching";
import { getAreaInfo } from "@/lib/program-insights";
import { inferLiveProgramProfile, scoreLiveOfferingForProfile } from "@/lib/live-profile-inference";

export const LIVE_MATCH_SCHEMA_VERSION = 9;
export const DEFAULT_LIVE_CANDIDATE_LIMIT = 5000;
export const DEFAULT_LIVE_RESULT_LIMIT = 24;

const intentCertaintyMeta = {
  specific: { label: "Jag har en tydlig riktning", interestBoostFactor: 2 },
  some: { label: "Jag har några möjliga riktningar", interestBoostFactor: 1.45 },
  explore: { label: "Jag vill upptäcka brett", interestBoostFactor: 0.85 },
};

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeIntentCertainty(value) {
  return intentCertaintyMeta[value] ? value : "explore";
}

function interestBoostFactorForIntent(value) {
  return intentCertaintyMeta[normalizeIntentCertainty(value)].interestBoostFactor;
}

function dateValue(value) {
  const time = value ? new Date(`${value}T12:00:00`).getTime() : Number.POSITIVE_INFINITY;
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

function applicationRank(offering) {
  const today = new Date().toISOString().slice(0, 10);
  if (offering.applicationDeadline && offering.applicationDeadline >= today && (!offering.applicationOpen || offering.applicationOpen <= today)) return 0;
  if (offering.applicationOpen && offering.applicationOpen > today) return 1;
  if (!offering.applicationDeadline && !offering.applicationOpen) return 2;
  return 3;
}

function offeringKey(offering) {
  return [
    normalizeKey(offering.title),
    offering.providerId || normalizeKey(offering.providerName),
    offering.period || offering.startDate || "",
    normalizeKey(offering.city),
  ].join("|");
}

export function demandPriority(offering) {
  const text = normalizeKey([
    offering.title,
    offering.degree,
    offering.inferredCategory,
    offering.providerName,
  ].join(" "));

  let score = 0;
  if (/(lakare|jurist|psykolog|sjukskoterska|sjukskoterske|socionom|civilingenjor|hogskoleingenjor|systemvetenskap|datavetenskap|dataingenjor|ekonom|ekonomi|foretagsekonomi|larare|amneslarare|grundlarare|forskollarare|arkitekt|fysioterapeut|biomedicinsk analytiker|tandlakare|apotekare|rontgensjukskoterska)/.test(text)) score += 8;
  if (/(kandidatprogram|programmet|program i|yrkesexamen|kandidatexamen|hogskoleexamen)/.test(text)) score += 3;
  if (/(pianostamm|kyrkomusiker|opera|cirkus|dockteater|konsthantverk)/.test(text)) score -= 8;
  if (/(senare del|utbytesstudier|exchange studies|later part)/.test(text)) score -= 20;

  return Math.max(-10, Math.min(10, score));
}

function rankingScore(offering) {
  return Number(offering.personalScore || 0) + demandPriority(offering);
}

export function compareLiveOfferings(a, b) {
  return rankingScore(b) - rankingScore(a)
    || Number(b.personalScore || 0) - Number(a.personalScore || 0)
    || applicationRank(a) - applicationRank(b)
    || Number(b.matchConfidence || 0) - Number(a.matchConfidence || 0)
    || Number(b.linkScore || 0) - Number(a.linkScore || 0)
    || dateValue(a.startDate) - dateValue(b.startDate)
    || String(a.title || "").localeCompare(String(b.title || ""), "sv");
}

function uniqueLiveOfferings(offerings, limit) {
  const seen = new Set();
  const picked = [];

  for (const offering of offerings) {
    const key = offeringKey(offering);
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(offering);
    if (picked.length >= limit) break;
  }

  return picked;
}

function averageBreakdown(items) {
  return Object.fromEntries(Object.keys(SCORE_GROUPS).map((key) => {
    const values = items.slice(0, 8).map((item) => Number(item.scoreBreakdown?.[key] || 0));
    const average = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
    return [key, Math.round(average)];
  }));
}

function buildLiveAreaGroups(scoredOfferings, limit = 6) {
  const buckets = new Map();

  for (const offering of scoredOfferings) {
    const category = offering.inferredCategory || "Brett utbildningsområde";
    if (!buckets.has(category)) buckets.set(category, []);
    buckets.get(category).push(offering);
  }

  return [...buckets.entries()]
    .map(([category, items]) => {
      const rankedItems = [...items].sort(compareLiveOfferings);
      const representative = uniqueLiveOfferings(rankedItems, 8);
      const topScores = representative.slice(0, 5).map((item) => Number(item.personalScore || 0));
      const score = Math.round(topScores.reduce((sum, value) => sum + value, 0) / Math.max(1, topScores.length));
      const scoreBreakdown = averageBreakdown(representative);
      const reasons = Object.entries(scoreBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([key]) => SCORE_GROUPS[key]?.label || key);

      return {
        category,
        score,
        description: getAreaInfo(category).description,
        reasons,
        scoreBreakdown,
        liveOfferCount: items.length,
        programs: representative.slice(0, 5).map((item) => ({
          id: item.id,
          title: item.title,
          category,
          score: item.personalScore,
          providerName: item.providerName,
          city: item.city,
        })),
      };
    })
    .sort((a, b) => b.score - a.score || b.liveOfferCount - a.liveOfferCount || a.category.localeCompare(b.category, "sv"))
    .slice(0, limit);
}

function buildLiveScoreMaps(scoredOfferings) {
  const byProgram = new Map();
  const byOfferingId = {};

  for (const offering of scoredOfferings) {
    if (offering.id != null) byOfferingId[offering.id] = offering.personalScore;
    const programId = Number(offering.canonicalProgramId);
    if (!Number.isInteger(programId) || programId <= 0) continue;
    const previous = byProgram.get(programId);
    if (!previous || Number(offering.personalScore || 0) > Number(previous.personalScore || 0)) {
      byProgram.set(programId, offering);
    }
  }

  const scoreById = {};
  const scoreDetailsById = {};
  for (const [programId, offering] of byProgram.entries()) {
    scoreById[programId] = offering.personalScore;
    scoreDetailsById[programId] = {
      score: offering.personalScore,
      scoreBreakdown: offering.scoreBreakdown,
      interestBoost: offering.interestBoost,
      dealBreakerPenalty: offering.dealBreakerPenalty,
      matchSource: offering.matchSource,
      matchConfidence: offering.matchConfidence,
      liveOfferingId: offering.id,
    };
  }

  return { scoreById, scoreDetailsById, scoreByLiveOfferingId: byOfferingId };
}

export function scoreLiveCandidates(profileResult, candidates, options = {}) {
  const selectedPriorities = options.selectedPriorities || [];
  const selectedDealBreakers = options.selectedDealBreakers || [];
  const selectedInterests = options.selectedInterests || [];
  const interestBoostFactor = interestBoostFactorForIntent(options.intentCertainty);

  return candidates.map((offering) => ({
    ...offering,
    ...scoreLiveOfferingForProfile(offering, profileResult, {
      selectedPriorities,
      selectedDealBreakers,
      selectedInterests,
      interestBoostFactor,
      scoreById: {},
    }),
  })).map((offering) => ({
    ...offering,
    demandPriority: demandPriority(offering),
  }));
}

export function liveOfferingToMatchProgram(offering, index = 0) {
  const inferred = inferLiveProgramProfile(offering);

  return {
    id: index + 1,
    title: inferred.title,
    institution: offering.providerName || "Lärosäte ej angivet",
    city: offering.city || "Flera orter",
    category: inferred.category,
    years: inferred.years,
    degree: inferred.degree || offering.degree || "Program",
    study: offering.distance ? "Distans" : offering.studyForm || "Campus",
    description: offering.description || "Aktuell utbildning från livekatalogen.",
    tags: inferred.inference.evidence || [],
    vector: inferred.vector,
    studyProfile: inferred.studyProfile,
    liveOfferCount: 1,
  };
}

export function buildLiveMatchResult(profileResult, candidates, options = {}) {
  const selectedPriorities = options.selectedPriorities || [];
  const selectedDealBreakers = options.selectedDealBreakers || [];
  const selectedInterests = options.selectedInterests || [];
  const intentCertainty = normalizeIntentCertainty(options.intentCertainty);
  const intentMeta = intentCertaintyMeta[intentCertainty];
  const resultLimit = Math.max(1, Math.min(60, Number(options.limit || DEFAULT_LIVE_RESULT_LIMIT)));
  const baseResult = buildMatchResult(profileResult, [], selectedPriorities, selectedDealBreakers, selectedInterests);
  const scored = scoreLiveCandidates(profileResult, candidates, {
    selectedPriorities,
    selectedDealBreakers,
    selectedInterests,
    intentCertainty,
  });
  const eligible = scored.filter((offering) => Number(offering.personalScore || 0) >= 42);
  const sortedPool = (eligible.length ? eligible : scored).sort(compareLiveOfferings);
  const liveOfferings = uniqueLiveOfferings(sortedPool, resultLimit);
  const areaGroups = buildLiveAreaGroups(eligible.length ? eligible : scored);
  const topGap = areaGroups.length >= 2 ? areaGroups[0].score - areaGroups[1].score : null;
  const scoreMaps = buildLiveScoreMaps(scored);

  return {
    ...baseResult,
    schemaVersion: LIVE_MATCH_SCHEMA_VERSION,
    catalogCount: candidates.length,
    liveCatalogCount: candidates.length,
    liveResultCount: liveOfferings.length,
    matches: [],
    areas: areaGroups.map(({ category, score }) => ({ category, score })),
    areaGroups,
    topAreaGap: topGap,
    scoreById: scoreMaps.scoreById,
    scoreDetailsById: scoreMaps.scoreDetailsById,
    scoreByLiveOfferingId: scoreMaps.scoreByLiveOfferingId,
    liveOfferings,
    intentCertainty,
    intentCertaintyLabel: intentMeta.label,
    liveCoverage: {
      candidateCount: candidates.length,
      scoredCount: scored.length,
      eligibleCount: eligible.length,
      linkedScoreCount: 0,
      inferredOnlyCount: scored.length,
    },
    recommendationMode: "live_only",
    matchModel: {
      ...baseResult.matchModel,
      educationInterestBoost: Math.round(7.5 * intentMeta.interestBoostFactor),
      explanation: "Matchningen räknas direkt mot aktuella liveutbildningar från Susa-navet. Katalogprofiler används inte för att rangordna resultatet; direkta intresseval får större vikt när användaren själv säger att riktningen redan är tydlig.",
    },
  };
}
