"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const FaceSetup = dynamic(() => import("@/components/FaceSetup").then(mod => mod.FaceSetup), { ssr: false })

export default function HRFaceSetupPage() {
  const pathname = usePathname()
  const isPortal = pathname.startsWith('/staff') || pathname.startsWith('/student') || (pathname.startsWith('/branch') && !pathname.startsWith('/branch-management'))

  const content = (
    <main className="flex-1 p-4 md:p-8 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto">
        <FaceSetup />
      </div>
    </main>
  )

  if (isPortal) return content

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      <Sidebar />
      <div className={cn("flex flex-col flex-1 min-w-0", "lg:pl-[300px]")}>
        <TopNav />
        {content}
      </div>
    </div>
  )
}
