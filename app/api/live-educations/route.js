import { NextResponse } from "next/server";
import {
  getLiveDataStatus,
  getLiveFilterOptions,
  getLiveOfferingCount,
  getLiveOfferings,
} from "@/lib/db";

export const runtime = "nodejs";

function cleanIds(value) {
  return String(value || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 200);
}

function cleanId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : "";
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const includeOptions = searchParams.get("options") === "1";
  const optionsOnly = searchParams.get("optionsOnly") === "1";
  const ids = cleanIds(searchParams.get("ids"));
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || 80)));
  const offset = Math.max(0, Number(searchParams.get("offset") || 0));
  const filters = {
    ids,
    search: searchParams.get("search") || "",
    period: searchParams.get("period") || "",
    city: searchParams.get("city") || "",
    provider: searchParams.get("provider") || "",
    kind: searchParams.get("kind") || "",
    applicationStatus: searchParams.get("applicationStatus") || "",
    distance: searchParams.get("distance") || "",
    programId: cleanId(searchParams.get("programId")),
    upcoming: searchParams.get("upcoming") !== "0",
  };

  if (optionsOnly) {
    const [status, options] = await Promise.all([
      getLiveDataStatus(),
      getLiveFilterOptions(),
    ]);
    return NextResponse.json({
      status,
      options,
    });
  }

  const status = await getLiveDataStatus();
  if (!status.ready || status.eventCount === 0) {
    return NextResponse.json({
      offerings: [],
      total: null,
      hasMore: false,
      status,
      options: includeOptions ? await getLiveFilterOptions() : undefined,
    });
  }

  const queryLimit = Math.min(limit + 1, 201);
  const [offerings, total, options] = await Promise.all([
    getLiveOfferings({ ...filters, limit: queryLimit, offset }),
    searchParams.get("count") === "1" ? getLiveOfferingCount(filters) : Promise.resolve(null),
    includeOptions ? getLiveFilterOptions() : Promise.resolve(undefined),
  ]);
  const hasMore = offerings.length > limit;

  return NextResponse.json({
    offerings: hasMore ? offerings.slice(0, limit) : offerings,
    total,
    hasMore,
    status,
    options,
  });
}
