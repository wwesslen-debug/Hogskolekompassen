import adaptiveQuestions from "@/data/adaptive-questions.json";
import educationInterestOptions from "@/data/education-interests.json";
import traits from "@/data/traits.json";
import { calculateProfile } from "@/lib/matching";

const BREADTH_QUESTION_IDS = [3, 5, 6, 7, 8, 9, 4];
const EARLY_ROUTED_QUESTION_IDS = [1049];
const DEFAULT_MODE_LIMITS = {
  quick: { min: 15, max: 20 },
  full: { min: 40, max: 55 },
};

const purposeTargets = {
  deepen: 0.6,
  differentiate: 0.25,
  challenge: 0.15,
  validate: 0.15,
  explore: 0.1,
};

const intentCertaintyLabels = {
  specific: "Jag har en tydlig riktning",
  some: "Jag har några möjliga riktningar",
  explore: "Jag vill upptäcka brett",
};

const interestById = Object.fromEntries(educationInterestOptions.map((item) => [item.id, item]));
const traitKeys = Object.keys(traits);

const FIELD_MODELS = {
  technology: {
    label: "Teknik & IT",
    traits: { teknik: 0.95, programmering: 0.85, analys: 0.65, matematik: 0.55, praktik: 0.25 },
  },
  economics: {
    label: "Ekonomi & Management",
    traits: { affar: 0.95, analys: 0.65, ledarskap: 0.55, struktur: 0.35, kommunikation: 0.25 },
  },
  medicine: {
    label: "Vård & Hälsa",
    traits: { halsa: 0.95, manniskor: 0.75, natur: 0.45, praktik: 0.45, struktur: 0.35 },
  },
  socialScience: {
    label: "Samhälle & Politik",
    traits: { samhalle: 0.95, analys: 0.65, kommunikation: 0.55, manniskor: 0.3, teori: 0.25 },
  },
  humanities: {
    label: "Humaniora & Språk",
    traits: { kommunikation: 0.8, kreativitet: 0.55, teori: 0.55, samhalle: 0.45, sjalvstandighet: 0.3 },
  },
  law: {
    label: "Juridik & Rättsvetenskap",
    traits: { samhalle: 0.9, analys: 0.75, struktur: 0.7, kommunikation: 0.6, teori: 0.45 },
  },
  naturalScience: {
    label: "Naturvetenskap",
    traits: { natur: 0.9, analys: 0.75, matematik: 0.65, teori: 0.65, struktur: 0.35 },
  },
  design: {
    label: "Design & Kommunikation",
    traits: { kreativitet: 0.95, kommunikation: 0.65, praktik: 0.45, sjalvstandighet: 0.4, teknik: 0.2 },
  },
  education: {
    label: "Pedagogik & Lärare",
    traits: { manniskor: 0.85, kommunikation: 0.75, ledarskap: 0.55, praktik: 0.4, struktur: 0.25 },
  },
};

const interestFieldMap = {
  "gaming-digital-worlds": ["technology", "design"],
  "music-sound-performance": ["design", "humanities", "education"],
  "art-design-creation": ["design", "humanities"],
  "film-media-stories": ["humanities", "design", "socialScience"],
  "people-psychology-learning": ["education", "medicine", "socialScience"],
  "society-justice-impact": ["law", "socialScience"],
  "business-money-entrepreneurship": ["economics", "technology"],
  "nature-animals-environment": ["naturalScience", "medicine"],
  "health-training-wellbeing": ["medicine", "education"],
  "building-tech-problem-solving": ["technology", "naturalScience"],
};

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function validAnswer(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 5;
}

function answerValue(answers, id) {
  const value = answers?.[String(id)] ?? answers?.[id];
  return validAnswer(value) ? Number(value) : null;
}

function hasAnswer(answers, id) {
  return answerValue(answers, id) != null;
}

function normalizeSelectedIds(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => (typeof item === "string" ? item : item?.id))
    .filter((id) => interestById[id]);
}

export function normalizeIntentCertainty(value) {
  return intentCertaintyLabels[value] ? value : "explore";
}

export function getIntentCertaintyLabel(value) {
  return intentCertaintyLabels[normalizeIntentCertainty(value)];
}

export function resolveIntentCertainty(answers = {}, explicitValue = null) {
  if (intentCertaintyLabels[explicitValue]) return explicitValue;
  const certaintyAnswer = answerValue(answers, 1049);
  if (certaintyAnswer == null || certaintyAnswer === 0) return "explore";
  if (certaintyAnswer >= 4) return "specific";
  if (certaintyAnswer === 3) return "some";
  return "explore";
}

function modeLimits(config = {}) {
  const defaults = DEFAULT_MODE_LIMITS[config.id] || DEFAULT_MODE_LIMITS.full;
  const min = Math.max(1, Number(config.minQuestions || defaults.min));
  const max = Math.max(min, Number(config.maxQuestions || config.questionTarget || defaults.max));
  return { min, max };
}

function questionPolarity(question, trait) {
  const direct = Number(question.weights?.[trait] || 0);
  const reverse = Number(question.reverseWeights?.[trait] || 0);
  return direct >= reverse ? "positive" : "negative";
}

function maxQuestionWeight(question, trait) {
  return Math.max(
    Number(question.weights?.[trait] || 0),
    Number(question.reverseWeights?.[trait] || 0)
  );
}

function questionTraitWeight(question, trait) {
  return Number(question.weights?.[trait] || 0) + Number(question.reverseWeights?.[trait] || 0);
}

function touchedTraits(question) {
  return traitKeys.filter((key) => questionTraitWeight(question, key) > 0);
}

function intentInterestWeight(intentCertainty) {
  const intent = normalizeIntentCertainty(intentCertainty);
  if (intent === "specific") return 0.52;
  if (intent === "some") return 0.36;
  return 0.14;
}

function inferInterestScore(question, answer) {
  if (!question?.interests?.length || !validAnswer(answer) || Number(answer) === 0) return 0;
  const traitsForQuestion = touchedTraits(question);
  const strongestTrait = traitsForQuestion
    .map((trait) => ({ trait, weight: maxQuestionWeight(question, trait) }))
    .sort((a, b) => b.weight - a.weight)[0]?.trait;
  const polarity = strongestTrait ? questionPolarity(question, strongestTrait) : "positive";
  const centered = (Number(answer) - 3) / 2;
  return polarity === "negative" ? -centered : centered;
}

export function inferSelectedInterestsFromAnswers(questions = [], answers = {}, explicitInterests = []) {
  const scores = new Map(normalizeSelectedIds(explicitInterests).map((id) => [id, 1.5]));

  for (const question of questions) {
    const signal = inferInterestScore(question, answerValue(answers, question.id));
    if (signal <= 0) continue;
    for (const id of question.interests || []) {
      if (!interestById[id]) continue;
      scores.set(id, (scores.get(id) || 0) + signal);
    }
  }

  return [...scores.entries()]
    .filter(([, score]) => score >= 0.55)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);
}

function buildInterestTraitProfile(selectedInterestIds, intentCertainty) {
  const weight = intentInterestWeight(intentCertainty);
  const totals = Object.fromEntries(traitKeys.map((key) => [key, 0]));
  const counts = Object.fromEntries(traitKeys.map((key) => [key, 0]));

  for (const id of selectedInterestIds) {
    const interest = interestById[id];
    if (!interest) continue;
    for (const [trait, value] of Object.entries(interest.traits || {})) {
      if (!traitKeys.includes(trait)) continue;
      totals[trait] += clamp01(value);
      counts[trait] += 1;
    }
  }

  return Object.fromEntries(traitKeys.map((key) => {
    if (!counts[key]) return [key, null];
    return [key, clamp01(totals[key] / counts[key] * weight + 0.5 * (1 - weight))];
  }));
}

function buildTraitSignals(pathQuestions, answers, selectedInterestIds, intentCertainty) {
  const profileResult = calculateProfile(pathQuestions, answers || {});
  const interestProfile = buildInterestTraitProfile(selectedInterestIds, intentCertainty);

  return Object.fromEntries(traitKeys.map((key) => {
    const profileValue = profileResult.profile[key] ?? 0.5;
    const confidence = profileResult.traitConfidence[key] ?? 0;
    const interestValue = interestProfile[key];
    const interestWeight = interestValue == null ? 0 : intentInterestWeight(intentCertainty);
    const blended = profileValue * (1 - interestWeight) + (interestValue ?? profileValue) * interestWeight;
    const conviction = Math.abs(blended - 0.5) * 2;

    return [key, {
      value: clamp01(blended),
      confidence,
      priority: conviction * (0.45 + confidence * 0.55) + (interestValue == null ? 0 : 0.18),
    }];
  }));
}

function fieldScore(field, traitSignals) {
  const entries = Object.entries(field.traits);
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  return entries.reduce((sum, [trait, weight]) => {
    return sum + (traitSignals[trait]?.value ?? 0.5) * weight;
  }, 0) / totalWeight;
}

function buildFieldScores(traitSignals, selectedInterestIds) {
  const scores = Object.entries(FIELD_MODELS).map(([id, field]) => {
    let score = fieldScore(field, traitSignals);
    for (const interestId of selectedInterestIds) {
      if ((interestFieldMap[interestId] || []).includes(id)) score += 0.08;
    }
    return { id, label: field.label, score: clamp01(score) };
  });
  return scores.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "sv"));
}

function buildRoutingState(pathQuestions, answers, explicitInterests = [], explicitIntentCertainty = null) {
  const intentCertainty = resolveIntentCertainty(answers, explicitIntentCertainty);
  const selectedInterestIds = inferSelectedInterestsFromAnswers(pathQuestions, answers, explicitInterests);
  const traitSignals = buildTraitSignals(pathQuestions, answers, selectedInterestIds, intentCertainty);
  const fields = buildFieldScores(traitSignals, selectedInterestIds);
  const confidenceValues = Object.values(traitSignals).map((item) => item.confidence);
  const averageConfidence = confidenceValues.reduce((sum, value) => sum + value, 0) / Math.max(1, confidenceValues.length);
  const answeredCount = pathQuestions.filter((question) => hasAnswer(answers, question.id)).length;
  const topGap = fields.length >= 2 ? fields[0].score - fields[1].score : 1;

  return {
    answeredCount,
    averageConfidence,
    fields,
    intentCertainty,
    selectedInterestIds,
    topGap,
    traitSignals,
  };
}

function classifyQuestion(question, state) {
  const traitsForQuestion = touchedTraits(question);
  const topField = state.fields[0];
  const secondField = state.fields[1];
  const topFieldTraits = topField ? FIELD_MODELS[topField.id]?.traits || {} : {};
  const secondFieldTraits = secondField ? FIELD_MODELS[secondField.id]?.traits || {} : {};
  const interestMatch = (question.interests || []).some((id) => state.selectedInterestIds.includes(id));

  if (topField && secondField && Math.abs(topField.score - secondField.score) <= 0.09) {
    const separatesTopPair = traitsForQuestion.some((trait) => {
      return Math.abs(Number(topFieldTraits[trait] || 0) - Number(secondFieldTraits[trait] || 0)) >= 0.22;
    });
    if (separatesTopPair) return "differentiate";
  }

  const challengesStrongTrait = traitsForQuestion.some((trait) => {
    const signal = state.traitSignals[trait] || { value: 0.5 };
    return signal.value >= 0.64 && questionPolarity(question, trait) === "negative";
  });
  if (challengesStrongTrait) return "challenge";

  if (interestMatch || question.intent || traitsForQuestion.some((trait) => Number(topFieldTraits[trait] || 0) >= 0.5)) {
    return "deepen";
  }

  const validatesUncertainTrait = traitsForQuestion.some((trait) => {
    const signal = state.traitSignals[trait] || { confidence: 1, priority: 0 };
    return signal.confidence < 0.55 && signal.priority >= 0.18;
  });
  if (validatesUncertainTrait) return "validate";

  return "explore";
}

function purposeCounts(pathQuestions) {
  return pathQuestions.reduce((counts, question) => {
    if (!question.routedAdaptive && !question.routedPurpose) return counts;
    const purpose = question.routedPurpose || question.purpose || "deepen";
    counts[purpose] = (counts[purpose] || 0) + 1;
    return counts;
  }, {});
}

function purposeNeed(purpose, counts, routedCount) {
  const targetShare = purposeTargets[purpose] || 0.1;
  const currentShare = routedCount ? (counts[purpose] || 0) / routedCount : 0;
  return Math.max(0, targetShare - currentShare);
}

function fieldDifferenceScore(question, state) {
  const topField = state.fields[0];
  const secondField = state.fields[1];
  if (!topField || !secondField) return 0;
  const topTraits = FIELD_MODELS[topField.id]?.traits || {};
  const secondTraits = FIELD_MODELS[secondField.id]?.traits || {};
  return touchedTraits(question).reduce((sum, trait) => {
    return sum + Math.abs(Number(topTraits[trait] || 0) - Number(secondTraits[trait] || 0)) * maxQuestionWeight(question, trait);
  }, 0);
}

function challengeScore(question, state) {
  return touchedTraits(question).reduce((sum, trait) => {
    const signal = state.traitSignals[trait] || { value: 0.5, confidence: 0 };
    if (questionPolarity(question, trait) !== "negative") return sum;
    return sum + Math.max(0, signal.value - 0.55) * (0.7 + signal.confidence) * maxQuestionWeight(question, trait);
  }, 0);
}

function deepenScore(question, state) {
  const topField = state.fields[0];
  const topTraits = topField ? FIELD_MODELS[topField.id]?.traits || {} : {};
  const interestMatch = (question.interests || []).filter((id) => state.selectedInterestIds.includes(id)).length;
  return touchedTraits(question).reduce((sum, trait) => {
    const signal = state.traitSignals[trait] || { priority: 0 };
    return sum + (Number(topTraits[trait] || 0) + signal.priority) * maxQuestionWeight(question, trait);
  }, interestMatch * 1.4 + (question.intent ? 0.45 : 0));
}

function validationScore(question, state) {
  return touchedTraits(question).reduce((sum, trait) => {
    const signal = state.traitSignals[trait] || { confidence: 1, priority: 0 };
    return sum + (1 - signal.confidence) * (0.45 + signal.priority) * maxQuestionWeight(question, trait);
  }, 0);
}

function exploreScore(question, state) {
  return touchedTraits(question).reduce((sum, trait) => {
    const signal = state.traitSignals[trait] || { confidence: 0 };
    return sum + (1 - signal.confidence) * maxQuestionWeight(question, trait);
  }, 0);
}

function annotateRoutedQuestion(question, purpose) {
  return {
    ...question,
    section: question.section || "Intresse & riktning",
    routedAdaptive: !question.section,
    routedPurpose: purpose,
  };
}

function chooseNextQuestion(pathQuestions, candidates, state, limits) {
  const picked = new Set(pathQuestions.map((question) => Number(question.id)));
  const counts = purposeCounts(pathQuestions);
  const routedCount = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const minChallengeCount = limits.max <= 20 ? 2 : 6;
  const minDifferentiateCount = limits.max <= 20 ? 3 : 10;

  const ranked = candidates
    .filter((question) => !picked.has(Number(question.id)))
    .map((question) => {
      const purpose = classifyQuestion(question, state);
      let score = 0;
      if (purpose === "differentiate") score += fieldDifferenceScore(question, state) * 3.2;
      if (purpose === "challenge") score += challengeScore(question, state) * 4;
      if (purpose === "deepen") score += deepenScore(question, state) * 2.4;
      if (purpose === "validate") score += validationScore(question, state) * 2.8;
      if (purpose === "explore") score += exploreScore(question, state) * 1.8;
      score += purposeNeed(purpose, counts, routedCount) * 2.4;
      if (purpose === "challenge" && (counts.challenge || 0) < minChallengeCount) score += 1.2;
      if (purpose === "differentiate" && (counts.differentiate || 0) < minDifferentiateCount) score += 1.3;
      if (question.intent) score += state.intentCertainty === "specific" ? 0.9 : 0.35;
      return { question, purpose, score };
    })
    .sort((a, b) => b.score - a.score || Number(a.question.id) - Number(b.question.id));

  const pickedItem = ranked[0];
  return pickedItem ? annotateRoutedQuestion(pickedItem.question, pickedItem.purpose) : null;
}

function profileIsStable(state, limits) {
  if (state.answeredCount < limits.min) return false;
  const topScore = state.fields[0]?.score ?? 0.5;
  const gapNeeded = limits.max <= 20 ? 0.16 : 0.13;
  const confidenceNeeded = limits.max <= 20 ? 0.54 : 0.68;
  return topScore >= 0.62 && state.topGap >= gapNeeded && state.averageConfidence >= confidenceNeeded;
}

export function getRoutedAdaptiveQuestionCount(questions = []) {
  return questions.filter((question) => question.routedAdaptive || question.routedPurpose).length;
}

export function routeQuestionsForMode(baseQuestions = [], config = {}, answers = {}, options = {}) {
  const limits = modeLimits(config);
  const explicitInterests = normalizeSelectedIds(options.selectedInterests || options.interests);
  const explicitIntentCertainty = options.intentCertainty;
  const adaptiveById = new Map(adaptiveQuestions.map((question) => [Number(question.id), question]));
  const baseById = new Map(baseQuestions.map((question) => [Number(question.id), question]));
  const allCandidates = [...baseQuestions, ...adaptiveQuestions];
  const pathQuestions = [];

  for (const id of BREADTH_QUESTION_IDS) {
    const question = baseById.get(id);
    if (question && pathQuestions.length < limits.max) pathQuestions.push(question);
  }

  for (const id of EARLY_ROUTED_QUESTION_IDS) {
    const question = adaptiveById.get(id);
    if (question && pathQuestions.length < limits.max) {
      pathQuestions.push(annotateRoutedQuestion(question, "explore"));
    }
  }

  while (pathQuestions.length < limits.max) {
    const state = buildRoutingState(pathQuestions, answers, explicitInterests, explicitIntentCertainty);
    if (profileIsStable(state, limits)) break;
    const nextQuestion = chooseNextQuestion(pathQuestions, allCandidates, state, limits);
    if (!nextQuestion) break;
    pathQuestions.push(nextQuestion);
  }

  return pathQuestions;
}
