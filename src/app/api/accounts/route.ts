import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth";
import { apiError } from "@/lib/api";
export async function GET(){
 try{
  const {workspace,admin}=await requireApiContext();
  const {data,error}=await admin.from("social_accounts").select("id,platform,account_id,account_name,page_id,instagram_user_id,connected_at,token_expires_at,last_checked_at,last_error,scopes,metadata").eq("workspace_id",workspace.id);
  if(error)throw error;
  return NextResponse.json({accounts:data||[]});
 }catch(e){return apiError(e,(e instanceof Error&&e.message==="UNAUTHORIZED")?401:500)}
}
