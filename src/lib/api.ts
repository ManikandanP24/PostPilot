import { NextResponse } from "next/server";
export function apiError(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "An unexpected error occurred.";
  if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  return NextResponse.json({ error: message }, { status });
}
export function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
