import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth";
import { apiError } from "@/lib/api";
const allowed=["instagram","facebook","linkedin"];
export async function DELETE(_request:Request,{params}:{params:Promise<{platform:string}>}){
 try{const {workspace,admin}=await requireApiContext();const {platform}=await params;if(!allowed.includes(platform))return NextResponse.json({error:"Unknown social platform."},{status:404});
 const {error}=await admin.from("social_accounts").delete().eq("workspace_id",workspace.id).eq("platform",platform);if(error)throw error;return NextResponse.json({ok:true});
 }catch(e){return apiError(e,(e instanceof Error&&e.message==="UNAUTHORIZED")?401:500)}
}
