import { NextResponse } from "next/server";
import { getLiveDataStatus, getLiveRecommendationCandidates, getQuestions } from "@/lib/db";
import { calculateProfile } from "@/lib/matching";
import { buildLiveMatchResult, DEFAULT_LIVE_CANDIDATE_LIMIT } from "@/lib/live-matching";
import { getAdaptiveQuestionsByIds } from "@/lib/adaptive";
import {
  getRoutedAdaptiveQuestionCount,
  inferSelectedInterestsFromAnswers,
  resolveIntentCertainty,
} from "@/lib/question-router";
import { getQuestionsForQuizMode, getQuizModeResultMeta, normalizeQuizMode } from "@/lib/quiz-modes";
import priorities from "@/data/priorities.json";
import dealBreakers from "@/data/dealbreakers.json";
import educationInterests from "@/data/education-interests.json";

export const runtime = "nodejs";

const validPriorities = new Set(priorities.map((item) => item.id));
const validDealBreakers = new Set(dealBreakers.map((item) => item.id));
const validInterests = new Set(educationInterests.map((item) => item.id));

export async function POST(request) {
  try {
    const body = await request.json();
    const answers = body?.answers || {};
    const adaptiveAnswers = body?.adaptiveAnswers || {};
    const mode = normalizeQuizMode(body?.mode);
    const intentCertainty = resolveIntentCertainty(answers, body?.intentCertainty);
    const selectedPriorities = Array.isArray(body?.priorities)
      ? body.priorities.filter((id) => validPriorities.has(id)).slice(0, 3)
      : [];
    const selectedDealBreakers = Array.isArray(body?.dealBreakers)
      ? body.dealBreakers.filter((id) => validDealBreakers.has(id)).slice(0, 6)
      : [];
    const explicitSelectedInterests = Array.isArray(body?.interests)
      ? body.interests.filter((id) => validInterests.has(id)).slice(0, 3)
      : [];

    const fullQuestionBank = getQuestions();
    const questions = getQuestionsForQuizMode(fullQuestionBank, mode, answers, {
      selectedInterests: explicitSelectedInterests,
      intentCertainty,
    });
    const validAnswers = questions.filter((question) => {
      const answer = Number(answers[String(question.id)] ?? answers[question.id]);
      return Number.isInteger(answer) && answer >= 0 && answer <= 5;
    });

    if (validAnswers.length !== questions.length) {
      return NextResponse.json(
        { error: `Alla ${questions.length} frågor behöver besvaras. Du kan välja “Osäker / vet inte”.` },
        { status: 400 }
      );
    }

    const routedQuestionIds = new Set(questions.map((question) => Number(question.id)));
    const adaptiveIds = Object.keys(adaptiveAnswers)
      .map(Number)
      .filter((id) => Number.isInteger(id) && !routedQuestionIds.has(id));
    const adaptiveQuestions = getAdaptiveQuestionsByIds(adaptiveIds);
    const validatedAdaptiveAnswers = {};
    for (const question of adaptiveQuestions) {
      const answer = Number(adaptiveAnswers[String(question.id)] ?? adaptiveAnswers[question.id]);
      if (Number.isInteger(answer) && answer >= 0 && answer <= 5) validatedAdaptiveAnswers[question.id] = answer;
    }

    const profileQuestions = [...questions, ...adaptiveQuestions];
    const allAnswers = { ...answers, ...validatedAdaptiveAnswers };
    const profileResult = calculateProfile(profileQuestions, allAnswers);
    const selectedInterests = inferSelectedInterestsFromAnswers(profileQuestions, allAnswers, explicitSelectedInterests);
    const status = await getLiveDataStatus();
    const candidates = status.ready && status.eventCount
      ? await getLiveRecommendationCandidates({ limit: DEFAULT_LIVE_CANDIDATE_LIMIT })
      : [];
    const result = buildLiveMatchResult(profileResult, candidates, {
      selectedPriorities,
      selectedDealBreakers,
      selectedInterests,
      intentCertainty,
    });

    return NextResponse.json({
      ...result,
      liveStatus: status,
      ...getQuizModeResultMeta(mode, questions.length, fullQuestionBank.length),
      adaptiveQuestionCount: adaptiveQuestions.length + getRoutedAdaptiveQuestionCount(questions),
    });
  } catch (error) {
    console.error("Match calculation failed:", error?.message || error);
    return NextResponse.json(
      { error: "Kunde inte beräkna resultatet." },
      { status: 500 }
    );
  }
}
