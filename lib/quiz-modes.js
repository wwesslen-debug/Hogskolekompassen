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
    description: "Ett balanserat urval som ger en första riktning på några minuter.",
    profilePrecision: "preliminary",
    profilePrecisionLabel: "Preliminär profil",
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
    description: "Alla grundfrågor plus riktade följdfrågor när resultatet behöver bli skarpare.",
    profilePrecision: "high",
    profilePrecisionLabel: "Hög profilprecision",
    adaptiveLimit: 5,
    questionIds: null,
  },
};

export function normalizeQuizMode(value) {
  return QUIZ_MODES[value]?.id || DEFAULT_QUIZ_MODE;
}

export function getQuizModeConfig(value) {
  return QUIZ_MODES[normalizeQuizMode(value)];
}

export function getQuestionsForQuizMode(questions = [], mode = DEFAULT_QUIZ_MODE) {
  const config = getQuizModeConfig(mode);
  if (!config.questionIds) return questions;
  const allowed = new Set(config.questionIds);
  return questions.filter((question) => allowed.has(Number(question.id)));
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
