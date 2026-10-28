
"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  FileText, 
  Clock, 
  Calendar, 
  ChevronRight, 
  AlertCircle,
  CheckCircle2,
  Timer,
  BookOpen,
  ClipboardList,
  Award,
  History
} from "lucide-react"
import { useFirebase } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { cn } from "@/lib/utils"
import { format, isAfter, isBefore, parseISO, differenceInSeconds } from "date-fns"

export default function StudentOnlineExamListPage() {
  const router = useRouter()
  const { database } = useFirebase()
  const { resolvedId, staffId: studentId, isLoading: idLoading } = useResolvedId()
  
  const [student, setStudent] = useState<any>(null)
  const [exams, setExams] = useState<any[]>([])
  const [results, setResults] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('student_session') : null
    const session = sessionStr ? JSON.parse(sessionStr) : null
    const currentResolvedId = resolvedId || session?.adminUid
    const currentStudentId = studentId || session?.studentId

    if (!database || !currentResolvedId || !currentStudentId) {
      if (!idLoading && !currentStudentId) setIsLoading(false)
      return
    }

    const rootPath = `Institutes/${currentResolvedId}`
    
    const studentRef = ref(database, `${rootPath}/admissions/${currentStudentId}`)
    onValue(studentRef, (snapshot) => {
      if (snapshot.exists()) {
        setStudent({ ...snapshot.val(), id: currentStudentId })
      }
    }, { onlyOnce: true })

    const examsRef = ref(database, `${rootPath}/online-exams`)
    onValue(examsRef, (s) => {
      const data = s.val() || {}
      const list = Object.keys(data).map(k => ({ ...data[k], id: k }))
      const assigned = list.filter(e => e.assignedStudents && e.assignedStudents[currentStudentId])
      setExams(assigned)
      setIsLoading(false)
    })

    onValue(ref(database, `${rootPath}/online-exam-results/${currentStudentId}`), (s) => {
      setResults(s.val() || {})
    })

    return () => {
      off(studentRef)
      off(examsRef)
    }
  }, [database, resolvedId, studentId, idLoading])

  const getCountdown = (startTime: Date) => {
    const diff = differenceInSeconds(startTime, currentTime)
    if (diff <= 0) return null
    const h = Math.floor(diff / 3600)
    const m = Math.floor((diff % 3600) / 60)
    const s = diff % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  if (isLoading || idLoading) return <div className="p-20 text-center font-black text-zinc-300 tracking-[0.3em] animate-pulse">Scanning Assessment Registry...</div>

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-32">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 px-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-black tracking-tight font-public-sans">Digital Examinations</h2>
          <p className="text-[14px] text-black font-medium tracking-widest">Assigned virtual evaluations for your session</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl border border-zinc-100 shadow-sm flex items-center gap-4">
          <Clock className="w-5 h-5 text-primary" />
          <div className="text-right">
            <p className="text-[10px] font-black text-black tracking-widest">Server Protocol Sync</p>
            <p className="text-[14px] font-black text-black font-public-sans">{format(currentTime, "hh:mm:ss a")}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {exams.map((exam) => {
          const result = results[exam.id]
          const startTime = new Date(`${exam.startDate}T${exam.time}`)
          const isUpcoming = isBefore(currentTime, startTime)
          const durationMin = (Number(exam.durationHours) * 60) + Number(exam.durationMinutes)
          const endTime = new Date(startTime.getTime() + durationMin * 60000)
          const isExpired = isAfter(currentTime, endTime)
          const isLive = !isUpcoming && !isExpired
          const countdown = getCountdown(startTime)

          return (
            <Card key={exam.id} className={cn(
              "border-none shadow-xl rounded-[32px] bg-white overflow-hidden group hover:shadow-2xl transition-all duration-500 relative",
              result && "opacity-80"
            )}>
              <div className={cn(
                "h-2 w-full",
                result ? "bg-emerald-500" : isLive ? "bg-rose-500 animate-pulse" : "bg-[#1e3a8a]"
              )} />
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="text-lg font-black text-black tracking-tight leading-tight">{exam.title}</h4>
                    <p className="text-[10px] font-bold text-black tracking-widest">{exam.class} • {exam.section}</p>
                  </div>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner",
                    result ? "bg-emerald-50 text-emerald-600" : "bg-zinc-50 text-[#1e3a8a]"
                  )}>
                    {result ? <CheckCircle2 className="w-5 h-5" /> : <ClipboardList className="w-5 h-5" />}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <ExamMeta icon={<Calendar className="w-3 h-3" />} label="Date" value={exam.startDate} />
                  <ExamMeta icon={<Timer className="w-3 h-3" />} label="Duration" value={`${exam.durationHours}h ${exam.durationMinutes}m`} />
                  <ExamMeta icon={<BookOpen className="w-3 h-3" />} label="Questions" value={exam.questions?.length || 0} />
                  <ExamMeta icon={<Award className="w-3 h-3" />} label="Pass %" value={`${exam.passingPercentage}%`} />
                </div>

                {result ? (
                  <div className="pt-4 space-y-4">
                    <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-emerald-700 tracking-widest">Your Score</p>
                        <p className="text-lg font-black text-emerald-600">{result.obtainedMarks} / {result.totalMarks}</p>
                      </div>
                      <Badge className="bg-emerald-500 text-white border-none">{result.status}</Badge>
                    </div>
                    <Button 
                      onClick={() => router.push(`/student/exam/online/${exam.id}/result`)}
                      variant="outline" 
                      className="w-full h-12 rounded-2xl border-zinc-100 text-black font-black text-[10px] tracking-widest hover:bg-zinc-50 transition-all"
                    >
                      Performance Matrix
                    </Button>
                  </div>
                ) : isExpired ? (
                  <div className="pt-4">
                    <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 flex items-center gap-3 text-rose-600">
                      <AlertCircle className="w-4 h-4" />
                      <p className="text-[10px] font-black tracking-widest">Session Expired</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {isUpcoming && countdown && (
                      <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-center justify-between text-amber-700">
                        <span className="text-[10px] font-black tracking-widest flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Releasing In</span>
                        <span className="text-[14px] font-black font-public-sans">{countdown}</span>
                      </div>
                    )}
                    <Button 
                      disabled={isUpcoming}
                      onClick={() => router.push(`/student/exam/online/${exam.id}/take`)}
                      className={cn(
                        "w-full h-14 rounded-2xl font-black  text-[14px] tracking-[0.2em] shadow-xl transition-all active:scale-95 border-none",
                        isLive ? "bg-[#1e3a8a] text-white shadow-blue-900/20" : "bg-zinc-100 text-black"
                      )}
                    >
                      {isUpcoming ? "Locked" : "Enter Examination"} <ChevronRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )
        })}

        {exams.length === 0 && (
          <div className="col-span-full py-24 text-center space-y-6 bg-white rounded-[40px] border-2 border-dashed border-zinc-100">
            <div className="w-20 h-20 bg-zinc-50 rounded-[28px] flex items-center justify-center mx-auto text-zinc-200">
              <History className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-black tracking-tight">No Exams Assigned</h3>
              <p className="text-[14px] text-black max-w-xs mx-auto font-medium tracking-widest leading-relaxed">Assigned examinations will appear here once published by your administrator.</p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function ExamMeta({ icon, label, value }: { icon: any, label: string, value: string | number }) {
  return (
    <div className="bg-zinc-50/50 p-3 rounded-xl border border-zinc-100/50 group-hover:bg-white transition-colors">
      <div className="flex items-center gap-2 mb-1">
        <div className="text-zinc-300">{icon}</div>
        <span className="text-[8px] font-black text-black tracking-widest">{label}</span>
      </div>
      <p className="text-[14px] font-black text-black">{value}</p>
    </div>
  )
}
