import adaptiveQuestions from "@/data/adaptive-questions.json";
import traits from "@/data/traits.json";
import { scoreProgram } from "@/lib/matching";

function meanVector(programs) {
  const keys = Object.keys(traits);
  const totals = Object.fromEntries(keys.map((key) => [key, 0]));
  if (!programs.length) return Object.fromEntries(keys.map((key) => [key, 0.5]));
  for (const program of programs) {
    for (const key of keys) totals[key] += Number(program.vector?.[key] ?? 0.5);
  }
  return Object.fromEntries(keys.map((key) => [key, totals[key] / programs.length]));
}

function chooseQuestionsForTraits(traitKeys, limit) {
  const picked = [];
  const seen = new Set();
  for (const trait of traitKeys) {
    const candidates = adaptiveQuestions.filter((question) => question.trait === trait);
    for (const question of candidates) {
      if (picked.length >= limit) break;
      if (seen.has(question.id)) continue;
      seen.add(question.id);
      picked.push(question);
      break;
    }
    if (picked.length >= limit) break;
  }

  if (picked.length < limit) {
    for (const question of adaptiveQuestions) {
      if (picked.length >= limit) break;
      if (seen.has(question.id)) continue;
      seen.add(question.id);
      picked.push(question);
    }
  }
  return picked;
}

function normalizedTitle(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/programmet|program|kandidat|master/g, "")
    .replace(/[^a-z0-9åäö]+/g, " ")
    .trim();
}

function topAdaptiveAreas(profileResult, programs) {
  const { profile, traitConfidence } = profileResult;
  const buckets = new Map();

  for (const program of programs) {
    const category = program.category || "Brett utbildningsområde";
    const scoring = scoreProgram(profile, program, traitConfidence, [], [], []);
    if (!buckets.has(category)) buckets.set(category, []);
    buckets.get(category).push({ program, score: Math.round(scoring.score * 100) });
  }

  return [...buckets.entries()]
    .map(([category, items]) => {
      const seen = new Set();
      const topScores = [...items]
        .sort((a, b) => b.score - a.score)
        .filter((item) => {
          const key = normalizedTitle(item.program.title);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 4)
        .map((item) => item.score);
      const score = Math.round(topScores.reduce((sum, value) => sum + value, 0) / Math.max(1, topScores.length));
      return { category, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
}

export function selectAdaptiveQuestions(profileResult, programs, limit = 5) {
  const topAreas = topAdaptiveAreas(profileResult, programs);
  const uncertainty = profileResult.uncertainAnswers;
  const gap = topAreas.length >= 2 ? topAreas[0].score - topAreas[1].score : 99;

  let reason = "Vi har redan en tydlig profil, så inga extra frågor behövs.";
  let candidateTraits = [];

  if (topAreas.length >= 2 && gap <= 6) {
    const firstPrograms = programs.filter((p) => p.category === topAreas[0].category);
    const secondPrograms = programs.filter((p) => p.category === topAreas[1].category);
    const a = meanVector(firstPrograms);
    const b = meanVector(secondPrograms);
    candidateTraits = Object.keys(traits)
      .map((key) => ({ key, difference: Math.abs((a[key] ?? 0.5) - (b[key] ?? 0.5)), confidence: profileResult.traitConfidence[key] ?? 1 }))
      .sort((x, y) => (y.difference * (1.25 - y.confidence * 0.25)) - (x.difference * (1.25 - x.confidence * 0.25)))
      .map((item) => item.key);
    reason = `Dina två starkaste områden, ${topAreas[0].category} och ${topAreas[1].category}, ligger nära varandra. Några utslagsfrågor kan göra skillnaden tydligare.`;
  } else if (uncertainty >= 4 || profileResult.confidence < 0.9) {
    candidateTraits = Object.entries(profileResult.traitConfidence)
      .sort((a, b) => a[1] - b[1])
      .map(([key]) => key);
    reason = "Du har varit osäker på flera frågor. Vi ställer några riktade följdfrågor där underlaget är svagast.";
  }

  if (!candidateTraits.length) {
    return { questions: [], reason, topAreas: topAreas.map((item) => ({ category: item.category, score: item.score })), gap };
  }

  const supportedTraits = new Set(adaptiveQuestions.map((question) => question.trait));
  candidateTraits = candidateTraits.filter((key) => supportedTraits.has(key));
  const questions = chooseQuestionsForTraits(candidateTraits, limit);

  return {
    questions: questions.map(({ id, text, trait }) => ({ id, text, trait, traitLabel: traits[trait]?.short || trait })),
    reason,
    topAreas: topAreas.map((item) => ({ category: item.category, score: item.score })),
    gap,
  };
}

export function getAdaptiveQuestionsByIds(ids = []) {
  const wanted = new Set(ids.map(Number));
  return adaptiveQuestions.filter((question) => wanted.has(question.id));
}
