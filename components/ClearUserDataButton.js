"use client";

import { useState } from "react";
import { resetConsent } from "@/lib/consent-client";
import { COMPARE_EVENT_NAME, COMPARE_STORAGE_KEY, LEGACY_COMPARE_STORAGE_KEY } from "@/lib/compare-storage";
import { PATH_EVENT_NAME, PATH_STORAGE_KEY } from "@/lib/path-storage";

const RESULT_KEY = "hogskolekompassen-result";

export default function ClearUserDataButton() {
  const [cleared, setCleared] = useState(false);

  function clearData() {
    try { sessionStorage.removeItem(RESULT_KEY); } catch {}
    try {
      localStorage.removeItem(COMPARE_STORAGE_KEY);
      localStorage.removeItem(LEGACY_COMPARE_STORAGE_KEY);
      localStorage.removeItem(PATH_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent(COMPARE_EVENT_NAME, { detail: [] }));
      window.dispatchEvent(new CustomEvent(PATH_EVENT_NAME, { detail: [] }));
    } catch {}
    try { resetConsent(); } catch {}
    setCleared(true);
  }

  return (
    <div className="clearDataPanel">
      <button type="button" className="button buttonGhost" onClick={clearData}>
        Rensa mina sparade resultat och val
      </button>
      {cleared ? <span>Resultat, sparade val och cookieval är rensade i den här webbläsaren.</span> : null}
    </div>
  );
}
