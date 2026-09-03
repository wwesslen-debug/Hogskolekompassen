"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackFunnelEvent } from "@/lib/analytics-client";
import { useConsentState } from "@/lib/consent-client";

function routeEvent(pathname) {
  if (pathname === "/") return { event: "visit" };
  if (pathname === "/resultat") return { event: "view_results" };
  if (pathname === "/jamfor") return { event: "compare_view" };
  if (pathname === "/min-vag") return { event: "saved_list_view" };

  return null;
}

export default function AnalyticsEvents() {
  const pathname = usePathname();
  const [consent] = useConsentState();

  useEffect(() => {
    if (!pathname || !consent.analytics) return;
    trackFunnelEvent("page_view", { pathname });
    const funnel = routeEvent(pathname);
    if (funnel) trackFunnelEvent(funnel.event, funnel.properties || {});
  }, [pathname, consent.analytics]);

  return null;
}
