"use client";

import { useAnalyticsExclusionState } from "@/lib/analytics-exclusion-client";

export default function AnalyticsExclusionControl() {
  const [excluded, setExcluded] = useAnalyticsExclusionState();

  return (
    <div className={`adminOptOut ${excluded ? "isExcluded" : ""}`}>
      <div>
        <strong>{excluded ? "Den här webbläsaren räknas inte" : "Räkna bort min enhet"}</strong>
        <span>
          {excluded
            ? "Dina egna besök och tester skickar inga analytics-event härifrån."
            : "Stäng av analytics från den här webbläsaren när du testar sidan själv."}
        </span>
      </div>
      <button type="button" className="button buttonGhost buttonSmall" onClick={() => setExcluded(!excluded)}>
        {excluded ? "Räkna igen" : "Exkludera mig"}
      </button>
    </div>
  );
}
