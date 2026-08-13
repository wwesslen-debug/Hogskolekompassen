"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CompareButton from "@/components/CompareButton";
import SaveProgramButton from "@/components/SaveProgramButton";
import ProfileRadar from "@/components/ProfileRadar";
import LiveResultRecommendations from "@/components/LiveResultRecommendations";

function percent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

const breakdownLabels = {
  interests: "Intressen",
  studyStyle: "Studiestil",
  workStyle: "Arbetssätt",
  futureGoals: "Framtidsmål",
};

function ScoreBreakdown({ breakdown }) {
  return (
    <div className="scoreBreakdownGrid">
      {Object.entries(breakdown || {}).map(([key, value]) => (
        <div className="scoreBreakdownItem" key={key}>
          <div><span>{breakdownLabels[key] || key}</span><strong>{value}%</strong></div>
          <div className="miniTrack"><div className="miniFill" style={{ width: `${value}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export default function Results() {
  const [result, setResult] = useState(null);
  const [openWhy, setOpenWhy] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("hogskolekompassen-result");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.schemaVersion >= 6) setResult(parsed);
        else sessionStorage.removeItem("hogskolekompassen-result");
      } catch {
        sessionStorage.removeItem("hogskolekompassen-result");
      }
    }
  }, []);

  const coreTraits = useMemo(
    () => result?.strengths?.filter((item) => item.group === "core") || [],
    [result]
  );
  const studyTraits = useMemo(
    () => result?.strengths?.filter((item) => item.group === "study") || [],
    [result]
  );

  if (!result) {
    return (
      <div className="emptyState shell">
        <div className="emptyIcon">↗</div>
        <h1>Inget resultat ännu</h1>
        <p>Gör kompassen först så bygger vi din personliga utbildningsprofil.</p>
        <Link className="button" href="/kompass">Starta kompassen</Link>
      </div>
    );
  }

  const top = result.matches?.[0];
  const topArea = result.areaGroups?.[0];

  return (
    <main>
      <section className="resultHero resultHeroV3">
        <div className="shell resultHeroGrid">
          <div>
            <div className="resultHeroMeta">
              <span className="eyebrow">Din Högskoleprofil</span>
              <span className="confidencePill">{result.confidence}% säkert underlag</span>
            </div>
            <h1>{result.profileTitle}</h1>
            <p className="lead">
              Dina svar pekar framför allt mot <strong>{result.areas.slice(0, 3).map((x) => x.category).join(", ")}</strong>.
              I v0.7 kombineras profilmatchningen dessutom med aktuella utbildningstillfällen, samtidigt som delpoängen visar <em>varför</em> en utbildning hamnar högt.
            </p>
            <div className="resultSummaryStats">
              <div><strong>{result.certainAnswers}</strong><span>tydliga svar</span></div>
              <div><strong>{result.adaptiveQuestionCount || 0}</strong><span>adaptiva frågor</span></div>
              <div><strong>{result.catalogCount}</strong><span>utbildningar analyserade</span></div>
            </div>
          </div>

          {top ? (
            <div className="topMatchCard topMatchCardV3">
              <div className="matchBadge">{top.score}% totalmatch</div>
              <span className="cardKicker">Starkaste enskilda matchningen</span>
              <h2>{top.title}</h2>
              <p>{top.institution} · {top.city}</p>
              <ScoreBreakdown breakdown={top.scoreBreakdown} />
              {top.dealBreakerPenalty ? <div className="penaltyBadge">−{top.dealBreakerPenalty} p deal-breaker-avdrag</div> : null}
              <div className="topMatchActions">
                <Link className="button buttonSmall" href={`/utbildningar/${top.id}`}>Se utbildningen →</Link>
                <CompareButton programId={top.id} compact />
                <SaveProgramButton programId={top.id} compact />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="shell resultSection">
        <div className="sectionHeading compactHeading">
          <div>
            <span className="eyebrow">Din profil</span>
            <h2>Så ser dina drivkrafter ut</h2>
          </div>
          <p>Profilen visar preferenser och riktning – inte förmåga, behörighet eller en garanti för trivsel.</p>
        </div>

        <div className="profileDashboard">
          <ProfileRadar items={coreTraits} />
          <div className="studyProfileCard">
            <div className="studyProfileHeader"><span className="eyebrow">Studieprofil</span><h3>Hur du verkar vilja studera</h3></div>
            <div className="profileBars studyBars">
              {studyTraits.map((item) => (
                <div className="profileRow" key={item.key}>
                  <div className="profileLabel"><span>{item.short}</span><strong>{percent(item.value)}</strong></div>
                  <div className="miniTrack"><div className="miniFill" style={{ width: percent(item.value) }} /></div>
                  <small>{item.description}</small>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="resultPreferenceGrid">
          <div className="priorityResultBox">
            <div><span className="eyebrow">Dina prioriteringar</span><h3>Det här fick väga lite extra</h3></div>
            <div className="priorityResultChips">
              {result.selectedPriorities?.length
                ? result.selectedPriorities.map((item) => <span key={item.id}>{item.label}</span>)
                : <span>Inga extra prioriteringar valda</span>}
            </div>
          </div>
          <div className="priorityResultBox dealBreakerResultBox">
            <div><span className="eyebrow">Deal-breakers</span><h3>Det här kan ge tydliga avdrag</h3></div>
            <div className="priorityResultChips">
              {result.selectedDealBreakers?.length
                ? result.selectedDealBreakers.map((item) => <span key={item.id}>{item.label}</span>)
                : <span>Inga deal-breakers valda</span>}
            </div>
          </div>
        </div>
      </section>

      <section className="areaResultsSection">
        <div className="shell resultSection">
          <div className="sectionHeading">
            <div><span className="eyebrow">Utbildningsområden</span><h2>Börja brett – välj program sedan</h2></div>
            <p>Varje område får nu även delpoäng så att du kan se om matchningen främst kommer från intresse, studiestil eller arbetssätt.</p>
          </div>

          {result.topAreaGap != null && result.topAreaGap <= 4 ? (
            <div className="closeRaceBanner">
              <span>✦</span>
              <div><strong>Du har två väldigt jämna toppområden.</strong><p>Bara {result.topAreaGap} procentenheter skiljer de två första. Det är en signal att båda är värda att utforska, inte att modellen “måste välja en vinnare”.</p></div>
            </div>
          ) : null}

          <div className="areaResultList">
            {result.areaGroups.map((area, index) => (
              <article className={`areaResultCard ${index === 0 ? "featuredArea" : ""}`} key={area.category}>
                <div className="areaResultScore"><span>#{index + 1}</span><strong>{area.score}%</strong><small>områdesmatch</small></div>
                <div className="areaResultBody">
                  <div className="areaTitleRow"><h3>{area.category}</h3>{area.liveOfferCount ? <span className="resultLiveBadge">● {area.liveOfferCount} live-tillfällen</span> : null}</div>
                  <p>{area.description}</p>
                  <ScoreBreakdown breakdown={area.scoreBreakdown} />
                  <div className="whyMatchInline"><strong>Matchar särskilt genom:</strong><span>{area.reasons.join(" · ") || "en balanserad profil"}</span></div>
                  <div className="areaPrograms">
                    {area.programs.slice(0, 5).map((program) => (
                      <Link href={`/utbildningar/${program.id}`} key={program.id} className="areaProgramPill"><span>{program.title}</span><strong>{program.score}%</strong></Link>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="shell resultSection livePersonalSection">
        <LiveResultRecommendations result={result} />
      </section>

      <section className="shell resultSection">
        <div className="sectionHeading">
          <div><span className="eyebrow">Utbildningsprofiler</span><h2>Dina mest intressanta utbildningstyper</h2></div>
          <p>Öppna “Varför?” för att se vad som faktiskt drog matchningen upp eller ner.</p>
        </div>

        <div className="programResults programResultsV2">
          {result.matches.map((program, i) => {
            const whyOpen = openWhy === program.id;
            return (
              <article className="programResultCard programResultCardV3" key={program.id}>
                <div className="programRank"><span>#{i + 1}</span><strong>{program.score}%</strong></div>
                <div className="programBody">
                  <div className="programMeta"><span>{program.category}</span><span>{program.degree}</span><span>{program.years} år</span></div>
                  <h3>{program.title}</h3>
                  {program.liveOfferCount ? <div className="resultLiveBadge">● {program.liveOfferCount} aktuella/synkade tillfällen</div> : null}
                  <p className="institutionLine">{program.institution} · {program.city}</p>
                  <p>{program.description}</p>

                  <ScoreBreakdown breakdown={program.scoreBreakdown} />

                  <div className="programStudyFacts">
                    <span><small>Matematik</small><strong>{program.studySummary.math}</strong></span>
                    <span><small>Teori</small><strong>{program.studySummary.theory}</strong></span>
                    <span><small>Programmering</small><strong>{program.studySummary.programming}</strong></span>
                    <span><small>Stil</small><strong>{program.studySummary.style}</strong></span>
                  </div>

                  <button type="button" className="whyToggle" onClick={() => setOpenWhy(whyOpen ? null : program.id)}>
                    {whyOpen ? "Dölj förklaringen ↑" : "Varför den här matchningen? ↓"}
                  </button>

                  {whyOpen ? (
                    <div className="explainabilityPanel">
                      <div className="explainColumn positiveExplain">
                        <strong>Det här drog upp</strong>
                        {program.contributors?.positive?.length ? program.contributors.positive.map((item) => (
                          <div key={item.key}><span>+</span><p>{item.text}</p></div>
                        )) : <p>Matchningen är jämn över flera dimensioner.</p>}
                      </div>
                      <div className="explainColumn negativeExplain">
                        <strong>Det här drog ner</strong>
                        {program.contributors?.negative?.length ? program.contributors.negative.map((item) => (
                          <div key={item.key}><span>−</span><p>{item.text}</p></div>
                        )) : <p>Inga tydliga negativa signaler i din profil.</p>}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="programCardActions">
                  <Link className="button buttonGhost" href={`/utbildningar/${program.id}`}>Läs mer</Link>
                  <CompareButton programId={program.id} />
                  <SaveProgramButton programId={program.id} />
                </div>
              </article>
            );
          })}
        </div>

        <div className="dataNotice dataNoticeV2">
          <strong>Så ska resultatet tolkas:</strong> procenten är en profilmatch i prototypens modell – inte sannolikhet för trivsel, examen eller antagning. Aktuellt utbud, behörighet och antagningsinformation ska verifieras hos lärosätet och Antagning.se.
        </div>

        <div className="centerActions">
          <Link className="button buttonGhost" href="/kompass">Gör om kompassen</Link>
          <Link className="button buttonGhost" href="/min-vag">Öppna Min väg</Link>
          <Link className="button" href="/utbildningar">Utforska alla utbildningar</Link>
        </div>
      </section>
    </main>
  );
}
