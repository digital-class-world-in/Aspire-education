"use client"

import { useState, useEffect, useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  MessageSquare,
  Bell,
  Calendar,
  Globe,
  User,
  LogOut,
  Check,
  Trash2,
  Clock,
  Info,
  CalendarDays,
  CreditCard,
  AlertCircle,
  Zap,
  ShieldCheck,
  Menu,
  X,
  ChevronDown,
  Ticket,
  Headphones
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off, remove, update } from "firebase/database"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { signOut } from "firebase/auth"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { SidebarContent } from "./sidebar-content"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { AiSupportModal } from "../support/ai-support-modal"


export function TopNav({ className }: { className?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, auth, database } = useFirebase()
  const { resolvedId, branchId, isBranch, isLoading: idLoading } = useResolvedId()

  const [profile, setProfile] = useState<any>(null)
  const [branchProfile, setBranchProfile] = useState<any>(null)
  const [currentDate, setCurrentDate] = useState<string>("")
  const [notifications, setNotifications] = useState<any[]>([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)


  useEffect(() => {
    setCurrentDate(format(new Date(), "dd MMMM yyyy"))
  }, [])

  useEffect(() => {
    if (!database || !resolvedId) return

    const profileRef = ref(database, `Institutes/${resolvedId}/profile`)
    const unsubProfile = onValue(profileRef, (snapshot) => {
      const data = snapshot.val()
      if (data) setProfile(data)
    })

    let unsubBranch: (() => void) | null = null
    if (isBranch && branchId) {
      const branchRef = ref(database, `Institutes/${resolvedId}/branches/${branchId}`)
      unsubBranch = onValue(branchRef, (snap) => {
        if (snap.exists()) setBranchProfile(snap.val())
      })
    }

    const notifRef = ref(database, `Institutes/${resolvedId}/notifications/admin`)
    const unsubNotif = onValue(notifRef, (snapshot) => {
      const data = snapshot.val() || {}
      setNotifications(Object.keys(data).map(k => ({ ...data[k], id: k })).reverse())
    })

    return () => {
      off(profileRef)
      if (unsubBranch) off(ref(database, `Institutes/${resolvedId}/branches/${branchId}`))
      off(notifRef)
    }
  }, [database, resolvedId, isBranch, branchId])

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications])

  const markAllRead = async () => {
    if (!database || !resolvedId) return
    const updates: any = {}
    notifications.forEach(n => {
      if (!n.read) updates[`Institutes/${resolvedId}/notifications/admin/${n.id}/read`] = true
    })
    await update(ref(database), updates)
  }

  const clearAll = async () => {
    if (!database || !resolvedId || !confirm("Clear all notifications?")) return
    await remove(ref(database, `Institutes/${resolvedId}/notifications/admin`))
  }

  const handleLogout = async () => {
    if (!auth) return;

    const portal = pathname?.split('/')[1]?.toLowerCase().trim();

    let redirectPath = "/login";

    if (portal === "admin") {
      redirectPath = "/admin/login";
    } else if (portal === "super") {
      redirectPath = "/super/login";
    } else if (portal === "staff") {
      redirectPath = "/staff/login";
    } else if (portal === "student") {
      redirectPath = "/student/login";
    } else if (portal === "branch") {
      redirectPath = "/branch/login";
    }

    try {
      localStorage.removeItem('support_active_session')
      await signOut(auth);
      router.push(redirectPath);
    } catch (error) {
      console.error("Logout error:", error);
      router.push(redirectPath);
    }
  };

  const handleOpenWebsite = () => {
    const target = profile?.slug || resolvedId;
    if (target) {
      window.open(`/`, '_blank');
    }
  };

  const instituteName = isBranch && branchProfile?.branchName
    ? `${branchProfile.branchName}`
    : profile?.instituteName || process.env.NEXT_PUBLIC_INSTITUTE_NAME || "Management Portal"

  const firstWord = (typeof instituteName === 'string' ? instituteName : "").split(' ')[0]
  const initial = firstWord.charAt(0).toUpperCase()

  const isPortal = (pathname.startsWith('/branch') && !pathname.startsWith('/branch-management')) || pathname.startsWith('/staff') || (pathname.startsWith('/student') && !pathname.startsWith('/student-information'))
  if (isPortal) return null

  return (
    <header
      className={cn(
        "h-16 lg:h-20 bg-white border-b border-zinc-100 px-3 lg:px-8 flex items-center justify-between sticky top-0 z-40 font-public-sans print:hidden shadow-sm lg:shadow-none transition-colors",
        className
      )}
    >
      <div className="flex items-center gap-1 lg:gap-4">
        {/* Mobile Menu Trigger */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-12 w-12 text-black hover:bg-zinc-100 rounded-full border-none transition-all active:scale-95"
            >
              <Menu className="w-7 h-7" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" data-sidebar="sidebar" data-mobile="true" className="!p-0 !m-0 !rounded-none !border-none bg-white flex flex-col !top-0 !bottom-0 !inset-y-0 !left-0 !h-[100dvh] w-[74vw] max-w-[320px] font-public-sans fixed [&>button]:hidden">
            <SidebarContent onNavItemClick={() => setIsMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex flex-col px-1 lg:px-0 py-2 min-h-[44px] items-start justify-center w-full max-w-[220px] sm:max-w-[300px] lg:max-w-[600px]">
          <span className="text-[18px] lg:text-[17px] font-public-sans text-black tracking-tight lg:tracking-widest capitalize lg:uppercase line-clamp-2 leading-tight">
            {instituteName}
          </span>
          <div className="hidden lg:block mt-0.5">
            {currentDate ? (
              <span className="text-[10px] font-bold text-zinc-400">
                {currentDate}
              </span>
            ) : (
              <Skeleton className="h-3 w-32 bg-zinc-100 mt-1" />
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 md:gap-4">
        <div className="flex items-center gap-2 md:gap-3">
          {/* Website Button - Desktop Only */}

          <Popover>
            <PopoverTrigger asChild>
              <button className="p-2.5 md:p-3 text-zinc-500 lg:text-amber-500 relative hover:bg-zinc-100 lg:hover:text-amber-600 transition-all lg:bg-amber-50 rounded-full lg:rounded-2xl group border-none outline-none shadow-none lg:shadow-sm">
                <Bell className="w-6 h-6 lg:w-7 lg:h-7 group-hover:scale-110 transition-transform" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 lg:-top-1 lg:-right-1 w-5 h-5 lg:w-6 lg:h-6 bg-rose-500 lg:bg-primary border-2 lg:border-4 border-white rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm lg:shadow-md">
                    {unreadCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[90vw] md:w-96 p-0 border-none rounded-2xl lg:rounded-[32px] overflow-hidden bg-white shadow-2xl mr-2 lg:mr-8 mt-2 lg:mt-4">
              <div className="bg-primary p-6 text-white flex items-center justify-between" style={{ backgroundColor: 'hsl(var(--primary))' }}>
                <div className="flex items-center gap-3">
                  <Bell className="w-3 h-3" />
                  <h4 className="text-xs font-black text-white">Notifications</h4>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={markAllRead} className="p-1 hover:bg-white/10 rounded border-none bg-transparent text-white"><Check className="w-4 h-4" /></button>
                  <button onClick={clearAll} className="p-1 hover:bg-white/10 rounded border-none bg-transparent text-white"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <ScrollArea className="h-[350px]">
                {notifications.length > 0 ? (
                  <div className="divide-y divide-zinc-50">
                    {notifications.map((n) => (
                      <div key={n.id} className={cn("p-5 flex gap-4 hover:bg-zinc-50 transition-colors", !n.read && "bg-primary/5")}>
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                          <Info className="w-4 h-4 text-zinc-400" />
                        </div>
                        <div className="space-y-1">
                          <h5 className="text-xs font-black text-zinc-800 leading-none">{n.title}</h5>
                          <p className="text-[11px] text-zinc-500 line-clamp-2">{n.message}</p>
                          <p className="text-[9px] font-bold text-zinc-300 mt-1">{n.timestamp ? format(new Date(n.timestamp), "p") : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-10 space-y-2 opacity-20">
                    <Bell className="w-8 h-8" />
                    <p className="text-xs font-black">No Alerts</p>
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsAiModalOpen(true)}
          className="h-10 w-10 lg:h-12 lg:w-12 text-zinc-500 lg:text-indigo-500 relative hover:bg-zinc-100 lg:hover:text-indigo-600 transition-all lg:bg-indigo-50 rounded-full lg:rounded-2xl group border-none outline-none shadow-none lg:shadow-sm"
        >
          <Headphones className="w-6 h-6 lg:w-7 lg:h-7 group-hover:scale-110 transition-transform" />
        </Button>



        <div className="hidden lg:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 lg:bg-zinc-50 pl-0 lg:pl-2 pr-0 lg:pr-4 py-0 lg:py-1.5 rounded-full lg:border lg:border-zinc-100 shadow-none lg:shadow-sm cursor-pointer hover:bg-white/20 lg:hover:bg-zinc-100 transition-all outline-none">
                <div className="w-11 h-11 lg:w-12 lg:h-12 rounded-full overflow-hidden flex items-center justify-center bg-white lg:bg-primary shadow-sm text-primary lg:text-white border border-zinc-200">
                  {profile?.logoUrl ? (
                    <img src={profile.logoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>
                <span className="hidden md:block text-[15px] font-black text-zinc-800 font-headline">{instituteName}</span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 mt-4 rounded-2xl lg:rounded-[32px] border-zinc-100 p-2 shadow-2xl mr-4 md:mr-8 bg-white" align="end">
              <DropdownMenuItem asChild className="rounded-2xl px-5 py-4 cursor-pointer focus:bg-primary/5 transition-all">
                <Link href="/system-setting" className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-zinc-900">{instituteName}</span>
                    <span className="text-[10px] font-black text-zinc-400">Settings</span>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-2 bg-zinc-50 mx-4" />
              <DropdownMenuItem onClick={handleLogout} className="rounded-2xl px-5 py-4 cursor-pointer text-rose-500 focus:text-rose-600 focus:bg-rose-50 transition-all group">
                <LogOut className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                <span className="text-sm font-bold ml-3">Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AiSupportModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} />
    </header>
  )
}
