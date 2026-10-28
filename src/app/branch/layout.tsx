
"use client"

import { BranchSidebar } from "@/components/layout/branch-sidebar"
import { StudentTopNav as BranchTopNav } from "@/components/layout/student-top-nav"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"

export default function BranchLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isVerifying, setIsVerifying] = useState(true)

  const isLoginPage = pathname === "/branch/login"

  useEffect(() => {
    // If it's the login page, we don't need to verify the session
    if (isLoginPage) {
      setIsVerifying(false)
      return
    }

    // Check for existing branch session
    const session = localStorage.getItem('branch_session')
    if (!session) {
      // Small timeout to allow potential async localStorage writes to settle
      const timeout = setTimeout(() => {
        const retrySession = localStorage.getItem('branch_session')
        if (!retrySession) {
          router.push("/branch/login")
        } else {
          setIsVerifying(false)
        }
      }, 100)
      return () => clearTimeout(timeout)
    } else {
      setIsVerifying(false)
    }
  }, [pathname, isLoginPage, router])

  if (isVerifying && !isLoginPage) {
    return (
      <div className="min-h-screen flex bg-white overflow-x-hidden">
        {/* Sidebar Skeleton */}
        <div className="hidden lg:block w-[300px] h-screen bg-white border-r border-zinc-100 p-6 space-y-8">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-6 w-32 rounded-lg" />
          </div>
          <div className="space-y-4 pt-10">
            {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-2xl" />)}
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header Skeleton */}
          <div className="h-20 bg-white border-b border-zinc-50 px-8 flex items-center justify-between">
            <Skeleton className="h-10 w-48 rounded-2xl" />
            <Skeleton className="h-10 w-64 rounded-full hidden md:block" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-10 w-32 rounded-full" />
            </div>
          </div>

          <div className="p-8 space-y-8 overflow-hidden">
            <Skeleton className="h-48 w-full rounded-[40px]" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Skeleton className="h-32 rounded-[32px]" />
              <Skeleton className="h-32 rounded-[32px]" />
              <Skeleton className="h-32 rounded-[32px]" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // If on login page, just render children (login card)
  if (isLoginPage) return <>{children}</>

  // Render the full Dashboard layout
  return (
    <div className="min-h-screen bg-white flex overflow-x-hidden">
      <BranchSidebar />
      <div className="lg:pl-[300px] flex flex-col flex-1 min-w-0 overflow-x-hidden">
        <BranchTopNav />
        <div className="flex-1 w-full overflow-x-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}
