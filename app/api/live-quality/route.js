import { NextResponse } from "next/server";
import { getLiveDataStatus, getLiveLinkQuality } from "@/lib/db";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    status: getLiveDataStatus(),
    quality: getLiveLinkQuality(25),
  });
}
