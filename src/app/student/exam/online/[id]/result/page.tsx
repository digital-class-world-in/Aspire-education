"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Award, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Download, 
  TrendingUp,
  PieChart,
  Target,
  LayoutDashboard,
  ShieldCheck
} from "lucide-react"
import { useFirebase } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts"

export default function ExamResultPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { database } = useFirebase()

  const [result, setResult] = useState<any>(null)
  const [exam, setExam] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!database || !id) return
    
    // INSTANT RESOLUTION: Direct session access for high performance
    const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('student_session') : null
    const session = sessionStr ? JSON.parse(sessionStr) : null
    
    if (!session?.adminUid || !session?.studentId) {
      setIsLoading(false)
      return
    }

    const currentAdminUid = session.adminUid
    const currentStudentId = session.studentId

    // Direct path lookup avoids scanning the entire database
    const resultRef = ref(database, `Institutes/${currentAdminUid}/online-exam-results/${currentStudentId}/${id}`)
    const unsubResult = onValue(resultRef, (s) => {
      if (s.exists()) {
        setResult(s.val())
      }
    })

    const examRef = ref(database, `Institutes/${currentAdminUid}/online-exams/${id}`)
    const unsubExam = onValue(examRef, (s) => {
      if (s.exists()) {
        setExam(s.val())
      }
      setIsLoading(false)
    })

    return () => {
      off(resultRef)
      off(examRef)
    }
  }, [database, id])

  const stats = useMemo(() => {
    if (!result) return null
    const correct = result.analysis.filter((a: any) => a.isCorrect).length
    const wrong = result.analysis.filter((a: any) => !a.isCorrect && a.selectedAnswer !== "").length
    const unattempted = result.analysis.filter((a: any) => a.selectedAnswer === "").length
    return { correct, wrong, unattempted }
  }, [result])

  const chartData = useMemo(() => {
    if (!stats) return []
    return [
      { name: 'Correct', value: stats.correct, color: '#10b981' },
      { name: 'Wrong', value: stats.wrong, color: '#ef4444' },
      { name: 'Skipped', value: stats.unattempted, color: '#94a3b8' }
    ]
  }, [stats])

  if (isLoading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="flex flex-col items-center gap-6"><div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" /><p className="text-[14px] font-black text-zinc-300 tracking-[0.3em]">ANALYZING SCORECARD...</p></div></div>
  if (!result) return <div className="p-20 text-center text-black font-bold">Result Record Missing</div>

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-32 font-public-sans text-black">
      
      <Card className="border-none shadow-2xl rounded-[40px] bg-white overflow-hidden p-12">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-12">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className={cn("w-28 h-28 rounded-[36px] flex items-center justify-center shadow-xl", result.status === 'Pass' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
              <Award className="w-14 h-14" />
            </div>
            <div className="text-center md:text-left space-y-3">
              <h2 className="text-4xl font-black text-black tracking-tight leading-none">{result.title}</h2>
              <div className="flex items-center justify-center md:justify-start gap-3">
                <Badge className={cn("rounded-full px-6 py-1.5 text-[11px] font-black  border-none", result.status === 'Pass' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-900/20" : "bg-rose-500 text-white shadow-lg shadow-rose-900/20")}>{result.status}</Badge>
                <span className="text-[11px] font-bold text-black tracking-widest">Grade: {result.percentage >= 90 ? 'A+' : result.percentage >= 80 ? 'A' : 'B'}</span>
              </div>
              <p className="text-[11px] font-black text-zinc-300 tracking-[0.3em]">Completed on {format(new Date(result.submittedAt), "PPP")}</p>
            </div>
          </div>
          <div className="flex flex-col items-center lg:items-end gap-2">
            <p className="text-[10px] font-black text-black tracking-widest">Aggregate Percentage</p>
            <div className="flex items-baseline gap-1"><span className={cn("text-6xl font-black tracking-tighter", result.status === 'Pass' ? "text-emerald-600" : "text-rose-600")}>{result.percentage}</span><span className="text-3xl font-black text-zinc-300">%</span></div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[32px] border border-zinc-100 space-y-4 shadow-sm"><div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500"><Target className="w-5 h-5" /></div><div><p className="text-[10px] font-black text-black tracking-widest">Obtained Marks</p><h4 className="text-2xl font-black text-black">{result.obtainedMarks} / {result.totalMarks}</h4></div></div>
        <div className="bg-white p-8 rounded-[32px] border border-zinc-100 space-y-4 shadow-sm"><div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500"><CheckCircle2 className="w-5 h-5" /></div><div><p className="text-[10px] font-black text-black tracking-widest">Correct Answers</p><h4 className="text-2xl font-black text-black">{stats?.correct}</h4></div></div>
        <div className="bg-white p-8 rounded-[32px] border border-zinc-100 space-y-4 shadow-sm"><div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500"><XCircle className="w-5 h-5" /></div><div><p className="text-[10px] font-black text-black tracking-widest">Incorrect Items</p><h4 className="text-2xl font-black text-black">{stats?.wrong}</h4></div></div>
        <div className="bg-white p-8 rounded-[32px] border border-zinc-100 space-y-4 shadow-sm"><div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500"><TrendingUp className="w-5 h-5" /></div><div><p className="text-[10px] font-black text-black tracking-widest">Response Ratio</p><h4 className="text-2xl font-black text-black">{result.analysis.filter((a:any)=>a.selectedAnswer!=="").length} / {result.analysis.length}</h4></div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-7 border-none shadow-sm rounded-[32px] bg-white p-10 space-y-8">
          <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center text-[#1e3a8a]"><PieChart className="w-5 h-5" /></div><h3 className="text-[14px] font-black text-black tracking-tight">Accuracy Breakdown</h3></div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} width={80} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={32}>
                  {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-5 border-none shadow-sm rounded-[32px] bg-zinc-900 p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5"><ShieldCheck className="w-48 h-48" /></div>
          <div className="space-y-6 relative z-10">
            <Badge className="bg-white/10 text-white border-none text-[9px] font-black tracking-widest px-3">Verification ID: {id.substring(0,8)}</Badge>
            <h3 className="text-2xl font-black tracking-tight">Institutional Transcript</h3>
            <p className="text-[14px] text-black font-medium leading-relaxed italic">"This document serves as an official academic record of your performance in the digital assessment platform."</p>
          </div>
          <div className="space-y-4 pt-10 relative z-10">
            <Button className="w-full h-14 bg-primary text-white rounded-2xl font-black text-[10px] tracking-widest shadow-xl border-none active:scale-95 transition-all"><Download className="w-4 h-4 mr-3" /> Download Result PDF</Button>
            <Button variant="ghost" onClick={() => router.push('/student/exam/online')} className="w-full h-12 text-black font-black text-[10px] tracking-widest transition-all"><LayoutDashboard className="w-4 h-4 mr-3" /> Return to Portal</Button>
          </div>
        </Card>
      </div>

      <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
        <div className="p-10 border-b border-zinc-50 flex items-center justify-between"><h3 className="text-[14px] font-black text-black tracking-[0.2em]">Review Answers</h3><FileText className="w-5 h-5 text-zinc-200" /></div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50">
              <TableRow>
                <TableHead className="pl-10 text-[10px] font-black h-14">Q.No</TableHead>
                <TableHead className="text-[10px] font-black">Question Text</TableHead>
                <TableHead className="text-[10px] font-black">Your Choice</TableHead>
                <TableHead className="text-[10px] font-black">Correct Key</TableHead>
                <TableHead className="text-right pr-10 text-[10px] font-black">Outcome</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exam?.questions.map((q: any, i: number) => {
                const analysis = result.analysis.find((a: any) => a.questionId === q.id)
                return (
                  <TableRow key={i} className="border-zinc-50 group hover:bg-zinc-50/30 transition-all">
                    <TableCell className="pl-10 font-black text-black">{i + 1}</TableCell>
                    <TableCell className="max-w-md font-bold text-black py-6 leading-relaxed">{q.text}</TableCell>
                    <TableCell className="text-[14px] font-bold text-black">{analysis?.selectedAnswer || <span className="text-zinc-300 italic font-normal lowercase">Not Attempted</span>}</TableCell>
                    <TableCell className="text-[14px] font-black text-emerald-600">{q.correctAnswer}</TableCell>
                    <TableCell className="text-right pr-10">
                      <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-lg font-black text-[9px] ", analysis?.isCorrect ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                        {analysis?.isCorrect ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} {analysis?.isCorrect ? 'Correct' : 'Incorrect'}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </main>
  )
}
