"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CircleHelp, Clock3, LayoutDashboard, Plus, Send, Settings2, Zap } from "lucide-react";
import type { ReactNode } from "react";
import InstallButton from "@/components/InstallButton";
import ThemeToggle from "@/components/ThemeToggle";
const nav=[{href:"/dashboard",label:"Overview",Icon:LayoutDashboard},{href:"/dashboard/create",label:"Create post",Icon:Plus},{href:"/dashboard/calendar",label:"Calendar",Icon:CalendarDays},{href:"/dashboard/history",label:"Post history",Icon:Clock3},{href:"/dashboard/settings",label:"Settings",Icon:Settings2}];
export default function DashboardShell({children}:{children:ReactNode}){
 const path=usePathname();
 return <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 md:flex">
  <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:flex md:flex-col">
   <Link href="/dashboard" className="mb-8 flex items-center gap-3 text-xl font-extrabold tracking-tight"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-600 text-white"><Send size={18}/></span>PostPilot</Link>
   <div className="mb-6 rounded-xl border border-slate-200 p-3 dark:border-slate-700"><div className="text-xs text-slate-500">WORKSPACE</div><div className="mt-1 font-semibold">My Workspace</div><div className="text-xs text-slate-500">Social publishing</div></div>
   <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Workspace</div>
   <nav className="space-y-1">{nav.map(({href,label,Icon})=><Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${path===href?"bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300":"text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-slate-800"}`}><Icon size={17}/>{label}{label==="Create post"?<span className="ml-auto rounded bg-violet-600 px-1.5 py-0.5 text-[10px] text-white">NEW</span>:null}</Link>)}</nav>
   <div className="mt-auto rounded-xl bg-violet-50 p-4 text-sm text-violet-900 dark:bg-violet-950 dark:text-violet-100"><Zap size={17}/><div className="mt-2 font-bold">One post. Every channel.</div><p className="mt-1 text-xs opacity-75">Write once, tailor captions, and keep your publishing in sync.</p></div>
  </aside>
  <section className="min-w-0 flex-1">
   <header className="sticky top-0 z-10 flex h-[68px] items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 md:px-8">
    <div className="font-semibold text-slate-600 dark:text-slate-300">{nav.find(n=>n.href===path)?.label||"PostPilot"}</div>
    <div className="flex items-center gap-2"><InstallButton/><ThemeToggle/><Link href="/dashboard/create" className="btn btn-primary"><Plus size={15}/> Create post</Link></div>
   </header>
   <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900 md:hidden">{nav.map(({href,label,Icon})=><Link key={href} href={href} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${path===href?"bg-violet-50 text-violet-700":"text-slate-500"}`}><Icon size={14}/>{label}</Link>)}</nav>
   <main className="mx-auto w-full max-w-[1500px] p-4 md:p-8">{children}</main>
   <footer className="flex flex-wrap justify-between gap-2 border-t border-slate-200 px-6 py-4 text-xs text-slate-400 dark:border-slate-800"><span>© {new Date().getFullYear()} PostPilot</span><span>Official platform APIs · Your tokens stay server-side</span></footer>
  </section>
 </div>
}
