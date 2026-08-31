"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CompareButton from "@/components/CompareButton";
import { COMPARE_EVENT_NAME, readCompareEntries } from "@/lib/compare-storage";

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

function scoreFor(offering, scoreByLiveOfferingId) {
  const score = Number(offering.personalScore ?? scoreByLiveOfferingId[offering.id]);
  return Number.isFinite(score) && score > 0 ? Math.round(score) : null;
}

const rows = [
  ["Din match", (item, context) => {
    const score = scoreFor(item, context.scoreByLiveOfferingId);
    return score ? `${score}%` : "Gör kompassen";
  }],
  ["Område", (item) => item.inferredCategory || "Beräknas från liveposten"],
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
  const [scoredOfferingsById, setScoredOfferingsById] = useState({});

  useEffect(() => {
    try {
      const result = JSON.parse(sessionStorage.getItem("hogskolekompassen-result") || "null");
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

  const ids = useMemo(() => entries.map((entry) => entry.id), [entries]);
  const idKey = ids.join(",");

  useEffect(() => {
    if (!ids.length) {
      setOfferings([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      ids: idKey,
      limit: String(Math.max(1, ids.length)),
      upcoming: "0",
    });

    setLoading(true);
    fetch(`/api/live-educations?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((payload) => {
        const byId = new Map((payload.offerings || []).map((item) => [Number(item.id), item]));
        setOfferings(ids.map((id) => byId.get(id)).filter(Boolean));
      })
      .catch((error) => { if (error.name !== "AbortError") setOfferings([]); })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [idKey]);

  const mergedOfferings = useMemo(() => offerings.map((offering) => ({
    ...offering,
    ...(scoredOfferingsById[offering.id] || {}),
  })), [offerings, scoredOfferingsById]);

  const ranked = useMemo(() => [...mergedOfferings]
    .map((offering) => ({ offering, score: scoreFor(offering, scoreByLiveOfferingId) }))
    .filter((item) => item.score)
    .sort((a, b) => b.score - a.score), [mergedOfferings, scoreByLiveOfferingId]);

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
                const score = scoreFor(offering, scoreByLiveOfferingId);
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
                  {mergedOfferings.map((offering) => <div className="compareCell" key={offering.id}>{getter(offering, { scoreByLiveOfferingId })}</div>)}
                </div>
              ))}
            </div>

            <div className="compareDetailsGrid" style={{ "--compare-count": mergedOfferings.length }}>
              <div className="compareCorner">Beskrivning</div>
              {mergedOfferings.map((offering) => <div className="compareDetailCell" key={offering.id}>{offering.description || "Beskrivning saknas i livedatan. Öppna originalkällan för mer information."}</div>)}
              <div className="compareCorner">Behörighet</div>
              {mergedOfferings.map((offering) => <div className="compareDetailCell" key={offering.id}>{offering.eligibility || "Kontrollera behörighet hos lärosätet eller Antagning.se."}</div>)}
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
