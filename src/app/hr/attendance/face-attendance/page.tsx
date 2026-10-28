"use client"

import { useState, useEffect, useMemo } from "react"
import { useFirebase } from "@/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
import { TopNav } from "@/components/layout/top-nav"
import { Sidebar } from "@/components/layout/sidebar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Download, Search, Users, Shield, BookOpen, Camera, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { usePathname } from "next/navigation"

export default function AttendanceManagement() {
  const { firestore } = useFirebase()
  const [logs, setLogs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("All") // All, Student, Staff

  const pathname = usePathname()
  const isPortal = pathname.startsWith('/branch') || pathname.startsWith('/staff') || pathname.startsWith('/student')

  const fetchLogs = async () => {
    if (!firestore) return
    setIsLoading(true)
    try {
      const q = query(collection(firestore, "attendance"), where("date", "==", selectedDate))
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setLogs(data.sort((a: any, b: any) => new Date(`1970/01/01 ${b.time}`).getTime() - new Date(`1970/01/01 ${a.time}`).getTime()))
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [firestore, selectedDate])

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const matchesSearch = l.name?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesRole = roleFilter === "All" || l.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [logs, searchTerm, roleFilter])

  const exportCSV = () => {
    const headers = ["ID", "Name", "Role", "Date", "Time", "Status"]
    const rows = filteredLogs.map(log => [
      log.userId, log.name, log.role, log.date, log.time, log.status
    ])
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Attendance_${selectedDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const content = (
    <main className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full font-public-sans text-black animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-end">
        <div>
          <h2 className="text-3xl font-black text-black tracking-tight flex items-center gap-4">
            <Camera className="w-8 h-8 text-primary" /> Attendance Management
          </h2>
          <p className="text-[14px] font-bold tracking-widest text-black mt-2">Biometric Verification Ledger</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
            className="w-48 h-12 rounded-xl border-zinc-200 bg-white shadow-sm font-bold text-[14px]" 
          />
          <select 
            value={roleFilter} 
            onChange={e => setRoleFilter(e.target.value)} 
            className="w-40 h-12 rounded-xl border-zinc-200 bg-white font-bold text-[14px] px-4 outline-none ring-0 shadow-sm"
          >
            <option value="All">All Roles</option>
            <option value="Student">Student</option>
            <option value="Staff">Staff</option>
          </select>
          <Button onClick={exportCSV} className="h-12 bg-primary text-white font-black tracking-widest rounded-xl text-[14px]"><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-8 bg-white rounded-3xl shadow-sm border border-zinc-100 flex items-center gap-6">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shadow-inner"><Users className="w-7 h-7" /></div>
          <div><p className="text-[10px] font-black tracking-widest text-black mb-1">Total Present</p><h3 className="text-3xl font-black text-emerald-900">{logs.length}</h3></div>
        </div>
        <div className="p-8 bg-white rounded-3xl shadow-sm border border-zinc-100 flex items-center gap-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shadow-inner"><Shield className="w-7 h-7" /></div>
          <div><p className="text-[10px] font-black tracking-widest text-black mb-1">Staff Present</p><h3 className="text-3xl font-black text-blue-900">{logs.filter(l => l.role === 'Staff').length}</h3></div>
        </div>
        <div className="p-8 bg-white rounded-3xl shadow-sm border border-zinc-100 flex items-center gap-6">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center shadow-inner"><BookOpen className="w-7 h-7" /></div>
          <div><p className="text-[10px] font-black tracking-widest text-black mb-1">Student Present</p><h3 className="text-3xl font-black text-amber-900">{logs.filter(l => l.role === 'Student').length}</h3></div>
        </div>
      </div>

      <Card className="border border-zinc-100 shadow-sm rounded-3xl bg-white overflow-hidden pb-8">
        <div className="p-6 flex flex-col md:flex-row gap-4 items-center justify-between border-b border-zinc-50 bg-zinc-50/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black" />
            <Input 
              placeholder="Search by name..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="h-12 border-none bg-white rounded-xl font-bold pl-12 shadow-sm text-[14px] full-w" 
            />
          </div>
          <p className="text-[10px] font-black tracking-widest text-black">Total Filtered: <span className="text-black">{filteredLogs.length}</span></p>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
             <div className="w-full h-48 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-zinc-300" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-transparent pointer-events-none border-b border-zinc-100">
                <TableRow className="border-none">
                  <TableHead className="text-[10px] font-black tracking-widest pl-8 h-12 text-black">Employee/Student</TableHead>
                  <TableHead className="text-[10px] font-black tracking-widest text-black">Role Identity</TableHead>
                  <TableHead className="text-[10px] font-black tracking-widest text-black">Timestamp</TableHead>
                  <TableHead className="text-[10px] font-black tracking-widest text-right pr-8 text-black">Verification Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map(log => (
                  <TableRow key={log.id} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                    <TableCell className="pl-8 py-4">
                      <div className="flex items-center gap-4">
                        {log.photoURL ? (
                          <img src={log.photoURL} alt={log.name} className="w-10 h-10 rounded-full object-cover shadow-sm border border-zinc-100" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center font-black text-black text-[14px] shadow-sm">
                            {log.name?.charAt(0) || "-"}
                          </div>
                        )}
                        <div>
                          <p className="text-[14px] font-black tracking-tight text-black">{log.name}</p>
                          <p className="text-[10px] font-bold text-black">ID: {log.userId}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[9px] font-black  px-3 py-1 border-none shadow-sm ${log.role === 'Staff' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                        {log.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-[14px] font-bold text-black">{log.time}</p>
                      <p className="text-[10px] font-bold text-black tracking-widest">{log.date}</p>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                       <Badge className="bg-emerald-50 text-emerald-600 border-none px-3 py-1 text-[9px] font-black tracking-widest shadow-sm">
                         <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 inline" /> {log.status}
                       </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && filteredLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center">
                        <p className="text-[10px] font-black tracking-widest text-black bg-zinc-50 inline-block px-6 py-3 rounded-full border border-zinc-100">No attendance logs found matching filters.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </main>
  )

  if (isPortal) return content
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans overflow-x-hidden">
      <Sidebar />
      <div className="lg:pl-[300px] flex flex-col flex-1 min-w-0 overflow-x-hidden">
        <TopNav />
        {content}
      </div>
    </div>
  )
}
