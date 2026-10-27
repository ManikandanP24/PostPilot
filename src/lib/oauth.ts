import { randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
export function makeOAuthState() { return randomBytes(32).toString("base64url"); }
export async function setOAuthStateCookie(platform: "meta" | "linkedin", state: string) {
  const cookieStore = await cookies();
  cookieStore.set(`postpilot_oauth_${platform}`, state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: `/api/oauth/${platform}/callback`, maxAge: 600 });
}
export async function validateOAuthState(platform: "meta" | "linkedin", provided: string | null) {
  const store = await cookies(); const name = `postpilot_oauth_${platform}`; const expected = store.get(name)?.value;
  store.set(name, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: `/api/oauth/${platform}/callback`, maxAge: 0 });
  if (!provided || !expected) return false;
  const a = Buffer.from(provided); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function settingsRedirect(params: Record<string, string>) {
  const url = new URL("/dashboard/settings", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  Object.entries(params).forEach(([key,value]) => url.searchParams.set(key,value));
  return NextResponse.redirect(url);
}
