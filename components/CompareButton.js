"use client";

import { useEffect, useState } from "react";
import { trackFunnelEvent } from "@/lib/analytics-client";
import {
  COMPARE_EVENT_NAME,
  COMPARE_LIMIT,
  compareEntryKey,
  hasCompareEntry,
  readCompareEntries,
  writeCompareEntries,
} from "@/lib/compare-storage";

export default function CompareButton({ offeringId, programId, compact = false }) {
  const liveId = String(offeringId ?? "").trim();
  const fallbackProgramId = Number(programId);
  const target = liveId
    ? { kind: "live", id: liveId }
    : Number.isInteger(fallbackProgramId) && fallbackProgramId > 0
      ? { kind: "program", id: fallbackProgramId }
      : null;
  const [entries, setEntries] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const update = (event) => setEntries(event?.detail || readCompareEntries());
    setEntries(readCompareEntries());
    window.addEventListener(COMPARE_EVENT_NAME, update);
    return () => window.removeEventListener(COMPARE_EVENT_NAME, update);
  }, []);

  if (!target) return null;

  const selected = hasCompareEntry(entries, target);
  const analyticsPayload = target.kind === "live" ? { offeringId: target.id } : { programId: target.id };

  function toggle() {
    setMessage("");
    const current = readCompareEntries();
    const currentHasTarget = hasCompareEntry(current, target);
    if (currentHasTarget) {
      const key = compareEntryKey(target);
      const next = current.filter((item) => compareEntryKey(item) !== key);
      writeCompareEntries(next);
      setEntries(next);
      trackFunnelEvent("compare_remove", analyticsPayload);
      return;
    }
    if (current.length >= COMPARE_LIMIT) {
      setMessage("Du kan jämföra högst tre utbildningar.");
      trackFunnelEvent("compare_limit_reached", { ...analyticsPayload, count: current.length });
      return;
    }
    const next = [...current, target];
    writeCompareEntries(next);
    setEntries(next);
    trackFunnelEvent("compare_add", { ...analyticsPayload, count: next.length });
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
