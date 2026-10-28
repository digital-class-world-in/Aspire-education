
"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  LayoutDashboard, 
  UserCheck, 
  Video, 
  FileText, 
  GraduationCap, 
  Library, 
  Award, 
  CreditCard, 
  Megaphone, 
  Settings, 
  LogOut, 
  Building2,
  Layers,
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
  CalendarDays,
  Search,
  MapPin,
  Globe,
  Trash2,
  Monitor,
  Info,
  Clock,
  AlertCircle,
  Mail,
  Newspaper,
  Printer,
  TrendingUp
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
import Link from "next/link"
import Image from "next/image"

interface SubItem {
  id: string
  nameKey: string
  href: string
  icon?: any
}

interface MenuItem {
  id: string
  nameKey: string
  href?: string
  icon: any
  color?: string
  subItems?: SubItem[]
}

export const branchMenu: MenuItem[] = [
  { id: 'dashboard', nameKey: 'dashboard', href: '/branch/dashboard', icon: LayoutDashboard, color: "text-blue-500" },
  { 
    id: 'website_mgmt', 
    nameKey: 'website_mgmt', 
    icon: Globe,
    color: "text-emerald-500",
    subItems: [
      { id: 'homepage_setup', nameKey: 'homepage_setup', href: '/website-management', icon: Monitor },
      { id: 'about_us', nameKey: 'about_us', href: '/website-management/about-us', icon: Info },
      { id: 'blog_seo', nameKey: 'blog_seo', href: '/website-management/blog-seo', icon: Newspaper },
      { id: 'courses_setup', nameKey: 'courses_setup', href: '/website-management/courses', icon: GraduationCap },
      { id: 'website_inquiry', nameKey: 'website_inquiry', href: '/website-management/inquiry', icon: Search },
      { id: 'contact_seo', nameKey: 'contact_seo', href: '/website-management/contact', icon: MapPin },
    ]
  },
  { id: 'live_classes', nameKey: 'live_classes', href: '/branch/live-classes', icon: Video, color: "text-rose-500" },
  { 
    id: 'front_office', 
    nameKey: 'front_office', 
    icon: ClipboardList,
    color: "text-amber-500",
    subItems: [
      { id: 'admission_enquiry', nameKey: 'admission_enquiry', href: '/branch/admission-enquiry', icon: Search },
      { id: 'visitor_books', nameKey: 'visitor_books', href: '/branch/visitors', icon: UserCheck },
      { id: 'phone_calls_logs', nameKey: 'phone_calls_logs', href: '/branch/calls', icon: Clock },
      { id: 'complains', nameKey: 'complains', href: '/branch/complains', icon: AlertCircle },
      { id: 'postal_service', nameKey: 'postal_service', href: '/branch/postal', icon: Mail },
    ]
  },
  {
    id: 'student_info',
    nameKey: 'student_info',
    icon: GraduationCap,
    color: "text-teal-500",
    subItems: [
      { id: 'student_admission', nameKey: 'student_admission', href: '/branch/students' },
      { id: 'leave_request_student', nameKey: 'leave_request', href: '/branch/student-leave' },
      { id: 'document_management', nameKey: 'document_management', href: '/branch/documents' },
      { id: 'student_id_cards', nameKey: 'student_id_cards', href: '/branch/student-id' },
    ]
  },
  { id: 'batch_management', nameKey: 'batch_management', href: '/branch/batches', icon: Layers, color: "text-indigo-500" },
  { id: 'fees_collections', nameKey: 'fees_collections', href: '/branch/fees', icon: CreditCard, color: "text-emerald-600" },
  { 
    id: 'attendance', 
    nameKey: 'attendance', 
    icon: UserCheck, 
    color: "text-green-500",
    subItems: [
      { id: 'daily_attendance', nameKey: 'daily_attendance', href: '/branch/attendance' },
      { id: 'transaction_logs', nameKey: 'Transaction Logs', href: '/branch/attendance/transaction-logs' },
      { id: 'face_attendance', nameKey: 'Face Attendance', href: '/face-attendance' },
    ]
  },
  { 
    id: 'examination', 
    nameKey: 'examination', 
    icon: FileText,
    color: "text-blue-600",
    subItems: [
      { id: 'online_exam', nameKey: 'online_exam', href: '/branch/exams-online' },
      { id: 'offline_exam', nameKey: 'offline_exam', href: '/branch/exams-offline' },
    ]
  },
  { id: 'marksheet', nameKey: 'marksheet', href: '/branch/marksheet', icon: FileText, color: "text-indigo-600" },
  { id: 'e_content', nameKey: 'e_content', href: '/branch/e-content', icon: FileVideo, color: "text-rose-600" },
  { id: 'library_management', nameKey: 'library_management', href: '/branch/library', icon: Library, color: "text-purple-600" },
  { id: 'inventory', nameKey: 'inventory', href: '/branch/inventory', icon: Package, color: "text-amber-600" },
  {
    id: 'human_resources',
    nameKey: 'human_resources',
    icon: Users,
    color: "text-blue-500",
    subItems: [
      { id: 'employee_directory', nameKey: 'employee_directory', href: '/branch/staff' },
      { id: 'staff_attendance', nameKey: 'staff_attendance', href: '/branch/staff-attendance' },
      { id: 'payroll', nameKey: 'payroll', href: '/branch/payroll' },
    ]
  },
  { id: 'account_management', nameKey: 'account_management', href: '/branch/accounts', icon: Receipt, color: "text-zinc-600" },
  { id: 'announcement', nameKey: 'announcement', href: '/branch/announcement', icon: Megaphone, color: "text-pink-500" },
  { id: 'certificates', nameKey: 'certificates', href: '/branch/certificates', icon: Award, color: "text-violet-500" },
  { id: 'notification', nameKey: 'notification', href: '/branch/notification', icon: BellRing, color: "text-amber-500" },
  { id: 'system_setting', nameKey: 'system_setting', href: '/branch/settings', icon: Settings, color: "text-zinc-500" },
  { id: 'holiday_calendar', nameKey: 'holiday_calendar', href: '/branch/calendar', icon: CalendarDays, color: "text-blue-500" },
  { id: 'logout', nameKey: 'logout', href: '#', icon: LogOut, color: "text-rose-500" },
]

export function BranchSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { database } = useFirebase()
  const { resolvedId, branchId } = useResolvedId()
  const { t } = useTranslation()
  const [moduleAccess, setModuleAccess] = useState<Record<string, boolean>>({})
  const [branchName, setBranchName] = useState<string>("")
  const [logoUrl, setLogoUrl] = useState<string>("")
  const [openMenus, setOpenMenus] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!database || !resolvedId || !branchId) return
    
    const branchRef = ref(database, `Institutes/${resolvedId}/branches/${branchId}`)
    const unsubBranch = onValue(branchRef, (snapshot) => {
      const data = snapshot.val() || {}
      if (data.permissions) setModuleAccess(data.permissions)
      if (data.branchName) setBranchName(data.branchName)
    })

    const profileRef = ref(database, `Institutes/${resolvedId}/profile`)
    const unsubProfile = onValue(profileRef, (snapshot) => {
      const data = snapshot.val()
      setLogoUrl(data?.logoUrl || process.env.NEXT_PUBLIC_LOGO_URL || "")
      setIsLoading(false)
    })

    return () => {
      unsubBranch()
      unsubProfile()
    }
  }, [database, resolvedId, branchId])

  const handleLogout = () => {
    localStorage.removeItem('branch_session')
    const portal = pathname.split('/')[1]
    let redirectPath = "/login"
    
    if (portal === "super") redirectPath = "/super/login"
    else if (portal === "staff") redirectPath = "/staff/login"
    else if (portal === "student") redirectPath = "/student/login"
    else if (portal === "branch") redirectPath = "/branch/login"
    
    router.push(redirectPath)
  }

  const filteredMenu = useMemo(() => {
    let list = branchMenu.filter(item => {
      if (item.id === 'dashboard' || item.id === 'logout') return true
      const isParentEnabled = moduleAccess[item.id] === true
      if (item.subItems) {
        const hasAllowedSubItem = item.subItems.some(sub => moduleAccess[sub.id] === true)
        return isParentEnabled || hasAllowedSubItem
      }
      return isParentEnabled
    }).map(item => {
      if (item.subItems) {
        return {
          ...item,
          subItems: item.subItems.filter(sub => moduleAccess[sub.id] === true)
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

  const activeStyle = "bg-white border border-zinc-200 text-black shadow-sm rounded-2xl font-bold";

  return (
    <div className="hidden lg:flex lg:flex-col lg:w-[280px] lg:fixed lg:inset-y-0 bg-white z-50 font-public-sans border-r border-zinc-100 print:hidden">
      <div className="h-20 flex items-center justify-center px-8 border-b border-zinc-50 relative">
        {logoUrl ? (
          <div className="relative w-full h-12">
            <Image src={logoUrl} alt="Logo" fill className="object-contain" priority />
          </div>
        ) : (
          <div className="flex items-center gap-3 overflow-hidden w-full">
            <div className="w-10 h-10 min-w-[40px] bg-zinc-50 rounded-xl flex items-center justify-center text-primary shadow-inner font-bold text-lg">
              {isLoading ? <div className="w-6 h-6 rounded-full shimmer" /> : (branchName || "B").charAt(0).toUpperCase()}
            </div>
            <span className="text-lg font-bold tracking-tight text-zinc-800 font-headline truncate uppercase text-black">
              {branchName || "Branch Portal"}
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
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-10 h-10 bg-zinc-50 border-none rounded-xl text-xs font-normal shadow-none focus-visible:ring-0" 
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 scrollbar-none pb-8 pt-4">
        <nav className="space-y-0.5">
          {filteredMenu.map((item) => {
            const Icon = item.icon;
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isOpen = openMenus.includes(item.id) || !!searchQuery;
            const isActive = item.href === '/branch/dashboard' 
              ? pathname === '/branch/dashboard' 
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
                      <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-black" : (item.color || "text-zinc-400"))} />
                      <span className="flex-1 text-left text-black font-medium whitespace-nowrap">{t(item.nameKey)}</span>
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
                          pathname === sub.href.split('?')[0] ? "text-black font-bold bg-primary/5" : "text-black hover:text-black hover:font-bold"
                        )}
                      >
                        <span className="whitespace-nowrap">{t(sub.nameKey)}</span>
                      </Link>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )
            }

            return (
              <button 
                key={item.id} 
                onClick={item.id === 'logout' ? handleLogout : () => router.push(item.href || '#')} 
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[15px] font-normal transition-all group", 
                  isActive ? activeStyle : item.id === 'logout' ? "text-rose-500" : "text-black hover:bg-zinc-50"
                )}
              >
                <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-black" : item.id === 'logout' ? "text-rose-500" : (item.color || "text-zinc-400 group-hover:text-zinc-500"))} />
                <span className="flex-1 text-left text-black font-medium whitespace-nowrap">{t(item.nameKey)}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
