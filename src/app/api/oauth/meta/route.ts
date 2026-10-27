import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth";
import { makeOAuthState,setOAuthStateCookie } from "@/lib/oauth";
import { apiError } from "@/lib/api";
export async function GET(){
 try{
  await requireApiContext();const state=makeOAuthState();await setOAuthStateCookie("meta",state);
  const redirect=process.env.META_REDIRECT_URI;if(!redirect||!process.env.META_APP_ID)throw new Error("Configure META_APP_ID and META_REDIRECT_URI in the server environment first.");
  const url=new URL("https://www.facebook.com/"+(process.env.META_GRAPH_API_VERSION||"v26.0")+"/dialog/oauth");
  url.searchParams.set("client_id",process.env.META_APP_ID);url.searchParams.set("redirect_uri",redirect);url.searchParams.set("state",state);
  url.searchParams.set("response_type","code");url.searchParams.set("scope","pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish");
  return NextResponse.redirect(url);
 }catch(e){return apiError(e,(e instanceof Error&&e.message==="UNAUTHORIZED")?401:500)}
}
