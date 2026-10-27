import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiContext } from "@/lib/auth";
import { apiError } from "@/lib/api";
const schema=z.object({fileName:z.string().min(1).max(180),contentType:z.enum(["image/jpeg","image/png","audio/mpeg","video/mp4"]),size:z.number().positive().max(50*1024*1024)});
export async function POST(request:Request){
 try{
  const {workspace,admin}=await requireApiContext();const body=schema.safeParse(await request.json());if(!body.success)return NextResponse.json({error:body.error.issues[0]?.message||"Invalid upload."},{status:400});
  const {fileName,contentType,size}=body.data;const max=contentType==="audio/mpeg"?15*1024*1024:contentType==="video/mp4"?50*1024*1024:10*1024*1024;if(size>max)return NextResponse.json({error:"File exceeds the permitted size."},{status:413});
  const ext=contentType==="image/jpeg"?"jpg":contentType==="image/png"?"png":contentType==="audio/mpeg"?"mp3":"mp4";const path=`${workspace.id}/${crypto.randomUUID()}.${ext}`;
  const {data:signed,error:signError}=await admin.storage.from("post-media").createSignedUploadUrl(path);if(signError)throw signError;
  const public_url=admin.storage.from("post-media").getPublicUrl(path).data.publicUrl;
  const media_kind=contentType.startsWith("image/")?"image":contentType.startsWith("audio/")?"audio":"video";
  const {data:asset,error}=await admin.from("media_assets").insert({workspace_id:workspace.id,storage_path:path,public_url,media_kind,mime_type:contentType,size_bytes:size}).select("id,storage_path,public_url,media_kind,mime_type,size_bytes").single();if(error)throw error;
  return NextResponse.json({asset,path,token:signed.token,signedUrl:signed.signedUrl,fileName},{status:201});
 }catch(e){return apiError(e,(e instanceof Error&&e.message==="UNAUTHORIZED")?401:500)}
}
