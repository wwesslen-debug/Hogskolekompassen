"use client";

import { useEffect, useState } from "react";
import { trackFunnelEvent } from "@/lib/analytics-client";
import {
  PATH_EVENT_NAME,
  getPathStatus,
  normalizePathTarget,
  pathEntryKey,
  pathStatuses,
  readPathEntries,
  setPathStatus,
} from "@/lib/path-storage";

export default function SaveProgramButton({ offeringId, programId, compact = false }) {
  const target = normalizePathTarget({ offeringId, programId });
  const targetKey = target ? pathEntryKey(target) : "";
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const update = (event) => {
      const entries = event?.detail || readPathEntries();
      setStatus(target ? getPathStatus(entries, target) : "");
    };
    update();
    window.addEventListener(PATH_EVENT_NAME, update);
    return () => window.removeEventListener(PATH_EVENT_NAME, update);
  }, [targetKey]);

  function choose(nextStatus) {
    if (!target) return;
    const result = setPathStatus(target, nextStatus);
    const programNumber = Number(programId);
    trackFunnelEvent(result.removing ? "unsave_program" : "save_program", {
      ...(target.kind === "live" ? { offeringId: target.id } : { programId: target.id }),
      ...(target.kind === "live" && Number.isInteger(programNumber) && programNumber > 0 ? { programId: programNumber } : {}),
      status: result.removing ? result.previousStatus : result.status,
    });
    setOpen(false);
  }

  if (!target) return null;

  const active = pathStatuses.find((item) => item.id === status);

  return (
    <div className={`saveProgram ${compact ? "compact" : ""}`}>
      <button
        type="button"
        className={`saveProgramButton ${status ? "saved" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span>{active?.icon || "☆"}</span>{compact ? (active?.label || "Spara") : (active ? active.label : "Spara i Min väg")}
      </button>
      {open ? (
        <div className="saveMenu">
          {pathStatuses.map((item) => (
            <button type="button" key={item.id} className={status === item.id ? "active" : ""} onClick={() => choose(item.id)}>
              <span>{item.icon}</span><strong>{item.label}</strong>
            </button>
          ))}
          {status ? <button type="button" className="removeSave" onClick={() => choose("")}><span>–</span><strong>Ta bort</strong></button> : null}
        </div>
      ) : null}
    </div>
  );
}
