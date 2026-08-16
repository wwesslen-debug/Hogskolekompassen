"use client";

import Script from "next/script";
import { useEffect } from "react";

function isValidSlot(slot) {
  return typeof slot === "string" && /^\d+$/.test(slot.trim());
}

export default function AdSenseUnit({
  client,
  slot,
  className = "",
  label = "Annons",
  format = "horizontal",
  responsive = true,
}) {
  const safeSlot = slot?.trim();
  const shouldRender = client && isValidSlot(safeSlot);

  useEffect(() => {
    if (!shouldRender) return;
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch {}
  }, [shouldRender, safeSlot]);

  if (!shouldRender) return null;

  return (
    <aside className={`manualAd ${className}`} aria-label={label}>
      <span className="manualAdLabel">Annons</span>
      <Script
        id="adsense-pagead"
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={safeSlot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </aside>
  );
}
