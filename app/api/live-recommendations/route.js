import { NextResponse } from "next/server";
import { getLiveDataStatus, getLiveRecommendationsForPrograms } from "@/lib/db";

export const runtime = "nodejs";

export function GET(request) {
  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") || "")
    .split(",")
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, 30);
  const limit = Math.max(1, Math.min(30, Number(searchParams.get("limit") || 12)));
  const perProgram = Math.max(1, Math.min(5, Number(searchParams.get("perProgram") || 3)));
  const status = getLiveDataStatus();

  if (!status.ready || !status.eventCount || !ids.length) {
    return NextResponse.json({ offerings: [], status });
  }

  return NextResponse.json({
    offerings: getLiveRecommendationsForPrograms(ids, { limit, perProgram }),
    status,
  });
}
