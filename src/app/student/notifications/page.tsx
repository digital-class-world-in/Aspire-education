"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Bell, 
  Search, 
  Calendar, 
  Check, 
  Trash2, 
  History, 
  Clock, 
  Info,
  CheckCircle2,
  X,
  Filter
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off, remove, update } from "firebase/database"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

export default function StudentNotificationsPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const [student, setStudent] = useState<any>(null)
  const [adminUid, setAdminUid] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!database || !user) return
    
    // Multi-tenant search
    const institutesRef = ref(database, `Institutes`)
    onValue(institutesRef, (snapshot) => {
      const institutes = snapshot.val() || {}
      let studentId = null
      let instIdFound = null

      Object.keys(institutes).forEach(instId => {
        const admissions = institutes[instId].admissions || {}
        Object.keys(admissions).forEach(admId => {
          if (admissions[admId].email === user.email) {
            studentId = admId
            instIdFound = instId
            setStudent({ ...admissions[admId], id: admId })
          }
        })
      })

      if (studentId && instIdFound) {
        setAdminUid(instIdFound)
        const notifRef = ref(database, `Institutes/${instIdFound}/notifications/${studentId}`)
        onValue(notifRef, (snap) => {
          const data = snap.val() || {}
          setNotifications(Object.keys(data).map(k => ({ ...data[k], id: k })).reverse())
          setIsLoading(false)
        })
      } else {
        setIsLoading(false)
      }
    }, { onlyOnce: true })
  }, [database, user])

  const filtered = useMemo(() => {
    if (!searchTerm) return notifications
    const lower = searchTerm.toLowerCase()
    return notifications.filter(n => 
      n.title?.toLowerCase().includes(lower) || 
      n.message?.toLowerCase().includes(lower)
    )
  }, [notifications, searchTerm])

  const markAllAsRead = async () => {
    if (!database || !student || !adminUid) return
    const updates: any = {}
    notifications.forEach(n => {
      if (!n.read) updates[`Institutes/${adminUid}/notifications/${student.id}/${n.id}/read`] = true
    })
    await update(ref(database), updates)
  }

  const clearAll = async () => {
    if (!database || !student || !adminUid) return
    await remove(ref(database, `Institutes/${adminUid}/notifications/${student.id}`))
  }

  const handleDelete = async (id: string) => {
    if (!database || !student || !adminUid) return
    await remove(ref(database, `Institutes/${adminUid}/notifications/${student.id}/${id}`))
  }

  const toggleRead = async (id: string, current: boolean) => {
    if (!database || !student || !adminUid) return
    await update(ref(database, `Institutes/${adminUid}/notifications/${student.id}/${id}`), { read: !current })
  }

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 tracking-[0.2em] animate-pulse">Syncing Secure Alerts...</div>

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-5xl mx-auto pb-32">
      
      {/* 🔔 HEADER */}
      <Card className="border-none shadow-xl rounded-[40px] bg-white overflow-hidden p-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-8">
            <div className="w-20 h-20 rounded-[28px] bg-rose-50 flex items-center justify-center text-rose-500 shadow-inner">
              <Bell className="w-10 h-10" />
            </div>
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-3xl font-black text-black tracking-tight">Alert Center</h2>
              <p className="text-[10px] font-bold text-black tracking-[0.2em]">Institutional Notifications & System Alerts</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={markAllAsRead} variant="outline" className="rounded-2xl h-12 px-6 font-black text-[10px] tracking-widest gap-2 border-zinc-100 hover:bg-zinc-50 transition-all">
              <Check className="w-4 h-4" /> Mark All Read
            </Button>
            <Button onClick={clearAll} variant="ghost" className="rounded-2xl h-12 px-6 font-black text-[10px] tracking-widest gap-2 text-rose-500 hover:bg-rose-50 transition-all">
              <Trash2 className="w-4 h-4" /> Clear All
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-[#1e3a8a] transition-colors" />
            <Input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search your alerts..." 
              className="pl-12 h-12 rounded-2xl border-zinc-100 bg-white shadow-sm text-[14px] font-bold" 
            />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="h-10 px-4 rounded-xl text-[10px] font-black text-black tracking-widest gap-2">
              <Filter className="w-4 h-4" /> Latest First
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {filtered.map((item) => (
            <Card key={item.id} className={cn(
              "border-none shadow-sm rounded-[32px] bg-white p-8 group hover:shadow-lg transition-all duration-500 relative overflow-hidden",
              !item.read && "bg-blue-50/20"
            )}>
              {!item.read && <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#1e3a8a]" />}
              
              <div className="flex items-start gap-8">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner transition-all",
                  item.read ? "bg-zinc-50 text-zinc-300" : "bg-[#1e3a8a] text-white"
                )}>
                  {item.type === 'Leave' ? <Calendar className="w-6 h-6" /> : <Info className="w-6 h-6" />}
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h4 className={cn("text-xl font-black  tracking-tight", item.read ? "text-black" : "text-black")}>{item.title}</h4>
                        {!item.read && <Badge className="bg-rose-500 text-white border-none text-[8px] font-black px-2 py-0.5">New</Badge>}
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-black text-zinc-300 tracking-widest">
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {item.timestamp ? format(new Date(item.timestamp), "p") : ''}</span>
                        <span className="w-1 h-1 bg-zinc-200 rounded-full" />
                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {item.timestamp ? format(new Date(item.timestamp), "PPP") : ''}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => toggleRead(item.id, item.read)} className="h-10 w-10 text-black hover:text-[#1e3a8a] rounded-xl bg-zinc-50 transition-all">
                        {item.read ? <History className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-10 w-10 text-rose-500 hover:bg-rose-50 rounded-xl bg-zinc-50 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <p className={cn("text-[14px] leading-relaxed font-medium", item.read ? "text-black" : "text-black")}>
                    {item.message}
                  </p>
                </div>
              </div>
            </Card>
          ))}

          {filtered.length === 0 && (
            <div className="py-32 text-center space-y-6 bg-white rounded-[40px] border-2 border-dashed border-zinc-100">
              <div className="w-20 h-20 bg-zinc-50 rounded-[28px] flex items-center justify-center mx-auto text-zinc-200">
                <History className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-black tracking-tight">Inbox is Clear</h3>
                <p className="text-[14px] text-black max-w-xs mx-auto font-medium tracking-widest leading-relaxed">No notifications found. We'll alert you when something important happens.</p>
              </div>
            </div>
          )}
        </div>
      </div>

    </main>
  )
}
