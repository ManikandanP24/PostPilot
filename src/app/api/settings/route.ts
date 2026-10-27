import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiContext } from "@/lib/auth";
import { apiError } from "@/lib/api";
const schema=z.object({name:z.string().trim().min(1).max(80),timezone:z.string().min(1).max(80)});
export async function GET(){try{const {workspace}=await requireApiContext();return NextResponse.json({workspace});}catch(e){return apiError(e,(e instanceof Error&&e.message==="UNAUTHORIZED")?401:500)}}
export async function PATCH(request:Request){try{const {workspace,admin}=await requireApiContext();const parsed=schema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||"Invalid settings."},{status:400});const {data,error}=await admin.from("workspaces").update({...parsed.data,updated_at:new Date().toISOString()}).eq("id",workspace.id).select("id,owner_id,name,timezone").single();if(error)throw error;return NextResponse.json({workspace:data});}catch(e){return apiError(e,(e instanceof Error&&e.message==="UNAUTHORIZED")?401:500)}}
