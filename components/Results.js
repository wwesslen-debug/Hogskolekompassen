"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

  const topArea = result.areaGroups?.[0];
  const isQuickResult = result.quizMode === "quick";
  const precisionLabel = result.profilePrecisionLabel || `${result.confidence}% säkert underlag`;
  const topAreasText = result.areas?.length
    ? result.areas.slice(0, 3).map((x) => x.category).join(", ")
    : "din personliga profil";
  const liveOnly = result.recommendationMode === "live_only";

  return (
    <main>
      <section className="resultHero resultHeroV3">
        <div className="shell resultHeroGrid">
          <div>
            <div className="resultHeroMeta">
              <span className="eyebrow">Din Högskoleprofil</span>
              <span className="confidencePill">{precisionLabel}</span>
            </div>
            <h1>{result.profileTitle}</h1>
            <p className="lead">
              Dina svar pekar framför allt mot <strong>{topAreasText}</strong>.
              Matchningen räknas mot aktuella utbildningstillfällen i livekatalogen, samtidigt som delpoängen visar <em>varför</em> en utbildning hamnar högt.
            </p>
            <p className="resultHelperNotice">
              Högskolekompassen är ett hjälpande verktyg för att utforska möjliga riktningar. Resultatet säger inte vad du borde eller inte borde plugga.
            </p>
            {isQuickResult ? (
              <p className="resultModeNotice">
                Snabbkompassen ger en första riktning baserad på {result.baseQuestionCount} adaptivt valda frågor. Djupkompassen gör profilen stabilare.
              </p>
            ) : null}
            <div className="resultSummaryStats">
              <div><strong>{result.certainAnswers}</strong><span>tydliga svar</span></div>
              <div><strong>{result.quizModeLabel || "Kompass"}</strong><span>{result.baseQuestionCount ? `${result.baseQuestionCount} frågor` : "frågeset"}</span></div>
              <div><strong>{result.adaptiveQuestionCount || 0}</strong><span>valda av motorn</span></div>
              <div><strong>{result.liveCatalogCount ?? result.catalogCount}</strong><span>{liveOnly ? "liveutbildningar analyserade" : "matchprofiler analyserade"}</span></div>
            </div>
          </div>

          {topArea ? (
            <div className="topMatchCard topMatchCardV3">
              <div className="matchBadge">{topArea.score}% {liveOnly ? "liveområdesmatch" : "områdesmatch"}</div>
              <span className="cardKicker">Starkaste riktning</span>
              <h2>{topArea.category}</h2>
              <p>{topArea.description}</p>
              <ScoreBreakdown breakdown={topArea.scoreBreakdown} />
              {topArea.liveOfferCount ? <div className="resultLiveBadge">● {topArea.liveOfferCount} aktuella live-tillfällen kopplade till området</div> : null}
              <div className="topMatchActions">
                <Link className="button buttonSmall" href="#live-resultat">Se aktuella utbildningar →</Link>
                <Link className="button buttonGhost buttonSmall" href="/utbildningar">Öppna utbildningar</Link>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section id="live-resultat" className="shell resultSection livePersonalSection livePersonalSectionPrimary">
        <LiveResultRecommendations result={result} variant="primary" />
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
          <div className="priorityResultBox interestResultBox">
            <div><span className="eyebrow">Riktning & intressen</span><h3>Det här fångade motorn upp</h3></div>
            <div className="priorityResultChips">
              {result.intentCertaintyLabel ? <span>{result.intentCertaintyLabel}</span> : null}
              {result.selectedInterests?.length
                ? result.selectedInterests.map((item) => <span key={item.id}>{item.label}</span>)
                : <span>Inga tydliga riktningar fångades upp</span>}
            </div>
          </div>
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
            <div><span className="eyebrow">Utbildningsområden</span><h2>Börja brett – gå vidare i liveutbudet</h2></div>
            <p>Områdena visar varför vissa riktningar passar din profil. Själva utbildningarna i resultatet hämtas från den aktuella livekatalogen ovan.</p>
          </div>

          {result.topAreaGap != null && result.topAreaGap <= 4 ? (
            <div className="closeRaceBanner">
              <span>✦</span>
              <div><strong>Du har två väldigt jämna toppområden.</strong><p>Bara {result.topAreaGap} procentenheter skiljer de två första. Det är en signal att båda är värda att utforska, inte att modellen “måste välja en vinnare”.</p></div>
            </div>
          ) : null}

          <div className="areaResultList">
            {(result.areaGroups || []).map((area, index) => (
              <article className={`areaResultCard ${index === 0 ? "featuredArea" : ""}`} key={area.category}>
                <div className="areaResultScore"><span>#{index + 1}</span><strong>{area.score}%</strong><small>områdesmatch</small></div>
                <div className="areaResultBody">
                  <div className="areaTitleRow"><h3>{area.category}</h3>{area.liveOfferCount ? <span className="resultLiveBadge">● {area.liveOfferCount} live-tillfällen</span> : null}</div>
                  <p>{area.description}</p>
                  <ScoreBreakdown breakdown={area.scoreBreakdown} />
                  <div className="whyMatchInline"><strong>Matchar särskilt genom:</strong><span>{area.reasons.join(" · ") || "en balanserad profil"}</span></div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="shell resultSection">
        <div className="sectionHeading">
          <div><span className="eyebrow">Nästa steg</span><h2>Använd matchningen som urval, inte facit</h2></div>
          <p>Resultaten bygger på aktuella liveposter. Kontrollera alltid utbildningssidan för behörighet, upplägg och ansökningsdatum.</p>
        </div>

        <div className="dataNotice dataNoticeV2">
          <strong>Så ska resultatet tolkas:</strong> procenten är en profilmatch i Högskolekompassens modell – inte sannolikhet för trivsel, examen eller antagning. Liveposterna visar aktuella utbildningstillfällen, men behörighet och antagningsinformation ska alltid verifieras hos lärosätet och Antagning.se.
        </div>

        <div className="centerActions">
          {isQuickResult ? <Link className="button" href="/kompass">Gör hela kompassen</Link> : null}
          <Link className="button buttonGhost" href="/kompass">Gör om kompassen</Link>
          <Link className="button buttonGhost" href="/min-vag">Öppna Min väg</Link>
          <Link className={isQuickResult ? "button buttonGhost" : "button"} href="/utbildningar">Utforska utbildningar</Link>
        </div>
      </section>
    </main>
  );
}
