"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { trackExternalClick } from "@/lib/analytics-client";

function formatDate(value) {
  if (!value) return null;
  try { return new Date(`${value}T12:00:00`).toLocaleDateString("sv-SE", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return value; }
}

function applicationLabel(offering) {
  const today = new Date().toISOString().slice(0, 10);
  if (offering.applicationOpen && offering.applicationOpen > today) return { label: `Öppnar ${formatDate(offering.applicationOpen)}`, tone: "future" };
  if (offering.applicationDeadline && offering.applicationDeadline >= today && (!offering.applicationOpen || offering.applicationOpen <= today)) return { label: `Ansök senast ${formatDate(offering.applicationDeadline)}`, tone: "open" };
  if (offering.applicationDeadline && offering.applicationDeadline < today) return { label: "Ansökan stängd", tone: "closed" };
  return { label: "Se ansökningsinfo", tone: "unknown" };
}

export default function LiveResultRecommendations({ result, variant = "default" }) {
  const [offerings, setOfferings] = useState([]);
  const [status, setStatus] = useState(null);
  const [coverage, setCoverage] = useState(null);
  const [loading, setLoading] = useState(true);
  const isPrimary = variant === "primary";

  const ids = useMemo(() => (result?.matches || []).slice(0, 30).map((item) => item.id), [result]);
  const programById = useMemo(() => Object.fromEntries((result?.matches || []).map((item) => [item.id, item])), [result]);
  const idKey = ids.join(",");

  useEffect(() => {
    if (!result?.profile) {
      setLoading(false);
      setOfferings([]);
      return;
    }
    if (Array.isArray(result.liveOfferings)) {
      setStatus(result.liveStatus || null);
      setCoverage(result.liveCoverage || null);
      setOfferings(result.liveOfferings);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch("/api/live-recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        ids,
        limit: isPrimary ? 24 : 15,
        profile: result.profile,
        traitConfidence: result.traitConfidence,
        scoreById: result.scoreById,
        interests: (result.selectedInterests || []).map((item) => item.id || item),
        intentCertainty: result.intentCertainty,
        priorities: (result.selectedPriorities || []).map((item) => item.id || item),
        dealBreakers: (result.selectedDealBreakers || []).map((item) => item.id || item),
      }),
    })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("live fetch failed")))
      .then((data) => {
        setStatus(data.status || null);
        setCoverage(data.coverage || null);
        setOfferings(data.offerings || []);
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          setOfferings([]);
          setCoverage(null);
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [idKey, result, isPrimary]);

  if (!loading && !offerings.length && result?.recommendationMode === "live_only") {
    return (
      <section className={`liveResultSection ${isPrimary ? "primaryLiveResults" : ""}`}>
        <div className="sectionHeading liveResultHeading">
          <div>
            <span className="eyebrow">Live från Susa-navet</span>
            <h2>Inga aktuella liveutbildningar kunde matchas</h2>
          </div>
          <p>Din profil är sparad, men livekatalogen behöver innehålla synkade aktuella programstarter innan personliga utbildningsförslag kan visas.</p>
        </div>
        <div className="dataNotice">
          <strong>Live-only-läge:</strong> matchningen använder inte den lokala katalogen som reserv. När livekatalogen är synkad visas resultaten här.
        </div>
      </section>
    );
  }

  if (!loading && !offerings.length) return null;

  return (
    <section className={`liveResultSection ${isPrimary ? "primaryLiveResults" : ""}`}>
      <div className="sectionHeading liveResultHeading">
        <div>
          <span className="eyebrow">{isPrimary ? "Huvudresultat från livekatalogen" : "Live från Susa-navet"}</span>
          <h2>{isPrimary ? "Aktuella programstarter för dig" : "Aktuella utbildningar som matchar dig"}</h2>
        </div>
        <p>
          {isPrimary
            ? "Här poängsätts verkliga utbildningstillfällen direkt mot din profil. Resultatet bygger på de aktuella liveposterna som finns synkade just nu."
            : "Din personliga procent kommer från profilen och livedatan. Live-posten visar det faktiska utbildningstillfället och lärosätet."}
        </p>
      </div>

      {loading ? <div className="liveResultLoading">Hämtar aktuella utbildningstillfällen…</div> : (
        <div className="liveResultGrid">
          {offerings.slice(0, isPrimary ? 12 : 9).map((offering) => {
            const parent = programById[offering.canonicalProgramId];
            const personalScore = Math.round(Number(
              offering.personalScore ?? result?.scoreByLiveOfferingId?.[offering.id] ?? result?.scoreById?.[offering.canonicalProgramId] ?? parent?.score ?? 0
            ));
            const application = applicationLabel(offering);
            const target = offering.applicationUrl || offering.sourceUrl;
            const directLiveMatch = offering.matchSource === "live_profile" || !parent;
            return (
              <article className="liveResultCard" key={offering.id}>
                <div className="liveResultCardTop">
                  <div className="personalLiveScore"><strong>{personalScore}%</strong><span>{offering.matchLabel || "din match"}</span></div>
                  <span className={`applicationState ${application.tone}`}>{application.label}</span>
                </div>
                <div className="liveResultMeta">
                  {offering.period ? <span>{offering.period}</span> : null}
                  {offering.kind ? <span>{offering.kind === "program" ? "Program" : offering.kind === "course" || offering.kind === "kurs" ? "Kurs" : offering.kind}</span> : null}
                  {offering.distance ? <span>Distans</span> : null}
                  {offering.credits ? <span>{offering.credits} {offering.creditsUnit || "hp"}</span> : null}
                </div>
                <h3>{offering.title}</h3>
                <p className="institutionLine">{offering.providerName || "Lärosäte ej angivet"}{offering.city ? ` · ${offering.city}` : ""}</p>
                <div className="liveResultFacts">
                  {offering.startDate ? <span><small>Start</small><strong>{formatDate(offering.startDate)}</strong></span> : null}
                  {offering.studyPace ? <span><small>Studietakt</small><strong>{offering.studyPace}</strong></span> : null}
                  {offering.level ? <span><small>Nivå</small><strong>{offering.level === "grund" ? "Grundnivå" : offering.level === "avancerad" ? "Avancerad" : offering.level}</strong></span> : null}
                </div>
                <div className="liveResultLinkInfo">
                  {!directLiveMatch && offering.canonicalProgramId ? (
                    <>
                      <span>Kopplad till <Link href={`/utbildningar/${offering.canonicalProgramId}`}>{parent?.title || "kompassprofil"}</Link></span>
                      <small>
                        {offering.linkScore ? `${offering.linkScore}% länksäkerhet` : "Katalogkoppling"}
                        {offering.matchConfidence ? ` · ${offering.matchConfidence}% metodsäkerhet` : ""}
                      </small>
                    </>
                  ) : (
                    <>
                      <span>Matchad direkt mot livedatan{offering.inferredCategory ? ` inom ${offering.inferredCategory.toLowerCase()}` : ""}</span>
                      {offering.matchConfidence ? <small>{offering.matchConfidence}% metodsäkerhet</small> : null}
                    </>
                  )}
                </div>
                <div className="liveResultActions">
                  {target ? (
                    <a
                      href={target}
                      target="_blank"
                      rel="noreferrer"
                      className="button buttonSmall"
                      onClick={() => trackExternalClick(target, {
                        source: "result_live_recommendation",
                        offeringId: offering.id,
                        programId: offering.canonicalProgramId,
                        matchSource: offering.matchSource,
                      })}
                    >
                      Utbildningssidan ↗
                    </a>
                  ) : null}
                  <Link href={`/aktuellt?search=${encodeURIComponent(offering.title)}`} className="button buttonGhost buttonSmall">Liknande live</Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="liveResultFooter">
        <span>
          {coverage?.scoredCount
            ? `${coverage.scoredCount.toLocaleString("sv-SE")} liveprogram poängsattes direkt.`
            : status?.eventCount
              ? `${status.eventCount.toLocaleString("sv-SE")} synkade HS-tillfällen i databasen.`
              : "Livekatalog ansluten."}
        </span>
        <Link href="/aktuellt" className="textButton">Utforska hela aktuella utbudet →</Link>
      </div>
    </section>
  );
}
