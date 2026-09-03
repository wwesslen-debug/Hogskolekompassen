import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { resetSupabaseAnalytics } from "@/lib/supabase-db";

export const runtime = "nodejs";

export async function POST(request) {
  const adminSession = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!isValidAdminSession(adminSession)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const redirectUrl = new URL("/admin", request.url);

  try {
    const result = await resetSupabaseAnalytics();
    redirectUrl.searchParams.set("reset", result.configured ? "ok" : "missing-config");
  } catch (error) {
    console.warn("Analytics reset failed.", error?.message || error);
    redirectUrl.searchParams.set("reset", "error");
  }

  return NextResponse.redirect(redirectUrl, 303);
}
