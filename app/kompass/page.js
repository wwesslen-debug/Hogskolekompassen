import Quiz from "@/components/Quiz";
import { getQuestions } from "@/lib/db";
import { canonicalUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Starta kompassen",
  description:
    "Svara på frågor om intressen, studiestil och drivkrafter för att få en förklarad utbildningsprofil.",
  alternates: { canonical: canonicalUrl("/kompass") },
};

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
