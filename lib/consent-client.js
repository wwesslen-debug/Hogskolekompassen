"use client";

import { useEffect, useState } from "react";

export const CONSENT_STORAGE_KEY = "hogskolekompassen-consent-v1";
export const CONSENT_CHANGE_EVENT = "hogskolekompassen-consent-change";
export const CONSENT_OPEN_EVENT = "hogskolekompassen-open-consent";

const DEFAULT_CONSENT = {
  version: 1,
  decided: false,
  necessary: true,
  analytics: false,
  ads: false,
  updatedAt: null,
};

function normalizeConsent(value) {
  if (!value || typeof value !== "object") return { ...DEFAULT_CONSENT };
  return {
    version: 1,
    decided: Boolean(value.decided),
    necessary: true,
    analytics: Boolean(value.analytics),
    ads: Boolean(value.ads),
    updatedAt: value.updatedAt || null,
  };
}

export function readConsent() {
  if (typeof window === "undefined") return { ...DEFAULT_CONSENT };
  try {
    return normalizeConsent(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) || "null"));
  } catch {
    return { ...DEFAULT_CONSENT };
  }
}

export function writeConsent(nextConsent) {
  if (typeof window === "undefined") return { ...DEFAULT_CONSENT };
  const consent = normalizeConsent({
    ...nextConsent,
    decided: true,
    updatedAt: new Date().toISOString(),
  });
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: consent }));
  return consent;
}

export function resetConsent() {
  if (typeof window === "undefined") return { ...DEFAULT_CONSENT };
  localStorage.removeItem(CONSENT_STORAGE_KEY);
  const consent = { ...DEFAULT_CONSENT };
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: consent }));
  return consent;
}

export function hasConsentPurpose(purpose) {
  return Boolean(readConsent()[purpose]);
}

export function openConsentSettings() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}

export function useConsentState() {
  const [consent, setConsent] = useState(DEFAULT_CONSENT);

  useEffect(() => {
    const update = (event) => setConsent(normalizeConsent(event?.detail || readConsent()));
    update();
    window.addEventListener(CONSENT_CHANGE_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(CONSENT_CHANGE_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return [consent, (nextConsent) => setConsent(writeConsent(nextConsent))];
}
