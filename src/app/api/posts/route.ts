import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { postInputSchema } from "@/lib/validators";
import { publishPostById } from "@/lib/publishing/dispatcher";

export async function GET(){
 try{
  const {workspace,admin}=await requireApiContext();
  const {data:posts,error}=await admin.from("posts").select("*").eq("workspace_id",workspace.id).order("created_at",{ascending:false}).limit(100);if(error)throw error;
  const ids=(posts||[]).map(p=>p.id);const mediaIds=(posts||[]).map(p=>p.image_asset_id).filter(Boolean);
  const [{data:targets,error:te},{data:assets,error:ae}]=await Promise.all([
   ids.length?admin.from("post_targets").select("id,post_id,workspace_id,platform,status,remote_post_id,post_url,error_message,attempt_count,published_at").in("post_id",ids):Promise.resolve({data:[],error:null}),
   mediaIds.length?admin.from("media_assets").select("id,public_url,media_kind,mime_type,size_bytes").in("id",mediaIds):Promise.resolve({data:[],error:null})
  ]);if(te)throw te;if(ae)throw ae;
  const assetMap=new Map((assets||[]).map(a=>[a.id,a]));
  const combined=(posts||[]).map(p=>({...p,image:assetMap.get(p.image_asset_id)||null,post_targets:(targets||[]).filter(t=>t.post_id===p.id)}));
  return NextResponse.json({posts:combined});
 }catch(e){return apiError(e,(e instanceof Error&&e.message==="UNAUTHORIZED")?401:500)}
}

export async function POST(request:Request){
 try{
  const {user,workspace,admin}=await requireApiContext();const parsed=postInputSchema.safeParse(await request.json());
  if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||"Invalid post data."},{status:400});
  const input=parsed.data;const {data:image,error:imageError}=await admin.from("media_assets").select("*").eq("id",input.imageAssetId).eq("workspace_id",workspace.id).single();if(imageError||!image)return NextResponse.json({error:"Poster not found. Upload the image again."},{status:400});
  if(input.addMusic&&!input.audioAssetId)return NextResponse.json({error:"Add music is enabled; upload an MP3 first."},{status:400});
  if(input.addMusic&&!input.videoAssetId)return NextResponse.json({error:"The Reel has not been rendered. Upload an MP3 and render the Reel again."},{status:400});
  if(!input.publishNow&&(!input.scheduledFor||new Date(input.scheduledFor).getTime()<=Date.now()))return NextResponse.json({error:"Choose a future date and time."},{status:400});
  const effective=[...new Set([...input.platforms,...(input.alsoPostToFacebook?["facebook" as const]:[])])];
  const {data:accounts,error:accountsError}=await admin.from("social_accounts").select("platform,connected_at").eq("workspace_id",workspace.id).in("platform",effective);if(accountsError)throw accountsError;
  const connected=new Set((accounts||[]).filter(a=>a.connected_at).map(a=>a.platform));
  const missing=effective.filter(p=>!connected.has(p));if(missing.length)return NextResponse.json({error:"Connect "+missing.join(", ")+" in Settings before publishing."},{status:400});
  const scheduledFor=input.publishNow?null:input.scheduledFor;
  const status=input.publishNow?"queued":"scheduled";
  const {data:post,error}=await admin.from("posts").insert({
   workspace_id:workspace.id,created_by:user.id,title:input.title,image_asset_id:input.imageAssetId,audio_asset_id:input.audioAssetId||null,video_asset_id:input.videoAssetId||null,
   instagram_caption:input.instagramCaption,linkedin_caption:input.linkedinCaption,facebook_caption:input.facebookCaption,platforms:effective,
   add_music:input.addMusic,hide_like_count:input.hideLikeCount,also_post_to_facebook:input.alsoPostToFacebook,timezone:input.timezone,scheduled_for:scheduledFor,status,
   checklist:input.hideLikeCount?[{id:"instagram-hide-like-count",done:false,text:"After publishing, open Instagram → post → … → Hide like count"}]:[]
  }).select("*").single();if(error)throw error;
  const {error:targetsError}=await admin.from("post_targets").insert(effective.map(platform=>({post_id:post.id,workspace_id:workspace.id,platform,status:"queued"})));if(targetsError){await admin.from("posts").delete().eq("id",post.id);throw targetsError}
  if(input.publishNow){const result=await publishPostById(post.id, admin);return NextResponse.json({...result,message:result.status==="published"?"Published successfully.":result.status==="partial"?"Post published to some platforms. Check each platform's result.":"Publish attempt finished. Review status and reconnect accounts if needed."},{status:result.status==="published"?201:202})}
  return NextResponse.json({postId:post.id,status,message:"Post scheduled."},{status:201});
 }catch(e){return apiError(e,(e instanceof Error&&e.message==="UNAUTHORIZED")?401:500)}
}
