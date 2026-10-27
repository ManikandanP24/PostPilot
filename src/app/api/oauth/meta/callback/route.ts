import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth";
import { validateOAuthState } from "@/lib/oauth";
import { encryptSecret } from "@/lib/crypto";
const graph=()=> "https://graph.facebook.com/"+(process.env.META_GRAPH_API_VERSION||"v26.0");
function back(request:Request,params:Record<string,string>){const u=new URL("/dashboard/settings",request.url);for(const [k,v] of Object.entries(params))u.searchParams.set(k,v);return NextResponse.redirect(u)}
export async function GET(request:Request){
 const url=new URL(request.url);const code=url.searchParams.get("code");const state=url.searchParams.get("state");
 if(url.searchParams.get("error"))return back(request,{oauth_error:url.searchParams.get("error_description")||"Meta authorization was cancelled."});
 try{
  if(!await validateOAuthState("meta",state))return back(request,{oauth_error:"Meta authorization state expired. Please try connecting again."});
  if(!code)throw new Error("Meta did not return an authorization code.");
  const {workspace}=await requireApiContext();const redirect=process.env.META_REDIRECT_URI;if(!redirect||!process.env.META_APP_ID||!process.env.META_APP_SECRET)throw new Error("Meta OAuth environment variables are incomplete.");
  const params=new URLSearchParams({client_id:process.env.META_APP_ID,client_secret:process.env.META_APP_SECRET,redirect_uri:redirect,code});
  const tokenR=await fetch(graph()+"/oauth/access_token?"+params,{cache:"no-store"});const short=await tokenR.json();if(!tokenR.ok||!short.access_token)throw new Error(short.error?.message||"Meta token exchange failed.");
  const longR=await fetch(graph()+"/oauth/access_token?"+new URLSearchParams({grant_type:"fb_exchange_token",client_id:process.env.META_APP_ID,client_secret:process.env.META_APP_SECRET,fb_exchange_token:short.access_token}),{cache:"no-store"});const long=await longR.json();if(!longR.ok||!long.access_token)throw new Error(long.error?.message||"Meta long-lived token exchange failed.");
  const pageR=await fetch(graph()+"/me/accounts?"+new URLSearchParams({fields:"id,name,access_token,instagram_business_account{id,username}",access_token:long.access_token}),{cache:"no-store"});const pageData=await pageR.json();if(!pageR.ok)throw new Error(pageData.error?.message||"Could not read accessible Facebook Pages.");
  const page=(pageData.data||[]).find((x:any)=>x.access_token);if(!page)throw new Error("No Facebook Page was found. Link an Instagram Business or Creator account to a Facebook Page and grant Page permissions.");
  const admin=(await requireApiContext()).admin;const expiresAt=long.expires_in?new Date(Date.now()+Number(long.expires_in)*1000).toISOString():null;const shared={workspace_id:workspace.id,page_id:String(page.id),access_token_enc:encryptSecret(page.access_token),refresh_token_enc:encryptSecret(long.access_token),token_expires_at:expiresAt,scopes:["pages_show_list","pages_read_engagement","pages_manage_posts","instagram_basic","instagram_content_publish"],connected_at:new Date().toISOString(),last_checked_at:new Date().toISOString(),last_error:null,metadata:{page_id:String(page.id),page_name:page.name}};
  const {error:fbError}=await admin.from("social_accounts").upsert({...shared,platform:"facebook",account_id:String(page.id),account_name:page.name,instagram_user_id:null},{onConflict:"workspace_id,platform"});if(fbError)throw fbError;
  if(page.instagram_business_account?.id){const ig=page.instagram_business_account;const {error:igError}=await admin.from("social_accounts").upsert({...shared,platform:"instagram",account_id:String(ig.id),instagram_user_id:String(ig.id),account_name:ig.username||page.name,metadata:{page_id:String(page.id),page_name:page.name,instagram_username:ig.username||null}},{onConflict:"workspace_id,platform"});if(igError)throw igError}
  return back(request,{connected:page.instagram_business_account?.id?"instagram,facebook":"facebook",connected_name:page.name,oauth_notice:page.instagram_business_account?.id?"Facebook Page and Instagram professional account connected.":"Facebook Page connected; no linked Instagram professional account was found."});
 }catch(e){return back(request,{oauth_error:e instanceof Error?e.message:"Meta connection failed."})}
}
