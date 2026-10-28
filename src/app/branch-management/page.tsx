"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Building2,
  ShieldCheck,
  Mail,
  Lock,
  Layout,
  BarChart3,
  Settings2,
  Layers,
  Video,
  Wallet,
  UserCheck,
  GraduationCap,
  FileVideo,
  Library,
  Package,
  Receipt,
  Megaphone,
  Award,
  BellRing,
  Settings,
  CalendarDays,
  Database,
  Globe,
  Monitor,
  Info,
  Newspaper,
  MapPin,
  ClipboardList,
  UserPlus,
  FileText,
  Users,
  TrendingUp,
  Clock,
  Printer,
  AlertCircle,
  CreditCard
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, set, remove, off, update } from "firebase/database"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import Link from "next/link"

const PERMISSION_GROUPS = [
  {
    category: "Core ERP Modules",
    modules: [
      { id: 'dashboard', label: 'Dashboard', icon: Layout },
      { id: 'batch_management', label: 'Batch Management', icon: Layers },
      { id: 'live_classes', label: 'Live Classes', icon: Video },
      { id: 'fees_collections', label: 'Fees & Collections', icon: Wallet },
      { id: 'attendance', label: 'Attendance', icon: UserCheck },
      { id: 'marksheet', label: 'Marksheet', icon: GraduationCap },
      { id: 'e_content', label: 'E-Content', icon: FileVideo },
      { id: 'library_management', label: 'E-Library', icon: Library },
      { id: 'inventory', label: 'Inventory', icon: Package },
      { id: 'account_management', label: 'Accounts', icon: Receipt },
      { id: 'announcement', label: 'Announcement', icon: Megaphone },
      { id: 'certificates', label: 'Certificates', icon: Award },
      { id: 'notification', label: 'Notification', icon: BellRing },
      { id: 'billing', label: 'Billing & Accounts', icon: CreditCard },
      { id: 'payment_setting', label: 'Payment Setting', icon: Settings2 },
      { id: 'system_setting', label: 'System Setting', icon: Settings },
      { id: 'holiday_calendar', label: 'Holiday Calendar', icon: CalendarDays },
      { id: 'backup', label: 'Database Backup', icon: Database },
      { id: 'trash', label: 'Trash Bin', icon: Trash2 },
    ]
  },
  {
    category: "Website & Branding",
    modules: [
      { id: 'website_mgmt', label: 'Website Manager (Parent)', icon: Globe },
      { id: 'homepage_setup', label: '↳ Homepage Setup', icon: Monitor },
      { id: 'about_us', label: '↳ About Us Page', icon: Info },
      { id: 'infra_setup', label: '↳ Infrastructure', icon: Layers },
      { id: 'courses_setup', label: '↳ Courses Setup', icon: GraduationCap },
      { id: 'blog_seo', label: '↳ Blog & SEO', icon: Newspaper },
      { id: 'website_inquiry', label: '↳ Website Inquiry', icon: Search },
      { id: 'contact_seo', label: '↳ Contact & SEO', icon: MapPin },
    ]
  },
  {
    category: "Branch Network",
    modules: [
      { id: 'branch_mgmt', label: 'Branch Management (Parent)', icon: MapPin },
      { id: 'manage_branches', label: '↳ Manage Branches', icon: Settings2 },
      { id: 'branch_login', label: '↳ Branch Login Link', icon: Lock },
    ]
  },
  {
    category: "Front Office Desk",
    modules: [
      { id: 'front_office', label: 'Front Office (Parent)', icon: ClipboardList },
      { id: 'admission_enquiry', label: '↳ Admission Enquiry', icon: Search },
      { id: 'visitor_books', label: '↳ Visitor Books', icon: UserCheck },
      { id: 'phone_calls_logs', label: '↳ Phone Call Logs', icon: Clock },
      { id: 'complains', label: '↳ Complaints', icon: AlertCircle },
      { id: 'postal_service', label: '↳ Postal Service', icon: Mail },
    ]
  },
  {
    category: "Student Records",
    modules: [
      { id: 'student_info', label: 'Student Info (Parent)', icon: UserPlus },
      { id: 'student_admission', label: '↳ Admissions', icon: GraduationCap },
      { id: 'leave_request_student', label: '↳ Leave Requests', icon: CalendarDays },
      { id: 'document_management', label: '↳ Document Vault', icon: ShieldCheck },
      { id: 'student_id_cards', label: '↳ Student ID Cards', icon: CreditCard },
      { id: 'student_login', label: '↳ Student Login Link', icon: Lock },
    ]
  },
  {
    category: "Assessments",
    modules: [
      { id: 'examination', label: 'Examination (Parent)', icon: FileText },
      { id: 'online_exam', label: '↳ Online Exam', icon: Monitor },
      { id: 'offline_exam', label: '↳ Offline Exam', icon: Printer },
    ]
  },
  {
    category: "Human Resources",
    modules: [
      { id: 'human_resources', label: 'HR (Parent)', icon: Users },
      { id: 'employee_directory', label: '↳ Employee Directory', icon: Users },
      { id: 'employee_id_cards', label: '↳ Employee ID Cards', icon: CreditCard },
      { id: 'staff_attendance', label: '↳ Staff Attendance', icon: UserCheck },
      { id: 'staff_performance', label: '↳ Staff Performance', icon: TrendingUp },
      { id: 'leave_request_hr', label: '↳ Leave Request', icon: CalendarDays },
      { id: 'payroll', label: '↳ Payroll', icon: Wallet },
      { id: 'staff_login', label: '↳ Staff Login Link', icon: Lock },
    ]
  }
]

export default function BranchManagementPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<any>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [branches, setBranches] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const { database } = useFirebase()
  const { user } = useUser()

  useEffect(() => {
    if (!database || !user) return
    const dbRef = ref(database, `Institutes/${user.uid}/branches`)
    setIsLoading(true)

    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setBranches(Object.keys(data).map(key => ({ ...data[key], id: key })).reverse())
      } else {
        setBranches([])
      }
      setIsLoading(false)
    })

    return () => off(dbRef)
  }, [database, user])

  const canAddBranch = branches.length < 1

  const filteredBranches = useMemo(() => {
    if (!searchTerm) return branches
    const lowerSearch = searchTerm.toLowerCase()
    return branches.filter(b =>
      b.branchName?.toLowerCase().includes(lowerSearch) ||
      b.branchCode?.toLowerCase().includes(lowerSearch) ||
      b.branchEmail?.toLowerCase().includes(lowerSearch)
    )
  }, [branches, searchTerm])

  const handleSaveBranch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user || !database) return

    const formData = new FormData(e.currentTarget)
    const branchData = {
      branchName: (formData.get("branchName") as string)?.trim() || "",
      branchCode: (formData.get("branchCode") as string)?.trim() || "",
      managerName: (formData.get("managerName") as string)?.trim() || "",
      phone: (formData.get("phone") as string)?.trim() || "",
      email: (formData.get("email") as string)?.trim() || "",
      branchEmail: (formData.get("branchEmail") as string)?.trim() || "",
      branchPassword: (formData.get("branchPassword") as string) || "",
      address: (formData.get("address") as string)?.trim() || "",
      updatedAt: Date.now()
    }

    if (!branchData.branchName || !branchData.branchCode || !branchData.branchEmail) {
      toast({
        variant: "destructive",
        title: "Required fields missing",
        description: "Branch name, code and portal email are required."
      })
      return
    }

    if (selectedBranch?.id) {
      update(ref(database, `Institutes/${user.uid}/branches/${selectedBranch.id}`), branchData)
        .then(() => {
          toast({ title: "Branch Updated Successfully" })
          setIsModalOpen(false)
        })
        .catch(() => {
          toast({ variant: "destructive", title: "Update Failed" })
        })
    } else {
      if (!canAddBranch) {
        toast({ variant: "destructive", title: "Limit Reached", description: "You can only create one branch node." })
        return
      }

      const newRef = push(ref(database, `Institutes/${user.uid}/branches`))
      const initialPermissions: Record<string, boolean> = {
        dashboard: true // ONLY DASHBOARD ON BY DEFAULT
      }
      
      PERMISSION_GROUPS.forEach(group => {
        group.modules.forEach(m => {
          if (m.id !== 'dashboard') {
            initialPermissions[m.id] = false
          }
        })
      })

      set(newRef, {
        ...branchData,
        createdAt: Date.now(),
        permissions: initialPermissions
      })
        .then(() => {
          toast({ title: "Branch Registered Successfully" })
          setIsModalOpen(false)
        })
        .catch(() => {
          toast({ variant: "destructive", title: "Registration Failed" })
        })
    }
  }

  const togglePermission = async (moduleId: string) => {
    if (!database || !user || !selectedBranch) return

    const currentStatus = selectedBranch.permissions?.[moduleId] === true
    const dbPath = `Institutes/${user.uid}/branches/${selectedBranch.id}/permissions/${moduleId}`

    try {
      await set(ref(database, dbPath), !currentStatus)
      setSelectedBranch((prev: any) => ({
        ...prev,
        permissions: { ...prev.permissions, [moduleId]: !currentStatus }
      }))
    } catch (err) {
      toast({ variant: "destructive", title: "Permission Update Failed" })
    }
  }

  const handleDelete = (id: string) => {
    if (!database || !user) return
    if (!confirm("Are you sure you want to delete this branch?")) return
    remove(ref(database, `Institutes/${user.uid}/branches/${id}`))
      .then(() => toast({ title: "Branch Removed" }))
      .catch(() => toast({ variant: "destructive", title: "Delete Failed" }))
  }

  const handleEditClick = (branch: any) => {
    setSelectedBranch(branch)
    setIsModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      <Sidebar />
      <div className="lg:pl-[300px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        <main className="flex-1 p-6 md:p-8 space-y-8 md:space-y-10 animate-in fade-in duration-500">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 px-1 md:px-2">
            <div>
              <h2 className="text-2xl md:text-[26px] font-normal text-black tracking-tight leading-none font-public-sans">
                Branch management
              </h2>
              <p className="text-[14px] text-black mt-1.5 font-medium">
                Configure and manage institutional branches and sub-portals
              </p>
            </div>

            <Button
              onClick={() => { if(canAddBranch) { setSelectedBranch(null); setIsModalOpen(true); } else { toast({ variant: "destructive", title: "Limit Reached", description: "Standard plan allows only 1 branch node." }) } }}
              className={cn(
                "rounded-xl h-11 px-6 font-bold text-[14px] gap-2 shadow-lg active:scale-95 transition-all",
                canAddBranch ? "bg-primary hover:bg-primary/90 text-white" : "bg-zinc-100 text-black border-zinc-200 cursor-not-allowed"
              )}
            >
              <Plus className="h-4 w-4" /> Add New Branch
            </Button>
          </div>

          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-black" />
            <Input
              placeholder="Search branches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 h-11 bg-white border-zinc-200 rounded-full text-[14px] font-medium shadow-sm transition-none"
            />
          </div>

          <Card className="border-none shadow-sm rounded-[28px] overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <Table className="min-w-[1100px]">
                <TableHeader className="bg-zinc-50/70">
                  <TableRow className="border-zinc-100 hover:bg-transparent">
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14 pl-8 w-16">SR NO.</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14">Branch Info</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14">Portal Credentials</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14">Code</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14">Manager</TableHead>
                    <TableHead className="text-right pr-8 text-[11px] font-black text-black h-14">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(4)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6} className="p-6">
                          <div className="h-14 w-full bg-zinc-100/60 animate-pulse rounded-xl" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredBranches.map((branch, index) => (
                    <TableRow key={branch.id} className="border-zinc-50 hover:bg-zinc-50/30 transition-none">
                      <TableCell className="text-[14px] font-bold text-black pl-8">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 py-1">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-[14px] font-black text-black tracking-tight font-public-sans">
                              {branch.branchName}
                            </div>
                            <div className="text-[10px] text-black font-bold tracking-widest">
                              {branch.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[14px] font-bold text-primary lowercase">
                            {branch.branchEmail}
                          </span>
                          <span className="text-[10px] text-zinc-300 font-black tracking-widest">
                            Pass: {branch.branchPassword || "••••••••"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[14px] font-bold text-black font-public-sans tracking-tighter">
                        {branch.branchCode}
                      </TableCell>
                      <TableCell className="text-[14px] font-bold text-black">
                        {branch.managerName || "—"}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setSelectedBranch(branch); setIsPermissionsOpen(true); }}
                            className="h-9 w-9 text-indigo-600 hover:bg-indigo-50/60 rounded-xl transition-all"
                            title="Permissions"
                          >
                            <ShieldCheck className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            title="View Report"
                            className="h-9 w-9 text-emerald-600 hover:bg-emerald-50/60 rounded-xl transition-all"
                          >
                            <Link href={`/branch-management/${branch.id}/report`}>
                              <BarChart3 className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(branch)}
                            className="h-9 w-9 text-blue-600 hover:bg-blue-50/60 rounded-xl transition-all"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(branch.id)}
                            className="h-9 w-9 text-rose-600 hover:bg-rose-50/60 rounded-xl transition-all"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="sm:max-w-[640px] md:max-w-[720px] lg:max-w-[700px] p-0 gap-0 border-none rounded-[40px] overflow-hidden bg-white shadow-2xl">
              <div className="bg-[#1e3a8a] px-8 py-10 text-white relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
                <DialogHeader className="space-y-3">
                  <DialogTitle className="text-3xl font-black tracking-tight leading-none font-public-sans">
                    {selectedBranch ? 'Configure Branch' : 'Register New Branch'}
                  </DialogTitle>
                  <DialogDescription className="text-blue-200 text-[14px] font-bold tracking-widest">Master Node Provisioning</DialogDescription>
                </DialogHeader>
              </div>

              <ScrollArea className="max-h-[75vh] md:max-h-[80vh]">
                <form onSubmit={handleSaveBranch} className="p-8 md:p-10 space-y-12">
                  <div className="space-y-8">
                    <h3 className="text-[10px] font-black text-[#1e3a8a] tracking-[0.3em] border-b pb-3">
                      Branch Identity & Location
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                      <div className="space-y-2">
                        <Label className="text-[11px] font-black text-black tracking-widest ml-1">
                          Branch Name <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          name="branchName"
                          defaultValue={selectedBranch?.branchName}
                          required
                          className="h-12 text-[14px] font-bold text-black rounded-2xl border-zinc-100 bg-zinc-50/50 shadow-inner focus-visible:ring-[#1e3a8a]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[11px] font-black text-black tracking-widest ml-1">
                          Branch Code <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          name="branchCode"
                          defaultValue={selectedBranch?.branchCode}
                          required
                          className="h-12 text-[14px] font-bold text-black rounded-2xl border-zinc-100 bg-zinc-50/50 shadow-inner focus-visible:ring-[#1e3a8a]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[11px] font-black text-black tracking-widest ml-1">
                          Manager Name <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          name="managerName"
                          defaultValue={selectedBranch?.managerName}
                          required
                          className="h-12 text-[14px] font-bold text-black rounded-2xl border-zinc-100 bg-zinc-50/50 shadow-inner focus-visible:ring-[#1e3a8a]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[11px] font-black text-black tracking-widest ml-1">
                          Contact Phone <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          name="phone"
                          defaultValue={selectedBranch?.phone}
                          required
                          className="h-12 text-[14px] font-bold text-black rounded-2xl border-zinc-100 bg-zinc-50/50 shadow-inner focus-visible:ring-[#1e3a8a]"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-[11px] font-black text-black tracking-widest ml-1">
                          Public Email <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          name="email"
                          type="email"
                          defaultValue={selectedBranch?.email}
                          required
                          className="h-12 text-[14px] font-bold text-black rounded-2xl border-zinc-100 bg-zinc-50/50 shadow-inner focus-visible:ring-[#1e3a8a]"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-[11px] font-black text-black tracking-widest ml-1">
                          Physical Address
                        </Label>
                        <Textarea
                          name="address"
                          defaultValue={selectedBranch?.address}
                          className="min-h-[100px] text-[14px] font-bold text-black rounded-3xl border-zinc-100 bg-zinc-50/50 shadow-inner focus-visible:ring-[#1e3a8a]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8 pt-4">
                    <h3 className="text-[10px] font-black text-rose-500 tracking-[0.3em] border-b pb-3">
                      Portal Management Keys
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                      <div className="space-y-2 relative">
                        <Label className="text-[11px] font-black text-black tracking-widest ml-1">
                          Portal Login Email <span className="text-rose-500">*</span>
                        </Label>
                        <div className="relative group">
                          <Mail className="absolute left-4 top-4 h-4 w-4 text-zinc-300 group-focus-within:text-[#1e3a8a] transition-colors" />
                          <Input
                            name="branchEmail"
                            type="email"
                            defaultValue={selectedBranch?.branchEmail}
                            required
                            className="h-14 pl-12 text-[14px] font-black text-[#1e3a8a] rounded-2xl border-zinc-100 bg-zinc-50/50 shadow-inner focus-visible:ring-[#1e3a8a]"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 relative">
                        <Label className="text-[11px] font-black text-black tracking-widest ml-1">
                          Portal Access Password <span className="text-rose-500">*</span>
                        </Label>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-4 h-4 w-4 text-zinc-300 group-focus-within:text-[#1e3a8a] transition-colors" />
                          <Input
                            name="branchPassword"
                            type="password"
                            defaultValue={selectedBranch?.branchPassword}
                            required
                            className="h-14 pl-12 text-[14px] font-black text-black rounded-2xl border-zinc-100 bg-zinc-50/50 shadow-inner focus-visible:ring-[#1e3a8a]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8">
                    <Button
                      type="submit"
                      className="w-full h-16 bg-zinc-900 hover:bg-black text-white text-[14px] font-black tracking-[0.2em] rounded-3xl shadow-xl transition-all active:scale-95 border-none"
                    >
                      {selectedBranch ? 'Sync Node Update' : 'Initialize Branch Node'}
                    </Button>
                  </div>
                </form>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          <Sheet open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
            <SheetContent className="max-w-md bg-white border-l border-zinc-100 p-0 overflow-hidden flex flex-col focus:outline-none">
              <div className="bg-white p-10 text-black border-b shrink-0">
                <SheetHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <ShieldCheck className="w-8 h-8 text-[#1e3a8a]" />
                    <SheetTitle className="text-2xl font-black text-black tracking-tight font-public-sans">
                      Access Control
                    </SheetTitle>
                  </div>
                  <SheetDescription className="text-black text-[10px] font-black tracking-widest leading-relaxed">
                    Module Provisioning for <span className="text-primary font-bold">{selectedBranch?.branchName}</span>. Permissions are <span className="text-rose-500 underline underline-offset-4">restricted</span> by default.
                  </SheetDescription>
                </SheetHeader>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-10 space-y-12">
                  {PERMISSION_GROUPS.map((group, idx) => (
                    <div key={idx} className="space-y-6">
                      <div className="flex items-center gap-3 border-b border-zinc-50 pb-2">
                        <Layout className="w-4 h-4 text-zinc-300" />
                        <h4 className="text-[10px] font-black text-black tracking-[0.3em]">
                          {group.category}
                        </h4>
                      </div>
                      <div className="space-y-3">
                        {group.modules.map((module) => (
                          <div
                            key={module.id}
                            className={cn(
                              "flex items-center justify-between p-5 rounded-[24px] border transition-all duration-300",
                              selectedBranch?.permissions?.[module.id] === true
                                ? "bg-white border-zinc-100 shadow-xl shadow-blue-900/5 scale-[1.02]"
                                : "bg-zinc-50/50 border-transparent opacity-60 grayscale scale-100"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-inner",
                                selectedBranch?.permissions?.[module.id] === true ? "bg-blue-50 text-[#1e3a8a]" : "bg-white text-zinc-300"
                              )}>
                                <module.icon className="w-5 h-5" />
                              </div>
                              <div className="space-y-0.5">
                                <p className={cn(
                                  "text-[14px] font-black  tracking-tight",
                                  module.label.startsWith('↳') ? "pl-2 text-black" : "text-black"
                                )}>
                                  {module.label}
                                </p>
                                <p className="text-[8px] font-black text-zinc-300 tracking-widest">
                                  ID: {module.id}
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={selectedBranch?.permissions?.[module.id] === true}
                              onCheckedChange={() => togglePermission(module.id)}
                              className="data-[state=checked]:bg-[#1e3a8a] scale-90"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="p-8 border-t border-zinc-50 bg-zinc-50/50 shrink-0">
                <Button
                  onClick={() => setIsPermissionsOpen(false)}
                  className="w-full h-14 rounded-2xl bg-zinc-900 text-white font-black text-[10px] tracking-[0.2em] transition-all border-none shadow-lg active:scale-95"
                >
                  Finalize Node Sync
                </Button>
              </div>
            </SheetContent>
          </Sheet>

        </main>
      </div>
    </div>
  )
}
