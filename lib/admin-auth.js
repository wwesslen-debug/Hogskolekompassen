import crypto from "node:crypto";

export const ADMIN_SESSION_COOKIE = "hk_admin_session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function adminSecret() {
  return process.env.ADMIN_TOKEN || "";
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function sign(value) {
  return crypto.createHmac("sha256", adminSecret()).update(value).digest("hex");
}

export function isAdminConfigured() {
  return adminSecret().length >= 16;
}

export function verifyAdminPassword(value) {
  return isAdminConfigured() && safeEqual(value, adminSecret());
}

export function createAdminSessionToken() {
  const expires = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = `v1.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function isValidAdminSession(value) {
  if (!isAdminConfigured() || typeof value !== "string") return false;
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;

  const expires = Number(parts[1]);
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return false;

  const payload = `${parts[0]}.${parts[1]}`;
  return safeEqual(parts[2], sign(payload));
}

export const ADMIN_SESSION_MAX_AGE_SECONDS = SESSION_MAX_AGE_SECONDS;
