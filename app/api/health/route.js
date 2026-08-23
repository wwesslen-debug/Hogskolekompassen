import { NextResponse } from "next/server";
import { getLiveDataStatus } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const liveData = await getLiveDataStatus();

  return NextResponse.json({
    status: "ok",
    service: "ready",
    database: "supabase",
    liveDataSource: "supabase",
    liveDataReady: Boolean(liveData.ready),
    supabaseConfigured: Boolean(process.env.SUPABASE_DATABASE_URL),
    eventCount: liveData.eventCount || 0,
    linkedCount: liveData.linkedCount || 0,
    supabaseError: liveData.supabaseError || null,
    timestamp: new Date().toISOString(),
  });
}
