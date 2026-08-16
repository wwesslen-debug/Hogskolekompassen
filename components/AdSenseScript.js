"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

const blockedAutoAdPaths = ["/kompass", "/form", "/resultat", "/jamfor", "/min-vag"];

export default function AdSenseScript({ client }) {
  const pathname = usePathname() || "/";
  const shouldBlockAds = blockedAutoAdPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (shouldBlockAds) return null;

  return (
    <Script
      id="adsense-auto-ads"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
