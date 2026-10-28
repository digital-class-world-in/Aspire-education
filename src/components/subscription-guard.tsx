"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useUser, useFirebase } from "@/firebase"
import { ref, get, onValue, off } from "firebase/database"
import { Button } from "@/components/ui/button"
import { PhoneCall, Lock, Sparkles, XCircle, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const { database } = useFirebase()
  const pathname = usePathname()
  const router = useRouter()

  const [isExpired, setIsExpired] = useState(false)
  const [status, setStatus] = useState<'Active' | 'Deactivated' | 'Suspended' | 'Disabled' | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  // ────────────────────────────────────────────────
  // Domain detection (client-side)
  // ────────────────────────────────────────────────
  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : ''
  const cleanHost = hostname.split(':')[0] // remove port if any

  const isErpDomain =
    cleanHost === 'erp.digitalclassworld.in' ||
    cleanHost === 'localhost' ||
    cleanHost.endsWith('localhost') ||
    cleanHost.endsWith('.localhost')

  // Log when we are on ERP/admin domain
  useEffect(() => {
    if (isErpDomain) {
      console.log("hello - ERP / admin domain detected")
    }
  }, [isErpDomain])

  useEffect(() => {
    if (!database) {
      setIsChecking(false)
      return
    }

    // Prioritize session-based checks for Students/Staff/Branch
    const studentSession = typeof window !== 'undefined' ? localStorage.getItem('student_session') : null
    const staffSession = typeof window !== 'undefined' ? localStorage.getItem('staff_session') : null
    const branchSession = typeof window !== 'undefined' ? localStorage.getItem('branch_session') : null

    let adminUidFound = null

    if (studentSession) {
      adminUidFound = JSON.parse(studentSession)?.adminUid
    } else if (staffSession) {
      adminUidFound = JSON.parse(staffSession)?.adminUid
    } else if (branchSession) {
      adminUidFound = JSON.parse(branchSession)?.adminUid
    } else if (user) {
      adminUidFound = user.uid
    }

    if (!adminUidFound) {
      setIsChecking(false)
      return
    }

    const profileRef = ref(database, `Institutes/${adminUidFound}/profile`)

    const unsub = onValue(profileRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const expiryTime = data.planExpiryDate
          ? new Date(data.planExpiryDate).getTime()
          : new Date(data.createdAt).getTime() + 3 * 24 * 60 * 60 * 1000 // 3 days fallback

        setIsExpired(Date.now() > expiryTime)
        setStatus(data.status || 'Active')
      }
      setIsChecking(false)
    })

    return () => off(profileRef)
  }, [user, database, pathname])

  // ────────────────────────────────────────────────
  // Public / bypass pages — different per domain type
  // ────────────────────────────────────────────────
  const isErpPublicPage = [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/super/login",

  ].some(p => pathname === p || pathname.startsWith(p + '/'))

  const isSchoolPublicPage = pathname.startsWith("/sites/") || pathname.startsWith("/business/")

  // Choose which public rule to apply based on domain
  const isPublicPage = isErpDomain
    ? isErpPublicPage
    : isSchoolPublicPage

  const isBillingPage = pathname === "/billing"
  const isSuperAdminSection = pathname.startsWith("/super/")

  // Always allow super admin area
  if (isSuperAdminSection) {
    return <>{children}</>
  }

  const isRestricted = status === 'Deactivated' || status === 'Suspended' || status === 'Disabled'

  // Show block screen only if:
  // - not public page
  // - not billing
  // - subscription issue exists
  // - finished checking
  if ((isExpired || isRestricted) && !isBillingPage && !isPublicPage && !isChecking) {
    const isStudentArea = pathname.startsWith("/student")

    let title = "Session Expired"
    let message = isStudentArea
      ? "Your institutional account has expired. Please contact your administrator."
      : "Your current plan or trial has expired. Please upgrade to continue."
    let icon = <Lock className="w-12 h-12" />
    let colorClass = "bg-amber-50 text-amber-500"

    if (status === 'Deactivated') {
      title = "Node Deactivated"
      message = "Your account has been deactivated. Contact administration."
      icon = <XCircle className="w-12 h-12" />
      colorClass = "bg-rose-50 text-rose-500"
    } else if (status === 'Suspended') {
      title = "Node Suspended"
      message = "Account suspended. Please contact administration."
      icon = <ShieldAlert className="w-12 h-12" />
      colorClass = "bg-rose-50 text-rose-500"
    } else if (status === 'Disabled') {
      title = "Node Restricted"
      message = "This institutional node is restricted."
      icon = <XCircle className="w-12 h-12" />
      colorClass = "bg-rose-50 text-rose-500"
    }

    return (
      <div className="relative min-h-screen">
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-[40px] p-12 max-w-md w-full shadow-2xl text-center space-y-10 animate-in zoom-in-95 duration-500 border border-zinc-100">
            <div className={cn("w-24 h-24 rounded-3xl flex items-center justify-center mx-auto shadow-inner", colorClass)}>
              {icon}
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl font-black text-black tracking-tight font-public-sans">
                {title}
              </h2>
              <p className="text-black font-medium leading-relaxed">
                {message}
              </p>
            </div>

            {!isStudentArea && !isRestricted && (
              <div className="space-y-4 pt-4">
                <Button
                  onClick={() => router.push("/billing")}
                  className="w-full h-16 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black text-[14px] tracking-widest shadow-xl shadow-blue-900/20 transition-all active:scale-95 border-none"
                >
                  <Sparkles className="w-5 h-5 mr-2" /> Upgrade Plan Now
                </Button>
              </div>
            )}

            <div className="space-y-4 pt-4">
              <Button
                variant="outline"
                className="w-full h-16 border-zinc-100 text-black rounded-2xl font-bold tracking-widest text-[10px] transition-all hover:bg-zinc-50"
              >
                <PhoneCall className="w-4 h-4 mr-2" /> Contact Support
              </Button>
            </div>

            <div className="pt-6 border-t border-zinc-50">
              <p className="text-[9px] text-zinc-300 font-black tracking-[0.4em]">Access Compliance Protocol V2.0</p>
            </div>
          </div>
        </div>

        <div className="opacity-30 pointer-events-none blur-xl grayscale">
          {children}
        </div>
      </div>
    )
  }

  // Normal render - everything is allowed
  return <>{children}</>
}
