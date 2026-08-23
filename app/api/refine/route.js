import { NextResponse } from "next/server";
import { getPrograms, getQuestions } from "@/lib/db";
import { calculateProfile } from "@/lib/matching";
import { selectAdaptiveQuestions } from "@/lib/adaptive";
import { getQuestionsForQuizMode, getQuizModeConfig, normalizeQuizMode } from "@/lib/quiz-modes";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const answers = body?.answers || {};
    const mode = normalizeQuizMode(body?.mode);
    const modeConfig = getQuizModeConfig(mode);
    const allQuestions = getQuestions();
    const questions = getQuestionsForQuizMode(allQuestions, mode);
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
    const programs = getPrograms({ limit: 1000 });
    return NextResponse.json(selectAdaptiveQuestions(profileResult, programs, modeConfig.adaptiveLimit));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Kunde inte skapa följdfrågor." }, { status: 500 });
  }
}
