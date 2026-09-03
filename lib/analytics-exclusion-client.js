"use client";

import { useEffect, useState } from "react";

export const ANALYTICS_EXCLUSION_STORAGE_KEY = "hogskolekompassen-analytics-excluded";
export const ANALYTICS_EXCLUSION_CHANGE_EVENT = "hogskolekompassen-analytics-exclusion-change";

export function isAnalyticsExcluded() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ANALYTICS_EXCLUSION_STORAGE_KEY) === "1";
}

export function setAnalyticsExcluded(excluded) {
  if (typeof window === "undefined") return false;
  if (excluded) localStorage.setItem(ANALYTICS_EXCLUSION_STORAGE_KEY, "1");
  else localStorage.removeItem(ANALYTICS_EXCLUSION_STORAGE_KEY);

  const next = Boolean(excluded);
  window.dispatchEvent(new CustomEvent(ANALYTICS_EXCLUSION_CHANGE_EVENT, { detail: next }));
  return next;
}

export function useAnalyticsExclusionState() {
  const [excluded, setExcluded] = useState(false);

  useEffect(() => {
    const update = (event) => setExcluded(
      typeof event?.detail === "boolean" ? event.detail : isAnalyticsExcluded()
    );
    update();
    window.addEventListener(ANALYTICS_EXCLUSION_CHANGE_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(ANALYTICS_EXCLUSION_CHANGE_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return [excluded, setAnalyticsExcluded];
}
