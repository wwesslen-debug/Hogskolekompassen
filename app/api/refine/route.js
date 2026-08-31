import { NextResponse } from "next/server";
import { getLiveDataStatus, getLiveRecommendationCandidates, getQuestions } from "@/lib/db";
import { calculateProfile } from "@/lib/matching";
import { selectAdaptiveQuestions } from "@/lib/adaptive";
import { DEFAULT_LIVE_CANDIDATE_LIMIT, liveOfferingToMatchProgram } from "@/lib/live-matching";
import { normalizeIntentCertainty } from "@/lib/question-router";
import { getQuestionsForQuizMode, getQuizModeConfig, normalizeQuizMode } from "@/lib/quiz-modes";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const answers = body?.answers || {};
    const mode = normalizeQuizMode(body?.mode);
    const intentCertainty = normalizeIntentCertainty(body?.intentCertainty);
    const selectedInterests = Array.isArray(body?.interests) ? body.interests : [];
    const modeConfig = getQuizModeConfig(mode);
    const allQuestions = getQuestions();
    const questions = getQuestionsForQuizMode(allQuestions, mode, answers, { selectedInterests, intentCertainty });
    const validAnswers = questions.filter((question) => {
      const answer = Number(answers[String(question.id)] ?? answers[question.id]);
      return Number.isInteger(answer) && answer >= 0 && answer <= 5;
    });

    if (validAnswers.length !== questions.length) {
      return NextResponse.json({ error: `Alla ${questions.length} grundfrågor behöver besvaras först.` }, { status: 400 });
    }

    if (!modeConfig.adaptiveLimit) {
      return NextResponse.json({
        questions: [],
        reason: "Snabbtestet använder ett balanserat urval utan extra följdfrågor.",
        topAreas: [],
        gap: null,
      });
    }

    const profileResult = calculateProfile(questions, answers);
    const status = await getLiveDataStatus();
    const candidates = status.ready && status.eventCount
      ? await getLiveRecommendationCandidates({ limit: DEFAULT_LIVE_CANDIDATE_LIMIT })
      : [];
    const programs = candidates.map(liveOfferingToMatchProgram);
    return NextResponse.json(selectAdaptiveQuestions(profileResult, programs, modeConfig.adaptiveLimit));
  } catch (error) {
    console.error("Adaptive question selection failed:", error?.message || error);
    return NextResponse.json({ error: "Kunde inte skapa följdfrågor." }, { status: 500 });
  }
}
