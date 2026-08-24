"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { trackExternalClick } from "@/lib/analytics-client";

const PAGE_SIZE = 200;

function formatDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function applicationState(offering) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const opens = offering.applicationOpen ? new Date(`${offering.applicationOpen}T00:00:00`) : null;
  const deadline = offering.applicationDeadline ? new Date(`${offering.applicationDeadline}T23:59:59`) : null;
  if (deadline && deadline < today) return { label: "Ansökan stängd", tone: "closed" };
  if (opens && opens > today) return { label: `Öppnar ${formatDate(offering.applicationOpen)}`, tone: "future" };
  if (deadline) return { label: `Sök senast ${formatDate(offering.applicationDeadline)}`, tone: "open" };
  return { label: "Kontrollera ansökan", tone: "neutral" };
}

export default function LiveEducationBrowser({ initialOptions, initialStatus }) {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("");
  const [city, setCity] = useState("");
  const [provider, setProvider] = useState("");
  const [kind, setKind] = useState("");
  const [applicationStatus, setApplicationStatus] = useState("");
  const [distance, setDistance] = useState(false);
  const [offerings, setOfferings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(Boolean(initialStatus?.eventCount));
  const [loadingMore, setLoadingMore] = useState(false);

  const hasFilters = Boolean(search || period || city || provider || kind || applicationStatus || distance);
  const canLoadMore = !loading && !loadingMore && offerings.length < total;
  const options = useMemo(() => initialOptions || { periods: [], cities: [], providers: [], kinds: [] }, [initialOptions]);
  const kindOptions = options.kinds.filter(Boolean);

  useEffect(() => {
    const initialSearch = new URLSearchParams(window.location.search).get("search");
    if (initialSearch) setSearch(initialSearch);
  }, []);

  useEffect(() => {
    if (!initialStatus?.eventCount) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setLoadingMore(false);
      const params = buildQueryParams(0);
      try {
        const response = await fetch(`/api/live-educations?${params.toString()}`, { signal: controller.signal });
        const payload = await response.json();
        setOfferings(payload.offerings || []);
        setTotal(payload.total || 0);
      } catch (error) {
        if (error.name !== "AbortError") {
          setOfferings([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [search, period, city, provider, kind, applicationStatus, distance, initialStatus?.eventCount]);

  function buildQueryParams(offset) {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (search) params.set("search", search);
    if (period) params.set("period", period);
    if (city) params.set("city", city);
    if (provider) params.set("provider", provider);
    if (kind) params.set("kind", kind);
    if (applicationStatus) params.set("applicationStatus", applicationStatus);
    if (distance) params.set("distance", "1");
    return params;
  }

  async function loadMore() {
    if (!canLoadMore) return;
    setLoadingMore(true);
    try {
      const params = buildQueryParams(offerings.length);
      const response = await fetch(`/api/live-educations?${params.toString()}`);
      const payload = await response.json();
      const nextOfferings = payload.offerings || [];
      setOfferings((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...nextOfferings.filter((item) => !seen.has(item.id))];
      });
      setTotal(payload.total || 0);
    } catch {
      // Keep the already loaded list visible if an extra page fails.
    } finally {
      setLoadingMore(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setPeriod("");
    setCity("");
    setProvider("");
    setKind("");
    setApplicationStatus("");
    setDistance(false);
  }

  if (!initialStatus?.eventCount) {
    return (
      <div className="liveEmptyState">
        <div className="liveEmptyIcon">↻</div>
        <h2>Live-katalogen är redo – men Supabase saknar data</h2>
        <p>
          Appen läser nu livekatalogen från Supabase. Kontrollera anslutningen och fyll Supabase-tabellerna med aktuella poster från
          Susa-navet när produktionsdatan ska uppdateras.
        </p>
        <div className="commandCard">
          <span>Miljövariabel</span>
          <code>SUPABASE_DATABASE_URL</code>
        </div>
        <p className="liveEmptyFootnote">
          Health-checken visar om Supabase är konfigurerat och hur många liveposter som kan läsas.
        </p>
        <Link href="/utbildningar" className="button buttonGhost">Utforska matchningskatalogen under tiden →</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="liveFilterGrid">
        <label className="searchField liveSearchField">
          <span>Sök utbildning</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ex. bioteknik, datateknik, psykologi…" />
        </label>
        <label>
          <span>Starttermin</span>
          <select value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value="">Alla terminer</option>
            {options.periods.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          <span>Lärosäte</span>
          <select value={provider} onChange={(event) => setProvider(event.target.value)}>
            <option value="">Alla lärosäten</option>
            {options.providers.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          <span>Ort</span>
          <select value={city} onChange={(event) => setCity(event.target.value)}>
            <option value="">Alla orter</option>
            {options.cities.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        {kindOptions.length > 1 ? (
          <label>
            <span>Typ</span>
            <select value={kind} onChange={(event) => setKind(event.target.value)}>
              <option value="">Alla typer</option>
              {kindOptions.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
        ) : null}
        <label>
          <span>Ansökningsläge</span>
          <select value={applicationStatus} onChange={(event) => setApplicationStatus(event.target.value)}>
            <option value="">Alla lägen</option>
            <option value="open">Öppen nu</option>
            <option value="future">Öppnar senare</option>
            <option value="closed">Stängd</option>
            <option value="unknown">Datum saknas</option>
          </select>
        </label>
        <label className="distanceToggle">
          <input type="checkbox" checked={distance} onChange={(event) => setDistance(event.target.checked)} />
          <span><strong>Endast distans</strong><small>Visa poster markerade som distans/online.</small></span>
        </label>
      </div>

      <div className="browserToolbar liveToolbar">
        <div>
          <strong>{loading && !offerings.length ? "Hämtar…" : `${total} aktuella programstarter`}</strong>
          {total ? <span> Visar {offerings.length} av {total}. Filter är frivilliga.</span> : null}
          <span> Källa: Skolverkets Susa-nav via Supabase.</span>
        </div>
        {hasFilters ? <button className="textButton" type="button" onClick={clearFilters}>Rensa filter</button> : null}
      </div>

      <div className="liveOfferingList">
        {offerings.map((offering) => {
          const application = applicationState(offering);
          const target = offering.applicationUrl || offering.sourceUrl;
          return (
            <article className="liveOfferingCard" key={offering.id}>
              <div className="liveOfferingMain">
                <div className="liveOfferingMeta">
                  {offering.period ? <span className="periodBadge">{offering.period}</span> : null}
                  {offering.kind ? <span>{offering.kind === "program" ? "Program" : offering.kind === "course" || offering.kind === "kurs" ? "Kurs" : offering.kind}</span> : null}
                  {offering.degree ? <span>{offering.degree}</span> : null}
                  {offering.distance ? <span>Distans</span> : null}
                  {offering.credits ? <span>{offering.credits} {offering.creditsUnit || "hp"}</span> : null}
                </div>
                <h2>{offering.title}</h2>
                <p className="institutionLine">{offering.providerName || "Lärosäte ej angivet"}{offering.city ? ` · ${offering.city}` : ""}</p>
                {offering.description ? <p className="liveOfferingDescription">{offering.description}</p> : null}
                <div className="liveOfferingFacts">
                  {offering.startDate ? <span><small>Start</small><strong>{formatDate(offering.startDate)}</strong></span> : null}
                  {offering.studyForm ? <span><small>Studieform</small><strong>{offering.studyForm}</strong></span> : null}
                  {offering.studyPace ? <span><small>Studietakt</small><strong>{offering.studyPace}</strong></span> : null}
                  {offering.level ? <span><small>Nivå</small><strong>{offering.level === "grund" ? "Grundnivå" : offering.level === "avancerad" ? "Avancerad nivå" : offering.level}</strong></span> : null}
                  {offering.studentAid ? <span><small>Studiemedel</small><strong>{offering.studentAid === "ja" ? "CSN-berättigad" : offering.studentAid}</strong></span> : null}
                </div>
              </div>
              <aside className="liveOfferingAside">
                <span className={`applicationState ${application.tone}`}>{application.label}</span>
                {offering.canonicalProgramId ? (
                  <Link href={`/utbildningar/${offering.canonicalProgramId}`} className="liveLinkedProfile">
                    <small>Kopplad till kompassprofil</small>
                    <strong>{offering.linkScore ? `${offering.linkScore}% länksäkerhet` : "Visa profil"} →</strong>
                  </Link>
                ) : <span className="liveUnlinked">Inte automatiskt kopplad till en profil ännu</span>}
                {target ? (
                  <a
                    href={target}
                    target="_blank"
                    rel="noreferrer"
                    className="button buttonSmall"
                    onClick={() => trackExternalClick(target, {
                      source: "live_catalog",
                      offeringId: offering.id,
                      programId: offering.canonicalProgramId,
                    })}
                  >
                    Öppna originalkälla ↗
                  </a>
                ) : null}
              </aside>
            </article>
          );
        })}
      </div>

      {!loading && !offerings.length ? (
        <div className="emptyBrowserState">
          <h2>Inga aktuella tillfällen matchade filtren</h2>
          <p>Prova en annan termin, ett bredare sökord eller rensa filtren.</p>
          <button type="button" className="button buttonGhost" onClick={clearFilters}>Rensa filter</button>
        </div>
      ) : null}

      {offerings.length > 0 && offerings.length < total ? (
        <div className="liveLoadMore">
          <button type="button" className="button" onClick={loadMore} disabled={!canLoadMore}>
            {loadingMore ? "Laddar fler…" : `Visa fler programstarter (${offerings.length}/${total})`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
