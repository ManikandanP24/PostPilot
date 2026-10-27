"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
export default function ThemeToggle() {
  const [dark,setDark]=useState(false);
  useEffect(()=>{const value=localStorage.getItem("postpilot-theme"); const enabled=value==="dark"; setDark(enabled); document.documentElement.classList.toggle("dark",enabled);},[]);
  function toggle(){const next=!dark;setDark(next);document.documentElement.classList.toggle("dark",next);localStorage.setItem("postpilot-theme",next?"dark":"light");}
  return <button type="button" onClick={toggle} aria-label="Toggle theme" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">{dark?<Sun size={17}/>:<Moon size={17}/>}</button>;
}
