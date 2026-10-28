import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const authError = url.searchParams.get("error");
  const errorCode = url.searchParams.get("error_code");

  // Keep provider/confirmation errors on the app's login page without leaking
  // provider details or query-string data into the UI.
  if (authError) {
    const reason = errorCode === "otp_expired" ? "confirmation" : "oauth";
    return NextResponse.redirect(new URL(`/auth/login?error=${reason}`, url.origin));
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL("/dashboard", url.origin));
    }
  }

  return NextResponse.redirect(new URL("/auth/login?error=callback", url.origin));
}
