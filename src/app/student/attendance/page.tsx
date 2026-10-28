"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  UserCheck,
  CalendarDays,
  Clock,
  TrendingUp,
  FileText,
  Printer,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Calendar,
  Filter,
  Users,
  Layers,
  BookOpen,
  PieChart as PieChartIcon,
  BarChart3,
  Info,
  ChevronRight,
  ShieldCheck,
  ClipboardList,
  CalendarCheck,
  Plus
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { cn } from "@/lib/utils"
import { format, parseISO, getMonth, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns"
import { BioScanner } from "@/components/BioScanner"

const COLORS = ['#1e3a8a', '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function StudentAttendancePage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const [student, setStudent] = useState<any>(null)
  const [attendanceData, setAttendanceData] = useState<any[]>([])
  const [leaveRequests, setLeaveRequests] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("daily")

  useEffect(() => {
    if (!database) return

    const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('student_session') : null
    if (!sessionStr) {
      setIsLoading(false)
      return
    }

    try {
      const session = JSON.parse(sessionStr)
      const adminUid = session.adminUid
      const studentId = session.studentId

      if (adminUid && studentId) {
        const rootPath = `Institutes/${adminUid}`
        
        onValue(ref(database, `${rootPath}/admissions/${studentId}`), (s) => {
          if (s.exists()) {
            setStudent({ ...s.val(), id: studentId })
            
            // Fetch Attendance
            onValue(ref(database, `${rootPath}/attendance/Student`), (atts) => {
              const data = atts.val() || {}
              const logs: any[] = []
              Object.keys(data).forEach(date => {
                Object.keys(data[date]).forEach(batchId => {
                  if (data[date][batchId][studentId]) {
                    logs.push({
                      date,
                      ...data[date][batchId][studentId]
                    })
                  }
                })
              })
              setAttendanceData(logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
            })

            // Fetch Leaves
            onValue(ref(database, `${rootPath}/leave-requests`), (leaves) => {
              const data = leaves.val() || {}
              setLeaveRequests(Object.values(data).filter((l: any) => l.requesterId === studentId))
            })
          }
          setIsLoading(false)
        })
      } else {
        setIsLoading(false)
      }
    } catch (e) {
      console.error("Session parse error", e)
      setIsLoading(false)
    }
  }, [database])

  // Process Stats
  const stats = useMemo(() => {
    const total = attendanceData.length
    const present = attendanceData.filter(a => a.status === 'Present').length
    const absent = attendanceData.filter(a => a.status === 'Absent').length
    const leave = attendanceData.filter(a => a.status === 'Leave').length
    const late = attendanceData.filter(a => a.status === 'Late').length
    const percent = total > 0 ? Math.round((present / total) * 100) : 0

    return { total, present, absent, leave, late, percent }
  }, [attendanceData])

  const statusBadge = useMemo(() => {
    if (stats.percent >= 85) return { label: "Good", color: "bg-emerald-50 text-emerald-600 border-emerald-100", icon: <CheckCircle2 className="w-3 h-3" /> }
    if (stats.percent >= 75) return { label: "Warning", color: "bg-amber-50 text-amber-600 border-amber-100", icon: <AlertCircle className="w-3 h-3" /> }
    return { label: "Critical", color: "bg-rose-50 text-rose-600 border-rose-100", icon: <XCircle className="w-3 h-3" /> }
  }, [stats.percent])

  const todayDateStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])
  const hasScannedToday = useMemo(() => {
    return attendanceData.some(log => log.date === todayDateStr && (log.status === 'Present' || log.status === 'Leave' || log.status === 'Late'))
  }, [attendanceData, todayDateStr])

  // Charts Data
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const counts = months.map(m => ({ name: m, present: 0, absent: 0, leave: 0 }))

    attendanceData.forEach(log => {
      const mIdx = new Date(log.date).getMonth()
      if (log.status === 'Present') counts[mIdx].present++
      else if (log.status === 'Absent') counts[mIdx].absent++
      else if (log.status === 'Leave') counts[mIdx].leave++
    })
    return counts.slice(0, new Date().getMonth() + 1)
  }, [attendanceData])

  const subjectData = [
    { name: 'Mathematics', value: 88 },
    { name: 'Physics', value: 92 },
    { name: 'Chemistry', value: 70 },
    { name: 'English', value: 95 },
    { name: 'Biology', value: 82 }
  ]

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 tracking-[0.3em] animate-pulse">Initializing Data Stream...</div>
  if (!student) return <div className="p-20 text-center text-black font-bold">UNAUTHORIZED ACCESS</div>

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto">

      {/* 0️⃣ BIOSCAN ENFORCEMENT */}
      {!hasScannedToday && (
        <div className="animate-in slide-in-from-top-10 duration-500">
          <BioScanner 
            role="Student" 
            userId={student.id} 
            userName={student.studentName} 
            groupId={student.course} 
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
              <h2 className="text-3xl font-black text-black tracking-tight leading-none">{student.studentName}</h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <Badge variant="outline" className="rounded-lg border-zinc-100 text-black font-bold text-[10px] px-3 py-1">ID: {student.admissionNo}</Badge>
                <Badge className={cn("rounded-full border px-4 py-1 text-[10px] font-black  flex items-center gap-1.5", statusBadge.color)}>
                  {statusBadge.icon} {statusBadge.label}
                </Badge>
              </div>
              <p className="text-[11px] font-bold text-black tracking-[0.2em]">{student.course} | Section {student.section || 'A'} | {student.session || '2024-25'}</p>
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <StatCard label="Working Days" value={stats.total} icon={<Calendar className="w-5 h-5 text-black" />} />
        <StatCard label="Present" value={stats.present} icon={<UserCheck className="w-5 h-5 text-emerald-500" />} />
        <StatCard label="Absent" value={stats.absent} icon={<XCircle className="w-5 h-5 text-rose-500" />} />
        <StatCard label="On Leave" value={stats.leave} icon={<Clock className="w-5 h-5 text-blue-500" />} />
        <StatCard label="Late Entries" value={stats.late || 0} icon={<AlertCircle className="w-5 h-5 text-amber-500" />} />
        <StatCard label="Success Rate" value={`${stats.percent}%`} icon={<TrendingUp className="w-5 h-5 text-indigo-500" />} />
      </div>

      {/* 3️⃣ ATTENDANCE ANALYTICS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-8 border-none shadow-sm rounded-[32px] bg-white p-8 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary" style={{ color: 'hsl(var(--primary))' }}><BarChart3 className="w-5 h-5" /></div>
            <div>
              <h3 className="text-lg font-black text-black tracking-tight">Monthly Persistence</h3>
              <p className="text-[10px] font-bold text-black tracking-widest">Session Performance Trends</p>
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
                <Bar dataKey="leave" name="Leave" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-4 border-none shadow-sm rounded-[32px] bg-white p-8 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600"><PieChartIcon className="w-5 h-5" /></div>
            <div>
              <h3 className="text-lg font-black text-black tracking-tight">Subject Wise</h3>
              <p className="text-[10px] font-bold text-black tracking-widest">Engagement breakdown</p>
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subjectData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {subjectData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {subjectData.map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[11px] font-bold text-black">{s.name}</span>
                </div>
                <span className="text-[14px] font-black text-black">{s.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 4️⃣ TABS NAVIGATION */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white p-2 rounded-[24px] h-auto flex-wrap justify-start gap-2 shadow-sm border border-zinc-100">
          <DashboardTabTrigger value="daily" label="Daily Attendance" icon={<Calendar className="w-4 h-4" />} />
          <DashboardTabTrigger value="monthly" label="Monthly Report" icon={<BarChart3 className="w-4 h-4" />} />
          <DashboardTabTrigger value="subject" label="Subject-Wise" icon={<BookOpen className="w-4 h-4" />} />
          <DashboardTabTrigger value="leave" label="Leave History" icon={<Clock className="w-4 h-4" />} />
          <DashboardTabTrigger value="policy" label="Attendance Policy" icon={<ShieldCheck className="w-4 h-4" />} />
          <DashboardTabTrigger value="download" label="Download Reports" icon={<Download className="w-4 h-4" />} />
        </TabsList>

        <div className="mt-8">
          {/* 5️⃣ DAILY ATTENDANCE TAB */}
          <TabsContent value="daily" className="mt-0 animate-in fade-in duration-500">
            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
              <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
                <h3 className="font-black text-black text-[10px] tracking-[0.2em]">Academic Presence Ledger</h3>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" className="h-8 rounded-lg text-[9px] font-black tracking-widest gap-2 bg-zinc-50"><Filter className="w-3 h-3" /> Filter Date</Button>
                </div>
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
                              log.status === 'Absent' ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
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

          {/* 6️⃣ MONTHLY REPORT TAB */}
          <TabsContent value="monthly" className="mt-0 animate-in fade-in duration-500">
            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-50">
                    <TableRow>
                      <TableHead className="pl-8 text-[10px] font-black h-14">Month</TableHead>
                      <TableHead className="text-center text-[10px] font-black">Working Days</TableHead>
                      <TableHead className="text-center text-[10px] font-black text-emerald-600">Present</TableHead>
                      <TableHead className="text-center text-[10px] font-black text-rose-500">Absent</TableHead>
                      <TableHead className="text-center text-[10px) font-black text-blue-500">Leave</TableHead>
                      <TableHead className="text-right pr-8 text-[10px] font-black">Percentage %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyData.map((m, i) => {
                      const total = m.present + m.absent + m.leave
                      const per = total > 0 ? Math.round((m.present / total) * 100) : 0
                      return (
                        <TableRow key={i} className="border-zinc-50">
                          <TableCell className="pl-8 font-black text-black">{m.name} 2024</TableCell>
                          <TableCell className="text-center font-bold text-black">{total}</TableCell>
                          <TableCell className="text-center font-black text-emerald-600">{m.present}</TableCell>
                          <TableCell className="text-center font-black text-rose-500">{m.absent}</TableCell>
                          <TableCell className="text-center font-black text-blue-500">{m.leave}</TableCell>
                          <TableCell className="text-right pr-8 font-black text-primary" style={{ color: 'hsl(var(--primary))' }}>{per}%</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* 7️⃣ SUBJECT-WISE TAB */}
          <TabsContent value="subject" className="mt-0 animate-in fade-in duration-500 space-y-6">
            <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-rose-500 shadow-sm"><AlertCircle className="w-6 h-6" /></div>
              <div>
                <h4 className="text-[14px] font-black text-rose-700 tracking-tight">Minimum Attendance Alert</h4>
                <p className="text-[14px] text-rose-600 font-medium">Your attendance in <span className="font-bold">Chemistry</span> is currently 70%, which is below the required 75% minimum.</p>
              </div>
            </div>
            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead className="pl-8 text-[10px] font-black">Subject Name</TableHead>
                    <TableHead className="text-center text-[10px] font-black">Total Classes</TableHead>
                    <TableHead className="text-center text-[10px] font-black">Present</TableHead>
                    <TableHead className="text-center text-[10px] font-black">Absent</TableHead>
                    <TableHead className="text-right pr-8 text-[10px] font-black">Presence %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjectData.map((s, i) => (
                    <TableRow key={i} className="border-zinc-50">
                      <TableCell className="pl-8 font-bold text-black">{s.name}</TableCell>
                      <TableCell className="text-center font-medium text-black">40</TableCell>
                      <TableCell className="text-center font-black text-emerald-600">35</TableCell>
                      <TableCell className="text-center font-black text-rose-500">5</TableCell>
                      <TableCell className="text-right pr-8">
                        <span className={cn("text-[14px] font-black", s.value < 75 ? "text-rose-500" : "text-emerald-600")}>{s.value}%</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* 8️⃣ LEAVE HISTORY TAB */}
          <TabsContent value="leave" className="mt-0 animate-in fade-in duration-500 space-y-6">
            <div className="flex justify-end">
              <Button className="bg-primary hover:opacity-90 text-white rounded-xl h-10 px-6 font-bold text-[14px] gap-2 shadow-lg shadow-blue-900/20"><Plus className="w-4 h-4" /> Apply for Leave</Button>
            </div>
            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-50">
                    <TableRow>
                      <TableHead className="pl-8 text-[10px] font-black h-14">Leave Type</TableHead>
                      <TableHead className="text-[10px] font-black">From Date</TableHead>
                      <TableHead className="text-[10px] font-black">To Date</TableHead>
                      <TableHead className="text-[10px] font-black">Reason</TableHead>
                      <TableHead className="text-[10px] font-black">Status</TableHead>
                      <TableHead className="text-right pr-8 text-[10px] font-black">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveRequests.map((l, i) => (
                      <TableRow key={i} className="border-zinc-50">
                        <TableCell className="pl-8 font-bold text-black">{l.leaveType}</TableCell>
                        <TableCell className="text-[14px] text-black">{l.fromDate}</TableCell>
                        <TableCell className="text-[14px] text-black">{l.toDate}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-[14px] text-black font-medium">{l.reason}</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "rounded-md text-[9px] font-black  border-none px-2",
                            l.status === 'Approved' ? "bg-emerald-50 text-emerald-600" :
                              l.status === 'Rejected' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                          )}>
                            {l.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-300 hover:text-rose-500"><XCircle className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {leaveRequests.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="h-48 text-center text-zinc-300 italic">No leave history found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* 9️⃣ POLICY TAB */}
          <TabsContent value="policy" className="mt-0 animate-in fade-in duration-500">
            <Card className="border-none shadow-sm rounded-[32px] bg-white p-10 space-y-10">
              <div className="space-y-6">
                <SectionHeader icon={<ShieldCheck className="text-primary" style={{ color: 'hsl(var(--primary))' }} />} title="Institutional Attendance Rules" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <PolicyItem title="Minimum Requirement" description="Every student must maintain at least 75% overall attendance to be eligible for final examinations." />
                  <PolicyItem title="Late Entry Policy" description="Students arriving 15 minutes after class commencement will be marked as 'Late'. Three late entries equal one absence." />
                  <PolicyItem title="Leave Submission" description="Leave applications must be submitted via the portal at least 24 hours in advance, except for emergencies." />
                  <PolicyItem title="Medical Absences" description="Medical leave exceeding 3 days requires a valid doctor's certificate to be uploaded in the documents section." />
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* 10️⃣ DOWNLOAD REPORTS TAB */}
          <TabsContent value="download" className="mt-0 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <DownloadCard title="Monthly Attendance" description="Detailed day-wise presence report for the current month." format="PDF" />
              <DownloadCard title="Yearly Summary" description="Aggregated academic session attendance overview." format="EXCEL" />
              <DownloadCard title="Leave Audit" description="Complete record of leave applications and status history." format="PDF" />
            </div>
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

function SectionHeader({ icon, title }: any) {
  return (
    <h3 className="text-lg font-black text-black flex items-center gap-3 tracking-tight">
      <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center">{icon}</div>
      {title}
    </h3>
  )
}

function PolicyItem({ title, description }: { title: string, description: string }) {
  return (
    <div className="p-6 rounded-3xl border border-zinc-50 bg-zinc-50/30 space-y-2">
      <h4 className="text-[14px] font-black text-black tracking-tight">{title}</h4>
      <p className="text-[14px] text-black font-medium leading-relaxed">{description}</p>
    </div>
  )
}

function DownloadCard({ title, description, format }: { title: string, description: string, format: string }) {
  return (
    <Card className="border-none shadow-sm rounded-[32px] bg-white p-8 flex flex-col items-center text-center space-y-6 group hover:shadow-xl transition-all duration-500">
      <div className="w-16 h-16 rounded-[24px] bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform" style={{ color: 'hsl(var(--primary))' }}>
        <FileText className="w-8 h-8" />
      </div>
      <div className="space-y-2">
        <h4 className="text-lg font-black text-black tracking-tight">{title}</h4>
        <p className="text-[14px] text-black font-medium leading-relaxed">{description}</p>
      </div>
      <Button className="w-full h-12 rounded-2xl bg-zinc-900 hover:bg-primary text-white font-black text-[10px] tracking-[0.2em] shadow-lg transition-all border-none">
        Generate {format} Report
      </Button>
    </Card>
  )
}
