"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function CareerExplorer({ areas }) {
  const [areaScores, setAreaScores] = useState({});

  useEffect(() => {
    try {
      const result = JSON.parse(sessionStorage.getItem("hogskolekompassen-result") || "null");
      if (result?.schemaVersion >= 6) {
        setAreaScores(Object.fromEntries((result.areas || []).map((item) => [item.category, item.score])));
      }
    } catch {}
  }, []);

  const ordered = useMemo(() => [...areas].sort((a, b) => (areaScores[b.category] || 0) - (areaScores[a.category] || 0) || a.category.localeCompare(b.category, "sv")), [areas, areaScores]);

  return (
    <div className="careerGrid">
      {ordered.map((area) => (
        <article className="careerCard" key={area.category}>
          <div className="careerCardTop">
            <span className="eyebrow">Karriärspår</span>
            {areaScores[area.category] ? <strong>{areaScores[area.category]}% områdesmatch</strong> : null}
          </div>
          <h2>{area.category}</h2>
          <p>{area.description}</p>
          <div className="careerRoleList">
            {area.careers.map((career) => <span key={career}>{career}</span>)}
          </div>
          <Link className="cardLink" href="/utbildningar">Utforska utbildningar inom området →</Link>
        </article>
      ))}
    </div>
  );
}
