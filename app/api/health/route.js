import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const health = {
    status: "ok",
    service: "ready",
    database: "supabase",
    liveDataSource: "supabase",
    supabaseConfigured: Boolean(process.env.SUPABASE_DATABASE_URL),
    timestamp: new Date().toISOString(),
  };

  // Railway checks process readiness. Catalog queries must never hold up startup.
  if (new URL(request.url).searchParams.get("details") !== "1") {
    return NextResponse.json(health);
  }

  const { getLiveDataStatus } = await import("@/lib/db");
  const liveData = await getLiveDataStatus();
  return NextResponse.json({
    ...health,
    liveDataReady: Boolean(liveData.ready),
    eventCount: liveData.eventCount || 0,
    linkedCount: liveData.linkedCount || 0,
    supabaseError: liveData.supabaseError || null,
  });
}
