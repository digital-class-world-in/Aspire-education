"use client"

import { useState, useEffect, useMemo } from "react"
import {
  LayoutGrid,
  Video,
  ClipboardList,
  UserPlus,
  Wallet,
  UserCheck,
  FileText,
  FileVideo,
  Library,
  Award,
  BellRing,
  Settings,
  Settings2,
  Lock,
  CalendarDays,
  Globe,
  Trash2,
  Info,
  Monitor,
  AlertCircle,
  Mail,
  Clock,
  Newspaper,
  GraduationCap,
  Receipt,
  LogOut,
  ChevronDown,
  Layers,
  MapPin,
  Users,
  Search,
  CreditCard,
  Database,
  Printer,
  Package,
  Megaphone,
  TrendingUp,
  Store,
  MessageSquareShare,
  Camera,
  ScanFace
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useUser, useFirebase, useAuth, useTranslation } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { signOut } from "firebase/auth"
import Image from "next/image"

interface SubItem {
  id: string
  nameKey: string
  href: string
  icon: any
  color?: string
}

interface MenuItem {
  id: string
  nameKey: string
  href?: string
  icon: any
  color?: string
  subItems?: SubItem[]
}

export const sidebarMenu: MenuItem[] = [
  { id: 'dashboard', nameKey: 'dashboard', href: '/dashboard', icon: LayoutGrid, color: "text-blue-500" },
  {
    id: 'website_mgmt',
    nameKey: 'website_mgmt',
    icon: Globe,
    color: "text-emerald-500",
    subItems: [
      { id: 'homepage_setup', nameKey: 'home page Setup', href: '/website-management', icon: Monitor, color: "text-emerald-500" },
      { id: 'about_us', nameKey: 'about_us', href: '/website-management/about-us', icon: Info, color: "text-emerald-500" },
      { id: 'infra_setup', nameKey: 'facility page', href: '/website-management/infrastructure', icon: Layers, color: "text-emerald-500" },
      { id: 'courses_setup', nameKey: 'courses_setup', href: '/website-management/courses', icon: GraduationCap, color: "text-emerald-500" },
      { id: 'blog_seo', nameKey: 'Blog Page', href: '/website-management/blog-seo', icon: Newspaper, color: "text-emerald-500" },
      { id: 'website_inquiry', nameKey: 'website_inquiry', href: '/website-management/inquiry', icon: Search, color: "text-emerald-500" },
      { id: 'contact_seo', nameKey: 'contact_seo', href: '/website-management/contact', icon: MapPin, color: "text-emerald-500" },
      { id: 'terms_conditions', nameKey: 'Website Policies', href: '/website-management/terms', icon: FileText, color: "text-emerald-500" },
    ]
  },
  {
    id: 'branch_mgmt',
    nameKey: 'branch_mgmt',
    icon: MapPin,
    color: "text-purple-500",
    subItems: [
      { id: 'manage_branches', nameKey: 'manage_branches', href: '/branch-management', icon: Settings2, color: "text-purple-500" },

    ]
  },
  { id: 'batch_management', nameKey: 'batch_management', href: '/batch-management', icon: Layers, color: "text-indigo-500" },
  { id: 'live_classes', nameKey: 'live_classes', href: '/live-classes', icon: Video, color: "text-rose-500" },
  {
    id: 'front_office',
    nameKey: 'front_office',
    icon: ClipboardList,
    color: "text-amber-500",
    subItems: [
      { id: 'admission_enquiry', nameKey: 'admission_enquiry', href: '/front-office/admission-enquiry', icon: Search, color: "text-amber-500" },
      { id: 'visitor_books', nameKey: 'visitor_books', href: '/front-office/visitor-books', icon: UserCheck, color: "text-amber-500" },
      { id: 'phone_calls_logs', nameKey: 'phone_calls_logs', href: '/front-office/phone-calls-logs', icon: Clock, color: "text-amber-500" },
      { id: 'complains', nameKey: 'complains', href: '/front-office/complains', icon: AlertCircle, color: "text-amber-500" },
      { id: 'concerns', nameKey: 'concerns', href: '/front-office/concerns', icon: MessageSquareShare, color: "text-amber-500" },
      { id: 'postal_service', nameKey: 'postal_service', href: '/front-office/postal-service', icon: Mail, color: "text-amber-500" },
    ]
  },
  {
    id: 'student_info',
    nameKey: 'Student Information',
    icon: UserPlus,
    color: "text-teal-500",
    subItems: [
      { id: 'student_admission', nameKey: 'student_admission', href: '/student-information/admission', icon: GraduationCap, color: "text-teal-500" },
      { id: 'leave_request_student', nameKey: 'leave_request', href: '/student-information/leave-request', icon: CalendarDays, color: "text-teal-500" },
      { id: 'document_management', nameKey: 'document_management', href: '/student-information/document-management', icon: FileText, color: "text-teal-500" },
      { id: 'student_id_cards', nameKey: 'student_id_cards', href: '/student-information/id-cards', icon: CreditCard, color: "text-teal-500" },
      { id: 'student_login', nameKey: 'student_login', href: '/student/login', icon: Lock, color: "text-teal-500" },
    ]
  },
  { id: 'fees_collections', nameKey: 'Fees Collection', href: '/fees-collections', icon: Wallet, color: "text-emerald-600" },
  {
    id: 'attendance',
    nameKey: 'attendance',
    icon: UserCheck,
    color: "text-green-500",
    subItems: [
      { id: 'daily_attendance', nameKey: 'Daily Attendance', href: '/attendance', icon: ClipboardList, color: "text-green-500" },
      { id: 'face_records', nameKey: 'Face Attendance Records', href: '/attendance/records', icon: ScanFace, color: "text-green-500" },
      { id: 'transaction_logs', nameKey: 'Transaction Logs', href: '/attendance/transaction-logs', icon: ClipboardList, color: "text-green-500" },
      { id: 'face_scanner', nameKey: 'Face Scanner', href: '/attendance/face-scanner', icon: ScanFace, color: "text-cyan-500" },
    ]
  },
  {
    id: 'examination',
    nameKey: 'Conduct Examination',
    icon: FileText,
    color: "text-blue-600",
    subItems: [
      { id: 'online_exam', nameKey: 'online_exam', href: '/examination/online-exam', icon: Monitor, color: "text-blue-600" },
      { id: 'offline_exam', nameKey: 'offline_exam', href: '/examination/offline-exam', icon: Printer, color: "text-blue-600" },
      { id: 'offline_marks', nameKey: 'offline_marks', href: '/examination/offline-marks', icon: FileText, color: "text-blue-600" },
    ]
  },
  { id: 'marksheet', nameKey: 'Generate Marksheet', href: '/marksheet', icon: GraduationCap, color: "text-indigo-600" },
  { id: 'e_content', nameKey: 'e_content', href: '/e-content', icon: FileVideo, color: "text-rose-600" },
  { id: 'library_management', nameKey: 'library_management', href: '/library-management', icon: Library, color: "text-purple-600" },
  { id: 'inventory', nameKey: 'inventory', href: '/inventory', icon: Package, color: "text-amber-600" },
  {
    id: 'hr',
    nameKey: 'human_resources',
    icon: Users,
    color: "text-blue-500",
    subItems: [
      { id: 'employee_directory', nameKey: 'employee_directory', href: '/hr/directory', icon: Users, color: "text-blue-500" },
      { id: 'employee_id_cards', nameKey: 'Employee Id Cards', href: '/hr/id-cards', icon: CreditCard, color: "text-blue-500" },
      { id: 'staff_attendance', nameKey: 'Staff Attendance', href: '/hr/attendance', icon: UserCheck, color: "text-blue-500" },
      { id: 'staff_face_attendance', nameKey: 'Staff Face Scanner', href: '/attendance/face-scanner', icon: ScanFace, color: "text-cyan-500" },
      { id: 'staff_performance', nameKey: 'Staff Performance', href: '/hr/performance', icon: TrendingUp, color: "text-blue-500" },
      { id: 'leave_request_hr', nameKey: 'Leave Request', href: '/hr/leave', icon: CalendarDays, color: "text-blue-500" },
      { id: 'payroll', nameKey: 'Payroll', href: '/hr/payroll', icon: Wallet, color: "text-blue-500" },
      { id: 'staff_login', nameKey: 'Staff Login', href: '/staff/login', icon: Lock, color: "text-blue-500" },
    ]
  },
  { id: 'account_management', nameKey: 'Finance & Accounts', href: '/accounts', icon: Receipt, color: "text-zinc-600" },
  { id: 'announcement', nameKey: 'announcement', href: '/announcement', icon: Megaphone, color: "text-pink-500" },
  { id: 'certificates', nameKey: ' Generate Certificates', href: '/certificates', icon: Award, color: "text-violet-500" },
  { id: 'notification', nameKey: 'notification', href: '/notification', icon: BellRing, color: "text-amber-500" },
  { id: 'billing', nameKey: 'billing', href: '/billing', icon: CreditCard, color: "text-indigo-500" },
  { id: 'payment_setting', nameKey: 'payment_setting', href: '/payment-setting', icon: Settings2, color: "text-cyan-500" },
  { id: 'system_setting', nameKey: 'system_setting', href: '/system-setting', icon: Settings, color: "text-zinc-500" },
  { id: 'holiday_calendar', nameKey: 'holiday_calendar', href: '/holiday-calendar', icon: CalendarDays, color: "text-blue-500" },
  { id: 'backup', nameKey: 'backup', href: '/backup', icon: Database, color: "text-indigo-500" },
  { id: 'trash', nameKey: 'trash', href: '/trash', icon: Trash2, color: "text-rose-500" },
  { id: 'logout', nameKey: 'logout', href: '#', icon: LogOut, color: "text-rose-500" },
]

export function SidebarContent({ onNavItemClick }: { onNavItemClick?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [searchQuery, setSearchTerm] = useState("")
  const { user } = useUser()
  const { database } = useFirebase()
  const auth = useAuth()
  const { t } = useTranslation()

  const [profile, setProfile] = useState<any>(null)
  const [moduleAccess, setModuleAccess] = useState<Record<string, any>>({})
  const [paidFeatures, setPaidFeatures] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!database || !user?.uid) return
    const rootPath = `Institutes/${user.uid}`

    onValue(ref(database, `${rootPath}/profile`), (snapshot) => {
      if (snapshot.exists()) setProfile(snapshot.val())
    })

    onValue(ref(database, `${rootPath}/moduleAccess`), (snapshot) => {
      setModuleAccess(snapshot.val() || {})
      setIsLoading(false)
    })

    onValue(ref(database, `${rootPath}/paidFeatures`), (snapshot) => {
      setPaidFeatures(snapshot.val() || {})
    })

    const collectionsToCount = [
      { key: 'student_admission', path: 'admissions' },
      { key: 'employee_directory', path: 'employees' },
      { key: 'manage_branches', path: 'branches' },
      { key: 'batch_management', path: 'batches' },
      { key: 'live_classes', path: 'live-classes' },
      { key: 'announcement', path: 'announcements' },
      { key: 'admission_enquiry', path: 'enquiries' },
      { key: 'visitor_books', path: 'visitors' },
      { key: 'phone_calls_logs', path: 'call-logs' },
      { key: 'complains', path: 'complains' },
      { key: 'concerns', path: 'concerns' }
    ]

    collectionsToCount.forEach(({ key, path }) => {
      onValue(ref(database, `${rootPath}/${path}`), (snapshot) => {
        setCounts(prev => ({ ...prev, [key]: Object.keys(snapshot.val() || {}).length }))
      })
    })

  }, [database, user?.uid])

  const handleLogout = async () => {
    const portal = pathname?.split('/')[1]
    let redirectPath = "/login"

    if (portal === "super") redirectPath = "/super/login"
    else if (portal === "staff") redirectPath = "/staff/login"
    else if (portal === "student") redirectPath = "/student/login"
    else if (portal === "branch") redirectPath = "/branch/login"

    await signOut(auth);
    router.push(redirectPath);
  }

  const capitalize = (str: string) => {
    if (!str) return ""
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  const settings = profile || { capitalizeTitles: false, showItemCounts: false }

  const transformTitle = (title: any) => {
    if (!title || typeof title !== 'string') return title || ""
    if (!settings.capitalizeTitles) return title
    return title.split(' ').map(capitalize).join(' ')
  }

  const filteredMenu = useMemo(() => {
    let menu = [...sidebarMenu];

    // Inject Paid Features
    if (paidFeatures?.website_builder?.active && paidFeatures?.website_builder?.showInSidebar) {
      // Find where to inject (e.g., after Website Management or at the end)
      const websiteMgmtIndex = menu.findIndex(i => i.id === 'website_mgmt');
      const builderItem = {
        id: 'paid_website_builder',
        nameKey: 'AI Website Builder',
        href: '/website-builder',
        icon: Globe,
        color: "text-violet-500",
        badge: "PRO"
      };

      if (websiteMgmtIndex !== -1) {
        menu.splice(websiteMgmtIndex + 1, 0, builderItem);
      } else {
        menu.splice(1, 0, builderItem); // Fallback to after dashboard
      }
    }

    return menu.filter(item => {
      if (item.id === 'logout' || item.id === 'dashboard') return true
      const access = moduleAccess[item.id]
      if (access === false) return false
      if (typeof access === 'object' && access.enabled === false) return false
      if (!searchQuery) return true
      const lowerQuery = searchQuery.toLowerCase()
      const matchesMain = t(item.nameKey).toLowerCase().includes(lowerQuery)
      const matchesSub = item.subItems?.some(sub => t(sub.nameKey).toLowerCase().includes(lowerQuery))
      return matchesMain || matchesSub
    }).map(item => {
      if (item.subItems) {
        const access = moduleAccess[item.id]
        return {
          ...item,
          subItems: item.subItems.filter(sub => {
            if (typeof access === 'object' && access.submodules?.[sub.id] === false) return false
            if (!searchQuery) return true
            return t(sub.nameKey).toLowerCase().includes(searchQuery.toLowerCase())
          })
        }
      }
      return item
    });
  }, [searchQuery, moduleAccess, paidFeatures, t]);

  const activeStyle = "text-primary font-black";

  return (
    <div className="flex flex-col h-full w-full bg-white">
      <div className="bg-primary text-white shrink-0 px-6 py-5 border-0 flex items-center gap-3">
        {profile?.logoUrl && (
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
            <Image
              src={profile.logoUrl}
              alt="Logo"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
        )}
        <h2 className="text-[15px] tracking-tight font-bold line-clamp-2 leading-tight flex-1 text-left">
          {transformTitle(profile?.instituteName || process.env.NEXT_PUBLIC_INSTITUTE_NAME || "Welcome")}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-3 scrollbar-thin sidebar-vertical-scroller pb-10 pt-2">
        <nav className="space-y-3">
          {filteredMenu.map((item) => {
            const Icon = item.icon;
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isOpen = openMenu === item.nameKey || !!searchQuery;
            const isActiveParent = item.href === '/' ? pathname === '/' : (item.href && pathname === item.href);
            const isSubItemActive = item.subItems?.some(sub => {
              const [basePath] = sub.href.split('?');
              return pathname === basePath;
            });

            const currentActive = isActiveParent || isSubItemActive;
            const displayTitle = transformTitle(t(item.nameKey));

            if (hasSubItems) {
              return (
                <Collapsible key={item.nameKey} open={isOpen} onOpenChange={(o) => setOpenMenu(o ? item.nameKey : null)} className="w-full">
                  <CollapsibleTrigger asChild>
                    <button className={cn(
                      "w-full flex items-center gap-4 px-5 py-3 text-[14px] font-normal tracking-wide transition-all duration-300 bg-transparent border-0 shadow-none",
                      currentActive ? "text-primary" : "text-black hover:text-primary"
                    )}>
                      <Icon className={cn("w-6 h-6 shrink-0 transition-all", currentActive ? "text-primary scale-105" : (item.color || "text-black"))} />
                      <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis">{displayTitle}</span>
                      <ChevronDown className={cn("w-5 h-5 transition-transform shrink-0", isOpen && "rotate-180", currentActive ? "text-primary" : "text-black/40")} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-2 px-2">
                    {item.subItems?.map((sub) => {
                      const [basePath] = sub.href.split('?');
                      const isSubActive = pathname === basePath;
                      const subCount = counts[sub.id];

                      return (
                        <Link
                          key={sub.id}
                          href={sub.href}
                          onClick={onNavItemClick}
                          className={cn(
                            "flex items-center py-2.5 pl-14 pr-4 text-[14px] font-normal tracking-wide transition-all bg-transparent border-0 shadow-none",
                            isSubActive
                              ? "text-primary scale-[1.02]"
                              : "text-black hover:text-primary"
                          )}
                        >
                          <sub.icon className={cn("w-5 h-5 mr-4 shrink-0 transition-colors", isSubActive ? "text-primary" : (sub.color || "text-[#2e3192]"))} />
                          <span className="flex-1 whitespace-nowrap">{transformTitle(t(sub.nameKey))}</span>
                          {settings.showItemCounts && subCount !== undefined && (
                            <Badge variant="secondary" className="ml-2 bg-zinc-100 text-zinc-500 border-none text-[10px] font-black px-2">{subCount}</Badge>
                          )}
                        </Link>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              )
            }

            const mainCount = counts[item.id];

            return (
              <div key={item.nameKey} className="w-full">
                {item.id === 'logout' ? (
                  <button onClick={handleLogout} className="w-full flex items-center gap-4 px-5 py-3 text-[14px] font-normal tracking-wide transition-all text-rose-600 bg-transparent hover:text-rose-700 group border-0 shadow-none">
                    <Icon className="w-6 h-6 text-rose-500 shrink-0 transition-transform group-hover:-translate-x-1" />
                    <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis">Logout</span>
                  </button>
                ) : (
                  <Link
                    href={item.href || '#'}
                    onClick={onNavItemClick}
                    className={cn(
                      "w-full flex items-center gap-4 px-5 py-3 text-[14px] font-normal tracking-wide transition-all duration-300 bg-transparent border-0 shadow-none",
                      isActiveParent ? "text-primary" : "text-[#2e3192] hover:text-primary"
                    )}
                  >
                    <Icon className={cn("w-6 h-6 shrink-0 transition-all", isActiveParent ? "text-primary scale-105" : (item.color || "text-black"))} />
                    <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis">{displayTitle}</span>
                    {settings.showItemCounts && mainCount !== undefined && (
                      <Badge variant="secondary" className={cn("ml-2 bg-zinc-100 border-none text-[9px] font-black px-2", isActiveParent ? "bg-primary text-white" : "text-black")}>{mainCount}</Badge>
                    )}
                  </Link>
                )}
              </div>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
