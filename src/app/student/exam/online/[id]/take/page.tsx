
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Timer, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2,
  X,
  Loader2,
  Monitor,
  ShieldCheck,
  Clock,
  GraduationCap,
  Lock
} from "lucide-react"
import { useFirebase } from "@/firebase"
import { ref, onValue, set, off } from "firebase/database"
import { cn } from "@/lib/utils"
import { addMinutes, differenceInSeconds, isAfter, isBefore } from "date-fns"
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function TakeExamPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { database } = useFirebase()

  const [student, setStudent] = useState<any>(null)
  const [adminUid, setAdminUid] = useState<string | null>(null)
  const [exam, setExam] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRulesAccepted, setIsRulesAccepted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Time States
  const [currentTime, setCurrentTime] = useState(new Date())
  const [timeLeft, setTimeLeft] = useState<number>(0) 
  const [waitSeconds, setWaitSeconds] = useState<number>(0)

  // Exam Logic State
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  
  // Inactivity Logic State
  const [lastActivity, setLastActivity] = useState(Date.now())
  const INACTIVITY_LIMIT = 10 * 60 * 1000 

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const answersRef = useRef<Record<string, string>>({})
  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  const handleSubmitExam = useCallback(async () => {
    if (!database || !adminUid || !student || !exam || isSubmitting) return
    setIsSubmitting(true)

    let obtainedMarks = 0
    const totalMarks = exam.questions.reduce((sum: number, q: any) => sum + (q.marks || 0), 0)
    const analysis = exam.questions.map((q: any) => {
      const selected = answersRef.current[q.id] || ""
      const isCorrect = selected === q.correctAnswer
      if (isCorrect) obtainedMarks += (q.marks || 0)
      return {
        questionId: q.id,
        selectedAnswer: selected,
        correctAnswer: q.correctAnswer,
        isCorrect,
        marks: q.marks
      }
    })

    const percentage = ((obtainedMarks / totalMarks) * 100).toFixed(2)
    const status = Number(percentage) >= (Number(exam.passingPercentage) || 33) ? 'Pass' : 'Fail'

    const resultData = {
      examId: id,
      title: exam.title,
      totalMarks,
      obtainedMarks,
      percentage,
      status,
      analysis,
      submittedAt: new Date().toISOString(),
      studentName: student.studentName,
      admissionNo: student.admissionNo
    }

    try {
      await set(ref(database, `Institutes/${adminUid}/online-exam-results/${student.id}/${id}`), resultData)
      toast({ title: "Session Closed", description: "Assessment responses synchronized." })
      router.push(`/student/exam/online/${id}/result`)
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Cloud sync failed." })
    } finally {
      setIsSubmitting(false)
    }
  }, [database, adminUid, student, exam, isSubmitting, id, router])

  useEffect(() => {
    if (!database || !id) return
    
    const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('student_session') : null
    const session = sessionStr ? JSON.parse(sessionStr) : null
    
    if (!session?.adminUid || !session?.studentId) {
      setIsLoading(false)
      return
    }

    const currentAdminUid = session.adminUid
    const currentStudentId = session.studentId
    setAdminUid(currentAdminUid)
    
    const studentRef = ref(database, `Institutes/${currentAdminUid}/admissions/${currentStudentId}`)
    onValue(studentRef, (s) => {
      if (s.exists()) setStudent({ ...s.val(), id: currentStudentId })
    }, { onlyOnce: true })

    const examRef = ref(database, `Institutes/${currentAdminUid}/online-exams/${id}`)
    onValue(examRef, (s) => {
      if (s.exists()) {
        const data = s.val()
        if (!data.assignedStudents?.[currentStudentId]) {
          router.push('/student/exam/online')
          return
        }
        setExam(data)
        
        const startTime = new Date(`${data.startDate}T${data.time}`)
        const durationMin = (Number(data.durationHours) * 60) + Number(data.durationMinutes)
        const endTime = addMinutes(startTime, durationMin)
        const now = new Date()

        if (isAfter(now, endTime)) {
          router.push('/student/exam/online')
          return
        }

        if (isBefore(now, startTime)) {
          setWaitSeconds(differenceInSeconds(startTime, now))
        } else {
          setWaitSeconds(0)
          setTimeLeft(differenceInSeconds(endTime, now))
        }
        setIsLoading(false)
      } else {
        setIsLoading(false)
      }
    })

    return () => {
      off(studentRef)
      off(examRef)
    }
  }, [database, id, router])

  // Countdown Wait Logic
  useEffect(() => {
    if (waitSeconds <= 0) return
    const timer = setInterval(() => {
      setWaitSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [waitSeconds])

  // Exam Timer Logic
  useEffect(() => {
    if (!isRulesAccepted || timeLeft <= 0 || isSubmitting) return
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmitExam()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isRulesAccepted, timeLeft, isSubmitting, handleSubmitExam])

  // Inactivity Detection
  useEffect(() => {
    if (!isRulesAccepted || isSubmitting) return
    const handleUserActivity = () => setLastActivity(Date.now())
    window.addEventListener("mousemove", handleUserActivity)
    window.addEventListener("keypress", handleUserActivity)
    window.addEventListener("click", handleUserActivity)
    const inactivityCheck = setInterval(() => {
      const inactiveTime = Date.now() - lastActivity
      if (inactiveTime >= INACTIVITY_LIMIT) {
        clearInterval(inactivityCheck)
        handleSubmitExam()
      }
    }, 10000)
    return () => {
      window.removeEventListener("mousemove", handleUserActivity)
      window.removeEventListener("keypress", handleUserActivity)
      window.removeEventListener("click", handleUserActivity)
      clearInterval(inactivityCheck)
    }
  }, [isRulesAccepted, lastActivity, isSubmitting, handleSubmitExam])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center font-public-sans">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-[14px] font-black text-zinc-300 tracking-[0.3em] animate-pulse">ESTABLISHING SECURE SESSION...</p>
        </div>
      </div>
    )
  }

  // Pre-Start Countdown Screen
  if (waitSeconds > 0) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-none shadow-2xl rounded-[40px] bg-white overflow-hidden p-12 text-center space-y-10">
          <div className="w-24 h-24 rounded-[32px] bg-amber-50 flex items-center justify-center text-amber-500 mx-auto shadow-inner">
            <Lock className="w-12 h-12" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-black text-black tracking-tight">Access Locked</h2>
            <p className="text-[14px] text-black font-medium leading-relaxed tracking-widest">The assessment node will activate automatically in</p>
          </div>
          <div className="bg-zinc-900 rounded-[32px] p-8">
            <p className="text-4xl font-black text-white font-public-sans tracking-tighter">{formatTime(waitSeconds)}</p>
          </div>
          <div className="pt-6 border-t border-zinc-50">
            <p className="text-[10px] font-black text-zinc-300 tracking-[0.3em]">Authorized Entry Pending</p>
          </div>
        </Card>
      </div>
    )
  }

  const currentQ = exam?.questions[currentQuestionIdx]

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-public-sans flex flex-col text-black selection:bg-primary/20">
      <Dialog open={!isRulesAccepted} onOpenChange={() => {}}>
        <DialogContent className="max-w-2xl p-0 border-none rounded-[40px] overflow-hidden bg-white shadow-2xl">
          <div className="bg-[#1e3a8a] p-10 text-white relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
            <div className="space-y-4">
              <Badge className="bg-white/10 text-white border-none text-[9px] font-black tracking-widest px-3">Protocol V2.0</Badge>
              <DialogTitle className="text-3xl font-black tracking-tight">{exam?.title}</DialogTitle>
              <p className="text-blue-200 text-[14px] font-medium">Verify your environment before initiating the node.</p>
            </div>
          </div>
          <div className="p-10 space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center space-y-1"><p className="text-[9px] font-black text-zinc-300 tracking-widest">Total Items</p><p className="text-lg font-black text-black leading-none">{exam?.questions?.length}</p></div>
              <div className="text-center space-y-1"><p className="text-[9px] font-black text-zinc-300 tracking-widest">Agg. Marks</p><p className="text-lg font-black text-black leading-none">{exam?.questions?.reduce((s:any,q:any)=>s+(q.marks||0),0)}</p></div>
              <div className="text-center space-y-1"><p className="text-[9px] font-black text-zinc-300 tracking-widest">Window</p><p className="text-lg font-black text-black leading-none">{exam?.durationHours}h {exam?.durationMinutes}m</p></div>
              <div className="text-center space-y-1"><p className="text-[9px] font-black text-zinc-300 tracking-widest">Min. Score</p><p className="text-lg font-black text-black leading-none">{exam?.passingPercentage}%</p></div>
            </div>
            <div className="space-y-4 bg-zinc-50 p-8 rounded-[32px] border border-zinc-100">
              <h4 className="text-[10px] font-black text-black tracking-[0.2em] flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Active Proctoring:</h4>
              <ul className="space-y-3 text-[14px] text-black font-bold tracking-tight list-none">
                <li className="flex gap-2"><ChevronRight className="w-3 h-3 text-primary shrink-0" /> Browser refresh is prohibited.</li>
                <li className="flex gap-2 text-rose-500"><ChevronRight className="w-3 h-3 shrink-0" /> 10 minutes of inactivity triggers auto-exit.</li>
                <li className="flex gap-2"><ChevronRight className="w-3 h-3 text-primary shrink-0" /> Ensure a persistent cloud connection.</li>
              </ul>
            </div>
            <Button onClick={() => { setLastActivity(Date.now()); setIsRulesAccepted(true); }} className="w-full h-16 bg-zinc-900 hover:bg-black text-white rounded-3xl font-black text-[14px] tracking-[0.2em] shadow-xl transition-all border-none">Initialize Assessment Node</Button>
          </div>
        </DialogContent>
      </Dialog>

      {isRulesAccepted && exam && (
        <>
          <header className="h-24 bg-white border-b border-zinc-100 px-8 flex items-center justify-between sticky top-0 z-50">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#1e3a8a] shadow-inner"><Monitor className="w-6 h-6" /></div>
              <div>
                <h3 className="text-xl font-black text-black tracking-tight leading-none">{exam.title}</h3>
                <p className="text-[9px] font-bold text-black tracking-widest mt-1">Authorized Candidate: {student?.studentName}</p>
              </div>
            </div>
            <div className={cn("flex items-center gap-4 px-8 py-3 rounded-2xl border transition-all", timeLeft < 300 ? "bg-rose-50 border-rose-100 text-rose-600 animate-pulse" : "bg-zinc-900 border-zinc-800 text-white")}>
              <Clock className="w-5 h-5" /><div className="text-right"><p className="text-[9px] font-black tracking-widest opacity-50">Time Remaining</p><p className="text-xl font-black font-public-sans leading-none">{formatTime(timeLeft)}</p></div>
            </div>
          </header>

          <main className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-12 gap-10 max-w-7xl mx-auto w-full pb-32">
            <div className="lg:col-span-8 space-y-8">
              <Card className="border-none shadow-xl rounded-[40px] bg-white p-12 min-h-[550px] flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none"><GraduationCap className="w-48 h-48 text-primary" /></div>
                <div className="flex justify-between items-center mb-12 relative z-10"><Badge className="bg-blue-50 text-[#1e3a8a] border-none font-black text-[10px] px-4 py-1.5 rounded-full">Item {currentQuestionIdx + 1} of {exam.questions.length}</Badge><span className="text-[10px] font-black text-zinc-300 tracking-widest">Weightage: {currentQ?.marks || 1} Points</span></div>
                <div className="flex-1 space-y-12 relative z-10">
                  <h2 className="text-2xl font-black text-black leading-tight tracking-tight">{currentQ?.text}</h2>
                  <div className="grid grid-cols-1 gap-4">
                    {currentQ?.options.map((opt: string, idx: number) => {
                      const isSelected = answers[currentQ.id] === `Option ${idx + 1}`
                      return (
                        <button key={idx} onClick={() => setAnswers({ ...answers, [currentQ.id]: `Option ${idx + 1}` })} className={cn("w-full p-6 rounded-[24px] border-2 text-left flex items-center gap-5 transition-all group active:scale-[0.98]", isSelected ? "bg-blue-50 border-[#1e3a8a] text-[#1e3a8a] shadow-xl shadow-blue-900/5" : "bg-white border-zinc-50 text-black hover:border-zinc-200")}>
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black text-[14px] transition-all", isSelected ? "bg-[#1e3a8a] text-white shadow-lg" : "bg-zinc-50 text-zinc-300 group-hover:bg-zinc-100")}>{String.fromCharCode(65 + idx)}</div>
                          <span className="text-[14px] font-bold">{opt}</span>
                          {isSelected && <CheckCircle2 className="ml-auto w-6 h-6 text-[#1e3a8a]" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="pt-12 mt-12 border-t border-zinc-50 flex justify-between items-center relative z-10">
                  <Button variant="ghost" disabled={currentQuestionIdx === 0} onClick={() => setCurrentQuestionIdx(prev => prev - 1)} className="h-12 px-8 rounded-2xl font-black text-[10px] tracking-widest gap-2 text-black hover:text-black hover:bg-zinc-50"><ChevronLeft className="w-4 h-4" /> Previous</Button>
                  {currentQuestionIdx === exam.questions.length - 1 ? (
                    <Button onClick={handleSubmitExam} disabled={isSubmitting} className="bg-emerald-500 hover:bg-emerald-600 text-white h-14 px-12 rounded-2xl font-black text-[10px] tracking-widest shadow-xl shadow-emerald-900/20 border-none transition-all">{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finalize & Submit Node"}</Button>
                  ) : (
                    <Button onClick={() => setCurrentQuestionIdx(prev => prev + 1)} className="bg-[#1e3a8a] hover:bg-[#162e6a] text-white h-14 px-12 rounded-2xl font-black text-[10px] tracking-widest shadow-xl shadow-blue-900/20 border-none transition-all">Proceed to Next <ChevronRight className="w-4 h-4 ml-2" /></Button>
                  )}
                </div>
              </Card>
            </div>
            <div className="lg:col-span-4">
              <Card className="border-none shadow-sm rounded-[40px] bg-white p-10 h-fit sticky top-32">
                <h4 className="text-[10px] font-black text-black tracking-[0.3em] mb-10 border-b border-zinc-50 pb-4">Assessment Matrix</h4>
                <div className="grid grid-cols-5 gap-3">
                  {exam.questions.map((q: any, idx: number) => {
                    const isAnswered = !!answers[q.id]; const isCurrent = currentQuestionIdx === idx
                    return (
                      <button key={idx} onClick={() => setCurrentQuestionIdx(idx)} className={cn("w-full aspect-square rounded-xl flex items-center justify-center text-[11px] font-black transition-all border-2", isCurrent ? "border-[#1e3a8a] bg-[#1e3a8a] text-white scale-110 shadow-lg" : isAnswered ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-zinc-50 border-transparent text-zinc-300 hover:border-zinc-200")}>{idx + 1}</button>
                    )
                  })}
                </div>
                <div className="mt-12 pt-10 border-t border-zinc-50 space-y-5">
                  <div className="flex items-center gap-4"><div className="w-3 h-3 rounded-full shadow-inner bg-[#1e3a8a]" /><span className="text-[9px] font-black text-black tracking-widest">Currently Processing</span></div>
                  <div className="flex items-center gap-4"><div className="w-3 h-3 rounded-full shadow-inner bg-emerald-500" /><span className="text-[9px] font-black text-black tracking-widest">Response Captured</span></div>
                  <div className="flex items-center gap-4"><div className="w-3 h-3 rounded-full shadow-inner bg-zinc-100" /><span className="text-[9px] font-black text-black tracking-widest">Pending Response</span></div>
                </div>
              </Card>
            </div>
          </main>
        </>
      )}
    </div>
  )
}
