import { NextResponse } from "next/server";
import { getLiveDataStatus, getLiveLinkQuality } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const [status, quality] = await Promise.all([
    getLiveDataStatus(),
    getLiveLinkQuality(25),
  ]);
  return NextResponse.json({
    status,
    quality,
  });
}
