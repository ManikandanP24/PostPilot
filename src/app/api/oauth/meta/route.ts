import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth";
import { makeOAuthState, setOAuthStateCookie } from "@/lib/oauth";
import { apiError } from "@/lib/api";

function settingsError(request: Request, message: string) {
  const url = new URL("/dashboard/settings", request.url);
  url.searchParams.set("oauth_error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  try {
    await requireApiContext();

    // Do not send users to Meta's OAuth page until all required server-side
    // credentials are present. Show the issue inside Settings instead of
    // returning a raw JSON 500 from this browser-navigation endpoint.
    const missing = [
      ["META_APP_ID", process.env.META_APP_ID],
      ["META_APP_SECRET", process.env.META_APP_SECRET],
      ["META_REDIRECT_URI", process.env.META_REDIRECT_URI],
    ]
      .filter(([, value]) => !value?.trim())
      .map(([key]) => key);

    if (missing.length) {
      return settingsError(
        request,
        `Meta connection is not configured yet. Add ${missing.join(", ")} in Render Environment, then redeploy.`,
      );
    }

    const state = makeOAuthState();
    await setOAuthStateCookie("meta", state);

    const url = new URL(
      "https://www.facebook.com/" +
        (process.env.META_GRAPH_API_VERSION || "v26.0") +
        "/dialog/oauth",
    );
    url.searchParams.set("client_id", process.env.META_APP_ID!);
    url.searchParams.set("redirect_uri", process.env.META_REDIRECT_URI!);
    url.searchParams.set("state", state);
    url.searchParams.set("response_type", "code");
    url.searchParams.set(
      "scope",
      "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish",
    );

    return NextResponse.redirect(url);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return apiError(error, 401);
    }

    return settingsError(
      request,
      error instanceof Error
        ? error.message
        : "Could not start Meta authorization. Please try again.",
    );
  }
}
