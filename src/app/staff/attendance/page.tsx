"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  UserCheck,
  CalendarDays,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Calendar,
  Filter,
  BarChart3,
  CalendarCheck
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts"
import { useFirebase } from "@/firebase"
import { ref, onValue } from "firebase/database"
import { cn } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import { BioScanner } from "@/components/BioScanner"

export default function StaffAttendancePage() {
  const { database } = useFirebase()
  const [staff, setStaff] = useState<any>(null)
  const [attendanceData, setAttendanceData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("daily")

  const todayDateStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])

  useEffect(() => {
    if (!database) return

    const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('staff_session') : null
    if (!sessionStr) {
      setIsLoading(false)
      return
    }

    try {
      const session = JSON.parse(sessionStr)
      const adminUid = session.adminUid
      const staffId = session.staffId

      if (adminUid && staffId) {
        const rootPath = `Institutes/${adminUid}`
        
        onValue(ref(database, `${rootPath}/employees/${staffId}`), (s) => {
          if (s.exists()) {
            setStaff({ ...s.val(), id: staffId })
            
            // Fetch Attendance
            onValue(ref(database, `${rootPath}/attendance/Staff`), (atts) => {
              const data = atts.val() || {}
              const logs: any[] = []
              Object.keys(data).forEach(date => {
                if (data[date][staffId]) {
                  logs.push({
                    date,
                    ...data[date][staffId]
                  })
                }
              })
              setAttendanceData(logs.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()))
            })
          }
          setIsLoading(false)
        })
      } else {
        setIsLoading(false)
      }
    } catch (e) {
      setIsLoading(false)
    }
  }, [database])

  const hasScannedToday = useMemo(() => {
    return attendanceData.some(log => log.date === todayDateStr && (log.status === 'Present' || log.status === 'Leave' || log.status === 'Half Day'))
  }, [attendanceData, todayDateStr])

  // Process Stats
  const stats = useMemo(() => {
    const total = attendanceData.length
    const present = attendanceData.filter(a => a.status === 'Present').length
    const absent = attendanceData.filter(a => a.status === 'Absent').length
    const leave = attendanceData.filter(a => a.status === 'Leave').length
    const halfDay = attendanceData.filter(a => a.status === 'Half Day').length
    const percent = total > 0 ? Math.round(((present + (halfDay * 0.5)) / total) * 100) : 0

    return { total, present, absent, leave, halfDay, percent }
  }, [attendanceData])

  const statusBadge = useMemo(() => {
    if (stats.percent >= 90) return { label: "Excellent", color: "bg-emerald-50 text-emerald-600 border-emerald-100", icon: <CheckCircle2 className="w-3 h-3" /> }
    if (stats.percent >= 75) return { label: "Satisfactory", color: "bg-amber-50 text-amber-600 border-amber-100", icon: <AlertCircle className="w-3 h-3" /> }
    return { label: "Needs Improvement", color: "bg-rose-50 text-rose-600 border-rose-100", icon: <XCircle className="w-3 h-3" /> }
  }, [stats.percent])

  // Charts Data
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const counts = months.map(m => ({ name: m, present: 0, absent: 0, leave: 0, halfDay: 0 }))

    attendanceData.forEach(log => {
      const mIdx = new Date(log.date).getMonth()
      if (log.status === 'Present') counts[mIdx].present++
      else if (log.status === 'Absent') counts[mIdx].absent++
      else if (log.status === 'Leave') counts[mIdx].leave++
      else if (log.status === 'Half Day') counts[mIdx].halfDay++
    })
    return counts.slice(0, new Date().getMonth() + 1)
  }, [attendanceData])

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 tracking-[0.3em] animate-pulse">Loading Biometric Dashboard...</div>
  if (!staff) return <div className="p-20 text-center text-black font-bold">UNAUTHORIZED ACCESS</div>

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-5xl mx-auto">
      
      {/* 0️⃣ BIOSCAN ENFORCEMENT */}
      {!hasScannedToday && (
        <div className="animate-in slide-in-from-top-10 duration-500">
          {/* We must pass a standard 'groupId' for Staff logic to fall inline, or we can use "General" as default within BioScanner */}
          <BioScanner 
            role="Staff" 
            userId={staff.id} 
            userName={`${staff.firstName} ${staff.lastName}`} 
            groupId="General" 
          />
        </div>
      )}

      {/* 1️⃣ ATTENDANCE HEADER SECTION */}
      <Card className="border-none shadow-xl rounded-[40px] bg-white overflow-hidden p-10">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-24 h-24 rounded-[32px] bg-primary/5 flex items-center justify-center text-primary shadow-inner" style={{ color: 'hsl(var(--primary))' }}>
              <CalendarCheck className="w-12 h-12" />
            </div>
            <div className="text-center md:text-left space-y-3">
              <h2 className="text-3xl font-black text-black tracking-tight leading-none">{staff.firstName} {staff.lastName}</h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <Badge variant="outline" className="rounded-lg border-zinc-100 text-black font-bold text-[10px] px-3 py-1">EMP ID: {staff.employeeId}</Badge>
                <Badge className={cn("rounded-full border px-4 py-1 text-[10px] font-black  flex items-center gap-1.5", statusBadge.color)}>
                  {statusBadge.icon} {statusBadge.label}
                </Badge>
              </div>
              <p className="text-[11px] font-bold text-black tracking-[0.2em]">{staff.department} | {staff.designation}</p>
            </div>
          </div>

          <div className="flex flex-col items-center lg:items-end gap-2">
            <p className="text-[10px] font-black text-black tracking-widest">Attendance Health</p>
            <div className="flex items-baseline gap-1">
              <span className={cn("text-5xl font-black tracking-tighter", stats.percent >= 75 ? "text-emerald-600" : "text-rose-500")}>{stats.percent}</span>
              <span className="text-2xl font-black text-zinc-300">%</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 2️⃣ SUMMARY CARDS SECTION */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        <StatCard label="Total Shifts" value={stats.total} icon={<Calendar className="w-5 h-5 text-black" />} />
        <StatCard label="Present" value={stats.present} icon={<UserCheck className="w-5 h-5 text-emerald-500" />} />
        <StatCard label="Half Day" value={stats.halfDay} icon={<Clock className="w-5 h-5 text-orange-500" />} />
        <StatCard label="On Leave" value={stats.leave} icon={<AlertCircle className="w-5 h-5 text-blue-500" />} />
        <StatCard label="Absent" value={stats.absent} icon={<XCircle className="w-5 h-5 text-rose-500" />} />
      </div>

      {/* 3️⃣ TABS NAVIGATION */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white p-2 rounded-[24px] h-auto flex-wrap justify-start gap-2 shadow-sm border border-zinc-100">
          <DashboardTabTrigger value="daily" label="Daily Ledger" icon={<Calendar className="w-4 h-4" />} />
          <DashboardTabTrigger value="monthly" label="Performance Chart" icon={<BarChart3 className="w-4 h-4" />} />
        </TabsList>

        <div className="mt-8">
          <TabsContent value="daily" className="mt-0 animate-in fade-in duration-500">
            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
              <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
                <h3 className="font-black text-black text-[10px] tracking-[0.2em]">Presence Check-ins</h3>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-50">
                    <TableRow>
                      <TableHead className="pl-8 text-[10px] font-black">Date</TableHead>
                      <TableHead className="text-[10px] font-black">Day</TableHead>
                      <TableHead className="text-[10px] font-black">Status</TableHead>
                      <TableHead className="text-[10px] font-black">Remark</TableHead>
                      <TableHead className="text-right pr-8 text-[10px] font-black">Log Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceData.map((log, i) => (
                      <TableRow key={i} className="border-zinc-50 hover:bg-zinc-50/30 transition-all group">
                        <TableCell className="pl-8 font-black text-black font-public-sans">{log.date}</TableCell>
                        <TableCell className="text-[14px] font-medium text-black">{format(parseISO(log.date), "EEEE")}</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "rounded-md text-[9px] font-black  border-none px-2.5",
                            log.status === 'Present' ? "bg-emerald-50 text-emerald-600" :
                              log.status === 'Absent' ? "bg-rose-50 text-rose-600" : 
                              log.status === 'Half Day' ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"
                          )}>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[14px] text-black max-w-[200px] truncate">{log.remarks || '-'}</TableCell>
                        <TableCell className="text-right pr-8 text-[10px] font-bold text-zinc-300">{log.updatedAt ? format(new Date(log.updatedAt), "hh:mm a") : '-'}</TableCell>
                      </TableRow>
                    ))}
                    {attendanceData.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="h-48 text-center text-zinc-300 italic">No attendance records found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="monthly" className="mt-0 animate-in fade-in duration-500">
            <Card className="border-none shadow-sm rounded-[32px] bg-white p-8 space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary" style={{ color: 'hsl(var(--primary))' }}><BarChart3 className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-lg font-black text-black tracking-tight">Monthly Insights</h3>
                  <p className="text-[10px] font-bold text-black tracking-widest">Yearly Performance Trends</p>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: '' }} />
                    <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar dataKey="halfDay" name="Half Day" fill="#f97316" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar dataKey="leave" name="Leave" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </main>
  )
}

function StatCard({ label, value, icon }: any) {
  return (
    <Card className="border-none shadow-sm rounded-3xl bg-white p-6 group hover:shadow-md transition-all">
      <div className="flex flex-col gap-4">
        <div className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center transition-colors group-hover:bg-white group-hover:shadow-inner">
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-black text-black tracking-widest mb-0.5">{label}</p>
          <h4 className="text-xl font-black text-black tracking-tight">{value}</h4>
        </div>
      </div>
    </Card>
  )
}

function DashboardTabTrigger({ value, label, icon }: any) {
  return (
    <TabsTrigger
      value={value}
      className="h-11 px-6 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white text-black font-bold text-[10px] tracking-widest transition-all border border-transparent data-[state=active]:shadow-lg"
      style={{ '--map-active-bg': 'hsl(var(--primary))' } as any}
    >
      <span className="flex items-center gap-2">{icon} {label}</span>
    </TabsTrigger>
  )
}
