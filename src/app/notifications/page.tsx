
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Bell, 
  Search, 
  Trash2, 
  Check, 
  Filter, 
  Clock, 
  Calendar, 
  User,
  CreditCard,
  History,
  Info
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off, remove, update } from "firebase/database"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

export default function GlobalNotificationsPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const [notifications, setNotifications] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!database || !user) return
    const notifRef = ref(database, `Institutes/${user.uid}/notifications/admin`)
    
    const unsubscribe = onValue(notifRef, (snapshot) => {
      const data = snapshot.val() || {}
      setNotifications(Object.keys(data).map(k => ({ ...data[k], id: k })).reverse())
      setIsLoading(false)
    })

    return () => off(notifRef)
  }, [database, user])

  const filtered = useMemo(() => {
    return notifications.filter(n => {
      const matchSearch = !searchTerm || n.title?.toLowerCase().includes(searchTerm.toLowerCase()) || n.message?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchType = filterType === 'all' || n.type === filterType
      return matchSearch && matchType
    })
  }, [notifications, searchTerm, filterType])

  const markRead = async (id: string) => {
    if (!database || !user) return
    await update(ref(database, `Institutes/${user.uid}/notifications/admin/${id}`), { read: true })
  }

  const deleteNotif = async (id: string) => {
    if (!database || !user) return
    await remove(ref(database, `Institutes/${user.uid}/notifications/admin/${id}`))
  }

  const clearAll = async () => {
    if (!database || !user || !confirm("Clear all notifications?")) return
    await remove(ref(database, `Institutes/${user.uid}/notifications/admin`))
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      <Sidebar />
      <div className="lg:pl-[280px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        <main className="flex-1 p-8 space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto w-full">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div>
              <h2 className="text-3xl font-black text-black font-public-sans tracking-tight">System Registry</h2>
              <p className="text-[14px] text-black font-medium mt-1">Audit log of all institutional activities and alerts</p>
            </div>
            <Button onClick={clearAll} variant="ghost" className="text-rose-500 hover:bg-rose-50 rounded-xl h-11 px-6 font-bold text-[10px] tracking-widest gap-2">
              <Trash2 className="w-4 h-4" /> Clear All History
            </Button>
          </div>

          <Card className="border-none shadow-sm rounded-[32px] bg-white p-8">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
                <Input 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter logs by keyword..." 
                  className="pl-12 h-12 rounded-xl border-zinc-100 bg-zinc-50/50 shadow-inner text-[14px] font-bold" 
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {['all', 'Admission', 'Fee', 'Leave', 'Chat', 'Exam'].map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={cn(
                      "px-6 h-11 rounded-xl text-[10px] font-black  tracking-widest transition-all border-none",
                      filterType === type ? "bg-primary text-white shadow-xl scale-105" : "bg-zinc-50 text-black hover:bg-zinc-100"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50/50">
                  <TableRow className="border-zinc-100">
                    <TableHead className="text-[10px] font-black text-black h-14 pl-10">Alert Category</TableHead>
                    <TableHead className="text-[10px] font-black text-black h-14">Activity Details</TableHead>
                    <TableHead className="text-[10px] font-black text-black h-14">Timestamp</TableHead>
                    <TableHead className="text-right pr-10 text-[10px] font-black text-black h-14">Operations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((n) => (
                    <TableRow key={n.id} className={cn(
                      "border-zinc-50 group hover:bg-zinc-50/30 transition-none",
                      !n.read && "bg-blue-50/10"
                    )}>
                      <TableCell className="pl-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform",
                            n.read ? "bg-zinc-50 text-zinc-300" : "bg-primary/10 text-primary"
                          )}>
                            {n.type === 'Fee' ? <CreditCard className="w-5 h-5" /> : 
                             n.type === 'Leave' ? <Calendar className="w-5 h-5" /> : 
                             n.type === 'Chat' ? <Bell className="w-5 h-5" /> :
                             <Info className="w-5 h-5" />}
                          </div>
                          <Badge variant="outline" className="rounded-lg border-zinc-100 text-[9px] font-black text-black">{n.type}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className={cn("text-[14px] font-black  tracking-tight", n.read ? "text-black" : "text-black")}>{n.title}</p>
                          <p className="text-[14px] text-black font-medium leading-relaxed max-w-md">{n.message}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[14px] font-bold text-black font-public-sans">{n.timestamp ? format(new Date(n.timestamp), "p") : '-'}</span>
                          <span className="text-[9px] font-black text-zinc-300 tracking-widest">{n.timestamp ? format(new Date(n.timestamp), "PP") : '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-10">
                        <div className="flex items-center justify-end gap-2">
                          {!n.read && <Button onClick={() => markRead(n.id)} variant="ghost" size="icon" className="h-9 w-9 text-emerald-500 hover:bg-emerald-50 rounded-xl"><Check className="w-4 h-4" /></Button>}
                          <Button onClick={() => deleteNotif(n.id)} variant="ghost" size="icon" className="h-9 w-9 text-rose-500 hover:bg-rose-50 rounded-xl"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <div className="w-16 h-16 rounded-[24px] bg-zinc-50 flex items-center justify-center text-zinc-200 shadow-inner">
                            <History className="w-8 h-8" />
                          </div>
                          <p className="text-[14px] font-black text-zinc-300 tracking-widest">Registry is empty</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </main>
      </div>
    </div>
  )
}
