import { NextResponse } from "next/server";

const allowedEvents = new Set([
  "page_view",
  "visit",
  "start_compass",
  "compass_completed",
  "view_results",
  "open_education",
  "compare_add",
  "compare_remove",
  "compare_limit_reached",
  "compare_view",
  "save_program",
  "unsave_program",
  "saved_list_view",
  "application_click",
]);

const propertySchemas = {
  page_view: { pathname: "path" },
  open_education: { programId: "integer" },
  compare_add: { programId: "integer", count: "integer" },
  compare_remove: { programId: "integer" },
  compare_limit_reached: { programId: "integer", count: "integer" },
  save_program: { programId: "integer", status: "status" },
  unsave_program: { programId: "integer", status: "status" },
  compass_completed: {
    quizMode: "shortString",
    certainAnswers: "integer",
    adaptiveQuestionCount: "integer",
    selectedPriorities: "integer",
    selectedDealBreakers: "integer",
  },
  application_click: {
    target: "url",
    source: "shortString",
    programId: "integer",
    offeringId: "integer",
    matchSource: "shortString",
  },
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

  console.log(JSON.stringify(record));
  return NextResponse.json({ ok: true });
}
