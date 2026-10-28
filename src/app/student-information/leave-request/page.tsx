
"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { 
  Search, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Calendar,
  User,
  AlertCircle,
  Loader2,
  Filter,
  History,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  Info,
  CalendarCheck,
  Edit2,
  Trash2,
  Download,
  Upload
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off, update, push, set, get } from "firebase/database"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { format, differenceInDays, parseISO } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"
import { usePathname } from "next/navigation"
import { useResolvedId } from "@/hooks/use-resolved-id"

const ALLOWED_LEAVES: Record<string, number> = {
  "Sick Leave": 10,
  "Casual Leave": 10,
  "Emergency Leave": 5,
  "Annual Leave": 15,
  "Paid": 15,
  "General": 10 
}

const STATUS_OPTIONS = [
  { id: 'Pending', value: 'Pending' },
  { id: 'Approved', value: 'Approved' },
  { id: 'Rejected', value: 'Rejected' },
]

export default function LeaveRequestsPage() {
  const pathname = usePathname()
  const isPortal = (pathname.startsWith('/branch') && !pathname.startsWith('/branch-management')) || 
                   pathname.startsWith('/staff') || 
                   (pathname.startsWith('/student') && !pathname.startsWith('/student-information'))

  const [searchTerm, setSearchTerm] = useState("")
  const [filterRoles, setFilterRoles] = useState<string[]>([])
  const [filterTypes, setFilterTypes] = useState<string[]>([])
  const [filterStatuses, setFilterStatuses] = useState<string[]>([])
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const [instituteName, setInstituteName] = useState("Your Institute")
  const [requests, setRequests] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [actionTarget, setActionTarget] = useState<{id: string, action: 'approve' | 'reject'} | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dropdownData, setDropdownData] = useState<Record<string, any[]>>({})

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { database } = useFirebase()
  const { user } = useUser()
  const { resolvedId, branchId, isBranch, isStaff, staffId } = useResolvedId()

  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])

  useEffect(() => {
    if (!database || !resolvedId) return
    const rootPath = `Institutes/${resolvedId}`
    
    onValue(ref(database, `${rootPath}/profile`), (snapshot) => {
      if (snapshot.val()?.instituteName) setInstituteName(snapshot.val().instituteName)
    })

    onValue(ref(database, `${rootPath}/employees`), (s) => {
      const data = s.val() || {}
      setEmployees(Object.keys(data).map(k => ({ ...data[k], id: k })))
    })
    onValue(ref(database, `${rootPath}/admissions`), (s) => {
      const data = s.val() || {}
      setStudents(Object.keys(data).map(k => ({ ...data[k], id: k })))
    })

    onValue(ref(database, `${rootPath}/dropdowns`), (snapshot) => {
      const data = snapshot.val() || {}
      const processed: Record<string, any[]> = {}
      Object.keys(data).forEach(key => { 
        processed[key] = Object.keys(data[key]).map(id => ({ id, value: data[key][id].value })) 
      })
      setDropdownData(processed)
    })

    setIsLoading(true)
    const leavesRef = ref(database, `${rootPath}/leave-requests`)
    const unsubscribe = onValue(leavesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setRequests(Object.keys(data).map(key => ({ ...data[key], id: key })))
      } else {
        setRequests([])
      }
      setIsLoading(false)
    })

    return () => off(leavesRef)
  }, [database, resolvedId])

  const hasActiveFilters = useMemo(() => {
    return filterRoles.length > 0 || filterTypes.length > 0 || filterStatuses.length > 0 || fromDate !== "" || toDate !== "" || searchTerm !== ""
  }, [filterRoles, filterTypes, filterStatuses, fromDate, toDate, searchTerm])

  const filteredRequests = useMemo(() => {
    let list = requests
    
    if (isStaff && staffId) {
      list = list.filter(r => r.requesterId === staffId)
    }

    return list.filter(r => {
      const matchesSearch = !searchTerm || r.requesterName?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = filterStatuses.length === 0 || filterStatuses.includes(r.status)
      const matchesType = filterTypes.length === 0 || filterTypes.includes(r.leaveType)
      const matchesRole = filterRoles.length === 0 || filterRoles.includes(r.role)
      
      let matchesDateRange = true
      if (fromDate || toDate) {
        if (fromDate && r.fromDate < fromDate) matchesDateRange = false
        if (toDate && r.toDate > toDate) matchesDateRange = false
      }

      return matchesSearch && matchesStatus && matchesType && matchesRole && matchesDateRange
    }).sort((a, b) => new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime())
  }, [requests, searchTerm, filterStatuses, filterTypes, filterRoles, fromDate, toDate, isStaff, staffId])

  const usageMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    requests.forEach(r => {
      if (r.status === 'Approved') {
        if (!map[r.requesterId]) map[r.requesterId] = {}
        const type = r.leaveType || 'General'
        map[r.requesterId][type] = (map[r.requesterId][type] || 0) + (Number(r.totalDays) || 0)
      }
    })
    return map
  }, [requests])

  const getRemaining = (requesterId: string, type: string) => {
    const used = usageMap[requesterId]?.[type] || 0
    const total = ALLOWED_LEAVES[type] || 10
    return Math.max(0, total - used)
  }

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage)
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredRequests.slice(start, start + itemsPerPage)
  }, [filteredRequests, currentPage])

  const handleUpdateStatus = async () => {
    if (!database || !user || !actionTarget) return
    const targetRequest = requests.find(r => r.id === actionTarget.id)
    if (!targetRequest) return

    const newStatus = actionTarget.action === 'approve' ? 'Approved' : 'Rejected'
    const now = new Date().toISOString()

    try {
      const rootPath = `Institutes/${resolvedId}`
      await update(ref(database, `${rootPath}/leave-requests/${actionTarget.id}`), {
        status: newStatus,
        handledAt: now
      })

      await push(ref(database, `${rootPath}/notifications/${targetRequest.requesterId}`), {
        title: `Leave ${newStatus}`,
        message: `Your ${targetRequest.leaveType} request for ${targetRequest.fromDate} has been ${newStatus.toLowerCase()}.`,
        type: 'Leave',
        read: false,
        timestamp: now
      })

      toast({ title: `Leave ${newStatus}`, description: `Request processed successfully.` })
    } catch (e) {
      toast({ variant: "destructive", title: "Update Failed" })
    } finally {
      setIsConfirmOpen(false)
      setActionTarget(null)
    }
  }

  const handleRecordLeave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!database || !resolvedId || isSubmitting) return
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const personId = formData.get("requesterId") as string
    const role = formData.get("role") as string
    
    let personName = "Unknown"
    if (role === 'Student') {
      personName = students.find(s => s.id === personId)?.studentName || personName
    } else {
      const staff = employees.find(e => e.id === personId)
      personName = staff ? `${staff.firstName} ${staff.lastName}` : personName
    }

    const start = formData.get("fromDate") as string
    const end = formData.get("toDate") as string
    const days = differenceInDays(parseISO(end), parseISO(start)) + 1

    const leaveData = {
      requesterId: personId,
      requesterName: personName,
      role,
      leaveType: formData.get("leaveType") as string,
      fromDate: start,
      toDate: end,
      totalDays: days,
      reason: formData.get("reason") as string,
      status: "Approved",
      appliedDate: new Date().toISOString(),
      updatedAt: Date.now()
    }

    try {
      await push(ref(database, `Institutes/${resolvedId}/leave-requests`), leaveData)
      toast({ title: "Leave Recorded" })
      setIsModalOpen(false)
    } catch (err) {
      toast({ variant: "destructive", title: "Failed" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const downloadSampleCSV = () => {
    const ws = XLSX.utils.json_to_sheet([{ 
      Name: "John Smith", 
      Role: "Staff", 
      Leave_Type: "Sick Leave", 
      From_Date: today, 
      To_Date: today, 
      Reason: "Medical checkup"
    }])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Sample")
    XLSX.writeFile(wb, "leave_import_sample.csv")
  }

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !resolvedId || !database) return
    const reader = new FileReader()
    reader.onload = async (evt) => {
      const bstr = evt.target?.result
      const wb = XLSX.read(bstr, { type: 'binary' })
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])
      const dbPath = `Institutes/${resolvedId}/leave-requests`
      let count = 0
      for (const row of data as any[]) {
        const start = row.From_Date || today
        const end = row.To_Date || today
        const days = differenceInDays(parseISO(end), parseISO(start)) + 1
        
        await push(ref(database, dbPath), {
          requesterName: row.Name || "Imported User",
          role: row.Role || "Staff",
          leaveType: row.Leave_Type || "General",
          fromDate: start,
          toDate: end,
          totalDays: days,
          reason: row.Reason || "Imported Record",
          status: "Approved",
          appliedDate: new Date().toISOString(),
          updatedAt: Date.now(),
          requesterId: `IMP-${Date.now()}`
        })
        count++
      }
      toast({ title: "Import Successful", description: `${count} leave records processed.` })
    }
    reader.readAsBinaryString(file)
    e.target.value = ""
  }

  const toggleMultiSelect = (state: string[], setter: (v: string[]) => void, value: string) => {
    if (state.includes(value)) setter(state.filter(v => v !== value))
    else setter([...state, value])
    setCurrentPage(1)
  }

  const resetFilters = () => {
    setFilterRoles([]); setFilterTypes([]); setFilterStatuses([]);
    setFromDate(""); setToDate(""); setSearchTerm(""); setCurrentPage(1);
  }

  const exportPDF = () => {
    if (!filteredRequests.length) return
    const doc = new jsPDF('l', 'mm', 'a4')
    doc.setFontSize(20).setTextColor(13, 148, 136).text(instituteName, 14, 20)
    doc.setFontSize(12).setTextColor(100).text('Leave Management Report', 14, 30)
    const tableData = filteredRequests.map((r, i) => [i + 1, r.requesterName, r.role, r.leaveType, `${r.fromDate} - ${r.toDate}`, r.totalDays, r.status])
    autoTable(doc, { startY: 40, head: [['#', 'Name', 'Role', 'Category', 'Duration', 'Days', 'Status']], body: tableData, theme: 'striped', headStyles: { fillColor: [13, 148, 136] } })
    doc.save(`Leave_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`)
  }

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredRequests.map((r, i) => ({ "#": i + 1, "Name": r.requesterName, "Role": r.role, "Type": r.leaveType, "From": r.fromDate, "To": r.toDate, "Days": r.totalDays, "Status": r.status })))
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Leaves"); XLSX.writeFile(wb, "Leave_Registry.xlsx")
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      {!isPortal && <Sidebar />}
      <div className={cn("flex flex-col flex-1 min-w-0", !isPortal && "lg:pl-[280px]")}>
        {!isPortal && <TopNav />}
        <main className="flex-1 p-8 space-y-8 animate-in fade-in duration-500 w-full overflow-x-hidden">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div>
              <h2 className="text-3xl font-black text-black font-public-sans tracking-tight leading-none">LEAVE MANAGEMENT</h2>
              <p className="text-[14px] text-black font-medium mt-1">Review and process institutional absence requests</p>
            </div>
          </div>

          <Card className="border-none shadow-sm rounded-2xl bg-white p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-black tracking-tight">Select Criteria</h3>
              {hasActiveFilters && (
                <Button onClick={resetFilters} variant="ghost" className="h-8 px-4 text-rose-500 hover:bg-rose-50 rounded-lg text-[10px] font-black tracking-widest gap-2">
                  Reset Filters <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
              <MultiCriteriaBox label="ROLE" selected={filterRoles} onToggle={(v) => toggleMultiSelect(filterRoles, setFilterRoles, v)} options={[{id: 'Student', value: 'Student'}, {id: 'Staff', value: 'Staff'}]} />
              <MultiCriteriaBox label="LEAVE TYPE" selected={filterTypes} onToggle={(v) => toggleMultiSelect(filterTypes, setFilterTypes, v)} options={Object.keys(ALLOWED_LEAVES).map(k => ({id: k, value: k}))} />
              <MultiCriteriaBox label="STATUS" selected={filterStatuses} onToggle={(v) => toggleMultiSelect(filterStatuses, setFilterStatuses, v)} options={STATUS_OPTIONS} />
              <div className="space-y-2"><Label className="text-[11px] font-black text-black tracking-widest ml-1">FROM DATE</Label><Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }} className="h-10 rounded-lg border-zinc-200 text-[14px] font-bold text-black shadow-inner" /></div>
              <div className="space-y-2"><Label className="text-[11px] font-black text-black tracking-widest ml-1">TO DATE</Label><Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }} className="h-10 rounded-lg border-zinc-200 text-[14px] font-bold text-black shadow-inner" /></div>
              <div className="space-y-2">
                <Label className="text-[11px] font-black text-black tracking-widest ml-1">SEARCH</Label>
                <div className="relative group">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
                  <Input placeholder="Search Name..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="pl-10 h-10 border-zinc-200 rounded-lg text-[14px] font-bold text-black focus-visible:ring-primary shadow-inner transition-none" />
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-black text-black tracking-tight">Leave List ({filteredRequests.length})</h3>
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:opacity-90 text-white h-7 px-3 text-[10px] font-black rounded-lg border-none shadow-sm transition-all active:scale-95">Record Leave+</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl w-[95vw] p-0 border-none rounded-[32px] overflow-hidden bg-white shadow-2xl max-h-[95vh] flex flex-col">
                    <div className="bg-white px-10 pt-10 pb-6 border-b">
                      <DialogTitle className="text-2xl font-black text-black font-public-sans">Log Leave Entry</DialogTitle>
                      <p className="text-[10px] font-bold text-black tracking-widest mt-1">Manual Attendance Override</p>
                    </div>
                    <ScrollArea className="flex-1 w-full text-black" type="always">
                      <form onSubmit={handleRecordLeave} className="p-10 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-black tracking-widest ml-1">Requester Role</Label>
                            <Select name="role" defaultValue="Student">
                              <SelectTrigger className="h-12 rounded-xl border-zinc-200"><SelectValue /></SelectTrigger>
                              <SelectContent><SelectItem value="Student">Student</SelectItem><SelectItem value="Staff">Staff</SelectItem></SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-black tracking-widest ml-1">Select Person</Label>
                            <Select name="requesterId" required>
                              <SelectTrigger className="h-12 rounded-xl border-zinc-200"><SelectValue placeholder="Search name..." /></SelectTrigger>
                              <SelectContent>
                                {students.map(s => <SelectItem key={s.id} value={s.id}>{s.studentName} (Student)</SelectItem>)}
                                {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} (Staff)</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-black tracking-widest ml-1">Leave Category</Label>
                            <Select name="leaveType" defaultValue="Casual Leave">
                              <SelectTrigger className="h-12 rounded-xl border-zinc-200"><SelectValue /></SelectTrigger>
                              <SelectContent>{Object.keys(ALLOWED_LEAVES).map(key => <SelectItem key={key} value={key}>{key}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5"><Label className="text-[10px] font-bold text-black tracking-widest ml-1">Start Date</Label><Input name="fromDate" type="date" required className="h-12 rounded-xl" /></div>
                          <div className="space-y-1.5"><Label className="text-[10px] font-bold text-black tracking-widest ml-1">End Date</Label><Input name="toDate" type="date" required className="h-12 rounded-xl" /></div>
                          <div className="md:col-span-2 space-y-1.5"><Label className="text-[10px] font-bold text-black tracking-widest ml-1">Internal Note</Label><Textarea name="reason" placeholder="Reason for leave..." className="rounded-xl min-h-[100px]" /></div>
                        </div>
                        <Button type="submit" disabled={isSubmitting} className="w-full bg-primary h-14 rounded-2xl font-black text-[14px] tracking-widest shadow-xl border-none active:scale-95 transition-all">
                          {isSubmitting ? <Loader2 className="animate-spin" /> : "Confirm Leave Entry"}
                        </Button>
                      </form>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Button variant="outline" onClick={downloadSampleCSV} className="h-11 px-5 text-[hsl(var(--primary))] border-[hsl(var(--primary))]/20 rounded-xl transition-none gap-2 font-bold text-[14px] bg-white hover:bg-emerald-50 shadow-sm"><Download className="h-4 w-4" /> Sample CSV</Button>
                <input type="file" ref={fileInputRef} onChange={handleImportCSV} className="hidden" accept=".csv" />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-11 px-5 text-indigo-600 border-indigo-100 rounded-xl transition-none gap-2 font-bold text-[14px] bg-white hover:bg-indigo-50 shadow-sm"><Upload className="h-4 w-4" /> Import CSV</Button>
                <Button variant="outline" onClick={exportExcel} className="h-11 px-5 text-emerald-600 border-emerald-100 rounded-xl transition-none gap-2.5 font-bold text-[14px] bg-white hover:bg-emerald-50 shadow-sm"><FileSpreadsheet className="h-4 w-4" /> Export Excel</Button>
                <Button variant="outline" onClick={exportPDF} className="h-11 px-4 text-rose-600 border-rose-100 rounded-xl transition-none gap-2.5 font-bold text-[14px] bg-white hover:bg-rose-50 shadow-sm"><FileText className="h-4 w-4" /> Export PDF</Button>
              </div>
            </div>

            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
              <div className="overflow-x-auto scrollbar-thin">
                <Table className="min-w-[1600px]">
                  <TableHeader className="bg-zinc-50/50">
                    <TableRow className="border-zinc-100">
                      <TableHead className="pl-8 text-[14px] font-bold text-black tracking-widest h-14 w-20">SR NO.</TableHead>
                      <TableHead className="text-[14px] font-bold text-black tracking-widest h-14">Requester</TableHead>
                      <TableHead className="text-[14px] font-bold text-black tracking-widest h-14">Leave Type</TableHead>
                      <TableHead className="text-[14px] font-bold text-black tracking-widest h-14">Duration</TableHead>
                      <TableHead className="text-[14px] font-bold text-black tracking-widest h-14 text-center">Days</TableHead>
                      <TableHead className="text-[14px] font-bold text-black tracking-widest h-14 text-center">Balance</TableHead>
                      <TableHead className="text-[14px] font-bold text-black tracking-widest h-14 text-center">Status</TableHead>
                      <TableHead className="text-right pr-8 text-[14px] font-bold text-black tracking-widest h-14">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRequests.map((row, index) => (
                      <TableRow key={row.id} className="border-zinc-50 group hover:bg-zinc-50/30 transition-none">
                        <TableCell className="text-[14px] font-medium text-black pl-8">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-primary font-bold text-[14px]">{row.requesterName?.charAt(0)}</div>
                            <div><span className="text-[14px] font-medium text-black font-public-sans">{row.requesterName}</span><p className="text-[9px] font-bold text-black">{row.role}</p></div>
                          </div>
                        </TableCell>
                        <TableCell className="text-[14px] text-black">{row.leaveType}</TableCell>
                        <TableCell className="text-[14px] text-black font-medium">{row.fromDate} to {row.toDate}</TableCell>
                        <TableCell className="text-center font-black text-black">{row.totalDays}</TableCell>
                        <TableCell className="text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className={cn("text-[14px] font-black", getRemaining(row.requesterId, row.leaveType) < 3 ? "text-rose-500" : "text-emerald-600")}>{getRemaining(row.requesterId, row.leaveType)}</span>
                            <span className="text-[8px] font-bold text-zinc-300">Days Left</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn("rounded-lg px-3 py-1 text-[9px] font-black  border-none shadow-none", row.status === 'Approved' ? "bg-emerald-50 text-emerald-600" : row.status === 'Rejected' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600")}>{row.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {row.status === 'Pending' ? (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" onClick={() => { setActionTarget({ id: row.id, action: 'approve' }); setIsConfirmOpen(true); }} className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 text-[10px] font-bold rounded-lg border-none shadow-sm transition-all">Approve</Button>
                              <Button size="sm" onClick={() => { setActionTarget({ id: row.id, action: 'reject' }); setIsConfirmOpen(true); }} className="bg-rose-500 hover:bg-rose-600 text-white h-8 text-[10px] font-bold rounded-lg border-none shadow-sm transition-all">Reject</Button>
                            </div>
                          ) : <History className="w-4 h-4 text-zinc-200 ml-auto" />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2">
              <p className="text-[10px] font-black text-black tracking-widest">Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredRequests.length)} of {filteredRequests.length} entries</p>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-4">
                  <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-9 rounded-xl font-bold text-[10px] tracking-widest transition-none"><ChevronLeft className="w-4 h-4 mr-2" /> Previous</Button>
                  <div className="flex items-center gap-2">{[...Array(totalPages)].map((_, i) => (<button key={i} onClick={() => setCurrentPage(i + 1)} className={cn("w-10 h-10 rounded-xl text-[10px] font-black transition-all", currentPage === i + 1 ? "bg-primary text-white shadow-xl scale-110" : "bg-white text-black border border-zinc-100")}>{i + 1}</button>))}</div>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-9 rounded-xl font-bold text-[10px] tracking-widest transition-none">Next <ChevronRight className="w-4 h-4 ml-2" /></Button>
                </div>
              )}
            </div>
          </div>

          <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
            <AlertDialogContent className="rounded-[32px] border-none shadow-2xl p-10 bg-white">
              <AlertDialogHeader className="space-y-4">
                <div className={cn("w-16 h-16 rounded-[24px] flex items-center justify-center shadow-inner", actionTarget?.action === 'approve' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                  {actionTarget?.action === 'approve' ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
                </div>
                <div className="space-y-1">
                  <AlertDialogTitle className="text-2xl font-black text-black tracking-tight">Confirm {actionTarget?.action}</AlertDialogTitle>
                  <AlertDialogDescription className="text-black text-[14px] leading-relaxed font-medium">Are you sure you want to <span className="font-bold text-black">{actionTarget?.action}</span> this leave request? This action will notify the requester instantly.</AlertDialogDescription>
                </div>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-8 gap-3">
                <AlertDialogCancel className="rounded-xl border-zinc-100 text-black font-black text-[10px] tracking-widest h-12 px-8">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleUpdateStatus} className={cn("rounded-xl font-black  text-[10px] tracking-widest h-12 px-8 border-none shadow-lg transition-all active:scale-95", actionTarget?.action === 'approve' ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-rose-500 hover:bg-rose-600 text-white")}>Confirm Action</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </div>
  )
}

function MultiCriteriaBox({ label, selected, onToggle, options }: { label: string, selected: string[], onToggle: (v: string) => void, options: any[] }) {
  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-bold text-black tracking-widest">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button className="w-full h-10 px-4 rounded-lg border border-zinc-200 bg-white flex items-center justify-between text-[14px] font-bold text-black shadow-inner group hover:border-primary transition-colors transition-none">
            <span className="truncate">{selected.length > 0 ? `${selected.length} Selected` : "Select Options"}</span>
            <Filter className="w-3 h-3 text-zinc-300 group-hover:text-primary" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0 rounded-2xl overflow-hidden border-zinc-100 shadow-2xl">
          <div className="bg-zinc-50 p-4 border-b border-zinc-100"><p className="text-[9px] font-black text-black tracking-widest">Select Multiple</p></div>
          <ScrollArea className="h-64" type="always">
            <div className="p-2 space-y-1">
              {options.map(opt => (
                <div key={opt.id} onClick={() => onToggle(opt.value)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 cursor-pointer transition-colors group">
                  <Checkbox checked={selected.includes(opt.value)} onCheckedChange={() => onToggle(opt.value)} className="data-[state=checked]:bg-primary" />
                  <span className="text-[14px] font-bold text-black group-hover:text-black">{opt.value}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  )
}
