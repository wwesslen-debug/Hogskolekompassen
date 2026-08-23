"use client";

import { useEffect, useRef, useState } from "react";
import { useConsentState } from "@/lib/consent-client";

const EMPTY_AD_TIMEOUT_MS = 4000;

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
  const adRef = useRef(null);
  const [adStatus, setAdStatus] = useState("pending");
  const [consent] = useConsentState();
  const safeSlot = slot?.trim();
  const shouldRender = consent.ads && client && isValidSlot(safeSlot);

  useEffect(() => {
    if (!shouldRender) return undefined;
    setAdStatus("pending");

    const emptyTimer = window.setTimeout(() => {
      setAdStatus((currentStatus) => (currentStatus === "pending" ? "empty" : currentStatus));
    }, EMPTY_AD_TIMEOUT_MS);

    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch {}

    return () => window.clearTimeout(emptyTimer);
  }, [shouldRender, safeSlot]);

  useEffect(() => {
    const adElement = adRef.current;
    if (!shouldRender || !adElement) return undefined;

    const syncStatus = () => {
      const nextStatus = adElement.getAttribute("data-ad-status");
      if (nextStatus) {
        setAdStatus(nextStatus);
      }
    };

    syncStatus();
    const observer = new MutationObserver(syncStatus);
    observer.observe(adElement, { attributes: true, attributeFilter: ["data-ad-status"] });

    return () => observer.disconnect();
  }, [shouldRender, safeSlot]);

  if (!shouldRender) return null;

  return (
    <aside className={`manualAd ${className}`} data-ad-status={adStatus} aria-label={label}>
      {adStatus === "filled" ? <span className="manualAdLabel">Annons</span> : null}
      <ins
        ref={adRef}
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
