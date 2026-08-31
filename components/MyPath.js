"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SaveProgramButton, { PATH_EVENT_NAME, PATH_STORAGE_KEY, pathStatuses } from "@/components/SaveProgramButton";
import CompareButton from "@/components/CompareButton";

function readPath() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PATH_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export default function MyPath() {
  const [path, setPath] = useState({});
  const [programs, setPrograms] = useState([]);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const result = JSON.parse(sessionStorage.getItem("hogskolekompassen-result") || "null");
      if (result?.schemaVersion >= 6) setScores(result.scoreById || {});
    } catch {}

    const update = (event) => setPath(event?.detail || readPath());
    update();
    window.addEventListener(PATH_EVENT_NAME, update);
    return () => window.removeEventListener(PATH_EVENT_NAME, update);
  }, []);

  useEffect(() => {
    const ids = Object.keys(path).map(Number).filter(Number.isInteger);
    if (!ids.length) {
      setPrograms([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/programs?ids=${ids.join(",")}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => setPrograms(payload.programs || []))
      .catch((error) => { if (error.name !== "AbortError") setPrograms([]); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [path]);

  const groups = useMemo(() => Object.fromEntries(pathStatuses.map((status) => [
    status.id,
    programs.filter((program) => path[String(program.id)] === status.id),
  ])), [path, programs]);

  const savedCount = programs.length;
  const topSaved = useMemo(() => [...programs]
    .filter((program) => scores[program.id])
    .sort((a, b) => scores[b.id] - scores[a.id])[0], [programs, scores]);

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
            <p className="lead">Sortera det du överväger och använd matchningen som ett beslutsunderlag – inte som ett facit.</p>
          </div>
          <div className="myPathStats">
            <div><strong>{savedCount}</strong><span>sparade</span></div>
            <div><strong>{groups.favorite?.length || 0}</strong><span>favoriter</span></div>
            <div><strong>{topSaved ? `${scores[topSaved.id]}%` : "–"}</strong><span>bästa sparade match</span></div>
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
                  {items.map((program) => (
                    <article className="pathCard" key={program.id}>
                      <div className="pathCardTop">
                        <div className="programMeta"><span>{program.category}</span><span>{program.degree}</span></div>
                        {scores[program.id] ? <span className="personalMatchBadge">{scores[program.id]}% match</span> : null}
                      </div>
                      <h3>{program.title}</h3>
                      <p className="institutionLine">{program.institution} · {program.city}</p>
                      <p>{program.description}</p>
                      <div className="pathCardActions">
                        <Link href={`/utbildningar?search=${encodeURIComponent(program.title)}`} className="button buttonGhost buttonSmall">Sök liveutbildningar</Link>
                        <CompareButton programId={program.id} compact />
                        <SaveProgramButton programId={program.id} compact />
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
