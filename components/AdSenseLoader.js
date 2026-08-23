"use client";

import { useEffect } from "react";
import { useConsentState } from "@/lib/consent-client";

export default function AdSenseLoader({ client }) {
  const [consent] = useConsentState();

  useEffect(() => {
    const selector = "script[data-hk-adsense='true']";
    if (!consent.ads || !client) {
      document.querySelectorAll(selector).forEach((script) => script.remove());
      try { window.adsbygoogle = undefined; } catch {}
      return;
    }

    if (document.querySelector(selector)) return;

    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.hkAdsense = "true";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    document.head.appendChild(script);
  }, [client, consent.ads]);

  return null;
}
