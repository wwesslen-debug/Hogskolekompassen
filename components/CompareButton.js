"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "hogskolekompassen-compare";
const EVENT_NAME = "hogskolekompassen-compare-change";

function readIds() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isInteger).slice(0, 3) : [];
  } catch {
    return [];
  }
}

function writeIds(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: ids }));
}

export default function CompareButton({ programId, compact = false }) {
  const id = Number(programId);
  const [ids, setIds] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const update = (event) => setIds(event?.detail || readIds());
    setIds(readIds());
    window.addEventListener(EVENT_NAME, update);
    return () => window.removeEventListener(EVENT_NAME, update);
  }, []);

  const selected = ids.includes(id);

  function toggle() {
    setMessage("");
    const current = readIds();
    if (current.includes(id)) {
      const next = current.filter((item) => item !== id);
      writeIds(next);
      setIds(next);
      return;
    }
    if (current.length >= 3) {
      setMessage("Du kan jämföra högst tre utbildningar.");
      return;
    }
    const next = [...current, id];
    writeIds(next);
    setIds(next);
  }

  return (
    <span className="compareButtonWrap">
      <button
        type="button"
        className={`compareButton ${compact ? "compact" : ""} ${selected ? "selected" : ""}`}
        onClick={toggle}
        aria-pressed={selected}
      >
        {selected ? "✓ Vald för jämförelse" : "+ Jämför"}
      </button>
      {message ? <small className="compareMessage">{message}</small> : null}
    </span>
  );
}
