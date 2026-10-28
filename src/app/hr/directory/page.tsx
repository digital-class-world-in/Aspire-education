
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  Plus,
  Search as SearchIcon,
  Trash2,
  Edit2,
  X,
  Briefcase,
  Lock,
  Mail,
  ShieldCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
  User,
  GraduationCap,
  LayoutGrid,
  Users,
  CreditCard,
  Save,
  Filter,
  Calendar,
  Building2,
  Settings2,
  Shield,
  Phone,
  BookOpen,
  Package,
  Receipt,
  Megaphone,
  Award,
  BellRing,
  CalendarDays,
  Database,
  UserPlus,
  FileText,
  UserCheck,
  TrendingUp,
  Settings,
  FileVideo,
  Globe
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, set, remove, off, update, get } from "firebase/database"
import { uploadFileToImageKit } from "@/lib/imagekit"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { AvatarFallback } from "@radix-ui/react-avatar"

const PERMISSION_GROUPS: {
  category: string;
  modules: {
    id: string;
    label: string;
    icon?: any;
    submodules?: { id: string; label: string }[];
  }[];
}[] = [
  {
    category: "Main Modules",
    modules: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
      { id: 'batch_management', label: 'Batch Management', icon: GraduationCap },
      { id: 'live_classes', label: 'Live Classes', icon: GraduationCap },
      { id: 'fees_collections', label: 'Fees Collections', icon: CreditCard },
      { id: 'attendance', label: 'Attendance', icon: UserCheck },
      { id: 'marksheet', label: 'Marksheet', icon: FileText },
      { id: 'e_content', label: 'E-Content', icon: FileVideo },
      { id: 'library_management', label: 'Library Management', icon: BookOpen },
      { id: 'inventory', label: 'Inventory', icon: Package },
      { id: 'account_management', label: 'Account Management', icon: Receipt },
      { id: 'announcement', label: 'Announcement', icon: Megaphone },
      { id: 'certificates', label: 'Certificates', icon: Award },
      { id: 'notification', label: 'Notification', icon: BellRing },
      { id: 'billing', label: 'Billing & Accounts', icon: CreditCard },
      { id: 'payment_setting', label: 'Payment Setting', icon: Settings2 },
      { id: 'system_setting', label: 'System Setting', icon: Settings },
      { id: 'holiday_calendar', label: 'Holiday Calendar', icon: CalendarDays },
      { id: 'backup', label: 'Database Backup', icon: Database },
      { id: 'trash', label: 'Trash', icon: Trash2 },
    ]
  },
  {
    category: "Website Management",
    modules: [
      {
        id: 'website_mgmt', label: 'Website Manager', icon: Globe, submodules: [
          { id: 'homepage_setup', label: '↳ Homepage Setup' },
          { id: 'about_us', label: '↳ About Us Service' },
          { id: 'infra_setup', label: '↳ Facilities Page' },
          { id: 'courses_setup', label: '↳ Courses Setup' },
          { id: 'blog_seo', label: '↳ Blog & SEO' },
          { id: 'website_inquiry', label: '↳ Inquiries' },
          { id: 'contact_seo', label: '↳ Contact Setup' },
          { id: 'terms_conditions', label: '↳ Policies/Terms' },
        ]
      }
    ]
  },
  {
    category: "Student Info",
    modules: [
      {
        id: 'student_info', label: 'Student Info', icon: UserPlus, submodules: [
          { id: 'student_admission', label: '↳ Student Admission' },
          { id: 'leave_request_student', label: '↳ Leave Request' },
          { id: 'document_management', label: '↳ Document Management' },
          { id: 'student_id_cards', label: '↳ Student Id Cards' },
          { id: 'student_login', label: '↳ Student Login Link' },
        ]
      }
    ]
  },
  {
    category: "Human Resources",
    modules: [
      {
        id: 'human_resources', label: 'Human Resources', icon: Users, submodules: [
          { id: 'employee_directory', label: '↳ Employee Directory' },
          { id: 'face_setup', label: '↳ Face Biometric Setup' },
          { id: 'employee_id_cards', label: '↳ Employee Id Cards' },
          { id: 'staff_attendance', label: '↳ Staff Attendance' },
          { id: 'staff_performance', label: '↳ Staff Performance' },
          { id: 'leave_request_hr', label: '↳ Leave Request' },
          { id: 'payroll', label: '↳ Payroll' },
          { id: 'staff_login', label: '↳ Staff Login Link' },
        ]
      }
    ]
  }
]

export default function EmployeeDirectoryPage() {
  const pathname = usePathname()
  const isPortal = (pathname.startsWith('/branch') && !pathname.startsWith('/branch-management')) ||
    pathname.startsWith('/staff') ||
    (pathname.startsWith('/student') && !pathname.startsWith('/student-information'))

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [editingItem, setEditingItem] = useState<any>(null)
  const [selectedStaffForPermissions, setSelectedStaffForPermissions] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [staffPhotoFile, setStaffPhotoFile] = useState<File | null>(null)
  const [staffPhotoPreview, setStaffPhotoPreview] = useState<string | null>(null)

  // Filter States
  const [filterDept, setFilterDept] = useState("all")
  const [filterDesignation, setFilterDesignation] = useState("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const [dropdownData, setDropdownData] = useState<Record<string, any[]>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [isManageOpen, setIsManageOpen] = useState(false)
  const [activeManageField, setActiveManageField] = useState<any>(null)
  const [newOptionValue, setNewOptionValue] = useState("")
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null)

  const { database } = useFirebase()
  const { resolvedId, branchId, isBranch, isStaff, staffId } = useResolvedId()

  const [nextEmployeeId, setNextEmployeeId] = useState<string>("EMP_101")

  useEffect(() => {
    if (!database || !resolvedId || editingItem) return
    const employeesRef = ref(database, `Institutes/${resolvedId}/employees`)
    get(employeesRef).then((snapshot) => {
      if (!snapshot.exists()) {
        setNextEmployeeId("EMP_101")
        return
      }
      const allEmployees = snapshot.val()
      const employeeNumbers = Object.values(allEmployees)
        .map((e: any) => {
          const match = e.employeeId?.toString().match(/EMP_(\d+)/)
          return match ? parseInt(match[1], 10) : 0
        })
        .filter(n => !isNaN(n) && n > 0)
      
      const maxId = employeeNumbers.length === 0 ? 100 : Math.max(...employeeNumbers)
      setNextEmployeeId(`EMP_${maxId + 1}`)
    })
  }, [database, resolvedId, items, editingItem])

  useEffect(() => {
    if (!database || !resolvedId) return
    const rootPath = `Institutes/${resolvedId}`
    onValue(ref(database, `${rootPath}/employees`), (snapshot) => {
      const data = snapshot.val()
      if (data) setItems(Object.keys(data).map(key => ({ ...data[key], id: key })).reverse())
      else setItems([])
      setIsLoading(false)
    })
    onValue(ref(database, `${rootPath}/dropdowns`), (snapshot) => {
      const data = snapshot.val() || {}
      const processed: Record<string, any[]> = {}
      Object.keys(data).forEach(key => { processed[key] = Object.keys(data[key]).map(id => ({ id, value: data[key][id].value })) })
      setDropdownData(processed)
    })
  }, [database, resolvedId])

  const hasActiveFilters = useMemo(() => {
    return filterDept !== "all" || filterDesignation !== "all" || fromDate !== "" || toDate !== "" || searchTerm !== ""
  }, [filterDept, filterDesignation, fromDate, toDate, searchTerm])

  const filteredItems = useMemo(() => {
    let list = items
    if (isBranch && branchId) list = list.filter(item => item.branchId === branchId)
    return list.filter(item => {
      const matchSearch = !searchTerm ||
        `${item.firstName} ${item.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchDept = filterDept === 'all' || item.department === filterDept
      const matchDesignation = filterDesignation === 'all' || item.designation === filterDesignation

      let matchDate = true
      if (fromDate || toDate) {
        const joinDate = item.joiningDate // YYYY-MM-DD
        if (fromDate && joinDate < fromDate) matchDate = false
        if (toDate && joinDate > toDate) matchDate = false
      }

      return matchSearch && matchDept && matchDesignation && matchDate
    })
  }, [items, searchTerm, isBranch, branchId, filterDept, filterDesignation, fromDate, toDate])

  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)

  const resetFilters = () => {
    setFilterDept("all")
    setFilterDesignation("all")
    setFromDate("")
    setToDate("")
    setSearchTerm("")
    setCurrentPage(1)
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!resolvedId || !database || isSubmitting) return
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())
    
    let finalPhotoUrl = editingItem?.photoUrl || ''
    if (staffPhotoFile) {
      try {
        const res = await uploadFileToImageKit(staffPhotoFile, `/employees/${resolvedId}/photos`)
        finalPhotoUrl = res.url
      } catch (err: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: err.message })
      }
    }

    const dbPath = `Institutes/${resolvedId}/employees`
    try {
      const staffData: any = {
        ...data,
        photoUrl: finalPhotoUrl,
        branchId: isBranch ? branchId : (editingItem?.branchId || null),
        createdBy: isStaff ? staffId : isBranch ? branchId : 'admin',
        updatedAt: Date.now()
      }

      if (editingItem) {
        await update(ref(database, `${dbPath}/${editingItem.id}`), staffData)
      } else {
        const initialPermissions: Record<string, boolean> = { dashboard: true }
        PERMISSION_GROUPS.forEach(g => g.modules.forEach((m: any) => {
          initialPermissions[m.id] = false;
          if (m.submodules) m.submodules.forEach((sub: any) => { initialPermissions[sub.id] = false })
        }))

        const newRef = push(ref(database, dbPath))
        const finalEmployeeId = data.employeeId as string || nextEmployeeId
        await set(newRef, {
          ...staffData,
          employeeId: finalEmployeeId,
          createdAt: Date.now(),
          loginStatus: true,
          role: 'Staff',
          moduleAccess: initialPermissions,
          id: newRef.key
        })
      }

      try {
        const { esslService } = await import("@/services/essl-service")
        const finalEmployeeId = (data.employeeId as string) || editingItem?.employeeId || nextEmployeeId
        const machineCode = finalEmployeeId.replace(/^(STU_|EMP_)/i, '');
        const result = await esslService.addEmployee({
          EmployeeCode: machineCode,
          EmployeeName: `${data.firstName} ${data.lastName}`.substring(0, 24),
          SerialNumber: "NFZ8245102868",
          UserName: "aspireedu",
          UserPassword: "Aspire@123",
          CommandId: "1"
        })
        console.log("Staff sync result:", result)
        if (result.success && (result.status === "Success" || result.status?.includes("Success"))) {
          toast({ title: "Machine Synced", description: `${data.firstName} ${data.lastName} successfully registered on eSSL.` })
        } else {
          toast({ variant: "destructive", title: "Machine Sync Warning", description: `Saved to DB, but machine returned: ${result.status || "Unknown status"}` })
        }
      } catch (esslErr) {
        console.error("Failed to sync staff to eSSL:", esslErr)
      }

      setIsModalOpen(false); setEditingItem(null); setStaffPhotoFile(null); setStaffPhotoPreview(null);
      toast({ title: editingItem ? "Staff Updated" : "Staff Registered Successfully" })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }


  const togglePermission = async (moduleId: string, submoduleId?: string) => {
    if (!database || !resolvedId || !selectedStaffForPermissions) return
    const isSub = !!submoduleId
    const currentVal = isSub ? selectedStaffForPermissions.moduleAccess?.[submoduleId!] : selectedStaffForPermissions.moduleAccess?.[moduleId]
    const dbPath = `Institutes/${resolvedId}/employees/${selectedStaffForPermissions.id}/moduleAccess/${isSub ? submoduleId : moduleId}`
    await set(ref(database, dbPath), !currentVal)
    setSelectedStaffForPermissions((prev: any) => ({
      ...prev,
      moduleAccess: { ...prev.moduleAccess, [isSub ? submoduleId! : moduleId]: !currentVal }
    }))
  }

  const handleBulkToggle = async (groupIdx: number, enable: boolean) => {
    if (!database || !resolvedId || !selectedStaffForPermissions) return
    const group = PERMISSION_GROUPS[groupIdx]
    const updates: any = {}
    group.modules.forEach((m: any) => {
      updates[`Institutes/${resolvedId}/employees/${selectedStaffForPermissions.id}/moduleAccess/${m.id}`] = enable
      if (m.submodules) m.submodules.forEach((sub: any) => { updates[`Institutes/${resolvedId}/employees/${selectedStaffForPermissions.id}/moduleAccess/${sub.id}`] = enable })
    })
    await update(ref(database), updates)
    setSelectedStaffForPermissions((prev: any) => {
      const newAccess = { ...prev.moduleAccess }
      group.modules.forEach((m: any) => { newAccess[m.id] = enable; if (m.submodules) m.submodules.forEach((s: any) => newAccess[s.id] = enable) })
      return { ...prev, moduleAccess: newAccess }
    })
    toast({ title: enable ? "Modules Enabled" : "Modules Restricted" })
  }

  const handleSaveOption = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    if (!newOptionValue.trim() || !activeManageField || !database || !resolvedId) return
    const dbPath = `Institutes/${resolvedId}/dropdowns/${activeManageField.key}`
    try {
      if (editingOptionId) {
        await update(ref(database, `${dbPath}/${editingOptionId}`), { value: newOptionValue })
      } else {
        const newRef = push(ref(database, dbPath))
        await set(newRef, { value: newOptionValue, id: newRef.key })
      }
      setNewOptionValue("")
      setEditingOptionId(null)
      toast({ title: "Option saved successfully" })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      {!isPortal && <Sidebar />}
      <div className={cn("flex flex-col flex-1 min-w-0", !isPortal && "lg:pl-[300px]")}>
        {!isPortal && <TopNav />}
        <main className={cn("flex-1 p-8 space-y-10 animate-in fade-in duration-500 w-full overflow-x-hidden font-public-sans text-black", isPortal && "pt-4")}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div>
              <h2 className="text-[26px] font-normal text-black font-public-sans leading-none">Employee Directory</h2>
              <p className="text-[14px] text-black font-medium mt-1.5">Manage staff records and node access control</p>
            </div>
            <Button onClick={() => { setEditingItem(null); setStaffPhotoFile(null); setStaffPhotoPreview(null); setIsModalOpen(true); }} className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-10 font-medium text-[14px] border-none shadow-lg active:scale-95 transition-all">+  Add Staff</Button>
          </div>

          <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-8">
            <div className="flex items-center justify-between mb-8 px-2">
              <h3 className="text-lg font-normal text-black tracking-tight">Select Criteria</h3>
              {hasActiveFilters && (
                <Button onClick={resetFilters} variant="ghost" className="h-8 px-4 text-rose-500 hover:bg-rose-50 rounded-lg text-[10px] font-black tracking-widest gap-2">
                  Reset Filters <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <Label className="text-[11px] font-black text-black tracking-widest ml-1">From Date of Joining</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-zinc-300 pointer-events-none" />
                  <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }} className="h-11 pl-10 rounded-xl border-zinc-200 bg-zinc-50/50 text-[14px] font-bold text-black shadow-inner" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-black text-black tracking-widest ml-1">To Date of Joining</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-zinc-300 pointer-events-none" />
                  <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }} className="h-11 pl-10 rounded-xl border-zinc-200 bg-zinc-50/50 text-[14px] font-bold text-black shadow-inner" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-black text-black tracking-widest ml-1">Department</Label>
                <Select value={filterDept} onValueChange={(val) => { setFilterDept(val); setCurrentPage(1); }}>
                  <SelectTrigger className="h-11 rounded-xl bg-zinc-50/50 border-zinc-200 font-bold text-black shadow-inner text-[11px]"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent className="rounded-xl border-zinc-100 shadow-xl">
                    <SelectItem value="all" className="font-bold text-[11px]">All Departments</SelectItem>
                    {(dropdownData['department'] || []).map(opt => <SelectItem key={opt.id} value={opt.value} className="font-bold text-[11px]">{opt.value}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-black text-black tracking-widest ml-1">Designation</Label>
                <Select value={filterDesignation} onValueChange={(val) => { setFilterDesignation(val); setCurrentPage(1); }}>
                  <SelectTrigger className="h-11 rounded-xl bg-zinc-50/50 border-zinc-200 font-bold text-black shadow-inner text-[11px]"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent className="rounded-xl border-zinc-100 shadow-xl">
                    <SelectItem value="all" className="font-bold text-[11px]">All Designations</SelectItem>
                    {(dropdownData['designation'] || []).map(opt => <SelectItem key={opt.id} value={opt.value} className="font-bold text-[11px]">{opt.value}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-black text-black tracking-widest ml-1">Search Keyword</Label>
                <div className="relative group">
                  <SearchIcon className="absolute left-3.5 top-3 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="Name or ID..."
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-11 h-11 bg-zinc-50/50 border-zinc-200 rounded-xl text-[14px] font-bold shadow-inner"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
            <div className="overflow-x-auto scrollbar-thin">
              <Table className="min-w-[1800px]">
                <TableHeader className="bg-zinc-50/50">
                  <TableRow className="border-zinc-100 hover:bg-transparent">
                    <TableHead className="text-[13px] font-black text-black h-14 pl-8 w-20">#</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14">ACTION</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14">EMPLOYEE NAME</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14">STAFF ID</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14">MOBILE</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14">EMAIL</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14">DESIGNATION</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14">DEPARTMENT</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14">QUALIFICATION</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14">BASIC SALARY</TableHead>
                    <TableHead className="text-right pr-10 text-[13px] font-black text-black h-14">JOIN DATE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((row, index) => (
                    <TableRow key={row.id} className="border-zinc-50 hover:bg-zinc-50/20 transition-none group text-black">
                      <TableCell className="text-[14px] font-bold text-zinc-300 pl-8">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setSelectedStaffForPermissions(row); setIsPermissionsOpen(true); }} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all" title="Permissions"><Shield className="h-4 w-4" /></button>
                          <button onClick={() => { setEditingItem(row); setIsModalOpen(true); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Edit"><Edit2 className="h-4 w-4" /></button>
                          <button onClick={() => { if (confirm("Delete employee?")) remove(ref(database!, `Institutes/${resolvedId}/employees/${row.id}`)) }} className="p-1.5 text-zinc-300 hover:text-rose-500 rounded-lg transition-all" title="Delete"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-zinc-100 shadow-sm">
                            {row.photoUrl ? <img src={row.photoUrl} alt="Staff" className="w-full h-full object-cover" /> : null}
                            <AvatarFallback className="bg-zinc-50 text-black font-black text-[10px]">{row.firstName?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-[14px] font-black text-black font-public-sans">{row.firstName} {row.lastName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[14px] font-bold text-primary font-public-sans tracking-tighter">{row.employeeId || '-'}</TableCell>
                      <TableCell className="text-[14px] font-bold text-black font-public-sans"><div className="flex items-center gap-2"><Phone className="w-3 h-3 text-zinc-300" /> {row.phone || '-'}</div></TableCell>
                      <TableCell className="text-[14px] font-medium text-black lowercase"><div className="flex items-center gap-2"><Mail className="w-3 h-3 text-zinc-300" /> {row.staffEmail || '-'}</div></TableCell>
                      <TableCell className="text-[14px] font-bold text-black">{row.designation}</TableCell>
                      <TableCell className="text-[14px] text-black">{row.department}</TableCell>
                      <TableCell className="text-[14px] font-medium text-black truncate max-w-[150px]">{row.qualification || '-'}</TableCell>
                      <TableCell className="text-[14px] font-black text-emerald-600">₹{Number(row.basicSalary || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right pr-10 text-[14px] font-bold text-black font-public-sans">{row.joiningDate || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {filteredItems.length === 0 && (
                    <TableRow><TableCell colSpan={11} className="h-64 text-center text-zinc-300 italic tracking-widest font-bold">No staff records found in registry</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-10 px-6 rounded-xl font-black text-[10px] tracking-widest transition-all"><ChevronLeft className="w-4 h-4 mr-2" /> Previous</Button>
              <div className="flex items-center gap-2">{[...Array(totalPages)].map((_, i) => (<button key={i} onClick={() => setCurrentPage(i + 1)} className={cn("w-10 h-10 rounded-xl text-[10px] font-black transition-all", currentPage === i + 1 ? "bg-primary text-white shadow-xl scale-110" : "bg-white text-black border border-zinc-100")}>{i + 1}</button>))}</div>
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-10 px-6 rounded-xl font-black text-[10px] tracking-widest transition-all">Next <ChevronRight className="w-4 h-4 ml-2" /></Button>
            </div>
          )}

          {/* ADD/EDIT MODAL */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-5xl p-0 border-none rounded-[40px] overflow-hidden bg-white shadow-2xl">
              <div className="bg-[#1e3a8a] px-10 py-8 text-white relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
                <DialogTitle className="text-3xl font-black tracking-tight font-public-sans">{editingItem ? 'Update Staff' : ' Add New Staff'}</DialogTitle>

              </div>
              <ScrollArea className="max-h-[80vh]">
                <form onSubmit={handleSave} className="p-10 space-y-12 pb-24">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <FormItem label="Employee ID" name="employeeId" defaultValue={editingItem?.employeeId || nextEmployeeId} required />
                    <FormItem 
                      label="Department" 
                      name="department" 
                      defaultValue={editingItem?.department} 
                      options={dropdownData['department'] || []} 
                      type="select" 
                      onManage={() => { setActiveManageField({ label: 'Department', key: 'department' }); setIsManageOpen(true); }}
                    />
                    <FormItem 
                      label="Designation" 
                      name="designation" 
                      defaultValue={editingItem?.designation} 
                      options={dropdownData['designation'] || []} 
                      type="select" 
                      onManage={() => { setActiveManageField({ label: 'Designation', key: 'designation' }); setIsManageOpen(true); }}
                    />
                    <FormItem label="First Name" name="firstName" defaultValue={editingItem?.firstName} required />
                    <FormItem label="Middle Name" name="middleName" defaultValue={editingItem?.middleName} required />
                    <FormItem label="Last Name" name="lastName" defaultValue={editingItem?.lastName} required />
                    {/* <FormItem label="Mother Name" name="motherName" defaultValue={editingItem?.motherName} /> */}

                    <FormItem label="Joining Date" name="joiningDate" type="date" defaultValue={editingItem?.joiningDate} />
                    
                    <FormItem label="Mobile Number" name="phone" type="tel" defaultValue={editingItem?.phone} required />
                    <FormItem label="Qualification" name="qualification" defaultValue={editingItem?.qualification} type="textarea" />
                    <FormItem label="Work Experience" name="workExperience" defaultValue={editingItem?.workExperience} type="textarea" />
                    <div className="md:col-span-2">
                      <FormItem label="Current Address" name="address" defaultValue={editingItem?.address} type="textarea" />
                    </div>
                    <div className="md:col-span-2">
                      <FormItem label="Permanent Address" name="permanentAddress" defaultValue={editingItem?.permanentAddress} type="textarea" />
                    </div>
                    <div className="space-y-1.5 pt-1">
                      <Label className="text-[12px] font-medium text-black tracking-widest ml-1">Staff Photo</Label>
                      {(staffPhotoPreview || editingItem?.photoUrl) && (
                        <div className="mb-2">
                          <img src={staffPhotoPreview || editingItem?.photoUrl} alt="Staff" className="w-16 h-16 object-cover rounded-xl border shadow-sm" />
                        </div>
                      )}
                      <Input type="file" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (file.size > 2 * 1024 * 1024) {
                          toast({ variant: "destructive", title: "File too large", description: "Max size is 2MB" })
                          e.target.value = ''
                          return
                        }
                        setStaffPhotoFile(file)
                        const reader = new FileReader()
                        reader.onload = (ev) => {
                          setStaffPhotoPreview(ev.target?.result as string)
                        }
                        reader.readAsDataURL(file)
                      }} className="rounded-xl h-12 pt-2.5 font-bold text-black border-zinc-200" />
                    </div>
                  </div>

                  <div className="space-y-8 pt-10 border-t border-zinc-100">
                    <h3 className="text-[14px] font-bold text-indigo-600 tracking-[0.2em] border-b border-zinc-50 pb-2">Base Salary Configuration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      <FormItem label="Basic Salary (INR)" name="basicSalary" type="number" defaultValue={editingItem?.basicSalary} required />
                      <FormItem label="PF Deduction" name="pfAmount" type="number" defaultValue={editingItem?.pfAmount || 0} />
                      <FormItem label="ESIC Deduction" name="esicAmount" type="number" defaultValue={editingItem?.esicAmount || 0} />
                      <FormItem label="Prof. Tax (PT)" name="ptAmount" type="number" defaultValue={editingItem?.ptAmount || 0} />
                    </div>
                  </div>
                   <div className="space-y-8 pt-10 border-t border-zinc-100">
                    <h3 className="text-[14px] font-bold text-indigo-600 tracking-[0.2em] border-b border-zinc-50 pb-2">Login Credentials</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                     <FormItem label="Email (Login ID)" name="staffEmail" type="email" defaultValue={editingItem?.staffEmail} required />
                    <FormItem label="Login Password" name="staffPassword" type="password" defaultValue={editingItem?.staffPassword} required />
                    </div>
                  </div>

                <div className="pt-8 border-t border-zinc-100 flex justify-start">
                                   <Button type="submit" className="h-10 px-6 bg-primary hover:opacity-90 text-white rounded-xl font-bold text-[14px] tracking-widest shadow-lg border-none transition-all active:scale-95 flex items-center justify-center gap-2">
                                     <Save className="w-4 h-4" /> {editingItem ? 'Update Staff' : 'Submit'}
                                   </Button>
                                 </div>
                </form>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          {/* PERMISSIONS SHEET */}
          <Sheet open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
            <SheetContent className="max-w-md bg-white p-0 flex flex-col focus:outline-none border-l border-zinc-100">
              <div className="bg-white p-8 text-black shrink-0 border-b border-zinc-50">
                <div className="flex items-center gap-3 mb-2"><ShieldCheck className="w-6 h-6 text-primary" /><SheetTitle className="text-black tracking-tight font-public-sans">Access Control</SheetTitle></div>
                <SheetDescription className="text-black text-[10px] font-black tracking-widest">Node permissions for {selectedStaffForPermissions?.firstName}</SheetDescription>
              </div>
              <ScrollArea className="flex-1 p-8">
                {PERMISSION_GROUPS.map((group, gIdx) => (
                  <div key={gIdx} className="mb-10">
                    <div className="flex items-center justify-between mb-4 border-b border-zinc-50 pb-2">
                      <div className="flex items-center gap-2"><LayoutGrid className="w-3.5 h-3.5 text-zinc-300" /><h4 className="text-[10px] font-black text-black tracking-[0.2em]">{group.category}</h4></div>
                      <div className="flex gap-2">
                        <button onClick={() => handleBulkToggle(gIdx, true)} className="text-[8px] font-black text-emerald-600 hover:underline border-none bg-transparent cursor-pointer">Enable All</button>
                        <button onClick={() => handleBulkToggle(gIdx, false)} className="text-[8px] font-black text-rose-600 hover:underline border-none bg-transparent cursor-pointer">Disable All</button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {group.modules.map((m: any) => (
                        <div key={m.id} className="space-y-2">
                          <div className={cn("flex items-center justify-between p-4 rounded-2xl border transition-all duration-300", selectedStaffForPermissions?.moduleAccess?.[m.id] === true ? "bg-white border-zinc-100 shadow-xl shadow-blue-900/5 scale-[1.02]" : "bg-zinc-50/50 border-transparent opacity-60 grayscale")}>
                            <div className="flex items-center gap-3"><div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all", selectedStaffForPermissions?.moduleAccess?.[m.id] === true ? "bg-blue-50 text-primary shadow-inner" : "bg-white text-zinc-300")}><m.icon className="w-4 h-4" /></div><span className="text-[13px] font-black tracking-tight text-black">{m.label}</span></div>
                            <Switch checked={selectedStaffForPermissions?.moduleAccess?.[m.id] === true} onCheckedChange={() => togglePermission(m.id)} className="data-[state=checked]:bg-primary scale-90" />
                          </div>
                          {m.submodules && selectedStaffForPermissions?.moduleAccess?.[m.id] === true && (
                            <div className="pl-6 space-y-2 animate-in slide-in-from-top-2 duration-300">
                              {m.submodules.map((sub: any) => (
                                <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100/50">
                                  <span className="text-[11px] font-bold text-black tracking-tight">{sub.label}</span>
                                  <Switch checked={selectedStaffForPermissions?.moduleAccess?.[sub.id] === true} onCheckedChange={() => togglePermission(m.id, sub.id)} className="data-[state=checked]:bg-primary scale-75" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </ScrollArea>
              <div className="p-8 border-t border-zinc-50 bg-zinc-50/50 shrink-0"><Button onClick={() => setIsPermissionsOpen(false)} className="w-full h-14 rounded-2xl bg-zinc-900 text-white font-black text-[10px] tracking-[0.2em] shadow-lg border-none active:scale-95">Save & Synchronize</Button></div>
            </SheetContent>
          </Sheet>

          {/* MANAGE DROPDOWNS MODAL */}
          <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
            <DialogContent className="max-w-md rounded-[32px] p-10 bg-white border-none shadow-2xl">
              <div className="flex items-center justify-between mb-8"><DialogTitle className="text-xl font-normal">Manage {activeManageField?.label}</DialogTitle></div>
              <div className="flex gap-2 mb-8"><Input value={newOptionValue} onChange={(e) => setNewOptionValue(e.target.value)} placeholder="Enter new..." className="rounded-xl h-12" /><Button onClick={handleSaveOption} className="bg-primary text-white rounded-xl px-8 h-12 border-none shadow-lg">Add</Button></div>
              <ScrollArea className="h-64 pr-4">
                <div className="space-y-2">
                  {(dropdownData[activeManageField?.key || ''] || []).map(opt => (
                    <div key={opt.id} className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 hover:bg-zinc-50 transition-all">
                      <span className="text-[14px] font-normal text-black">{opt.value}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingOptionId(opt.id); setNewOptionValue(opt.value); }} className="text-blue-500 h-8 w-8"><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(ref(database!, `Institutes/${resolvedId}/dropdowns/${activeManageField!.key}/${opt.id}`))} className="text-rose-500 h-8 w-8"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}

function FormItem({ label, name, type = "text", required = false, defaultValue, options = [], onManage }: any) {
  return (
    <div className="space-y-1.5 flex flex-col pt-1">
      <div className="flex items-center justify-between ml-1 leading-none">
        <Label className="text-[12px] font-medium text-black tracking-widest">{label} {required && "*"}</Label>
        {onManage && (
          <button type="button" onClick={onManage} className="text-[10px] font-bold text-primary hover:underline">Manage</button>
        )}
      </div>
      {type === 'select' ? (
        <Select name={name} defaultValue={defaultValue} required={required}>
          <SelectTrigger className="h-12 rounded-xl border-zinc-200 bg-zinc-50/50 font-bold"><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>{options.map((opt: any) => (<SelectItem key={opt.id} value={opt.value} className="font-bold">{opt.value}</SelectItem>))}</SelectContent>
        </Select>
      ) : type === 'textarea' ? (
        <Textarea name={name} defaultValue={defaultValue} required={required} className="rounded-xl border-zinc-200 min-h-[80px] font-bold text-black text-[14px]" />
      ) : (
        <Input name={name} type={type} required={required} defaultValue={defaultValue} className="rounded-xl border-zinc-200 h-12 font-bold text-black text-[14px] focus-visible:ring-primary shadow-inner" />
      )}
    </div>
  )
}
