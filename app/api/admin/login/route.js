import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  isAdminConfigured,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request) {
  const formData = await request.formData();
  const token = String(formData.get("token") || "");
  const nextUrl = new URL("/admin", request.url);

  if (!isAdminConfigured()) {
    nextUrl.searchParams.set("error", "missing-config");
    return NextResponse.redirect(nextUrl, { status: 303 });
  }

  if (!verifyAdminPassword(token)) {
    nextUrl.searchParams.set("error", "invalid");
    return NextResponse.redirect(nextUrl, { status: 303 });
  }

  const response = NextResponse.redirect(nextUrl, { status: 303 });
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
