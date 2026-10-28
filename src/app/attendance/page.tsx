
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  UserCheck, 
  Users, 
  UserX, 
  Clock, 
  Search, 
  FileSpreadsheet, 
  FileText, 
  Save, 
  Calendar as CalendarIcon,
  Loader2,
  Check,
  X as XIcon,
  Info,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  AlertCircle,
  History,
  RefreshCw
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, set, off, get } from "firebase/database"
import { format } from "date-fns"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { createStudentNotification, createAdminNotification, NotificationType } from "@/lib/notifications"

type AttendanceStatus = "Present" | "Absent" | "Leave" | "Half Day"

interface AttendanceRecord {
  status: AttendanceStatus
  remarks: string
  updatedAt: number
  checkIn?: string
  checkOut?: string
  checkInStatus?: string
  checkOutStatus?: string
}

export default function AttendancePage() {
  const pathname = usePathname()
  const isPortal = pathname.startsWith('/branch') || pathname.startsWith('/staff') || pathname.startsWith('/student')

  const { database } = useFirebase()
  const { resolvedId, branchId, isBranch } = useResolvedId()

  const [attendanceType, setAttendanceType] = useState<"Student" | "Staff">("Student")
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all")
  const [selectedClass, setSelectedClass] = useState<string>("all")
  const [selectedSection, setSelectedSection] = useState<string>("all")
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [searchTerm, setSearchTerm] = useState("")

  const [batches, setBatches] = useState<any[]>([])
  const [dropdownData, setDropdownData] = useState<Record<string, any[]>>({})
  const [entities, setEntities] = useState<any[]>([]) 
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [instituteName, setInstituteName] = useState("Your Institute")

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [savedSummary, setSavedSummary] = useState({ total: 0, present: 0, absent: 0, leave: 0, halfDay: 0 })

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    if (!database || !resolvedId) return

    const rootPath = `Institutes/${resolvedId}`
    onValue(ref(database, `${rootPath}/profile/instituteName`), (snapshot) => {
      if (snapshot.exists()) setInstituteName(snapshot.val())
    })

    onValue(ref(database, `${rootPath}/batches`), (snapshot) => {
      const data = snapshot.val()
      if (data) {
        let list = Object.keys(data).map(key => ({ ...data[key], id: key }))
        if (isBranch && branchId) list = list.filter(b => b.branchId === branchId)
        setBatches(list)
      } else {
        setBatches([])
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
  }, [database, resolvedId, isBranch, branchId])

  useEffect(() => {
    if (!database || !resolvedId) return
    setIsLoading(true)
    setSelectedIds(new Set()) 
    setCurrentPage(1)

    const rootPath = `Institutes/${resolvedId}`
    const path = attendanceType === "Student" ? "admissions" : "employees"
    const entitiesRef = ref(database, `${rootPath}/${path}`)

    const attPath = attendanceType === "Student" 
      ? `${rootPath}/attendance/Student/${selectedDate}/${selectedBatchId}`
      : `${rootPath}/attendance/Staff/${selectedDate}`
    
    get(ref(database, attPath)).then((attSnapshot) => {
      let existingAttendance: Record<string, AttendanceRecord> = {}
      if (attSnapshot.exists()) {
        existingAttendance = attSnapshot.val()
      }

      onValue(entitiesRef, (snapshot) => {
        const data = snapshot.val()
        if (data) {
          let list = Object.keys(data).map(key => ({ ...data[key], id: key }))
          
          if (isBranch && branchId) {
            list = list.filter(e => e.branchId === branchId)
          }

          if (attendanceType === "Student") {
            if (selectedClass !== "all") list = list.filter(s => s.course === selectedClass)
            if (selectedSection !== "all") list = list.filter(s => s.section === selectedSection)
            if (selectedBatchId !== "all") {
              const batch = batches.find(b => b.id === selectedBatchId)
              if (batch) list = list.filter(s => s.batch === batch.batchName)
            }
          }
          
          setEntities(list)

          const newAtt: Record<string, AttendanceRecord> = { ...existingAttendance }
          list.forEach(e => {
            if (!newAtt[e.id]) {
              newAtt[e.id] = { status: "Present", remarks: "", updatedAt: Date.now() }
            }
          })
          setAttendance(newAtt)

          const counts = { total: list.length, present: 0, absent: 0, leave: 0, halfDay: 0 }
          list.forEach(e => {
            const status = newAtt[e.id]?.status
            if (status === "Present") counts.present++
            else if (status === "Absent") counts.absent++
            else if (status === "Leave") counts.leave++
            else if (status === "Half Day") counts.halfDay++
          })
          setSavedSummary(counts)

        } else {
          setEntities([])
          setAttendance({})
          setSavedSummary({ total: 0, present: 0, absent: 0, leave: 0, halfDay: 0 })
        }
        setIsLoading(false)
      }, { onlyOnce: true })
    })

    return () => off(entitiesRef)
  }, [database, resolvedId, attendanceType, selectedBatchId, selectedClass, selectedSection, selectedDate, batches, isBranch, branchId])

  const filteredEntities = useMemo(() => {
    const nameKey = attendanceType === "Student" ? "studentName" : "name"
    return entities.filter(e => 
      (e[nameKey] || `${e.firstName} ${e.lastName}`)?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [entities, searchTerm, attendanceType])

  const totalPages = Math.ceil(filteredEntities.length / itemsPerPage)
  const paginatedEntities = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredEntities.slice(start, start + itemsPerPage)
  }, [filteredEntities, currentPage])

  const currentSummary = useMemo(() => {
    const counts = { total: filteredEntities.length, present: 0, absent: 0, leave: 0, halfDay: 0 }
    filteredEntities.forEach(e => {
      const status = attendance[e.id]?.status
      if (status === "Present") counts.present++
      else if (status === "Absent") counts.absent++
      else if (status === "Leave") counts.leave++
      else if (status === "Half Day") counts.halfDay++
    })
    return counts
  }, [filteredEntities, attendance])

  const handleMarkStatus = (id: string, status: AttendanceStatus) => {
    setAttendance(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        status,
        updatedAt: Date.now()
      }
    }))
  }

  const handleRemarkChange = (id: string, remarks: string) => {
    setAttendance(prev => ({ ...prev, [id]: { ...prev[id], remarks, updatedAt: Date.now() } }))
  }

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedEntities.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(paginatedEntities.map(e => e.id)))
  }

  const syncFromMachineLogs = async () => {
    if (!database || !resolvedId) return
    setIsLoading(true)
    try {
      const logsRef = ref(database, `Institutes/${resolvedId}/essl_logs`)
      const snapshot = await get(logsRef)
      if (snapshot.exists()) {
        const data = snapshot.val()
        const logs = Object.values(data) as any[]
        const dateLogs = logs.filter(l => l.DateTime?.startsWith(selectedDate))
        
        if (dateLogs.length === 0) {
          toast({ title: "No Machine Data", description: `No logs found for ${selectedDate}` })
          return
        }

        const newAttendance = { ...attendance }
        let count = 0
        
        entities.forEach(entity => {
          const code = attendanceType === "Student" ? entity.rollNo : entity.employeeId
          if (!code) return
          
          const userLogs = dateLogs.filter(l => l.EmployeeCode === code)
          if (userLogs.length > 0) {
            // Sort by time
            const sortedLogs = userLogs.sort((a, b) => a.DateTime.localeCompare(b.DateTime))
            const firstLog = sortedLogs[0]
            const lastLog = sortedLogs[sortedLogs.length - 1]
            
            const firstTime = firstLog.DateTime.split(' ')[1]
            const lastTime = lastLog.DateTime.split(' ')[1]
            
            newAttendance[entity.id] = {
              ...newAttendance[entity.id],
              checkIn: firstTime,
              checkInStatus: firstLog.Status,
              checkOut: lastTime !== firstTime ? lastTime : (newAttendance[entity.id]?.checkOut || ""),
              checkOutStatus: lastTime !== firstTime ? lastLog.Status : (newAttendance[entity.id]?.checkOutStatus || ""),
              status: "Present",
              updatedAt: Date.now()
            }
            count++
          }
        })
        
        setAttendance(newAttendance)
        toast({ title: "Sync Complete", description: `Updated ${count} records from machine logs.` })
      } else {
        toast({ title: "No Logs Found", description: "No machine logs found in database." })
      }
    } catch (error) {
      console.error("Error syncing from machine logs:", error)
      toast({ variant: "destructive", title: "Sync Error" })
    } finally {
      setIsLoading(false)
    }
  }

  const saveAttendance = async () => {
    if (!database || !resolvedId) return
    if (Object.keys(attendance).length === 0) {
      toast({ variant: "destructive", title: "Empty Records", description: "Please mark status for at least one person." })
      return
    }
    setIsSaving(true)
    const attPath = attendanceType === "Student" 
      ? `Institutes/${resolvedId}/attendance/Student/${selectedDate}/${selectedBatchId}`
      : `Institutes/${resolvedId}/attendance/Staff/${selectedDate}`
    try {
      await set(ref(database, attPath), attendance)
      setSavedSummary(currentSummary)
      
      // Send Notifications
      const notifPromises: Promise<any>[] = []
      
      // Admin Notification
      notifPromises.push(createAdminNotification(database, resolvedId, {
        title: `${attendanceType} Attendance Sync`,
        message: `Attendance marked for ${currentSummary.total} ${attendanceType.toLowerCase()}s on ${selectedDate}.`,
        type: NotificationType.Attendance
      }))

      // Student Notifications (only for marked students)
      if (attendanceType === "Student") {
        Object.keys(attendance).forEach(studentId => {
          const record = attendance[studentId]
          if (record.status) {
            notifPromises.push(createStudentNotification(database, resolvedId, studentId, {
              title: `Attendance Marked: ${record.status}`,
              message: `Your attendance for ${selectedDate} has been recorded as ${record.status}${record.remarks ? `. Note: ${record.remarks}` : ''}.`,
              type: NotificationType.Attendance
            }))
          }
        })
      }

      await Promise.all(notifPromises)

      toast({ 
        title: "Sync Successful", 
        description: `${attendanceType} registry updated. ${currentSummary.total} ${attendanceType.toLowerCase()}${currentSummary.total !== 1 ? 's' : ''} marked for ${selectedDate}.` 
      })
    } catch (e) {
      toast({ variant: "destructive", title: "Sync Failed" })
    } finally {
      setIsSaving(false)
    }
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(20).setTextColor(13, 148, 136).text(instituteName, 14, 20)
    doc.setFontSize(12).setTextColor(100).text(`Attendance Report (${attendanceType}) - ${selectedDate}`, 14, 30)
    const tableData = filteredEntities.map((e, i) => [
      i + 1,
      attendanceType === "Student" ? e.studentName : `${e.firstName} ${e.lastName}`,
      attendanceType === "Student" ? e.admissionNo : (e.employeeId || e.id.substring(0, 8)),
      attendance[e.id]?.status || "Not Marked",
      attendance[e.id]?.remarks || "-"
    ])
    autoTable(doc, {
      startY: 40,
      head: [['Sr No', 'Name', 'ID / Roll', 'Status', 'Remarks']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [13, 148, 136] }
    })
    doc.save(`Attendance_${attendanceType}_${selectedDate}.pdf`)
  }

  const exportExcel = () => {
    const data = filteredEntities.map((e, i) => ({
      "Sr No": i + 1,
      "Name": attendanceType === "Student" ? e.studentName : `${e.firstName} ${e.lastName}`,
      "ID": attendanceType === "Student" ? e.admissionNo : e.employeeId,
      "Class/Dept": attendanceType === "Student" ? e.course : e.department,
      "Status": attendance[e.id]?.status || "Not Marked",
      "Remarks": attendance[e.id]?.remarks || ""
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Attendance")
    XLSX.writeFile(wb, `Attendance_Registry_${selectedDate}.xlsx`)
  }

  const mainContent = (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 w-full overflow-x-hidden font-public-sans text-black text-[14px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h2 className="text-[26px] font-normal tracking-tight leading-none">Attendance Management</h2>
          <p className="text-[14px] text-black font-medium mt-1.5">Daily presence tracking for academic compliance</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/attendance/transaction-logs">
            <Button variant="outline" className="h-11 px-5 border-blue-100 text-blue-600 bg-white hover:bg-blue-50 rounded-xl font-bold text-[14px] gap-2 transition-all shadow-sm">
              <History className="h-4 w-4" /> Transaction Logs
            </Button>
          </Link>
          <Button 
            variant="outline" 
            onClick={syncFromMachineLogs} 
            disabled={isLoading}
            className="h-11 px-5 border-indigo-100 text-indigo-600 bg-white hover:bg-indigo-50 rounded-xl font-bold text-[14px] gap-2 transition-all shadow-sm"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} /> Machine Sync
          </Button>
          <Button variant="outline" onClick={exportExcel} className="h-11 px-5 border-emerald-100 text-emerald-600 bg-white hover:bg-emerald-50 rounded-xl font-bold text-[14px] gap-2 transition-all shadow-sm">
            <FileSpreadsheet className="h-4 w-4" /> Export Excel
          </Button>
          <Button variant="outline" onClick={exportPDF} className="h-11 px-5 border-rose-100 text-rose-600 bg-white hover:bg-rose-50 rounded-xl font-bold text-[14px] gap-2 transition-all shadow-sm">
            <FileText className="h-4 w-4" /> Download PDF
          </Button>
          <Button onClick={saveAttendance} disabled={isSaving} className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-8 font-bold text-[14px] gap-2 border-none shadow-lg transition-all">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 
            {isSaving ? "Syncing..." : "Submit Attendance"}
          </Button>
        </div>

      </div>

      <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-8">
        <div className="flex items-center justify-between mb-8 px-2">
          <h3 className="text-lg font-normal tracking-tight">Select Criteria</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black text-black tracking-widest ml-1">TYPE</Label>
            <Select value={attendanceType} onValueChange={(val: any) => setAttendanceType(val)}>
              <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-none font-bold text-black text-[14px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Student">Students</SelectItem>
                <SelectItem value="Staff">Staff Members</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {attendanceType === "Student" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-black tracking-widest ml-1">CLASS</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-none font-bold text-black text-[14px]"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {(dropdownData['course'] || []).map(opt => <SelectItem key={opt.id} value={opt.value}>{opt.value}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-black tracking-widest ml-1">SECTION</Label>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-none font-bold text-black text-[14px]"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {(dropdownData['section'] || []).map(opt => <SelectItem key={opt.id} value={opt.value}>{opt.value}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-black tracking-widest ml-1">BATCH</Label>
                <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                  <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-none font-bold text-black text-[14px]"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.batchName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label className="text-[10px] font-black text-black tracking-widest ml-1">DATE</Label>
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-11 rounded-xl bg-zinc-50 border-none font-bold text-black text-[14px]" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-black text-black tracking-widest ml-1">SEARCH</Label>
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-300" />
              <Input 
                placeholder="Name or ID..." 
                value={searchTerm} 
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                className="pl-10 h-11 rounded-xl bg-zinc-50 border-none font-bold text-black text-[14px]" 
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <SummaryCard title="Total Registry" value={savedSummary.total} icon={<Users className="text-indigo-500" />} />
        <SummaryCard title="Present Today" value={savedSummary.present} icon={<Check className="text-emerald-500" />} />
        <SummaryCard title="Absent" value={savedSummary.absent} icon={<XIcon className="text-rose-500" />} />
        <SummaryCard title="Half Day (H)" value={savedSummary.halfDay} icon={<Clock className="text-orange-500" />} />
        <SummaryCard title="On Leave" value={savedSummary.leave} icon={<AlertCircle className="text-blue-500" />} />
      </div>

      <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
        <div className="overflow-x-auto scrollbar-thin">
          <Table className="min-w-[1400px]">
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="border-zinc-100 hover:bg-transparent">
                <TableHead className="w-16 pl-10"><Checkbox checked={selectedIds.size > 0 && selectedIds.size === paginatedEntities.length} onCheckedChange={toggleSelectAll} className="data-[state=checked]:bg-primary" /></TableHead>
                <TableHead className="text-[13px] font-black text-black h-14 w-20">#</TableHead>
                <TableHead className="text-[13px] font-black text-black h-14">PROFILE</TableHead>
                <TableHead className="text-[13px] font-black text-black h-14">FULL NAME</TableHead>
                <TableHead className="text-[13px] font-black text-black h-14">ID / REG NO.</TableHead>
                <TableHead className="text-[13px] font-black text-black h-14 text-center">PUNCH IN</TableHead>
                <TableHead className="text-[13px] font-black text-black h-14 text-center">PUNCH OUT</TableHead>
                <TableHead className="text-[13px] font-black text-black h-14">REMARKS</TableHead>
                <TableHead className="text-right pr-10 text-[13px] font-black text-black h-14">MARK STATUS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (<TableRow key={i}><TableCell colSpan={7} className="p-6"><div className="h-14 w-full bg-zinc-50 animate-pulse rounded-2xl" /></TableCell></TableRow>))
              ) : paginatedEntities.length > 0 ? (
                paginatedEntities.map((row, index) => (
                  <TableRow key={row.id} className={cn("border-zinc-50 transition-all", selectedIds.has(row.id) ? "bg-emerald-50/20" : "hover:bg-zinc-50/30")}>
                    <TableCell className="pl-10"><Checkbox checked={selectedIds.has(row.id)} onCheckedChange={() => toggleSelectRow(row.id)} className="data-[state=checked]:bg-primary" /></TableCell>
                    <TableCell className="text-[14px] font-bold text-black">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                    <TableCell>
                      <Avatar className="h-10 w-10 border-2 border-white shadow-sm ring-1 ring-zinc-100">
                        <AvatarImage src={`https://picsum.photos/seed/${row.id}/40/40`} />
                        <AvatarFallback className="bg-zinc-100 text-black font-black text-[10px]">{row.studentName?.charAt(0) || row.firstName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell><span className="text-[14px] font-black text-black font-public-sans">{row.studentName || `${row.firstName} ${row.lastName}`}</span></TableCell>
                    <TableCell className="text-[14px] font-bold text-black font-public-sans tracking-tighter">{row.admissionNo || row.employeeId || '-'}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-bold text-emerald-600">{attendance[row.id]?.checkIn || '-'}</span>
                        {attendance[row.id]?.checkInStatus && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-black uppercase border border-emerald-100">
                            {attendance[row.id].checkInStatus}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-bold text-rose-600">{attendance[row.id]?.checkOut || '-'}</span>
                        {attendance[row.id]?.checkOutStatus && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-black uppercase border border-rose-100">
                            {attendance[row.id].checkOutStatus}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell><Input placeholder="Add internal note..." value={attendance[row.id]?.remarks || ""} onChange={(e) => handleRemarkChange(row.id, e.target.value)} className="h-9 w-full max-w-[200px] text-[14px] rounded-lg border-zinc-100 bg-zinc-50/50 font-medium" /></TableCell>
                    <TableCell className="text-right pr-10">
                      <div className="flex items-center justify-end gap-2">
                        <StatusButton label="P" active={attendance[row.id]?.status === "Present"} color="bg-emerald-500" onClick={() => handleMarkStatus(row.id, "Present")} />
                        <StatusButton label="A" active={attendance[row.id]?.status === "Absent"} color="bg-rose-500" onClick={() => handleMarkStatus(row.id, "Absent")} />
                        <StatusButton label="H" active={attendance[row.id]?.status === "Half Day"} color="bg-orange-500" onClick={() => handleMarkStatus(row.id, "Half Day")} />
                        <StatusButton label="L" active={attendance[row.id]?.status === "Leave"} color="bg-blue-500" onClick={() => handleMarkStatus(row.id, "Leave")} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={7} className="h-64 text-center"><div className="flex flex-col items-center justify-center space-y-4"><div className="p-6 rounded-[32px] bg-zinc-50"><Info className="h-10 w-10 text-zinc-200" /></div><p className="text-[14px] font-black text-zinc-300 tracking-widest">No matching records found</p></div></TableCell></TableRow>
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
    </main>
  )

  if (isPortal) return mainContent

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      <Sidebar />
      <div className="lg:pl-[280px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        {mainContent}
      </div>
    </div>
  )
}

function SummaryCard({ title, value, icon }: { title: string, value: number | string, icon: React.ReactNode }) {
  return (
    <Card className="border border-zinc-100 shadow-sm rounded-[24px] p-6 bg-white flex items-center gap-5 group hover:shadow-md transition-all">
      <div className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center shadow-inner group-hover:bg-white transition-all">{icon}</div>
      <div><p className="text-[10px] font-black text-black tracking-widest mb-0.5">{title}</p><h3 className="text-2xl font-black text-black tracking-tight leading-none">{value}</h3></div>
    </Card>
  )
}

function StatusButton({ label, active, color, onClick }: { label: string, active: boolean, color: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick} 
      className={cn(
        "w-10 h-10 rounded-xl text-[14px] font-black  transition-all border-none outline-none ring-0 shadow-sm flex items-center justify-center active:scale-90", 
        active ? `${color} text-white shadow-lg scale-110 z-10` : "bg-zinc-100 text-black hover:bg-zinc-200"
      )}
    >
      {label}
    </button>
  )
}
