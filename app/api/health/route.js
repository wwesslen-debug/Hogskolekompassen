import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  try {
    const db = getDb();
    const row = db.prepare("SELECT COUNT(*) AS count FROM programs").get();
    return NextResponse.json({
      status: "ok",
      database: "ready",
      programs: Number(row?.count || 0),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: "degraded",
      database: "unavailable",
      message: error instanceof Error ? error.message : "Unknown database error",
      timestamp: new Date().toISOString(),
    });
  }
}
