"use client";

import { useEffect, useState } from "react";
import { trackFunnelEvent } from "@/lib/analytics-client";

const STORAGE_KEY = "hogskolekompassen-path";
const EVENT_NAME = "hogskolekompassen-path-change";

const options = [
  { id: "favorite", label: "Favorit", icon: "★" },
  { id: "interesting", label: "Intressant", icon: "+" },
  { id: "unsure", label: "Osäker", icon: "?" },
  { id: "no", label: "Inte för mig", icon: "×" },
];

function readPath() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writePath(value) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: value }));
}

export default function SaveProgramButton({ programId, compact = false }) {
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const update = (event) => {
      const path = event?.detail || readPath();
      setStatus(path[String(programId)] || "");
    };
    update();
    window.addEventListener(EVENT_NAME, update);
    return () => window.removeEventListener(EVENT_NAME, update);
  }, [programId]);

  function choose(nextStatus) {
    const path = readPath();
    const previousStatus = path[String(programId)] || "";
    const removing = !nextStatus || previousStatus === nextStatus;
    if (removing) delete path[String(programId)];
    else path[String(programId)] = nextStatus;
    writePath(path);
    trackFunnelEvent(removing ? "unsave_program" : "save_program", {
      programId: Number(programId),
      status: removing ? previousStatus : nextStatus,
    });
    setOpen(false);
  }

  const active = options.find((item) => item.id === status);

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
          {options.map((item) => (
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

export { STORAGE_KEY as PATH_STORAGE_KEY, EVENT_NAME as PATH_EVENT_NAME, options as pathStatuses };
