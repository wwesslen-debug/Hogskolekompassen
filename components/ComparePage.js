"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CompareButton from "@/components/CompareButton";
import SaveProgramButton from "@/components/SaveProgramButton";

const STORAGE_KEY = "hogskolekompassen-compare";
const EVENT_NAME = "hogskolekompassen-compare-change";

const rows = [
  ["Din match", (p, scores) => scores?.[p.id] ? `${scores[p.id]}%` : "Gör kompassen"],
  ["Område", (p) => p.category],
  ["Examen", (p) => p.degree],
  ["Studielängd", (p) => `${p.years} år`],
  ["Studieform", (p) => p.study],
  ["Matematik", (p) => p.studySummary.math],
  ["Programmering", (p) => p.studySummary.programming],
  ["Teori", (p) => p.studySummary.theory],
  ["Praktiska moment", (p) => p.studySummary.practical],
  ["Människokontakt", (p) => p.studySummary.people],
  ["Kommunikation", (p) => p.studySummary.communication],
  ["Ledarskap", (p) => p.studySummary.leadership],
  ["Laborativt/fält", (p) => p.studySummary.lab],
  ["Övergripande stil", (p) => p.studySummary.style],
];

const breakdownLabels = {
  interests: "Intressen",
  studyStyle: "Studiestil",
  workStyle: "Arbetssätt",
  futureGoals: "Framtidsmål",
};

function readIds() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.map(Number).filter(Number.isInteger).slice(0, 3) : [];
  } catch {
    return [];
  }
}

export default function ComparePage() {
  const [ids, setIds] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState({});
  const [scoreDetails, setScoreDetails] = useState({});

  useEffect(() => {
    try {
      const result = JSON.parse(sessionStorage.getItem("hogskolekompassen-result") || "null");
      if (result?.schemaVersion >= 6) {
        setScores(result.scoreById || {});
        setScoreDetails(result.scoreDetailsById || {});
      }
    } catch {}

    const update = (event) => setIds(event?.detail || readIds());
    setIds(readIds());
    window.addEventListener(EVENT_NAME, update);
    return () => window.removeEventListener(EVENT_NAME, update);
  }, []);

  useEffect(() => {
    if (!ids.length) {
      setPrograms([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/programs?ids=${ids.join(",")}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((payload) => setPrograms(payload.programs || []))
      .catch((error) => { if (error.name !== "AbortError") setPrograms([]); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [ids]);

  const ranked = useMemo(() => [...programs]
    .filter((program) => scores[program.id])
    .sort((a, b) => scores[b.id] - scores[a.id]), [programs, scores]);

  const bestScore = ranked.length ? scores[ranked[0].id] : null;
  const gap = ranked.length >= 2 ? bestScore - scores[ranked[1].id] : null;

  const dimensionWinners = useMemo(() => {
    if (!programs.length) return [];
    return Object.keys(breakdownLabels).map((key) => {
      const candidates = programs
        .map((program) => ({ program, value: scoreDetails?.[program.id]?.scoreBreakdown?.[key] }))
        .filter((item) => Number.isFinite(item.value))
        .sort((a, b) => b.value - a.value);
      if (!candidates.length) return null;
      return { key, label: breakdownLabels[key], program: candidates[0].program, value: candidates[0].value };
    }).filter(Boolean);
  }, [programs, scoreDetails]);

  if (!ids.length && !loading) {
    return (
      <main className="comparePage">
        <section className="shell compareEmpty">
          <span className="eyebrow">Jämför utbildningar</span>
          <h1>Välj upp till tre utbildningar</h1>
          <p className="lead">Lägg till utbildningar från resultatet eller utbildningskatalogen så jämför vi dem sida vid sida.</p>
          <Link className="button" href="/utbildningar">Utforska utbildningar →</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="comparePage">
      <section className="shell compareHeader">
        <span className="eyebrow">Jämför utbildningar</span>
        <h1>Vilken passar dig bäst – och varför?</h1>
        <p className="lead">v0.7 kombinerar fakta sida vid sida med din senaste kompassprofil och visar var utbildningarna faktiskt skiljer sig för just dig.</p>
      </section>

      <section className="shell compareSection">
        {loading ? <div className="compareLoading">Laddar jämförelsen…</div> : (
          <>
            {ranked.length ? (
              <div className="compareVerdict">
                <div className="verdictMain">
                  <span className="eyebrow">Personlig slutsats</span>
                  <h2>{ranked[0].title} har högst totalmatch just nu.</h2>
                  <p>
                    {gap == null
                      ? `Din matchning är ${bestScore}%.`
                      : gap <= 4
                        ? `Det är ett mycket jämnt val – bara ${gap} procentenheter skiljer förstaplatsen från tvåan. Titta därför extra på delpoängen och kursinnehållet.`
                        : `Den ligger ${gap} procentenheter före nästa alternativ i din nuvarande profil.`}
                  </p>
                  <div className="verdictActions">
                    <Link href={`/utbildningar/${ranked[0].id}`} className="button buttonSmall">Öppna vinnaren →</Link>
                    <Link href="/kompass" className="button buttonGhost buttonSmall">Förfina min profil</Link>
                  </div>
                </div>
                <div className="dimensionWinnerGrid">
                  {dimensionWinners.map((winner) => (
                    <div key={winner.key}>
                      <span>{winner.label}</span>
                      <strong>{winner.program.title}</strong>
                      <em>{winner.value}%</em>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="compareProfilePrompt">
                <strong>Gör kompassen för en personlig slutsats.</strong>
                <Link href="/kompass">Starta →</Link>
              </div>
            )}

            <div className="compareProgramHeaders" style={{ "--compare-count": programs.length }}>
              <div className="compareCorner">Jämförelse</div>
              {programs.map((program) => (
                <div className="compareProgramHeader" key={program.id}>
                  {scores?.[program.id] ? <span className={`compareScore ${scores[program.id] === bestScore ? "best" : ""}`}>{scores[program.id]}% match</span> : null}
                  <span>{program.category}</span>
                  <h2>{program.title}</h2>
                  <p>{program.institution} · {program.city}</p>
                  <div className="compareHeaderActions"><CompareButton programId={program.id} compact /><SaveProgramButton programId={program.id} compact /></div>
                </div>
              ))}
            </div>

            {Object.keys(scoreDetails).length ? (
              <div className="compareBreakdownTable" style={{ "--compare-count": programs.length }}>
                {Object.entries(breakdownLabels).map(([key, label]) => (
                  <div className="compareBreakdownRow" key={key}>
                    <div className="compareRowLabel">{label}</div>
                    {programs.map((program) => {
                      const value = scoreDetails?.[program.id]?.scoreBreakdown?.[key];
                      return <div className="compareBreakdownCell" key={program.id}><strong>{value ?? "–"}{value != null ? "%" : ""}</strong><div className="miniTrack"><div className="miniFill" style={{ width: `${value || 0}%` }} /></div></div>;
                    })}
                  </div>
                ))}
              </div>
            ) : null}

            <div className="compareTable" style={{ "--compare-count": programs.length }}>
              {rows.map(([label, getter]) => (
                <div className="compareRow" key={label}>
                  <div className="compareRowLabel">{label}</div>
                  {programs.map((program) => <div className="compareCell" key={program.id}>{getter(program, scores)}</div>)}
                </div>
              ))}
            </div>

            <div className="compareDetailsGrid" style={{ "--compare-count": programs.length }}>
              <div className="compareCorner">Typiska teman</div>
              {programs.map((program) => <div className="compareDetailCell" key={program.id}><div className="contentTagGrid smallTags">{program.contentItems.slice(0, 4).map((item) => <span key={item}>{item}</span>)}</div></div>)}
              <div className="compareCorner">Exempel på arbetsområden</div>
              {programs.map((program) => <div className="compareDetailCell" key={program.id}><ul>{program.careerExamples.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul></div>)}
            </div>

            <div className="compareBottomActions">
              {programs.map((program) => <Link href={`/utbildningar/${program.id}`} className="button buttonGhost" key={program.id}>Läs mer om {program.title} →</Link>)}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
