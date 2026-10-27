"use client";
import { Download } from "lucide-react";
import { useEffect,useState } from "react";
export default function InstallButton(){
 const [promptEvent,setPromptEvent]=useState<any>(null); const [installed,setInstalled]=useState(false);
 useEffect(()=>{const onPrompt=(e:Event)=>{e.preventDefault();setPromptEvent(e)};const onInstalled=()=>{setInstalled(true);setPromptEvent(null)};window.addEventListener("beforeinstallprompt",onPrompt);window.addEventListener("appinstalled",onInstalled);return()=>{window.removeEventListener("beforeinstallprompt",onPrompt);window.removeEventListener("appinstalled",onInstalled)};},[]);
 if(installed||!promptEvent)return null;
 return <button className="btn btn-outline" onClick={async()=>{await promptEvent.prompt();setPromptEvent(null)}}><Download size={15}/> Install app</button>;
}
