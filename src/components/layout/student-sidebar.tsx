
"use client"

import { useState, useMemo, useEffect } from "react"
import {
  LayoutDashboard,
  User,
  Layers,
  UserCheck,
  CalendarDays,
  FileText,
  GraduationCap,
  Award,
  CreditCard,
  Megaphone,
  Bell,
  FolderOpen,
  MessageSquare,
  Star,
  LogOut,
  ChevronDown,
  Search,
  Contact,
  Video,
  Settings,
  ShieldCheck,
  Library
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useAuth, useFirebase, useTranslation } from "@/firebase"
import { signOut } from "firebase/auth"
import { ref, onValue, off } from "firebase/database"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

interface SubItem {
  id: string
  nameKey: string
  href: string
}

interface MenuItem {
  id: string
  nameKey: string
  href?: string
  icon: any
  subItems?: SubItem[]
  color?: string
}

export const studentMenu: MenuItem[] = [

  
  { id: 'dashboard', nameKey: 'dashboard', href: '/student/dashboard', icon: LayoutDashboard, color: "text-blue-500" },
  { id: 'profile', nameKey: 'My Admission', href: '/student/profile', icon: User, color: "text-indigo-500" },
  { id: 'batch', nameKey: 'My Batches', href: '/student/batch', icon: Layers, color: "text-purple-500" },
  // { id: 'live_classes', nameKey: 'live_classes', href: '/student/live-classes', icon: Video, color: "text-rose-500" },
  // {
  //   id: 'attendance',
  //   nameKey: 'My Attendance',
  //   icon: UserCheck,
  //   color: "text-emerald-500",
  //   subItems: [
  //     { id: 'face_attendance', nameKey: 'Face Attendance', href: '/student/attendance/scan' },
  //   ]
  // },
  {
    id: 'exams',
    nameKey: 'My Examination',
    icon: FileText,
    color: "text-rose-500",
    subItems: [
      { id: 'online', nameKey: 'online_exam', href: '/student/exam/online' },
      { id: 'offline', nameKey: 'offline_exam', href: '/student/exam/offline' },
    ]
  },
  { id: 'marksheet', nameKey: 'My Marksheet', href: '/student/marksheet', icon: GraduationCap, color: "text-amber-500" },
  { id: 'certificates', nameKey: 'My Certificates', href: '/student/certificates', icon: Award, color: "text-violet-500" },
  { id: 'idcard', nameKey: 'My ID Card', href: '/student/id-card', icon: Contact, color: "text-blue-600" },
  { id: 'fees', nameKey: 'My Fees', href: '/student/fees', icon: CreditCard, color: "text-emerald-600" },
  { id: 'leave', nameKey: 'Apply For Leave', href: '/student/leave', icon: UserCheck, color: "text-teal-500" },
  { id: 'holidays', nameKey: 'holiday_calendar', href: '/student/holidays', icon: CalendarDays, color: "text-sky-500" },
  { id: 'announcement', nameKey: 'announcement', href: '/student/announcements', icon: Megaphone, color: "text-pink-500" },
  
  { id: 'feedback', nameKey: 'Raise Complains', href: '/student/feedback', icon: MessageSquare, color: "text-zinc-500" },
  
  { id: 'logout', nameKey: 'logout', href: '#', icon: LogOut, color: 'text-rose-500' },
]

export function StudentSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const { database } = useFirebase()
  const { t } = useTranslation()

  const [openMenus, setOpenMenus] = useState<string[]>([])
  const [searchQuery, setSearchTerm] = useState("")
  const [profile, setProfile] = useState<any>(null)
  const [logoUrl, setLogoUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('student_session') : null
    if (!sessionStr || !database) return
    const session = JSON.parse(sessionStr)
    const adminId = session.adminUid
    const studentId = session.studentId
    // Fetch Branding (Branch or Institute)
    if (session.branchId) {
      onValue(ref(database, `Institutes/${adminId}/branches/${session.branchId}`), (snap) => {
        const branchData = snap.val()
        if (branchData?.logoUrl) setLogoUrl(branchData.logoUrl)
      }, { onlyOnce: true })
    }

    onValue(ref(database, `Institutes/${adminId}/profile`), (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setProfile(data)
        setLogoUrl(prev => prev || data.logoUrl || process.env.NEXT_PUBLIC_LOGO_URL || "")
      }
      setIsLoading(false)
    }, { onlyOnce: true })

    // Real-time count listeners for student portal
    const collectionsToCount = [
      { key: 'live_classes', path: `live-classes` },
      { key: 'announcement', path: `announcements` },
      { key: 'notifications', path: `notifications/${studentId}` },
      { key: 'marksheet', path: `marksheets` },
      { key: 'documents', path: `student-documents/${studentId}` }
    ]

    collectionsToCount.forEach(({ key, path }) => {
      onValue(ref(database, `Institutes/${adminId}/${path}`), (snapshot) => {
        setCounts(prev => ({ ...prev, [key]: Object.keys(snapshot.val() || {}).length }))
      })
    })
  }, [database])

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth)
      localStorage.removeItem('student_session')
      
      const portal = pathname.split('/')[1]
      let redirectPath = "/login"
      
      if (portal === "super") redirectPath = "/super/login"
      else if (portal === "staff") redirectPath = "/staff/login"
      else if (portal === "student") redirectPath = "/student/login"
      else if (portal === "branch") redirectPath = "/branch/login"
      
      router.push(redirectPath)
    }
  }

  const capitalize = (str: string) => {
    if (!str) return ""
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  const settings = profile || { capitalizeTitles: false, showItemCounts: false }

  const transformTitle = (title: string) => {
    if (!settings.capitalizeTitles) return title
    return title.split(' ').map(capitalize).join(' ')
  }

  const filteredMenu = useMemo(() => {
    if (!searchQuery) return studentMenu
    const lowerQuery = searchQuery.toLowerCase()
    return studentMenu.filter(item => {
      const matchesMain = t(item.nameKey).toLowerCase().includes(lowerQuery)
      const matchesSub = item.subItems?.some(sub => t(sub.nameKey).toLowerCase().includes(lowerQuery))
      return matchesMain || matchesSub
    })
  }, [searchQuery, t])

  const activeStyle = "bg-primary/10 text-primary rounded-2xl font-medium scale-[1.01]";

  return (
    <div className="hidden lg:flex lg:flex-col lg:w-[300px] lg:fixed lg:inset-y-0 bg-white z-50 font-public-sans border-r border-zinc-100">
      <div className="h-20 flex items-center justify-center px-8 border-b border-zinc-50">
        {logoUrl ? (
          <div className="relative w-full h-12">
            <Image src={logoUrl} alt="Logo" fill className="object-contain" priority />
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 overflow-hidden w-full">
            <div className="w-10 h-10 min-w-[40px] bg-zinc-50 rounded-xl flex items-center justify-center text-primary shadow-inner font-bold text-lg" style={{ color: 'hsl(var(--primary))' }}>
              {isLoading ? <div className="w-6 h-6 rounded-full shimmer" /> : "S"}
            </div>
            <span className={cn(
              "text-lg font-medium tracking-tight text-zinc-800 font-headline truncate text-black",
              settings.capitalizeTitles && "capitalize font-medium"
            )}>
              {transformTitle(profile?.instituteName || process.env.NEXT_PUBLIC_INSTITUTE_NAME || "Student Portal")}
            </span>
          </div>
        )}
      </div>

      <div className="px-6 pt-4 pb-2">
        <div className="relative group">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400 group-focus-within:text-primary transition-colors" style={{ color: 'hsl(var(--primary))' }} />
          <Input
            placeholder="Search Menu..."
            value={searchQuery}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 bg-zinc-50 border-none rounded-xl text-xs font-normal shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 scrollbar-thin pb-8 pt-4">
        <nav className="space-y-0.5">
          {filteredMenu.map((item) => {
            const Icon = item.icon;
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isOpen = openMenus.includes(item.id) || !!searchQuery;
            const isActive = item.href === '/student/dashboard'
              ? pathname === '/student/dashboard'
              : (item.href && pathname.startsWith(item.href)) || item.subItems?.some(s => pathname === s.href);

            if (hasSubItems) {
              return (
                <Collapsible
                  key={item.id}
                  open={isOpen}
                  onOpenChange={(o) => setOpenMenus(prev => o ? [...prev, item.id] : prev.filter(n => n !== item.id))}
                  className="w-full"
                >
                  <CollapsibleTrigger asChild>
                    <button className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[15px] font-normal transition-all",
                      isActive ? activeStyle : "text-black hover:bg-zinc-50"
                    )}>
                      <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-primary" : (item.color || "text-zinc-400"))} />
                      <span className="flex-1 text-left font-medium whitespace-nowrap">{transformTitle(t(item.nameKey))}</span>
                      <ChevronDown className={cn("w-3 h-3 transition-transform duration-300 shrink-0", isOpen && "rotate-180")} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-0.5 mt-0.5">
                    {item.subItems?.map((sub) => (
                      <Link
                        key={sub.id}
                        href={sub.href}
                        className={cn(
                          "flex items-center py-2 pl-12 pr-4 rounded-xl text-[15px] font-normal transition-all group",
                          pathname === sub.href ? "text-black font-bold bg-primary/5" : "text-black hover:text-black hover:font-bold"
                        )}
                      >
                        <span className="font-medium whitespace-nowrap">{transformTitle(t(sub.nameKey))}</span>
                      </Link>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )
            }

            const mainCount = counts[item.id];

            return (
              <button
                key={item.id}
                onClick={item.id === 'logout' ? handleLogout : () => router.push(item.href || '#')}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[15px] font-normal transition-all group",
                  isActive ? activeStyle : "text-black hover:bg-zinc-50"
                )}
              >
                <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-primary" : item.id === 'logout' ? "text-rose-500" : item.color ? item.color : "text-zinc-400 group-hover:text-zinc-500")} />
                <span className="flex-1 text-left font-medium whitespace-nowrap">{transformTitle(t(item.nameKey))}</span>
                {settings.showItemCounts && mainCount !== undefined && (
                  <Badge variant="secondary" className="ml-2 bg-zinc-50 text-zinc-400 border-none text-[9px] font-black">{mainCount}</Badge>
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
