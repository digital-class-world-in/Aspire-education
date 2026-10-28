
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Plus, 
  Search, 
  Trash2, 
  X,
  CalendarDays,
  User,
  History,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  XCircle,
  AlertCircle,
  Loader2,
  Save,
  ShieldCheck,
  Briefcase,
  FileText,
  Eye,
  Filter
} from "lucide-react"
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
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, remove, off, update, set } from "firebase/database"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { format, differenceInDays, parseISO } from "date-fns"
import { usePathname } from "next/navigation"
import { useResolvedId } from "@/hooks/use-resolved-id"

const LEAVE_TYPES = [
  "Casual Leave",
  "Sick Leave",
  "Paid Leave",
  "Emergency Leave",
  "Half Day"
]

const STATUS_OPTIONS = ["Pending", "Approved", "Rejected"]

export default function HRLeaveRequestPage() {
  const pathname = usePathname()
  const isPortal = (pathname.startsWith('/branch') && !pathname.startsWith('/branch-management')) || 
                   pathname.startsWith('/staff') || 
                   (pathname.startsWith('/student') && !pathname.startsWith('/student-information'))

  const { database } = useFirebase()
  const { resolvedId, staffId, isStaff } = useResolvedId()
  const { user } = useUser()
  const { toast } = useToast()

  const [requests, setRequests] = useState<any[]>([])
  const [staffList, setStaffList] = useState<any[]>([])
  const [staffProfile, setStaffProfile] = useState<any>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Rejection State
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  // Form State
  const [leaveType, setLeaveType] = useState("Casual Leave")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [reason, setReason] = useState("")

  // Filter States
  const [searchTerm, setSearchTerm] = useState("")
  const [filterDept, setFilterDept] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [dropdownData, setDropdownData] = useState<Record<string, any[]>>({})

  useEffect(() => {
    if (!database || !resolvedId) return
    const rootPath = `Institutes/${resolvedId}`
    
    // Fetch Requests
    const leavesRef = ref(database, `${rootPath}/leave-requests`)
    onValue(leavesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) setRequests(Object.keys(data).map(key => ({ ...data[key], id: key })))
      else setRequests([])
      setIsLoading(false)
    })

    // Fetch Staff List
    onValue(ref(database, `${rootPath}/employees`), (snapshot) => {
      const data = snapshot.val() || {}
      const list = Object.keys(data).map(k => ({ ...data[k], id: k }))
      setStaffList(list)
      
      if (isStaff && staffId) {
        setStaffProfile(list.find(e => e.id === staffId))
      }
    })

    onValue(ref(database, `${rootPath}/dropdowns`), (snapshot) => {
      const data = snapshot.val() || {}
      const processed: Record<string, any[]> = {}
      Object.keys(data).forEach(key => { 
        processed[key] = Object.keys(data[key]).map(id => ({ id, value: data[key][id].value })) 
      })
      setDropdownData(processed)
    })

    return () => off(leavesRef)
  }, [database, resolvedId, isStaff, staffId])

  const resetFilters = () => {
    setSearchTerm("")
    setFilterDept("all")
    setFilterType("all")
    setFilterStatus("all")
    setFromDate("")
    setToDate("")
    setCurrentPage(1)
  }

  const filteredRequests = useMemo(() => {
    let list = requests
    if (isStaff && staffId) {
      list = list.filter(r => r.requesterId === staffId)
    }

    return list.filter(r => {
      const matchSearch = !searchTerm || r.requesterName?.toLowerCase().includes(searchTerm.toLowerCase()) || r.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchDept = filterDept === 'all' || r.department === filterDept
      const matchType = filterType === 'all' || r.leaveType === filterType
      const matchStatus = filterStatus === 'all' || r.status === filterStatus
      
      let matchDateRange = true
      if (fromDate || toDate) {
        if (fromDate && r.fromDate < fromDate) matchDateRange = false
        if (toDate && r.toDate > toDate) matchDateRange = false
      }

      return matchSearch && matchDept && matchType && matchStatus && matchDateRange
    }).sort((a, b) => new Date(b.appliedDate || 0).getTime() - new Date(a.appliedDate || 0).getTime())
  }, [requests, searchTerm, filterDept, filterType, filterStatus, fromDate, toDate, isStaff, staffId])

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage)
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const totalDaysCalc = useMemo(() => {
    if (leaveType === 'Half Day') return 0.5
    if (!fromDate || !toDate) return 0
    const diff = differenceInDays(parseISO(toDate), parseISO(fromDate)) + 1
    return diff > 0 ? diff : 0
  }, [fromDate, toDate, leaveType])

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!database || !resolvedId || !staffProfile || isSubmitting) return

    if (totalDaysCalc <= 0) {
      toast({ variant: "destructive", title: "Invalid Duration", description: "Return date must be after start date." })
      return
    }

    setIsSubmitting(true)
    const leaveData = {
      requesterId: staffId,
      requesterName: `${staffProfile.firstName} ${staffProfile.lastName}`,
      department: staffProfile.department || "Academic",
      employeeId: staffProfile.employeeId || "N/A",
      role: "Staff",
      leaveType,
      fromDate,
      toDate: leaveType === 'Half Day' ? fromDate : toDate,
      totalDays: totalDaysCalc,
      reason,
      status: "Pending",
      appliedDate: new Date().toISOString(),
      updatedAt: Date.now()
    }

    try {
      await push(ref(database, `Institutes/${resolvedId}/leave-requests`), leaveData)
      toast({ title: "Application Sent", description: "Request synchronized with administrator dashboard." })
      setIsModalOpen(false)
      setFromDate(""); setToDate(""); setReason("");
    } catch (err) {
      toast({ variant: "destructive", title: "Sync Failed" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleProcessAction = async (id: string, action: 'Approved' | 'Rejected') => {
    if (!database || !resolvedId) return
    
    if (action === 'Rejected' && !rejectReason) {
      setRejectId(id)
      setIsRejectModalOpen(true)
      return
    }

    try {
      const now = new Date().toISOString()
      const adminName = user?.displayName || "Administrator"
      const updates: any = {
        status: action,
        handledAt: now,
        handledBy: adminName,
        approvedBy: action === 'Approved' ? adminName : null
      }

      if (action === 'Rejected') updates.rejectReason = rejectReason

      await update(ref(database, `Institutes/${resolvedId}/leave-requests/${id}`), updates)

      const request = requests.find(r => r.id === id)
      if (request) {
        await push(ref(database, `Institutes/${resolvedId}/notifications/${request.requesterId}`), {
          title: `Leave ${action}`,
          message: `Your ${request.leaveType} for ${request.fromDate} has been ${action.toLowerCase()}.`,
          type: 'Leave',
          read: false,
          timestamp: now
        })
      }

      toast({ title: `Leave ${action}` })
      setIsRejectModalOpen(false)
      setRejectReason("")
      setRejectId(null)
    } catch (e) {
      toast({ variant: "destructive", title: "Action Failed" })
    }
  }

  const mainContent = (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 w-full overflow-x-hidden font-public-sans text-black text-[14px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h2 className="text-[26px] font-normal text-black font-public-sans leading-none">Leave {isStaff ? 'Request' : 'Management'}</h2>
          <p className="text-[14px] text-black font-medium mt-1.5">
            {isStaff ? 'Apply for absence and track approval nodes' : 'Monitor and authorize faculty absence requests'}
          </p>
        </div>
        
        {isStaff && (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-8 font-black text-[14px] tracking-widest shadow-lg border-none active:scale-95 transition-all">
                <Plus className="h-4 w-4" /> Apply for Leave
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl p-0 border-none rounded-[40px] overflow-hidden bg-white shadow-2xl">
              <div className="bg-[#1e3a8a] px-10 py-8 text-white relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
                <DialogTitle className="text-2xl font-black tracking-tight font-public-sans">New Application</DialogTitle>
                <p className="text-blue-200 text-[14px] font-bold tracking-widest mt-1">Authorized Absence Protocol</p>
                
              </div>
              <ScrollArea className="max-h-[80vh]">
                <form onSubmit={handleApplyLeave} className="p-10 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-[12px] font-bold text-black tracking-widest ml-1">Leave Category *</Label>
                      <Select value={leaveType} onValueChange={setLeaveType} required>
                        <SelectTrigger className="h-12 rounded-xl border-zinc-200 bg-white font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl shadow-xl">{LEAVE_TYPES.map(t => <SelectItem key={t} value={t} className="font-bold text-[12px]">{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-bold text-black tracking-widest ml-1">From Date</Label>
                      <Input type="date" required value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-12 rounded-xl border-zinc-200 font-bold" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-bold text-black tracking-widest ml-1">To Date</Label>
                      <Input type="date" required value={toDate} onChange={e => setToDate(e.target.value)} className="h-12 rounded-xl border-zinc-200 font-bold" />
                    </div>

                    <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-[12px] font-bold text-black tracking-widest ml-1">Reason for Absence</Label>
                      <Textarea value={reason} onChange={e => setReason(e.target.value)} required placeholder="Describe the reason for your leave request..." className="rounded-2xl border-zinc-200 min-h-[120px] font-medium" />
                    </div>
                  </div>

                  <div className="bg-[#1e3a8a] p-6 rounded-3xl text-white flex justify-between items-center shadow-lg">
                    <div><p className="text-[10px] font-bold text-blue-200 tracking-widest">Calculated Duration</p><p className="text-xl font-black">{totalDaysCalc} Day(s)</p></div>
                  </div>

                  <Button type="submit" disabled={isSubmitting || totalDaysCalc === 0} className="w-full h-16 bg-zinc-900 hover:bg-black text-white rounded-[24px] font-black text-[14px] tracking-[0.2em] shadow-xl border-none active:scale-95 transition-all flex items-center justify-center gap-3">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-5 h-5" />} Commit Application
                  </Button>
                </form>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!isStaff && (
        <Card className="border border-zinc-100 shadow-sm rounded-2xl bg-white p-8 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-normal text-black tracking-tight">Filtering Matrix</h3>
            <Button variant="ghost" onClick={resetFilters} className="text-[10px] font-black text-black tracking-widest gap-2">
              Reset Filters <X className="w-3 h-3" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <CriteriaBox label="Department" value={filterDept} onChange={setFilterDept} options={dropdownData['department'] || []} />
            <CriteriaBox label="Leave Type" value={filterType} onChange={setFilterType} options={LEAVE_TYPES.map(t => ({id: t, value: t}))} />
            <CriteriaBox label="Status" value={filterStatus} onChange={setFilterStatus} options={STATUS_OPTIONS.map(s => ({id: s, value: s}))} />
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-black tracking-widest ml-1">Search Employee</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-300" />
                <Input placeholder="Name or ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-11 rounded-xl bg-zinc-50 border-none font-bold shadow-inner" />
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
        <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
          <h3 className="text-[14px] font-black text-black tracking-widest">Leave Application Registry</h3>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <Table className="min-w-[1400px]">
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="border-zinc-100">
                <TableHead className="pl-10 text-[11px] font-black text-black h-14 w-20">#</TableHead>
                <TableHead className="text-[11px] font-black text-black h-14">EMPLOYEE IDENTITY</TableHead>
                <TableHead className="text-[11px] font-black text-black h-14">CATEGORY</TableHead>
                <TableHead className="text-[11px] font-black text-black h-14">SCHEDULE</TableHead>
                <TableHead className="text-[11px] font-black text-black h-14 text-center">DAYS</TableHead>
                <TableHead className="text-[11px] font-black text-black h-14 text-center">STATUS</TableHead>
                <TableHead className="text-right pr-10 text-[11px] font-black text-black h-14">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRequests.map((row, index) => (
                <TableRow key={row.id} className="border-zinc-50 hover:bg-zinc-50/30 transition-none group text-black font-public-sans">
                  <TableCell className="pl-10 text-[14px] font-bold text-zinc-300">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                  <TableCell className="py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-[#1e3a8a] shadow-inner font-black text-[14px]">{row.requesterName?.charAt(0)}</div>
                      <div className="flex flex-col">
                        <span className="text-[14px] font-black text-black tracking-tight">{row.requesterName}</span>
                        <span className="text-[9px] font-bold text-black">{row.department} • {row.employeeId}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-[14px] font-bold text-black">{row.leaveType}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-bold text-black font-public-sans tracking-tighter">{row.fromDate} to {row.toDate}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-black text-black">{row.totalDays}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={cn(
                      "rounded-lg px-3 py-1 text-[9px] font-black  border-none shadow-none transition-none",
                      row.status === 'Approved' ? "bg-emerald-50 text-emerald-600" :
                      row.status === 'Rejected' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                    )}>{row.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right pr-10">
                    {!isStaff && row.status === 'Pending' ? (
                      <div className="flex justify-end gap-2">
                        <Button onClick={() => handleProcessAction(row.id, 'Approved')} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 text-[10px] font-bold rounded-lg border-none shadow-sm transition-all active:scale-90">Approve</Button>
                        <Button onClick={() => { setRejectId(row.id); setIsRejectModalOpen(true); }} size="sm" className="bg-rose-500 hover:bg-rose-600 text-white h-8 text-[10px] font-bold rounded-lg border-none shadow-sm transition-all active:scale-90">Reject</Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end opacity-40">
                        <span className="text-[9px] font-black text-black tracking-widest">{row.status === 'Approved' ? 'Approved By' : row.status === 'Rejected' ? 'Reason' : 'Applied At'}</span>
                        <span className="text-[11px] font-bold text-black truncate max-w-[150px]">{row.approvedBy || row.rejectReason || (row.appliedDate ? format(new Date(row.appliedDate), "PPP") : '-')}</span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {paginatedRequests.length === 0 && (
                <TableRow><TableCell colSpan={7} className="h-64 text-center"><div className="flex flex-col items-center justify-center space-y-4"><div className="p-8 rounded-[40px] bg-zinc-50 text-zinc-200"><History className="w-12 h-12" /></div><p className="text-[14px] font-black text-zinc-300 tracking-widest">No applications found</p></div></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-9 rounded-xl font-bold text-[10px] tracking-widest transition-all"><ChevronLeft className="w-4 h-4 mr-2" /> Previous</Button>
          <div className="flex items-center gap-2">
            {[...Array(totalPages)].map((_, i) => (
              <button 
                key={i} 
                onClick={() => setCurrentPage(i + 1)} 
                className={cn(
                  "w-10 h-10 rounded-xl text-[10px] font-black transition-all", 
                  currentPage === i + 1 ? "bg-primary text-white shadow-xl scale-110" : "bg-white text-black border border-zinc-100"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-9 rounded-xl font-bold text-[10px] tracking-widest transition-all">Next <ChevronRight className="w-4 h-4 ml-2" /></Button>
        </div>
      )}

      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="max-w-md p-0 border-none rounded-[32px] overflow-hidden bg-white shadow-2xl">
          <div className="bg-rose-600 p-8 text-white"><DialogTitle className="text-xl font-black tracking-tight">Rejection Context</DialogTitle><p className="text-rose-100 text-[14px] font-bold tracking-widest mt-1">Reason Required for Denial</p></div>
          <div className="p-8 space-y-6">
            <div className="space-y-1.5"><Label className="text-[10px] font-black text-black tracking-widest ml-1">Explain why this leave was denied *</Label><Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} required placeholder="Operation requirements / Insufficient notice..." className="rounded-2xl border-zinc-100 min-h-[120px] font-medium" /></div>
            <Button onClick={() => handleProcessAction(rejectId!, 'Rejected')} disabled={!rejectReason.trim()} className="w-full h-14 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-[14px] tracking-widest shadow-xl border-none active:scale-95 transition-all">Submit Rejection</Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )

  if (isPortal) return mainContent

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans overflow-x-hidden">
      <Sidebar />
      <div className="lg:pl-[300px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        {mainContent}
      </div>
    </div>
  )
}

function CriteriaBox({ label, value, onChange, options }: { label: string, value: string, onChange: (v: string) => void, options: any[] }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-black text-black tracking-widest ml-1">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 rounded-xl border-none bg-zinc-50 font-bold text-black shadow-inner text-[12px] transition-none"><SelectValue placeholder="All" /></SelectTrigger>
        <SelectContent className="rounded-xl shadow-xl">
          <SelectItem value="all" className="font-bold text-[12px]">All {label}s</SelectItem>
          {options.map(opt => <SelectItem key={opt.id} value={opt.value} className="font-bold text-[12px]">{opt.value}</SelectItem>)}
        </SelectContent>
      </Select>
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
            <Filter className="w-3.5 h-3.5 text-zinc-300 group-hover:text-primary" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0 rounded-2xl overflow-hidden border-zinc-100 shadow-2xl">
          <div className="bg-zinc-50 p-4 border-b border-zinc-100"><p className="text-[9px] font-black text-black tracking-widest">Select Multiple</p></div>
          <ScrollArea className="h-64">
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
