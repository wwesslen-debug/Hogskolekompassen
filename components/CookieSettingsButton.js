"use client";

import { openConsentSettings } from "@/lib/consent-client";

export default function CookieSettingsButton({ className = "" }) {
  return (
    <button type="button" className={className || "footerConsentButton"} onClick={openConsentSettings}>
      Cookieinställningar
    </button>
  );
}
