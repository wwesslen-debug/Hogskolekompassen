import { NextResponse } from "next/server";
import {
  getLiveDataStatus,
  getLiveFilterOptions,
  getLiveOfferingCount,
  getLiveOfferings,
} from "@/lib/db";

export const runtime = "nodejs";

export function GET(request) {
  const { searchParams } = new URL(request.url);
  const includeOptions = searchParams.get("options") === "1";
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || 80)));
  const offset = Math.max(0, Number(searchParams.get("offset") || 0));
  const filters = {
    search: searchParams.get("search") || "",
    period: searchParams.get("period") || "",
    city: searchParams.get("city") || "",
    provider: searchParams.get("provider") || "",
    kind: searchParams.get("kind") || "",
    applicationStatus: searchParams.get("applicationStatus") || "",
    distance: searchParams.get("distance") || "",
    upcoming: searchParams.get("upcoming") !== "0",
  };

  const status = getLiveDataStatus();
  if (!status.ready || status.eventCount === 0) {
    return NextResponse.json({
      offerings: [],
      total: 0,
      status,
      options: includeOptions ? getLiveFilterOptions() : undefined,
    });
  }

  return NextResponse.json({
    offerings: getLiveOfferings({ ...filters, limit, offset }),
    total: getLiveOfferingCount(filters),
    status,
    options: includeOptions ? getLiveFilterOptions() : undefined,
  });
}
