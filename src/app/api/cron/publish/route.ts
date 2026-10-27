import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { publishPostById } from "@/lib/publishing/dispatcher";
export const runtime="nodejs";
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;if(!secret)return NextResponse.json({error:"CRON_SECRET is not configured."},{status:503});
 if(request.headers.get("authorization")!=="Bearer "+secret)return NextResponse.json({error:"Unauthorized"},{status:401});
 const admin=createSupabaseAdminClient();const {data:claimed,error}=await admin.rpc("claim_due_posts",{batch_size:3});if(error)return NextResponse.json({error:"Could not claim due posts: "+error.message},{status:500});
 const results:any[]=[];
 for(const post of claimed||[]){try{results.push(await publishPostById(post.id))}catch(e){const message=e instanceof Error?e.message:"Scheduled publishing failed.";await admin.from("posts").update({status:"failed",error_message:message,updated_at:new Date().toISOString()}).eq("id",post.id);await admin.from("post_targets").update({status:"failed",error_message:message}).eq("post_id",post.id).eq("status","queued");results.push({postId:post.id,status:"failed",error:message})}}
 return NextResponse.json({processed:results.length,results});
}
