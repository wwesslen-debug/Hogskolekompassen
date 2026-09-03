"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CompareButton from "@/components/CompareButton";
import { COMPARE_EVENT_NAME, compareEntryKey, readCompareEntries } from "@/lib/compare-storage";
import { cleanLiveText } from "@/lib/live-text";

const breakdownLabels = {
  interests: "Intressen",
  studyStyle: "Studiestil",
  workStyle: "Arbetssätt",
  futureGoals: "Framtidsmål",
};

function formatDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function applicationLabel(offering) {
  const today = new Date().toISOString().slice(0, 10);
  if (offering.applicationOpen && offering.applicationOpen > today) return `Öppnar ${formatDate(offering.applicationOpen)}`;
  if (offering.applicationDeadline && offering.applicationDeadline >= today && (!offering.applicationOpen || offering.applicationOpen <= today)) {
    return `Sök senast ${formatDate(offering.applicationDeadline)}`;
  }
  if (offering.applicationDeadline && offering.applicationDeadline < today) return "Ansökan stängd";
  return "Kontrollera hos lärosätet";
}

function creditsLabel(offering) {
  if (!offering.credits) return "Ej angiven";
  return `${offering.credits} ${offering.creditsUnit || "hp"}`;
}

function targetUrl(offering) {
  return offering.applicationUrl || offering.sourceUrl || "";
}

function scoreFor(offering, context = {}) {
  const score = Number(
    offering.personalScore
    ?? context.scoreByLiveOfferingId?.[offering.id]
    ?? context.scoreByProgramId?.[offering.canonicalProgramId]
  );
  return Number.isFinite(score) && score > 0 ? Math.round(score) : null;
}

function mergeScoreData(offering, context = {}) {
  const {
    scoreByLiveOfferingId = {},
    scoreByProgramId = {},
    scoreDetailsByProgramId = {},
    scoredOfferingsById = {},
  } = context;
  const scoredOffering = scoredOfferingsById[offering.id] || {};
  const programScoreDetails = scoreDetailsByProgramId[offering.canonicalProgramId] || {};

  return {
    ...offering,
    inferredCategory: scoredOffering.inferredCategory ?? offering.inferredCategory,
    personalScore: scoredOffering.personalScore
      ?? programScoreDetails.score
      ?? scoreByLiveOfferingId[offering.id]
      ?? scoreByProgramId[offering.canonicalProgramId]
      ?? offering.personalScore,
    scoreBreakdown: scoredOffering.scoreBreakdown ?? programScoreDetails.scoreBreakdown ?? offering.scoreBreakdown,
    interestBoost: scoredOffering.interestBoost ?? programScoreDetails.interestBoost ?? offering.interestBoost,
    dealBreakerPenalty: scoredOffering.dealBreakerPenalty ?? programScoreDetails.dealBreakerPenalty ?? offering.dealBreakerPenalty,
    matchSource: scoredOffering.matchSource ?? programScoreDetails.matchSource ?? offering.matchSource,
    matchConfidence: scoredOffering.matchConfidence ?? programScoreDetails.matchConfidence ?? offering.matchConfidence,
    matchLabel: scoredOffering.matchLabel ?? offering.matchLabel,
  };
}

function ExpandableCompareText({ text, emptyText, maxLength = 520 }) {
  const [expanded, setExpanded] = useState(false);
  const cleanText = cleanLiveText(text);
  const hasText = Boolean(cleanText);
  const isLong = cleanText.length > maxLength;
  const visibleText = expanded || !isLong ? cleanText : `${cleanText.slice(0, maxLength).trim()}...`;

  if (!hasText) return emptyText;

  return (
    <div className="compareExpandableText">
      <p>{visibleText}</p>
      {isLong ? (
        <button
          type="button"
          className="compareReadMore"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          {expanded ? "Visa mindre" : "Se mer"}
        </button>
      ) : null}
    </div>
  );
}

const rows = [
  ["Din match", (item, context) => {
    const score = scoreFor(item, context);
    return score ? `${score}%` : "Gör kompassen";
  }],
  ["Område", (item) => item.inferredCategory || "Brett utbildningsområde"],
  ["Lärosäte", (item) => item.providerName || "Ej angivet"],
  ["Ort", (item) => item.city || (item.distance ? "Distans" : "Ej angiven")],
  ["Starttermin", (item) => item.period || "Ej angiven"],
  ["Startdatum", (item) => formatDate(item.startDate) || "Ej angivet"],
  ["Studieform", (item) => item.distance ? "Distans" : item.studyForm || "Ej angiven"],
  ["Studietakt", (item) => item.studyPace || "Ej angiven"],
  ["Omfattning", creditsLabel],
  ["Nivå", (item) => item.level === "grund" ? "Grundnivå" : item.level || "Ej angiven"],
  ["Examen", (item) => item.degree || "Se utbildningssidan"],
  ["Ansökan", applicationLabel],
];

export default function ComparePage() {
  const [entries, setEntries] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scoreByLiveOfferingId, setScoreByLiveOfferingId] = useState({});
  const [scoreByProgramId, setScoreByProgramId] = useState({});
  const [scoreDetailsByProgramId, setScoreDetailsByProgramId] = useState({});
  const [scoredOfferingsById, setScoredOfferingsById] = useState({});

  useEffect(() => {
    try {
      const result = JSON.parse(sessionStorage.getItem("hogskolekompassen-result") || "null");
      if (result?.schemaVersion >= 6) {
        setScoreByProgramId(result.scoreById || {});
        setScoreDetailsByProgramId(result.scoreDetailsById || {});
      }
      if (result?.schemaVersion >= 9) {
        setScoreByLiveOfferingId(result.scoreByLiveOfferingId || {});
        setScoredOfferingsById(Object.fromEntries((result.liveOfferings || []).map((item) => [item.id, item])));
      }
    } catch {}

    const update = (event) => setEntries(event?.detail || readCompareEntries());
    setEntries(readCompareEntries());
    window.addEventListener(COMPARE_EVENT_NAME, update);
    return () => window.removeEventListener(COMPARE_EVENT_NAME, update);
  }, []);

  const entryKey = useMemo(() => entries.map(compareEntryKey).join(","), [entries]);

  useEffect(() => {
    if (!entries.length) {
      setOfferings([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const liveIds = entries.filter((entry) => entry.kind === "live").map((entry) => entry.id);
    const programIds = entries.filter((entry) => entry.kind === "program").map((entry) => entry.id);

    async function fetchJson(url) {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Compare fetch failed with ${response.status}`);
      return response.json();
    }

    setLoading(true);
    Promise.allSettled([
      liveIds.length
        ? fetchJson(`/api/live-educations?${new URLSearchParams({ ids: liveIds.join(","), limit: String(Math.max(1, liveIds.length)), upcoming: "0" })}`)
        : Promise.resolve({ offerings: [] }),
      ...programIds.map((programId) => fetchJson(`/api/live-educations?${new URLSearchParams({ programId: String(programId), limit: "1" })}`)),
    ])
      .then((results) => {
        if (controller.signal.aborted) return;
        const [liveResult, ...programResults] = results;
        const liveOfferings = liveResult.status === "fulfilled" ? liveResult.value.offerings || [] : [];
        const programOfferings = programResults.flatMap((result) => result.status === "fulfilled" ? result.value.offerings || [] : []);
        const liveById = new Map(liveOfferings.map((item) => [String(item.id), item]));
        const liveByProgramId = new Map();

        for (const item of programOfferings) {
          const programId = Number(item.canonicalProgramId);
          if (Number.isInteger(programId) && !liveByProgramId.has(programId)) liveByProgramId.set(programId, item);
        }

        const seen = new Set();
        const selected = [];
        for (const entry of entries) {
          const offering = entry.kind === "live" ? liveById.get(String(entry.id)) : liveByProgramId.get(entry.id);
          if (!offering || seen.has(offering.id)) continue;
          seen.add(offering.id);
          selected.push(offering);
        }

        setOfferings(selected);
      })
      .catch((error) => { if (error.name !== "AbortError") setOfferings([]); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    return () => controller.abort();
  }, [entryKey, entries]);

  const mergedOfferings = useMemo(() => offerings.map((offering) => mergeScoreData(offering, {
    scoreByLiveOfferingId,
    scoreByProgramId,
    scoreDetailsByProgramId,
    scoredOfferingsById,
  })), [offerings, scoreByLiveOfferingId, scoreByProgramId, scoreDetailsByProgramId, scoredOfferingsById]);

  const ranked = useMemo(() => [...mergedOfferings]
    .map((offering) => ({ offering, score: scoreFor(offering, { scoreByLiveOfferingId, scoreByProgramId }) }))
    .filter((item) => item.score)
    .sort((a, b) => b.score - a.score), [mergedOfferings, scoreByLiveOfferingId, scoreByProgramId]);

  const best = ranked[0] || null;
  const gap = ranked.length >= 2 ? best.score - ranked[1].score : null;

  const dimensionWinners = useMemo(() => {
    if (!mergedOfferings.length) return [];
    return Object.keys(breakdownLabels).map((key) => {
      const candidates = mergedOfferings
        .map((offering) => ({ offering, value: offering.scoreBreakdown?.[key] }))
        .filter((item) => Number.isFinite(item.value))
        .sort((a, b) => b.value - a.value);
      if (!candidates.length) return null;
      return { key, label: breakdownLabels[key], offering: candidates[0].offering, value: candidates[0].value };
    }).filter(Boolean);
  }, [mergedOfferings]);

  if (!entries.length && !loading) {
    return (
      <main className="comparePage">
        <section className="shell compareEmpty">
          <span className="eyebrow">Jämför utbildningar</span>
          <h1>Välj upp till tre riktiga utbildningar</h1>
          <p className="lead">Lägg till utbildningar från resultatet eller utbildningslistan så jämför vi aktuella liveposter sida vid sida.</p>
          <Link className="button" href="/utbildningar">Utforska utbildningar →</Link>
        </section>
      </main>
    );
  }

  if (entries.length && !loading && !mergedOfferings.length) {
    return (
      <main className="comparePage">
        <section className="shell compareEmpty">
          <span className="eyebrow">Jämför utbildningar</span>
          <h1>De valda utbildningarna kunde inte läsas</h1>
          <p className="lead">Det kan bero på att livekatalogen saknar data lokalt eller att utbildningarna inte längre finns i det synkade API-utbudet.</p>
          <Link className="button" href="/utbildningar">Välj utbildningar på nytt →</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="comparePage">
      <section className="shell compareHeader">
        <span className="eyebrow">Jämför utbildningar</span>
        <h1>Vilken riktig utbildning passar bäst?</h1>
        <p className="lead">Jämförelsen använder liveposter från utbildnings-API:t: lärosäte, ort, start, omfattning, ansökan och din senaste personliga matchning när den finns.</p>
      </section>

      <section className="shell compareSection">
        {loading ? <div className="compareLoading">Laddar jämförelsen…</div> : (
          <>
            {entries.length > mergedOfferings.length ? (
              <div className="compareProfilePrompt">
                <strong>{entries.length - mergedOfferings.length} val kunde inte kopplas till en aktuell livepost.</strong>
                <Link href="/utbildningar">Välj direkt från livekatalogen →</Link>
              </div>
            ) : null}

            {best ? (
              <div className="compareVerdict">
                <div className="verdictMain">
                  <span className="eyebrow">Personlig slutsats</span>
                  <h2>{best.offering.title} har högst totalmatch just nu.</h2>
                  <p>
                    {gap == null
                      ? `Din matchning är ${best.score}%.`
                      : gap <= 4
                        ? `Det är ett mycket jämnt val: bara ${gap} procentenheter skiljer förstaplatsen från tvåan. Jämför därför start, studieform och ansökningsläge extra noga.`
                        : `Den ligger ${gap} procentenheter före nästa alternativ i din nuvarande profil.`}
                  </p>
                  <div className="verdictActions">
                    {targetUrl(best.offering) ? <a href={targetUrl(best.offering)} target="_blank" rel="noreferrer" className="button buttonSmall">Öppna utbildningen →</a> : null}
                    <Link href="/kompass" className="button buttonGhost buttonSmall">Förfina min profil</Link>
                  </div>
                </div>
                <div className="dimensionWinnerGrid">
                  {dimensionWinners.map((winner) => (
                    <div key={winner.key}>
                      <span>{winner.label}</span>
                      <strong>{winner.offering.title}</strong>
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

            <div className="compareProgramHeaders" style={{ "--compare-count": mergedOfferings.length }}>
              <div className="compareCorner">Jämförelse</div>
              {mergedOfferings.map((offering) => {
                const score = scoreFor(offering, { scoreByLiveOfferingId, scoreByProgramId });
                return (
                  <div className="compareProgramHeader" key={offering.id}>
                    {score ? <span className={`compareScore ${score === best?.score ? "best" : ""}`}>{score}% match</span> : null}
                    <span>{offering.period || offering.inferredCategory || "Liveutbildning"}</span>
                    <h2>{offering.title}</h2>
                    <p>{offering.providerName || "Lärosäte ej angivet"}{offering.city ? ` · ${offering.city}` : ""}</p>
                    <div className="compareHeaderActions"><CompareButton offeringId={offering.id} compact /></div>
                  </div>
                );
              })}
            </div>

            {dimensionWinners.length ? (
              <div className="compareBreakdownTable" style={{ "--compare-count": mergedOfferings.length }}>
                {Object.entries(breakdownLabels).map(([key, label]) => (
                  <div className="compareBreakdownRow" key={key}>
                    <div className="compareRowLabel">{label}</div>
                    {mergedOfferings.map((offering) => {
                      const value = offering.scoreBreakdown?.[key];
                      return <div className="compareBreakdownCell" key={offering.id}><strong>{value ?? "–"}{value != null ? "%" : ""}</strong><div className="miniTrack"><div className="miniFill" style={{ width: `${value || 0}%` }} /></div></div>;
                    })}
                  </div>
                ))}
              </div>
            ) : null}

            <div className="compareTable" style={{ "--compare-count": mergedOfferings.length }}>
              {rows.map(([label, getter]) => (
                <div className="compareRow" key={label}>
                  <div className="compareRowLabel">{label}</div>
                  {mergedOfferings.map((offering) => <div className="compareCell" key={offering.id}>{getter(offering, { scoreByLiveOfferingId, scoreByProgramId })}</div>)}
                </div>
              ))}
            </div>

            <div className="compareDetailsGrid" style={{ "--compare-count": mergedOfferings.length }}>
              <div className="compareCorner">Beskrivning</div>
              {mergedOfferings.map((offering) => (
                <div className="compareDetailCell" key={offering.id}>
                  <ExpandableCompareText text={offering.description} emptyText="Beskrivning saknas i livedatan. Öppna originalkällan för mer information." />
                </div>
              ))}
              <div className="compareCorner">Behörighet</div>
              {mergedOfferings.map((offering) => (
                <div className="compareDetailCell" key={offering.id}>
                  <ExpandableCompareText text={offering.eligibility} emptyText="Kontrollera behörighet hos lärosätet eller Antagning.se." />
                </div>
              ))}
            </div>

            <div className="compareBottomActions">
              {mergedOfferings.map((offering) => (
                targetUrl(offering)
                  ? <a href={targetUrl(offering)} target="_blank" rel="noreferrer" className="button buttonGhost" key={offering.id}>Öppna {offering.title} →</a>
                  : <Link href={`/utbildningar?search=${encodeURIComponent(offering.title)}`} className="button buttonGhost" key={offering.id}>Sök efter {offering.title} →</Link>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
