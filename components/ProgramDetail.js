"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CompareButton from "@/components/CompareButton";
import SaveProgramButton from "@/components/SaveProgramButton";
import AdSenseUnit from "@/components/AdSenseUnit";
import traits from "@/data/traits.json";
import { trackExternalClick } from "@/lib/analytics-client";

const programAdClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-7522543243781751";
const programAdSlot =
  process.env.NEXT_PUBLIC_ADSENSE_PROGRAM_INLINE_SLOT ||
  process.env.NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT ||
  "";

const profileRows = [
  ["matematik", "Matematik"],
  ["programmering", "Programmering"],
  ["teori", "Teori"],
  ["manniskor", "Människokontakt"],
  ["praktik", "Praktiskt"],
  ["kommunikation", "Kommunikation"],
  ["ledarskap", "Ledarskap"],
  ["sjalvstandighet", "Självständighet"],
];

function personalExplanation(profile, vector) {
  if (!profile) return { reasons: [], cautions: [] };
  const values = Object.keys(traits).map((key) => ({
    key,
    label: traits[key].label,
    user: profile[key] ?? 0.5,
    target: vector[key] ?? 0.5,
  }));

  const reasons = values
    .filter((item) => item.user >= 0.57 && item.target >= 0.55)
    .sort((a, b) => (b.user * b.target) - (a.user * a.target))
    .slice(0, 4);

  const cautions = values
    .map((item) => ({ ...item, gap: item.target - item.user }))
    .filter((item) => item.target >= 0.64 && item.user <= 0.43 && item.gap >= 0.22)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 2);

  return { reasons, cautions };
}

export default function ProgramDetail({ program, related, liveOfferings = [] }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem("hogskolekompassen-result") || "null");
      setResult(stored?.schemaVersion >= 6 ? stored : null);
    } catch {}
  }, []);

  const personalScore = result?.scoreById?.[program.id];
  const scoreDetail = result?.scoreDetailsById?.[program.id];
  const explanation = useMemo(
    () => personalExplanation(result?.profile, program.vector),
    [result, program.vector]
  );

  return (
    <main className="programDetailPage">
      <section className="programDetailHero">
        <div className="shell">
          <div className="breadcrumbRow">
            <Link href="/utbildningar">Utbildningar</Link><span>→</span><span>{program.category}</span>
          </div>

          <div className="programDetailHeroGrid">
            <div>
              <div className="programMeta detailMeta">
                <span>{program.category}</span>
                <span>{program.degree}</span>
                <span>{program.years} år</span>
                <span>{program.study}</span>
              </div>
              <h1>{program.title}</h1>
              <p className="detailInstitution">{program.institution} · {program.city}</p>
              <p className="lead">{program.description}</p>
              <div className="detailHeroActions">
                <a
                  className="button"
                  href={program.antagningSearch}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackExternalClick(program.antagningSearch, { source: "program_detail", programId: program.id })}
                >
                  Kontrollera på Antagning.se ↗
                </a>
                <CompareButton programId={program.id} />
                <SaveProgramButton programId={program.id} />
              </div>
            </div>

            <aside className="detailMatchCard">
              {personalScore ? (
                <>
                  <span className="eyebrow">Din personliga match</span>
                  <strong className="detailMatchScore">{personalScore}%</strong>
                  <p>Beräknat från ditt senaste resultat i Högskolekompassen.</p>
                  {scoreDetail?.scoreBreakdown ? (
                    <div className="detailBreakdownMini">
                      <span>Intressen <strong>{scoreDetail.scoreBreakdown.interests}%</strong></span>
                      <span>Studiestil <strong>{scoreDetail.scoreBreakdown.studyStyle}%</strong></span>
                      <span>Arbetssätt <strong>{scoreDetail.scoreBreakdown.workStyle}%</strong></span>
                      <span>Framtidsmål <strong>{scoreDetail.scoreBreakdown.futureGoals}%</strong></span>
                      {scoreDetail.interestBoost ? <span>Intresseval <strong>+{scoreDetail.interestBoost}</strong></span> : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <span className="eyebrow">Ingen profil ännu</span>
                  <h2>Hur väl passar den dig?</h2>
                  <p>Gör kompassen för att få en personlig matchprocent och förklaring på den här sidan.</p>
                  <Link className="button buttonSmall" href="/kompass">Starta kompassen →</Link>
                </>
              )}
            </aside>
          </div>
        </div>
      </section>

      <section className="shell detailSection detailTwoCol">
        <div className="detailPanel">
          <span className="eyebrow">Studieprofil</span>
          <h2>Hur utbildningen lutar</h2>
          <p>Skalorna är modellvärden för jämförelse, inte officiella kursmått.</p>
          <div className="detailProfileRows">
            {profileRows.map(([key, label]) => {
              const value = program.vector[key] ?? 0.5;
              return (
                <div className="detailProfileRow" key={key}>
                  <div><span>{label}</span><strong>{Math.round(value * 100)}%</strong></div>
                  <div className="miniTrack"><div className="miniFill" style={{ width: `${Math.round(value * 100)}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="detailPanel detailQuickFacts">
          <span className="eyebrow">Snabböverblick</span>
          <h2>Vad kan du förvänta dig?</h2>
          <div className="quickFactGrid">
            <div><span>Matematik</span><strong>{program.studySummary.math}</strong></div>
            <div><span>Teori</span><strong>{program.studySummary.theory}</strong></div>
            <div><span>Programmering</span><strong>{program.studySummary.programming}</strong></div>
            <div><span>Praktiska moment</span><strong>{program.studySummary.practical}</strong></div>
            <div><span>Kommunikation</span><strong>{program.studySummary.communication}</strong></div>
            <div><span>Studiekaraktär</span><strong>{program.studySummary.style}</strong></div>
          </div>
        </div>
      </section>

      {personalScore ? (
        <section className="shell detailSection personalFitSection">
          <div className="sectionHeading compactHeading">
            <div>
              <span className="eyebrow">För dig</span>
              <h2>Varför den matchar – och vad du bör fundera på</h2>
            </div>
          </div>
          <div className="fitGrid">
            <div className="fitPanel positiveFitPanel">
              <span className="fitIcon">✓</span>
              <h3>Det som drog upp matchningen</h3>
              {scoreDetail?.contributors?.positive?.length ? (
                <ul>{scoreDetail.contributors.positive.map((item) => <li key={item.key}>{item.text}</li>)}</ul>
              ) : explanation.reasons.length ? (
                <ul>{explanation.reasons.map((item) => <li key={item.key}>{item.label}</li>)}</ul>
              ) : <p>Din profil ligger relativt balanserat nära utbildningens profil.</p>}
            </div>
            <div className="fitPanel cautionFitPanel">
              <span className="fitIcon">!</span>
              <h3>Det som drog ner matchningen</h3>
              {scoreDetail?.contributors?.negative?.length ? (
                <ul>{scoreDetail.contributors.negative.map((item) => <li key={item.key}>{item.text}</li>)}</ul>
              ) : explanation.cautions.length ? (
                <ul>{explanation.cautions.map((item) => <li key={item.key}>Utbildningen lutar mer åt {item.label.toLowerCase()} än vad dina svar gör.</li>)}</ul>
              ) : <p>Inga tydliga mismatch-signaler syns i din profil. Kontrollera ändå kursplan, behörighet och upplägg.</p>}
            </div>
          </div>
        </section>
      ) : null}

      <section className="shell detailSection detailTwoCol">
        <div className="detailPanel">
          <span className="eyebrow">Innehåll</span>
          <h2>Typiska teman att utforska</h2>
          <div className="contentTagGrid">
            {program.contentItems.map((item) => <span key={item}>{item}</span>)}
          </div>
          <p className="detailFootnote">Exakta kurser varierar mellan lärosäten och terminer. Använd detta som vägledning och kontrollera den aktuella utbildningsplanen.</p>
        </div>

        <div className="detailPanel">
          <span className="eyebrow">Efter studierna</span>
          <h2>Exempel på arbetsområden</h2>
          <ul className="careerList">
            {program.careerExamples.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <p className="detailFootnote">Detta är breda exempel på områden, inte en garanti om yrke eller behörighet.</p>
        </div>
      </section>

      <AdSenseUnit
        client={programAdClient}
        slot={programAdSlot}
        className="shell manualAdInline manualAdBetweenSections"
        label="Annons på utbildningssida"
        format="horizontal"
      />

      <section className="shell detailSection liveProgramSection" id="aktuellt">
        <div className="sectionHeading compactHeading">
          <div>
            <span className="eyebrow">Aktuellt utbud · Susa-navet</span>
            <h2>Verkliga utbildningstillfällen som liknar den här profilen</h2>
          </div>
          <Link href="/utbildningar" className="textButton">Se alla utbildningar →</Link>
        </div>

        {liveOfferings.length ? (
          <div className="programLiveGrid">
            {liveOfferings.map((offering) => (
              <article className="programLiveCard" key={offering.id}>
                <div className="programLiveMeta">
                  {offering.period ? <span>{offering.period}</span> : null}
                  {offering.distance ? <span>Distans</span> : null}
                  {offering.credits ? <span>{offering.credits} {offering.creditsUnit || "hp"}</span> : null}
                </div>
                <h3>{offering.title}</h3>
                <p>{offering.providerName || "Lärosäte ej angivet"}{offering.city ? ` · ${offering.city}` : ""}</p>
                {offering.applicationDeadline ? <small>Sista ansökningsdag: {offering.applicationDeadline}</small> : <small>Ansökningsdatum: kontrollera originalkällan.</small>}
                <div className="programLiveActions">
                  {offering.applicationUrl || offering.sourceUrl ? (
                    <a
                      href={offering.applicationUrl || offering.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="cardLink"
                      onClick={() => trackExternalClick(offering.applicationUrl || offering.sourceUrl, {
                        source: "program_live_offering",
                        programId: program.id,
                        offeringId: offering.id,
                      })}
                    >
                      Öppna utbildningen ↗
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="liveInlineEmpty">
            <strong>Inga synkade tillfällen är kopplade till profilen ännu.</strong>
            <p>Det kan betyda att live-synken inte har körts, att inget aktuellt tillfälle finns eller att titeln ännu inte har fått en säker automatisk koppling.</p>
            <Link href="/utbildningar" className="button buttonGhost buttonSmall">Öppna utbildningar</Link>
          </div>
        )}
      </section>

      <section className="relatedSection">
        <div className="shell detailSection">
          <div className="sectionHeading compactHeading">
            <div>
              <span className="eyebrow">Liknande utbildningar</span>
              <h2>Fortsätt utforska {program.category}</h2>
            </div>
          </div>
          <div className="relatedGrid">
            {related.map((item) => (
              <Link className="relatedCard" href={`/utbildningar?search=${encodeURIComponent(item.title)}`} key={item.id}>
                <span>{item.degree} · {item.years} år</span>
                <h3>{item.title}</h3>
                <p>{item.institution} · {item.city}</p>
                <strong>Öppna →</strong>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
