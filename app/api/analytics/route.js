import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { recordSupabaseAnalyticsEvent } from "@/lib/supabase-db";

export const runtime = "nodejs";

const allowedEvents = new Set([
  "page_view",
  "visit",
  "quiz_started",
  "quiz_completed",
  "start_compass",
  "compass_completed",
  "view_results",
  "compare_used",
  "compare_add",
  "compare_remove",
  "compare_limit_reached",
  "compare_view",
  "saved_live_program",
  "save_program",
  "unsave_program",
  "saved_list_view",
  "external_application_click",
  "application_click",
]);

const quizStartProperties = {
  quizMode: "shortString",
  baseQuestionCount: "integer",
  adaptiveLimit: "integer",
};

const quizCompletionProperties = {
  quizMode: "shortString",
  certainAnswers: "integer",
  adaptiveQuestionCount: "integer",
  selectedInterests: "integer",
  selectedPriorities: "integer",
  selectedDealBreakers: "integer",
};

const compareProperties = { programId: "integer", offeringId: "shortString", count: "integer" };
const saveProperties = { programId: "integer", offeringId: "shortString", status: "status" };
const externalClickProperties = {
  target: "url",
  source: "shortString",
  programId: "integer",
  offeringId: "shortString",
  matchSource: "shortString",
};

const propertySchemas = {
  page_view: { pathname: "path" },
  quiz_started: quizStartProperties,
  quiz_completed: quizCompletionProperties,
  compare_used: compareProperties,
  compare_add: compareProperties,
  compare_remove: { programId: "integer", offeringId: "shortString" },
  compare_limit_reached: { programId: "integer", offeringId: "shortString", count: "integer" },
  saved_live_program: saveProperties,
  save_program: saveProperties,
  unsave_program: saveProperties,
  compass_completed: quizCompletionProperties,
  external_application_click: externalClickProperties,
  application_click: externalClickProperties,
};

const allowedStatuses = new Set(["favorite", "interesting", "unsure", "no"]);

function cleanValue(value, type) {
  if (type === "integer") {
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 ? number : undefined;
  }
  if (type === "path") {
    return typeof value === "string" && value.startsWith("/") ? value.slice(0, 180) : undefined;
  }
  if (type === "url") {
    return typeof value === "string" && /^https?:\/\//i.test(value) ? value.slice(0, 240) : undefined;
  }
  if (type === "status") {
    return allowedStatuses.has(value) ? value : undefined;
  }
  if (type === "shortString") {
    return typeof value === "string" ? value.slice(0, 80) : undefined;
  }
  return undefined;
}

function sanitizeProperties(event, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const schema = propertySchemas[event] || {};
  const sanitized = {};
  for (const [key, type] of Object.entries(schema)) {
    const clean = cleanValue(value[key], type);
    if (clean !== undefined) sanitized[key] = clean;
  }
  return sanitized;
}

function cleanTimestamp(value) {
  return typeof value === "string" && value.length <= 40 ? value : new Date().toISOString();
}

export async function POST(request) {
  const adminSession = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (isValidAdminSession(adminSession)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const event = String(payload?.event || "").slice(0, 80);
  if (!allowedEvents.has(event)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const record = {
    type: "hk_funnel_event",
    event,
    path: cleanValue(payload?.path, "path") || "",
    properties: sanitizeProperties(event, payload?.properties),
    ts: cleanTimestamp(payload?.ts),
  };

  try {
    await recordSupabaseAnalyticsEvent(record);
  } catch (error) {
    console.warn("Analytics aggregate write failed.", error?.message || error);
  }

  console.log(JSON.stringify(record));
  return NextResponse.json({ ok: true });
}
