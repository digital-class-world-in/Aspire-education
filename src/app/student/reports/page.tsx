
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  FileText, 
  Printer, 
  Download, 
  TrendingUp, 
  Calendar, 
  UserCheck, 
  Award, 
  ShieldCheck,
  History,
  PieChart,
  BarChart3,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

export default function StudentAcademicReportPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const [student, setStudent] = useState<any>(null)
  const [onlineResults, setOnlineResults] = useState<any[]>([])
  const [marksheets, setMarksheets] = useState<any[]>([])
  const [attendance, setAttendance] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!database || !user) return
    
    const instRef = ref(database, `Institutes`)
    onValue(instRef, (snap) => {
      const institutes = snap.val() || {}
      let foundStudent = null
      let adminUid = null

      Object.keys(institutes).forEach(id => {
        const adms = institutes[id].admissions || {}
        Object.keys(adms).forEach(aid => {
          if (adms[aid].email?.toLowerCase() === user.email?.toLowerCase()) {
            foundStudent = { ...adms[aid], id: aid }
            adminUid = id
          }
        })
      })

      if (foundStudent && adminUid) {
        setStudent(foundStudent)
        const rootPath = `Institutes/${adminUid}`
        
        onValue(ref(database, `${rootPath}/online-exam-results/${foundStudent.id}`), (s) => {
          const data = s.val() || {}
          setOnlineResults(Object.values(data))
        })

        onValue(ref(database, `${rootPath}/marksheets`), (s) => {
          const data = s.val() || {}
          setMarksheets(Object.values(data).filter((m: any) => m.studentId === foundStudent.id))
        })

        onValue(ref(database, `${rootPath}/attendance/Student`), (s) => {
          const data = s.val() || {}
          const logs: any[] = []
          Object.keys(data).forEach(date => {
            Object.keys(data[date]).forEach(batch => {
              if (data[date][batch][foundStudent.id]) logs.push({ date, ...data[date][batch][foundStudent.id] })
            })
          })
          setAttendance(logs)
        })
      }
      setIsLoading(false)
    })
  }, [database, user])

  const academicSummary = useMemo(() => {
    const totalWorking = attendance.length
    const totalPresent = attendance.filter(a => a.status === 'Present').length
    const attendancePercent = totalWorking > 0 ? Math.round((totalPresent / totalWorking) * 100) : 0

    const allExams = [...onlineResults, ...marksheets].sort((a, b) => new Date(b.submittedAt || b.updatedAt).getTime() - new Date(a.submittedAt || a.updatedAt).getTime())
    
    const avgScore = allExams.length > 0 
      ? Math.round(allExams.reduce((sum, e) => sum + Number(e.percentage), 0) / allExams.length)
      : 0

    return { totalWorking, totalPresent, attendancePercent, allExams, avgScore }
  }, [onlineResults, marksheets, attendance])

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 animate-pulse">Calculating Performance Ledger...</div>

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-32">
      
      <Card className="border-none shadow-xl rounded-[40px] bg-white overflow-hidden p-10">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-8">
            <div className="w-20 h-20 rounded-[28px] bg-blue-50 flex items-center justify-center text-primary shadow-inner">
              <FileText className="w-10 h-10" />
            </div>
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-3xl font-black text-black tracking-tight">Academic Report</h2>
              <p className="text-[10px] font-bold text-black tracking-widest">{student?.studentName} • Enrollment {student?.admissionNo}</p>
            </div>
          </div>
          <Button className="h-12 px-8 bg-zinc-900 text-white rounded-2xl font-black text-[10px] tracking-widest border-none active:scale-95 shadow-xl">
            <Printer className="w-4 h-4 mr-2" /> Download Report
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <MetricCard label="Attendance Percent" value={`${academicSummary.attendancePercent}%`} subLabel={`${academicSummary.totalPresent} / ${academicSummary.totalWorking} Days`} icon={<UserCheck className="text-emerald-500" />} />
        <MetricCard label="Avg. Exam Score" value={`${academicSummary.avgScore}%`} subLabel={`From ${academicSummary.allExams.length} Assessments`} icon={<BarChart3 className="text-blue-500" />} />
        <MetricCard label="Academic Status" value="Compliant" subLabel="No Pending Dues" icon={<ShieldCheck className="text-indigo-500" />} />
      </div>

      <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
        <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
          <h3 className="font-black text-black text-[10px] tracking-[0.2em]">Comprehensive Exam Ledger</h3>
          <History className="w-4 h-4 text-zinc-200" />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50">
              <TableRow>
                <TableHead className="pl-8 text-[10px] font-black h-14">Examination</TableHead>
                <TableHead className="text-[10px] font-black">Format</TableHead>
                <TableHead className="text-[10px] font-black text-center">Score</TableHead>
                <TableHead className="text-[10px] font-black text-center">Percentage</TableHead>
                <TableHead className="text-right pr-8 text-[10px] font-black">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {academicSummary.allExams.map((exam, i) => (
                <TableRow key={i} className="border-zinc-50 hover:bg-zinc-50/30 transition-all">
                  <TableCell className="pl-8 py-6">
                    <div className="space-y-1">
                      <p className="text-[14px] font-bold text-black">{exam.title || exam.examName}</p>
                      <p className="text-[10px] font-bold text-black tracking-tighter">{format(new Date(exam.submittedAt || exam.updatedAt), "PP")}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-md border-zinc-100 text-black font-black text-[9px]">
                      {exam.examId ? "Digital" : "Paper-Based"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-black text-black">{exam.obtainedMarks || exam.totalObtained} / {exam.totalMarks || exam.totalMaxMarks}</TableCell>
                  <TableCell className="text-center">
                    <span className={cn("text-[14px] font-black", Number(exam.percentage) >= 75 ? "text-emerald-600" : "text-black")}>{exam.percentage}%</span>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <Badge className={cn(
                      "rounded-lg px-2.5 py-1 text-[9px] font-black  border-none shadow-none",
                      exam.status === 'Pass' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                      {exam.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {academicSummary.allExams.length === 0 && (
                <TableRow><TableCell colSpan={5} className="h-48 text-center text-zinc-300 italic">No academic data found in registry</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </main>
  )
}

function MetricCard({ label, value, subLabel, icon }: any) {
  return (
    <Card className="border-none shadow-sm rounded-[32px] bg-white p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center shadow-inner">{icon}</div>
        <p className="text-[9px] font-black text-zinc-300 tracking-widest">{label}</p>
      </div>
      <div className="space-y-1">
        <h4 className="text-3xl font-black text-black tracking-tight">{value}</h4>
        <p className="text-[10px] font-bold text-black tracking-widest">{subLabel}</p>
      </div>
    </Card>
  )
}
