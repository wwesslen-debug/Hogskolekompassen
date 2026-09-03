import { NextResponse } from "next/server";
import { getProgramsByIds } from "@/lib/db";

export const runtime = "nodejs";

export function GET(request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("ids");

  if (ids) {
    const programs = getProgramsByIds(ids.split(","));
    return NextResponse.json({ programs, total: programs.length });
  }

  return NextResponse.json({ programs: [], total: 0 });
}
