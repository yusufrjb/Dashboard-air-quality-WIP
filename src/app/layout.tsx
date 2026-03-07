"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { VisualEditsMessenger } from "orchids-visual-edits";
import Sidebar from "@/components/Sidebar";
import { useState } from "react";
import { Menu } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex h-screen overflow-hidden">
          <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
          <main className="flex-1 flex flex-col overflow-hidden bg-gray-50/50">

            {/* Mobile Header Toggle */}
            <div className="md:hidden flex items-center h-16 px-4 bg-white border-b sticky top-0 z-20">
              <button
                onClick={() => setMobileOpen(true)}
                className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <Menu size={24} />
              </button>
              <span className="ml-3 font-semibold text-lg">Dashboard</span>
            </div>

            <div className="flex-1 overflow-y-auto w-full">
              {children}
            </div>
          </main>
        </div>
        <VisualEditsMessenger />
      </body>
    </html>
  );
}
