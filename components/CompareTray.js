"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "hogskolekompassen-compare";
const EVENT_NAME = "hogskolekompassen-compare-change";

function readIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isInteger).slice(0, 3) : [];
  } catch {
    return [];
  }
}

export default function CompareTray() {
  const [ids, setIds] = useState([]);

  useEffect(() => {
    const update = (event) => setIds(event?.detail || readIds());
    setIds(readIds());
    window.addEventListener(EVENT_NAME, update);
    return () => window.removeEventListener(EVENT_NAME, update);
  }, []);

  if (!ids.length) return null;

  function clear() {
    localStorage.setItem(STORAGE_KEY, "[]");
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: [] }));
    setIds([]);
  }

  return (
    <div className="compareTray" role="status">
      <div>
        <strong>{ids.length}/3 valda</strong>
        <span>Jämför utbildningar sida vid sida</span>
      </div>
      <div className="compareTrayActions">
        <button type="button" onClick={clear}>Rensa</button>
        <Link href="/jamfor" className="button buttonSmall">Jämför nu →</Link>
      </div>
    </div>
  );
}
