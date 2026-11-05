"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CompareButton from "@/components/CompareButton";
import SaveProgramButton from "@/components/SaveProgramButton";
import { trackExternalClick } from "@/lib/analytics-client";
import { formatLiveDate, getLiveApplicationStatus, getLiveCreditsLabel } from "@/lib/live-format";
import { getLiveExternalLink, liveEducationPath } from "@/lib/live-urls";
import { emptyLiveFilterOptions, LIVE_APPLICATION_STATUS_OPTIONS, normalizeLiveFilterCity } from "@/lib/live-filter-options.mjs";

const PAGE_SIZE = 60;
const EMPTY_OPTIONS = emptyLiveFilterOptions();

function applicationState(offering) {
  return getLiveApplicationStatus(offering, { fallback: "Kontrollera ansökan", unknownTone: "neutral" });
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
  const [total, setTotal] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState(initialStatus || null);
  const [loading, setLoading] = useState(!initialStatus || Boolean(initialStatus?.eventCount));
  const [loadingMore, setLoadingMore] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [options, setOptions] = useState({ ...EMPTY_OPTIONS, ...initialOptions });
  const [optionsLoading, setOptionsLoading] = useState(!initialOptions);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const requestVersion = useRef(0);

  const hasFilters = Boolean(search || period || city || provider || kind || applicationStatus || distance);
  const canLoadMore = !loading && !loadingMore && hasMore;
  const kindOptions = options.kinds.filter(Boolean);
  const displayedCountLabel = total == null
    ? `${offerings.length}${hasMore ? "+" : ""} programstarter`
    : `${total} synkade programstarter`;

  function filterOptions(values, current, label = (value) => value, normalize = (value) => value) {
    const matchesCurrent = (value) => normalize(value) === normalize(current);
    const choices = current && !values.some(matchesCurrent) ? [current, ...values] : values;
    return choices.map((value) => {
      const unavailable = !optionsLoading && !values.includes(value);
      return <option key={value} value={matchesCurrent(value) ? current : value} disabled={unavailable}>{label(value)}{unavailable ? " (inga träffar)" : ""}</option>;
    });
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearch(params.get("search") || "");
    setPeriod(params.get("period") || "");
    setCity(params.get("city") || "");
    setProvider(params.get("provider") || "");
    setKind(params.get("kind") || "");
    setApplicationStatus(params.get("applicationStatus") || "");
    setDistance(params.get("distance") === "1" || params.get("distance") === "true");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const params = new URLSearchParams(window.location.search);
    const values = { search, period, city, provider, kind, applicationStatus };
    for (const [key, value] of Object.entries(values)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    if (distance) params.set("distance", "1");
    else params.delete("distance");

    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  }, [search, period, city, provider, kind, applicationStatus, distance, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const controller = new AbortController();
    requestVersion.current += 1;
    let cancelled = false;
    setLoading(true);
    setOptionsLoading(true);
    setLoadError("");
    setLoadingMore(false);
    setOfferings([]);
    setTotal(null);
    setHasMore(false);
    const timer = setTimeout(async () => {
      const params = buildQueryParams(0);
      params.set("options", "1");
      params.set("count", "1");
      try {
        const response = await fetch(`/api/live-educations?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Live education search failed with ${response.status}`);
        const payload = await response.json();
        if (cancelled) return;
        setStatus(payload.status || null);
        if (payload.options?.supabaseError || payload.status?.supabaseError) {
          setLoadError("Utbildningarna eller filtren kunde inte hämtas. Försök igen.");
        } else {
          setOptions({ ...EMPTY_OPTIONS, ...payload.options });
        }
        setOfferings(payload.offerings || []);
        setTotal(Number.isFinite(payload.total) ? payload.total : null);
        setHasMore(Boolean(payload.hasMore));
      } catch (error) {
        if (!cancelled && error.name !== "AbortError") {
          setLoadError("Utbildningarna eller filtren kunde inte hämtas. Försök igen.");
          setOfferings([]);
          setTotal(null);
          setHasMore(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setOptionsLoading(false);
        }
      }
    }, hasFilters ? 180 : 0);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [search, period, city, provider, kind, applicationStatus, distance, hydrated, reload]);

  function buildQueryParams(offset) {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset), upcoming: "0" });
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
    const version = requestVersion.current;
    setLoadingMore(true);
    try {
      const params = buildQueryParams(offerings.length);
      const response = await fetch(`/api/live-educations?${params.toString()}`);
      if (!response.ok) throw new Error(`Live education search failed with ${response.status}`);
      const payload = await response.json();
      if (version !== requestVersion.current) return;
      const nextOfferings = payload.offerings || [];
      setOfferings((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...nextOfferings.filter((item) => !seen.has(item.id))];
      });
      if (Number.isFinite(payload.total)) setTotal(payload.total);
      setHasMore(Boolean(payload.hasMore));
    } catch {
      // Keep the already loaded list visible if an extra page fails.
    } finally {
      if (version === requestVersion.current) setLoadingMore(false);
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

  if (status && !status.eventCount && !status.supabaseError) {
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
        <Link href="/kompass" className="button buttonGhost">Gör kompassen under tiden →</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="liveFilterGrid" aria-busy={optionsLoading}>
        <label className="searchField liveSearchField">
          <span>Sök utbildning</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ex. bioteknik, datateknik, psykologi…" />
        </label>
        <label>
          <span>Starttermin</span>
          <select value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value="">{optionsLoading ? "Laddar terminer…" : "Alla terminer"}</option>
            {filterOptions(options.periods, period)}
          </select>
        </label>
        <label>
          <span>Lärosäte</span>
          <select value={provider} onChange={(event) => setProvider(event.target.value)}>
            <option value="">{optionsLoading ? "Laddar lärosäten…" : "Alla lärosäten"}</option>
            {filterOptions(options.providers, provider)}
          </select>
        </label>
        <label>
          <span>Ort</span>
          <select value={city} onChange={(event) => setCity(event.target.value)}>
            <option value="">{optionsLoading ? "Laddar orter…" : "Alla orter"}</option>
            {filterOptions(options.cities, city, undefined, normalizeLiveFilterCity)}
          </select>
        </label>
        {kindOptions.length > 1 || kind ? (
          <label>
            <span>Typ</span>
            <select value={kind} onChange={(event) => setKind(event.target.value)}>
              <option value="">Alla typer</option>
              {filterOptions(kindOptions, kind)}
            </select>
          </label>
        ) : null}
        <label>
          <span>Ansökningsläge</span>
          <select value={applicationStatus} onChange={(event) => setApplicationStatus(event.target.value)}>
            <option value="">{optionsLoading ? "Laddar lägen…" : "Alla lägen"}</option>
            {filterOptions(options.applicationStatuses, applicationStatus, (value) => LIVE_APPLICATION_STATUS_OPTIONS.find((item) => item.value === value)?.label || value)}
          </select>
        </label>
        <label className="distanceToggle">
          <input type="checkbox" checked={distance} disabled={!optionsLoading && !distance && !options.distanceAvailable} onChange={(event) => setDistance(event.target.checked)} />
          <span><strong>Endast distans</strong><small>{!optionsLoading && !options.distanceAvailable ? "Ingen distansutbildning matchar dina val." : "Visa poster markerade som distans/online."}</small></span>
        </label>
      </div>

      {loadError ? (
        <p role="alert">{loadError} <button type="button" className="textButton" onClick={() => setReload((value) => value + 1)}>Försök igen</button></p>
      ) : null}

      <div className="browserToolbar liveToolbar">
        <div aria-live="polite">
          <strong>{loading ? (hasFilters ? "Söker…" : "Hämtar…") : displayedCountLabel}</strong>
          {loading ? <span> Uppdaterar träfflistan.</span> : offerings.length ? <span> Visar {offerings.length}{total != null ? ` av ${total}` : ""} programstarter. Filter är frivilliga.</span> : null}
          <span> Källa: Skolverkets Susa-nav via Supabase.</span>
        </div>
        {hasFilters ? <button className="textButton" type="button" onClick={clearFilters}>Rensa filter</button> : null}
      </div>

      <div className="liveOfferingList" aria-busy={loading}>
        {offerings.map((offering) => {
          const application = applicationState(offering);
          const target = getLiveExternalLink(offering);
          const detailPath = liveEducationPath(offering);
          return (
            <article className="liveOfferingCard" key={offering.id}>
              <div className="liveOfferingMain">
                <div className="liveOfferingMeta">
                  {offering.period ? <span className="periodBadge">{offering.period}</span> : null}
                  {offering.kind ? <span>{offering.kind === "program" ? "Program" : offering.kind === "course" || offering.kind === "kurs" ? "Kurs" : offering.kind}</span> : null}
                  {offering.degree ? <span>{offering.degree}</span> : null}
                  {offering.distance ? <span>Distans</span> : null}
                  {offering.credits ? <span>{getLiveCreditsLabel(offering)}</span> : null}
                </div>
                <h2><Link href={detailPath}>{offering.title}</Link></h2>
                <p className="institutionLine">{offering.providerName || "Lärosäte ej angivet"}{offering.city ? ` · ${offering.city}` : ""}</p>
                {offering.description ? <p className="liveOfferingDescription">{offering.description}</p> : null}
                <div className="liveOfferingFacts">
                  {offering.startDate ? <span><small>Start</small><strong>{formatLiveDate(offering.startDate)}</strong></span> : null}
                  {offering.studyForm ? <span><small>Studieform</small><strong>{offering.studyForm}</strong></span> : null}
                  {offering.studyPace ? <span><small>Studietakt</small><strong>{offering.studyPace}</strong></span> : null}
                  {offering.level ? <span><small>Nivå</small><strong>{offering.level === "grund" ? "Grundnivå" : offering.level === "avancerad" ? "Avancerad nivå" : offering.level}</strong></span> : null}
                  {offering.studentAid ? <span><small>Studiemedel</small><strong>{offering.studentAid === "ja" ? "CSN-berättigad" : offering.studentAid}</strong></span> : null}
                </div>
              </div>
              <aside className="liveOfferingAside">
                <span className={`applicationState ${application.tone}`}>{application.label}</span>
                <Link href={detailPath} className="button buttonGhost buttonSmall">Visa detaljer</Link>
                <CompareButton offeringId={offering.id} compact />
                <SaveProgramButton offeringId={offering.id} programId={offering.canonicalProgramId} compact />
                {target ? (
                  <a
                    href={target.href}
                    target="_blank"
                    rel="noreferrer"
                    className="button buttonSmall"
                    onClick={() => trackExternalClick(target.href, {
                      source: `live_catalog_${target.source}`,
                      offeringId: offering.id,
                      programId: offering.canonicalProgramId,
                    })}
                  >
                    {target.label}
                  </a>
                ) : null}
              </aside>
            </article>
          );
        })}
      </div>

      {loading && !offerings.length ? (
        <div className="emptyBrowserState">
          <h2>{hasFilters ? "Söker i livekatalogen…" : "Hämtar utbildningar…"}</h2>
          <p>Träfflistan uppdateras med dina filter.</p>
        </div>
      ) : null}

      {!loading && !loadError && !offerings.length ? (
        <div className="emptyBrowserState">
          <h2>Inga aktuella tillfällen matchade filtren</h2>
          <p>Prova en annan termin, ett bredare sökord eller rensa filtren.</p>
          <button type="button" className="button buttonGhost" onClick={clearFilters}>Rensa filter</button>
        </div>
      ) : null}

      {offerings.length > 0 && hasMore ? (
        <div className="liveLoadMore">
          <button type="button" className="button" onClick={loadMore} disabled={!canLoadMore}>
            {loadingMore ? "Laddar fler…" : total == null ? "Visa fler programstarter" : `Visa fler programstarter (${offerings.length}/${total})`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
