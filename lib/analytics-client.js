"use client";

import { hasConsentPurpose } from "@/lib/consent-client";
import { isAnalyticsExcluded } from "@/lib/analytics-exclusion-client";

const endpoint = "/api/analytics";

function send(payload) {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/admin")) return;
  if (isAnalyticsExcluded()) return;
  if (!hasConsentPurpose("analytics")) return;

  const body = JSON.stringify({
    ...payload,
    path: payload.path || window.location.pathname,
    ts: new Date().toISOString(),
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
    return;
  }

  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

export function trackFunnelEvent(event, properties = {}) {
  send({ event, properties });
}

export function trackExternalClick(target, properties = {}) {
  send({
    event: "external_application_click",
    properties: {
      target,
      ...properties,
    },
  });
}
