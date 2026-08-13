import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "ready",
    database: process.env.HK_DISABLE_SQLITE === "1" ? "disabled_for_web_boot" : "not_checked",
    timestamp: new Date().toISOString(),
  });
}
