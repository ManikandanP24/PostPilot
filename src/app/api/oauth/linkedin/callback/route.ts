import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth";
import { validateOAuthState } from "@/lib/oauth";
import { encryptSecret } from "@/lib/crypto";
function back(request:Request,params:Record<string,string>){const u=new URL("/dashboard/settings",request.url);for(const [k,v] of Object.entries(params))u.searchParams.set(k,v);return NextResponse.redirect(u)}
export async function GET(request:Request){
 const url=new URL(request.url);if(url.searchParams.get("error"))return back(request,{oauth_error:url.searchParams.get("error_description")||"LinkedIn authorization was cancelled."});
 try{
  if(!await validateOAuthState("linkedin",url.searchParams.get("state")))return back(request,{oauth_error:"LinkedIn authorization state expired. Please try connecting again."});
  const code=url.searchParams.get("code");if(!code)throw new Error("LinkedIn did not return an authorization code.");
  const redirect=process.env.LINKEDIN_REDIRECT_URI;if(!redirect||!process.env.LINKEDIN_CLIENT_ID||!process.env.LINKEDIN_CLIENT_SECRET)throw new Error("LinkedIn OAuth environment variables are incomplete.");
  const form=new URLSearchParams({grant_type:"authorization_code",code,redirect_uri:redirect,client_id:process.env.LINKEDIN_CLIENT_ID,client_secret:process.env.LINKEDIN_CLIENT_SECRET});
  const tokenR=await fetch("https://www.linkedin.com/oauth/v2/accessToken",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:form,cache:"no-store"});const token=await tokenR.json();if(!tokenR.ok||!token.access_token)throw new Error(token.error_description||"LinkedIn token exchange failed.");
  const profileR=await fetch("https://api.linkedin.com/v2/userinfo",{headers:{Authorization:"Bearer "+token.access_token},cache:"no-store"});const profile=await profileR.json();if(!profileR.ok||!profile.sub)throw new Error("Could not read LinkedIn profile. Check that the OpenID Connect product is enabled.");
  const {workspace,admin}=await requireApiContext();const {error}=await admin.from("social_accounts").upsert({workspace_id:workspace.id,platform:"linkedin",account_id:String(profile.sub),account_name:profile.name||profile.email||"LinkedIn member",access_token_enc:encryptSecret(token.access_token),refresh_token_enc:token.refresh_token?encryptSecret(token.refresh_token):null,token_expires_at:token.expires_in?new Date(Date.now()+Number(token.expires_in)*1000).toISOString():null,scopes:["openid","profile","w_member_social"],connected_at:new Date().toISOString(),last_checked_at:new Date().toISOString(),last_error:null,metadata:{picture:profile.picture||null,email:profile.email||null}},{onConflict:"workspace_id,platform"});if(error)throw error;
  return back(request,{connected:"linkedin",connected_name:profile.name||"LinkedIn profile"});
 }catch(e){return back(request,{oauth_error:e instanceof Error?e.message:"LinkedIn connection failed."})}
}
