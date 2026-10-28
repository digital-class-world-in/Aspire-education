"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { SuperSidebar } from "@/components/super/sidebar"
import { SuperTopNav } from "@/components/super/top-nav"
import { Skeleton } from "@/components/ui/skeleton"
import { SuperSupportListener } from "@/components/super/super-support-listener"
import { cn } from "@/lib/utils"

export default function SuperLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isVerifying, setIsVerifying] = useState(true)
  const [isSidebarVisible, setIsSidebarVisible] = useState(true)

  const isLoginPage = pathname === "/super/login"

  useEffect(() => {
    const handleToggle = () => setIsSidebarVisible(prev => !prev)
    window.addEventListener('toggleSuperSidebar', handleToggle)
    return () => window.removeEventListener('toggleSuperSidebar', handleToggle)
  }, [])

  useEffect(() => {
    if (isLoginPage) {
      setIsVerifying(false)
      return
    }
    const session = localStorage.getItem('super_session')
    if (!session) {
      router.push("/super/login")
    } else {
      setIsVerifying(false)
    }
  }, [pathname, isLoginPage, router])

  if (isVerifying && !isLoginPage) {
    return (
      <div className="min-h-screen flex bg-[#F8FAFC] font-inter">
        <div className="w-[260px] h-screen bg-white border-r border-slate-200 p-8 space-y-10">
          <Skeleton className="h-10 w-full rounded-xl bg-slate-50" />
          <div className="space-y-4 pt-10">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-lg bg-slate-50" />)}
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <div className="h-16 bg-white border-b border-slate-100 px-8 flex items-center justify-between">
            <Skeleton className="h-8 w-64 rounded-lg bg-slate-50" />
            <Skeleton className="h-8 w-32 rounded-lg bg-slate-50" />
          </div>
          <div className="p-8 space-y-8">
            <Skeleton className="h-40 w-full rounded-2xl bg-slate-50" />
            <div className="grid grid-cols-3 gap-6">
              <Skeleton className="h-28 rounded-2xl bg-slate-50" />
              <Skeleton className="h-28 rounded-2xl bg-slate-50" />
              <Skeleton className="h-28 rounded-2xl bg-slate-50" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoginPage) return <div className="font-inter">{children}</div>

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex selection:bg-indigo-500/30 font-inter">
      <div className={cn(
        "transition-all duration-500 fixed inset-y-0 left-0 z-50",
        isSidebarVisible ? "translate-x-0" : "-translate-x-full"
      )}>
        <SuperSidebar />
      </div>
      <div className={cn(
        "flex flex-col flex-1 min-w-0 transition-all duration-500",
        isSidebarVisible ? "lg:pl-[260px]" : "pl-0"
      )}>
        <SuperTopNav />
        <SuperSupportListener />
        <div className="flex-1 w-full p-6 md:p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
