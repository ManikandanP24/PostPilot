import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "PostPilot — Publish everywhere",
  description: "Create once. Schedule and publish to Instagram, Facebook and LinkedIn.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "PostPilot" },
  icons: { icon: "/icons/icon.svg" },
};
export const viewport: Viewport = { themeColor: "#0b1020", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body><PwaRegister />{children}</body></html>;
}
