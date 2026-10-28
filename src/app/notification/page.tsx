
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogClose 
} from "@/components/ui/dialog"
import { 
  Bell, 
  Send, 
  Search, 
  History, 
  Filter, 
  Settings2, 
  X, 
  Loader2, 
  Megaphone,
  Users,
  UserCheck,
  CheckCircle2,
  ShieldCheck,
  TrendingUp
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off, push, set, update, get } from "firebase/database"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { usePathname } from "next/navigation"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { toast } from "@/hooks/use-toast"

export default function NotificationPage() {
  const pathname = usePathname()
  const isPortal = (pathname.startsWith('/branch') && !pathname.startsWith('/branch-management')) || 
                   pathname.startsWith('/staff') || 
                   (pathname.startsWith('/student') && !pathname.startsWith('/student-information'))

  const { database } = useFirebase()
  const { user } = useUser()
  const { resolvedId } = useResolvedId()
  
  const [logs, setLogs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    if (!database || !resolvedId) return
    const logRef = ref(database, `Institutes/${resolvedId}/notifications/admin`)
    
    const unsubscribe = onValue(logRef, (snapshot) => {
      const data = snapshot.val() || {}
      setLogs(Object.keys(data).map(k => ({ ...data[k], id: k })).reverse())
      setIsLoading(false)
    })

    return () => off(logRef)
  }, [database, resolvedId])

  const handleSendBroadcast = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!database || !resolvedId || isSubmitting) return
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const title = formData.get("title") as string
    const message = formData.get("message") as string
    const target = formData.get("target") as string
    const now = new Date().toISOString()

    try {
      const rootPath = `Institutes/${resolvedId}`
      const notification = {
        title,
        message,
        type: 'Broadcast',
        timestamp: now,
        read: false,
        sender: user?.displayName || "Administrator"
      }

      // 1. Log in Admin History
      await push(ref(database, `${rootPath}/notifications/admin`), notification)

      // 2. Broadcast to Targeted Nodes
      if (target === 'Everyone' || target === 'Students') {
        const studentsSnap = await get(ref(database, `${rootPath}/admissions`))
        if (studentsSnap.exists()) {
          const updates: any = {}
          Object.keys(studentsSnap.val()).forEach(id => {
            const newRef = push(ref(database, `${rootPath}/notifications/${id}`))
            updates[`Institutes/${resolvedId}/notifications/${id}/${newRef.key}`] = notification
          })
          await update(ref(database), updates)
        }
      }

      if (target === 'Everyone' || target === 'Staff') {
        const staffSnap = await get(ref(database, `${rootPath}/employees`))
        if (staffSnap.exists()) {
          const updates: any = {}
          Object.keys(staffSnap.val()).forEach(id => {
            const newRef = push(ref(database, `${rootPath}/notifications/${id}`))
            updates[`Institutes/${resolvedId}/notifications/${id}/${newRef.key}`] = notification
          })
          await update(ref(database), updates)
        }
      }

      toast({ title: "Broadcast Successful", description: "Notification synchronized across all targeted nodes." })
      setIsModalOpen(false)
    } catch (err) {
      toast({ variant: "destructive", title: "Broadcast Failed" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const filtered = useMemo(() => {
    return logs.filter(l => 
      l.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      l.message?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [logs, searchTerm])

  const content = (
    <main className="flex-1 p-8 space-y-8 animate-in fade-in duration-500 w-full overflow-x-hidden font-public-sans text-black">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h2 className="text-3xl font-black text-black font-public-sans tracking-tight">Notification Center</h2>
          <p className="text-[14px] text-black font-medium mt-1">Broadcast hub and real-time alerts synchronization</p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-white rounded-xl h-11 px-8 font-black text-[10px] tracking-widest border-none shadow-lg active:scale-95 transition-all">
                <Send className="h-4 w-4 mr-2" /> Initiate Broadcast
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl p-0 border-none rounded-[40px] overflow-hidden bg-white shadow-2xl">
              <div className="bg-[#1e3a8a] p-10 text-white relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
                <DialogTitle className="text-2xl font-black tracking-tight leading-none">New Broadcast Node</DialogTitle>
                <p className="text-blue-200 text-[14px] font-bold tracking-widest mt-1">Synchronize communication across portals</p>
                
              </div>
              <form onSubmit={handleSendBroadcast} className="p-10 space-y-8">
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-black tracking-widest ml-1">Target Audience</Label>
                    <Select name="target" defaultValue="Everyone" required>
                      <SelectTrigger className="h-12 rounded-xl border-zinc-100 bg-zinc-50/50 font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl">
                        <SelectItem value="Everyone" className="font-bold">EVERYONE (GLOBAL)</SelectItem>
                        <SelectItem value="Students" className="font-bold">STUDENTS ONLY</SelectItem>
                        <SelectItem value="Staff" className="font-bold">FACULTY & STAFF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-black tracking-widest ml-1">Broadcast Title</Label>
                    <Input name="title" required placeholder="e.g. Annual Sports Meet 2026" className="h-12 rounded-xl border-zinc-100 bg-zinc-50/50 font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-black tracking-widest ml-1">Message Body</Label>
                    <Textarea name="message" required placeholder="Type your detailed institutional announcement here..." className="rounded-2xl border-zinc-100 bg-zinc-50/50 min-h-[150px] font-medium" />
                  </div>
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full h-16 bg-zinc-900 hover:bg-black text-white rounded-3xl font-black text-[14px] tracking-[0.2em] shadow-xl border-none active:scale-95 transition-all">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <Megaphone className="w-5 h-5 mr-3" />}
                  Finalize & Sync Broadcast
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Broadcasts" value={logs.length} icon={<History className="text-indigo-500" />} />
        <StatCard label="Active Nodes" value="Verified" icon={<ShieldCheck className="text-emerald-500" />} />
        <StatCard label="Network Uptime" value="99.9%" icon={<TrendingUp className="text-blue-500" />} />
        <StatCard label="Audience Reach" value="Universal" icon={<Users className="text-amber-500" />} />
      </div>

      <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
        <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search history logs..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-12 h-12 bg-zinc-50 border-none rounded-2xl text-[14px] font-bold shadow-inner" 
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="border-zinc-100">
                <TableHead className="text-[11px] font-black text-black tracking-widest h-14 pl-10">Notification Category</TableHead>
                <TableHead className="text-[11px] font-black text-black h-14">Content Snapshot</TableHead>
                <TableHead className="text-[11px] font-black text-black h-14 text-right pr-10">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log) => (
                <TableRow key={log.id} className="border-zinc-50 group hover:bg-zinc-50/30 transition-none">
                  <TableCell className="pl-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:bg-white group-hover:text-primary transition-all shadow-inner">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-black text-black tracking-tight">{log.title}</span>
                        <Badge variant="outline" className="w-fit rounded-lg border-zinc-100 text-[8px] font-black text-black mt-1">{log.type || 'Broadcast'}</Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-[14px] text-black font-medium line-clamp-1 max-w-md italic">"{log.message}"</p>
                  </TableCell>
                  <TableCell className="text-right pr-10">
                    <span className="text-[13px] font-bold text-black font-public-sans">{log.timestamp ? format(new Date(log.timestamp), "PPp") : '-'}</span>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-16 h-16 bg-zinc-50 rounded-[24px] flex items-center justify-center text-zinc-200 shadow-inner">
                        <History className="w-8 h-8" />
                      </div>
                      <p className="text-[14px] font-black text-zinc-300 tracking-widest">No history found in registry</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </main>
  )

  if (isPortal) return content

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans overflow-x-hidden">
      <Sidebar />
      <div className="lg:pl-[300px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        {content}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon }: any) {
  return (
    <Card className="border border-zinc-100 shadow-sm rounded-2xl p-6 bg-white flex items-center gap-5 group hover:shadow-md transition-all">
      <div className="w-12 h-12 rounded-xl bg-zinc-50 flex items-center justify-center shadow-inner group-hover:bg-white transition-all">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-black tracking-widest mb-0.5">{label}</p>
        <h4 className="text-xl font-black text-black">{value}</h4>
      </div>
    </Card>
  )
}
