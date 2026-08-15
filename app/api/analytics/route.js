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

  const properties = payload?.properties && typeof payload.properties === "object" ? payload.properties : {};
  const record = {
    type: "hk_funnel_event",
    event,
    path: String(payload?.path || "").slice(0, 180),
    properties,
    ts: payload?.ts || new Date().toISOString(),
  };

  console.log(JSON.stringify(record));
  return NextResponse.json({ ok: true });
}
