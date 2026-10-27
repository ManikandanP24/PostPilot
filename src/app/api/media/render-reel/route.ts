import { NextResponse } from "next/server";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { z } from "zod";
import { requireApiContext } from "@/lib/auth";
import { apiError } from "@/lib/api";
export const runtime="nodejs";
export const maxDuration=120;
const schema=z.object({imageAssetId:z.string().uuid(),audioAssetId:z.string().uuid(),duration:z.number().int().min(5).max(15)});
if(ffmpegStatic)ffmpeg.setFfmpegPath(ffmpegStatic);
async function download(url:string,filename:string){const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw new Error("Could not download a source file from Storage.");const b=Buffer.from(await r.arrayBuffer());if(b.length>30*1024*1024)throw new Error("Source media exceeds the processing limit.");await writeFile(filename,b)}
function render(input:string,audio:string,out:string,duration:number){return new Promise<void>((resolve,reject)=>{ffmpeg(input).inputOptions(["-loop 1"]).input(audio).videoFilters([{filter:"scale",options:"1080:1920:force_original_aspect_ratio=decrease"},{filter:"pad",options:"1080:1920:(ow-iw)/2:(oh-ih)/2:color=black"},{filter:"setsar",options:"1"}]).outputOptions(["-t",String(duration),"-r","30","-c:v","libx264","-pix_fmt","yuv420p","-c:a","aac","-b:a","128k","-shortest","-movflags","+faststart"]).format("mp4").on("end",()=>resolve()).on("error",reject).save(out)})}
export async function POST(request:Request){
 let dir="";
 try{
  const {workspace,admin}=await requireApiContext();const parsed=schema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||"Invalid Reel request."},{status:400});
  const {imageAssetId,audioAssetId,duration}=parsed.data;
  const [{data:image,error:ie},{data:audio,error:ae}]=await Promise.all([admin.from("media_assets").select("*").eq("id",imageAssetId).eq("workspace_id",workspace.id).single(),admin.from("media_assets").select("*").eq("id",audioAssetId).eq("workspace_id",workspace.id).single()]);
  if(ie||!image||image.media_kind!=="image")return NextResponse.json({error:"Poster image not found."},{status:404});
  if(ae||!audio||audio.media_kind!=="audio"||audio.mime_type!=="audio/mpeg")return NextResponse.json({error:"Upload an MP3 audio track first."},{status:400});
  if(image.mime_type==="image/png"&&Number(image.width)>0&&Number(image.height)>0){const ratio=Number(image.width)/Number(image.height);if(ratio<.8||ratio>1.91)return NextResponse.json({error:"Instagram Reel cover image ratio must be 4:5 to 1.91:1."},{status:400})}
  dir=await mkdtemp(path.join(tmpdir(),"postpilot-reel-"));const input=path.join(dir,"poster");const music=path.join(dir,"audio.mp3");const output=path.join(dir,"reel.mp4");
  await Promise.all([download(image.public_url,input),download(audio.public_url,music)]);await render(input,music,output,duration);
  const buffer=await readFile(output);const storagePath=`${workspace.id}/${randomUUID()}.mp4`;
  const {error:uploadError}=await admin.storage.from("post-media").upload(storagePath,buffer,{contentType:"video/mp4",upsert:false});if(uploadError)throw uploadError;
  const public_url=admin.storage.from("post-media").getPublicUrl(storagePath).data.publicUrl;
  const {data:video,error:insertError}=await admin.from("media_assets").insert({workspace_id:workspace.id,storage_path:storagePath,public_url,media_kind:"video",mime_type:"video/mp4",size_bytes:buffer.length,width:1080,height:1920}).select("id,storage_path,public_url,media_kind,mime_type,size_bytes,width,height").single();if(insertError)throw insertError;
  return NextResponse.json({video,message:"Reel rendered successfully."},{status:201});
 }catch(e){return apiError(e,(e instanceof Error&&e.message==="UNAUTHORIZED")?401:500)}finally{if(dir)await rm(dir,{recursive:true,force:true}).catch(()=>{})}
}
