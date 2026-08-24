import traits from "@/data/traits.json";
import priorityOptions from "@/data/priorities.json";
import dealBreakerOptions from "@/data/dealbreakers.json";
import educationInterestOptions from "@/data/education-interests.json";
import { enrichProgram, getAreaInfo } from "@/lib/program-insights";

const traitKeys = Object.keys(traits);
const priorityById = Object.fromEntries(priorityOptions.map((item) => [item.id, item]));
const dealBreakerById = Object.fromEntries(dealBreakerOptions.map((item) => [item.id, item]));
const educationInterestById = Object.fromEntries(educationInterestOptions.map((item) => [item.id, item]));
const EDUCATION_INTEREST_BOOST = 0.045;

const SCORE_GROUPS = {
  interests: {
    label: "Intressen",
    traits: ["analys", "teknik", "manniskor", "kreativitet", "affar", "samhalle", "natur", "halsa"],
    weight: 0.48,
  },
  studyStyle: {
    label: "Studiestil",
    traits: ["matematik", "programmering", "teori", "langstudie"],
    weight: 0.22,
  },
  workStyle: {
    label: "Arbetssätt",
    traits: ["praktik", "struktur", "kommunikation", "sjalvstandighet"],
    weight: 0.2,
  },
  futureGoals: {
    label: "Framtidsmål",
    traits: ["ledarskap", "affar", "samhalle", "halsa", "manniskor", "sjalvstandighet"],
    weight: 0.1,
  },
};

const CATEGORY_SPECIFICITY_RULES = {
  "Djur, Lantbruk & Skog": {
    basePenalty: 0.04,
    extraPenalty: 0.07,
    intentFloor: 0.6,
    intentCeiling: 0.8,
    weightedTraits: [
      ["natur", 0.3],
      ["praktik", 0.22],
      ["halsa", 0.12],
      ["struktur", 0.12],
      ["sjalvstandighet", 0.09],
    ],
    eitherTraits: [["teknik", "samhalle"], 0.15],
    distinctiveTraits: ["natur"],
    distinctiveFloor: 0.62,
    distinctiveCeiling: 0.82,
    distinctivePenalty: 0.05,
  },
  "Idrott & Hälsa": {
    basePenalty: 0.04,
    extraPenalty: 0.06,
    intentFloor: 0.6,
    intentCeiling: 0.8,
    weightedTraits: [
      ["halsa", 0.28],
      ["praktik", 0.22],
      ["manniskor", 0.18],
      ["ledarskap", 0.14],
      ["kommunikation", 0.08],
    ],
    eitherTraits: [["samhalle", "sjalvstandighet"], 0.1],
    distinctiveTraits: ["halsa"],
    distinctiveFloor: 0.62,
    distinctiveCeiling: 0.82,
    distinctivePenalty: 0.04,
  },
  "Musik & Scenkonst": {
    basePenalty: 0.06,
    extraPenalty: 0.09,
    intentFloor: 0.62,
    intentCeiling: 0.84,
    weightedTraits: [
      ["kreativitet", 0.34],
      ["kommunikation", 0.2],
      ["praktik", 0.14],
      ["sjalvstandighet", 0.12],
      ["manniskor", 0.08],
    ],
    eitherTraits: [["teori", "ledarskap"], 0.12],
    distinctiveTraits: ["kreativitet"],
    distinctiveFloor: 0.68,
    distinctiveCeiling: 0.88,
    distinctivePenalty: 0.06,
  },
  "Säkerhet & Krishantering": {
    basePenalty: 0.05,
    extraPenalty: 0.07,
    intentFloor: 0.61,
    intentCeiling: 0.82,
    weightedTraits: [
      ["struktur", 0.24],
      ["samhalle", 0.22],
      ["ledarskap", 0.2],
      ["praktik", 0.13],
      ["manniskor", 0.08],
    ],
    eitherTraits: [["analys", "kommunikation"], 0.13],
    distinctiveTraits: ["samhalle"],
    distinctiveFloor: 0.62,
    distinctiveCeiling: 0.82,
    distinctivePenalty: 0.05,
  },
  "Transport & Sjöfart": {
    basePenalty: 0.08,
    extraPenalty: 0.09,
    intentFloor: 0.62,
    intentCeiling: 0.82,
    weightedTraits: [
      ["praktik", 0.22],
      ["struktur", 0.2],
      ["teknik", 0.2],
      ["sjalvstandighet", 0.13],
      ["matematik", 0.1],
    ],
    eitherTraits: [["affar", "sjalvstandighet"], 0.15],
    distinctiveTraits: ["affar", "sjalvstandighet", "matematik"],
    distinctiveFloor: 0.62,
    distinctiveCeiling: 0.82,
    distinctivePenalty: 0.06,
  },
  "Turism, Mat & Service": {
    basePenalty: 0.05,
    extraPenalty: 0.07,
    intentFloor: 0.61,
    intentCeiling: 0.82,
    weightedTraits: [
      ["manniskor", 0.24],
      ["kommunikation", 0.2],
      ["praktik", 0.18],
      ["affar", 0.16],
      ["kreativitet", 0.09],
    ],
    eitherTraits: [["struktur", "ledarskap"], 0.13],
    distinctiveTraits: ["manniskor", "kommunikation", "affar"],
    distinctiveFloor: 0.62,
    distinctiveCeiling: 0.82,
    distinctivePenalty: 0.05,
  },
};

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function categorySpecificityPenalty(profile, program) {
  const rule = CATEGORY_SPECIFICITY_RULES[program.category];
  if (!rule) return 0;

  const weightedSignal = rule.weightedTraits.reduce((sum, [key, weight]) => {
    return sum + clamp01(profile[key] ?? 0.5) * weight;
  }, 0);
  const [eitherKeys, eitherWeight] = rule.eitherTraits;
  const eitherSignal = Math.max(...eitherKeys.map((key) => clamp01(profile[key] ?? 0.5))) * eitherWeight;
  const intent = weightedSignal + eitherSignal;
  const explicitness = clamp01((intent - rule.intentFloor) / (rule.intentCeiling - rule.intentFloor));
  const distinctiveSignal = rule.distinctiveTraits?.length
    ? Math.max(...rule.distinctiveTraits.map((key) => clamp01(profile[key] ?? 0.5)))
    : 1;
  const distinctiveFit = clamp01((distinctiveSignal - (rule.distinctiveFloor ?? 0)) / ((rule.distinctiveCeiling ?? 1) - (rule.distinctiveFloor ?? 0)));

  return rule.basePenalty
    + rule.extraPenalty * (1 - explicitness)
    + (rule.distinctivePenalty || 0) * (1 - distinctiveFit);
}

export function calculateProfile(questions, answers) {
  const totals = Object.fromEntries(traitKeys.map((key) => [key, 0]));
  const answeredMaximums = Object.fromEntries(traitKeys.map((key) => [key, 0]));
  const possibleMaximums = Object.fromEntries(traitKeys.map((key) => [key, 0]));
  let certainAnswers = 0;
  let uncertainAnswers = 0;

  for (const question of questions) {
    const direct = question.weights || {};
    const reverse = question.reverseWeights || {};

    for (const [trait, weight] of [...Object.entries(direct), ...Object.entries(reverse)]) {
      possibleMaximums[trait] += weight;
    }

    const raw = answers[String(question.id)] ?? answers[question.id];
    const answer = Number(raw);
    if (answer === 0) {
      uncertainAnswers += 1;
      continue;
    }
    if (!Number.isFinite(answer) || answer < 1 || answer > 5) continue;

    certainAnswers += 1;
    const normalized = (answer - 1) / 4;

    for (const [trait, weight] of Object.entries(direct)) {
      totals[trait] += normalized * weight;
      answeredMaximums[trait] += weight;
    }

    for (const [trait, weight] of Object.entries(reverse)) {
      totals[trait] += (1 - normalized) * weight;
      answeredMaximums[trait] += weight;
    }
  }

  const profile = Object.fromEntries(
    traitKeys.map((key) => [
      key,
      answeredMaximums[key]
        ? Number((totals[key] / answeredMaximums[key]).toFixed(4))
        : 0.5,
    ])
  );

  const traitConfidence = Object.fromEntries(
    traitKeys.map((key) => [
      key,
      possibleMaximums[key]
        ? Number((answeredMaximums[key] / possibleMaximums[key]).toFixed(4))
        : 1,
    ])
  );

  const totalAnswers = certainAnswers + uncertainAnswers;
  return {
    profile,
    traitConfidence,
    confidence: totalAnswers ? certainAnswers / totalAnswers : 0,
    certainAnswers,
    uncertainAnswers,
  };
}

function priorityFit(vector, selectedPriorities) {
  const valid = (selectedPriorities || []).map((id) => priorityById[id]).filter(Boolean);
  if (!valid.length) return null;

  return valid.reduce((sum, priority) => {
    const values = priority.traits.map((key) => vector[key] ?? 0.5);
    return sum + values.reduce((a, b) => a + b, 0) / values.length;
  }, 0) / valid.length;
}

function selectedEducationInterests(selectedInterests) {
  return (selectedInterests || [])
    .map((id) => educationInterestById[id])
    .filter(Boolean)
    .slice(0, 3);
}

function educationInterestBoost(program, selectedInterests) {
  const matched = selectedEducationInterests(selectedInterests)
    .filter((interest) => (interest.categories || []).includes(program.category));

  if (!matched.length) return { total: 0, details: [] };

  return {
    total: Math.min(0.055, EDUCATION_INTEREST_BOOST + Math.max(0, matched.length - 1) * 0.005),
    details: matched.map(({ id, label }) => ({ id, label })),
  };
}

function traitImportance(profile, traitConfidence, key) {
  const user = profile[key] ?? 0.5;
  const confidence = traitConfidence[key] ?? 1;
  const conviction = 0.72 + Math.abs(user - 0.5) * 1.5;
  return conviction * (0.55 + confidence * 0.45);
}

function groupFit(profile, vector, traitConfidence, keys) {
  let weightedDifference = 0;
  let totalWeight = 0;

  for (const key of keys) {
    const user = profile[key] ?? 0.5;
    const target = vector[key] ?? 0.5;
    const importance = traitImportance(profile, traitConfidence, key);
    const difference = Math.abs(user - target);
    const opposition =
      (user <= 0.3 && target >= 0.72) || (user >= 0.72 && target <= 0.3)
        ? difference * 0.48
        : 0;

    weightedDifference += (difference + opposition) * importance;
    totalWeight += importance;
  }

  return totalWeight ? Math.max(0, Math.min(1, 1 - weightedDifference / totalWeight)) : 0.5;
}

function dealBreakerPenalty(program, selectedDealBreakers) {
  const details = [];
  let total = 0;

  for (const id of selectedDealBreakers || []) {
    const rule = dealBreakerById[id];
    if (!rule) continue;

    let demand = 0;
    if (rule.kind === "trait") demand = Number(program.vector?.[rule.key] ?? 0.5);
    if (rule.kind === "lab") demand = Number(program.studyProfile?.lab ?? 0);
    if (rule.kind === "years") demand = Number(program.years || 0);

    let factor = 0;
    if (rule.kind === "years") {
      if (demand >= rule.threshold) factor = Math.min(1, 0.7 + (demand - rule.threshold) * 0.3);
    } else if (demand > rule.threshold) {
      factor = Math.min(1, (demand - rule.threshold) / Math.max(0.01, 1 - rule.threshold));
      factor = 0.5 + factor * 0.5;
    }

    if (factor <= 0) continue;
    const penalty = rule.maxPenalty * factor;
    total += penalty;
    details.push({
      id: rule.id,
      label: rule.label,
      penalty: Math.round(penalty * 100),
    });
  }

  return { total: Math.min(0.32, total), details };
}

function getContributors(profile, vector, traitConfidence, penaltyDetails = []) {
  const positive = [];
  const negative = [];

  for (const key of traitKeys) {
    const user = profile[key] ?? 0.5;
    const target = vector[key] ?? 0.5;
    const confidence = traitConfidence[key] ?? 1;
    const difference = Math.abs(user - target);
    const conviction = Math.abs(user - 0.5) * 2;
    const weight = 0.65 + confidence * 0.35;

    if (difference <= 0.18 && (conviction >= 0.22 || target >= 0.7)) {
      positive.push({
        key,
        label: traits[key].label,
        strength: (1 - difference) * (0.8 + conviction) * weight,
        text: `Din profil ligger nära utbildningen inom ${traits[key].label.toLowerCase()}.`,
      });
    }

    if (difference >= 0.3 && target >= 0.58) {
      negative.push({
        key,
        label: traits[key].label,
        strength: difference * (0.8 + target) * weight,
        text: `Utbildningen kräver mer ${traits[key].label.toLowerCase()} än dina svar pekar mot.`,
      });
    }
  }

  for (const penalty of penaltyDetails) {
    negative.push({
      key: penalty.id,
      label: penalty.label,
      strength: 3 + penalty.penalty / 10,
      text: `${penalty.label} – cirka ${penalty.penalty} procentenheters avdrag i modellen.`,
      dealBreaker: true,
    });
  }

  return {
    positive: positive.sort((a, b) => b.strength - a.strength).slice(0, 4),
    negative: negative.sort((a, b) => b.strength - a.strength).slice(0, 3),
  };
}

export function scoreProgram(profile, program, traitConfidence, selectedPriorities, selectedDealBreakers, selectedInterests = []) {
  const vector = program.vector || {};
  const breakdown = Object.fromEntries(
    Object.entries(SCORE_GROUPS).map(([id, group]) => [id, groupFit(profile, vector, traitConfidence, group.traits)])
  );

  let base = 0;
  for (const [id, group] of Object.entries(SCORE_GROUPS)) base += breakdown[id] * group.weight;

  const priority = priorityFit(vector, selectedPriorities);
  const priorityAdjusted = priority == null ? base : base * 0.92 + priority * 0.08;
  const interest = educationInterestBoost(program, selectedInterests);
  const dealBreakers = dealBreakerPenalty(program, selectedDealBreakers);
  const specificityPenalty = categorySpecificityPenalty(profile, program);
  const final = Math.max(0, Math.min(1, priorityAdjusted + interest.total - dealBreakers.total - specificityPenalty));
  const contributors = getContributors(profile, vector, traitConfidence, dealBreakers.details);

  return {
    score: final,
    baseScore: base,
    priorityFit: priority,
    interestBoost: interest.total,
    interestDetails: interest.details,
    breakdown,
    dealBreakerPenalty: dealBreakers.total,
    dealBreakerDetails: dealBreakers.details,
    specificityPenalty,
    contributors,
  };
}

function getReasons(profile, vector) {
  return traitKeys
    .map((key) => ({
      key,
      label: traits[key].label,
      strength: Math.min(profile[key] ?? 0.5, vector[key] ?? 0.5) * (0.7 + (profile[key] ?? 0.5)),
      user: profile[key] ?? 0.5,
      target: vector[key] ?? 0.5,
    }))
    .filter((item) => item.user >= 0.57 && item.target >= 0.55)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 4)
    .map((item) => ({ key: item.key, label: item.label }));
}

function getCautions(profile, vector) {
  const demands = traitKeys
    .map((key) => ({
      key,
      label: traits[key].label,
      user: profile[key] ?? 0.5,
      target: vector[key] ?? 0.5,
      gap: (vector[key] ?? 0.5) - (profile[key] ?? 0.5),
    }))
    .filter((item) => item.target >= 0.64 && item.user <= 0.43 && item.gap >= 0.22)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 2)
    .map((item) => ({
      key: item.key,
      label: item.label,
      text: `Utbildningen lutar mer åt ${item.label.toLowerCase()} än vad dina svar gör.`,
    }));

  if (demands.length) return demands;

  return traitKeys
    .map((key) => ({
      key,
      label: traits[key].label,
      user: profile[key] ?? 0.5,
      target: vector[key] ?? 0.5,
      gap: (profile[key] ?? 0.5) - (vector[key] ?? 0.5),
    }))
    .filter((item) => item.user >= 0.72 && item.target <= 0.42 && item.gap >= 0.25)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 1)
    .map((item) => ({
      key: item.key,
      label: item.label,
      text: `Det kan finnas mindre utrymme för ${item.label.toLowerCase()} än du verkar uppskatta.`,
    }));
}

function profileTitle(profile) {
  const top = traitKeys
    .filter((key) => traits[key].group === "core")
    .map((key) => ({ key, value: profile[key] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((item) => item.key);

  const pair = new Set(top.slice(0, 2));
  if (pair.has("teknik") && pair.has("analys")) return "Teknisk problemlösare";
  if (pair.has("affar") && pair.has("analys")) return "Strategisk analytiker";
  if (pair.has("manniskor") && pair.has("halsa")) return "Människonära hjälpare";
  if (pair.has("kreativitet") && pair.has("manniskor")) return "Kreativ kommunikatör";
  if (pair.has("samhalle") && pair.has("manniskor")) return "Samhällsorienterad relationsbyggare";
  if (pair.has("natur") && pair.has("analys")) return "Vetenskaplig utforskare";
  if (pair.has("praktik") && pair.has("teknik")) return "Praktisk innovatör";
  if (pair.has("struktur") && pair.has("analys")) return "Strukturerad analytiker";
  if (pair.has("kreativitet") && pair.has("analys")) return "Kreativ problemlösare";
  return `${traits[top[0]].short} + ${traits[top[1]].short}`;
}

function normalizeTitle(title) {
  return String(title)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/programmet|program|kandidat|master/g, "")
    .replace(/[^a-z0-9åäö]+/g, " ")
    .trim();
}

function diversify(matches, limit = 12) {
  const picked = [];
  const categoryCounts = new Map();
  const titles = new Set();

  for (const item of matches) {
    if (picked.length >= limit) break;
    const titleKey = normalizeTitle(item.title);
    const count = categoryCounts.get(item.category) || 0;
    if (titles.has(titleKey) || count >= 3) continue;
    picked.push(item);
    titles.add(titleKey);
    categoryCounts.set(item.category, count + 1);
  }

  for (const item of matches) {
    if (picked.length >= limit) break;
    if (picked.some((x) => x.id === item.id)) continue;
    picked.push(item);
  }

  return picked;
}

function topUniquePrograms(items, limit = 5) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = normalizeTitle(item.title);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length >= limit) break;
  }
  return result;
}

function averageBreakdown(items) {
  const keys = Object.keys(SCORE_GROUPS);
  return Object.fromEntries(keys.map((key) => {
    const values = items.slice(0, 4).map((item) => item.scoreBreakdown[key]);
    return [key, Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length))];
  }));
}

export function buildMatchResult(profileResult, programs, selectedPriorities = [], selectedDealBreakers = [], selectedInterests = []) {
  const { profile, traitConfidence, confidence, certainAnswers, uncertainAnswers } = profileResult;

  const matches = programs
    .map((rawProgram) => {
      const program = enrichProgram(rawProgram);
      const scoring = scoreProgram(profile, program, traitConfidence, selectedPriorities, selectedDealBreakers, selectedInterests);
      return {
        ...program,
        score: Math.round(scoring.score * 100),
        baseScore: Math.round(scoring.baseScore * 100),
        priorityFit: scoring.priorityFit == null ? null : Math.round(scoring.priorityFit * 100),
        interestBoost: Math.round(scoring.interestBoost * 100),
        interestDetails: scoring.interestDetails,
        scoreBreakdown: Object.fromEntries(Object.entries(scoring.breakdown).map(([key, value]) => [key, Math.round(value * 100)])),
        dealBreakerPenalty: Math.round(scoring.dealBreakerPenalty * 100),
        dealBreakerDetails: scoring.dealBreakerDetails,
        specificityPenalty: Math.round(scoring.specificityPenalty * 100),
        contributors: scoring.contributors,
        reasons: getReasons(profile, program.vector),
        cautions: getCautions(profile, program.vector),
      };
    })
    .sort((a, b) => b.score - a.score || b.baseScore - a.baseScore);

  const categoryBuckets = new Map();
  for (const item of matches) {
    if (!categoryBuckets.has(item.category)) categoryBuckets.set(item.category, []);
    categoryBuckets.get(item.category).push(item);
  }

  const areaGroups = [...categoryBuckets.entries()]
    .map(([category, items]) => {
      const uniquePrograms = topUniquePrograms(items, 5);
      const topScores = uniquePrograms.slice(0, 4).map((item) => item.score);
      const score = Math.round(topScores.reduce((sum, value) => sum + value, 0) / Math.max(1, topScores.length));
      const reasonCounts = new Map();
      uniquePrograms.slice(0, 4).flatMap((item) => item.reasons).forEach((reason) => {
        reasonCounts.set(reason.label, (reasonCounts.get(reason.label) || 0) + 1);
      });
      const reasons = [...reasonCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([label]) => label);
      return {
        category,
        score,
        description: getAreaInfo(category).description,
        reasons,
        scoreBreakdown: averageBreakdown(uniquePrograms),
        liveOfferCount: uniquePrograms.reduce((sum, item) => sum + Number(item.liveOfferCount || 0), 0),
        programs: uniquePrograms,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const strengths = traitKeys
    .map((key) => ({
      key,
      label: traits[key].label,
      short: traits[key].short,
      group: traits[key].group,
      description: traits[key].description,
      value: profile[key],
      confidence: traitConfidence[key],
    }))
    .sort((a, b) => b.value - a.value);

  const selectedPriorityDetails = selectedPriorities
    .map((id) => priorityById[id])
    .filter(Boolean)
    .map(({ id, label, description }) => ({ id, label, description }));

  const selectedDealBreakerDetails = selectedDealBreakers
    .map((id) => dealBreakerById[id])
    .filter(Boolean)
    .map(({ id, label, description }) => ({ id, label, description }));

  const selectedInterestDetails = selectedEducationInterests(selectedInterests)
    .map(({ id, label, description }) => ({ id, label, description }));

  const scoreById = Object.fromEntries(matches.map((item) => [item.id, item.score]));
  const scoreDetailsById = Object.fromEntries(matches.map((item) => [item.id, {
    score: item.score,
    scoreBreakdown: item.scoreBreakdown,
    interestBoost: item.interestBoost,
    interestDetails: item.interestDetails,
    dealBreakerPenalty: item.dealBreakerPenalty,
    contributors: item.contributors,
  }]));

  const topGap = areaGroups.length >= 2 ? areaGroups[0].score - areaGroups[1].score : null;

  return {
    schemaVersion: 8,
    generatedAt: new Date().toISOString(),
    catalogCount: programs.length,
    confidence: Math.round(confidence * 100),
    certainAnswers,
    uncertainAnswers,
    profile,
    traitConfidence,
    profileTitle: profileTitle(profile),
    strengths,
    selectedInterests: selectedInterestDetails,
    selectedPriorities: selectedPriorityDetails,
    selectedDealBreakers: selectedDealBreakerDetails,
    areas: areaGroups.map(({ category, score }) => ({ category, score })),
    areaGroups,
    matches: diversify(matches, 12),
    scoreById,
    scoreDetailsById,
    topAreaGap: topGap,
    matchModel: {
      groups: Object.fromEntries(Object.entries(SCORE_GROUPS).map(([id, item]) => [id, { label: item.label, weight: item.weight }])),
      educationInterestBoost: Math.round(EDUCATION_INTEREST_BOOST * 100),
      explanation: "Totalmatchningen kombinerar intressen, studiestil, arbetssätt och framtidsmål. Eventuella valda intresseområden kan ge en liten boost, prioriteringar kan finjustera resultatet och deal-breakers kan ge tydliga avdrag.",
    },
  };
}

export { SCORE_GROUPS };
