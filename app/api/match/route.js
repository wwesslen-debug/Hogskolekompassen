import { NextResponse } from "next/server";
import { getPrograms, getQuestions } from "@/lib/db";
import { buildMatchResult, calculateProfile } from "@/lib/matching";
import { getAdaptiveQuestionsByIds } from "@/lib/adaptive";
import priorities from "@/data/priorities.json";
import dealBreakers from "@/data/dealbreakers.json";

export const runtime = "nodejs";

const validPriorities = new Set(priorities.map((item) => item.id));
const validDealBreakers = new Set(dealBreakers.map((item) => item.id));

export async function POST(request) {
  try {
    const body = await request.json();
    const answers = body?.answers || {};
    const adaptiveAnswers = body?.adaptiveAnswers || {};
    const selectedPriorities = Array.isArray(body?.priorities)
      ? body.priorities.filter((id) => validPriorities.has(id)).slice(0, 3)
      : [];
    const selectedDealBreakers = Array.isArray(body?.dealBreakers)
      ? body.dealBreakers.filter((id) => validDealBreakers.has(id)).slice(0, 6)
      : [];

    const questions = getQuestions();
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

    const adaptiveIds = Object.keys(adaptiveAnswers).map(Number).filter(Number.isInteger);
    const adaptiveQuestions = getAdaptiveQuestionsByIds(adaptiveIds);
    const validatedAdaptiveAnswers = {};
    for (const question of adaptiveQuestions) {
      const answer = Number(adaptiveAnswers[String(question.id)] ?? adaptiveAnswers[question.id]);
      if (Number.isInteger(answer) && answer >= 0 && answer <= 5) validatedAdaptiveAnswers[question.id] = answer;
    }

    const allQuestions = [...questions, ...adaptiveQuestions];
    const allAnswers = { ...answers, ...validatedAdaptiveAnswers };
    const profileResult = calculateProfile(allQuestions, allAnswers);
    const programs = getPrograms({ limit: 1000 });
    const result = buildMatchResult(profileResult, programs, selectedPriorities, selectedDealBreakers);

    return NextResponse.json({
      ...result,
      adaptiveQuestionCount: adaptiveQuestions.length,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Kunde inte beräkna resultatet." },
      { status: 500 }
    );
  }
}
