"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CompareButton from "@/components/CompareButton";
import SaveProgramButton from "@/components/SaveProgramButton";

export default function ProgramBrowser({ options }) {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [degree, setDegree] = useState("");
  const [programs, setPrograms] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scoreById, setScoreById] = useState({});

  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem("hogskolekompassen-result") || "null");
      if (stored?.schemaVersion >= 6 && stored?.scoreById) setScoreById(stored.scoreById);
    } catch {}
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (city) params.set("city", city);
      if (category) params.set("category", category);
      if (degree) params.set("degree", degree);

      try {
        const response = await fetch(`/api/programs?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = await response.json();
        setPrograms(payload.programs || []);
        setTotal(payload.total ?? payload.programs?.length ?? 0);
      } catch (error) {
        if (error.name !== "AbortError") {
          setPrograms([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, city, category, degree]);

  function resetFilters() {
    setSearch("");
    setCity("");
    setCategory("");
    setDegree("");
  }

  return (
    <div>
      <div className="filterBar filterBarV2">
        <label className="searchField">
          <span>Sök</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ex. biokemi, civilingenjör, juridik, KTH…"
          />
        </label>

        <label>
          <span>Studieort</span>
          <select value={city} onChange={(event) => setCity(event.target.value)}>
            <option value="">Alla orter</option>
            {options.cities.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>

        <label>
          <span>Område</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">Alla områden</option>
            {options.categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>

        <label>
          <span>Examen</span>
          <select value={degree} onChange={(event) => setDegree(event.target.value)}>
            <option value="">Alla examina</option>
            {options.degrees.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <div className="browserToolbar">
        <div className="browserCount">
          {loading ? "Hämtar utbildningar…" : `${total} utbildningar`}
        </div>
        {(search || city || category || degree) ? (
          <button type="button" className="textButton" onClick={resetFilters}>Rensa filter</button>
        ) : null}
      </div>

      <div className="browserGrid browserGridV2">
        {programs.map((program) => {
          const personalScore = scoreById[program.id];
          return (
            <article className="browseCard browseCardV2" key={program.id}>
              <div className="browseCardTopline">
                <div className="programMeta">
                  <span>{program.category}</span>
                  <span>{program.degree}</span>
                </div>
                {personalScore ? <span className="personalMatchBadge">{personalScore}% din match</span> : program.liveOfferCount ? <span className="liveOfferBadge">{program.liveOfferCount} live</span> : null}
              </div>
              <h2>{program.title}</h2>
              <p className="institutionLine">{program.institution} · {program.city}</p>
              {program.liveOfferCount ? <Link href={`/utbildningar/${program.id}#aktuellt`} className="liveAvailabilityLine">● {program.liveOfferCount} synkade tillfällen via Susa-navet</Link> : null}
              <p>{program.description}</p>

              <div className="programStudyFacts compactFacts">
                <span><small>Matematik</small><strong>{program.studySummary.math}</strong></span>
                <span><small>Teori</small><strong>{program.studySummary.theory}</strong></span>
                <span><small>Praktik</small><strong>{program.studySummary.practical}</strong></span>
              </div>

              <div className="chipRow">
                {program.tags.slice(0, 3).map((tag) => <span className="chip" key={tag}>{tag}</span>)}
              </div>

              <div className="browseCardActions">
                <Link href={`/utbildningar/${program.id}`} className="button buttonGhost buttonSmall">Läs mer</Link>
                <CompareButton programId={program.id} compact />
                <SaveProgramButton programId={program.id} compact />
                <a href={program.antagningSearch} target="_blank" rel="noreferrer" className="cardLink">
                  Antagning.se ↗
                </a>
              </div>
            </article>
          );
        })}
      </div>

      {!loading && !programs.length ? (
        <div className="emptyBrowserState">
          <h2>Inga utbildningar matchade filtren</h2>
          <p>Prova ett bredare sökord eller rensa ett av filtren.</p>
          <button className="button buttonGhost" type="button" onClick={resetFilters}>Rensa filter</button>
        </div>
      ) : null}
    </div>
  );
}
