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

export default function LiveResultRecommendations({ result }) {
  const [offerings, setOfferings] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const ids = useMemo(() => (result?.matches || []).slice(0, 15).map((item) => item.id), [result]);
  const programById = useMemo(() => Object.fromEntries((result?.matches || []).map((item) => [item.id, item])), [result]);

  useEffect(() => {
    if (!ids.length) return;
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/live-recommendations?ids=${ids.join(",")}&limit=15&perProgram=3`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("live fetch failed")))
      .then((data) => {
        setStatus(data.status || null);
        const sorted = [...(data.offerings || [])].sort((a, b) => {
          const aScore = Number(result?.scoreById?.[a.canonicalProgramId] || 0);
          const bScore = Number(result?.scoreById?.[b.canonicalProgramId] || 0);
          return bScore - aScore || Number(b.linkScore || 0) - Number(a.linkScore || 0);
        });
        setOfferings(sorted);
      })
      .catch((error) => {
        if (error?.name !== "AbortError") setOfferings([]);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [ids.join(","), result]);

  if (!loading && !offerings.length) return null;

  return (
    <section className="liveResultSection">
      <div className="sectionHeading liveResultHeading">
        <div>
          <span className="eyebrow">Live från Susa-navet</span>
          <h2>Aktuella utbildningar som matchar dig</h2>
        </div>
        <p>
          Din personliga procent kommer från Högskolekompassens profilmodell. Live-posten visar det faktiska utbildningstillfället och lärosätet.
        </p>
      </div>

      {loading ? <div className="liveResultLoading">Hämtar aktuella utbildningstillfällen…</div> : (
        <div className="liveResultGrid">
          {offerings.slice(0, 9).map((offering) => {
            const parent = programById[offering.canonicalProgramId];
            const personalScore = Number(result?.scoreById?.[offering.canonicalProgramId] || parent?.score || 0);
            const application = applicationLabel(offering);
            const target = offering.applicationUrl || offering.sourceUrl;
            return (
              <article className="liveResultCard" key={offering.id}>
                <div className="liveResultCardTop">
                  <div className="personalLiveScore"><strong>{personalScore}%</strong><span>din match</span></div>
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
                  <span>Kopplad till <Link href={`/utbildningar/${offering.canonicalProgramId}`}>{parent?.title || "kompassprofil"}</Link></span>
                  {offering.linkScore ? <small>{offering.linkScore}% länksäkerhet</small> : null}
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
        <span>{status?.eventCount ? `${status.eventCount.toLocaleString("sv-SE")} synkade HS-tillfällen i databasen.` : "Livekatalog ansluten."}</span>
        <Link href="/aktuellt" className="textButton">Utforska hela aktuella utbudet →</Link>
      </div>
    </section>
  );
}
