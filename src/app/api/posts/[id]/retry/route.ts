import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { publishPostById } from "@/lib/publishing/dispatcher";
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{const {workspace,admin}=await requireApiContext();const {id}=await params;const {data:post,error}=await admin.from("posts").select("id,status").eq("id",id).eq("workspace_id",workspace.id).single();if(error||!post)return NextResponse.json({error:"Post not found."},{status:404});if(!["failed","partial","queued","processing","scheduled"].includes(post.status))return NextResponse.json({error:"Only queued or failed posts can be retried."},{status:409});
 const {data:targets,error:te}=await admin.from("post_targets").select("id,status").eq("post_id",id).eq("workspace_id",workspace.id);if(te)throw te;
 const failed=(targets||[]).filter(t=>t.status==="failed"||t.status==="queued"||t.status==="processing");for(const t of failed)await admin.from("post_targets").update({status:"queued",error_message:null}).eq("id",t.id);
 await admin.from("posts").update({status:"queued",error_message:null,updated_at:new Date().toISOString()}).eq("id",id);
 const result=await publishPostById(id);return NextResponse.json({...result,message:"Retry finished. Review status per platform."});
 }catch(e){return apiError(e,(e instanceof Error&&e.message==="UNAUTHORIZED")?401:500)}
}
