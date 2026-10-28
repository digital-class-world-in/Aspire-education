
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Target, 
  ShieldCheck, 
  Clock,
  Sparkles,
  Award,
  History
} from "lucide-react"
import { 
  LineChart, 
  Line, 
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
  Legend,
  AreaChart,
  Area
} from "recharts"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { cn } from "@/lib/utils"

const COLORS = ['#1e3a8a', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function StudentPerformanceAnalyticsPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const [examResults, setExamResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!database || !user) return
    
    const instRef = ref(database, `Institutes`)
    onValue(instRef, (snap) => {
      const institutes = snap.val() || {}
      let studentId = null
      let adminUid = null

      Object.keys(institutes).forEach(id => {
        const adms = institutes[id].admissions || {}
        Object.keys(adms).forEach(aid => {
          if (adms[aid].email?.toLowerCase() === user.email?.toLowerCase()) {
            studentId = aid
            adminUid = id
          }
        })
      })

      if (studentId && adminUid) {
        onValue(ref(database, `Institutes/${adminUid}/online-exam-results/${studentId}`), (s) => {
          const data = s.val() || {}
          setExamResults(Object.values(data).sort((a: any, b: any) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()))
        })
      }
      setIsLoading(false)
    })
  }, [database, user])

  const progressData = useMemo(() => {
    return examResults.map(r => ({
      name: r.title.length > 10 ? r.title.substring(0, 8) + '...' : r.title,
      score: Number(r.percentage),
      full: 100
    }))
  }, [examResults])

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 animate-pulse">Running Neural Analytics...</div>

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-32">
      
      <Card className="border-none shadow-xl rounded-[40px] bg-white overflow-hidden p-10">
        <div className="flex items-center gap-8">
          <div className="w-20 h-20 rounded-[28px] bg-purple-50 flex items-center justify-center text-purple-600 shadow-inner">
            <Sparkles className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-black tracking-tight">Performance Analytics</h2>
            <p className="text-[10px] font-bold text-black tracking-widest">AI-Assisted Learning Insight Engine</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-8 border-none shadow-sm rounded-[32px] bg-white p-10 space-y-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-emerald-500 w-5 h-5" />
              <h3 className="text-lg font-black text-black tracking-tight">Academic Progress Trend</h3>
            </div>
            <Badge className="bg-emerald-50 text-emerald-600 border-none px-4 py-1 text-[9px] font-black">Session 2024-25</Badge>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progressData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)'}} />
                <Area type="monotone" dataKey="score" stroke="#1e3a8a" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="lg:col-span-4 space-y-8">
          <Card className="border-none shadow-sm rounded-[32px] bg-zinc-900 p-10 text-white space-y-8">
            <h4 className="text-[14px] font-black tracking-[0.2em] text-black">Subject Proficiency</h4>
            <div className="space-y-6">
              <SkillProgress label="Mathematics" value={88} color="bg-emerald-500" />
              <SkillProgress label="Science" value={92} color="bg-blue-500" />
              <SkillProgress label="Computer" value={75} color="bg-amber-500" />
              <SkillProgress label="English" value={95} color="bg-rose-500" />
            </div>
          </Card>

          <Card className="border-none shadow-sm rounded-[32px] bg-white p-10 space-y-6">
            <div className="flex items-center gap-3">
              <Target className="text-rose-500 w-5 h-5" />
              <h4 className="text-[14px] font-black tracking-tight">Top Score</h4>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black text-black tracking-tighter">
                {progressData.length > 0 ? Math.max(...progressData.map(d => d.score)) : 0}
              </span>
              <span className="text-xl font-black text-zinc-300">%</span>
            </div>
            <p className="text-[10px] font-bold text-black tracking-widest">Achieved in {examResults[examResults.length-1]?.title || 'Latest Exam'}</p>
          </Card>
        </div>
      </div>
    </main>
  )
}

function SkillProgress({ label, value, color }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-[10px] font-black tracking-widest">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
        <div className={cn("h-full transition-all duration-1000", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}
