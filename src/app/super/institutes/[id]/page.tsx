"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  ShieldCheck, LayoutGrid, Users, Wallet, FileText, Video,
  MapPin, Globe, Database, CalendarDays,
  Trash2, Layers, Megaphone, Receipt, Settings2, BellRing, Settings,
  Award, CreditCard, ExternalLink, Loader2, Plus, Download, AlertCircle, TrendingUp, Building2, Phone, Mail, Clock, Activity, Monitor, ShieldAlert, CheckCircle2, Search, ArrowLeft, ClipboardList, UserPlus, GraduationCap, FileVideo, Library, Package, Network, ChevronRight, Eye, EyeOff, FileEdit, CreditCard as CreditCardIcon, Grid3X3, ScrollText, User, Hash, Briefcase, BookOpen, BarChart3, Zap, Shield, CircleDot, Ticket, KeyRound, Copy, Send, RefreshCw, ToggleLeft, ToggleRight, Lock, Unlock, ChevronDown, Sliders, Type, AlignLeft, ListIcon, Paintbrush2, Gem, XCircle,
  Headphones
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, update, off, get, push, set, remove } from "firebase/database"
import { format, formatDistanceToNow } from "date-fns"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { DEFAULT_DYNAMIC_FIELDS } from "@/lib/default-dynamic-fields"
import { BrandingTab } from "./branding-tab"

// ── Module Permission Groups ──
const PERMISSION_GROUPS = [
  {
    category: "Core Control",
    modules: [
      {
        id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, description: 'Main analytics & overview hub'
      },
    ]
  },
  {
    category: "Digital Assets",
    modules: [
      {
        id: 'website_mgmt', label: 'Website Manager', icon: Globe, description: 'Public website content control',
        submodules: [
          { id: 'homepage_setup', label: 'Home Page Setup' },
          { id: 'about_us', label: 'About Us' },
          { id: 'infra_setup', label: 'Facility Page' },
          { id: 'courses_setup', label: 'Courses Setup' },
          { id: 'blog_seo', label: 'Blog Page' },
          { id: 'website_inquiry', label: 'Website Inquiry' },
          { id: 'contact_seo', label: 'Contact SEO' },
          { id: 'terms_conditions', label: 'Website Policies' }
        ]
      },
      {
        id: 'branch_mgmt', label: 'Branch Management', icon: MapPin, description: 'Multi-location configuration',
        submodules: [
          { id: 'manage_branches', label: 'Manage Branches' },
          { id: 'branch_login', label: 'Branch Login' }
        ]
      },
    ]
  },
  {
    category: "Academic Node",
    modules: [
      { id: 'batch_management', label: 'Batch Management', icon: Layers, description: 'Batch creation & scheduling' },
      { id: 'live_classes', label: 'Live Classes', icon: Video, description: 'Online classroom sessions' },
      {
        id: 'front_office', label: 'Front Office', icon: ClipboardList, description: 'Enquiry & visitor management',
        submodules: [
          { id: 'admission_enquiry', label: 'Admission Enquiry' },
          { id: 'visitor_books', label: 'Visitor Books' },
          { id: 'phone_calls_logs', label: 'Phone Calls Logs' },
          { id: 'complains', label: 'Complains' },
          { id: 'concerns', label: 'Concerns' },
          { id: 'postal_service', label: 'Postal Service' }
        ]
      },
      {
        id: 'student_info', label: 'Student Info', icon: UserPlus, description: 'Admissions & student data',
        submodules: [
          { id: 'student_admission', label: 'Student Admission' },
          { id: 'leave_request_student', label: 'Leave Request' },
          { id: 'document_management', label: 'Document Management' },
          { id: 'student_id_cards', label: 'Student ID Cards' },
          { id: 'student_login', label: 'Student Login' }
        ]
      },
      { id: 'fees_collections', label: 'Fees & Collections', icon: Wallet, description: 'Fee structure & payments' },
      {
        id: 'attendance', label: 'Attendance', icon: CheckCircle2, description: 'Daily attendance tracking',
        submodules: [
          { id: 'daily_attendance', label: 'Daily Attendance' },
          { id: 'face_attendance_logs', label: 'Face Attendance Records' }
        ]
      },
      {
        id: 'examination', label: 'Examination', icon: FileText, description: 'Exam creation & grading',
        submodules: [
          { id: 'online_exam', label: 'Online Exam' },
          { id: 'offline_exam', label: 'Offline Exam' },
          { id: 'offline_marks', label: 'Offline Marks' }
        ]
      },
      { id: 'marksheet', label: 'Marksheet', icon: GraduationCap, description: 'Result & marksheet generation' },
      { id: 'e_content', label: 'E-Content', icon: FileVideo, description: 'Digital study materials' },
      { id: 'library_management', label: 'E-Library', icon: Library, description: 'Book inventory & issue tracking' },
      { id: 'inventory', label: 'Inventory', icon: Package, description: 'Asset & supply management' },
    ]
  },
  {
    category: "Human Resources",
    modules: [
      {
        id: 'hr', label: 'Human Resources', icon: Users, description: 'Staff & payroll management',
        submodules: [
          { id: 'employee_directory', label: 'Employee Directory' },
          { id: 'employee_id_cards', label: 'Employee ID Cards' },
          { id: 'staff_attendance', label: 'Staff Attendance' },
          { id: 'staff_face_attendance', label: 'Staff Face Scanner' },
          { id: 'staff_performance', label: 'Staff Performance' },
          { id: 'leave_request_hr', label: 'Leave Request' },
          { id: 'payroll', label: 'Payroll' },
          { id: 'staff_login', label: 'Staff Login' }
        ]
      },
    ]
  },
  {
    category: "Support & Assistance",
    modules: [
      { id: 'support_chat', label: 'Support & AI Chat', icon: Headphones, description: 'Live support desk & AI assistant' },
    ]
  },
  {
    category: "System Backend",
    modules: [
      { id: 'account_management', label: 'Finance & Accounts', icon: Receipt, description: 'Financial reports & ledger' },
      { id: 'announcement', label: 'Announcement', icon: Megaphone, description: 'Broadcast & notifications' },
      { id: 'certificates', label: 'Certificates', icon: Award, description: 'Certificate generation engine' },
      { id: 'notification', label: 'Notification', icon: BellRing, description: 'Push notification triggers' },
      { id: 'billing', label: 'Billing & Accounts', icon: CreditCard, description: 'Invoice & billing cycle' },
      { id: 'payment_setting', label: 'Payment Setting', icon: Settings2, description: 'Gateway & method config' },
      { id: 'system_setting', label: 'System Setting', icon: Settings, description: 'Core system preferences' },
      { id: 'holiday_calendar', label: 'Holiday Calendar', icon: CalendarDays, description: 'Holiday schedule setup' },
      { id: 'backup', label: 'Database Backup', icon: Database, description: 'Data backup & restore' },
      { id: 'trash', label: 'Trash Bin', icon: Trash2, description: 'Deleted items recovery' },
    ]
  }
]

// ── Tab definitions ──
const TABS = [
  { id: 'overview', label: 'Overview', icon: Eye },
  { id: 'details', label: 'Details', icon: FileEdit },
  { id: 'dynamic-fields', label: 'Dynamic Fields', icon: Layers },
  { id: 'domain', label: 'Domain Settings', icon: Globe },
  { id: 'payments', label: 'Payments', icon: CreditCardIcon },
  { id: 'modules', label: 'Module Matrix', icon: Grid3X3 },
  { id: 'paid-features', label: 'Paid Features', icon: Gem },
  { id: 'activity', label: 'Activity Logs', icon: ScrollText },
  { id: 'support', label: 'Support Tickets', icon: Ticket },
  { id: 'credentials', label: 'Credentials & Access', icon: KeyRound },
  { id: 'branding', label: 'Branding Control', icon: Paintbrush2 },
]

export default function InstituteDetailsPage() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { database } = useFirebase()
  const { user } = useUser()

  const [activeTab, setActiveTab] = useState('overview')
  const [institute, setInstitute] = useState<any>(null)
  const [project, setProject] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPlanSaving, setIsPlanSaving] = useState(false)

  // Modals
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isDomainModalOpen, setIsDomainModalOpen] = useState(false)
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [domainInput, setDomainInput] = useState("")
  const [domainStatus, setDomainStatus] = useState<'none' | 'pending' | 'verifying' | 'connected' | 'failed'>('none')
  const [copied, setCopied] = useState(false)

  const [targetStatus, setTargetStatus] = useState<'Deactivated' | 'Suspended' | 'Active'>('Suspended')
  const [statusReason, setStatusReason] = useState("")
  const [statusDate, setStatusDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])

  const [planDetails, setPlanDetails] = useState({
    totalPlanAmount: "", asmName: "", planType: "", activateDate: "", activateTime: "",
    expireDate: "", expireTime: "", nextRenewalDate: "", renewalAmount: "", customDomain: "", isWebsiteFirst: true
  })

  const [asms, setAsms] = useState<string[]>([])
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [instituteSupportLogs, setInstituteSupportLogs] = useState<any[]>([])

  const [realStats, setRealStats] = useState({ students: 0, branches: 0, staff: 0, collections: 0 })
  const [editData, setEditData] = useState<any>({})

  // ── Institute Limits State ──
  const [instituteLimits, setInstituteLimits] = useState({
    branchLimit: "" as string | number,
    studentLimit: "" as string | number,
    storageLimit: "" as string | number,
    storageUnit: "GB" as "MB" | "GB" | "KB",
    adminUsersLimit: "" as string | number,
    courseUploadLimit: "" as string | number,
    courseUploadUnit: "GB" as "MB" | "GB" | "KB",
  })
  const [isSavingLimits, setIsSavingLimits] = useState(false)

  const [paymentForm, setPaymentForm] = useState({
    amount: "", date: format(new Date(), "yyyy-MM-dd"), mode: "Cash", notes: ""
  })

  const [expandedModule, setExpandedModule] = useState<string | null>(null)
  const [pendingModuleAccess, setPendingModuleAccess] = useState<any>({})

  // ── Credentials State ──
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})
  const [teacherSearch, setTeacherSearch] = useState("")
  const [teacherBranchFilter, setTeacherBranchFilter] = useState("all")
  const [selectedCredentials, setSelectedCredentials] = useState<string[]>([])
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<any>(null)
  const [resetForm, setResetForm] = useState({ newPassword: "", confirmPassword: "", autoGenerate: false, sendEmail: true })
  const [isSendEmailModalOpen, setIsSendEmailModalOpen] = useState(false)
  const [emailTarget, setEmailTarget] = useState<any>(null)
  const [generatedPassword, setGeneratedPassword] = useState("")
  const [credentialActioning, setCredentialActioning] = useState<string | null>(null)
  const [branchAdmins, setBranchAdmins] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])

  // ── Details Inner Tabs State ──
  const [detailsTab, setDetailsTab] = useState<'info' | 'dynamic-fields'>('info')

  // ── Dynamic Fields State ──
  const [dynamicFields, setDynamicFields] = useState<Record<string, any>>({})
  const [selectedDynModule, setSelectedDynModule] = useState<string | null>(null)
  const [dfNewLabel, setDfNewLabel] = useState('')
  const [dfNewType, setDfNewType] = useState('text')
  const [dfNewPlaceholder, setDfNewPlaceholder] = useState('')
  const [dfNewOptions, setDfNewOptions] = useState('')
  const [dfNewRequired, setDfNewRequired] = useState(false)
  const [dfIsSubmitting, setDfIsSubmitting] = useState(false)

  // ── Paid Features State ──
  const [institutePaidFeatures, setInstitutePaidFeatures] = useState<Record<string, any>>({})
  const [isPaidFeatureSaving, setIsPaidFeatureSaving] = useState(false)

  // Initialize pending changes from institute data
  useEffect(() => {
    if (institute?.moduleAccess) {
      setPendingModuleAccess(institute.moduleAccess)
    }
  }, [institute?.moduleAccess])

  // ── Data Fetching ──
  useEffect(() => {
    if (!database || !id) return
    const rootPath = `Institutes/${id}`

    onValue(ref(database, rootPath), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        setInstitute(data)
        setEditData({ ...data.profile, id: id })

        const studentCount = data.admissions ? Object.keys(data.admissions).length : 0
        const branchCount = data.branches ? Object.keys(data.branches).length : 0
        const staffCount = data.employees ? Object.keys(data.employees).length : 0
        const feeCollected = data.fees ? Object.values(data.fees).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) : 0

        setRealStats({ students: studentCount, branches: branchCount, staff: staffCount, collections: feeCollected as number })

        if (data.profile?.planDetails) {
          setPlanDetails(prev => ({
            ...prev, ...data.profile.planDetails,
            isWebsiteFirst: data.profile.isWebsiteFirst !== undefined ? data.profile.isWebsiteFirst : true,
            totalPlanAmount: data.profile.planDetails.totalPlanAmount?.toString() || "",
            renewalAmount: data.profile.planDetails.renewalAmount?.toString() || ""
          }))
        } else {
          setPlanDetails(prev => ({
            ...prev, isWebsiteFirst: data.profile?.isWebsiteFirst !== undefined ? data.profile.isWebsiteFirst : true
          }))
        }

        if (data.profile?.customDomain) {
          setDomainInput(data.profile.customDomain)
          setDomainStatus(data.profile.domainStatus || 'none')
        }

        const aLogs = data.activityLogs ? Object.keys(data.activityLogs).map(k => ({ ...data.activityLogs[k], id: k })).reverse() : []
        setActivityLogs(aLogs)

        // Load limits
        if (data.profile?.limits) {
          const l = data.profile.limits
          setInstituteLimits({
            branchLimit: l.branchLimit ?? "",
            studentLimit: l.studentLimit ?? "",
            storageLimit: l.storageLimit ?? "",
            storageUnit: l.storageUnit || "GB",
            adminUsersLimit: l.adminUsersLimit ?? "",
            courseUploadLimit: l.courseUploadLimit ?? "",
            courseUploadUnit: l.courseUploadUnit || "GB",
          })
        }
      }
    })

    onValue(ref(database, `MasterProjects/${id}`), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        setProject(data)
        const pList = data.payments ? Object.keys(data.payments).map(k => ({ ...data.payments[k], id: k })).reverse() : []
        setPaymentHistory(pList)
      }
    })

    get(ref(database, 'MasterConfig/ASMs')).then((asmSnap) => {
      if (asmSnap.exists()) setAsms(Object.values(asmSnap.val()).map((a: any) => a.value))
    })

    onValue(ref(database, 'SupportLogs'), (snapshot) => {
      const data = snapshot.val() || {}
      const list = Object.keys(data).map(k => ({ ...data[k], id: k })).filter(l => l.instituteId === id).sort((a, b) => b.timestamp - a.timestamp)
      setInstituteSupportLogs(list)
    })

    // ── Fetch Branches & Branch Admins ──
    onValue(ref(database, `Institutes/${id}/branches`), (snap) => {
      if (snap.exists()) {
        const data = snap.val()
        const list = Object.keys(data).map(k => ({ id: k, ...data[k] }))
        setBranchAdmins(list)
      } else {
        setBranchAdmins([])
      }
    })

    // ── Fetch Employees (Teachers) ──
    onValue(ref(database, `Institutes/${id}/employees`), (snap) => {
      if (snap.exists()) {
        const data = snap.val()
        const list = Object.keys(data).map(k => ({ id: k, ...data[k] }))
        setTeachers(list)
      } else {
        setTeachers([])
      }
    })

    // ── Fetch Dynamic Fields ──
    onValue(ref(database, `Institutes/${id}/dynamicFields`), (snap) => {
      setDynamicFields(snap.val() || {})
    })

    // ── Fetch Paid Features ──
    onValue(ref(database, `Institutes/${id}/paidFeatures`), (snap) => {
      setInstitutePaidFeatures(snap.val() || {})
    })

    setIsLoading(false)
    return () => {
      off(ref(database, rootPath))
      off(ref(database, `MasterProjects/${id}`))
      off(ref(database, `Institutes/${id}/branches`))
      off(ref(database, `Institutes/${id}/employees`))
      off(ref(database, `Institutes/${id}/dynamicFields`))
    }
  }, [database, id])

  // ── Actions ──
  const logActivity = async (action: string, description: string) => {
    if (!database || !id) return
    const logRef = ref(database, `Institutes/${id}/activityLogs`)
    await push(logRef, {
      action, user: user?.email || "Super Admin", description,
      date: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"), timestamp: Date.now()
    })
  }

  const handleSaveDetails = async () => {
    if (!database || !id) return
    setIsSubmitting(true)
    try {
      await update(ref(database, `Institutes/${id}/profile`), {
        ...editData, updatedAt: Date.now()
      })

      const totalAmount = Number(planDetails.totalPlanAmount) || 0
      const currentPaid = Number(project?.receivedAmount || 0)
      const cleanPlanDetails = {
        ...planDetails, totalPlanAmount: totalAmount, renewalAmount: Number(planDetails.renewalAmount) || 0
      }

      const updates: any = {
        [`Institutes/${id}/profile/planDetails`]: cleanPlanDetails,
        [`Institutes/${id}/profile/currentPlan`]: planDetails.planType,
        [`Institutes/${id}/profile/customDomain`]: planDetails.customDomain || null,
        [`Institutes/${id}/profile/isWebsiteFirst`]: planDetails.isWebsiteFirst,
        [`Institutes/${id}/profile/netFees`]: totalAmount,
        [`Institutes/${id}/profile/plan_selected`]: true,
        [`Institutes/${id}/profile/status`]: 'Active',
      }

      if (planDetails.customDomain) {
        const cleanDomain = planDetails.customDomain.toLowerCase().trim().replace('https://', '').replace('http://', '').replace('www.', '').split('/')[0]
        if (cleanDomain && cleanDomain.length > 3) {
          updates[`Slugs/${cleanDomain.replace(/\./g, '_')}`] = id
        }
      }

      if (planDetails.expireDate) {
        updates[`Institutes/${id}/profile/planExpiryDate`] = new Date(`${planDetails.expireDate}T00:00`).toISOString()
      }

      updates[`MasterProjects/${id}`] = {
        ...(project || {}),
        businessName: editData?.instituteName || institute?.profile?.instituteName || "Unknown",
        clientName: editData?.fullName || institute?.profile?.fullName || "Unknown",
        clientEmail: editData?.email || institute?.profile?.email || "", clientPhone: editData?.phone || institute?.profile?.phone || "",
        address: editData?.address || institute?.profile?.address || "", planType: planDetails.planType,
        customDomain: planDetails.customDomain || "", totalAmount: totalAmount,
        receivedAmount: currentPaid, dueAmount: Math.max(0, totalAmount - currentPaid),
        projectDate: planDetails.activateDate || today, expectedDeliveryDate: planDetails.expireDate || "",
        renewalDate: planDetails.nextRenewalDate || "", renewalAmount: Number(planDetails.renewalAmount) || 0,
        asmName: planDetails.asmName, status: "On Going", updatedAt: Date.now()
      }

      await update(ref(database), updates)
      await logActivity("PROFILE_UPDATED", `Updated client details & plan: ${planDetails.planType}`)
      toast({ title: "Changes Saved", description: "All details have been updated successfully." })
    } catch (e) {
      toast({ variant: "destructive", title: "Update Failed" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateStatusGeneric = async (status: 'Deactivated' | 'Suspended' | 'Active') => {
    if (!database || !id) return
    setIsSubmitting(true)
    let reason = ""
    if (status === 'Suspended') reason = "Your account has been suspended please contact digital class"
    if (status === 'Deactivated') reason = "Your account has been deactivate for some time plase contact adminstration"

    try {
      await update(ref(database), {
        [`Institutes/${id}/profile/status`]: status,
        [`Institutes/${id}/profile/statusReason`]: reason,
        [`Institutes/${id}/profile/statusDate`]: format(new Date(), "yyyy-MM-dd"),
        [`Institutes/${id}/profile/updatedAt`]: Date.now()
      })
      await logActivity("STATUS_UPDATE", `Status set to ${status}`)
      toast({ title: `Institute ${status}` })
    } catch (e) { toast({ variant: "destructive", title: "Update Failed" }) }
    finally { setIsSubmitting(false) }
  }

  const handleSaveModules = async () => {
    if (!database || !id) return
    setIsSubmitting(true)
    try {
      await update(ref(database, `Institutes/${id}/moduleAccess`), pendingModuleAccess)
      await logActivity("MODULES_UPDATED", "Bulk module permissions updated")
      toast({ title: "Permissions Saved", description: "Module access has been updated for this institute." })
    } catch (e) { toast({ variant: "destructive", title: "Save Failed" }) }
    finally { setIsSubmitting(false) }
  }

  const handleSaveAllChanges = async () => {
    setIsSubmitting(true)
    try {
      await handleSaveDetails()
      await handleSaveModules()
      toast({ title: "All Changes Applied", description: "Profile and module configurations have been synced." })
    } catch (e) { toast({ variant: "destructive", title: "Global Sync Failed" }) }
    finally { setIsSubmitting(false) }
  }

  const handleUpdateStatus = async () => {
    if (!database || !id || !statusReason) return
    setIsSubmitting(true)
    try {
      await update(ref(database), {
        [`Institutes/${id}/profile/status`]: targetStatus,
        [`Institutes/${id}/profile/statusReason`]: statusReason,
        [`Institutes/${id}/profile/statusDate`]: statusDate,
        [`Institutes/${id}/profile/updatedAt`]: Date.now()
      })
      await logActivity("STATUS_UPDATE", `Status set to ${targetStatus}. Reason: ${statusReason}`)
      toast({ title: `Status Updated to ${targetStatus}` })
      setIsStatusModalOpen(false)
      setStatusReason("")
    } catch (e) { toast({ variant: "destructive", title: "Error" }) }
    finally { setIsSubmitting(false) }
  }

  const handleSupportLogin = async () => {
    if (!database || !id) return
    try {
      await set(ref(database, `SupportLogs/${Date.now()}`), {
        instituteId: id, instituteName: institute?.profile?.instituteName || "Unknown",
        agentEmail: user?.email || "Super Admin", action: "Direct CRM Access",
        notes: "Administrative portal entry from Super Admin Dashboard",
        timestamp: Date.now(), type: 'LOG_ENTRY'
      })
      window.open(`/support-login?target=${id}`, '_blank')
    } catch (e) { toast({ variant: "destructive", title: "Logging Failed" }) }
  }

  const handleVerifyDomain = async () => {
    if (!domainInput) return
    setIsDomainModalOpen(false)
    setDomainStatus('verifying')

    try {
      // API call to add domain
      const res = await fetch('/api/domain/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainInput, tenantId: id })
      })

      if (res.ok) {
        setDomainStatus('pending')
        // Update database
        if (database && id) {
          await update(ref(database, `Institutes/${id}/profile`), {
            customDomain: domainInput,
            domainStatus: 'pending'
          })
        }

        // Start polling
        pollDomainStatus()
      } else {
        setDomainStatus('failed')
        toast({ variant: "destructive", title: "Failed to add domain." })
      }
    } catch (e) {
      setDomainStatus('failed')
    }
  }

  const pollDomainStatus = () => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/domain/status?domain=${domainInput}`)
      if (res.ok) {
        const data = await res.json()
        if (data.status === 'connected') {
          setDomainStatus('connected')
          clearInterval(interval)
          if (database && id) {
            await update(ref(database, `Institutes/${id}/profile`), { domainStatus: 'connected' })
          }
        }
      }
    }, 10000)
    // Clear interval after 5 minutes
    setTimeout(() => clearInterval(interval), 300000)
  }

  const handleCheckDomainStatus = async () => {
    setDomainStatus('verifying')
    try {
      const res = await fetch(`/api/domain/status?domain=${domainInput}`)
      if (res.ok) {
        const data = await res.json()
        setDomainStatus(data.status)
        if (database && id) {
          await update(ref(database, `Institutes/${id}/profile`), { domainStatus: data.status })
        }
      } else {
        setDomainStatus('failed')
      }
    } catch (e) {
      setDomainStatus('failed')
    }
  }

  const togglePermission = async (moduleId: string) => {
    if (!database || !id) return
    const path = `Institutes/${id}/moduleAccess/${moduleId}`
    const currentVal = institute?.moduleAccess?.[moduleId]
    const isModuleEnabled = typeof currentVal === 'object' ? currentVal.enabled !== false : currentVal !== false
    const newVal = !isModuleEnabled

    await update(ref(database), { [typeof currentVal === 'object' ? `${path}/enabled` : path]: newVal })
    await logActivity("MODULE_TOGGLE", `Module ${moduleId} ${newVal ? 'enabled' : 'disabled'}`)
  }

  const generatePremiumReceipt = (p: any) => {
    const doc = new jsPDF()
    const instName = institute?.profile?.instituteName || "INSTITUTE"
    doc.setFontSize(22).setFont("helvetica", "bold").text("RECEIPT", 20, 25)
    doc.setFontSize(12).setFont("helvetica", "normal").text(`Client: ${instName}`, 20, 35)
    autoTable(doc, {
      startY: 50,
      head: [['Description', 'Amount', 'Date', 'Mode']],
      body: [[`Subscription: ${planDetails.planType}`, `INR ${(Number(p.amount) || 0).toLocaleString()}`, p.date, p.mode || 'Online']],
      theme: 'grid'
    })
    doc.save(`Receipt_${instName}_${p.date}.pdf`)
  }

  const handleAddPayment = async () => {
    if (!database || !id || !paymentForm.amount) return
    setIsSubmitting(true)
    try {
      const amount = Number(paymentForm.amount)
      const newPaid = Number(project?.receivedAmount || 0) + amount
      const newDue = Math.max(0, Number(project?.totalAmount || 0) - newPaid)

      const updates: any = {}
      const payKey = Date.now().toString()
      updates[`MasterProjects/${id}/payments/${payKey}`] = { ...paymentForm, amount, timestamp: Date.now() }
      updates[`MasterProjects/${id}/receivedAmount`] = newPaid
      updates[`MasterProjects/${id}/dueAmount`] = newDue
      updates[`Institutes/${id}/profile/paidAmount`] = newPaid
      updates[`Institutes/${id}/profile/dueAmount`] = newDue

      await update(ref(database), updates)
      await logActivity("PAYMENT_ADDED", `Payment of ₹${amount} received via ${paymentForm.mode}`)
      toast({ title: "Payment Recorded" })
      setIsPaymentModalOpen(false)
      setPaymentForm({ amount: "", date: format(new Date(), "yyyy-MM-dd"), mode: "Cash", notes: "" })
    } catch (e) { toast({ variant: "destructive", title: "Transaction Failed" }) }
    finally { setIsSubmitting(false) }
  }

  const handleSaveLimits = async () => {
    if (!database || !id) return
    setIsSavingLimits(true)
    try {
      const limitsData = {
        branchLimit: instituteLimits.branchLimit === "" ? null : Number(instituteLimits.branchLimit),
        studentLimit: instituteLimits.studentLimit === "" ? null : Number(instituteLimits.studentLimit),
        storageLimit: instituteLimits.storageLimit === "" ? null : Number(instituteLimits.storageLimit),
        storageUnit: instituteLimits.storageUnit,
        adminUsersLimit: instituteLimits.adminUsersLimit === "" ? null : Number(instituteLimits.adminUsersLimit),
        courseUploadLimit: instituteLimits.courseUploadLimit === "" ? null : Number(instituteLimits.courseUploadLimit),
        courseUploadUnit: instituteLimits.courseUploadUnit,
        updatedAt: Date.now()
      }
      await update(ref(database, `Institutes/${id}/profile/limits`), limitsData)
      await logActivity("LIMITS_UPDATED", `Institute resource limits updated by Super Admin`)
      toast({ title: "Limits Saved", description: "Institute resource limits have been configured successfully." })
    } catch (e) {
      toast({ variant: "destructive", title: "Failed to save limits" })
    } finally {
      setIsSavingLimits(false)
    }
  }

  const handleAddDynamicField = async () => {
    if (!database || !id || !selectedDynModule || !dfNewLabel.trim()) return
    setDfIsSubmitting(true)
    try {
      const fieldId = dfNewLabel.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase()).replace(/[^a-zA-Z0-9]/g, "") + "_" + Date.now().toString().slice(-4)
      const newField = {
        label: dfNewLabel.trim(),
        type: dfNewType,
        placeholder: dfNewPlaceholder.trim(),
        options: dfNewOptions.split(',').map(o => o.trim()).filter(Boolean),
        required: dfNewRequired,
        createdAt: Date.now()
      }

      let mainModuleId = selectedDynModule;
      for (const group of PERMISSION_GROUPS) {
        for (const mod of group.modules) {
          if (mod.submodules?.some(s => s.id === selectedDynModule)) {
            mainModuleId = mod.id;
          }
        }
      }

      const path = `Institutes/${id}/dynamicFields/${mainModuleId}/${selectedDynModule}/${fieldId}`;
      await update(ref(database), { [path]: newField })

      await logActivity("DYNAMIC_FIELD_ADDED", `Added field "${newField.label}" to ${selectedDynModule}`)
      toast({ title: "Field Added Successfully" })

      setDfNewLabel('')
      setDfNewPlaceholder('')
      setDfNewOptions('')
      setDfNewRequired(false)
      setDfNewType('text')
    } catch (e) {
      toast({ variant: "destructive", title: "Failed to add field" })
    } finally {
      setDfIsSubmitting(false)
    }
  }

  const handleDeleteDynamicField = async (moduleId: string, fieldId: string, isDefault: boolean = false) => {
    if (!database || !id) return
    try {
      let mainModuleId = moduleId;
      for (const group of PERMISSION_GROUPS) {
        for (const mod of group.modules) {
          if (mod.submodules?.some(s => s.id === moduleId)) {
            mainModuleId = mod.id;
          }
        }
      }

      if (isDefault) {
        // Add to hidden defaults
        await update(ref(database), {
          [`Institutes/${id}/dynamicFields/hiddenDefaults/${mainModuleId}/${moduleId}/${fieldId}`]: true
        })
        await logActivity("DEFAULT_FIELD_REMOVED", `Removed a system field from ${moduleId}`)
      } else {
        await remove(ref(database, `Institutes/${id}/dynamicFields/${mainModuleId}/${moduleId}/${fieldId}`))
        await logActivity("DYNAMIC_FIELD_REMOVED", `Removed a dynamic field from ${moduleId}`)
      }
      toast({ title: "Field Removed" })
    } catch (e) {
      toast({ variant: "destructive", title: "Failed to remove field" })
    }
  }

  const handleUpdateTicketStatus = async (newStatus: string) => {
    if (!database || !selectedTicket?.id) return
    setIsSubmitting(true)
    try {
      await update(ref(database, `SupportLogs/${selectedTicket.id}`), {
        status: newStatus,
        updatedAt: Date.now()
      })
      toast({ title: "Ticket Status Updated", description: `Status changed to ${newStatus}` })
      setSelectedTicket({ ...selectedTicket, status: newStatus })
    } catch (e) {
      toast({ variant: "destructive", title: "Update Failed" })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Credential Helpers ──
  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!'
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  const passwordStrength = (pwd: string) => {
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    if (pwd.length >= 12) score++
    return score
  }

  const strengthLabel = (score: number) => {
    if (score <= 1) return { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-600' }
    if (score <= 2) return { label: 'Fair', color: 'bg-amber-400', text: 'text-amber-600' }
    if (score <= 3) return { label: 'Good', color: 'bg-blue-500', text: 'text-blue-600' }
    return { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-600' }
  }

  const togglePasswordVisibility = (key: string) => {
    setVisiblePasswords(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const copyToClipboard = (text: string, label = 'Copied!') => {
    navigator.clipboard.writeText(text)
    toast({ title: label, description: 'Copied to clipboard successfully.' })
  }

  const handleOpenReset = (target: any) => {
    setResetTarget(target)
    setResetForm({ newPassword: '', confirmPassword: '', autoGenerate: false, sendEmail: true })
    setGeneratedPassword('')
    setIsResetModalOpen(true)
  }

  const handleAutoGenerate = () => {
    const pwd = generateStrongPassword()
    setGeneratedPassword(pwd)
    setResetForm(f => ({ ...f, newPassword: pwd, confirmPassword: pwd, autoGenerate: true }))
  }

  const handleConfirmReset = async () => {
    if (!resetTarget || resetForm.newPassword !== resetForm.confirmPassword) return
    if (!resetForm.newPassword || resetForm.newPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Password too short', description: 'Minimum 6 characters required.' })
      return
    }
    setCredentialActioning(resetTarget.id)
    try {
      // Determine path based on role
      let updates: Record<string, any> = {}
      if (resetTarget.role === 'admin') {
        // Main admin: store in profile.password so super admin can see it
        updates[`Institutes/${id}/profile/password`] = resetForm.newPassword
        updates[`Institutes/${id}/profile/lastPasswordUpdate`] = Date.now()
      } else if (resetTarget.role === 'branch') {
        // Branch admin: real login field is branchPassword
        updates[`Institutes/${id}/branches/${resetTarget.id}/branchPassword`] = resetForm.newPassword
        updates[`Institutes/${id}/branches/${resetTarget.id}/lastPasswordUpdate`] = Date.now()
      } else {
        // Staff/Teacher: real login field is staffPassword
        updates[`Institutes/${id}/employees/${resetTarget.id}/staffPassword`] = resetForm.newPassword
        updates[`Institutes/${id}/employees/${resetTarget.id}/lastPasswordUpdate`] = Date.now()
      }
      await update(ref(database), updates)
      await logActivity('PASSWORD_RESET', `Password reset for ${resetTarget.name || resetTarget.role} by Super Admin`)
      toast({ title: 'Password Reset', description: `Credentials updated for ${resetTarget.name || 'user'}.` })
      setIsResetModalOpen(false)

      if (resetForm.sendEmail) {
        setEmailTarget({ ...resetTarget, newPassword: resetForm.newPassword })
        setIsSendEmailModalOpen(true)
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Reset Failed' })
    } finally {
      setCredentialActioning(null)
    }
  }

  const handleToggleUserStatus = async (target: any) => {
    if (!database || !id) return
    const newStatus = target.status === 'disabled' ? 'active' : 'disabled'
    let path = ''
    if (target.role === 'branch') path = `Institutes/${id}/branches/${target.id}/status`
    else path = `Institutes/${id}/employees/${target.id}/status`
    await update(ref(database), { [path]: newStatus })
    await logActivity('CREDENTIAL_ACCESS', `${target.name} access ${newStatus === 'active' ? 'enabled' : 'disabled'}`)
    toast({ title: `Access ${newStatus === 'active' ? 'Enabled' : 'Disabled'}`, description: `${target.name}'s login has been updated.` })
  }

  // Raw real values — separate from display fallbacks
  // Main admin uses Firebase Auth — password is stored in profile.password only if Super Admin explicitly set it via Reset
  const mainAdminRawPassword = institute?.profile?.password || institute?.profile?.pass || ''
  const mainAdmin = {
    id: 'main_admin',
    role: 'admin',
    name: institute?.profile?.fullName || institute?.profile?.ownerName || 'Main Administrator',
    email: institute?.profile?.email || '-',
    username: institute?.profile?.username || institute?.profile?.email?.split('@')[0] || '-',
    password: mainAdminRawPassword,
    status: institute?.profile?.status || 'Active',
    lastPasswordUpdate: institute?.profile?.lastPasswordUpdate || null,
  }

  // Branch: real fields are branchName, branchEmail, branchPassword
  const branchDisplayName = (b: any) => b.branchName || b.name || 'Branch'
  const branchEmail = (b: any) => b.branchEmail || b.email || '-'
  const branchUsername = (b: any) => b.username || b.branchEmail?.split('@')[0] || b.email?.split('@')[0] || '-'
  const branchPassword = (b: any) => b.branchPassword || b.password || ''

  // Staff/Teacher: real fields are firstName, lastName, staffEmail, staffPassword
  const teacherDisplayName = (t: any) =>
    (t.firstName ? `${t.firstName} ${t.lastName || ''}`.trim() : null) ||
    t.name || t.employeeName || t.fullName || '-'
  const teacherEmail = (t: any) => t.staffEmail || t.email || '-'
  const teacherUsername = (t: any) => t.username || t.staffEmail?.split('@')[0] || t.email?.split('@')[0] || '-'
  const teacherPassword = (t: any) => t.staffPassword || t.password || t.loginPassword || t.pass || ''

  const filteredTeachers = teachers.filter(t => {
    const displayName = teacherDisplayName(t)
    const matchSearch = !teacherSearch || [
      displayName, teacherEmail(t), t.username, t.designation, t.firstName, t.lastName, t.staffEmail
    ].some(v => v?.toLowerCase().includes(teacherSearch.toLowerCase()))
    const matchBranch = teacherBranchFilter === 'all' || t.branchId === teacherBranchFilter || t.branch === teacherBranchFilter
    return matchSearch && matchBranch
  })

  const financialSummary = {
    total: Number(project?.totalAmount || 0),
    paid: Number(project?.receivedAmount || 0),
    due: Math.max(0, (Number(project?.totalAmount || 0)) - (Number(project?.receivedAmount || 0)))
  }

  const statusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'trial': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'expired': return 'bg-red-50 text-red-700 border-red-200'
      case 'suspended': return 'bg-amber-50 text-amber-700 border-amber-200'
      default: return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  const paymentStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'failed': return 'bg-red-50 text-red-700 border-red-200'
      default: return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }
  }

  const activityBadgeColor = (action: string) => {
    if (action?.includes("PAYMENT")) return "bg-emerald-50 text-emerald-600 border-emerald-200"
    if (action?.includes("STATUS")) return "bg-amber-50 text-amber-600 border-amber-200"
    if (action?.includes("MODULE")) return "bg-purple-50 text-purple-600 border-purple-200"
    if (action?.includes("CREATED")) return "bg-blue-50 text-blue-600 border-blue-200"
    return "bg-indigo-50 text-indigo-600 border-indigo-200"
  }

  const activityIcon = (action: string) => {
    if (action?.includes("PAYMENT")) return <CreditCard className="w-3.5 h-3.5" />
    if (action?.includes("STATUS")) return <ShieldAlert className="w-3.5 h-3.5" />
    if (action?.includes("MODULE")) return <Grid3X3 className="w-3.5 h-3.5" />
    if (action?.includes("CREATED")) return <Plus className="w-3.5 h-3.5" />
    return <FileEdit className="w-3.5 h-3.5" />
  }

  // ── Loading State ──
  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center" style={{ fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-[3px] border-slate-200 rounded-full" />
            <div className="w-12 h-12 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin absolute inset-0" />
          </div>
          <div className="text-center">
            <p className="text-[13px] font-semibold text-slate-600">Loading client data</p>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">Please wait...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="flex-1 min-h-screen pb-20" style={{ fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif' }}>

      {/* ── Page Header ── */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/super/institutes')}
          className="flex items-center gap-2 text-[13px] font-medium text-slate-400 hover:text-indigo-600 transition-all duration-200 mb-5 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
          Back to Clients
        </button>

        {/* Client Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Subtle gradient accent bar */}
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-violet-500" />

          <div className="p-6 md:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/20">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-1.5">
                    <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">{institute?.profile?.instituteName || "Loading..."}</h1>
                    <Badge className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-semibold border", statusColor(institute?.profile?.status))}>
                      <CircleDot className="w-3 h-3 mr-1" />
                      {institute?.profile?.status || "Active"}
                    </Badge>
                    <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                      {planDetails?.planType || "Enterprise"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-slate-400" />{(id as string)?.slice(0, 12)}...</span>
                    <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" />{institute?.profile?.email || "-"}</span>
                    <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" />{institute?.profile?.phone || "-"}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => handleUpdateStatusGeneric('Suspended')}
                  variant="outline"
                  className="h-10 px-4 rounded-xl border-slate-200 text-slate-600 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50/50 text-[13px] font-semibold transition-all duration-200"
                >
                  <ShieldAlert className="w-4 h-4 mr-1.5" /> Suspend
                </Button>
                <Button
                  onClick={() => handleUpdateStatusGeneric('Deactivated')}
                  variant="outline"
                  className="h-10 px-4 rounded-xl border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/50 text-[13px] font-semibold transition-all duration-200"
                >
                  <Monitor className="w-4 h-4 mr-1.5" /> Deactivate
                </Button>
                <Button
                  onClick={() => handleUpdateStatusGeneric('Active')}
                  variant="outline"
                  className="h-10 px-4 rounded-xl border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50/50 text-[13px] font-semibold transition-all duration-200"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Active
                </Button>
                <Button
                  onClick={handleSupportLogin}
                  className="h-10 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white text-[13px] font-semibold shadow-sm shadow-indigo-200/50 transition-all duration-200 active:scale-[0.98]"
                >
                  Client Support <ExternalLink className="w-3.5 h-3.5 ml-1.5 opacity-70" />
                </Button>
                <Button
                  onClick={handleSaveAllChanges}
                  disabled={isSubmitting}
                  className="h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-bold shadow-sm transition-all duration-200 active:scale-[0.98]"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Zap className="w-4 h-4 mr-1.5" />}
                  Submit All Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="mb-6">
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-1.5">
          <div
            className="flex items-center gap-1 overflow-x-auto"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#c7d2fe #f1f5f9' }}
          >
            {TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.label}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all duration-200 shrink-0",
                    isActive
                      ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-sm shadow-indigo-200/50"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="animate-in fade-in duration-300" key={activeTab}>

        {/* ═══ OVERVIEW TAB ═══ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid — 4 colour metric cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total Students", value: realStats.students, icon: GraduationCap, color: "text-emerald-600", bg: "from-emerald-50 to-emerald-50/50", border: "border-emerald-100/60" },
                { label: "Total Branches", value: realStats.branches, icon: MapPin, color: "text-blue-600", bg: "from-blue-50 to-blue-50/50", border: "border-blue-100/60" },
                { label: "Staff Members", value: realStats.staff, icon: Briefcase, color: "text-purple-600", bg: "from-purple-50 to-purple-50/50", border: "border-purple-100/60" },
                { label: "Revenue", value: `₹${financialSummary.paid.toLocaleString()}`, icon: TrendingUp, color: "text-indigo-600", bg: "from-indigo-50 to-indigo-50/50", border: "border-indigo-100/60" },
              ].map((stat, i) => (
                <Card key={i} className="bg-white border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-2xl p-5 hover:shadow-md transition-all duration-300 group cursor-default">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110", stat.bg, stat.color, stat.border, "border")}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{stat.label}</p>
                      <h4 className="text-2xl font-bold text-slate-800 tracking-tight">{stat.value}</h4>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Info Cards Grid — Enhanced institute info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Owner / Contact Name", value: institute?.profile?.fullName || institute?.profile?.ownerName || "-", icon: User },
                { label: "Phone Number", value: institute?.profile?.phone || "-", icon: Phone },
                { label: "Email Address", value: institute?.profile?.email || "-", icon: Mail },
                { label: "Institute Name", value: institute?.profile?.instituteName || "-", icon: Building2 },
                { label: "City / Location", value: institute?.profile?.city || institute?.profile?.address?.split(',').pop()?.trim() || "-", icon: MapPin },
                { label: "Address", value: institute?.profile?.address || "-", icon: Globe },
                { label: "Institute Type", value: institute?.profile?.instituteType || institute?.profile?.category || "Educational Institute", icon: Layers },
                { label: "Assigned ASM", value: planDetails.asmName || "Not Assigned", icon: Briefcase },
                { label: "Plan Type", value: planDetails.planType || "Not Set", icon: CreditCard },
                { label: "Activation Date", value: planDetails.activateDate ? format(new Date(planDetails.activateDate), "PPP") : "Not Set", icon: CalendarDays },
                { label: "Expiry Date", value: planDetails.expireDate ? format(new Date(planDetails.expireDate), "PPP") : "Not Set", icon: CalendarDays },
                { label: "Next Renewal Date", value: planDetails.nextRenewalDate ? format(new Date(planDetails.nextRenewalDate), "PPP") : "Not Set", icon: Clock },
                { label: "Custom Domain", value: planDetails.customDomain || "System Default", icon: Globe },
                { label: "Domain Status", value: domainStatus === 'connected' ? "Connected" : domainStatus === 'pending' ? "Pending Verification" : domainStatus === 'failed' ? "Failed" : "Not Configured", icon: Network },
              ].map((card, i) => (
                <Card key={i} className="bg-white border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-2xl p-5 hover:shadow-md hover:border-indigo-100 transition-all duration-300 group">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-indigo-50 group-hover:text-indigo-500 group-hover:border-indigo-100 transition-all duration-300">
                      <card.icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{card.label}</p>
                      <p className="text-[14px] font-semibold text-slate-800 truncate" title={typeof card.value === 'string' ? card.value : ''}>{card.value}</p>
                    </div>
                  </div>
                </Card>
              ))}

              {/* Plan Entry — special card with badge */}
              <Card className="bg-white border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-2xl p-5 hover:shadow-md hover:border-indigo-100 transition-all duration-300 group">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-indigo-50 group-hover:text-indigo-500 group-hover:border-indigo-100 transition-all duration-300">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Plan Entry</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[14px] font-semibold text-slate-800 truncate">
                        {planDetails.planType || institute?.profile?.currentPlan || "Not Set"}
                      </p>
                      {(planDetails.planType || institute?.profile?.currentPlan) && (
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border",
                          ['Starter Website', 'Cloud ERP'].includes(planDetails.planType)
                            ? "bg-blue-50 text-blue-600 border-blue-100"
                            : planDetails.planType === 'Enterprise'
                              ? "bg-violet-50 text-violet-600 border-violet-100"
                              : "bg-purple-50 text-purple-600 border-purple-100"
                        )}>
                          {['Starter Website', 'Cloud ERP'].includes(planDetails.planType) ? "Subscription" : "White Label"}
                        </span>
                      )}
                    </div>
                    {planDetails.activateDate && (
                      <p className="text-[11px] text-slate-400 mt-1 font-medium">
                        Entered: {format(new Date(planDetails.activateDate), "dd MMM yyyy")}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Financial Summary */}
            <Card className="bg-white border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h3 className="text-[15px] font-semibold text-slate-800">Financial Summary</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Total Plan Value</p>
                  <p className="text-xl font-bold text-slate-800">₹{financialSummary.total.toLocaleString()}</p>
                </div>
                <div className="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-100/60">
                  <p className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider mb-1.5">Amount Received</p>
                  <p className="text-xl font-bold text-emerald-700">₹{financialSummary.paid.toLocaleString()}</p>
                </div>
                <div className="p-5 bg-amber-50/60 rounded-2xl border border-amber-100/60">
                  <p className="text-[11px] font-semibold text-amber-500 uppercase tracking-wider mb-1.5">Balance Due</p>
                  <p className="text-xl font-bold text-amber-700">₹{financialSummary.due.toLocaleString()}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ═══ DETAILS TAB ═══ */}
        {activeTab === 'details' && (
          <div className="space-y-6">

            {/* ── Current Plan Summary Banner (read-only, Super Admin view) ── */}
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-slate-50 to-violet-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_1px_4px_rgba(99,102,241,0.08)]">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-indigo-200">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">Current Active Plan</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[17px] font-bold text-slate-900">{planDetails.planType || institute?.profile?.currentPlan || "No Plan Set"}</span>
                    {planDetails.planType && (
                      <Badge className={cn("text-[9px] px-2 py-0.5 rounded-full font-bold border",
                        ['Starter Website', 'Cloud ERP'].includes(planDetails.planType) ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-violet-50 text-violet-600 border-violet-100"
                      )}>
                        {['Starter Website', 'Cloud ERP'].includes(planDetails.planType) ? "Subscription" : "White Label"}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-5 text-center sm:text-right shrink-0">
                {planDetails.activateDate && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Activated</p>
                    <p className="text-[13px] font-bold text-slate-700">{format(new Date(planDetails.activateDate), "dd MMM yyyy")}</p>
                  </div>
                )}
                {planDetails.expireDate && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Expires</p>
                    <p className="text-[13px] font-bold text-slate-700">{format(new Date(planDetails.expireDate), "dd MMM yyyy")}</p>
                  </div>
                )}
                {planDetails.totalPlanAmount && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Plan Value</p>
                    <p className="text-[13px] font-bold text-emerald-700">₹{Number(planDetails.totalPlanAmount).toLocaleString()}</p>
                  </div>
                )}
                {planDetails.asmName && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">ASM</p>
                    <p className="text-[13px] font-bold text-slate-700">{planDetails.asmName}</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Two-Column Layout ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

              {/* Left Column: Edit Forms (2/3 width) */}
              <div className="xl:col-span-2 space-y-6">
                {/* Basic Info */}
                <Card className="bg-white border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-2xl p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <h3 className="text-[15px] font-semibold text-slate-800">Institute Information</h3>
                    <Badge className="ml-auto bg-amber-50 text-amber-600 border-amber-100 text-[9px] px-2 py-0.5 font-bold">
                      <Lock className="w-2.5 h-2.5 mr-1" />Super Admin Only
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FieldInput label="Institute Name" value={editData.instituteName || ""} onChange={v => setEditData({ ...editData, instituteName: v })} />
                    <FieldInput label="Owner Name" value={editData.fullName || ""} onChange={v => setEditData({ ...editData, fullName: v })} />
                    <FieldInput label="Phone Number" value={editData.phone || ""} onChange={v => setEditData({ ...editData, phone: v })} />
                    <FieldInput label="Email Address" value={editData.email || ""} onChange={v => setEditData({ ...editData, email: v })} />
                    <div className="md:col-span-2">
                      <FieldInput label="Address" value={editData.address || ""} onChange={v => setEditData({ ...editData, address: v })} />
                    </div>
                  </div>
                </Card>

                {/* Plan Details */}
                <Card className="bg-white border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-2xl p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <h3 className="text-[15px] font-semibold text-slate-800">Subscription & Plan</h3>
                    <Badge className="ml-auto bg-amber-50 text-amber-600 border-amber-100 text-[9px] px-2 py-0.5 font-bold">
                      <Lock className="w-2.5 h-2.5 mr-1" />Super Admin Only
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2 group">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider pl-0.5 transition-colors group-focus-within:text-indigo-600">Plan Type</Label>
                        {planDetails.planType && (
                          <Badge className={cn("text-[9px] px-1.5 py-0",
                            ['Starter Website', 'Cloud ERP'].includes(planDetails.planType) ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                          )}>
                            {['Starter Website', 'Cloud ERP'].includes(planDetails.planType) ? "Subscription Plan" : "White Label"}
                          </Badge>
                        )}
                      </div>
                      <Select value={planDetails.planType} onValueChange={v => setPlanDetails({ ...planDetails, planType: v })}>
                        <SelectTrigger className="h-11 bg-white rounded-xl border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 font-medium text-[14px] transition-all duration-200">
                          <SelectValue placeholder="Select plan" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                          <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subscription Plans</div>
                          <SelectItem value="Starter Website">Starter Website</SelectItem>
                          <SelectItem value="Cloud ERP">Cloud ERP</SelectItem>
                          <div className="px-2 py-1.5 mt-1 border-t border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">White Label Plans</div>
                          <SelectItem value="Enterprise">Enterprise</SelectItem>
                          <SelectItem value="White Label Pro">White Label Pro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <FieldInput label="Total Plan Amount (₹)" value={planDetails.totalPlanAmount} onChange={v => setPlanDetails({ ...planDetails, totalPlanAmount: v })} type="number" />
                    <FieldInput label="Renewal Amount (₹)" value={planDetails.renewalAmount} onChange={v => setPlanDetails({ ...planDetails, renewalAmount: v })} type="number" />
                    <FieldInput label="Activation Date" value={planDetails.activateDate} onChange={v => setPlanDetails({ ...planDetails, activateDate: v })} type="date" />
                    <FieldInput label="Expiry Date" value={planDetails.expireDate} onChange={v => setPlanDetails({ ...planDetails, expireDate: v })} type="date" />
                    <FieldInput label="Next Renewal Date" value={planDetails.nextRenewalDate} onChange={v => setPlanDetails({ ...planDetails, nextRenewalDate: v })} type="date" />
                    <div className="space-y-2 group">
                      <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider pl-0.5 transition-colors group-focus-within:text-indigo-600">Assigned ASM</Label>
                      <Select value={planDetails.asmName} onValueChange={v => setPlanDetails({ ...planDetails, asmName: v })}>
                        <SelectTrigger className="h-11 bg-white rounded-xl border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 font-medium text-[14px] transition-all duration-200">
                          <SelectValue placeholder="Assign ASM" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                          {asms.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <FieldInput label="Custom Domain" value={planDetails.customDomain || ""} onChange={v => setPlanDetails({ ...planDetails, customDomain: v })} placeholder="e.g. erp.example.com" />
                    </div>
                  </div>
                </Card>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('overview')}
                    className="h-11 px-6 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 text-[13px] font-semibold transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveDetails}
                    disabled={isSubmitting}
                    className="h-11 px-8 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white text-[13px] font-semibold shadow-sm shadow-indigo-200/50 transition-all duration-200 active:scale-[0.98]"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Save Changes
                  </Button>
                </div>
              </div>

              {/* Right Column: Institute Limitations (1/3 width) */}
              <div className="xl:col-span-1">
                <Card className="bg-white border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-2xl overflow-hidden">
                  {/* Header */}
                  <div className="h-1 bg-gradient-to-r from-rose-400 via-orange-400 to-amber-400" />
                  <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
                        <Sliders className="w-4 h-4" />
                      </div>
                      <h3 className="text-[15px] font-semibold text-slate-800">Institute Limitations</h3>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium ml-11">Set resource caps for this institute. Leave blank for unlimited.</p>
                  </div>

                  <div className="p-6 space-y-5">

                    {/* Branch Limit */}
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-blue-400" /> Branch Limit
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Unlimited"
                        value={instituteLimits.branchLimit}
                        onChange={e => setInstituteLimits(p => ({ ...p, branchLimit: e.target.value }))}
                        className="h-10 rounded-xl border-slate-200 text-[14px] font-semibold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300"
                      />
                      {instituteLimits.branchLimit !== "" && (
                        <p className="text-[10px] text-blue-500 font-semibold">Current: {realStats.branches} / {instituteLimits.branchLimit} branches</p>
                      )}
                    </div>

                    {/* Student Limit */}
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <GraduationCap className="w-3 h-3 text-emerald-400" /> Student Limit
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Unlimited"
                        value={instituteLimits.studentLimit}
                        onChange={e => setInstituteLimits(p => ({ ...p, studentLimit: e.target.value }))}
                        className="h-10 rounded-xl border-slate-200 text-[14px] font-semibold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300"
                      />
                      {instituteLimits.studentLimit !== "" && (
                        <p className="text-[10px] text-emerald-500 font-semibold">Current: {realStats.students} / {instituteLimits.studentLimit} students</p>
                      )}
                    </div>

                    {/* Storage Limit */}
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Database className="w-3 h-3 text-purple-400" /> Storage Limit
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min={0}
                          placeholder="Unlimited"
                          value={instituteLimits.storageLimit}
                          onChange={e => setInstituteLimits(p => ({ ...p, storageLimit: e.target.value }))}
                          className="h-10 flex-1 rounded-xl border-slate-200 text-[14px] font-semibold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300"
                        />
                        <Select value={instituteLimits.storageUnit} onValueChange={v => setInstituteLimits(p => ({ ...p, storageUnit: v as any }))}>
                          <SelectTrigger className="h-10 w-20 rounded-xl border-slate-200 text-[13px] font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="KB">KB</SelectItem>
                            <SelectItem value="MB">MB</SelectItem>
                            <SelectItem value="GB">GB</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Admin Users Limit */}
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-indigo-400" /> Admin Users Limit
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Unlimited"
                        value={instituteLimits.adminUsersLimit}
                        onChange={e => setInstituteLimits(p => ({ ...p, adminUsersLimit: e.target.value }))}
                        className="h-10 rounded-xl border-slate-200 text-[14px] font-semibold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300"
                      />
                    </div>

                    {/* Course Upload Limit */}
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <FileVideo className="w-3 h-3 text-amber-400" /> Course Upload Limit
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min={0}
                          placeholder="Unlimited"
                          value={instituteLimits.courseUploadLimit}
                          onChange={e => setInstituteLimits(p => ({ ...p, courseUploadLimit: e.target.value }))}
                          className="h-10 flex-1 rounded-xl border-slate-200 text-[14px] font-semibold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300"
                        />
                        <Select value={instituteLimits.courseUploadUnit} onValueChange={v => setInstituteLimits(p => ({ ...p, courseUploadUnit: v as any }))}>
                          <SelectTrigger className="h-10 w-20 rounded-xl border-slate-200 text-[13px] font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="MB">MB</SelectItem>
                            <SelectItem value="GB">GB</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Limit Summary */}
                    {(instituteLimits.branchLimit !== "" || instituteLimits.studentLimit !== "" || instituteLimits.storageLimit !== "" || instituteLimits.adminUsersLimit !== "" || instituteLimits.courseUploadLimit !== "") && (
                      <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Active Limits Summary</p>
                        {instituteLimits.branchLimit !== "" && <div className="flex justify-between text-[12px]"><span className="font-medium text-slate-500">Branches</span><span className="font-bold text-slate-800">{instituteLimits.branchLimit}</span></div>}
                        {instituteLimits.studentLimit !== "" && <div className="flex justify-between text-[12px]"><span className="font-medium text-slate-500">Students</span><span className="font-bold text-slate-800">{instituteLimits.studentLimit}</span></div>}
                        {instituteLimits.storageLimit !== "" && <div className="flex justify-between text-[12px]"><span className="font-medium text-slate-500">Storage</span><span className="font-bold text-slate-800">{instituteLimits.storageLimit} {instituteLimits.storageUnit}</span></div>}
                        {instituteLimits.adminUsersLimit !== "" && <div className="flex justify-between text-[12px]"><span className="font-medium text-slate-500">Admin Users</span><span className="font-bold text-slate-800">{instituteLimits.adminUsersLimit}</span></div>}
                        {instituteLimits.courseUploadLimit !== "" && <div className="flex justify-between text-[12px]"><span className="font-medium text-slate-500">Course Upload</span><span className="font-bold text-slate-800">{instituteLimits.courseUploadLimit} {instituteLimits.courseUploadUnit}</span></div>}
                      </div>
                    )}

                    <Button
                      onClick={handleSaveLimits}
                      disabled={isSavingLimits}
                      className="w-full h-10 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white text-[13px] font-bold shadow-sm transition-all duration-200 active:scale-[0.98]"
                    >
                      {isSavingLimits ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sliders className="w-4 h-4 mr-2" />}
                      Save Limits
                    </Button>

                    <p className="text-[10px] text-slate-400 text-center font-medium leading-relaxed">
                      When a limit is reached, the institute admin will see a daily warning at login to contact Digital Class for an upgrade.
                    </p>
                  </div>
                </Card>
              </div>

            </div>
          </div>
        )}

        {/* ═══ DOMAIN SETTINGS TAB ═══ */}
        {activeTab === 'domain' && (
          <div className="max-w-4xl space-y-6">
            <Card className="bg-white border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                  <Globe className="w-4 h-4" />
                </div>
                <h3 className="text-[15px] font-semibold text-slate-800">Domain Connectivity</h3>
              </div>

              <div className="space-y-6">
                <div className="space-y-2 group">
                  <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider pl-0.5 transition-colors duration-200 group-focus-within:text-indigo-600">
                    Domain Name
                  </Label>
                  <div className="flex gap-3">
                    <Input
                      value={domainInput}
                      onChange={e => setDomainInput(e.target.value)}
                      placeholder="Enter domain (example.com)"
                      className="h-11 flex-1 bg-white rounded-xl border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 font-medium px-4 text-[14px]"
                    />
                    <Button
                      onClick={() => setIsDomainModalOpen(true)}
                      disabled={!domainInput || isSubmitting}
                      className="h-11 px-6 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-semibold rounded-xl"
                    >
                      Verify & Connect
                    </Button>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                  <h4 className="text-[13px] font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Network className="w-4 h-4 text-slate-400" />
                    Name Server Section
                  </h4>
                  <p className="text-[12px] text-slate-500 mb-4">Update these nameservers in your domain provider (GoDaddy, Namecheap, etc.)</p>
                  <div className="space-y-2">
                    {['ns1.vercel-dns.com', 'ns2.vercel-dns.com'].map(ns => (
                      <div key={ns} className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200/60 shadow-sm">
                        <span className="text-[13px] font-medium text-slate-700 font-mono">{ns}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(ns)
                            toast({ title: "Copied!", description: "Nameserver copied to clipboard" })
                          }}
                          className="h-7 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 border-slate-200"
                        >
                          <ClipboardList className="w-3 h-3 mr-1.5" /> Copy
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Domain Status States */}
                {domainStatus !== 'none' && (
                  <div className={cn(
                    "rounded-xl p-5 border",
                    domainStatus === 'pending' ? "bg-amber-50 border-amber-100/60" :
                      domainStatus === 'verifying' ? "bg-blue-50 border-blue-100/60" :
                        domainStatus === 'connected' ? "bg-emerald-50 border-emerald-100/60" :
                          "bg-rose-50 border-rose-100/60"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                          domainStatus === 'pending' ? "bg-amber-100 text-amber-600" :
                            domainStatus === 'verifying' ? "bg-blue-100 text-blue-600" :
                              domainStatus === 'connected' ? "bg-emerald-100 text-emerald-600" :
                                "bg-rose-100 text-rose-600"
                        )}>
                          {domainStatus === 'pending' ? <Clock className="w-5 h-5" /> :
                            domainStatus === 'verifying' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                              domainStatus === 'connected' ? <CheckCircle2 className="w-5 h-5" /> :
                                <AlertCircle className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className={cn(
                            "text-[14px] font-bold",
                            domainStatus === 'pending' ? "text-amber-800" :
                              domainStatus === 'verifying' ? "text-blue-800" :
                                domainStatus === 'connected' ? "text-emerald-800" :
                                  "text-rose-800"
                          )}>
                            {domainStatus === 'pending' ? "⏳ Waiting for DNS propagation" :
                              domainStatus === 'verifying' ? "Verifying domain..." :
                                domainStatus === 'connected' ? `✅ ${domainInput} is connected` :
                                  "❌ Domain not connected"}
                          </p>
                          <p className={cn(
                            "text-[12px] font-medium mt-0.5",
                            domainStatus === 'pending' ? "text-amber-600/80" :
                              domainStatus === 'verifying' ? "text-blue-600/80" :
                                domainStatus === 'connected' ? "text-emerald-600/80" :
                                  "text-rose-600/80"
                          )}>
                            {domainStatus === 'connected' ? "SSL active • Verified just now" :
                              domainStatus === 'failed' ? "Check DNS configuration" :
                                "DNS propagation may take 5 minutes to 24 hours"}
                          </p>
                        </div>
                      </div>

                      {domainStatus === 'pending' && (
                        <Button variant="outline" onClick={handleCheckDomainStatus} className="h-9 text-[12px] font-semibold border-amber-200 text-amber-700 hover:bg-amber-100">
                          Check Status
                        </Button>
                      )}
                      {domainStatus === 'connected' && (
                        <Button variant="outline" onClick={() => window.open(`https://${domainInput}`, '_blank')} className="h-9 text-[12px] font-semibold border-emerald-200 text-emerald-700 hover:bg-emerald-100">
                          <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open Website
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ═══ PAYMENTS TAB ═══ */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            {/* Financial Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Total Amount", value: `₹${financialSummary.total.toLocaleString()}`, color: "text-slate-800", labelColor: "text-slate-400", bg: "bg-white", border: "border-slate-200/60", icon: Wallet },
                { label: "Paid", value: `₹${financialSummary.paid.toLocaleString()}`, color: "text-emerald-700", labelColor: "text-emerald-500", bg: "bg-white", border: "border-slate-200/60", icon: CheckCircle2 },
                { label: "Due", value: `₹${financialSummary.due.toLocaleString()}`, color: "text-amber-700", labelColor: "text-amber-500", bg: "bg-white", border: "border-slate-200/60", icon: Clock },
              ].map((card, i) => (
                <Card key={i} className={cn("shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-2xl p-5", card.bg, card.border)}>
                  <div className="flex items-center justify-between mb-3">
                    <p className={cn("text-[11px] font-semibold uppercase tracking-wider", card.labelColor)}>{card.label}</p>
                    <card.icon className={cn("w-4 h-4", card.labelColor)} />
                  </div>
                  <p className={cn("text-2xl font-bold", card.color)}>{card.value}</p>
                </Card>
              ))}
            </div>

            {/* Payments Table */}
            <Card className="bg-white border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-slate-800">Payment History</h3>
                    <p className="text-[11px] font-medium text-slate-400 mt-0.5">{paymentHistory.length} transactions recorded</p>
                  </div>
                </div>
                <Button onClick={() => setIsPaymentModalOpen(true)} className="h-9 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white text-[13px] font-semibold rounded-xl shadow-sm transition-all duration-200 active:scale-[0.98]">
                  <Plus className="w-4 h-4 mr-1.5" /> Add Payment
                </Button>
              </div>
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider h-11 pl-6">Date</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider h-11">Amount</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider h-11">Plan</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider h-11">Status</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider h-11">Method</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider h-11 text-right pr-6">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-16">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                            <CreditCard className="w-7 h-7" />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-slate-500">No payments recorded yet</p>
                            <p className="text-[11px] font-medium text-slate-400 mt-0.5">Add your first payment to get started</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : paymentHistory.map((p) => (
                    <TableRow key={p.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors duration-150">
                      <TableCell className="text-[13px] font-medium text-slate-700 pl-6 py-4">{p.date}</TableCell>
                      <TableCell className="text-[14px] font-bold text-slate-900">₹{Number(p.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">{planDetails.planType || "-"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-[11px] font-semibold px-2.5 py-0.5 rounded-full border", paymentStatusColor(p.status || 'Paid'))}>{p.status || 'Paid'}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-[13px] font-medium text-slate-600 flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          {p.mode}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" onClick={() => generatePremiumReceipt(p)} className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200">
                          <Download className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* ═══ MODULE MATRIX TAB ═══ */}
        {activeTab === 'modules' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                <p className="text-[13px] font-medium text-slate-500">Configure feature access. Click a card to expand sub-modules.</p>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-violet-50 border border-violet-200/60 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                    <span className="text-[10px] font-bold text-violet-700 tracking-wide">Has sub-modules</span>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleSaveModules}
                disabled={isSubmitting}
                className="h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-bold shadow-md shadow-indigo-100 transition-all"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                Apply Changes
              </Button>
            </div>

            {PERMISSION_GROUPS.map((group) => (
              <div key={group.category}>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{group.category}</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
                  <span className="text-[10px] font-medium text-slate-400">{group.modules.length} modules</span>
                </div>
                <div className="mobile-horizontal-scroller scrollbar-thin grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {group.modules.map(m => {
                    const currentAccess = pendingModuleAccess?.[m.id]
                    const isEnabled = typeof currentAccess === 'object' ? currentAccess.enabled !== false : currentAccess !== false
                    const Icon = m.icon
                    const hasSubmodules = m.submodules && m.submodules.length > 0
                    const isExpanded = expandedModule === m.id

                    return (
                      <div key={m.id} className="space-y-2">
                        <Card
                          onClick={() => hasSubmodules && setExpandedModule(isExpanded ? null : m.id)}
                          className={cn(
                            "border shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl p-3.5 transition-all duration-200 group relative overflow-hidden",
                            hasSubmodules ? "cursor-pointer" : "cursor-default",
                            isEnabled
                              ? "bg-white border-slate-200/60 hover:border-indigo-200 hover:shadow-md"
                              : "bg-slate-50/50 border-slate-200/40 opacity-55 hover:opacity-75"
                          )}
                        >
                          {/* Submodule indicator — colored left edge */}
                          {hasSubmodules && (
                            <div className={cn(
                              "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-all",
                              isExpanded ? "bg-violet-500" : "bg-violet-300"
                            )} />
                          )}

                          <div className="flex items-center justify-between mb-2">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 shrink-0",
                              isEnabled
                                ? "bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-600 border border-indigo-100/60"
                                : "bg-slate-100 text-slate-400 border border-slate-200/60"
                            )}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex items-center gap-1.5">
                              {hasSubmodules && (
                                <div className={cn(
                                  "w-5 h-5 rounded-md flex items-center justify-center transition-all",
                                  isExpanded ? "bg-violet-100 text-violet-600 rotate-90" : "text-slate-300 group-hover:text-violet-400"
                                )}>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </div>
                              )}
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) => {
                                  const updated = { ...pendingModuleAccess }
                                  if (typeof updated[m.id] === 'object') {
                                    updated[m.id] = { ...updated[m.id], enabled: checked }
                                  } else {
                                    updated[m.id] = checked
                                  }
                                  setPendingModuleAccess(updated)
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="scale-75 data-[state=checked]:bg-indigo-600 transition-all duration-200"
                              />
                            </div>
                          </div>

                          <h4 className={cn(
                            "text-[12px] font-semibold leading-tight transition-colors duration-200",
                            isEnabled ? "text-slate-800" : "text-slate-400"
                          )}>
                            {m.label}
                          </h4>

                          {hasSubmodules && (
                            <div className="mt-1.5 flex items-center gap-1">
                              <div className="w-1 h-1 rounded-full bg-violet-400" />
                              <span className="text-[9px] font-bold text-violet-500 uppercase tracking-widest">{m.submodules?.length} sub-modules</span>
                            </div>
                          )}
                        </Card>

                        {/* Submodules UI */}
                        {isExpanded && hasSubmodules && (
                          <div className="ml-2 pl-3 border-l-2 border-violet-200 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                            {m.submodules?.map(sub => {
                              const subAccess = pendingModuleAccess?.[m.id]?.[sub.id] !== false
                              return (
                                <div key={sub.id} className="flex items-center justify-between px-3 py-2 bg-violet-50/60 rounded-lg border border-violet-100/60">
                                  <span className="text-[11px] font-semibold text-slate-600">{sub.label}</span>
                                  <Switch
                                    checked={subAccess}
                                    onCheckedChange={(checked) => {
                                      const updated = { ...pendingModuleAccess }
                                      if (typeof updated[m.id] !== 'object') {
                                        updated[m.id] = { enabled: true }
                                      }
                                      updated[m.id] = { ...updated[m.id], [sub.id]: checked }
                                      setPendingModuleAccess(updated)
                                    }}
                                    className="scale-75 data-[state=checked]:bg-violet-500"
                                  />
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ DYNAMIC FIELDS TAB ═══ */}
        {activeTab === 'dynamic-fields' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[16px] font-bold text-slate-800">Dynamic Fields Setup</h3>
                <p className="text-[12px] font-medium text-slate-500 mt-1">Configure custom form fields per module/sub-module.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

              {/* Left Col: Module Selector */}
              <Card className="lg:col-span-3 p-4 border border-slate-200 shadow-sm rounded-2xl bg-white max-h-[600px] overflow-y-auto custom-scrollbar">
                <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Select Module</h4>
                <div className="space-y-1">
                  {PERMISSION_GROUPS.flatMap(g => g.modules).filter(m => {
                    const acc = institute?.moduleAccess?.[m.id];
                    return acc === true || (typeof acc === 'object' && acc.enabled !== false) || (acc === undefined);
                  }).map(m => (
                    <div key={m.id}>
                      <button
                        onClick={() => setSelectedDynModule(m.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors duration-200",
                          selectedDynModule === m.id ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-600 hover:bg-slate-50 font-medium",
                          "text-[13px]"
                        )}
                      >
                        <span className="truncate pr-2">{m.label}</span>
                        {m.submodules && <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                      </button>
                      {m.submodules && m.submodules.length > 0 && selectedDynModule?.startsWith(m.id) && (
                        <div className="ml-3 mt-1 space-y-1 border-l-2 border-indigo-100 pl-2">
                          {m.submodules.filter(sub => {
                            const subAcc = institute?.moduleAccess?.[m.id]?.[sub.id];
                            return subAcc !== false;
                          }).map(sub => (
                            <button
                              key={sub.id}
                              onClick={() => setSelectedDynModule(sub.id)}
                              className={cn(
                                "w-full text-left px-3 py-1.5 rounded-lg text-[12px] transition-colors",
                                selectedDynModule === sub.id ? "bg-indigo-100/50 text-indigo-700 font-semibold" : "text-slate-500 hover:bg-slate-50 font-medium"
                              )}
                            >
                              {sub.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Center Col: Configuration */}
              <Card className="lg:col-span-5 p-5 border border-slate-200 shadow-sm rounded-2xl bg-white">
                {!selectedDynModule ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                      <ListIcon className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-[13px] font-medium">Select a module from the left</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
                      <h4 className="text-[14px] font-bold text-slate-800">
                        {PERMISSION_GROUPS.flatMap(g => g.modules).flatMap(m => [m, ...(m.submodules || [])]).find(m => m.id === selectedDynModule)?.label || 'Module'} Fields
                      </h4>
                      <Badge variant="outline" className="text-xs">{dynamicFields[selectedDynModule]?.length || 0} fields</Badge>
                    </div>

                    {/* Add Field Form */}
                    <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-4">
                      <div className="space-y-3">
                        <div>
                          <Label className="text-[11px] font-bold text-slate-500 uppercase">Field Label</Label>
                          <Input value={dfNewLabel} onChange={e => setDfNewLabel(e.target.value)} placeholder="e.g. GST Number" className="h-9 mt-1 bg-white" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-[11px] font-bold text-slate-500 uppercase">Input Type</Label>
                            <Select value={dfNewType} onValueChange={setDfNewType}>
                              <SelectTrigger className="h-9 mt-1 bg-white text-[13px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text (Short)</SelectItem>
                                <SelectItem value="textarea">Textarea (Long)</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                                <SelectItem value="dropdown">Dropdown (Select)</SelectItem>
                                <SelectItem value="file">File Upload</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[11px] font-bold text-slate-500 uppercase">Required</Label>
                            <div className="h-9 mt-1 flex items-center px-1">
                              <Switch checked={dfNewRequired} onCheckedChange={setDfNewRequired} className="data-[state=checked]:bg-indigo-600 scale-90" />
                              <span className="ml-2 text-[12px] font-medium text-slate-600">{dfNewRequired ? 'Yes' : 'No'}</span>
                            </div>
                          </div>
                        </div>

                        {(dfNewType === 'text' || dfNewType === 'textarea' || dfNewType === 'number') && (
                          <div>
                            <Label className="text-[11px] font-bold text-slate-500 uppercase">Placeholder</Label>
                            <Input value={dfNewPlaceholder} onChange={e => setDfNewPlaceholder(e.target.value)} placeholder="e.g. Enter value..." className="h-9 mt-1 bg-white" />
                          </div>
                        )}

                        {dfNewType === 'dropdown' && (
                          <div>
                            <Label className="text-[11px] font-bold text-slate-500 uppercase">Options (Comma separated)</Label>
                            <Input value={dfNewOptions} onChange={e => setDfNewOptions(e.target.value)} placeholder="e.g. Red, Green, Blue" className="h-9 mt-1 bg-white" />
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={handleAddDynamicField}
                        disabled={!dfNewLabel.trim() || dfIsSubmitting}
                        className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[13px] rounded-lg shadow-sm"
                      >
                        {dfIsSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                        Add Field
                      </Button>
                    </div>

                    {/* Existing Fields List */}
                    <div className="space-y-3">
                      <h5 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest px-1">Current Fields</h5>
                      {(() => {
                        let mainModuleId = selectedDynModule;
                        for (const group of PERMISSION_GROUPS) {
                          for (const mod of group.modules) {
                            if (mod.submodules?.some(s => s.id === selectedDynModule)) {
                              mainModuleId = mod.id;
                            }
                          }
                        }

                        const customObj = dynamicFields[mainModuleId]?.[selectedDynModule] || {};
                        const customFieldsArr = Object.keys(customObj).map(k => ({ id: k, ...customObj[k] }));

                        let defaultFields: any[] = [];
                        for (const mainModule in DEFAULT_DYNAMIC_FIELDS) {
                          if (DEFAULT_DYNAMIC_FIELDS[mainModule as keyof typeof DEFAULT_DYNAMIC_FIELDS][selectedDynModule]) {
                            const hiddenDefaults = institute?.dynamicFields?.hiddenDefaults?.[mainModule]?.[selectedDynModule] || {};
                            defaultFields = DEFAULT_DYNAMIC_FIELDS[mainModule as keyof typeof DEFAULT_DYNAMIC_FIELDS][selectedDynModule]
                              .filter(f => !hiddenDefaults[f.id])
                              .map(f => ({ ...f, isDefault: true }));
                            break;
                          }
                        }
                        const allFields = [...defaultFields, ...customFieldsArr];
                        return allFields.length === 0 ? (
                          <div className="py-6 text-center text-[12px] font-medium text-slate-400 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                            No fields available for this module yet.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {allFields.map((f: any) => (
                              <div key={f.id} className="flex flex-col p-3 rounded-xl border border-slate-200 bg-white shadow-sm gap-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[13px] font-bold text-slate-800">{f.label}</span>
                                    {f.required && <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-rose-50 text-rose-600 border-rose-100 font-bold uppercase tracking-widest">Req</Badge>}
                                    {f.isDefault && <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-emerald-50 text-emerald-600 border-emerald-100 font-bold uppercase tracking-widest">System</Badge>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500">{f.type}</div>
                                    <button onClick={() => handleDeleteDynamicField(selectedDynModule, f.id, f.isDefault)} className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-md hover:bg-rose-50">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                                {(f.placeholder || (f.options && f.options.length > 0)) && (
                                  <div className="text-[11px] text-slate-500 font-medium space-x-2">
                                    {f.placeholder && <span>Placeholder: <span className="text-slate-400">{f.placeholder}</span></span>}
                                    {f.options && f.options.length > 0 && <span>Options: <span className="text-slate-400">{f.options.join(', ')}</span></span>}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                    </div>

                  </div>
                )}
              </Card>

              {/* Right Col: Mobile Preview Frame */}
              <div className="lg:col-span-4 flex justify-center lg:sticky lg:top-4">
                <div className="relative w-[280px] h-[580px] bg-white rounded-[3rem] border-[8px] border-slate-900 shadow-xl overflow-hidden shrink-0">
                  {/* Mobile Notch */}
                  <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-20">
                    <div className="w-32 h-5 bg-slate-900 rounded-b-2xl" />
                  </div>

                  {/* Mobile Screen Content */}
                  <div className="absolute inset-0 bg-slate-50 overflow-y-auto custom-scrollbar flex flex-col pt-8">
                    {/* Header */}
                    <div className="px-5 pb-4 border-b border-slate-200 bg-white shadow-sm z-10 sticky top-0">
                      <h2 className="text-[16px] font-bold text-slate-800 tracking-tight leading-tight mt-2">
                        {selectedDynModule ? (PERMISSION_GROUPS.flatMap(g => g.modules).flatMap(m => [m, ...(m.submodules || [])]).find(m => m.id === selectedDynModule)?.label || 'Module form') : 'Preview'}
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">Add new entry</p>
                    </div>

                    {/* Form Preview */}
                    <div className="p-4 space-y-4">
                      {!selectedDynModule && (
                        <div className="text-center text-[12px] font-medium text-slate-400 mt-10 px-4">
                          Select a module to view the form preview.
                        </div>
                      )}
                      {selectedDynModule && (() => {
                        let mainModuleId = selectedDynModule;
                        for (const group of PERMISSION_GROUPS) {
                          for (const mod of group.modules) {
                            if (mod.submodules?.some(s => s.id === selectedDynModule)) {
                              mainModuleId = mod.id;
                            }
                          }
                        }

                        const customObj = dynamicFields[mainModuleId]?.[selectedDynModule] || {};
                        const customFieldsArr = Object.keys(customObj).map(k => ({ id: k, ...customObj[k] }));

                        let defaultFields: any[] = [];
                        for (const mainModule in DEFAULT_DYNAMIC_FIELDS) {
                          if (DEFAULT_DYNAMIC_FIELDS[mainModule as keyof typeof DEFAULT_DYNAMIC_FIELDS][selectedDynModule]) {
                            const hiddenDefaults = institute?.dynamicFields?.hiddenDefaults?.[mainModule]?.[selectedDynModule] || {};
                            defaultFields = DEFAULT_DYNAMIC_FIELDS[mainModule as keyof typeof DEFAULT_DYNAMIC_FIELDS][selectedDynModule]
                              .filter(f => !hiddenDefaults[f.id])
                              .map(f => ({ ...f, isDefault: true }));
                            break;
                          }
                        }
                        const allFields = [...defaultFields, ...customFieldsArr];
                        return allFields.map((f: any) => (
                          <div key={`prev-${f.id}`} className="space-y-1.5">
                            <Label className="text-[12px] font-bold text-slate-700 flex items-center gap-1">
                              {f.label} {f.required && <span className="text-rose-500">*</span>}
                            </Label>

                            {f.type === 'textarea' ? (
                              <Textarea className="min-h-[80px] text-[13px] rounded-xl bg-white focus-visible:ring-1 border-slate-200" placeholder={f.placeholder} disabled />
                            ) : f.type === 'dropdown' || f.type === 'select' ? (
                              <Select disabled>
                                <SelectTrigger className="h-10 text-[13px] rounded-xl bg-white focus-visible:ring-1 border-slate-200">
                                  <SelectValue placeholder={f.placeholder || "Select option..."} />
                                </SelectTrigger>
                              </Select>
                            ) : f.type === 'file' ? (
                              <div className="h-10 border border-slate-200 border-dashed rounded-xl bg-white flex items-center justify-center text-[12px] font-medium text-slate-400">
                                Upload File
                              </div>
                            ) : (
                              <Input type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'} className="h-10 text-[13px] rounded-xl bg-white focus-visible:ring-1 border-slate-200" placeholder={f.placeholder || (f.type === 'date' ? 'dd-mm-yyyy' : '')} disabled />
                            )}
                          </div>
                        ))
                      })()}

                      {selectedDynModule && (
                        <Button disabled className="w-full mt-6 h-10 rounded-xl bg-slate-900 text-white font-bold text-[13px] opacity-90">
                          Submit Entry
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ═══ ACTIVITY LOGS TAB ═══ */}
        {activeTab === 'activity' && (
          <Card className="bg-white border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 p-6 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                <Activity className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h3 className="text-[15px] font-semibold text-slate-800">Activity Timeline</h3>
                <p className="text-[11px] font-medium text-slate-400 mt-0.5">All actions and modifications</p>
              </div>
              <Badge className="bg-slate-50 text-slate-500 text-[11px] font-semibold px-3 py-1 rounded-full border border-slate-200/60">
                {[...activityLogs, ...instituteSupportLogs].length} events
              </Badge>
            </div>

            <div className="p-6">
              {[...activityLogs, ...instituteSupportLogs].length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mb-4">
                    <Activity className="w-8 h-8" />
                  </div>
                  <p className="text-[14px] font-semibold text-slate-500 mb-1">No activity recorded</p>
                  <p className="text-[12px] text-slate-400 font-medium">Actions will appear here as they occur</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[19px] top-4 bottom-4 w-px bg-gradient-to-b from-indigo-200 via-slate-200 to-transparent" />

                  <div className="space-y-1">
                    {[...activityLogs, ...instituteSupportLogs].sort((a, b) => b.timestamp - a.timestamp).map((log, i) => (
                      <div key={log.id} className="relative flex items-start gap-5 group py-3 px-3 rounded-xl hover:bg-slate-50/50 transition-all duration-200">
                        {/* Icon Dot */}
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center relative z-10 shrink-0 transition-all duration-300 border",
                          i === 0
                            ? "bg-indigo-50 text-indigo-600 border-indigo-100 shadow-sm"
                            : "bg-white text-slate-400 border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-500 group-hover:border-indigo-100"
                        )}>
                          {activityIcon(log.action)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pt-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Badge variant="outline" className={cn(
                              "text-[10px] font-bold px-2 py-0 rounded-full border",
                              activityBadgeColor(log.action)
                            )}>
                              {log.action}
                            </Badge>
                            <span className="text-[11px] font-medium text-slate-400">
                              {log.timestamp ? formatDistanceToNow(log.timestamp, { addSuffix: true }) : 'Just now'}
                            </span>
                          </div>
                          <p className="text-[13px] font-medium text-slate-600 leading-relaxed">{log.description || log.notes}</p>
                          <p className="text-[11px] font-medium text-slate-400 mt-1.5 flex items-center gap-1.5">
                            <User className="w-3 h-3" />
                            {log.user || log.agentEmail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ═══ SUPPORT TICKETS TAB ═══ */}
        {activeTab === 'support' && (
          <div className="space-y-6">
            <Card className="bg-white border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-2xl overflow-hidden">
               <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <Ticket className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-slate-800">Support Tickets</h3>
                      <p className="text-[11px] font-medium text-slate-400 mt-0.5">Formal issues raised by this institute</p>
                    </div>
                  </div>
               </div>

               <div className="overflow-x-auto">
                 <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-slate-100 h-11">
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-6">Ticket ID</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Module</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Issue Type</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right pr-6">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const tickets = institute?.support_tickets ? Object.keys(institute.support_tickets).map(k => ({ id: k, ...institute.support_tickets[k] })).sort((a,b) => b.raised_at - a.raised_at) : []
                        
                        if (tickets.length === 0) return (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-16">
                              <div className="flex flex-col items-center gap-2 text-slate-400 font-medium">
                                <Ticket className="w-8 h-8 opacity-20 mb-2" />
                                <p className="text-sm">No support tickets found</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )

                        return tickets.map((t) => (
                          <TableRow key={t.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="pl-6 py-4">
                               <span className="text-[13px] font-black text-indigo-600">{t.ticket_id}</span>
                            </TableCell>
                            <TableCell className="text-[12px] font-medium text-slate-500">
                               {format(new Date(t.raised_at), "MMM dd, yyyy HH:mm")}
                            </TableCell>
                            <TableCell>
                               <Badge variant="outline" className="bg-slate-50 text-[10px] font-bold uppercase">{t.module}</Badge>
                            </TableCell>
                            <TableCell className="text-[12px] font-medium text-slate-600">
                               {t.issue_type}
                            </TableCell>
                            <TableCell>
                               <Badge className={cn(
                                 "text-[10px] font-black uppercase px-2 py-0.5 rounded-full border",
                                 t.status === 'Open' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                 t.status === 'In Progress' ? "bg-blue-50 text-blue-600 border-blue-100" :
                                 "bg-emerald-50 text-emerald-600 border-emerald-100"
                               )}>
                                 {t.status}
                               </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                               <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => { setSelectedTicket(t); setIsTicketModalOpen(true); }}
                                className="h-8 px-3 text-[11px] font-bold text-slate-500 hover:text-indigo-600"
                               >
                                 View Details
                               </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      })()}
                    </TableBody>
                 </Table>
               </div>
            </Card>
          </div>
        )}
      </div>

      {/* ═══ CREDENTIALS & ACCESS TAB ═══ */}
      {activeTab === 'credentials' && (
        <div className="space-y-6">

          {/* ── Main Admin Credentials Card ── */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="flex items-center gap-3 p-6 pb-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100/60 flex items-center justify-center text-indigo-600">
                <ShieldCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-slate-800">Main Admin Credentials</h3>
                <p className="text-[11px] font-medium text-slate-400 mt-0.5">Primary institute administrator account</p>
              </div>
              <div className="ml-auto">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${mainAdmin.status?.toLowerCase() === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${mainAdmin.status?.toLowerCase() === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {mainAdmin.status}
                </span>
              </div>
            </div>

            <div className="p-6">
              {/* Admin Avatar Row */}
              <div className="flex items-center gap-4 mb-6 pb-5 border-b border-slate-100">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-md shadow-indigo-200/40 shrink-0">
                  {(mainAdmin.name || 'A')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-[17px] font-bold text-slate-900">{mainAdmin.name}</p>
                  <p className="text-[12px] font-medium text-slate-400 mt-0.5">{mainAdmin.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[
                  { label: 'Admin Name', value: mainAdmin.name, icon: User },
                  { label: 'Email Address', value: mainAdmin.email, icon: Mail },
                  { label: 'Username', value: mainAdmin.username, icon: Hash },
                ].map((field, i) => (
                  <div key={i} className="group">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                      <field.icon className="w-3 h-3" /> {field.label}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold text-slate-800 flex-1 truncate">{field.value}</p>
                      <button
                        onClick={() => copyToClipboard(field.value, `${field.label} copied`)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="lg:col-span-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3 h-3" /> Password
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100 font-mono text-[14px] font-semibold min-h-[44px]">
                      {visiblePasswords['main_admin']
                        ? (mainAdminRawPassword
                          ? <span className="text-slate-800 tracking-widest">{mainAdminRawPassword}</span>
                          : <span className="text-slate-400 text-[12px] italic font-sans font-medium">No password stored — use Reset to set one</span>
                        )
                        : <span className="text-slate-500 tracking-[6px]">{mainAdminRawPassword ? '••••••••••••' : '— not set —'}</span>
                      }
                    </div>
                    <button
                      onClick={() => togglePasswordVisibility('main_admin')}
                      className={`p-2.5 border rounded-xl transition-all duration-200 ${visiblePasswords['main_admin']
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                        : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200'
                        }`}
                      title={visiblePasswords['main_admin'] ? 'Hide password' : 'Show password'}
                    >
                      {visiblePasswords['main_admin'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {mainAdminRawPassword && (
                      <button
                        onClick={() => copyToClipboard(mainAdminRawPassword, 'Password copied!')}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all duration-200"
                        title="Copy password"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {mainAdmin.lastPasswordUpdate && (
                    <p className="text-[11px] text-slate-400 font-medium mt-1.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Last updated: {formatDistanceToNow(mainAdmin.lastPasswordUpdate, { addSuffix: true })}
                    </p>
                  )}
                  {!mainAdminRawPassword && (
                    <p className="text-[11px] text-amber-600 font-semibold mt-1.5 flex items-center gap-1">
                      ⚠ Password not stored in database. Click Reset Password to set a new one.
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Quick Actions</p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleOpenReset(mainAdmin)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-[12px] font-bold hover:bg-indigo-100 transition-all duration-200"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Reset Password
                    </button>
                    <button
                      onClick={() => { setEmailTarget({ ...mainAdmin, password: mainAdminRawPassword }); setIsSendEmailModalOpen(true) }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-[12px] font-bold hover:bg-emerald-100 transition-all duration-200"
                    >
                      <Send className="w-3.5 h-3.5" /> Send Credentials Email
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Branch Admin Credentials Table ── */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100/60 flex items-center justify-center text-violet-600">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-slate-800">Branch Admin Credentials</h3>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">{branchAdmins.length} branch{branchAdmins.length !== 1 ? 'es' : ''} found</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/60 border-b border-slate-100">
                  <tr>
                    {['Branch Name', 'Admin Name', 'Email', 'Username', 'Password', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {branchAdmins.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <MapPin className="w-6 h-6 text-slate-300" />
                          </div>
                          <p className="text-[13px] font-semibold">No branches configured</p>
                          <p className="text-[11px] font-medium text-slate-400">Branch admins will appear here once branches are added</p>
                        </div>
                      </td>
                    </tr>
                  ) : branchAdmins.map((branch) => (
                    <tr key={branch.id} className="hover:bg-slate-50/50 transition-colors duration-150 group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                            <MapPin className="w-3.5 h-3.5 text-violet-600" />
                          </div>
                          <span className="text-[13px] font-semibold text-slate-800 whitespace-nowrap">{branchDisplayName(branch)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[13px] font-medium text-slate-700">{branch.adminName || branch.contactPerson || branchDisplayName(branch)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[12px] font-medium text-slate-600">{branchEmail(branch)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[12px] font-mono font-semibold text-slate-700">{branchUsername(branch)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-mono font-semibold min-w-[90px]">
                            {visiblePasswords[branch.id]
                              ? (branchPassword(branch)
                                ? <span className="text-slate-800 tracking-wide">{branchPassword(branch)}</span>
                                : <span className="text-slate-400 text-[11px] font-sans italic">Not set</span>
                              )
                              : <span className="text-slate-500 tracking-[4px]">{branchPassword(branch) ? '••••••••' : '——'}</span>
                            }
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(branch.id)}
                            className={`p-1.5 rounded-lg transition-all ${visiblePasswords[branch.id] ? 'bg-indigo-50 text-indigo-500' : 'hover:bg-slate-100 text-slate-300 hover:text-slate-600'
                              }`}
                          >
                            {visiblePasswords[branch.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          {branchPassword(branch) && (
                            <button
                              onClick={() => copyToClipboard(branchPassword(branch), 'Password copied!')}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-300 hover:text-indigo-500 transition-all"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${branch.status === 'disabled' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${branch.status === 'disabled' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                          {branch.status === 'disabled' ? 'Disabled' : 'Active'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenReset({ ...branch, role: 'branch', name: branchDisplayName(branch) })}
                            className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all" title="Reset Password"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => copyToClipboard(`Email: ${branchEmail(branch)}\nPassword: ${branchPassword(branch) || 'Not set'}`, 'Credentials copied!')}
                            className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all" title="Copy Credentials"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setEmailTarget({ ...branch, role: 'branch', name: branchDisplayName(branch), email: branchEmail(branch), password: branchPassword(branch) }); setIsSendEmailModalOpen(true) }}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all" title="Send Email"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus({ ...branch, role: 'branch', name: branchDisplayName(branch) })}
                            className={`p-1.5 rounded-lg transition-all ${branch.status === 'disabled' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}
                            title={branch.status === 'disabled' ? 'Enable Access' : 'Disable Access'}
                          >
                            {branch.status === 'disabled' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Teacher Credentials Table ── */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100/60 flex items-center justify-center text-amber-600">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-slate-800">Teacher & Staff Credentials</h3>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">{filteredTeachers.length} of {teachers.length} staff shown</p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    value={teacherSearch}
                    onChange={e => setTeacherSearch(e.target.value)}
                    placeholder="Search teachers..."
                    className="w-full h-9 pl-9 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-[13px] font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all duration-200"
                  />
                </div>
                <select
                  value={teacherBranchFilter}
                  onChange={e => setTeacherBranchFilter(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-[13px] font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all duration-200"
                >
                  <option value="all">All Branches</option>
                  {branchAdmins.map(b => (
                    <option key={b.id} value={b.id}>{b.branchName || b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/60 border-b border-slate-100">
                  <tr>
                    {['Teacher Name', 'Branch', 'Email', 'Username', 'Password', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <GraduationCap className="w-6 h-6 text-slate-300" />
                          </div>
                          <p className="text-[13px] font-semibold text-slate-500">
                            {teacherSearch || teacherBranchFilter !== 'all' ? 'No results match your filter' : 'No staff records found'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredTeachers.map((teacher) => {
                    const tName = teacherDisplayName(teacher)
                    const tPwd = teacherPassword(teacher)
                    return (
                      <tr key={teacher.id} className="hover:bg-slate-50/50 transition-colors duration-150 group">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            {teacher.profileImage || teacher.photo ? (
                              <img src={teacher.profileImage || teacher.photo} alt={tName} className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                                {tName[0]?.toUpperCase() || 'T'}
                              </div>
                            )}
                            <div>
                              <p className="text-[13px] font-semibold text-slate-800 whitespace-nowrap">{tName}</p>
                              <p className="text-[10px] font-medium text-slate-400">{teacher.designation || teacher.jobTitle || teacher.role || 'Staff'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[12px] font-medium text-slate-600 whitespace-nowrap">
                            {branchAdmins.find(b => b.id === teacher.branchId)?.branchName || teacher.branch || '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[12px] font-medium text-slate-600">{teacherEmail(teacher)}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[12px] font-mono font-semibold text-slate-700">{teacherUsername(teacher)}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-mono font-semibold min-w-[90px]">
                              {visiblePasswords[teacher.id]
                                ? (tPwd
                                  ? <span className="text-slate-800 tracking-wide">{tPwd}</span>
                                  : <span className="text-slate-400 text-[11px] font-sans italic">Not set</span>
                                )
                                : <span className="text-slate-500 tracking-[4px]">{tPwd ? '••••••••' : '——'}</span>
                              }
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(teacher.id)}
                              className={`p-1.5 rounded-lg transition-all ${visiblePasswords[teacher.id]
                                ? 'bg-indigo-50 text-indigo-500'
                                : 'hover:bg-slate-100 text-slate-300 hover:text-slate-600'
                                }`}
                            >
                              {visiblePasswords[teacher.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            {tPwd && (
                              <button
                                onClick={() => copyToClipboard(tPwd, 'Password copied!')}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-300 hover:text-indigo-500 transition-all"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${teacher.status === 'disabled' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${teacher.status === 'disabled' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            {teacher.status === 'disabled' ? 'Disabled' : 'Active'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenReset({ ...teacher, role: 'teacher', name: tName })}
                              className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all" title="Reset Password"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => { setEmailTarget({ ...teacher, role: 'teacher', name: tName, password: tPwd }); setIsSendEmailModalOpen(true) }}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all" title="Send Email"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus({ ...teacher, role: 'teacher', name: tName })}
                              className={`p-1.5 rounded-lg transition-all ${teacher.status === 'disabled' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}
                              title={teacher.status === 'disabled' ? 'Enable Access' : 'Disable Access'}
                            >
                              {teacher.status === 'disabled' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                  }
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Security Notice ── */}
          <div className="flex items-start gap-3 p-4 bg-amber-50/60 border border-amber-100 rounded-2xl">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-amber-800">Security Notice</p>
              <p className="text-[12px] font-medium text-amber-700/80 mt-0.5 leading-relaxed">
                Passwords shown are stored credentials from your system. For best security, always use "Reset Password" to set strong new credentials and send via the secure email template. Avoid sharing credentials through unsecured channels.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SUPPORT TICKETS TAB ═══ */}
      {activeTab === 'support' && (
        <Card className="bg-white border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-2xl overflow-hidden mt-6">
          <div className="p-6 md:p-8 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                <Ticket className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-slate-800">Support Tickets</h3>
                <p className="text-[12px] font-medium text-slate-500 mt-0.5">Manage support inquiries for this client</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-slate-100 border-b">
                  <TableHead className="px-6 h-12 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ticket ID</TableHead>
                  <TableHead className="h-12 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Module & Issue</TableHead>
                  <TableHead className="h-12 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</TableHead>
                  <TableHead className="h-12 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Priority</TableHead>
                  <TableHead className="h-12 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</TableHead>
                  <TableHead className="h-12 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instituteSupportLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500 text-[13px]">
                      No support tickets found for this institute.
                    </TableCell>
                  </TableRow>
                ) : (
                  instituteSupportLogs.filter(log => log.ticket_id || log.title).map((ticket) => (
                    <TableRow key={ticket.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="px-6 py-4">
                        <span className="text-[13px] font-bold text-indigo-600">{ticket.ticket_id || 'TKT-MANUAL'}</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="text-[13px] font-semibold text-slate-800">{ticket.module || '-'}</span>
                          <span className="text-[11px] text-slate-500 mt-0.5">{ticket.title || ticket.issueType || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className={cn(
                          "px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
                          ticket.status === 'Closed' ? "bg-slate-50 text-slate-600 border-slate-200"
                            : ticket.status === 'Resolved' ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                              : "bg-amber-50 text-amber-600 border-amber-200"
                        )}>
                          {ticket.status || 'Open'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold border-none",
                          ticket.priority === 'High' ? "bg-rose-50 text-rose-600" :
                            ticket.priority === 'Medium' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                        )}>
                          {ticket.priority || 'Medium'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="text-[12px] font-medium text-slate-700">{ticket.timestamp ? format(new Date(ticket.timestamp), "MMM dd, yyyy") : '-'}</span>
                          <span className="text-[10px] text-slate-500 mt-0.5">{ticket.timestamp ? formatDistanceToNow(new Date(ticket.timestamp), { addSuffix: true }) : ''}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedTicket(ticket); setIsTicketModalOpen(true); }} className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-semibold h-8 text-[11px]">View Details</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* ── Payment Entry Modal ── */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-y-auto border-none rounded-2xl bg-white shadow-2xl">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight text-white">Record Payment</DialogTitle>
                <p className="text-white/70 text-[12px] font-medium mt-0.5">Add a manual payment entry</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Amount (₹)</Label>
                <Input type="number" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder="0.00" className="h-11 rounded-xl border-slate-200 font-semibold text-[15px] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Date</Label>
                  <Input type="date" value={paymentForm.date} onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })} className="h-11 rounded-xl border-slate-200 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Mode</Label>
                  <Select value={paymentForm.mode} onValueChange={v => setPaymentForm({ ...paymentForm, mode: v })}>
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl">
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Online">Online</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Notes (Optional)</Label>
                <Input value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} placeholder="Transaction reference..." className="h-11 rounded-xl border-slate-200 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200" />
              </div>
            </div>
            <Button onClick={handleAddPayment} disabled={isSubmitting || !paymentForm.amount} className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-semibold shadow-sm transition-all duration-200 active:scale-[0.98]">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Record Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Suspend Confirmation Modal ── */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-y-auto border-none rounded-2xl bg-white shadow-2xl">
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto mb-4">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 mb-2">Suspend Client?</DialogTitle>
            <DialogDescription className="text-[13px] text-slate-500 font-medium leading-relaxed">
              This will restrict all access for this client. You can reactivate later.
            </DialogDescription>
          </div>
          <div className="px-6 pb-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Reason</Label>
              <Textarea
                placeholder="Enter reason for suspension..."
                value={statusReason}
                onChange={e => setStatusReason(e.target.value)}
                className="rounded-xl border-slate-200 min-h-[100px] resize-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300 font-medium text-[14px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsStatusModalOpen(false)} className="flex-1 h-11 rounded-xl border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all duration-200">
                Cancel
              </Button>
              <Button onClick={handleUpdateStatus} disabled={isSubmitting || !statusReason} className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm transition-all duration-200 active:scale-[0.98]">
                Confirm Suspend
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Domain Confirmation Modal ── */}
      <Dialog open={isDomainModalOpen} onOpenChange={setIsDomainModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-y-auto border-none rounded-2xl bg-white shadow-2xl">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white text-center">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight text-white mb-2">Confirm DNS Setup</DialogTitle>
          </div>
          <div className="px-6 py-6 text-center space-y-4">
            <DialogDescription className="text-[14px] text-slate-700 font-medium leading-relaxed">
              Have you updated your domain nameservers to Vercel?
            </DialogDescription>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-left">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                  ns1.vercel-dns.com
                </div>
                <div className="flex items-center gap-2 text-[13px] font-semibold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                  ns2.vercel-dns.com
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsDomainModalOpen(false)} className="flex-1 h-11 rounded-xl border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all duration-200">
                Cancel
              </Button>
              <Button onClick={handleVerifyDomain} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-semibold shadow-sm transition-all duration-200 active:scale-[0.98]">
                Yes, Verify Domain
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Ticket Details Modal ── */}
      <Dialog open={isTicketModalOpen} onOpenChange={setIsTicketModalOpen}>
        <DialogContent className="sm:max-w-xl p-0 overflow-y-auto border-none rounded-2xl bg-white shadow-2xl font-body">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <Ticket className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight text-white">{selectedTicket?.ticket_id || 'TKT-MANUAL'}</DialogTitle>
                <p className="text-indigo-100 text-[12px] font-medium mt-0.5">{selectedTicket?.module || 'System'} Issue</p>
              </div>
            </div>
            <Badge className={cn("border-none text-[11px] font-bold shadow-sm",
              selectedTicket?.priority === 'High' ? "bg-rose-500 text-white" :
                selectedTicket?.priority === 'Medium' ? "bg-amber-500 text-amber-50" : "bg-blue-500 text-white"
            )}>
              {selectedTicket?.priority || 'Medium'} Priority
            </Badge>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Issue Overview</h4>
                <p className="text-[15px] font-bold text-slate-800 tracking-tight">{selectedTicket?.title || selectedTicket?.issueType}</p>
                <p className="text-[13px] font-medium text-slate-600 mt-2 bg-slate-50/80 p-4 rounded-xl border border-slate-100/60 leading-relaxed">{selectedTicket?.description || selectedTicket?.notes || "No description provided."}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="pt-2">
                  <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Reporter Details</h4>
                  <div className="bg-white border border-slate-200/60 shadow-sm rounded-xl p-3.5 space-y-0.5">
                    <p className="text-[13px] font-bold text-slate-800">{selectedTicket?.userDetails?.name || selectedTicket?.user || selectedTicket?.agentEmail || "Super Admin"}</p>
                    <p className="text-[12px] font-medium text-slate-500 flex items-center gap-1.5"><Mail className="w-3 h-3 text-slate-400" /> {selectedTicket?.userDetails?.email || selectedTicket?.user || "N/A"}</p>
                    <p className="text-[12px] font-medium text-slate-500 flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-400" /> {selectedTicket?.userDetails?.mobile || "N/A"}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Status Management</h4>
                  <Select
                    value={selectedTicket?.status || "Open"}
                    onValueChange={handleUpdateTicketStatus}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 shadow-sm font-semibold text-[13px] text-slate-700 hover:bg-slate-50 transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl border-slate-100">
                      <SelectItem value="Open" className="font-semibold text-slate-700 text-[13px]">Open</SelectItem>
                      <SelectItem value="In Progress" className="font-semibold text-slate-700 text-[13px]">In Progress</SelectItem>
                      <SelectItem value="Resolved" className="font-semibold text-emerald-600 text-[13px]">Resolved</SelectItem>
                      <SelectItem value="Closed" className="font-semibold text-slate-500 text-[13px]">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] font-semibold text-slate-400 mt-3 text-right">
                    Reported: {selectedTicket?.timestamp ? format(new Date(selectedTicket.timestamp), "PP p") : "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-1 flex flex-col items-center">
              <Button onClick={() => setIsTicketModalOpen(false)} variant="ghost" className="w-full text-slate-500 font-bold hover:text-slate-700 hover:bg-slate-50 rounded-xl h-11 transition-all text-[13px]">
                Close Panel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Password Reset Modal ── */}
      <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-y-auto border-none rounded-2xl bg-white shadow-2xl">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight text-white">Reset Password</DialogTitle>
                <p className="text-white/70 text-[12px] font-medium mt-0.5">{resetTarget?.name || 'User'}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Auto Generate Option */}
            <div
              onClick={handleAutoGenerate}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${resetForm.autoGenerate ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:border-indigo-200 hover:bg-indigo-50/50'
                }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${resetForm.autoGenerate ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                }`}>
                {resetForm.autoGenerate && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-bold text-slate-800">Auto-generate strong password</p>
                {generatedPassword && (
                  <p className="text-[12px] font-mono font-semibold text-indigo-600 mt-0.5 tracking-wider">{generatedPassword}</p>
                )}
              </div>
              <RefreshCw className={`w-4 h-4 ${resetForm.autoGenerate ? 'text-indigo-600' : 'text-slate-400'}`} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">New Password</label>
              <input
                type="text"
                value={resetForm.newPassword}
                onChange={e => setResetForm(f => ({ ...f, newPassword: e.target.value, autoGenerate: false }))}
                placeholder="Enter new password"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-[14px] font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 font-mono transition-all duration-200"
              />
              {/* Strength Indicator */}
              {resetForm.newPassword && (() => {
                const score = passwordStrength(resetForm.newPassword)
                const str = strengthLabel(score)
                return (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${score >= i ? str.color : 'bg-slate-100'}`} />
                      ))}
                    </div>
                    <p className={`text-[11px] font-bold ${str.text}`}>{str.label} password</p>
                  </div>
                )
              })()}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Confirm Password</label>
              <input
                type="text"
                value={resetForm.confirmPassword}
                onChange={e => setResetForm(f => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="Re-enter password"
                className={`w-full h-11 px-4 rounded-xl border text-[14px] font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono transition-all duration-200 ${resetForm.confirmPassword && resetForm.newPassword !== resetForm.confirmPassword
                  ? 'border-rose-300 bg-rose-50/30 focus:border-rose-400'
                  : 'border-slate-200 bg-white focus:border-indigo-300'
                  }`}
              />
              {resetForm.confirmPassword && resetForm.newPassword !== resetForm.confirmPassword && (
                <p className="text-[11px] font-semibold text-rose-500">Passwords do not match</p>
              )}
            </div>

            {/* Send email option */}
            <div
              onClick={() => setResetForm(f => ({ ...f, sendEmail: !f.sendEmail }))}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${resetForm.sendEmail ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'
                }`}>
                {resetForm.sendEmail && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              <div className="flex items-center gap-2">
                <Send className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <p className="text-[13px] font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">Send credentials via email after reset</p>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-semibold text-[13px] hover:bg-slate-50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                disabled={!resetForm.newPassword || resetForm.newPassword !== resetForm.confirmPassword || !!credentialActioning}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-[13px] shadow-sm shadow-indigo-200/50 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {credentialActioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                Confirm Reset
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Send Credentials Email Modal ── */}
      <Dialog open={isSendEmailModalOpen} onOpenChange={setIsSendEmailModalOpen}>
        <DialogContent className="sm:max-w-xl p-0 overflow-y-auto border-none rounded-2xl bg-white shadow-2xl">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight text-white">Send Credentials Email</DialogTitle>
                <p className="text-white/70 text-[12px] font-medium mt-0.5">Preview the email that will be sent</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Recipient Field */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Recipient Email</label>
              <input
                type="email"
                defaultValue={emailTarget?.email || ''}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-[14px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all duration-200"
              />
            </div>

            {/* Email Template Preview */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Email Template Preview</span>
              </div>
              <div className="p-5 space-y-4 bg-white">
                {/* Email Header */}
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-slate-800">{institute?.profile?.instituteName || 'Your Institute'}</p>
                    <p className="text-[11px] font-medium text-slate-400">Login Credentials — Confidential</p>
                  </div>
                </div>

                {/* Greeting */}
                <p className="text-[13px] font-medium text-slate-600 leading-relaxed">
                  Dear <span className="font-bold text-slate-800">{emailTarget?.name || 'User'}</span>,<br />
                  Your login credentials for <span className="font-bold text-indigo-600">{institute?.profile?.instituteName}</span> have been set up. Please find your access details below:
                </p>

                {/* Credential Box */}
                <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-xl border border-slate-200/60 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">🏫 Institute</span>
                    <span className="text-[13px] font-bold text-slate-800">{institute?.profile?.instituteName || '—'}</span>
                  </div>
                  {emailTarget?.email && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">📧 Email / ID</span>
                      <span className="text-[13px] font-semibold text-slate-700 font-mono">{emailTarget.email}</span>
                    </div>
                  )}
                  {(emailTarget?.username || emailTarget?.email) && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">👤 Username</span>
                      <span className="text-[13px] font-semibold text-slate-700 font-mono">{emailTarget?.username || emailTarget?.email?.split('@')[0]}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">🔑 Password</span>
                    <span className="text-[14px] font-bold text-indigo-700 font-mono tracking-widest bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                      {emailTarget?.newPassword || emailTarget?.password || '••••••••'}
                    </span>
                  </div>
                  {emailTarget?.role && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">🎭 Role</span>
                      <span className="text-[12px] font-semibold text-slate-600 capitalize">{emailTarget.role === 'admin' ? 'Main Admin' : emailTarget.role === 'branch' ? 'Branch Admin' : 'Staff / Teacher'}</span>
                    </div>
                  )}
                </div>

                <p className="text-[12px] font-medium text-slate-500 leading-relaxed">
                  🔒 Please change your password after first login. Do not share your credentials with anyone.
                </p>

                <div className="text-[11px] text-slate-400 font-medium border-t border-slate-100 pt-3">
                  This email was sent by Super Admin • {institute?.profile?.instituteName} • {format(new Date(), 'PPP')}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsSendEmailModalOpen(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-semibold text-[13px] hover:bg-slate-50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast({ title: 'Email Sent!', description: `Credentials sent to ${emailTarget?.email || emailTarget?.name}` })
                  setIsSendEmailModalOpen(false)
                }}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-[13px] shadow-sm shadow-emerald-200/50 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> Send Email Now
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

        {/* ═══ BRANDING CONTROL TAB ═══ */}
        {activeTab === 'branding' && (
          <BrandingTab instituteId={id as string} />
        )}

        {/* ═══ PAID FEATURES TAB ═══ */}
        {activeTab === 'paid-features' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
                  <Gem className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Paid Features</h2>
                  <p className="text-sm text-slate-400">Manage premium feature access for this institute</p>
                </div>
              </div>
            </div>

            {/* Website Builder Feature Card */}
            {(() => {
              const wb = institutePaidFeatures?.website_builder
              const isActive = wb?.active === true
              return (
                <div className={cn(
                  "rounded-2xl border-2 overflow-hidden transition-all",
                  isActive ? "border-violet-200 shadow-md shadow-violet-100" : "border-slate-100"
                )}>
                  <div className={cn(
                    "p-5 flex items-center justify-between",
                    isActive ? "bg-gradient-to-r from-violet-50 to-purple-50" : "bg-slate-50"
                  )}>
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center",
                        isActive ? "bg-violet-100" : "bg-slate-200"
                      )}>
                        <Globe className={cn("w-6 h-6", isActive ? "text-violet-600" : "text-slate-400")} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-800">Website Builder</h3>
                          <span className={cn(
                            "text-xs font-semibold px-2 py-0.5 rounded-full",
                            isActive ? "bg-violet-100 text-violet-700" : "bg-slate-200 text-slate-500"
                          )}>
                            {isActive ? '✅ Active' : '❌ Inactive'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">AI-powered website builder for educational institutes</p>
                        {isActive && wb?.assignedAt && (
                          <p className="text-xs text-violet-500 mt-1 font-medium">
                            Assigned {format(new Date(wb.assignedAt), 'MMM d, yyyy')} · {wb.billingType || 'One-time'} · ₹{wb.price?.toLocaleString() || '4,999'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isActive ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isPaidFeatureSaving}
                          onClick={async () => {
                            if (!database) return
                            setIsPaidFeatureSaving(true)
                            try {
                              await update(ref(database, `Institutes/${id}/paidFeatures/website_builder`), {
                                active: false, showInSidebar: false, revokedAt: Date.now()
                              })
                              await logActivity('PAID_FEATURE_REVOKED', 'Website Builder access revoked')
                              toast({ title: 'Feature Revoked' })
                            } catch { toast({ variant: 'destructive', title: 'Error' }) }
                            finally { setIsPaidFeatureSaving(false) }
                          }}
                          className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200"
                        >
                          <XCircle className="w-4 h-4 mr-1.5" />
                          Revoke Access
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={isPaidFeatureSaving}
                          onClick={async () => {
                            if (!database) return
                            setIsPaidFeatureSaving(true)
                            try {
                              await set(ref(database, `Institutes/${id}/paidFeatures/website_builder`), {
                                active: true,
                                assignedAt: Date.now(),
                                expiresAt: null,
                                paymentStatus: 'paid',
                                showInSidebar: true,
                                showAsDashboardCard: true,
                                billingType: 'One-time',
                                assignedBy: user?.email || 'super_admin',
                                featureName: 'Website Builder',
                                featureKey: 'website_builder',
                                price: 4999
                              })
                              await logActivity('PAID_FEATURE_ASSIGNED', 'Website Builder access granted')
                              toast({ title: 'Feature Activated ✅', description: 'Website Builder has been enabled for this institute.' })
                            } catch { toast({ variant: 'destructive', title: 'Error' }) }
                            finally { setIsPaidFeatureSaving(false) }
                          }}
                          className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl border-0 shadow-md shadow-violet-200"
                        >
                          {isPaidFeatureSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Gem className="w-4 h-4 mr-1.5" />}
                          Activate Feature
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Detailed settings when active */}
                  {isActive && (
                    <div className="border-t border-violet-100 p-5 space-y-4 bg-white">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Feature Settings</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                          <div>
                            <p className="text-sm font-medium text-slate-700">Show in Sidebar</p>
                            <p className="text-xs text-slate-400">Visible in institute nav</p>
                          </div>
                          <Switch
                            checked={wb?.showInSidebar !== false}
                            onCheckedChange={async (v) => {
                              if (!database) return
                              await update(ref(database, `Institutes/${id}/paidFeatures/website_builder`), { showInSidebar: v })
                              toast({ title: v ? 'Added to Sidebar' : 'Removed from Sidebar' })
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                          <div>
                            <p className="text-sm font-medium text-slate-700">Dashboard Card</p>
                            <p className="text-xs text-slate-400">Show on institute dashboard</p>
                          </div>
                          <Switch
                            checked={wb?.showAsDashboardCard !== false}
                            onCheckedChange={async (v) => {
                              if (!database) return
                              await update(ref(database, `Institutes/${id}/paidFeatures/website_builder`), { showAsDashboardCard: v })
                              toast({ title: v ? 'Card Visible' : 'Card Hidden' })
                            }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        {[
                          { label: 'Payment', value: wb?.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending', color: wb?.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600' },
                          { label: 'Billing', value: wb?.billingType || 'One-time', color: 'text-slate-700' },
                          { label: 'Expires', value: wb?.expiresAt ? format(new Date(wb.expiresAt), 'MMM d, yyyy') : 'Never', color: 'text-slate-700' },
                        ].map(item => (
                          <div key={item.label} className="bg-slate-50 rounded-xl p-3">
                            <p className={cn("text-sm font-bold", item.color)}>{item.value}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{item.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}


      {/* ═══ TICKET DETAIL MODAL ═══ */}
      <Dialog open={isTicketModalOpen} onOpenChange={setIsTicketModalOpen}>
        <DialogContent className="max-w-2xl bg-white rounded-3xl p-0 gap-0 overflow-y-auto border-none shadow-2xl">
          {selectedTicket && (
            <div className="flex flex-col h-full">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 p-6 flex flex-col relative">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-[10px] font-black uppercase tracking-widest">{selectedTicket.module}</Badge>
                  <button onClick={() => setIsTicketModalOpen(false)} className="text-white/70 hover:text-white transition-colors">
                     <XCircle className="w-5 h-5" />
                  </button>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight leading-none mb-2">Ticket {selectedTicket.ticket_id}</h2>
                <div className="flex items-center gap-2 text-white/70 text-[11px] font-semibold">
                   <Clock className="w-3.5 h-3.5" /> Raised {format(new Date(selectedTicket.raised_at), "MMM dd, yyyy 'at' hh:mm a")}
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-8 space-y-8 overflow-y-auto max-h-[500px]">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Institute</p>
                    <p className="text-[15px] font-bold text-slate-800">{selectedTicket.institute_name}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Issue Category</p>
                    <p className="text-[15px] font-bold text-slate-800">{selectedTicket.issue_type}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Problem Description</p>
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[14px] font-medium text-slate-600 leading-relaxed italic">"{selectedTicket.problem}"</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Internal Status Control</p>
                  <div className="flex flex-wrap gap-3">
                    {['Open', 'In Progress', 'Resolved', 'Closed'].map((s) => (
                      <button
                        key={s}
                        onClick={async () => {
                          if (!database || !id) return
                          await update(ref(database, `Institutes/${id}/support_tickets/${selectedTicket.id}`), { status: s, last_update: Date.now() })
                          setSelectedTicket({ ...selectedTicket, status: s })
                          toast({ title: `Status: ${s}` })
                        }}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all",
                          selectedTicket.status === s 
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100" 
                            : "bg-white text-slate-400 border-slate-200 hover:border-indigo-300 hover:text-indigo-500"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsTicketModalOpen(false)} className="rounded-xl h-11 px-6 font-bold text-xs uppercase tracking-widest">Dismiss</Button>
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-11 px-6 font-bold text-xs uppercase tracking-widest">Update Ticket</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </main>
  )
}

// ── Reusable Field Input Component ──
function FieldInput({ label, value, onChange, type = "text", placeholder }: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div className="space-y-2 group">
      <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider pl-0.5 transition-colors duration-200 group-focus-within:text-indigo-600">
        {label}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 bg-white rounded-xl border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 font-medium px-4 text-[14px] transition-all duration-200"
      />
    </div>
  )
}
