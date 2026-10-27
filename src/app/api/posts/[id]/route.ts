import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiContext } from "@/lib/auth";
import { apiError } from "@/lib/api";
const patchSchema=z.object({scheduledFor:z.string().datetime().optional(),timezone:z.string().max(80).optional(),title:z.string().max(120).optional(),instagramCaption:z.string().max(2200).optional(),linkedinCaption:z.string().max(3000).optional(),facebookCaption:z.string().max(2200).optional()}).refine(v=>Object.keys(v).length>0);
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 try{const {workspace,admin}=await requireApiContext();const {id}=await params;const parsed=patchSchema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Invalid post update."},{status:400});
 const {data:post,error:findError}=await admin.from("posts").select("id,status").eq("id",id).eq("workspace_id",workspace.id).single();if(findError||!post)return NextResponse.json({error:"Post not found."},{status:404});if(!["draft","scheduled","queued","failed"].includes(post.status))return NextResponse.json({error:"Only draft or scheduled posts can be edited."},{status:409});
 const p=parsed.data;const update:any={updated_at:new Date().toISOString()};if(p.scheduledFor!==undefined)update.scheduled_for=p.scheduledFor;if(p.timezone!==undefined)update.timezone=p.timezone;if(p.title!==undefined)update.title=p.title;if(p.instagramCaption!==undefined)update.instagram_caption=p.instagramCaption;if(p.linkedinCaption!==undefined)update.linkedin_caption=p.linkedinCaption;if(p.facebookCaption!==undefined)update.facebook_caption=p.facebookCaption;
 if(p.scheduledFor&&new Date(p.scheduledFor).getTime()<=Date.now())return NextResponse.json({error:"Choose a future schedule time."},{status:400});
 if(p.scheduledFor)update.status="scheduled";
 const {data,error}=await admin.from("posts").update(update).eq("id",id).select("*").single();if(error)throw error;return NextResponse.json({post:data});
 }catch(e){return apiError(e,(e instanceof Error&&e.message==="UNAUTHORIZED")?401:500)}
}
export async function DELETE(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{const {workspace,admin}=await requireApiContext();const {id}=await params;const {data:post,error:findError}=await admin.from("posts").select("id,status").eq("id",id).eq("workspace_id",workspace.id).single();if(findError||!post)return NextResponse.json({error:"Post not found."},{status:404});if(!["draft","scheduled","queued","failed"].includes(post.status))return NextResponse.json({error:"Published posts cannot be deleted from PostPilot history."},{status:409});
 const {error}=await admin.from("posts").delete().eq("id",id).eq("workspace_id",workspace.id);if(error)throw error;return NextResponse.json({ok:true});
 }catch(e){return apiError(e,(e instanceof Error&&e.message==="UNAUTHORIZED")?401:500)}
}
