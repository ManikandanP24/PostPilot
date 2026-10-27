import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth";
import { makeOAuthState,setOAuthStateCookie } from "@/lib/oauth";
import { apiError } from "@/lib/api";
export async function GET(){
 try{
  await requireApiContext();if(!process.env.LINKEDIN_CLIENT_ID||!process.env.LINKEDIN_REDIRECT_URI)throw new Error("Configure LINKEDIN_CLIENT_ID and LINKEDIN_REDIRECT_URI in the server environment first.");
  const state=makeOAuthState();await setOAuthStateCookie("linkedin",state);
  const url=new URL("https://www.linkedin.com/oauth/v2/authorization");url.searchParams.set("response_type","code");url.searchParams.set("client_id",process.env.LINKEDIN_CLIENT_ID);url.searchParams.set("redirect_uri",process.env.LINKEDIN_REDIRECT_URI);url.searchParams.set("state",state);url.searchParams.set("scope","openid profile w_member_social");
  return NextResponse.redirect(url);
 }catch(e){return apiError(e,(e instanceof Error&&e.message==="UNAUTHORIZED")?401:500)}
}
