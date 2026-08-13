import Quiz from "@/components/Quiz";
import { getQuestions } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function CompassPage() {
  const questions = getQuestions();

  return (
    <main className="quizPage">
      <div className="shell">
        <Quiz questions={questions} />
      </div>
    </main>
  );
}
