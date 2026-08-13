"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import priorityOptions from "@/data/priorities.json";
import dealBreakerOptions from "@/data/dealbreakers.json";

const answerOptions = [
  { value: 1, label: "Stämmer inte" },
  { value: 2, label: "Stämmer lite" },
  { value: 3, label: "Varken eller" },
  { value: 4, label: "Stämmer ganska bra" },
  { value: 5, label: "Stämmer helt" },
];

const sectionDescriptions = {
  "Intressen": "Vad du spontant dras till",
  "Sätt att tänka": "Hur du angriper problem",
  "Arbetssätt": "Vilken arbetsform du trivs med",
  "Framtid & yrkesvardag": "Vad du vill få ut av ett framtida arbete",
  "Studier & preferenser": "Hur du vill att utbildningen ska kännas",
};

export default function Quiz({ questions }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [adaptiveQuestions, setAdaptiveQuestions] = useState([]);
  const [adaptiveAnswers, setAdaptiveAnswers] = useState({});
  const [adaptiveIndex, setAdaptiveIndex] = useState(0);
  const [adaptiveInfo, setAdaptiveInfo] = useState(null);
  const [priorities, setPriorities] = useState([]);
  const [dealBreakers, setDealBreakers] = useState([]);
  const [phase, setPhase] = useState("questions");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const question = questions[index];
  const adaptiveQuestion = adaptiveQuestions[adaptiveIndex];
  const hasCurrentAnswer = Object.prototype.hasOwnProperty.call(answers, question?.id);
  const currentAnswer = hasCurrentAnswer ? answers[question.id] : null;
  const hasAdaptiveAnswer = Object.prototype.hasOwnProperty.call(adaptiveAnswers, adaptiveQuestion?.id);
  const currentAdaptiveAnswer = hasAdaptiveAnswer ? adaptiveAnswers[adaptiveQuestion?.id] : null;
  const progress = Math.round(((index + 1) / questions.length) * 100);

  const sections = useMemo(() => [...new Set(questions.map((item) => item.section))], [questions]);
  const sectionIndex = sections.indexOf(question?.section);
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const uncertainCount = useMemo(
    () => Object.values(answers).filter((value) => Number(value) === 0).length,
    [answers]
  );

  function choose(value) {
    setAnswers((previous) => ({ ...previous, [question.id]: value }));
    setError("");
  }

  function chooseAdaptive(value) {
    setAdaptiveAnswers((previous) => ({ ...previous, [adaptiveQuestion.id]: value }));
    setError("");
  }

  function togglePriority(id) {
    setPriorities((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) return current;
      return [...current, id];
    });
  }

  function toggleDealBreaker(id) {
    setDealBreakers((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]
    );
  }

  async function prepareAdaptive() {
    setPhase("refining");
    setError("");
    try {
      const response = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Kunde inte analysera följdfrågor.");
      setAdaptiveInfo(payload);
      const followUps = payload.questions || [];
      setAdaptiveQuestions(followUps);
      setAdaptiveIndex(0);
      setPhase(followUps.length ? "adaptive" : "dealbreakers");
    } catch (err) {
      setError(err.message || "Något gick fel. Försök igen.");
      setPhase("questions");
    }
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, adaptiveAnswers, priorities, dealBreakers }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Matchningen kunde inte genomföras.");
      }

      const result = await response.json();
      sessionStorage.setItem("hogskolekompassen-result", JSON.stringify(result));
      router.push("/resultat");
    } catch (err) {
      setError(err.message || "Något gick fel. Försök igen.");
      setSubmitting(false);
    }
  }

  function next() {
    if (!hasCurrentAnswer) {
      setError("Välj det alternativ som ligger närmast – eller välj Osäker / vet inte.");
      return;
    }

    if (index < questions.length - 1) {
      setIndex((value) => value + 1);
      return;
    }

    prepareAdaptive();
  }

  function nextAdaptive() {
    if (!hasAdaptiveAnswer) {
      setError("Välj ett svar – eller Osäker / vet inte.");
      return;
    }
    if (adaptiveIndex < adaptiveQuestions.length - 1) {
      setAdaptiveIndex((value) => value + 1);
      return;
    }
    setPhase("dealbreakers");
  }

  function previous() {
    if (phase === "priorities") {
      setPhase("dealbreakers");
      return;
    }
    if (phase === "dealbreakers") {
      if (adaptiveQuestions.length) {
        setPhase("adaptive");
        setAdaptiveIndex(adaptiveQuestions.length - 1);
      } else {
        setPhase("questions");
        setIndex(questions.length - 1);
      }
      return;
    }
    if (phase === "adaptive") {
      if (adaptiveIndex > 0) setAdaptiveIndex((value) => value - 1);
      else {
        setPhase("questions");
        setIndex(questions.length - 1);
      }
      return;
    }
    setIndex((value) => Math.max(0, value - 1));
  }

  if (phase === "refining") {
    return (
      <section className="quizWrap intelligenceLoading">
        <div className="quizCard intelligenceCard">
          <div className="intelligencePulse">✦</div>
          <span className="eyebrow">Adaptiv analys</span>
          <h1>Vi ser var resultatet behöver bli skarpare.</h1>
          <p className="quizHint">Högskolekompassen jämför dina preliminära toppområden och väljer bara följdfrågor som faktiskt kan påverka rekommendationen.</p>
          <div className="analysisDots"><span /><span /><span /></div>
          {error ? <p className="formError">{error}</p> : null}
        </div>
      </section>
    );
  }

  if (phase === "adaptive") {
    const adaptiveProgress = Math.round(((adaptiveIndex + 1) / adaptiveQuestions.length) * 100);
    return (
      <section className="quizWrap adaptiveWrap">
        <div className="quizTopline">
          <span>Adaptiva utslagsfrågor · {adaptiveIndex + 1} av {adaptiveQuestions.length}</span>
          <span>{adaptiveProgress}%</span>
        </div>
        <div className="progressTrack"><div className="progressFill" style={{ width: `${adaptiveProgress}%` }} /></div>

        <div className="quizCard adaptiveCard">
          <div className="adaptiveReasonBox">
            <span>✦ Varför får du extra frågor?</span>
            <p>{adaptiveInfo?.reason}</p>
            {adaptiveInfo?.topAreas?.length >= 2 ? (
              <div className="adaptiveAreaPair">
                <strong>{adaptiveInfo.topAreas[0].category} {adaptiveInfo.topAreas[0].score}%</strong>
                <span>vs</span>
                <strong>{adaptiveInfo.topAreas[1].category} {adaptiveInfo.topAreas[1].score}%</strong>
              </div>
            ) : null}
          </div>

          <div className="questionEyebrow">Utslagsfråga · {adaptiveQuestion.traitLabel}</div>
          <h1>{adaptiveQuestion.text}</h1>
          <p className="quizHint">Den här frågan valdes utifrån just din preliminära profil.</p>

          <div className="answerGrid" role="radiogroup" aria-label="Svarsalternativ">
            {answerOptions.map((option) => (
              <button
                type="button"
                className={`answerOption ${currentAdaptiveAnswer === option.value ? "selected" : ""}`}
                key={option.value}
                onClick={() => chooseAdaptive(option.value)}
                role="radio"
                aria-checked={currentAdaptiveAnswer === option.value}
              >
                <span className="answerNumber">{option.value}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className={`unsureOption ${currentAdaptiveAnswer === 0 ? "selected" : ""}`}
            onClick={() => chooseAdaptive(0)}
          >
            <span>?</span><div><strong>Osäker / vet inte</strong><small>Hoppar över påverkan från just den här följdfrågan.</small></div>
          </button>

          {error ? <p className="formError">{error}</p> : null}
          <div className="quizActions">
            <button type="button" className="textButton" onClick={previous}>← Tillbaka</button>
            <div className="answeredText">Personligt förfiningssteg</div>
            <button type="button" className="button" onClick={nextAdaptive}>{adaptiveIndex === adaptiveQuestions.length - 1 ? "Nästa steg →" : "Nästa →"}</button>
          </div>
        </div>
      </section>
    );
  }

  if (phase === "dealbreakers") {
    return (
      <section className="quizWrap priorityWrap">
        <div className="quizTopline"><span>Deal-breakers</span><span>Valfritt</span></div>
        <div className="progressTrack"><div className="progressFill" style={{ width: "100%" }} /></div>
        <div className="quizCard priorityCard">
          <div className="questionEyebrow">Det du verkligen vill undvika</div>
          <h1>Finns det något som ska väga extra tungt åt andra hållet?</h1>
          <p className="quizHint">Det här är starkare än ett vanligt svar. Markera bara sådant som faktiskt kan få dig att välja bort en utbildning.</p>

          <div className="dealBreakerGrid">
            {dealBreakerOptions.map((item) => {
              const selected = dealBreakers.includes(item.id);
              return (
                <button
                  type="button"
                  className={`dealBreakerOption ${selected ? "selected" : ""}`}
                  key={item.id}
                  onClick={() => toggleDealBreaker(item.id)}
                  aria-pressed={selected}
                >
                  <span className="dealBreakerMark">{selected ? "✓" : "–"}</span>
                  <div><strong>{item.label}</strong><span>{item.description}</span></div>
                </button>
              );
            })}
          </div>

          <div className="dealBreakerNotice">
            <strong>{dealBreakers.length ? `${dealBreakers.length} deal-breaker${dealBreakers.length > 1 ? "s" : ""} aktiva` : "Inga deal-breakers valda"}</strong>
            <span>Du kan lämna allt om inget av alternativen är ett verkligt hinder.</span>
          </div>

          <div className="quizActions">
            <button type="button" className="textButton" onClick={previous}>← Tillbaka</button>
            <div className="answeredText">Tydliga avdrag, inte absoluta förbud</div>
            <button type="button" className="button" onClick={() => setPhase("priorities")}>Välj prioriteringar →</button>
          </div>
        </div>
      </section>
    );
  }

  if (phase === "priorities") {
    return (
      <section className="quizWrap priorityWrap">
        <div className="quizTopline">
          <span>Personliga prioriteringar</span>
          <span>Valfritt · välj upp till 3</span>
        </div>
        <div className="progressTrack" aria-hidden="true"><div className="progressFill" style={{ width: "100%" }} /></div>

        <div className="quizCard priorityCard">
          <div className="questionEyebrow">Sista steget</div>
          <h1>Vad är viktigast för dig i ditt framtida arbete?</h1>
          <p className="quizHint">Välj högst tre prioriteringar. De finjusterar framtidsdelen av matchningen, men din grundprofil väger fortfarande tyngst.</p>

          <div className="priorityGrid">
            {priorityOptions.map((item) => {
              const selected = priorities.includes(item.id);
              const disabled = !selected && priorities.length >= 3;
              return (
                <button
                  type="button"
                  className={`priorityOption ${selected ? "selected" : ""}`}
                  key={item.id}
                  onClick={() => togglePriority(item.id)}
                  disabled={disabled || submitting}
                  aria-pressed={selected}
                >
                  <span className="priorityCheck">{selected ? "✓" : "+"}</span>
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </button>
              );
            })}
          </div>

          {error ? <p className="formError">{error}</p> : null}

          <div className="quizActions">
            <button type="button" className="textButton" onClick={previous} disabled={submitting}>← Tillbaka</button>
            <div className="answeredText">{priorities.length}/3 prioriteringar valda</div>
            <button type="button" className="button" onClick={submit} disabled={submitting}>{submitting ? "Analyserar…" : "Se mitt resultat →"}</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="quizWrap">
      <div className="sectionStepper" aria-label="Testets delar">
        {sections.map((section, i) => (
          <div className={`sectionStep ${i < sectionIndex ? "done" : ""} ${i === sectionIndex ? "active" : ""}`} key={section}>
            <span>{i < sectionIndex ? "✓" : i + 1}</span>
            <div><strong>{section}</strong><small>{sectionDescriptions[section]}</small></div>
          </div>
        ))}
      </div>

      <div className="quizTopline">
        <span>{question.section} · fråga {index + 1} av {questions.length}</span>
        <span>{progress}%</span>
      </div>
      <div className="progressTrack" aria-hidden="true"><div className="progressFill" style={{ width: `${progress}%` }} /></div>

      <div className="quizCard">
        <div className="questionEyebrow">Vad stämmer bäst in på dig?</div>
        <h1>{question.text}</h1>
        <p className="quizHint">Svara spontant. Det finns inga rätt eller fel svar.</p>

        <div className="answerGrid" role="radiogroup" aria-label="Svarsalternativ">
          {answerOptions.map((option) => (
            <button
              type="button"
              className={`answerOption ${currentAnswer === option.value ? "selected" : ""}`}
              key={option.value}
              onClick={() => choose(option.value)}
              role="radio"
              aria-checked={currentAnswer === option.value}
            >
              <span className="answerNumber">{option.value}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>

        <button type="button" className={`unsureOption ${currentAnswer === 0 ? "selected" : ""}`} onClick={() => choose(0)} aria-pressed={currentAnswer === 0}>
          <span>?</span><div><strong>Osäker / vet inte</strong><small>Svaret räknas inte in i just de profildimensionerna och kan utlösa riktade följdfrågor.</small></div>
        </button>

        {error ? <p className="formError">{error}</p> : null}

        <div className="quizActions">
          <button type="button" className="textButton" onClick={previous} disabled={index === 0 || submitting}>← Föregående</button>
          <div className="answeredText">{answeredCount}/{questions.length} svar · {uncertainCount} osäkra</div>
          <button type="button" className="button" onClick={next} disabled={submitting}>{index === questions.length - 1 ? "Analysera mina svar →" : "Nästa →"}</button>
        </div>
      </div>
    </section>
  );
}
