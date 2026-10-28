
"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Bell,
  MessageSquare,
  Calendar,
  User,
  Check,
  Trash2,
  X,
  Clock,
  Info,
  LogOut,
  Globe,
  ShieldCheck,
  Menu,
  ChevronDown,
  Headphones
} from "lucide-react"
import { format } from "date-fns"
import { useUser, useFirebase } from "@/firebase"
import { ref, onValue, off, remove, update } from "firebase/database"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { signOut } from "firebase/auth"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { studentMenu } from "./student-sidebar"
import { staffMenuConfig } from "./staff-sidebar"
import { branchMenu } from "./branch-sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { AiSupportModal } from "../support/ai-support-modal"

export function StudentTopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, auth } = useFirebase()
  const { database } = useFirebase()
  const { resolvedId, isLoading: idLoading } = useResolvedId()

  const [displayName, setDisplayName] = useState("User")
  const [instituteName, setInstituteName] = useState("")
  const [targetId, setTargetId] = useState<string | null>(null)
  const [adminUid, setAdminUid] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState("")
  const [isStaffPortal, setIsStaffPortal] = useState(false)
  const [slug, setSlug] = useState<string | null>(null)
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)


  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    setCurrentDate(format(new Date(), "EEEE dd MMMM"))
  }, [])

  useEffect(() => {
    const staffSession = localStorage.getItem('staff_session')
    if (staffSession) {
      const session = JSON.parse(staffSession)
      setDisplayName(session.name)
      setTargetId(session.staffId)
      setAdminUid(session.adminUid)
      setIsStaffPortal(true)
      return
    }

    const branchSession = localStorage.getItem('branch_session')
    if (branchSession) {
      const session = JSON.parse(branchSession)
      setDisplayName(session.name)
      setTargetId(session.branchId)
      setAdminUid(session.adminUid)
      return
    }

    const studentSession = localStorage.getItem('student_session')
    if (studentSession) {
      const session = JSON.parse(studentSession)
      setDisplayName(session.name)
      setTargetId(session.studentId)
      setAdminUid(session.adminUid)
      return
    }
  }, [])

  useEffect(() => {
    if (!database || !targetId || !adminUid) return

    const notifRef = ref(database, `Institutes/${adminUid}/notifications/${targetId}`)
    const unsub = onValue(notifRef, (snap) => {
      const data = snap.val() || {}
      setNotifications(Object.keys(data).map(k => ({ ...data[k], id: k })).reverse())
    })

    const profileRef = ref(database, `Institutes/${adminUid}/profile`)
    onValue(profileRef, (s) => {
      const p = s.val()
      if (p) {
        setSlug(p.slug)
        setCurrentPlan(p.currentPlan)
        setInstituteName(p.instituteName || "")
      }
    })

    let userPath = ""
    if (pathname.startsWith('/staff')) userPath = `Institutes/${adminUid}/employees/${targetId}`
    else if (pathname.startsWith('/branch')) userPath = `Institutes/${adminUid}/branches/${targetId}`
    else userPath = `Institutes/${adminUid}/admissions/${targetId}`

    const userRef = ref(database, userPath)
    onValue(userRef, (s) => {
      const u = s.val()
      if (u) {
        setPhotoUrl(u.photoUrl || u.photo || u.profileImage || u.studentPhoto || null)
      }
    })

    return () => {
      off(notifRef)
      off(profileRef)
      off(userRef)
    }
  }, [database, targetId, adminUid, pathname])

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications])

  const markAllRead = async () => {
    if (!database || !adminUid || !targetId) return
    const updates: any = {}
    notifications.forEach(n => {
      if (!n.read) updates[`Institutes/${adminUid}/notifications/${targetId}/${n.id}/read`] = true
    })
    await update(ref(database), updates)
  }

  const clearAll = async () => {
    if (!database || !adminUid || !targetId || !confirm("Clear all notifications?")) return
    await remove(ref(database, `Institutes/${adminUid}/notifications/${targetId}`))
  }

  const handleLogout = async () => {
    localStorage.removeItem('staff_session')
    localStorage.removeItem('branch_session')
    localStorage.removeItem('student_session')
    if (auth) await signOut(auth)

    const portal = pathname.split('/')[1]
    let redirectPath = "/login"

    if (portal === "super") redirectPath = "/super/login"
    else if (portal === "staff") redirectPath = "/staff/login"
    else if (portal === "student") redirectPath = "/student/login"
    else if (portal === "branch") redirectPath = "/branch/login"

    router.push(redirectPath)
  }

  const handleOpenWebsite = () => {
    const target = slug || adminUid
    if (target) window.open(`/sites/${target}`, '_blank')
  }

  const menuItems = useMemo(() => {
    if (pathname.startsWith('/staff')) return staffMenuConfig
    if (pathname.startsWith('/branch')) return branchMenu
    return studentMenu
  }, [pathname])

  const initial = displayName.charAt(0).toUpperCase()
  const chatHref = pathname.startsWith('/staff') ? '/staff/chat' : pathname.startsWith('/student') ? '/student/chat' : pathname.startsWith('/branch') ? '/branch/chat' : '/chat'

  return (
    <header className="h-20 bg-white border-b border-zinc-100 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 font-public-sans text-black">
      <div className="flex items-center gap-4 flex-1">
        {/* Mobile Menu Trigger */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden h-10 w-10 text-zinc-500 rounded-xl hover:bg-transparent shadow-none">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" data-sidebar="sidebar" data-mobile="true" className="p-0 w-80 border-none bg-white [&>button]:hidden">
            <SheetHeader className="h-20 px-8 flex flex-row items-center gap-3 border-b border-zinc-50 space-y-0 text-left">
              <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-primary shadow-inner font-bold overflow-hidden" style={{ color: 'hsl(var(--primary))' }}>
                {pathname.startsWith('/branch') ? (
                  <img src="https://ik.imagekit.io/gnzjd77mb/WhatsApp%20Image%202026-03-19%20at%2011.05.32.jpeg?updatedAt=1773989799436" alt="Rakesh Education" className="w-full h-full object-cover" />
                ) : photoUrl ? (
                  <img src={photoUrl} alt="User" className="w-full h-full object-cover" />
                ) : (
                  initial
                )}
              </div>
              <SheetTitle className="text-[14px] font-bold text-zinc-800">
                {displayName}
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-80px)] p-4">
              <nav className="space-y-1 pb-20">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const hasSubItems = item.subItems && item.subItems.length > 0;
                  const isOpen = openMenu === item.id;

                  if (hasSubItems) {
                    return (
                      <Collapsible key={item.id} open={isOpen} onOpenChange={(o) => setOpenMenu(o ? item.id : null)}>
                        <CollapsibleTrigger asChild>
                          <button className="w-full flex items-center gap-4 px-5 py-3 rounded-xl text-sm font-medium hover:bg-zinc-50 transition-all border-none bg-transparent">
                            <Icon className={cn("w-5 h-5", item.color || "text-zinc-400")} />
                            <span className="flex-1 text-left">{item.nameKey.replace('_', ' ')}</span>
                            <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pl-12 space-y-1 mt-1">
                          {item.subItems?.map((sub) => (
                            <Link
                              key={sub.id}
                              href={sub.href}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="block py-2 text-sm text-zinc-500 hover:text-primary font-medium"
                            >
                              {sub.nameKey.replace('_', ' ')}
                            </Link>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )
                  }

                  return (
                    <Link
                      key={item.id}
                      href={item.href || '#'}
                      onClick={(e) => {
                        if (item.id === 'logout') {
                          e.preventDefault();
                          handleLogout();
                        }
                        setIsMobileMenuOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-4 px-5 py-3 rounded-xl text-[14px] font-normal hover:bg-zinc-50 transition-all",
                        item.id === 'logout' ? "text-rose-500 hover:bg-rose-50" : "text-zinc-700"
                      )}
                    >
                      <Icon className={cn("w-5 h-5", item.color || "text-zinc-400")} />
                      <span className="">{item.nameKey.replace('_', ' ')}</span>
                    </Link>
                  )
                })}
              </nav>
            </ScrollArea>
          </SheetContent>
        </Sheet>

        <div className="hidden sm:flex flex-col px-0 py-2 min-h-[44px] items-start justify-center">
          <div className="flex flex-col">
            <span className="text-[14px] font-normal text-black truncate max-w-[300px] lg:max-w-[600px]">
              {displayName && !displayName.includes('User') ? displayName : (pathname.startsWith("/branch") ? 'Rakesh Education' : instituteName)}
            </span>
            <span className="text-[10px] font-bold text-zinc-400 mt-0.5">
              {currentDate || format(new Date(), "EEEE dd MMMM")}
            </span>
          </div>
        </div>


      </div>

      <div className="flex items-center gap-2 md:gap-6">
        <div className="flex items-center gap-1 md:gap-2">
          {/* Website Button Removed */}

          <Popover>
            <PopoverTrigger asChild>
              <button className="p-2 md:p-2.5 text-zinc-400 hover:text-primary transition-colors relative bg-transparent rounded-xl outline-none border-none shadow-none">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-rose-500 border-2 border-white rounded-full flex items-center justify-center text-[8px] font-black text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 md:w-96 p-0 border-none rounded-[32px] overflow-hidden bg-white shadow-2xl mr-4 md:mr-8 mt-4">
              <div className="bg-primary p-6 text-white flex items-center justify-between">
                <h4 className="text-xs font-black text-white">Alert Center</h4>
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







        <div className="hidden lg:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 bg-primary pl-2 pr-4 py-1.5 rounded-full shadow-lg shadow-primary/10 border-none group cursor-pointer transition-all outline-none">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary font-black text-xs shadow-sm overflow-hidden border border-white/20">
                  {pathname.startsWith('/branch') ? (
                    <img src="https://ik.imagekit.io/gnzjd77mb/WhatsApp%20Image%202026-03-19%20at%2011.05.32.jpeg?updatedAt=1773989799436" alt="Rakesh Education" className="w-full h-full object-cover" />
                  ) : photoUrl ? (
                    <img src={photoUrl} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    initial
                  )}
                </div>
                <span className="hidden md:block text-[11px] font-black text-white truncate max-w-[200px]">
                  {displayName && !displayName.includes('User') ? displayName : (pathname.startsWith('/branch') ? 'RAKESH EDUCATION' : instituteName)}
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mt-2 rounded-[24px] border-zinc-100 p-2 shadow-xl" align="end">
              <DropdownMenuItem asChild className="rounded-xl px-4 py-3 cursor-pointer focus:bg-blue-50">
                <Link href={isStaffPortal ? "/staff/profile" : "/student/profile"} className="flex items-center gap-3">
                  <User className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm font-bold text-zinc-700">My Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-2 bg-zinc-50" />
              <DropdownMenuItem onClick={handleLogout} className="rounded-xl px-4 py-3 cursor-pointer text-rose-500 focus:text-rose-500 focus:bg-rose-50">
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-bold">Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <AiSupportModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} />
      </div>
    </header>
  )
}
