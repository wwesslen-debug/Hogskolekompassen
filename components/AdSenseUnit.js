"use client";

import { useEffect, useRef, useState } from "react";

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
  const safeSlot = slot?.trim();
  const shouldRender = client && isValidSlot(safeSlot);

  useEffect(() => {
    if (!shouldRender) return;
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch {}
  }, [shouldRender, safeSlot]);

  useEffect(() => {
    const adElement = adRef.current;
    if (!shouldRender || !adElement) return undefined;

    const syncStatus = () => {
      setAdStatus(adElement.getAttribute("data-ad-status") || "pending");
    };

    syncStatus();
    const observer = new MutationObserver(syncStatus);
    observer.observe(adElement, { attributes: true, attributeFilter: ["data-ad-status"] });

    return () => observer.disconnect();
  }, [shouldRender, safeSlot]);

  if (!shouldRender) return null;

  return (
    <aside className={`manualAd ${className}`} data-ad-status={adStatus} aria-label={label}>
      <span className="manualAdLabel">Annons</span>
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
