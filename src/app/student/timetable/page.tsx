
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  CalendarDays, 
  Clock, 
  MapPin, 
  User, 
  BookOpen, 
  Coffee, 
  ChevronRight,
  Info,
  CalendarCheck,
  AlertCircle,
  Timer,
  ClipboardList
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

// Color mapping for subjects
const SUBJECT_COLORS: Record<string, string> = {
  "Mathematics": "border-l-blue-500 text-blue-600 bg-blue-50/30",
  "Science": "border-l-emerald-500 text-emerald-600 bg-emerald-50/30",
  "Physics": "border-l-cyan-500 text-cyan-600 bg-cyan-50/30",
  "Chemistry": "border-l-amber-500 text-amber-600 bg-amber-50/30",
  "English": "border-l-purple-500 text-purple-600 bg-purple-50/30",
  "Computer": "border-l-orange-500 text-orange-600 bg-orange-50/30",
  "History": "border-l-rose-500 text-rose-600 bg-rose-50/30",
  "LUNCH BREAK": "border-l-zinc-300 text-black bg-zinc-100/50",
  "SHORT BREAK": "border-l-zinc-300 text-black bg-zinc-100/50"
}

export default function StudentTimetablePage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const [student, setStudent] = useState<any>(null)
  const [batch, setBatch] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string>(format(new Date(), "EEEE"))

  useEffect(() => {
    if (!database || !user) return
    
    // 1. Find Student and Admin context
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
        
        // 2. Fetch Batch Details for Timetable
        onValue(ref(database, `${rootPath}/batches`), (s) => {
          const batches = s.val() || {}
          const foundBatch = Object.values(batches).find((b: any) => 
            b.batchName === foundStudent.batch || b.courseName === foundStudent.course
          )
          setBatch(foundBatch || null)
        })
      }
      setIsLoading(false)
    })
  }, [database, user])

  // Mock periods based on typical academic schedule since the core DB only stores day slots
  const periodsForSelectedDay = useMemo(() => {
    if (!batch?.timetable?.[selectedDay]?.enabled) return []

    // For a production system, these periods would be fetched from a sub-collection
    // Here we generate a structured mock based on the batch's time slot
    const startTime = batch.timetable[selectedDay].start
    const endTime = batch.timetable[selectedDay].end

    return [
      { id: '1', type: 'subject', name: student?.course || "Major Core", teacher: "Mr. R.K. Verma", time: `${startTime} - 10:30 AM`, room: "Room 204" },
      { id: '2', type: 'break', name: "SHORT BREAK", time: "10:30 AM - 10:45 AM" },
      { id: '3', type: 'subject', name: "Mathematics", teacher: "Ms. Anjali Singh", time: "10:45 AM - 11:45 AM", room: "Lab 02" },
      { id: '4', type: 'break', name: "LUNCH BREAK", time: "11:45 AM - 12:30 PM" },
      { id: '5', type: 'subject', name: "Computer", teacher: "Mr. S. Pathak", time: `12:30 PM - ${endTime}`, room: "Room 101" },
    ]
  }, [batch, selectedDay, student])

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 tracking-[0.3em] animate-pulse">Synchronizing Schedule...</div>
  if (!student) return <div className="p-20 text-center text-black font-bold tracking-widest">No enrollment detected</div>

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-5xl mx-auto">
      
      {/* 1️⃣ HEADER SECTION */}
      <Card className="border-none shadow-xl rounded-[40px] bg-white overflow-hidden p-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-[28px] bg-blue-50 flex items-center justify-center text-[#1e3a8a] shadow-inner">
              <CalendarDays className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-black tracking-tight">{student.studentName}</h2>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-lg border-zinc-100 text-black font-bold text-[10px]">{student.course}</Badge>
                <Badge variant="outline" className="rounded-lg border-zinc-100 text-black font-bold text-[10px]">Sec: {student.section || 'A'}</Badge>
                <Badge variant="outline" className="rounded-lg border-zinc-100 text-black font-bold text-[10px]">Batch: {student.batch || 'Morning'}</Badge>
              </div>
            </div>
          </div>
          <div className="text-center md:text-right">
            <p className="text-[10px] font-black text-black tracking-widest mb-1">Academic Year</p>
            <p className="text-lg font-black text-[#1e3a8a]">{student.session || '2024-25'}</p>
            <p className="text-[11px] font-bold text-emerald-500 flex items-center justify-center md:justify-end gap-1.5 mt-1">
              <Timer className="w-3.5 h-3.5" /> Shift: Morning
            </p>
          </div>
        </div>
      </Card>

      {/* 2️⃣ DAY SELECTOR */}
      <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-none">
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={cn(
              "px-8 py-3.5 rounded-[20px] text-[11px] font-black  tracking-widest transition-all whitespace-nowrap border-none",
              selectedDay === day 
                ? "bg-[#1e3a8a] text-white shadow-xl shadow-blue-900/20 scale-105" 
                : "bg-white text-black hover:bg-zinc-50"
            )}
          >
            {day}
          </button>
        ))}
      </div>

      {/* 3️⃣ DAILY TIMETABLE DISPLAY */}
      <div className="space-y-6">
        {periodsForSelectedDay.length > 0 ? (
          periodsForSelectedDay.map((p, idx) => (
            <Card 
              key={idx} 
              className={cn(
                "border-none shadow-sm rounded-[32px] overflow-hidden transition-all hover:shadow-md group",
                p.type === 'break' ? "bg-zinc-50/50" : "bg-white"
              )}
            >
              <div className={cn(
                "h-full w-2 absolute left-0 top-0 bottom-0",
                p.type === 'break' ? "bg-zinc-300" : (SUBJECT_COLORS[p.name] || "bg-blue-500")
              )} />
              <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="w-16 h-16 rounded-[24px] bg-zinc-50 flex flex-col items-center justify-center border border-zinc-100 group-hover:bg-white transition-colors">
                    <p className="text-[10px] font-black text-zinc-300">Period</p>
                    <p className="text-xl font-black text-black">{idx + 1}</p>
                  </div>
                  <div className="text-center md:text-left space-y-1">
                    <h4 className={cn(
                      "text-xl font-black  tracking-tight",
                      p.type === 'break' ? "text-black" : "text-black"
                    )}>
                      {p.name}
                    </h4>
                    <div className="flex items-center justify-center md:justify-start gap-4 text-[14px] font-bold text-black tracking-widest">
                      <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {p.time}</span>
                      {p.room && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {p.room}</span>}
                    </div>
                  </div>
                </div>

                {p.type === 'subject' ? (
                  <div className="flex items-center gap-4 bg-zinc-50 px-6 py-3 rounded-2xl border border-zinc-100 group-hover:border-blue-100 transition-all">
                    <div className="text-right">
                      <p className="text-[9px] font-black text-black tracking-widest">Faculty</p>
                      <p className="text-[14px] font-bold text-black">{p.teacher}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary shadow-sm">
                      <User className="w-5 h-5" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-zinc-300 opacity-50">
                    <Coffee className="w-6 h-6" />
                    <span className="text-[10px] font-black tracking-[0.3em]">Institutional Interval</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-none shadow-sm rounded-[40px] bg-white p-20 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 bg-rose-50 rounded-[28px] flex items-center justify-center text-rose-500 shadow-inner">
              <AlertCircle className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-black tracking-tight">Holiday / No Class</h3>
              <p className="text-[14px] text-black max-w-xs font-medium leading-relaxed tracking-widest">No academic sessions are scheduled for {selectedDay}.</p>
            </div>
          </Card>
        )}
      </div>

      {/* 4️⃣ ADDITIONAL INFO SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-zinc-100">
        <InfoCard 
          icon={<ClipboardList className="text-blue-500" />} 
          label="Total Periods Today" 
          value={periodsForSelectedDay.filter(p => p.type === 'subject').length} 
        />
        <InfoCard 
          icon={<Timer className="text-emerald-500" />} 
          label="Total Class Hours" 
          value="4.5 Hours" 
        />
        <InfoCard 
          icon={<BookOpen className="text-amber-500" />} 
          label="Next Major Subject" 
          value={student?.course || '-'} 
        />
      </div>
    </main>
  )
}

function InfoCard({ icon, label, value }: { icon: any, label: string, value: string | number }) {
  return (
    <Card className="border-none shadow-sm rounded-[24px] bg-white p-6 flex items-center gap-5 group hover:shadow-md transition-all">
      <div className="w-12 h-12 rounded-xl bg-zinc-50 flex items-center justify-center transition-colors group-hover:bg-white group-hover:shadow-inner">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-black tracking-widest mb-0.5">{label}</p>
        <h4 className="text-lg font-black text-black tracking-tight">{value}</h4>
      </div>
    </Card>
  )
}
