
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  PartyPopper, 
  Calendar, 
  Clock, 
  MapPin, 
  Info,
  ChevronRight,
  History,
  Sparkles,
  Search,
  Star
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { cn } from "@/lib/utils"
import { format, isAfter, parseISO } from "date-fns"

export default function StudentEventsPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const [events, setEvents] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!database || !user) return
    
    const instRef = ref(database, `Institutes`)
    onValue(instRef, (snap) => {
      const institutes = snap.val() || {}
      let adminUid = null

      Object.keys(institutes).forEach(id => {
        const adms = institutes[id].admissions || {}
        Object.keys(adms).forEach(aid => {
          if (adms[aid].email?.toLowerCase() === user.email?.toLowerCase()) {
            adminUid = id
          }
        })
      })

      if (adminUid) {
        onValue(ref(database, `Institutes/${adminUid}/holidays`), (snapshot) => {
          const data = snapshot.val() || {}
          const list = Object.keys(data)
            .map(k => ({ ...data[k], id: k }))
            .filter(e => e.entryType === 'Activity' || e.entryType === 'Event')
          setEvents(list.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()))
        })
      }
      setIsLoading(false)
    }, { onlyOnce: true })
  }, [database, user])

  const filtered = useMemo(() => {
    if (!searchTerm) return events
    return events.filter(e => e.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [events, searchTerm])

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 animate-pulse">Syncing Event Ledger...</div>

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-32">
      
      <Card className="border-none shadow-xl rounded-[40px] bg-white overflow-hidden p-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-[28px] bg-amber-50 flex items-center justify-center text-amber-500 shadow-inner">
              <PartyPopper className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-black tracking-tight">Institutional Events</h2>
              <p className="text-[10px] font-bold text-black tracking-widest">Co-Curricular & Student Activities</p>
            </div>
          </div>
          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search activities..." 
              className="w-full pl-12 h-12 rounded-2xl border-zinc-100 bg-zinc-50 focus:ring-2 focus:ring-amber-500/20 outline-none text-[14px] font-bold" 
            />
          </div>
        </div>
      </Card>

      <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
        <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
          <h3 className="font-black text-black text-[10px] tracking-[0.2em]">Activity Schedule Ledger</h3>
          <Calendar className="w-4 h-4 text-zinc-200" />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50">
              <TableRow>
                <TableHead className="pl-8 text-[10px] font-black h-14">Activity Description</TableHead>
                <TableHead className="text-[10px] font-black">Category</TableHead>
                <TableHead className="text-[10px] font-black text-center">Schedule</TableHead>
                <TableHead className="text-[10px] font-black text-center">Status</TableHead>
                <TableHead className="text-right pr-8 text-[10px] font-black">Engagement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e, i) => {
                const isPast = isAfter(new Date(), parseISO(e.endDate))
                return (
                  <TableRow key={i} className="border-zinc-50 group hover:bg-zinc-50/30 transition-all">
                    <TableCell className="pl-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:bg-white group-hover:text-amber-500 transition-all shadow-inner">
                          <Star className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[14px] font-black text-black tracking-tight">{e.name}</p>
                          <p className="text-[10px] font-bold text-black line-clamp-1 max-w-[300px]">{e.description || 'Institutional student activity.'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-lg border-zinc-100 text-black font-black text-[9px]">{e.type}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="text-[14px] font-black text-black font-public-sans">{e.startDate}</span>
                        {e.startDate !== e.endDate && <span className="text-[8px] font-black text-zinc-300">to {e.endDate}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn(
                        "rounded-lg px-2.5 py-1 text-[9px] font-black  border-none",
                        isPast ? "bg-zinc-100 text-black" : "bg-emerald-50 text-emerald-600"
                      )}>
                        {isPast ? "Completed" : "Upcoming"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <Button variant="ghost" className="h-9 px-4 rounded-xl bg-zinc-50 text-black font-black text-[9px] tracking-widest gap-2 hover:bg-amber-50 hover:text-amber-600 transition-all">
                        Details <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="h-48 text-center text-zinc-300 italic">No scheduled activities found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </main>
  )
}
