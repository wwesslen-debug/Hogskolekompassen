import { routeQuestionsForMode } from "@/lib/question-router";

export const QUIZ_MODE_IDS = {
  quick: "quick",
  full: "full",
};

export const DEFAULT_QUIZ_MODE = QUIZ_MODE_IDS.full;

export const QUIZ_MODES = {
  [QUIZ_MODE_IDS.quick]: {
    id: QUIZ_MODE_IDS.quick,
    label: "Snabbkompassen",
    resultLabel: "Preliminär profil",
    questionLabel: "15–20 frågor",
    durationLabel: "cirka 5 minuter",
    description: "En snabb men genomtänkt matchning.",
    profilePrecision: "preliminary",
    profilePrecisionLabel: "Preliminär profil",
    minQuestions: 15,
    maxQuestions: 20,
    questionTarget: 20,
    adaptiveLimit: 0,
    questionIds: null,
  },
  [QUIZ_MODE_IDS.full]: {
    id: QUIZ_MODE_IDS.full,
    label: "Djupkompassen",
    resultLabel: "Fördjupad profil",
    questionLabel: "40–60 frågor",
    durationLabel: "cirka 10–15 minuter",
    description: "Fler fördjupningar och ett säkrare, mer nyanserat resultat.",
    profilePrecision: "high",
    profilePrecisionLabel: "Hög profilprecision",
    minQuestions: 40,
    maxQuestions: 55,
    questionTarget: 55,
    adaptiveLimit: 0,
    questionIds: null,
  },
};

export function normalizeQuizMode(value) {
  return QUIZ_MODES[value]?.id || DEFAULT_QUIZ_MODE;
}

export function getQuizModeConfig(value) {
  return QUIZ_MODES[normalizeQuizMode(value)];
}

export function getQuestionsForQuizMode(questions = [], mode = DEFAULT_QUIZ_MODE, answers = {}, options = {}) {
  const config = getQuizModeConfig(mode);
  return routeQuestionsForMode(questions, config, answers, options);
}

export function getQuizModeResultMeta(mode, baseQuestionCount, fullQuestionCount) {
  const config = getQuizModeConfig(mode);
  const maxQuestions = config.maxQuestions || config.questionTarget || fullQuestionCount;
  return {
    quizMode: config.id,
    quizModeLabel: config.label,
    profilePrecision: config.profilePrecision,
    profilePrecisionLabel: config.profilePrecisionLabel,
    baseQuestionCount,
    fullQuestionCount: maxQuestions,
    questionRangeLabel: config.questionLabel,
    durationLabel: config.durationLabel,
    questionCoverage: maxQuestions
      ? Number((baseQuestionCount / maxQuestions).toFixed(2))
      : 1,
  };
}
