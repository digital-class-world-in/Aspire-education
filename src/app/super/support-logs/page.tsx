
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  ClipboardList,
  Search,
  Filter,
  Plus,
  Clock,
  User,
  Info,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  ExternalLink,
  MessageSquare,
  Paperclip
} from "lucide-react"
import { useFirebase } from "@/firebase"
import { ref, onValue, update, push } from "firebase/database"
import { cn } from "@/lib/utils"
import { format, formatDistanceToNow } from "date-fns"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"

export default function SupportLogsPage() {
  const { database } = useFirebase()
  const [logs, setLogs] = useState<any[]>([])
  const [institutes, setInstitutes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  
  // Form State
  const [newLog, setNewLog] = useState({
    instituteId: "",
    instituteName: "",
    title: "",
    description: "",
    priority: "Medium",
    status: "Open"
  })

  useEffect(() => {
    if (!database) return
    
    // Fetch Logs
    const logRef = ref(database, 'SupportLogs')
    onValue(logRef, (snapshot) => {
      const data = snapshot.val() || {}
      const list = Object.keys(data).map(k => ({ id: k, ...data[k] }))
      list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      setLogs(list)
      setIsLoading(false)
    })

    // Fetch Institutes for Dropdown
    onValue(ref(database, 'Institutes'), (snapshot) => {
      const data = snapshot.val() || {}
      const list = Object.keys(data).map(k => ({ id: k, name: data[k].profile?.instituteName }))
      setInstitutes(list)
    })
  }, [database])

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const matchSearch = l.instituteName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          l.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          l.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchStatus = statusFilter === 'all' || l.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [logs, searchTerm, statusFilter])

  const handleAddLog = async () => {
    if (!database || !newLog.instituteId || !newLog.title) return
    try {
      const selInst = institutes.find(i => i.id === newLog.instituteId)
      const data = {
        ...newLog,
        instituteName: selInst?.name || "Unknown",
        agentName: "Super Admin",
        timestamp: Date.now(),
        type: 'MANUAL_LOG'
      }
      await push(ref(database, 'SupportLogs'), data)
      setIsAddModalOpen(false)
      setNewLog({ instituteId: "", instituteName: "", title: "", description: "", priority: "Medium", status: "Open" })
      toast({ title: "Issue Logged", description: "The support activity has been recorded." })
    } catch (e) {
      toast({ variant: "destructive", title: "Action Failed" })
    }
  }

  const toggleStatus = async (log: any) => {
    if (!database) return
    const newStatus = log.status === 'Closed' ? 'Open' : 'Closed'
    await update(ref(database, `SupportLogs/${log.id}`), { status: newStatus })
    toast({ title: `Issue ${newStatus}` })
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-body">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black font-public-sans tracking-tight">Support Activity Logs</h1>
          <p className="text-sm text-black font-medium">Tracking all client issues and support interventions</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2 shadow-lg shadow-indigo-100 font-bold px-6">
          <Plus className="w-4.5 h-4.5" /> Log Manual Issue
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard label="Total Issues" value={logs.length} icon={<ClipboardList className="w-5 h-5" />} color="text-indigo-600" bg="bg-indigo-50" />
        <StatsCard label="Open Issues" value={logs.filter(l => l.status === 'Open').length} icon={<AlertCircle className="w-5 h-5" />} color="text-rose-600" bg="bg-rose-50" />
        <StatsCard label="Resolved" value={logs.filter(l => l.status === 'Closed').length} icon={<CheckCircle2 className="w-5 h-5" />} color="text-emerald-600" bg="bg-emerald-50" />
      </div>

      {/* Table Section */}
      <Card className="border-slate-200 shadow-sm rounded-[32px] overflow-hidden bg-white">
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-lg font-bold text-black">Live Support Feed</h3>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
              {['all', 'Open', 'Closed'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-black   transition-all",
                    statusFilter === st ? "bg-white text-indigo-700 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search logs..." 
                className="pl-10 h-10 rounded-xl border-slate-200" 
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100 h-14">
                <TableHead className="px-8 text-[11px] font-black text-black  ">Institute</TableHead>
                <TableHead className="text-[11px] font-black text-black  ">Activity / Issue</TableHead>
                <TableHead className="text-[11px] font-black text-black  ">Support Agent</TableHead>
                <TableHead className="text-[11px] font-black text-black  ">Time</TableHead>
                <TableHead className="text-[11px] font-black text-black   text-center">Priority</TableHead>
                <TableHead className="px-8 text-[11px] font-black text-black   text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} className="border-slate-100 group hover:bg-slate-50/50 transition-colors">
                  <TableCell className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-black">{log.instituteName}</span>
                      <span className="text-[10px] font-medium text-black mt-0.5 tracking-tight ">Node ID: {log.instituteId?.substring(0, 8)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-sm text-slate-700 line-clamp-1">{log.title || 'Support Mode Entry'}</span>
                      <p className="text-[11px] text-slate-400 font-medium line-clamp-2 leading-relaxed">{log.description || log.notes}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><User className="w-3.5 h-3.5" /></div>
                      <span className="text-xs font-bold text-black">{log.agentName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700">{log.timestamp ? format(new Date(log.timestamp), "MMM dd, hh:mm a") : '-'}</span>
                      <span className="text-[10px] font-medium text-slate-400">{log.timestamp ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }) : ''}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={cn(
                      "rounded-lg px-2 py-0.5 text-[9px] font-bold border-none",
                      log.priority === 'High' ? "bg-rose-50 text-rose-600" : 
                      log.priority === 'Medium' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {log.priority || 'Low'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-8 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <Button 
                        onClick={() => toggleStatus(log)}
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                          "h-10 w-10 rounded-xl transition-all",
                          log.status === 'Closed' ? "text-emerald-500 bg-emerald-50" : "text-slate-300 hover:text-emerald-500 hover:bg-emerald-50"
                        )}
                        title={log.status === 'Closed' ? "Mark as Open" : "Mark as Resolved"}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-300 hover:text-indigo-600"><MoreVertical className="w-5 h-5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add Log Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-y-auto border-slate-200 rounded-[40px] font-body bg-white">
          <div className="bg-indigo-600 p-10 text-white relative overflow-hidden">
            <div className="relative z-10 flex items-center gap-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-[28px] flex items-center justify-center border border-white/20 shadow-2xl">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div>
                <DialogTitle className="text-3xl font-black tracking-tight">Report Activity</DialogTitle>
                <p className="text-indigo-100 text-sm font-medium mt-1">Log a manual support intervention</p>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 animate-pulse" />
          </div>
          
          <div className="p-10 space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2 col-span-2">
                <Label className="text-[10px] font-black text-slate-400   ml-1">Select Institute</Label>
                <Select value={newLog.instituteId} onValueChange={(v) => setNewLog({ ...newLog, instituteId: v })}>
                  <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 font-bold">
                    <SelectValue placeholder="Which node?" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-200">
                    {institutes.map(inst => <SelectItem key={inst.id} value={inst.id} className="rounded-xl">{inst.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="text-[10px] font-black text-slate-400   ml-1">Issue Title</Label>
                <Input value={newLog.title} onChange={e => setNewLog({ ...newLog, title: e.target.value })} placeholder="e.g. Database connection timeout" className="h-14 rounded-2xl border-slate-100 bg-slate-50/50" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="text-[10px] font-black text-slate-400   ml-1">Description / Notes</Label>
                <Textarea value={newLog.description} onChange={e => setNewLog({ ...newLog, description: e.target.value })} placeholder="Detailed activity description..." className="min-h-[140px] rounded-2xl border-slate-100 bg-slate-50/50 resize-none" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400   ml-1">Priority</Label>
                <Select value={newLog.priority} onValueChange={(v) => setNewLog({ ...newLog, priority: v })}>
                  <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400   ml-1">Status</Label>
                <Select value={newLog.status} onValueChange={(v) => setNewLog({ ...newLog, status: v })}>
                  <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="Open">Open Issue</SelectItem>
                    <SelectItem value="Closed">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
             <Button onClick={handleAddLog} className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[24px] font-black text-lg shadow-2xl shadow-indigo-200 transition-all active:scale-[0.98]">
              Record Log Entry
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatsCard({ label, value, icon, color, bg }: any) {
  return (
    <Card className="border-slate-200 shadow-sm rounded-[32px] bg-white group hover:border-indigo-100 transition-all">
      <CardContent className="p-8 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-black  ">{label}</p>
          <h4 className="text-3xl font-black text-black mt-2">{value}</h4>
        </div>
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform", bg, color)}>
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}
