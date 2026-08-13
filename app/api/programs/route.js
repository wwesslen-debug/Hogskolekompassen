import { NextResponse } from "next/server";
import { getProgramCount, getPrograms, getProgramsByIds } from "@/lib/db";

export const runtime = "nodejs";

export function GET(request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("ids");

  if (ids) {
    const programs = getProgramsByIds(ids.split(","));
    return NextResponse.json({ programs, total: programs.length });
  }

  const filters = {
    search: searchParams.get("search") || "",
    city: searchParams.get("city") || "",
    category: searchParams.get("category") || "",
    degree: searchParams.get("degree") || "",
  };

  const programs = getPrograms({ ...filters, limit: 500 });
  return NextResponse.json({ programs, total: getProgramCount(filters) });
}
