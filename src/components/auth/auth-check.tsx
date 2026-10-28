"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useUser, useFirebase } from "@/firebase"
import { Skeleton } from "@/components/ui/skeleton"
import { signOut } from "firebase/auth"
import { ref, onValue, get } from "firebase/database"

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/student/login",
  "/staff/login",
  "/branch/login",
  "/super/login"
]

export function AuthCheck({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading, auth } = useUser()
  const { database } = useFirebase()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
    const erpDomains = ['erp.digitalclassworld.in', 'localhost']
    const isErpDomain = erpDomains.some(d => hostname === d || hostname.includes('webstation-'))

    // Path detection
    const isStaffPath   = pathname.startsWith("/staff/")   || pathname === "/staff"
    const isBranchPath  = pathname.startsWith("/branch/")  || pathname === "/branch"
    const isStudentPath = pathname.startsWith("/student/") || pathname === "/student"
    const isSuperPath   = pathname.startsWith("/super/")   || pathname === "/super"

    // PUBLIC ACCESS NODES
    const isRootPath = pathname === "/"
    const isPublicWebsite = pathname.startsWith("/sites/") || pathname.startsWith("/business/")

    const staffSession   = typeof window !== 'undefined' ? localStorage.getItem('staff_session')   : null
    const branchSession  = typeof window !== 'undefined' ? localStorage.getItem('branch_session')  : null
    const studentSession = typeof window !== 'undefined' ? localStorage.getItem('student_session') : null
    const superSession   = typeof window !== 'undefined' ? localStorage.getItem('super_session')   : null

    // 1. Super Admin Portal
    if (isSuperPath) {
      if (!superSession && !PUBLIC_PATHS.includes(pathname)) {
        router.push("/super/login")
      }
      return
    }

    // 2. Staff Portal
    if (isStaffPath) {
      if (!staffSession && !PUBLIC_PATHS.includes(pathname)) {
        router.push("/staff/login")
      }
      return
    }

    // 3. Branch Portal
    if (isBranchPath) {
      if (!branchSession && !PUBLIC_PATHS.includes(pathname)) {
        router.push("/branch/login")
      }
      return
    }

    // 4. Student Portal
    if (isStudentPath) {
      if (!studentSession && !PUBLIC_PATHS.includes(pathname)) {
        router.push("/student/login")
      }
      return
    }

    // 5. Admin / ERP Portal + public website handling
    // Allow root "/" on non-erp domains (public landing?)
    if (!isErpDomain && isRootPath) return

    // ← FIXED: do NOT redirect to "/sites/[slug]" — use real slug or current path check
    if (!isUserLoading && !user && !PUBLIC_PATHS.includes(pathname) && !isPublicWebsite) {
      // Option A: redirect to your main/fallback institute website
      router.push(`/`)

      // Option B: (if you want to keep current behavior but fixed)
      // router.push("/sites/chemify-classes-to17")
    }

    // 6. Access Control for Deleted Nodes / Institutes
    if (user && !isUserLoading && !isPublicWebsite && !isSpecialPath(pathname)) {
      const profileRef = ref(database!, `Institutes/${user.uid}/profile`)
      onValue(profileRef, (snapshot) => {
        if (!snapshot.exists()) {
          const institutesRef = ref(database!, `Institutes`)
          get(institutesRef).then((snap) => {
            const data = snap.val() || {}
            let isFound = false

            Object.keys(data).forEach(instId => {
              const adms = data[instId].admissions || {}
              Object.values(adms).forEach((a: any) => {
                if (a.email?.toLowerCase() === user.email?.toLowerCase()) {
                  isFound = true
                }
              })
            })

            if (!isFound && !PUBLIC_PATHS.includes(pathname)) {
              signOut(auth!).then(() => router.push("/login"))
            }
          })
        }
      }, { onlyOnce: true })
    }
  }, [user, isUserLoading, pathname, router, database, auth])

  function isSpecialPath(p: string) {
    return (
      p.startsWith("/student/") || p === "/student" ||
      p.startsWith("/staff/")   || p === "/staff"   ||
      p.startsWith("/branch/")  || p === "/branch"  ||
      p.startsWith("/super/")   || p === "/super"
    )
  }

  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
  const erpDomains = ['erp.digitalclassworld.in', 'localhost']
  const isErpDomain = erpDomains.some(d => hostname === d || hostname.includes('webstation-'))
  const isPublicWebsite =
    pathname.startsWith("/sites/") ||
    pathname.startsWith("/business/") ||
    (!isErpDomain && pathname === "/")

  if (
    isUserLoading &&
    !isSpecialPath(pathname) &&
    !isPublicWebsite &&
    !PUBLIC_PATHS.includes(pathname)
  ) {
    return (
      <div className="min-h-screen flex bg-[#F8FAFC]">
        <div className="hidden lg:block w-[300px] h-screen bg-white border-r border-zinc-100 p-6 space-y-8">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-6 w-32 rounded-lg" />
          </div>
          <div className="space-y-4 pt-10">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded-md" />
                <Skeleton className="h-4 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <div className="h-20 bg-white border-b border-zinc-50 px-8 flex items-center justify-between">
            <Skeleton className="h-10 w-48 rounded-2xl" />
            <Skeleton className="h-10 w-64 rounded-full hidden md:block" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-10 w-32 rounded-full" />
            </div>
          </div>
          <div className="p-8 space-y-8">
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

  return <>{children}</>
}
