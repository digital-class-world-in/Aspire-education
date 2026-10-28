
"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  User, 
  Users,
  Wallet, 
  UserCheck, 
  GraduationCap, 
  Contact, 
  Award, 
  Library,
  Printer,
  Info,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  ClipboardList,
  CreditCard,
  Video,
  MapPin,
  ShieldCheck,
  Download,
  FileText,
  History,
  TrendingUp,
  FileSearch,
  Activity
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { cn } from "@/lib/utils"
import { format, parseISO } from "date-fns"

export default function StudentProfilePage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const router = useRouter()
  const [student, setStudent] = useState<any>(null)
  const [fees, setFees] = useState<any[]>([])
  const [attendance, setAttendance] = useState<any[]>([])
  const [marksheets, setMarksheets] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("personal")

  useEffect(() => {
    if (!database) return
    
    // Resolve Student and Admin Context from Session
    const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('student_session') : null
    if (!sessionStr) {
      router.push('/student/login')
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
            const foundStudent = { ...s.val(), id: studentId }
            setStudent(foundStudent)
            
            // Fetch related data
            onValue(ref(database, `${rootPath}/fees`), (fs) => {
              const data = fs.val() || {}
              setFees(Object.values(data).filter((f: any) => f.studentId === studentId))
            })

            onValue(ref(database, `${rootPath}/attendance/Student`), (as) => {
              const data = as.val() || {}
              const logs: any[] = []
              Object.keys(data).forEach(date => {
                Object.keys(data[date]).forEach(batch => {
                  if (data[date][batch][studentId]) {
                    logs.push({ date, status: data[date][batch][studentId].status })
                  }
                })
              })
              setAttendance(logs)
            })

            onValue(ref(database, `${rootPath}/marksheets`), (ms) => {
              const data = ms.val() || {}
              setMarksheets(Object.values(data).filter((m: any) => m.studentId === studentId))
            })

            onValue(ref(database, `${rootPath}/student-documents/${studentId}`), (ds) => {
              const data = ds.val() || {}
              setDocuments(Object.values(data))
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

  const stats = useMemo(() => {
    const totalPaid = fees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0)
    const netFees = Number(student?.netFees) || 0
    const pending = Math.max(0, netFees - totalPaid)
    const totalDays = attendance.length
    const presentDays = attendance.filter(a => a.status === 'Present').length
    const attendancePercent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
    return { totalPaid, pending, attendancePercent }
  }, [student, fees, attendance])

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 animate-pulse">Syncing User Dossier...</div>
  if (!student) return (
    <div className="p-20 text-center space-y-6 max-w-md mx-auto">
      <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500 animate-bounce">
        <ShieldCheck className="w-10 h-10" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-black text-black tracking-tight">Access Locked</h3>
        <p className="text-[14px] text-black font-medium">Your enrollment record could not be synchronized with this node. Please re-authenticate to refresh your session.</p>
      </div>
      <Button onClick={() => router.push('/student/login')} className="w-full h-12 bg-primary text-white rounded-xl font-bold text-[14px] tracking-widest border-none">
        Refresh Session
      </Button>
    </div>
  )

  return (
    <main className="flex-1 p-4 md:p-8 space-y-6 md:space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-32 font-public-sans text-black text-[14px]">
      
      <Card className="border-none shadow-xl rounded-[40px] bg-white overflow-hidden p-6 md:p-10">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="flex flex-col md:flex-row items-center gap-10 lg:border-r border-zinc-100 lg:pr-12">
            <div className="relative">
              <Avatar className="h-40 w-48 rounded-[48px] border-[10px] border-zinc-50 shadow-2xl">
                <AvatarFallback className="bg-primary text-white text-5xl font-black">{student.studentName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <Badge className="absolute -bottom-2 right-4 bg-emerald-500 text-white border-4 border-white px-4 py-1.5 rounded-full text-[10px] font-black shadow-lg">Active</Badge>
            </div>
            <div className="text-center md:text-left space-y-3">
              <h2 className="text-3xl font-black text-black tracking-tight leading-none">{student.studentName}</h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <Badge variant="outline" className="rounded-lg border-zinc-100 text-black font-bold text-[10px]">ID: {student.admissionNo}</Badge>
                <Badge variant="outline" className="rounded-lg border-zinc-100 text-black font-bold text-[10px]">Roll: {student.rollNo || 'N/A'}</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-[14px] font-black text-primary tracking-widest">{student.course}</p>
                <p className="text-[11px] font-bold text-black tracking-[0.2em]">Batch: {student.batch || 'Morning'}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
            <QuickStat color="text-emerald-600" label="Fees Paid" value={`₹${stats.totalPaid.toLocaleString()}`} />
            <QuickStat color="text-rose-500" label="Outstanding" value={`₹${stats.pending.toLocaleString()}`} />
            <QuickStat color="text-indigo-600" label="Attendance" value={`${stats.attendancePercent}%`} />
            <QuickStat color="text-amber-500" label="Session" value={student.session || '2024-25'} />
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white p-2 rounded-[24px] h-auto flex-wrap justify-start gap-2 shadow-sm border border-zinc-100">
          <DashboardTabTrigger value="personal" label="Profile Overview" icon={<User className="w-4 h-4" />} />
          <DashboardTabTrigger value="academic" label="Admission Information" icon={<GraduationCap className="w-4 h-4" />} />
          <DashboardTabTrigger value="fees" label="Fees Installment Details" icon={<Wallet className="w-4 h-4" />} />
          {/* <DashboardTabTrigger value="documents" label="Digital Vault" icon={<FileText className="w-4 h-4" />} /> */}
        </TabsList>

        <TabsContent value="personal" className="mt-8">
          <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-10 space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              <section className="space-y-8">
                <SectionHeader icon={<Info className="text-primary" />} title="Personal Identity" />
                <div className="space-y-4">
                  <DetailRow label="Gender" value={student.gender} />
                  <DetailRow label="Date of Birth" value={student.dob} />
                  <DetailRow label="Religion" value={student.religion} />
                  <DetailRow label="Category" value={student.category} />
                  <DetailRow label="Aadhar No" value={student.adharNumber} />
                  <DetailRow label="Contact" value={student.mobile} />
                </div>
              </section>
              <section className="space-y-8">
                <SectionHeader icon={<Users className="text-amber-500" />} title="Parental Registry" />
                <div className="space-y-4">
                  <DetailRow label="Father Name" value={student.fatherName} />
                  <DetailRow label="Mother Name" value={student.motherName} />
                  <DetailRow label="Father Mobile" value={student.fatherMobile} />
                  <DetailRow label="Permanent Address" value={student.address} />
                </div>
              </section>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="academic" className="mt-8">
          <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-6 md:p-10 space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <SectionHeader icon={<ShieldCheck className="text-emerald-500" />} title="Institutional Mapping" />
                <div className="space-y-4">
                  <DetailRow label="Registration Date" value={student.admissionDate} />
                  <DetailRow label="Session Block" value={student.session} />
                  <DetailRow label="Academic Course" value={student.course} />
                  <DetailRow label="Assigned Batch" value={student.batch} />
                </div>
              </div>
              <div className="space-y-6">
                <SectionHeader icon={<BookOpen className="text-blue-500" />} title="Previous Records" />
                <div className="space-y-4">
                  <DetailRow label="Qualifying Exam" value={student.qualification || 'N/A'} />
                  <DetailRow label="Admission Source" value={student.source} />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="mt-8 space-y-8">
          <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
            <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
              <h3 className="text-[14px] font-black text-black tracking-widest">Installment History</h3>
              <Badge className="bg-emerald-50 text-emerald-600 border-none text-[10px]">Verified Ledger</Badge>
            </div>
            <Table>
              <TableHeader className="bg-zinc-50">
                <TableRow>
                  <TableHead className="text-[10px] font-black pl-8">Order</TableHead>
                  <TableHead className="text-[10px] font-black">Amount</TableHead>
                  <TableHead className="text-[10px] font-black">Due Date</TableHead>
                  <TableHead className="text-[10px] font-black text-right pr-8">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {student.emiSchedule ? student.emiSchedule.map((emi: any, i: number) => (
                  <TableRow key={i} className="border-zinc-50 hover:bg-zinc-50/20 transition-all">
                    <TableCell className="pl-8 text-[14px] font-bold text-black">Installment #{emi.installmentNo}</TableCell>
                    <TableCell className="text-[14px] font-black text-black">₹ {emi.amount}</TableCell>
                    <TableCell className="text-[14px] text-black font-medium font-public-sans">{emi.dueDate}</TableCell>
                    <TableCell className="text-right pr-8">
                      <Badge className={cn("rounded-md text-[9px] font-black ", emi.status === 'Paid' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                        {emi.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={4} className="h-32 text-center text-zinc-300 italic">Financial schedule not configured</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {documents.map((doc, idx) => (
              <Card key={idx} className="border border-zinc-100 shadow-sm rounded-3xl bg-white p-8 space-y-6 group hover:shadow-xl transition-all duration-500">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-black group-hover:bg-primary/10 group-hover:text-primary transition-all shadow-inner"><FileText className="w-6 h-6" /></div>
                  <Badge className="bg-emerald-50 text-emerald-600 border-none text-[9px] font-black shadow-sm">Verified</Badge>
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-black text-[14px] tracking-tight line-clamp-1">{doc.documentName}</h4>
                  <p className="text-[10px] text-black font-bold tracking-widest flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> {format(new Date(doc.uploadedDate), "PP")}</p>
                </div>
                <Button variant="outline" className="w-full rounded-2xl h-11 border-zinc-100 text-black font-black text-[10px] tracking-widest gap-2" onClick={() => window.open(doc.fileUrl, '_blank')}>
                  <Download className="w-3.5 h-3.5" /> Get Copy
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </main>
  )
}

function QuickStat({ label, value, color }: any) {
  return (
    <div className="p-5 bg-zinc-50/50 rounded-2xl border border-zinc-100/50 text-center space-y-1 group hover:bg-white hover:shadow-md transition-all">
      <p className="text-[9px] font-black text-zinc-300 tracking-widest">{label}</p>
      <p className={cn("text-xl font-black font-public-sans tracking-tighter", color)}>{value}</p>
    </div>
  )
}

function DashboardTabTrigger({ value, label, icon }: any) {
  return (
    <TabsTrigger 
      value={value} 
      className="h-11 px-6 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white text-black font-bold text-[10px] tracking-widest transition-all border border-transparent data-[state=active]:shadow-lg"
    >
      <span className="flex items-center gap-2">{icon} {label}</span>
    </TabsTrigger>
  )
}

function SectionHeader({ icon, title }: any) {
  return (
    <h3 className="text-[14px] font-black text-black flex items-center gap-3 tracking-tight border-b border-zinc-50 pb-3">
      <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center shadow-inner">{icon}</div>
      {title}
    </h3>
  )
}

function DetailRow({ label, value }: any) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-50 group">
      <span className="text-[11px] font-bold text-black tracking-widest group-hover:text-primary transition-colors">{label}</span>
      <span className="text-[14px] font-black text-black">{value || '-'}</span>
    </div>
  )
}
