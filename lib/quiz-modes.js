import { routeQuestionsForMode } from "@/lib/question-router";

export const QUIZ_MODE_IDS = {
  quick: "quick",
  full: "full",
};

export const DEFAULT_QUIZ_MODE = QUIZ_MODE_IDS.full;

export const QUIZ_MODES = {
  [QUIZ_MODE_IDS.quick]: {
    id: QUIZ_MODE_IDS.quick,
    label: "Snabbtest",
    resultLabel: "Preliminär profil",
    questionLabel: "25 frågor",
    description: "En kort adaptiv väg som börjar med dina intressen och väljer resten utifrån tidiga signaler.",
    profilePrecision: "preliminary",
    profilePrecisionLabel: "Preliminär profil",
    questionTarget: 25,
    adaptiveLimit: 0,
    questionIds: [
      2, 3, 5, 7, 9,
      12, 13, 14, 16, 20,
      22, 23, 24, 25, 29,
      31, 32, 33, 34, 35,
      41, 43, 44, 47, 49,
    ],
  },
  [QUIZ_MODE_IDS.full]: {
    id: QUIZ_MODE_IDS.full,
    label: "Hela kompassen",
    resultLabel: "Fördjupad profil",
    questionLabel: "50 frågor",
    description: "En längre adaptiv väg där direkta intressefrågor ersätter mindre relevanta standardfrågor.",
    profilePrecision: "high",
    profilePrecisionLabel: "Hög profilprecision",
    questionTarget: 50,
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
  return {
    quizMode: config.id,
    quizModeLabel: config.label,
    profilePrecision: config.profilePrecision,
    profilePrecisionLabel: config.profilePrecisionLabel,
    baseQuestionCount,
    fullQuestionCount,
    questionCoverage: fullQuestionCount
      ? Number((baseQuestionCount / fullQuestionCount).toFixed(2))
      : 1,
  };
}
