import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

type Platform = "instagram" | "facebook" | "linkedin";
type Account = { id:string; workspace_id:string; platform:Platform; account_id:string|null; account_name:string|null; page_id:string|null; instagram_user_id:string|null; access_token_enc:string|null; refresh_token_enc:string|null; token_expires_at:string|null; scopes:string[]; metadata:Record<string,any> };
type Asset = { id:string; public_url:string; mime_type:string; media_kind:string; storage_path:string };
const graphBase = () => "https://graph.facebook.com/" + (process.env.META_GRAPH_API_VERSION || "v26.0");
const liHeaders = (token:string) => ({ Authorization:"Bearer "+token, "Linkedin-Version":process.env.LINKEDIN_VERSION || "202610", "X-Restli-Protocol-Version":"2.0.0" });
const pause = (ms:number) => new Promise(resolve=>setTimeout(resolve,ms));
function label(p:Platform){return p==="instagram"?"Instagram":p==="facebook"?"Facebook":"LinkedIn"}
async function fetchRetry(url:string,init:RequestInit={}):Promise<Response>{
 let last:Response|null=null;
 for(let n=0;n<3;n++){const r=await fetch(url,{...init,cache:"no-store"});last=r;if((r.status===429||r.status>=500)&&n<2){await pause(Math.min(5000,Number(r.headers.get("retry-after")||0)*1000||500*(2**n)));continue}return r}
 if(last)return last;throw new Error("The social platform did not respond after retry attempts.")
}
function platformError(p:Platform,data:any,status:number){const msg=String(data?.error?.message||data?.message||data?.error_description||("HTTP "+status));if(status===401||status===403||Number(data?.error?.code)===190||/expired.*token|invalid.*token|access token/i.test(msg))return label(p)+" token expired or permissions changed. Reconnect the account in Settings.";return label(p)+": "+msg.slice(0,400)}
async function graphPost(p:Platform,url:string,form:URLSearchParams){const r=await fetchRetry(url,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:form});const d=await r.json();if(!r.ok||d.error)throw new Error(platformError(p,d,r.status));return d}
async function getToken(admin:ReturnType<typeof createSupabaseAdminClient>,account:Account):Promise<string>{
 if(!account.access_token_enc)throw new Error(label(account.platform)+" is not connected. Reconnect the account in Settings.");
 let token=decryptSecret(account.access_token_enc);const expiry=account.token_expires_at?new Date(account.token_expires_at).getTime():null;const now=Date.now();if(!expiry)return token;
 if(account.platform==="linkedin"&&expiry<=now+60000){
  if(!account.refresh_token_enc)throw new Error("LinkedIn token expired, reconnect your LinkedIn account in Settings.");
  const body=new URLSearchParams({grant_type:"refresh_token",refresh_token:decryptSecret(account.refresh_token_enc),client_id:process.env.LINKEDIN_CLIENT_ID||"",client_secret:process.env.LINKEDIN_CLIENT_SECRET||""});
  const r=await fetchRetry("https://www.linkedin.com/oauth/v2/accessToken",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});const d=await r.json();
  if(!r.ok||!d.access_token)throw new Error("LinkedIn token expired, reconnect your LinkedIn account in Settings.");
  token=d.access_token;await admin.from("social_accounts").update({access_token_enc:encryptSecret(token),refresh_token_enc:d.refresh_token?encryptSecret(d.refresh_token):account.refresh_token_enc,token_expires_at:d.expires_in?new Date(now+Number(d.expires_in)*1000).toISOString():null,last_checked_at:new Date().toISOString(),last_error:null}).eq("id",account.id);return token;
 }
 if((account.platform==="instagram"||account.platform==="facebook")&&expiry<=now+7*86400000){
  const userToken=account.refresh_token_enc?decryptSecret(account.refresh_token_enc):token;
  const q=new URLSearchParams({grant_type:"fb_exchange_token",client_id:process.env.META_APP_ID||"",client_secret:process.env.META_APP_SECRET||"",fb_exchange_token:userToken});
  const r=await fetchRetry(graphBase()+"/oauth/access_token?"+q.toString());const d=await r.json();
  if(!r.ok||!d.access_token)throw new Error(label(account.platform)+" token expires soon and could not be refreshed. Reconnect the account in Settings.");
  const pagesR=await fetchRetry(graphBase()+"/me/accounts?"+new URLSearchParams({fields:"id,name,access_token,instagram_business_account{id}",access_token:d.access_token}).toString());const pages=await pagesR.json();
  const pid=account.page_id||account.metadata?.page_id;const page=(pages.data||[]).find((x:any)=>String(x.id)===String(pid)&&x.access_token);
  if(!pagesR.ok||!page)throw new Error(label(account.platform)+" token refresh failed. Reconnect Meta in Settings.");
  token=page.access_token;const update={access_token_enc:encryptSecret(token),refresh_token_enc:encryptSecret(d.access_token),token_expires_at:d.expires_in?new Date(now+Number(d.expires_in)*1000).toISOString():account.token_expires_at,last_checked_at:new Date().toISOString(),last_error:null};
  await admin.from("social_accounts").update(update).eq("workspace_id",account.workspace_id).eq("page_id",String(pid));
  await admin.from("social_accounts").update(update).eq("id",account.id);
 }
 return token;
}
async function publishInstagram(token:string,account:Account,post:any,image:Asset,video:Asset|null){
 const id=account.instagram_user_id||account.account_id;if(!id)throw new Error("Instagram professional account ID is missing. Reconnect Instagram.");
 const form=new URLSearchParams({access_token:token,caption:post.instagram_caption||""});
 if(post.add_music&&video){form.set("media_type","REELS");form.set("video_url",video.public_url);form.set("share_to_feed","true")}else form.set("image_url",image.public_url);
 const container=await graphPost("instagram",graphBase()+"/"+id+"/media",form);if(!container.id)throw new Error("Instagram did not return a media container ID.");
 if(post.add_music&&video){let finished=false;for(let n=0;n<8;n++){await pause(3000);const r=await fetchRetry(graphBase()+"/"+container.id+"?"+new URLSearchParams({fields:"status_code,status",access_token:token}));const d=await r.json();if(!r.ok)throw new Error(platformError("instagram",d,r.status));if(d.status_code==="FINISHED"){finished=true;break}if(d.status_code==="ERROR"||d.status_code==="EXPIRED")throw new Error("Instagram Reel processing failed: "+(d.status||d.status_code))}if(!finished)throw new Error("Instagram is still processing the Reel. Retry publishing in a moment.")}
 const published=await graphPost("instagram",graphBase()+"/"+id+"/media_publish",new URLSearchParams({creation_id:container.id,access_token:token}));
 let permalink="https://www.instagram.com/";if(published.id){const r=await fetchRetry(graphBase()+"/"+published.id+"?"+new URLSearchParams({fields:"permalink",access_token:token}));const d=await r.json();permalink=d.permalink||permalink}
 return {remote_post_id:String(published.id),post_url:permalink};
}
async function publishFacebook(token:string,account:Account,post:any,image:Asset,video:Asset|null){
 const id=account.page_id||account.account_id;if(!id)throw new Error("Facebook Page ID is missing. Reconnect the Page in Settings.");
 const caption=post.also_post_to_facebook?post.instagram_caption:(post.facebook_caption||post.instagram_caption);
 let result:any;let url:string;
 if(post.add_music&&video){result=await graphPost("facebook",graphBase()+"/"+id+"/videos",new URLSearchParams({file_url:video.public_url,description:caption,access_token:token}));url=result.id?"https://www.facebook.com/"+id+"/videos/"+result.id:"https://www.facebook.com/"+id}
 else {result=await graphPost("facebook",graphBase()+"/"+id+"/photos",new URLSearchParams({url:image.public_url,caption,published:"true",access_token:token}));url=result.post_id?"https://www.facebook.com/"+result.post_id:result.id?"https://www.facebook.com/"+id+"_"+result.id:"https://www.facebook.com/"+id}
 return {remote_post_id:String(result.post_id||result.id),post_url:url};
}
async function publishLinkedIn(token:string,account:Account,post:any,image:Asset){
 if(!account.account_id)throw new Error("LinkedIn member ID is missing. Reconnect LinkedIn.");
 const rImage=await fetchRetry(image.public_url);if(!rImage.ok)throw new Error("Could not download the image for LinkedIn. Re-upload and retry.");
 const bytes=Buffer.from(await rImage.arrayBuffer());const author="urn:li:person:"+account.account_id;
 const initR=await fetchRetry("https://api.linkedin.com/rest/images?action=initializeUpload",{method:"POST",headers:{...liHeaders(token),"Content-Type":"application/json"},body:JSON.stringify({initializeUploadRequest:{owner:author}})});const init=await initR.json();
 if(!initR.ok||!init.value?.uploadUrl||!init.value?.image)throw new Error(platformError("linkedin",init,initR.status));
 const put=await fetchRetry(init.value.uploadUrl,{method:"PUT",headers:{"Content-Type":image.mime_type||"image/jpeg"},body:bytes});if(!put.ok)throw new Error("LinkedIn image upload failed ("+put.status+"). Re-upload a smaller image and retry.");
 const body={author,commentary:post.linkedin_caption||post.instagram_caption||"",visibility:"PUBLIC",distribution:{feedDistribution:"MAIN_FEED",targetEntities:[],thirdPartyDistributionChannels:[]},content:{media:{title:post.title||"PostPilot post",id:init.value.image}},lifecycleState:"PUBLISHED",isReshareDisabledByAuthor:false};
 const create=await fetchRetry("https://api.linkedin.com/rest/posts",{method:"POST",headers:{...liHeaders(token),"Content-Type":"application/json"},body:JSON.stringify(body)});const raw=await create.text();let data:any={};try{data=raw?JSON.parse(raw):{}}catch{}
 if(!create.ok)throw new Error(platformError("linkedin",data,create.status));const id=create.headers.get("x-restli-id")||data.id||"";
 return {remote_post_id:id,post_url:id?"https://www.linkedin.com/feed/update/"+id+"/":"https://www.linkedin.com/feed/"};
}
export async function publishPostById(postId:string){
 const admin=createSupabaseAdminClient();const {data:post,error:postError}=await admin.from("posts").select("*").eq("id",postId).single();
 if(postError||!post)throw new Error("Post was not found.");
 const [{data:targets,error:targetError},{data:image,error:imageError}]=await Promise.all([admin.from("post_targets").select("*").eq("post_id",postId).order("created_at",{ascending:true}),admin.from("media_assets").select("*").eq("id",post.image_asset_id).single()]);
 if(targetError)throw targetError;if(imageError||!image)throw new Error("Post image is missing from Storage.");
 let video:Asset|null=null;if(post.video_asset_id){const {data}=await admin.from("media_assets").select("*").eq("id",post.video_asset_id).single();video=data as Asset|null}
 const results:any[]=[];const success=new Set<Platform>();const order:Record<Platform,number>={instagram:0,facebook:1,linkedin:2};
 for(const target of [...(targets||[])].sort((a:any,b:any)=>order[a.platform as Platform]-order[b.platform as Platform])){
  if(target.status==="published"||target.status==="skipped")continue;const p=target.platform as Platform;
  await admin.from("post_targets").update({status:"processing",attempt_count:(target.attempt_count||0)+1,last_attempt_at:new Date().toISOString(),error_message:null}).eq("id",target.id);
  try{
   if(p==="facebook"&&post.also_post_to_facebook&&!success.has("instagram"))throw new Error("Facebook cross-post is waiting for Instagram to publish successfully. Fix Instagram and retry.");
   const {data:account,error}=await admin.from("social_accounts").select("*").eq("workspace_id",post.workspace_id).eq("platform",p).single();if(error||!account||!account.connected_at)throw new Error(label(p)+" is not connected. Connect it in Settings, then retry.");
   const token=await getToken(admin,account as Account);let result:any;
   if(p==="instagram")result=await publishInstagram(token,account as Account,post,image as Asset,video);
   else if(p==="facebook")result=await publishFacebook(token,account as Account,post,image as Asset,video);
   else result=await publishLinkedIn(token,account as Account,post,image as Asset);
   await admin.from("post_targets").update({status:"published",remote_post_id:result.remote_post_id,post_url:result.post_url,error_message:null,published_at:new Date().toISOString()}).eq("id",target.id);success.add(p);results.push({platform:p,ok:true});
  }catch(e){const message=e instanceof Error?e.message:label(p)+" publishing failed.";await admin.from("post_targets").update({status:"failed",error_message:message}).eq("id",target.id);await admin.from("social_accounts").update({last_error:message,last_checked_at:new Date().toISOString()}).eq("workspace_id",post.workspace_id).eq("platform",p);results.push({platform:p,ok:false,error:message})}
 }
 const {data:latest}=await admin.from("post_targets").select("status,platform,error_message,post_url,published_at").eq("post_id",postId);const current=latest||[];const done=current.filter((x:any)=>x.status==="published").length;const failed=current.filter((x:any)=>x.status==="failed").length;const pending=current.some((x:any)=>["queued","processing"].includes(x.status));
 let status="queued";if(!pending&&done>0&&failed===0)status="published";else if(!pending&&done>0&&failed>0)status="partial";else if(!pending&&done===0&&failed>0)status="failed";
 const checklist=Array.isArray(post.checklist)?post.checklist:[];if(post.hide_like_count&&current.some((x:any)=>x.platform==="instagram"&&x.status==="published")&&!checklist.some((x:any)=>x.id==="instagram-hide-like-count"))checklist.push({id:"instagram-hide-like-count",done:false,text:"Open Instagram → open the published post → … → Hide like count"});
 const errorMessage=failed?current.filter((x:any)=>x.status==="failed").map((x:any)=>x.platform+": "+x.error_message).join(" · ").slice(0,1000):null;
 await admin.from("posts").update({status,checklist,error_message:errorMessage,published_at:status==="published"?new Date().toISOString():post.published_at,updated_at:new Date().toISOString()}).eq("id",postId);
 return {postId,status,targets:latest||[],results};
}
