import adaptiveQuestions from "@/data/adaptive-questions.json";
import educationInterestOptions from "@/data/education-interests.json";
import traits from "@/data/traits.json";
import { calculateProfile } from "@/lib/matching";

const CORE_INTEREST_QUESTION_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SECTION_ORDER = [
  "Intressen",
  "Intresse & riktning",
  "Sätt att tänka",
  "Arbetssätt",
  "Framtid & yrkesvardag",
  "Studier & preferenser",
];
const DEFAULT_QUESTION_TARGETS = { quick: 25, full: 50 };
const intentCertaintyLabels = {
  specific: "Jag har en tydlig riktning",
  some: "Jag har några möjliga riktningar",
  explore: "Jag vill upptäcka brett",
};
const interestById = Object.fromEntries(educationInterestOptions.map((item) => [item.id, item]));
const traitKeys = Object.keys(traits);

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function validAnswer(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 5;
}

function hasAnswer(answers, id) {
  return validAnswer(answers?.[String(id)] ?? answers?.[id]);
}

function normalizeSelectedIds(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => (typeof item === "string" ? item : item?.id))
    .filter(Boolean);
}

export function normalizeIntentCertainty(value) {
  return intentCertaintyLabels[value] ? value : "explore";
}

export function getIntentCertaintyLabel(value) {
  return intentCertaintyLabels[normalizeIntentCertainty(value)];
}

function intentAdaptiveBonus(value) {
  const intent = normalizeIntentCertainty(value);
  if (intent === "specific") return 2;
  if (intent === "some") return 1;
  return 0;
}

function intentInterestWeight(value) {
  const intent = normalizeIntentCertainty(value);
  if (intent === "specific") return 0.58;
  if (intent === "some") return 0.42;
  return 0.2;
}

function intentQuestionWeight(value) {
  const intent = normalizeIntentCertainty(value);
  if (intent === "specific") return 5.5;
  if (intent === "some") return 4;
  return 2.3;
}

function questionTargetForConfig(config = {}) {
  if (config.questionTarget) return Number(config.questionTarget);
  if (Array.isArray(config.questionIds)) return config.questionIds.length;
  return DEFAULT_QUESTION_TARGETS[config.id] || DEFAULT_QUESTION_TARGETS.full;
}

function annotateAdaptiveQuestion(question) {
  return {
    section: "Intresse & riktning",
    ...question,
    routedAdaptive: true,
  };
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

function buildTraitSignals(coreQuestions, answers, selectedInterestIds, intentCertainty) {
  const profileResult = calculateProfile(coreQuestions, answers || {});
  const interestProfile = buildInterestTraitProfile(selectedInterestIds, intentCertainty);

  return Object.fromEntries(traitKeys.map((key) => {
    const profileValue = profileResult.profile[key] ?? 0.5;
    const confidence = profileResult.traitConfidence[key] ?? 0;
    const interestValue = interestProfile[key];
    const certainty = 0.55 + confidence * 0.45;
    const blended = interestValue == null
      ? profileValue
      : profileValue * (1 - intentInterestWeight(intentCertainty)) + interestValue * intentInterestWeight(intentCertainty);

    return [key, {
      value: clamp01(blended),
      confidence,
      priority: Math.abs(blended - 0.5) * certainty + (interestValue == null ? 0 : 0.28),
    }];
  }));
}

function maxQuestionWeight(question, trait) {
  return Math.max(
    Number(question.weights?.[trait] || 0),
    Number(question.reverseWeights?.[trait] || 0)
  );
}

function questionPolarity(question, trait) {
  const direct = Number(question.weights?.[trait] || 0);
  const reverse = Number(question.reverseWeights?.[trait] || 0);
  return direct >= reverse ? "positive" : "negative";
}

function selectedInterestMatch(question, selectedInterestIds) {
  const questionInterests = new Set(question.interests || []);
  if (!questionInterests.size) return 0;
  return selectedInterestIds.filter((id) => questionInterests.has(id)).length;
}

function scoreAdaptiveQuestion(question, traitSignals, selectedInterestIds, intentCertainty) {
  const trait = question.trait;
  const signal = traitSignals[trait] || { value: 0.5, priority: 0 };
  const polarity = questionPolarity(question, trait);
  const directionScore = polarity === "negative" ? 1 - signal.value : signal.value;
  const interestMatch = selectedInterestMatch(question, selectedInterestIds);
  const avoidMismatchPenalty = interestMatch && polarity === "negative" && signal.value >= 0.56
    ? intentQuestionWeight(intentCertainty) * 0.75
    : 0;

  return directionScore * 3
    + signal.priority * 3.2
    + interestMatch * intentQuestionWeight(intentCertainty)
    + (question.intent ? 1.1 : 0)
    - avoidMismatchPenalty;
}

function scoreBaseQuestion(question, traitSignals) {
  let score = 0;
  for (const key of traitKeys) {
    const weight = maxQuestionWeight(question, key);
    if (!weight) continue;
    const signal = traitSignals[key] || { value: 0.5, priority: 0 };
    score += weight * (0.65 + signal.priority * 2 + Math.abs(signal.value - 0.5));
  }

  if ([22, 23, 25, 31, 32, 33, 35, 41, 43, 44, 47, 49, 50].includes(Number(question.id))) {
    score += 0.45;
  }

  return score;
}

function sectionRank(question) {
  const index = SECTION_ORDER.indexOf(question.section);
  return index === -1 ? SECTION_ORDER.length : index;
}

function pickAdaptiveQuestions(target, coreCount, traitSignals, selectedInterestIds, intentCertainty) {
  const baseSlots = target <= 25 ? 8 : 16;
  const slots = Math.min(target - coreCount, baseSlots + intentAdaptiveBonus(intentCertainty));
  const maxPerTrait = target <= 25 ? 2 : 3;
  const traitCounts = new Map();
  const picked = [];

  const ranked = adaptiveQuestions
    .map((question) => ({
      question,
      score: scoreAdaptiveQuestion(question, traitSignals, selectedInterestIds, intentCertainty),
    }))
    .sort((a, b) => b.score - a.score || Number(a.question.id) - Number(b.question.id));

  for (const item of ranked) {
    if (picked.length >= slots) break;
    const trait = item.question.trait;
    const count = traitCounts.get(trait) || 0;
    if (count >= maxPerTrait) continue;
    picked.push(annotateAdaptiveQuestion(item.question));
    traitCounts.set(trait, count + 1);
  }

  return picked;
}

function pickBaseFillers(baseQuestions, pickedIds, target, traitSignals) {
  const needed = target - pickedIds.size;
  if (needed <= 0) return [];

  return baseQuestions
    .filter((question) => !pickedIds.has(Number(question.id)))
    .map((question) => ({ question, score: scoreBaseQuestion(question, traitSignals) }))
    .sort((a, b) => b.score - a.score || Number(a.question.id) - Number(b.question.id))
    .slice(0, needed)
    .map((item) => item.question)
    .sort((a, b) => sectionRank(a) - sectionRank(b) || Number(a.id) - Number(b.id));
}

export function getRoutedAdaptiveQuestionCount(questions = []) {
  return questions.filter((question) => question.routedAdaptive).length;
}

export function routeQuestionsForMode(baseQuestions = [], config = {}, answers = {}, options = {}) {
  const target = Math.max(1, Math.min(80, questionTargetForConfig(config)));
  const selectedInterestIds = normalizeSelectedIds(options.selectedInterests || options.interests);
  const intentCertainty = normalizeIntentCertainty(options.intentCertainty);
  const byId = new Map(baseQuestions.map((question) => [Number(question.id), question]));
  const coreQuestions = CORE_INTEREST_QUESTION_IDS
    .map((id) => byId.get(id))
    .filter(Boolean)
    .slice(0, target);

  const traitSignals = buildTraitSignals(coreQuestions, answers, selectedInterestIds, intentCertainty);
  const adaptive = pickAdaptiveQuestions(target, coreQuestions.length, traitSignals, selectedInterestIds, intentCertainty);
  const pickedIds = new Set([...coreQuestions, ...adaptive].map((question) => Number(question.id)));
  const fillers = pickBaseFillers(baseQuestions, pickedIds, target, traitSignals);

  return [...coreQuestions, ...adaptive, ...fillers].slice(0, target);
}
