"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SaveProgramButton from "@/components/SaveProgramButton";
import CompareButton from "@/components/CompareButton";
import { trackExternalClick } from "@/lib/analytics-client";
import { pathEntryKey, PATH_EVENT_NAME, pathStatuses, readPathEntries } from "@/lib/path-storage";
import { formatLiveDate, getLiveApplicationStatus, getLiveCreditsLabel } from "@/lib/live-format";
import { cleanLiveText } from "@/lib/live-text";
import { getLiveExternalLink, liveEducationPath } from "@/lib/live-urls";

function shortenText(value, maxLength = 280) {
  const text = cleanLiveText(value);
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

function liveScore(offering, context) {
  const score = Number(
    context.scoredOfferingsById?.[offering.id]?.personalScore
    ?? context.scoreByLiveOfferingId?.[offering.id]
    ?? context.scoreByProgramId?.[offering.canonicalProgramId]
    ?? offering.personalScore
  );
  return Number.isFinite(score) && score > 0 ? Math.round(score) : null;
}

function programScore(program, context) {
  const score = Number(context.scoreByProgramId?.[program.id]);
  return Number.isFinite(score) && score > 0 ? Math.round(score) : null;
}

export default function MyPath() {
  const [entries, setEntries] = useState([]);
  const [items, setItems] = useState([]);
  const [scoreByLiveOfferingId, setScoreByLiveOfferingId] = useState({});
  const [scoreByProgramId, setScoreByProgramId] = useState({});
  const [scoredOfferingsById, setScoredOfferingsById] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const result = JSON.parse(sessionStorage.getItem("hogskolekompassen-result") || "null");
      if (result?.schemaVersion >= 6) setScoreByProgramId(result.scoreById || {});
      if (result?.schemaVersion >= 9) {
        setScoreByLiveOfferingId(result.scoreByLiveOfferingId || {});
        setScoredOfferingsById(Object.fromEntries((result.liveOfferings || []).map((item) => [item.id, item])));
      }
    } catch {}

    const update = (event) => setEntries(event?.detail || readPathEntries());
    update();
    window.addEventListener(PATH_EVENT_NAME, update);
    return () => window.removeEventListener(PATH_EVENT_NAME, update);
  }, []);

  useEffect(() => {
    if (!entries.length) {
      setItems([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const liveIds = entries.filter((entry) => entry.kind === "live").map((entry) => entry.id);
    const programIds = entries.filter((entry) => entry.kind === "program").map((entry) => entry.id);

    async function fetchJson(url) {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Saved education fetch failed with ${response.status}`);
      return response.json();
    }

    setLoading(true);
    Promise.allSettled([
      liveIds.length
        ? fetchJson(`/api/live-educations?${new URLSearchParams({ ids: liveIds.join(","), limit: String(Math.max(1, liveIds.length)), upcoming: "0" })}`)
        : Promise.resolve({ offerings: [] }),
      programIds.length
        ? fetchJson(`/api/programs?ids=${programIds.join(",")}`)
        : Promise.resolve({ programs: [] }),
    ])
      .then(([liveResult, programResult]) => {
        if (controller.signal.aborted) return;
        const liveOfferings = liveResult.status === "fulfilled" ? liveResult.value.offerings || [] : [];
        const programs = programResult.status === "fulfilled" ? programResult.value.programs || [] : [];
        const liveById = new Map(liveOfferings.map((offering) => [String(offering.id), offering]));
        const programById = new Map(programs.map((program) => [Number(program.id), program]));
        const scoreContext = { scoreByLiveOfferingId, scoreByProgramId, scoredOfferingsById };

        setItems(entries.map((entry) => {
          const status = entry.status;
          if (entry.kind === "live") {
            const offering = liveById.get(String(entry.id));
            if (!offering) return null;
            const application = getLiveApplicationStatus(offering, { fallback: "Kontrollera ansökan" });
            const target = getLiveExternalLink(offering);
            return {
              key: pathEntryKey(entry),
              kind: "live",
              id: offering.id,
              canonicalProgramId: offering.canonicalProgramId,
              status,
              title: offering.title,
              provider: offering.providerName || "Lärosäte ej angivet",
              city: offering.city || "",
              category: offering.inferredCategory || "Liveutbildning",
              degree: offering.degree || offering.kind || "Program",
              period: offering.period || "",
              description: shortenText(offering.description || "Aktuell utbildning från livekatalogen."),
              score: liveScore(offering, scoreContext),
              facts: [
                offering.startDate ? ["Start", formatLiveDate(offering.startDate)] : null,
                offering.studyPace ? ["Studietakt", offering.studyPace] : null,
                offering.credits ? ["Omfattning", getLiveCreditsLabel(offering)] : null,
                ["Ansökan", application.label],
              ].filter(Boolean),
              targetUrl: target?.href || "",
              targetLabel: target?.label || "",
              targetSource: target?.source || "",
              detailUrl: liveEducationPath(offering),
            };
          }

          const program = programById.get(Number(entry.id));
          if (!program) return null;
          return {
            key: pathEntryKey(entry),
            kind: "program",
            id: program.id,
            status,
            title: program.title,
            provider: program.institution,
            city: program.city,
            category: program.category,
            degree: program.degree,
            period: "",
            description: shortenText(program.description),
            score: programScore(program, scoreContext),
            facts: [
              program.years ? ["Längd", `${program.years} år`] : null,
              program.study ? ["Studieform", program.study] : null,
              ["Katalog", "Profil"],
            ].filter(Boolean),
            targetUrl: "",
            targetLabel: "",
            targetSource: "",
            detailUrl: "",
          };
        }).filter(Boolean));
      })
      .catch((error) => { if (error?.name !== "AbortError") setItems([]); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [entries, scoreByLiveOfferingId, scoreByProgramId, scoredOfferingsById]);

  const groups = useMemo(() => Object.fromEntries(pathStatuses.map((status) => [
    status.id,
    items.filter((item) => item.status === status.id),
  ])), [items]);

  const savedCount = items.length;
  const liveSavedCount = items.filter((item) => item.kind === "live").length;
  const topSaved = useMemo(() => [...items]
    .filter((item) => item.score)
    .sort((a, b) => b.score - a.score)[0], [items]);

  if (loading && !items.length) {
    return (
      <main className="myPathPage">
        <section className="shell myPathEmpty">
          <span className="eyebrow">Min väg</span>
          <h1>Hämtar din shortlist.</h1>
          <p className="lead">Dina sparade liveutbildningar läses in från den aktuella katalogen.</p>
        </section>
      </main>
    );
  }

  if (!loading && !savedCount) {
    return (
      <main className="myPathPage">
        <section className="shell myPathEmpty">
          <span className="eyebrow">Min väg</span>
          <h1>Bygg din egen shortlist.</h1>
          <p className="lead">Spara utbildningar som favoriter, intressanta, osäkra eller inte för dig. Dina val ligger lokalt i webbläsaren i den här versionen.</p>
          <div className="centerActions">
            <Link href="/utbildningar" className="button">Utforska utbildningar →</Link>
            <Link href="/kompass" className="button buttonGhost">Gör kompassen</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="myPathPage">
      <section className="myPathHero">
        <div className="shell myPathHeroGrid">
          <div>
            <span className="eyebrow">Min väg</span>
            <h1>Din personliga shortlist</h1>
            <p className="lead">Sortera riktiga liveutbildningar du överväger och använd matchningen som ett beslutsunderlag – inte som ett facit.</p>
          </div>
          <div className="myPathStats">
            <div><strong>{savedCount}</strong><span>sparade</span></div>
            <div><strong>{liveSavedCount}</strong><span>liveutbildningar</span></div>
            <div><strong>{topSaved ? `${topSaved.score}%` : "–"}</strong><span>bästa sparade match</span></div>
          </div>
        </div>
      </section>

      <section className="shell myPathSection">
        {pathStatuses.map((status) => {
          const items = groups[status.id] || [];
          return (
            <div className={`pathGroup path-${status.id}`} key={status.id}>
              <div className="pathGroupHeader">
                <div><span className="pathGroupIcon">{status.icon}</span><h2>{status.label}</h2></div>
                <span>{items.length}</span>
              </div>
              {items.length ? (
                <div className="pathGrid">
                  {items.map((item) => (
                    <article className="pathCard" key={item.key}>
                      <div className="pathCardTop">
                        <div className="programMeta">
                          <span>{item.kind === "live" ? "Live" : "Profil"}</span>
                          <span>{item.category}</span>
                          <span>{item.degree}</span>
                          {item.period ? <span>{item.period}</span> : null}
                        </div>
                        {item.score ? <span className="personalMatchBadge">{item.score}% match</span> : null}
                      </div>
                      <h3>{item.title}</h3>
                      <p className="institutionLine">{item.provider}{item.city ? ` · ${item.city}` : ""}</p>
                      <p>{item.description}</p>
                      <div className="pathCardFacts">
                        {item.facts.map(([label, value]) => (
                          <span key={`${item.key}-${label}`}><small>{label}</small><strong>{value}</strong></span>
                        ))}
                      </div>
                      <div className="pathCardActions">
                        {item.kind === "live" ? (
                          <Link href={item.detailUrl} className="button buttonSmall">Visa detaljer</Link>
                        ) : null}
                        {item.kind === "live" && item.targetUrl ? (
                          <a
                            href={item.targetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="button buttonGhost buttonSmall"
                            onClick={() => trackExternalClick(item.targetUrl, {
                              source: item.targetSource ? `my_path_${item.targetSource}` : "my_path",
                              offeringId: item.id,
                              programId: item.canonicalProgramId,
                            })}
                          >
                            {item.targetLabel || "Lärosätets sida ↗"}
                          </a>
                        ) : (
                          <Link href={`/utbildningar?search=${encodeURIComponent(item.title)}`} className="button buttonGhost buttonSmall">Sök liveutbildningar</Link>
                        )}
                        <CompareButton offeringId={item.kind === "live" ? item.id : undefined} programId={item.kind === "program" ? item.id : undefined} compact />
                        <SaveProgramButton offeringId={item.kind === "live" ? item.id : undefined} programId={item.kind === "live" ? item.canonicalProgramId : item.id} compact />
                      </div>
                    </article>
                  ))}
                </div>
              ) : <div className="pathEmptySlot">Inga utbildningar här ännu.</div>}
            </div>
          );
        })}
      </section>
    </main>
  );
}
