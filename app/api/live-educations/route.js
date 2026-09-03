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
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, 200);
}

function cleanId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : "";
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const includeOptions = searchParams.get("options") === "1";
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

  const status = await getLiveDataStatus();
  if (!status.ready || status.eventCount === 0) {
    return NextResponse.json({
      offerings: [],
      total: 0,
      status,
      options: includeOptions ? await getLiveFilterOptions() : undefined,
    });
  }

  const [offerings, total, options] = await Promise.all([
    getLiveOfferings({ ...filters, limit, offset }),
    getLiveOfferingCount(filters),
    includeOptions ? getLiveFilterOptions() : Promise.resolve(undefined),
  ]);

  return NextResponse.json({
    offerings,
    total,
    status,
    options,
  });
}
