
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ImageUpload } from "@/components/ImageUpload"
import {
  Plus,
  Search,
  Trash2,
  Layers,
  X,
  Clock,
  Calendar,
  CalendarDays,
  User,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  GraduationCap,
  Users,
  Check,
  MinusCircle,
  Edit2,
  Briefcase,
  Settings2,
  Save,
  FileText,
  Loader2,
  Eye,
  MessageSquare,
  FileSpreadsheet
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, set, remove, off, update } from "firebase/database"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { usePathname } from "next/navigation"
import { useResolvedId } from "@/hooks/use-resolved-id"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

const INITIAL_TIMETABLE = DAYS.reduce((acc, day) => ({
  ...acc,
  [day]: { enabled: false, start: "09:00", end: "11:00" }
}), {})

export default function BatchManagementPage() {
  const pathname = usePathname()
  const isStudent = pathname.startsWith('/student')
  const isPortal = pathname.startsWith('/branch') || pathname.startsWith('/staff') || isStudent

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAssignStudentOpen, setIsAssignStudentOpen] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<any>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [subSearchTerm, setSubSearchTerm] = useState("")
  const [batches, setBatches] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [staffList, setStaffList] = useState<any[]>([])
  const [dropdownData, setDropdownData] = useState<Record<string, any[]>>({})
  const [isLoading, setIsLoading] = useState(true)

  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])

  const [timetable, setTimetable] = useState<Record<string, { enabled: boolean, start: string, end: string }>>(INITIAL_TIMETABLE)

  const { database } = useFirebase()
  const { resolvedId, branchId, isBranch, isStaff, staffId } = useResolvedId()

  const [isManageOpen, setIsManageOpen] = useState(false)
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dailyDescription, setDailyDescription] = useState("")
  const [activityImage, setActivityImage] = useState("")
  const [activeManageField, setActiveManageField] = useState<{ key: string, label: string } | null>(null)
  const [newOptionValue, setNewOptionValue] = useState("")
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null)

  useEffect(() => {
    if (!database || !resolvedId) return

    const rootPath = `Institutes/${resolvedId}`
    const batchesRef = ref(database, `${rootPath}/batches`)
    const studentsRef = ref(database, `${rootPath}/admissions`)
    const staffRef = ref(database, `${rootPath}/employees`)
    const dropdownsRef = ref(database, `${rootPath}/dropdowns`)

    setIsLoading(true)

    const unsubscribeBatches = onValue(batchesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setBatches(Object.keys(data).map(key => ({ ...data[key], id: key })).reverse())
      } else {
        setBatches([])
      }
      setIsLoading(false)
    })

    const unsubscribeStudents = onValue(studentsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setStudents(Object.keys(data).map(key => ({ ...data[key], id: key })))
      } else {
        setStudents([])
      }
    })

    const unsubscribeStaff = onValue(staffRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setStaffList(Object.keys(data).map(key => ({ ...data[key], id: key })))
      } else {
        setStaffList([])
      }
    })

    const unsubDropdowns = onValue(dropdownsRef, (snapshot) => {
      const data = snapshot.val() || {}
      const processed: Record<string, any[]> = {}
      Object.keys(data).forEach(key => {
        processed[key] = Object.keys(data[key]).map(id => ({ id, value: data[key][id].value }))
      })
      setDropdownData(processed)
    })

    return () => {
      off(batchesRef)
      off(studentsRef)
      off(staffRef)
      off(dropdownsRef)
    }
  }, [database, resolvedId])

  // Keep selectedBatch state in sync with real-time updates while dialog is open
  useEffect(() => {
    if (selectedBatch && isAssignStudentOpen) {
      const current = batches.find(b => b.id === selectedBatch.id)
      if (current) setSelectedBatch(current)
    }
  }, [batches, isAssignStudentOpen])

  const filteredBatches = useMemo(() => {
    let list = batches
    if (isBranch && branchId) list = list.filter(b => b.branchId === branchId)

    // Portal Filtering
    if (isStaff && staffId) {
      const currentStaff = staffList.find(s => s.id === staffId)
      const staffFullName = currentStaff ? `${currentStaff.firstName} ${currentStaff.lastName}`.toLowerCase() : ""

      list = list.filter(b =>
        (b.faculty && b.faculty.toLowerCase().includes(staffFullName)) ||
        (b.assignedStaff && b.assignedStaff[staffId])
      )
    }
    if (isStudent && staffId) {
      list = list.filter(b => b.assignedStudents && b.assignedStudents[staffId])
    }

    if (!searchTerm) return list
    const lowerSearch = searchTerm.toLowerCase()
    return list.filter(b =>
      b.batchName?.toLowerCase().includes(lowerSearch) ||
      b.courseName?.toLowerCase().includes(lowerSearch) ||
      b.className?.toLowerCase().includes(lowerSearch)
    )
  }, [batches, searchTerm, isBranch, branchId, isStaff, isStudent, staffId, staffList])

  const filteredStudents = useMemo(() => {
    let list = students
    if (isBranch && branchId) list = list.filter(s => s.branchId === branchId)
    if (!subSearchTerm) return list
    return list.filter(s => s.studentName?.toLowerCase().includes(subSearchTerm.toLowerCase()))
  }, [students, subSearchTerm, isBranch, branchId])

  const handleToggleDay = (day: string) => {
    setTimetable(prev => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled }
    }))
  }

  const handleTimeChange = (day: string, field: 'start' | 'end', value: string) => {
    setTimetable(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }))
  }

  const handleSaveBatch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!resolvedId || !database) return

    const formData = new FormData(e.currentTarget)
    const facultyName = formData.get("faculty") as string

    const assignedStaffData: any = {}
    if (facultyName) {
      const matchedStaff = staffList.find(s => `${s.firstName} ${s.lastName}` === facultyName)
      if (matchedStaff) {
        assignedStaffData[matchedStaff.id] = true
      }
    }

    const batchData: any = {
      batchName: formData.get("batchName"),
      batchCode: formData.get("batchCode"),
      className: formData.get("className"),
      section: formData.get("section"),
      courseName: formData.get("courseName"),
      batchType: formData.get("batchType"),
      faculty: facultyName,
      assignedStaff: Object.keys(assignedStaffData).length > 0 ? assignedStaffData : null,
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate"),
      status: formData.get("status"),
      timetable: timetable,
      branchId: isBranch ? branchId : (selectedBatch?.branchId || null),
      createdBy: isStaff ? staffId : isBranch ? branchId : 'admin',
      updatedAt: Date.now()
    }

    if (selectedBatch?.id) {
      update(ref(database, `Institutes/${resolvedId}/batches/${selectedBatch.id}`), batchData)
        .then(() => {
          toast({ title: "Batch Updated" })
          setIsModalOpen(false)
          setSelectedBatch(null)
        })
    } else {
      const newBatch = {
        ...batchData,
        assignedStudents: {},
        createdAt: Date.now()
      }
      push(ref(database, `Institutes/${resolvedId}/batches`), newBatch)
        .then(() => {
          toast({ title: "Batch Created" })
          setIsModalOpen(false)
        })
    }
  }

  const handleAssignStudent = async (student: any) => {
    if (!resolvedId || !database || !selectedBatch) return
    const rootPath = `Institutes/${resolvedId}`
    const batchPath = `${rootPath}/batches/${selectedBatch.id}/assignedStudents/${student.id}`
    const studentPath = `${rootPath}/admissions/${student.id}/batch`

    const isCurrentlyAssigned = selectedBatch.assignedStudents?.[student.id]

    try {
      if (isCurrentlyAssigned) {
        await update(ref(database), {
          [batchPath]: null,
          [studentPath]: null
        })
      } else {
        await update(ref(database), {
          [batchPath]: { name: student.studentName, addedAt: Date.now() },
          [studentPath]: selectedBatch.batchName
        })
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Sync Error" })
    }
  }

  const handleToggleAllStudents = async () => {
    if (!resolvedId || !database || !selectedBatch) return
    const isAllSelected = filteredStudents.every(s => selectedBatch.assignedStudents?.[s.id])
    const rootPath = `Institutes/${resolvedId}`
    const updates: any = {}

    filteredStudents.forEach(s => {
      const bPath = `batches/${selectedBatch.id}/assignedStudents/${s.id}`
      const sPath = `admissions/${s.id}/batch`
      if (isAllSelected) {
        updates[bPath] = null
        updates[sPath] = null
      } else {
        updates[bPath] = { name: s.studentName, addedAt: Date.now() }
        updates[sPath] = selectedBatch.batchName
      }
    })

    try {
      await update(ref(database, rootPath), updates)
      toast({ title: isAllSelected ? "Unassigned All" : "Assigned All" })
    } catch (err) {
      toast({ variant: "destructive", title: "Bulk Sync Failed" })
    }
  }

  const handleSaveLog = async () => {
    if (!selectedBatch || !dailyDescription.trim() || !resolvedId || !database) return
    setIsSubmitting(true)
    try {
      const logsRef = ref(database, `Institutes/${resolvedId}/batches/${selectedBatch.id}/dailyLogs`)
      await push(logsRef, {
        date: today,
        description: dailyDescription.trim(),
        staffId: staffId || 'admin',
        staffName: `${staffList.find(s => s.id === staffId)?.firstName || 'Admin'} ${staffList.find(s => s.id === staffId)?.lastName || ''}`.trim(),
        image: activityImage,
        timestamp: Date.now()
      })
      toast({ title: "Activity Logged Successfully" })
      setIsLogModalOpen(false)
      setDailyDescription("")
      setActivityImage("")
    } catch (err) {
      toast({ variant: "destructive", title: "Logging Failed" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDownloadReport = () => {
    if (!batches.length) return

    let csvContent = "Date,Batch Code,Batch Name,Staff Name,Description\n"

    batches.forEach(b => {
      if (b.dailyLogs) {
        Object.values(b.dailyLogs).forEach((log: any) => {
          const row = [
            log.date,
            b.batchCode || '-',
            b.batchName,
            log.staffName || 'N/A',
            `"${log.description?.replace(/"/g, '""')}"`
          ].join(",")
          csvContent += row + "\n"
        })
      }
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)

    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const openManageModal = (key: string, label: string) => {
    setActiveManageField({ key, label });
    setNewOptionValue("");
    setEditingOptionId(null);
    setIsManageOpen(true);
  }

  const handleSaveOption = () => {
    if (!newOptionValue.trim() || !resolvedId || !database || !activeManageField) return
    const dbPath = `Institutes/${resolvedId}/dropdowns/${activeManageField.key}`
    if (editingOptionId) update(ref(database, `${dbPath}/${editingOptionId}`), { value: newOptionValue.trim() }).then(() => { setNewOptionValue(""); setEditingOptionId(null); })
    else push(ref(database, dbPath), { value: newOptionValue.trim() }).then(() => setNewOptionValue(""))
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans overflow-x-hidden text-black">
      {!isPortal && <Sidebar />}
      <div className={cn("flex flex-col flex-1 min-w-0", !isPortal && "lg:pl-[280px]")}>
        {!isPortal && <TopNav />}
        <main className="flex-1 p-8 space-y-8 animate-in fade-in duration-500 w-full overflow-x-hidden font-public-sans">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div>
              <h2 className="text-3xl font-bold text-black font-public-sans tracking-tight">Batch Management ({filteredBatches.length})</h2>
              <p className="text-[14px] text-black font-medium mt-1">Schedule and manage academic batches</p>
            </div>
            <div className="flex items-center gap-3">

              {!isPortal && (
                <Button onClick={() => { setSelectedBatch(null); setTimetable(INITIAL_TIMETABLE); setIsModalOpen(true); }} className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-6 font-bold text-[14px] gap-2 border-none shadow-sm transition-all active:scale-95">
                  <Plus className="h-4 w-4" /> Add New Batch
                </Button>
              )}
            </div>
          </div>

          {isStudent ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {filteredBatches.map(batch => (
                <Card key={batch.id} className="border-none shadow-xl rounded-[40px] bg-white overflow-hidden group hover:shadow-2xl transition-all duration-500">
                  <div className="h-3 w-full bg-primary" />
                  <div className="p-8 space-y-8">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <Badge className="bg-blue-50 text-primary border-none font-bold text-[10px] px-3 mb-2">{batch.courseName}</Badge>
                        <h3 className="text-2xl font-black text-black tracking-tight">{batch.batchName}</h3>
                        <p className="text-[14px] font-bold text-black tracking-widest">Faculty: {batch.faculty || 'To be assigned'}</p>
                      </div>
                      <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-primary shadow-inner group-hover:scale-110 transition-transform">
                        <Layers className="w-8 h-8" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-3xl bg-zinc-50/50 border border-zinc-100/50">
                        <p className="text-[10px] font-black text-black tracking-widest mb-1">Class</p>
                        <p className="text-[14px] font-black text-black">{batch.className || '-'}</p>
                      </div>
                      <div className="p-4 rounded-3xl bg-zinc-50/50 border border-zinc-100/50">
                        <p className="text-[10px] font-black text-black tracking-widest mb-1">Status</p>
                        <Badge className={cn("text-[9px] font-black  border-none", batch.status === 'Ongoing' ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600")}>{batch.status}</Badge>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[11px] font-black text-primary tracking-[0.2em] border-b border-zinc-50 pb-2">Weekly Schedule</h4>
                      <div className="grid grid-cols-7 gap-2">
                        {DAYS.map(day => {
                          const sched = batch.timetable?.[day] || { enabled: false }
                          return (
                            <div key={day} className={cn(
                              "flex flex-col items-center py-3 rounded-xl border transition-all",
                              sched.enabled ? "bg-white border-primary/20 shadow-sm" : "bg-zinc-50/50 border-transparent opacity-30"
                            )}>
                              <span className="text-[8px] font-black text-black mb-1">{day.substring(0, 3)}</span>
                              {sched.enabled ? (
                                <div className="space-y-0.5">
                                  <p className="text-[9px] font-black text-black">{sched.start}</p>
                                  <p className="text-[7px] font-bold text-zinc-300">to</p>
                                  <p className="text-[9px] font-black text-black">{sched.end}</p>
                                </div>
                              ) : <MinusCircle className="w-3 h-3 text-zinc-200" />}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-zinc-300" />
                        <span className="text-[10px] font-bold text-black tracking-widest">Started: {batch.startDate || '-'}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="text-primary font-black text-[10px] tracking-widest hover:bg-primary/5 rounded-xl">
                        Full Schedule <Clock className="w-3 h-3 ml-2" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {filteredBatches.length === 0 && (
                <div className="col-span-full py-20 text-center space-y-6 bg-white rounded-[40px] border-2 border-dashed border-zinc-100">
                  <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto text-zinc-200">
                    <AlertCircle className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-black tracking-tight">No Batches Linked</h3>
                    <p className="text-[14px] text-black font-medium max-w-sm mx-auto">You are not currently assigned to any active academic batches.</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Card className="border border-zinc-100 shadow-sm rounded-2xl overflow-hidden bg-white">
              <div className="p-6 border-b border-zinc-50">
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-black" />
                  <Input placeholder="Search batches..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-11 h-11 bg-zinc-50 border-none rounded-lg text-[14px] transition-none" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table className="min-w-[1200px]">
                  <TableHeader className="bg-zinc-50/50">
                    <TableRow className="border-zinc-100">
                      <TableHead className="text-[11px] font-bold text-black tracking-widest h-14 pl-10">Batch Code</TableHead>
                      <TableHead className="text-[11px] font-bold text-black tracking-widest h-14">Batch Name</TableHead>
                      <TableHead className="text-[11px] font-bold text-black tracking-widest h-14">Class</TableHead>
                      <TableHead className="text-[11px] font-bold text-black tracking-widest h-14">Section</TableHead>
                      <TableHead className="text-[11px] font-bold text-black tracking-widest h-14">Course</TableHead>
                      <TableHead className="text-[11px] font-bold text-black tracking-widest h-14">Type</TableHead>
                      <TableHead className="text-[11px] font-bold text-black tracking-widest h-14">Faculty</TableHead>
                      <TableHead className="text-[11px] font-bold text-black tracking-widest h-14 text-center">Students</TableHead>
                      <TableHead className="text-[11px] font-bold text-black tracking-widest h-14">Status</TableHead>
                      {!isPortal && <TableHead className="text-right pr-10 text-[11px] font-bold text-black tracking-widest h-14">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      [...Array(3)].map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={9} className="p-10"><div className="h-12 w-full bg-zinc-50 animate-pulse rounded-xl" /></TableCell></TableRow>
                      ))
                    ) : filteredBatches.map((row) => (
                      <TableRow key={row.id} className="border-zinc-50 hover:bg-zinc-50/30 transition-none group">
                        <TableCell className="pl-10"><span className="text-[14px] font-bold text-primary font-public-sans tracking-tighter">{row.batchCode || '-'}</span></TableCell>
                        <TableCell><span className="text-[14px] font-bold text-black font-public-sans">{row.batchName}</span></TableCell>
                        <TableCell className="text-[14px] text-black font-medium">{row.className || '-'}</TableCell>
                        <TableCell className="text-[14px] text-black font-medium">{row.section || '-'}</TableCell>
                        <TableCell className="text-[14px] text-black font-medium">{row.courseName || '-'}</TableCell>
                        <TableCell className="text-[14px] text-black font-medium">{row.batchType || '-'}</TableCell>
                        <TableCell className="text-[14px] text-black font-bold">{row.faculty || '-'}</TableCell>
                        <TableCell className="text-center"><Badge variant="outline" className="rounded-lg border-zinc-100 text-black px-3">{Object.keys(row.assignedStudents || {}).length}</Badge></TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "text-[9px] font-black  border-none shadow-none",
                            row.status === 'Ongoing' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                          )}>{row.status}</Badge>
                        </TableCell>
                        {!isPortal ? (
                          <TableCell className="text-right pr-8">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => { setSelectedBatch(row); setIsViewDetailsOpen(true); }} className="h-9 w-9 text-teal-600 hover:bg-teal-50 rounded-xl transition-all" title="View Batch Insights"><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => { setSelectedBatch(row); setIsAssignStudentOpen(true); }} className="h-9 w-9 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all" title="Assign Students"><UserPlus className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => { setSelectedBatch(row); setTimetable(row.timetable || INITIAL_TIMETABLE); setIsModalOpen(true); }} className="h-9 w-9 text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Edit"><Edit2 className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete batch?")) remove(ref(database!, `Institutes/${resolvedId}/batches/${row.id}`)) }} className="h-9 w-9 text-rose-500 hover:bg-rose-50 rounded-xl transition-all" title="Delete"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        ) : (
                          isStaff && (
                            <TableCell className="text-right pr-8">
                              <Button variant="ghost" size="icon" onClick={() => { setSelectedBatch(row); setIsLogModalOpen(true); }} className="h-10 w-10 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" title="Log Daily Activity"><FileText className="h-5 w-5" /></Button>
                            </TableCell>
                          )
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {/* Assign Student Modal */}
          <Dialog open={isAssignStudentOpen} onOpenChange={setIsAssignStudentOpen}>
            <DialogContent className="w-[95vw] sm:max-w-md p-0 border border-zinc-200 rounded-[32px] overflow-hidden bg-white shadow-2xl max-h-[95vh] flex flex-col">
              <div className="overflow-y-auto flex-1 w-full scrollbar-thin scrollbar-thumb-zinc-200 text-black">
                <div className="bg-white px-8 py-5 border-b border-zinc-100 flex items-center justify-between">
                  <div><DialogTitle className="text-xl font-black tracking-tight">Assign Candidates</DialogTitle><p className="text-[10px] text-black font-bold tracking-widest mt-0.5">Batch: {selectedBatch?.batchName}</p></div>
                </div>
                <div className="p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 group">
                      <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
                      <Input placeholder="Search students..." value={subSearchTerm} onChange={(e) => setSubSearchTerm(e.target.value)} className="pl-10 h-11 rounded-xl bg-zinc-50 border-none text-[14px] text-black shadow-inner font-bold" />
                    </div>
                    <Button variant="outline" onClick={handleToggleAllStudents} className="h-11 px-4 rounded-xl text-[10px] font-black tracking-widest gap-2 bg-white hover:bg-zinc-50 border-zinc-100 transition-all">
                      {filteredStudents.every(s => selectedBatch?.assignedStudents?.[s.id]) ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-2">
                      {filteredStudents.map((student) => {
                        const isAssigned = !!selectedBatch?.assignedStudents?.[student.id]
                        return (
                          <div key={student.id} onClick={() => handleAssignStudent(student)} className={cn("flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer", isAssigned ? "bg-emerald-50/50 border-emerald-100 shadow-sm" : "bg-white border-zinc-50 hover:bg-zinc-50/50")}>
                            <div className="flex items-center gap-4">
                              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black text-[14px] transition-colors", isAssigned ? "bg-emerald-500 text-white shadow-lg" : "bg-zinc-50 text-zinc-300 shadow-inner")}>{student.studentName?.charAt(0)}</div>
                              <div><p className="text-[14px] font-black text-black">{student.studentName}</p><p className="text-[10px] font-bold text-black tracking-widest">{student.admissionNo} • {student.course}</p></div>
                            </div>
                            <Checkbox checked={isAssigned} className="rounded-md h-5 w-5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 pointer-events-none" />
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add/Edit Batch Modal */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="w-[95vw] sm:max-w-3xl p-0 border border-zinc-200 rounded-[40px] overflow-hidden bg-white shadow-2xl max-h-[95vh] flex flex-col text-black font-public-sans">
              <div className="bg-white px-10 py-8 border-b border-zinc-100 sticky top-0 z-50">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
                <div className="inline-block px-5 py-2 bg-primary/10 rounded-2xl border border-primary/20">
                  <DialogTitle className="text-2xl font-black tracking-tight text-black">
                    {selectedBatch ? 'Batch configuration' : 'Add New Batch'}
                  </DialogTitle>
                </div>
              </div>
              <ScrollArea className="flex-1 w-full scrollbar-thin scrollbar-thumb-zinc-200 text-black">
                <form key={selectedBatch?.id || 'new_batch'} onSubmit={handleSaveBatch} className="p-10 space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-bold text-black ml-1">Batch Code *</Label>
                      <Input name="batchCode" defaultValue={selectedBatch?.batchCode} required className="rounded-2xl border-zinc-100 bg-zinc-50/50 h-11 font-bold text-primary text-[14px] shadow-inner font-public-sans" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-bold text-black ml-1">Batch Name *</Label>
                      <Input name="batchName" defaultValue={selectedBatch?.batchName} required className="rounded-2xl border-zinc-100 bg-zinc-50/50 h-11 font-bold text-black text-[14px] shadow-inner" />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center px-1">
                        <Label className="text-[12px] font-bold text-black">Class</Label>
                        <button type="button" onClick={() => openManageModal('class', 'Class')} className="text-[10px] font-bold text-blue-600 hover:underline">Manage <Settings2 className="w-2.5 h-2.5 inline" /></button>
                      </div>
                      <Select name="className" defaultValue={selectedBatch?.className} required>
                        <SelectTrigger className="h-12 rounded-2xl border-zinc-100 font-bold bg-white"><SelectValue placeholder="Select Class" /></SelectTrigger>
                        <SelectContent className="rounded-2xl border-zinc-100 shadow-2xl">{(dropdownData['class'] || []).map(opt => <SelectItem key={opt.id} value={opt.value} className="font-bold text-[14px]">{opt.value}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center px-1">
                        <Label className="text-[12px] font-bold text-black">Section</Label>
                        <button type="button" onClick={() => openManageModal('section', 'Section')} className="text-[10px] font-bold text-blue-600 hover:underline">Manage <Settings2 className="w-2.5 h-2.5 inline" /></button>
                      </div>
                      <Select name="section" defaultValue={selectedBatch?.section} required>
                        <SelectTrigger className="h-12 rounded-2xl border-zinc-100 font-bold bg-white"><SelectValue placeholder="Select Section" /></SelectTrigger>
                        <SelectContent className="rounded-2xl border-zinc-100 shadow-2xl">{(dropdownData['section'] || []).map((opt: any) => <SelectItem key={opt.id} value={opt.value} className="font-bold text-[14px]">{opt.value}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center px-1">
                        <Label className="text-[12px] font-bold text-black">Course</Label>
                        <button type="button" onClick={() => openManageModal('course', 'Course')} className="text-[10px] font-bold text-blue-600 hover:underline">Manage <Settings2 className="w-2.5 h-2.5 inline" /></button>
                      </div>
                      <Select name="courseName" defaultValue={selectedBatch?.courseName} required>
                        <SelectTrigger className="h-12 rounded-2xl border-zinc-100 font-bold bg-white"><SelectValue placeholder="Select Course" /></SelectTrigger>
                        <SelectContent className="rounded-2xl border-zinc-100 shadow-2xl">{(dropdownData['course'] || []).map((opt: any) => <SelectItem key={opt.id} value={opt.value} className="font-bold text-[14px]">{opt.value}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center px-1">
                        <Label className="text-[12px] font-bold text-black">Batch Type</Label>
                        <button type="button" onClick={() => openManageModal('batchType', 'Batch Type')} className="text-[10px] font-bold text-blue-600 hover:underline">Manage <Settings2 className="w-2.5 h-2.5 inline" /></button>
                      </div>
                      <Select name="batchType" defaultValue={selectedBatch?.batchType} required>
                        <SelectTrigger className="h-12 rounded-2xl border-zinc-100 font-bold bg-white"><SelectValue placeholder="Select Type" /></SelectTrigger>
                        <SelectContent className="rounded-2xl border-zinc-100 shadow-2xl">{(dropdownData['batchType'] || []).map((opt: any) => <SelectItem key={opt.id} value={opt.value} className="font-bold text-[14px]">{opt.value}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-bold text-black ml-1">Assigned Batch Faculty</Label>
                      <Select name="faculty" defaultValue={selectedBatch?.faculty} required>
                        <SelectTrigger className="h-12 rounded-2xl border-zinc-100 font-bold bg-white"><SelectValue placeholder="Assign Staff" /></SelectTrigger>
                        <SelectContent className="rounded-2xl border-zinc-100 shadow-2xl">{staffList.map(s => <SelectItem key={s.id} value={`${s.firstName} ${s.lastName}`} className="font-bold text-[14px]">{s.firstName} {s.lastName}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-bold text-black ml-1">Batch Start Date</Label>
                      <Input name="startDate" type="date" defaultValue={selectedBatch?.startDate || today} required className="rounded-2xl h-12 border-zinc-100 bg-white font-bold" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-bold text-black ml-1">Batch End Date</Label>
                      <Input name="endDate" type="date" defaultValue={selectedBatch?.endDate} className="rounded-2xl h-12 border-zinc-100 bg-white font-bold" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-bold text-black ml-1">Batch Status</Label>
                      <Select name="status" defaultValue={selectedBatch?.status || "Upcoming"}>
                        <SelectTrigger className="h-12 rounded-2xl border-zinc-100 font-bold bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-2xl border-zinc-100 shadow-2xl"><SelectItem value="Upcoming" className="font-bold text-[14px]">Upcoming</SelectItem><SelectItem value="Ongoing" className="font-bold text-[14px]">Ongoing</SelectItem><SelectItem value="Completed" className="font-bold text-[14px]">Completed</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-8 pt-4">
                    <div className="flex items-center gap-3 border-b border-zinc-50 pb-3">
                      <CalendarDays className="w-5 h-5 text-primary" />
                      <h3 className="text-[14px] font-bold text-black">Batch Schedule / Timetable</h3>
                    </div>

                    <div className="space-y-4">
                      {DAYS.map((day) => (
                        <div key={day} className={cn(
                          "flex flex-col md:flex-row md:items-center justify-between p-6 rounded-3xl border transition-all",
                          timetable[day].enabled ? "bg-white border-primary/20 shadow-xl shadow-blue-900/5" : "bg-zinc-50/50 border-transparent opacity-60"
                        )}>
                          <div className="flex items-center gap-6">
                            <Switch
                              checked={timetable[day].enabled}
                              onCheckedChange={() => handleToggleDay(day)}
                              className="data-[state=checked]:bg-primary"
                            />
                            <span className={cn("text-[14px] font-bold", timetable[day].enabled ? "text-black" : "text-black")}>
                              {day}
                            </span>
                          </div>

                          {timetable[day].enabled && (
                            <div className="flex items-center gap-4 mt-4 md:mt-0 animate-in slide-in-from-right-4 duration-300">
                              <div className="flex items-center gap-3 bg-zinc-50 p-2 rounded-xl border border-zinc-100 shadow-inner">
                                <Clock className="w-3.5 h-3.5 text-zinc-300" />
                                <input
                                  type="time"
                                  value={timetable[day].start}
                                  onChange={(e) => handleTimeChange(day, 'start', e.target.value)}
                                  className="bg-transparent border-none text-[14px] font-black text-black outline-none"
                                />
                                <span className="text-[10px] font-black text-zinc-300">to</span>
                                <input
                                  type="time"
                                  value={timetable[day].end}
                                  onChange={(e) => handleTimeChange(day, 'end', e.target.value)}
                                  className="bg-transparent border-none text-[14px] font-black text-black outline-none"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-zinc-100 flex justify-start">
                    <Button type="submit" className="h-10 px-6 bg-primary hover:opacity-90 text-white rounded-xl font-bold text-[14px] tracking-widest shadow-lg border-none transition-all active:scale-95 flex items-center justify-center gap-2">
                      <Save className="w-4 h-4" /> {selectedBatch ? 'Update Batch' : 'Submit'}
                    </Button>
                  </div>
                </form>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          {/* Manage Dropdown Modal */}
          <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
            <DialogContent className="w-[95vw] sm:max-w-md rounded-[32px] p-0 bg-white border border-zinc-200 shadow-2xl max-h-[95vh] flex flex-col">
              <div className="bg-white px-8 py-6 border-b border-zinc-100">
                <DialogTitle className="text-lg font-black tracking-tight">Manage {activeManageField?.label}</DialogTitle>
              </div>
              <div className="p-8 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200 text-black">
                <div className="flex gap-2 mb-8">
                  <Input value={newOptionValue} onChange={(e) => setNewOptionValue(e.target.value)} placeholder="Enter new..." className="rounded-xl h-12 border-zinc-200 font-bold" />
                  <Button onClick={handleSaveOption} className="bg-primary text-white rounded-xl px-8 h-12 border-none shadow-lg active:scale-95 transition-all font-bold">Add</Button>
                </div>
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
              </div>
            </DialogContent>
          </Dialog>
          {/* Activity Log Modal */}
          <Dialog open={isLogModalOpen} onOpenChange={setIsLogModalOpen}>
            <DialogContent className="w-[95vw] sm:max-w-md p-0 border border-zinc-200 rounded-[32px] overflow-hidden bg-white shadow-2xl flex flex-col">
              <div className="bg-white px-8 py-6 border-b border-zinc-100">
                <DialogTitle className="text-lg font-black tracking-tight">Daily Activity Log</DialogTitle>
                <p className="text-[10px] text-black font-bold tracking-widest mt-0.5">Batch: {selectedBatch?.batchName}</p>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[14px] font-bold text-black ml-1">Activity Description</Label>
                  <textarea
                    value={dailyDescription}
                    onChange={(e) => setDailyDescription(e.target.value)}
                    placeholder="Describe today's activities/lessons..."
                    className="w-full h-32 p-4 rounded-2xl bg-zinc-50 border-none text-[14px] font-medium text-black placeholder:text-zinc-300 focus:ring-2 focus:ring-primary/20 transition-all resize-none outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[14px] font-bold text-black ml-1">Activity Photo (Optional)</Label>
                  <ImageUpload value={activityImage} onChange={setActivityImage} label="Upload Activity Pic" />
                </div>
                {selectedBatch?.dailyLogs && Object.values(selectedBatch.dailyLogs).length > 0 && (
                  <div className="space-y-2 mt-4">
                    <Label className="text-[10px] font-black text-black tracking-widest ml-1">Previous Activities</Label>
                    <ScrollArea className="h-32 w-full rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4">
                      <div className="space-y-3">
                        {Object.values(selectedBatch.dailyLogs).reverse().map((log: any, i: number) => (
                          <div key={i} className="space-y-1.5 pb-3 mb-3 border-b border-zinc-100 last:border-0 last:pb-0 last:mb-0">
                            <div className="flex justify-between items-center text-[9px] font-black tracking-widest text-black">
                              <span>{log.date}</span>
                              <span className="text-primary">{log.staffName}</span>
                            </div>
                            <p className="text-[14px] text-black font-medium leading-relaxed whitespace-pre-wrap mb-2">{log.description}</p>
                            {log.image && (
                              <div className="mt-2 rounded-xl overflow-hidden border border-zinc-100 shadow-sm">
                                <img src={log.image} alt="Activity" className="w-full h-auto object-cover max-h-48" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
                <div className="pt-4 border-t border-zinc-100 mt-6">
                  <Button
                    onClick={handleSaveLog}
                    disabled={isSubmitting || !dailyDescription.trim()}
                    className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-[14px] tracking-widest shadow-lg border-none transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Activity
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* View Details/Activity & Feedback Modal */}
          <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
            <DialogContent className="w-[95vw] sm:max-w-2xl p-0 border border-zinc-200 rounded-[32px] overflow-hidden bg-[#F8FAFC] shadow-2xl flex flex-col h-[80vh]">
              <div className="bg-white px-8 py-6 border-b border-zinc-100 flex justify-between items-center">
                <div>
                  <DialogTitle className="text-xl font-black tracking-tight text-black">Batch Insights</DialogTitle>
                  <p className="text-[10px] text-black font-bold tracking-widest mt-1">Batch: {selectedBatch?.batchName}</p>
                </div>
              </div>
              <div className="p-6 flex-1 overflow-hidden flex flex-col">
                <Tabs defaultValue="activity" className="w-full h-full flex flex-col">
                  <TabsList className="bg-white p-1.5 rounded-2xl w-fit flex gap-1 shadow-sm border border-zinc-100 mb-6">
                    <TabsTrigger value="activity" className="h-10 px-6 rounded-xl data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 text-black font-bold text-[10px] tracking-widest transition-all">Daily Activity</TabsTrigger>
                    <TabsTrigger value="feedback" className="h-10 px-6 rounded-xl data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 text-black font-bold text-[10px] tracking-widest transition-all">Student Feedback</TabsTrigger>
                  </TabsList>

                  <TabsContent value="activity" className="flex-1 mt-0 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-200">
                    <div className="space-y-4 pb-10">
                      {selectedBatch?.dailyLogs && Object.values(selectedBatch.dailyLogs).length > 0 ? (
                        Object.values(selectedBatch.dailyLogs).reverse().map((log: any, i: number) => (
                          <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-[14px]">{log.staffName?.charAt(0) || <FileText className="w-4 h-4" />}</div>
                                <div>
                                  <p className="text-[14px] font-black text-black tracking-tight">{log.staffName || "Staff Member"}</p>
                                  <p className="text-[10px] font-bold text-black tracking-widest">{log.date}</p>
                                </div>
                              </div>
                            </div>
                            <p className="text-[14px] text-black font-medium leading-relaxed whitespace-pre-wrap mb-3">{log.description}</p>
                            {log.image && (
                              <div className="mt-3 rounded-2xl overflow-hidden border border-zinc-100 shadow-sm">
                                <img src={log.image} alt="Activity" className="w-full h-auto object-cover max-h-64" />
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-zinc-200">
                          <p className="text-[14px] font-bold text-black tracking-widest">No Activity Logs Found</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="feedback" className="flex-1 mt-0 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-200">
                    <div className="space-y-4 pb-10">
                      {selectedBatch?.feedback && Object.values(selectedBatch.feedback).length > 0 ? (
                        Object.values(selectedBatch.feedback).reverse().map((fb: any, i: number) => (
                          <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[14px]">{fb.studentName?.charAt(0) || <MessageSquare className="w-4 h-4" />}</div>
                                <div>
                                  <p className="text-[14px] font-black text-black tracking-tight">{fb.studentName || "Student"}</p>
                                  <p className="text-[10px] font-bold text-black tracking-widest">{fb.date}</p>
                                </div>
                              </div>
                            </div>
                            <p className="text-[14px] text-black font-medium leading-relaxed whitespace-pre-wrap">{fb.description}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-zinc-200">
                          <p className="text-[14px] font-bold text-black tracking-widest">No Feedback Found</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}
