import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const MASTER_COOKIE_NAME = "cafeluxe_master_auth";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function hashMasterPin(pin: string, salt: string, pepper: string) {
  return sha256(`${salt}:${pin}:${pepper}`);
}

export function verifyMasterPin(pin: string) {
  const salt = String(process.env.MASTER_PIN_SALT ?? "");
  const pepper = String(process.env.MASTER_PIN_PEPPER ?? "");
  const expectedHash = String(process.env.MASTER_PIN_HASH ?? "");

  if (!pin || !salt || !pepper || !expectedHash) return false;

  return safeEqual(hashMasterPin(pin, salt, pepper), expectedHash);
}

function sessionSecret() {
  return String(process.env.MASTER_SESSION_SECRET ?? process.env.MASTER_PIN_PEPPER ?? "");
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("hex");
}

export function createMasterSessionValue() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const nonce = randomBytes(16).toString("hex");
  const payload = `${expiresAt}.${nonce}`;
  return `${payload}.${sign(payload)}`;
}

export function isMasterSessionTokenValid(token: string) {
  const secret = sessionSecret();
  if (!secret || !token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [expiresRaw, nonce, signature] = parts;
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return false;
  if (!nonce || !signature) return false;

  return safeEqual(sign(`${expiresRaw}.${nonce}`), signature);
}

export function isMasterAuthenticated(request: NextRequest) {
  return isMasterSessionTokenValid(request.cookies.get(MASTER_COOKIE_NAME)?.value ?? "");
}

export function masterUnauthorized() {
  return NextResponse.json({ message: "Master login required." }, { status: 401 });
}

export function setMasterAuthCookie(response: NextResponse) {
  response.cookies.set(MASTER_COOKIE_NAME, createMasterSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}
