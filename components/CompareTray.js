"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { COMPARE_EVENT_NAME, readCompareEntries, writeCompareEntries } from "@/lib/compare-storage";

export default function CompareTray() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    const update = (event) => setEntries(event?.detail || readCompareEntries());
    setEntries(readCompareEntries());
    window.addEventListener(COMPARE_EVENT_NAME, update);
    return () => window.removeEventListener(COMPARE_EVENT_NAME, update);
  }, []);

  if (!entries.length) return null;

  function clear() {
    writeCompareEntries([]);
    setEntries([]);
  }

  return (
    <div className="compareTray" role="status">
      <div>
        <strong>{entries.length}/3 valda</strong>
        <span>Jämför riktiga utbildningar sida vid sida</span>
      </div>
      <div className="compareTrayActions">
        <button type="button" onClick={clear}>Rensa</button>
        <Link href="/jamfor" className="button buttonSmall">Jämför nu →</Link>
      </div>
    </div>
  );
}
