
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTitle, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  CalendarDays, 
  Info,
  CheckCircle2,
  Calendar,
  Sparkles,
  MapPin,
  Clock,
  PartyPopper
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { cn } from "@/lib/utils"
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  parseISO
} from "date-fns"

const COLORS: Record<string, any> = {
  "Emerald": { value: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-100" },
  "Blue": { value: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50", ring: "ring-blue-100" },
  "Amber": { value: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-100" },
  "Rose": { value: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50", ring: "ring-rose-100" },
  "Indigo": { value: "bg-indigo-500", text: "text-indigo-700", bg: "bg-indigo-50", ring: "ring-indigo-100" }
}

export default function StudentHolidaysPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [holidays, setHolidays] = useState<any[]>([])
  const [viewingHoliday, setViewingHoliday] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!database) return
    
    // Resolve Student context from Session
    const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('student_session') : null
    if (!sessionStr) return

    try {
      const session = JSON.parse(sessionStr)
      const adminUid = session.adminUid

      if (adminUid) {
        onValue(ref(database, `Institutes/${adminUid}/holidays`), (snapshot) => {
          const data = snapshot.val()
          if (data) setHolidays(Object.keys(data).map(key => ({ ...data[key], id: key })))
          else setHolidays([])
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

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth))
    const end = endOfWeek(endOfMonth(currentMonth))
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 tracking-[0.3em] animate-pulse">Establishing Academic Calendar...</div>

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-32">
      
      {/* 1️⃣ HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h2 className="text-3xl font-black text-black tracking-tight">Holiday Registry</h2>
          <p className="text-[14px] text-black font-medium tracking-widest">Plan your schedule with official institutional breaks</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-1 rounded-2xl shadow-sm border border-zinc-100">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="h-10 w-10 rounded-xl"><ChevronLeft className="w-5 h-5 text-black" /></Button>
          <div className="px-6 text-[14px] font-black tracking-[0.2em] text-black min-w-[180px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="h-10 w-10 rounded-xl"><ChevronRight className="w-5 h-5 text-black" /></Button>
        </div>
      </div>

      {/* 2️⃣ CALENDAR GRID */}
      <Card className="border-none shadow-2xl rounded-[40px] overflow-hidden bg-white border border-zinc-200">
        <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50/50">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="py-6 text-center text-[10px] font-black tracking-[0.3em] text-black border-r border-zinc-200 last:border-r-0">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 border-l border-zinc-200">
          {calendarDays.map((day, idx) => {
            const dayHolidays = holidays.filter(h => {
              const start = parseISO(h.startDate)
              const end = parseISO(h.endDate)
              return (isSameDay(day, start) || isSameDay(day, end) || (day > start && day < end))
            })

            return (
              <div key={idx} className={cn(
                "min-h-[160px] p-4 border-r border-b border-zinc-200 relative group transition-all",
                !isSameMonth(day, currentMonth) && "bg-zinc-50/50 grayscale opacity-20"
              )}>
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center text-[14px] font-black mb-4 transition-all",
                  isToday(day) ? "bg-[#1e3a8a] text-white shadow-xl scale-110" : "text-zinc-300 group-hover:text-black"
                )}>
                  {format(day, "d")}
                </div>
                
                <div className="space-y-2">
                  {dayHolidays.map((h, i) => {
                    const colorSet = COLORS[h.color] || COLORS["Emerald"]
                    return (
                      <div 
                        key={i} 
                        onClick={() => setViewingHoliday(h)}
                        className={cn(
                          "px-3 py-2 rounded-xl text-[9px] font-black  truncate cursor-pointer shadow-sm border-l-4 transition-all hover:scale-105 active:scale-95",
                          colorSet.bg, colorSet.text, colorSet.value.replace("bg-", "border-")
                        )}
                      >
                        {h.name}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* 3️⃣ DETAIL MODAL */}
      <Dialog open={!!viewingHoliday} onOpenChange={() => setViewingHoliday(null)}>
        <DialogContent className="max-w-xl p-0 border-none rounded-[40px] overflow-hidden bg-white shadow-2xl animate-in zoom-in-95 duration-300">
          {viewingHoliday && (
            <>
              <div className={cn(
                "p-12 text-white relative",
                (COLORS[viewingHoliday.color] || COLORS["Emerald"]).value
              )}>
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl" />
                
                <div className="space-y-6">
                  <Badge className="bg-white/20 text-white border-none text-[10px] font-black tracking-widest px-4 py-1">Institutional Holiday</Badge>
                  <DialogTitle className="text-4xl font-black tracking-tight leading-tight">{viewingHoliday.name}</DialogTitle>
                  <div className="flex items-center gap-4 text-[14px] font-black text-white/60 tracking-widest">
                    <span className="flex items-center gap-2"><PartyPopper className="w-4 h-4" /> {viewingHoliday.type} Event</span>
                  </div>
                </div>
              </div>
              <div className="p-12 space-y-10">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-zinc-300 tracking-widest">Duration</p>
                    <div className="flex items-center gap-3 text-[14px] font-black text-black">
                      <Calendar className="w-4 h-4 text-primary" />
                      {viewingHoliday.startDate} {viewingHoliday.startDate !== viewingHoliday.endDate && ` to ${viewingHoliday.endDate}`}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-zinc-300 tracking-widest">Campus Status</p>
                    <div className="flex items-center gap-3 text-[14px] font-black text-rose-500">
                      <Clock className="w-4 h-4" /> Operations Suspended
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="text-[10px] font-black text-black tracking-[0.2em] border-b border-zinc-50 pb-2">Institutional Note</h5>
                  <div className="bg-zinc-50 p-8 rounded-[32px] border border-zinc-100/50 italic text-[14px] text-black font-medium leading-relaxed">
                    "{viewingHoliday.description || 'Enjoy your well-deserved institutional break! Academic sessions will resume as per schedule.'}"
                  </div>
                </div>

                <div className="pt-4 text-center">
                  <p className="text-2xl font-black text-black tracking-tight">Enjoy Your Holiday! 🎉</p>
                  <p className="text-[10px] font-bold text-black tracking-widest mt-2">Team {format(new Date(), "yyyy")}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </main>
  )
}
