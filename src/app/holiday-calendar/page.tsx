
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  CalendarDays, 
  Trash2, 
  Edit2, 
  Loader2,
  Save,
  Calendar as CalendarIcon
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, set, remove, off, update } from "firebase/database"
import { toast } from "@/hooks/use-toast"
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
import { usePathname } from "next/navigation"

const ENTRY_TYPES = ["Holiday", "Activity", "Event"]
const COLORS: Record<string, any> = {
  "Emerald": { value: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  "Blue": { value: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50" },
  "Rose": { value: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50" },
  "Amber": { value: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" }
}

export default function HolidayCalendarPage() {
  const pathname = usePathname()
  const isPortal = pathname.startsWith('/staff') || pathname.startsWith('/student') || pathname.startsWith('/branch')

  const { database } = useFirebase()
  const { user } = useUser()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [holidays, setHolidays] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!database || !user) return
    const rootPath = `Institutes/${user.uid}/holidays`
    onValue(ref(database, rootPath), (snapshot) => {
      const data = snapshot.val()
      if (data) setHolidays(Object.keys(data).map(key => ({ ...data[key], id: key })))
      else setHolidays([])
    })
  }, [database, user])

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth))
    const end = endOfWeek(endOfMonth(currentMonth))
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const handleSaveHoliday = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user || !database) return
    setIsSaving(true)
    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get("name") as string,
      entryType: formData.get("entryType") as string,
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string,
      color: formData.get("color") as string,
      updatedAt: Date.now()
    }
    const dbPath = `Institutes/${user.uid}/holidays`
    if (editingHoliday) await update(ref(database, `${dbPath}/${editingHoliday.id}`), data)
    else await push(ref(database, dbPath), { ...data, createdAt: Date.now() })
    
    setIsModalOpen(false); setEditingHoliday(null); setIsSaving(false); 
    toast({ title: "Saved", description: "Event updated in your calendar." });
  }

  const mainContent = (
    <main className="flex-1 p-8 space-y-8 animate-in fade-in duration-500 w-full overflow-x-hidden font-public-sans text-black text-[14px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h2 className="text-3xl font-bold text-black font-public-sans tracking-tight leading-none">Holiday Calendar</h2>
          <p className="text-[14px] text-black font-medium mt-1">Institutional breaks and co-curricular schedule</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-xl shadow-sm border border-zinc-100 flex items-center">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="h-9 w-9 rounded-lg transition-none"><ChevronLeft className="w-4 h-4 text-black" /></Button>
            <div className="px-4 text-[10px] font-black tracking-[0.2em] text-black min-w-[160px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </div>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="h-9 w-9 rounded-lg transition-none"><ChevronRight className="w-4 h-4 text-black" /></Button>
          </div>
          <Button 
            onClick={() => { setEditingHoliday(null); setIsModalOpen(true); }} 
            className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-8 font-bold text-[14px] border-none shadow-lg active:scale-95 transition-all tracking-widest"
          >
            <Plus className="h-4 w-4" /> Add Event
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-2xl rounded-[32px] overflow-hidden bg-white border border-zinc-100">
        <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50/50">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="py-4 text-center text-[10px] font-black tracking-[0.3em] text-black">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dayHolidays = holidays.filter(h => isSameDay(day, parseISO(h.startDate)))
            return (
              <div key={idx} className={cn(
                "min-h-[140px] p-2 border-r border-b border-zinc-100 relative hover:bg-zinc-50/30 transition-colors", 
                !isSameMonth(day, currentMonth) && "opacity-20"
              )}>
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-[14px] font-black mb-2 transition-all", 
                  isToday(day) ? "bg-primary text-white shadow-lg scale-110" : "text-black"
                )}>
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {dayHolidays.map((h, i) => (
                    <div 
                      key={i} 
                      onClick={() => { setEditingHoliday(h); setIsModalOpen(true); }} 
                      className={cn(
                        "px-2 py-1 rounded-md text-[9px] font-black  truncate cursor-pointer transition-transform hover:scale-105", 
                        (COLORS[h.color] || COLORS.Emerald).bg, 
                        (COLORS[h.color] || COLORS.Emerald).text
                      )}
                    >
                      {h.name}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md p-0 border-none rounded-[32px] overflow-hidden bg-white shadow-2xl">
          <div className="bg-[#1e3a8a] px-8 py-6 text-white flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-black tracking-tight">Calendar Entry</DialogTitle>
              <DialogDescription className="sr-only">Schedule institutional events.</DialogDescription>
            </div>
            
          </div>
          
          <form onSubmit={handleSaveHoliday} className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black tracking-widest text-black ml-1">Event Name</Label>
                <Input name="name" defaultValue={editingHoliday?.name} required placeholder="e.g. Summer Break" className="h-11 rounded-xl border-zinc-100 bg-zinc-50/50 font-bold text-black" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black tracking-widest text-black ml-1">Entry Type</Label>
                  <Select name="entryType" defaultValue={editingHoliday?.entryType || "Holiday"}>
                    <SelectTrigger className="h-11 rounded-xl border-zinc-100 bg-zinc-50/50 font-bold text-black">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-zinc-100 shadow-xl">
                      {ENTRY_TYPES.map(t => <SelectItem key={t} value={t} className="font-bold text-[14px]">{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black tracking-widest text-black ml-1">Label Color</Label>
                  <Select name="color" defaultValue={editingHoliday?.color || "Emerald"}>
                    <SelectTrigger className="h-11 rounded-xl border-zinc-100 bg-zinc-50/50 font-bold text-black">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-zinc-100 shadow-xl">
                      {Object.keys(COLORS).map(c => (
                        <SelectItem key={c} value={c} className="font-bold text-[14px]">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black tracking-widest text-black ml-1">Start Date</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-300" />
                    <Input name="startDate" type="date" required defaultValue={editingHoliday?.startDate} className="pl-10 h-11 rounded-xl border-zinc-100 bg-zinc-50/50 font-bold text-black" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black tracking-widest text-black ml-1">End Date</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-300" />
                    <Input name="endDate" type="date" required defaultValue={editingHoliday?.endDate} className="pl-10 h-11 rounded-xl border-zinc-100 bg-zinc-50/50 font-bold text-black" />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-start">
              <Button 
                type="submit" 
                disabled={isSaving} 
                className="w-full h-14 bg-zinc-900 hover:bg-black text-white font-black text-[14px] tracking-widest rounded-2xl shadow-xl border-none active:scale-95 transition-all"
              >
                {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="mr-2 w-4 h-4" />} 
                Commit Calendar Entry
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  )

  if (isPortal) return mainContent

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans overflow-x-hidden">
      <Sidebar />
      <div className="lg:pl-[280px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        {mainContent}
      </div>
    </div>
  )
}
