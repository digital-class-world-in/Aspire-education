"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, get } from "firebase/database"
import { cn } from "@/lib/utils"
import { Search, Calendar, ChevronLeft, ChevronRight, FileText, Download } from "lucide-react"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { format } from "date-fns"
import * as XLSX from "xlsx"
import { useToast } from "@/hooks/use-toast"
import { RefreshCw } from "lucide-react"

export default function TransactionLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [fromDate, setFromDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const { toast } = useToast()
  const itemsPerPage = 20
  
  const [students, setStudents] = useState<Record<string, any>>({})
  const [employees, setEmployees] = useState<Record<string, any>>({})

  const { database } = useFirebase()
  const { resolvedId, isStaff, isBranch } = useResolvedId()

  useEffect(() => {
    if (!database || !resolvedId) return

    setIsLoading(true)
    const rootPath = `Institutes/${resolvedId}`

    // Fetch students to map names
    get(ref(database, `${rootPath}/admissions`)).then(snap => {
      if (snap.exists()) {
        const stds = snap.val()
        const stdMap: Record<string, any> = {}
        Object.values(stds).forEach((s: any) => {
          if (s.rollNo) {
            const machineCode = s.rollNo.toString().replace(/^(STU_|EMP_)/i, '')
            stdMap[machineCode.toLowerCase()] = s
            stdMap[s.rollNo.toString().toLowerCase()] = s
          }
        })
        setStudents(stdMap)
      }
    })

    // Fetch employees to map names
    get(ref(database, `${rootPath}/employees`)).then(snap => {
      if (snap.exists()) {
        const emps = snap.val()
        const empMap: Record<string, any> = {}
        Object.values(emps).forEach((e: any) => {
          if (e.employeeId) {
            const machineCode = e.employeeId.toString().replace(/^(STU_|EMP_)/i, '')
            empMap[machineCode.toLowerCase()] = e
            empMap[e.employeeId.toString().toLowerCase()] = e
          }
        })
        setEmployees(empMap)
      }
    })

    // Listen to eSSL logs
    const unsub = onValue(ref(database, `${rootPath}/essl_logs`), (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const logsArray = Object.keys(data).map(key => ({
          ...data[key],
          id: key
        }))
        // Sort newest first
        logsArray.sort((a, b) => {
          const timeA = new Date(a.DateTime || 0).getTime()
          const timeB = new Date(b.DateTime || 0).getTime()
          return timeB - timeA
        })
        setLogs(logsArray)
      } else {
        setLogs([])
      }
      setIsLoading(false)
    })

    return () => unsub()
  }, [database, resolvedId])

  const getUserDetails = (employeeCode: string) => {
    if (!employeeCode) return { name: "Unknown", type: "-", code: "" }
    const code = employeeCode.toString().toLowerCase()
    
    // Check students
    if (students[code]) {
      return { 
        name: students[code].studentName || "Unknown", 
        type: "Student", 
        code: students[code].rollNo || employeeCode 
      }
    }
    
    // Check employees
    if (employees[code]) {
      return { 
        name: `${employees[code].firstName || ""} ${employees[code].lastName || ""}`.trim() || "Unknown", 
        type: "Staff", 
        code: employees[code].employeeId || employeeCode 
      }
    }

    return { name: "Unknown", type: "-", code: employeeCode }
  }

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const details = getUserDetails(log.EmployeeCode)
      const searchMatch = !searchTerm || 
        log.EmployeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        details.name.toLowerCase().includes(searchTerm.toLowerCase())
      
      let dateMatch = true
      if (log.DateTime && (fromDate || toDate)) {
        // format usually "YYYY-MM-DD HH:mm:ss"
        const logDate = log.DateTime.split(" ")[0] 
        if (fromDate && logDate < fromDate) dateMatch = false
        if (toDate && logDate > toDate) dateMatch = false
      }

      return searchMatch && dateMatch
    })
  }, [logs, searchTerm, fromDate, toDate, students, employees])

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleExport = () => {
    if (!filteredLogs.length) return
    const exportData = filteredLogs.map(log => {
      const details = getUserDetails(log.EmployeeCode)
      return {
        "User Type": details.type,
        "System ID": details.code,
        "Machine Code": log.EmployeeCode,
        "Name": details.name,
        "Date & Time": log.DateTime,
        "Punch Type": log.Status,
        "Source": log.source || "eSSL Device",
        "SMS Sent": log.isSMSSent || log.smsSent ? "Yes" : "No"
      }
    })
    
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Transaction Logs")
    XLSX.writeFile(wb, `Transaction_Logs_${format(new Date(), "yyyyMMdd")}.xlsx`)
  }

  const handleSyncLogs = async (fetchAll: boolean = false) => {
    setIsSyncing(true)
    try {
      const { esslService } = await import("@/services/essl-service")
      const today = new Date()
      let syncFromDate = format(new Date(today.getTime() - 24 * 60 * 60 * 1000 * 3), "yyyy-MM-dd HH:mm:ss") // Last 3 days to be safe
      
      if (fetchAll) {
        syncFromDate = "2020-01-01 00:00:00"
      } else if (fromDate) {
        syncFromDate = `${fromDate} 00:00:00`
      }
      
      const syncToDate = toDate && !fetchAll ? `${toDate} 23:59:59` : format(today, "yyyy-MM-dd HH:mm:ss")
      
      const result = await esslService.fetchAndSaveLogs({
        FromDateTime: syncFromDate,
        ToDateTime: syncToDate,
        SerialNumber: "NFZ8245102868",
        UserName: "aspireedu",
        UserPassword: "Aspire@123"
      }, database, resolvedId, Object.values(students))
      
      if (result.count > 0) {
        toast({ title: "Sync Successful", description: `Fetched ${result.count} new logs from machine.` })
      } else {
        toast({ title: "Sync Complete", description: "No new logs found on the machine." })
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: error.message || "Failed to sync with machine." })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 lg:pl-[300px]">
        <TopNav />
        <main className="flex-1 p-8 space-y-8 animate-in fade-in duration-500 w-full overflow-x-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div>
              <h2 className="text-[26px] font-normal text-black font-public-sans leading-none">Transaction Logs</h2>
              <p className="text-[14px] text-black font-medium mt-1.5">Raw biometric punch records from eSSL devices</p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => handleSyncLogs(true)} disabled={isSyncing} variant="outline" className="h-11 px-6 rounded-xl font-medium text-[14px] border-zinc-200 text-black hover:bg-zinc-50 transition-all">
                <RefreshCw className={cn("w-4 h-4 mr-2", isSyncing && "animate-spin")} /> {isSyncing ? "Syncing..." : "Sync All Data"}
              </Button>
              <Button onClick={() => handleSyncLogs(false)} disabled={isSyncing} className="h-11 px-6 rounded-xl font-medium text-[14px] bg-emerald-500 hover:bg-emerald-600 text-white transition-all">
                <RefreshCw className={cn("w-4 h-4 mr-2", isSyncing && "animate-spin")} /> {isSyncing ? "Syncing..." : "Sync Latest Logs"}
              </Button>
              <Button onClick={handleExport} className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-6 font-medium text-[14px] border-none shadow-lg active:scale-95 transition-all">
                <Download className="w-4 h-4 mr-2" /> Export to Excel
              </Button>
            </div>
          </div>

          <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-[11px] font-black text-black tracking-widest ml-1">From Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-zinc-300 pointer-events-none" />
                  <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }} className="h-11 pl-10 rounded-xl border-zinc-200 bg-zinc-50/50 text-[14px] font-bold text-black shadow-inner" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-black text-black tracking-widest ml-1">To Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-zinc-300 pointer-events-none" />
                  <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }} className="h-11 pl-10 rounded-xl border-zinc-200 bg-zinc-50/50 text-[14px] font-bold text-black shadow-inner" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-black text-black tracking-widest ml-1">Search Keyword</Label>
                <div className="relative group">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
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
              <Table className="min-w-[1000px]">
                <TableHeader className="bg-zinc-50/50">
                  <TableRow className="border-zinc-100 hover:bg-transparent">
                    <TableHead className="text-[13px] font-black text-black h-14 pl-8">DATE & TIME</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14">MACHINE CODE</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14">USER NAME</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14">USER TYPE</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14">PUNCH TYPE</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14">SMS STATUS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center">Loading logs...</TableCell></TableRow>
                  ) : paginatedLogs.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-64 text-center text-zinc-400 italic font-medium">No transaction logs found for the selected criteria</TableCell></TableRow>
                  ) : (
                    paginatedLogs.map((log) => {
                      const details = getUserDetails(log.EmployeeCode)
                      return (
                        <TableRow key={log.id} className="border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                          <TableCell className="pl-8 text-[14px] font-bold text-black whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-zinc-300" />
                              {log.DateTime}
                            </div>
                          </TableCell>
                          <TableCell className="text-[14px] font-black text-primary font-public-sans tracking-tight">
                            {log.EmployeeCode}
                          </TableCell>
                          <TableCell className="text-[14px] font-bold text-black">
                            {details.name}
                          </TableCell>
                          <TableCell>
                            <span className={cn("px-2.5 py-1 rounded-md text-[11px] font-black", 
                              details.type === "Student" ? "bg-teal-50 text-teal-700" : 
                              details.type === "Staff" ? "bg-blue-50 text-blue-700" : 
                              "bg-zinc-100 text-zinc-600"
                            )}>
                              {details.type}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={cn("px-2.5 py-1 rounded-md text-[11px] font-black",
                              log.Status === "IN" ? "bg-emerald-50 text-emerald-700" :
                              log.Status === "OUT" ? "bg-rose-50 text-rose-700" :
                              "bg-zinc-100 text-zinc-700"
                            )}>
                              {log.Status || "UNKNOWN"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {(log.isSMSSent || log.smsSent) ? (
                              <span className="text-emerald-600 font-bold text-[12px]">Sent</span>
                            ) : (
                              <span className="text-zinc-400 font-medium text-[12px]">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4 pb-8">
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-10 px-6 rounded-xl font-black text-[10px] tracking-widest transition-all"><ChevronLeft className="w-4 h-4 mr-2" /> Previous</Button>
              <div className="flex items-center gap-2">{[...Array(totalPages)].map((_, i) => {
                if (totalPages > 7 && i !== 0 && i !== totalPages - 1 && Math.abs(i + 1 - currentPage) > 1) {
                  if (i + 1 === currentPage - 2 || i + 1 === currentPage + 2) return <span key={i} className="text-zinc-400">...</span>
                  return null
                }
                return (
                  <button key={i} onClick={() => setCurrentPage(i + 1)} className={cn("w-10 h-10 rounded-xl text-[10px] font-black transition-all", currentPage === i + 1 ? "bg-primary text-white shadow-xl scale-110" : "bg-white text-black border border-zinc-100")}>{i + 1}</button>
                )
              })}</div>
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-10 px-6 rounded-xl font-black text-[10px] tracking-widest transition-all">Next <ChevronRight className="w-4 h-4 ml-2" /></Button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
