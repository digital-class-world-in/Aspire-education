
"use client"

import { useState, useEffect, useMemo } from "react"
import {
  LayoutDashboard,
  UserCheck,
  Clock,
  CalendarDays,
  Video,
  FileText,
  GraduationCap,
  Library,
  Award,
  CreditCard,
  Megaphone,
  Settings,
  LogOut,
  Briefcase,
  Layers,
  Wallet,
  ShieldCheck,
  Package,
  Users,
  ChevronDown,
  ClipboardList,
  FileVideo,
  Receipt,
  BellRing,
  Settings2,
  Database,
  Search,
  Lock,
  Globe,
  Trash2,
  Monitor,
  Info,
  Newspaper,
  LayoutGrid,
  MapPin,
  UserPlus,
  Printer,
  AlertCircle,
  Mail,
  TrendingUp,
  Camera,
  ScanFace
} from "lucide-react"
import { cn } from "@/lib/utils"
import { usePathname, useRouter } from "next/navigation"
import { useFirebase, useTranslation } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { useResolvedId } from "@/hooks/use-resolved-id"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import Image from "next/image"

interface SubItem {
  id: string
  nameKey: string
  href: string
  icon: any
}

interface MenuItem {
  id: string
  nameKey: string
  href?: string
  icon: any
  color?: string
  subItems?: SubItem[]
}

export const staffMenuConfig: MenuItem[] = [
  { id: 'dashboard', nameKey: 'dashboard', href: '/staff/dashboard', icon: LayoutGrid, color: "text-blue-500" },
  { id: 'leave_request_hr', nameKey: 'Apply For Leave', href: '/staff/leave', icon: CalendarDays, color: "text-rose-500" },
  {
    id: 'website_mgmt',
    nameKey: 'website_mgmt',
    icon: Globe,
    color: "text-emerald-500",
    subItems: [
      { id: 'homepage_setup', nameKey: 'homepage_setup', href: '/staff/website-management', icon: Monitor },
      { id: 'about_us', nameKey: 'about_us', href: '/staff/website-management/about-us', icon: Info },
      { id: 'blog_seo', nameKey: 'blog_seo', href: '/staff/website-management/blog-seo', icon: Newspaper },
      { id: 'courses_setup', nameKey: 'courses_setup', href: '/staff/website-management/courses', icon: GraduationCap },
      { id: 'website_inquiry', nameKey: 'website_inquiry', href: '/staff/website-management/inquiry', icon: Search },
      { id: 'contact_seo', nameKey: 'contact_seo', href: '/staff/website-management/contact', icon: MapPin },
    ]
  },
  { id: 'batch_management', nameKey: 'My Batches', href: '/staff/batches', icon: Layers, color: "text-indigo-500" },
  { id: 'live_classes', nameKey: 'Online classes', href: '/staff/live-classes', icon: Video, color: "text-rose-500" },
  {
    id: 'front_office',
    nameKey: 'front_office',
    icon: ClipboardList,
    color: "text-amber-500",
    subItems: [
      { id: 'admission_enquiry', nameKey: 'admission_enquiry', href: '/staff/admission-enquiry', icon: Search },
      { id: 'visitor_books', nameKey: 'visitor_books', href: '/staff/visitors', icon: UserCheck },
      { id: 'phone_calls_logs', nameKey: 'phone_calls_logs', href: '/staff/calls', icon: Clock },
      { id: 'complains', nameKey: 'complains', href: '/staff/complains', icon: AlertCircle },
      { id: 'postal_service', nameKey: 'postal_service', href: '/staff/postal', icon: Mail },
    ]
  },
  {
    id: 'student_info',
    nameKey: 'Student Information',
    icon: GraduationCap,
    color: "text-teal-500",
    subItems: [
      { id: 'student_admission', nameKey: 'student_admission', href: '/staff/students', icon: GraduationCap },
      { id: 'leave_request_student', nameKey: 'Apply For Leave', href: '/staff/student-leave', icon: CalendarDays },
      { id: 'document_management', nameKey: 'document_management', href: '/staff/documents', icon: FileText },
      { id: 'student_id_cards', nameKey: 'student_id_cards', href: '/staff/student-id', icon: CreditCard },
    ]
  },
  { id: 'fees_collections', nameKey: 'fees_collections', href: '/staff/fees', icon: CreditCard, color: "text-emerald-600" },
  {
    id: 'attendance',
    nameKey: 'attendance',
    icon: UserCheck,
    color: "text-green-500",
    subItems: [
      { id: 'daily_attendance', nameKey: 'daily_attendance', href: '/staff/attendance', icon: UserCheck },
      { id: 'transaction_logs', nameKey: 'Transaction Logs', href: '/staff/attendance/transaction-logs', icon: ClipboardList },
      { id: 'face_attendance', nameKey: 'Face Attendance', href: '/face-attendance?panel=staff', icon: ScanFace },
    ]
  },
  {
    id: 'examination',
    nameKey: 'examination',
    icon: FileText,
    color: "text-blue-600",
    subItems: [
      { id: 'online_exam', nameKey: 'online_exam', href: '/staff/exams-online', icon: Monitor },
      { id: 'offline_exam', nameKey: 'offline_exam', href: '/staff/exams-offline', icon: Printer },
    ]
  },
  { id: 'marksheet', nameKey: 'marksheet', href: '/staff/marksheet', icon: FileText, color: "text-indigo-600" },
  { id: 'e_content', nameKey: 'e_content', href: '/staff/e-content', icon: FileVideo, color: "text-rose-600" },
  { id: 'library_management', nameKey: 'library_management', href: '/staff/library', icon: Library, color: "text-purple-600" },
  { id: 'inventory', nameKey: 'inventory', href: '/staff/inventory', icon: Package, color: "text-amber-600" },
  {
    id: 'hr',
    nameKey: 'human_resources',
    icon: Users,
    color: "text-blue-500",
    subItems: [
      { id: 'employee_directory', nameKey: 'employee_directory', href: '/staff/staff-directory', icon: Users },
      { id: 'employee_id_cards', nameKey: 'Employee Id Cards', href: '/staff/id-cards', icon: CreditCard },
      { id: 'staff_attendance', nameKey: 'staff_attendance', href: '/staff/staff-attendance', icon: Clock },
      { id: 'staff_face_scanner', nameKey: 'Staff Face Scanner', href: '/face-attendance?panel=staff', icon: ScanFace },
      { id: 'staff_performance', nameKey: 'Staff Performance', href: '/staff/performance', icon: TrendingUp },
      { id: 'leave_request_hr', nameKey: 'leave_request', href: '/staff/leave-request', icon: CalendarDays },
      { id: 'payroll', nameKey: 'payroll', href: '/staff/salary', icon: Wallet },
    ]
  },
  { id: 'account_management', nameKey: 'account_management', href: '/staff/accounts', icon: Receipt, color: "text-zinc-600" },
  { id: 'announcement', nameKey: 'announcement', href: '/staff/notices', icon: Megaphone, color: "text-pink-500" },
  { id: 'certificates', nameKey: 'certificates', href: '/staff/certificates', icon: Award, color: "text-violet-500" },
  { id: 'notification', nameKey: 'notification', href: '/staff/notification', icon: BellRing, color: "text-amber-500" },
  { id: 'system_setting', nameKey: 'system_setting', href: '/staff/settings', icon: Settings, color: "text-zinc-500" },
  { id: 'holiday_calendar', nameKey: 'holiday_calendar', href: '/staff/holidays', icon: CalendarDays, color: "text-blue-500" },
  { id: 'logout', nameKey: 'logout', href: '#', icon: LogOut, color: "text-rose-500" },
]

export function StaffSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { database } = useFirebase()
  const { resolvedId } = useResolvedId()
  const { t } = useTranslation()

  const [profile, setProfile] = useState<any>(null)
  const [moduleAccess, setModuleAccess] = useState<Record<string, any>>({})
  const [instituteName, setInstituteName] = useState<string>("Staff Portal")
  const [logoUrl, setLogoUrl] = useState<string>("")
  const [openMenus, setOpenMenus] = useState<string[]>([])
  const [searchQuery, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  // Real-time Counts
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('staff_session') : null
    if (!sessionStr || !database || !resolvedId) return
    const session = JSON.parse(sessionStr)
    const staffId = session.staffId

    const employeeRef = ref(database, `Institutes/${resolvedId}/employees/${staffId}`)
    const unsubEmployee = onValue(employeeRef, (snapshot) => {
      const current = snapshot.val() || {}
      if (current.moduleAccess) setModuleAccess(current.moduleAccess)
    })

    // Fetch Branding (Branch or Institute)
    if (session.branchId) {
      onValue(ref(database, `Institutes/${resolvedId}/branches/${session.branchId}`), (snap) => {
        const branchData = snap.val()
        if (branchData?.logoUrl) setLogoUrl(branchData.logoUrl)
        if (branchData?.branchName) setInstituteName(branchData.branchName)
      }, { onlyOnce: true })
    }

    const unsubProfile = onValue(ref(database, `Institutes/${resolvedId}/profile`), (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setProfile(data)
        setInstituteName(prev => {
          if (prev !== "Staff Portal" && prev !== "") return prev;
          return data.instituteName || "Staff Portal";
        })
        setLogoUrl(prev => prev || data.logoUrl || process.env.NEXT_PUBLIC_LOGO_URL || "")
      }
      setIsLoading(false)
    })

    // Real-time count listeners
    const collectionsToCount = [
      { key: 'student_admission', path: 'admissions' },
      { key: 'employee_directory', path: 'employees' },
      { key: 'batch_management', path: 'batches' },
      { key: 'live_classes', path: 'live-classes' },
      { key: 'announcement', path: 'announcements' },
      { key: 'admission_enquiry', path: 'enquiries' },
      { key: 'complains', path: 'complains' }
    ]

    collectionsToCount.forEach(({ key, path }) => {
      onValue(ref(database, `Institutes/${resolvedId}/${path}`), (snapshot) => {
        setCounts(prev => ({ ...prev, [key]: Object.keys(snapshot.val() || {}).length }))
      })
    })

    return () => {
      unsubEmployee()
      unsubProfile()
    }
  }, [database, resolvedId])

  const handleLogout = () => {
    localStorage.removeItem('staff_session')
    const portal = pathname.split('/')[1]
    let redirectPath = "/login"

    if (portal === "super") redirectPath = "/super/login"
    else if (portal === "staff") redirectPath = "/staff/login"
    else if (portal === "student") redirectPath = "/student/login"
    else if (portal === "branch") redirectPath = "/branch/login"

    router.push(redirectPath)
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
    const checkAccess = (id: string, parentAccess?: any) => {
      // If it's a root level item or submodule
      const access = parentAccess ? parentAccess.submodules?.[id] : moduleAccess[id]

      if (access === true) return true
      if (typeof access === 'object' && access.enabled === true) return true
      // If parent is enabled and this is a subitem not explicitly denied
      if (parentAccess && (parentAccess === true || parentAccess.enabled === true) && access !== false) return true

      return false
    }

    let list = staffMenuConfig.filter(item => {
      if (item.id === 'dashboard' || item.id === 'logout') return true
      if (item.id === 'leave_request_hr') return true

      const access = moduleAccess[item.id]
      const isParentEnabled = checkAccess(item.id)

      if (item.subItems) {
        const hasAllowedSubItem = item.subItems.some(sub => checkAccess(sub.id, access))
        return isParentEnabled || hasAllowedSubItem
      }
      return isParentEnabled
    }).map(item => {
      if (item.subItems) {
        const access = moduleAccess[item.id]
        return {
          ...item,
          subItems: item.subItems.filter(sub => {
            // Dashboard subitems are always allowed
            if (item.id === 'dashboard') return true
            return checkAccess(sub.id, access)
          })
        }
      }
      return item
    }).filter(item => {
      if (item.subItems && item.subItems.length === 0 && !item.href) return false
      return true
    })

    if (!searchQuery) return list
    const lowerQuery = searchQuery.toLowerCase()
    return list.filter(item => {
      const matchesMain = t(item.nameKey).toLowerCase().includes(lowerQuery)
      const matchesSub = item.subItems?.some(sub => t(sub.nameKey).toLowerCase().includes(lowerQuery))
      return matchesMain || matchesSub
    })
  }, [moduleAccess, searchQuery, t])

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
            <div className="w-10 h-10 min-w-[40px] bg-zinc-50 rounded-xl flex items-center justify-center text-primary shadow-inner font-bold text-lg">
              {isLoading ? <div className="w-6 h-6 rounded-full shimmer" /> : instituteName.charAt(0).toUpperCase()}
            </div>
            <span className={cn(
              "text-lg font-medium tracking-tight text-zinc-800 font-headline truncate text-black",
              settings.capitalizeTitles && "capitalize font-medium"
            )}>
              {transformTitle(instituteName)}
            </span>
          </div>
        )}
      </div>

      <div className="px-6 pt-4 pb-2">
        <div className="relative group">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400 group-focus-within:text-primary transition-colors" />
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
            const isActive = item.href === '/staff/dashboard'
              ? pathname === '/staff/dashboard'
              : (item.href && pathname.startsWith(item.href)) || item.subItems?.some(s => {
                const [basePath] = s.href.split('?');
                return pathname === basePath;
              });

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
                    {item.subItems?.map((sub) => {
                      const subCount = counts[sub.id];
                      return (
                        <Link
                          key={sub.id}
                          href={sub.href}
                          className={cn(
                            "flex items-center py-2 pl-12 pr-4 rounded-xl text-[15px] font-medium transition-all group",
                            pathname === sub.href.split('?')[0] ? "text-primary font-medium bg-primary/5" : "text-black hover:text-primary hover:font-medium"
                          )}
                        >
                          <span className="flex-1 whitespace-nowrap">{transformTitle(t(sub.nameKey))}</span>
                          {settings.showItemCounts && subCount !== undefined && (
                            <Badge variant="secondary" className="ml-2 bg-zinc-50 text-zinc-400 border-none text-[9px] font-black">{subCount}</Badge>
                          )}
                        </Link>
                      )
                    })}
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
                  isActive ? activeStyle : item.id === 'logout' ? "text-rose-500" : "text-black hover:bg-zinc-50"
                )}
              >
                <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-primary" : item.id === 'logout' ? "text-rose-500" : (item.color || "text-zinc-400 group-hover:text-zinc-500"))} />
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
