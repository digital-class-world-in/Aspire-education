
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  BellRing,
  Plus,
  Search,
  Megaphone,
  AlertTriangle,
  Info,
  XCircle,
  Clock,
  Send,
  Trash2,
  Globe,
  Monitor
} from "lucide-react"
import { useFirebase } from "@/firebase"
import { ref, onValue, push, remove, update } from "firebase/database"
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
import { Switch } from "@/components/ui/switch"
import { toast } from "@/hooks/use-toast"

export default function SystemAlertsPage() {
  const { database } = useFirebase()
  const [alerts, setAlerts] = useState<any[]>([])
  const [institutes, setInstitutes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [newAlert, setNewAlert] = useState({
    targetId: "all",
    type: "Info",
    title: "",
    message: "",
    showInPopup: true,
    showInNotification: true
  })

  useEffect(() => {
    if (!database) return
    const alertRef = ref(database, 'SystemAlerts')
    onValue(alertRef, (snapshot) => {
      const data = snapshot.val() || {}
      const list = Object.keys(data).map(k => ({ id: k, ...data[k] }))
      setAlerts(list.sort((a, b) => b.timestamp - a.timestamp))
      setLoading(false)
    })

    onValue(ref(database, 'Institutes'), (snapshot) => {
      const data = snapshot.val() || {}
      setInstitutes(Object.keys(data).map(k => ({ id: k, name: data[k].profile?.instituteName })))
    })
  }, [database])

  const handleSendAlert = async () => {
    if (!database || !newAlert.title || !newAlert.message) return
    try {
      const timestamp = Date.now()
      const alertData = { 
        ...newAlert, 
        timestamp,
        status: 'Sent',
        targetName: newAlert.targetId === 'all' ? 'All Institutes' : institutes.find(i => i.id === newAlert.targetId)?.name
      }
      
      // 1. Save to global alerts history
      const globalRef = push(ref(database, 'SystemAlerts'))
      await update(globalRef, alertData)

      // 2. Push to specific/all institutes for real-time trigger
      const updates: any = {}
      if (newAlert.targetId === 'all') {
        institutes.forEach(inst => {
          updates[`Institutes/${inst.id}/alerts/${globalRef.key}`] = alertData
        })
      } else {
        updates[`Institutes/${newAlert.targetId}/alerts/${globalRef.key}`] = alertData
      }
      await update(ref(database), updates)

      setIsModalOpen(false)
      setNewAlert({ targetId: "all", type: "Info", title: "", message: "", showInPopup: true, showInNotification: true })
      toast({ title: "Alert Broadcasted", description: "All selected nodes have received the notification." })
    } catch (e) {
      toast({ variant: "destructive", title: "Broadcast Failed" })
    }
  }

  const deleteAlert = async (id: string) => {
    if (!database) return
    await remove(ref(database, `SystemAlerts/${id}`))
    toast({ title: "Alert Removed" })
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-body">
       {/* Header */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black font-public-sans tracking-tight">System Alerts (Live)</h1>
          <p className="text-sm text-black font-medium">Broadcast emergency messages to all or selected institutes</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="h-11 bg-rose-600 hover:bg-rose-700 text-white rounded-xl gap-2 shadow-lg shadow-rose-100 font-bold px-6">
          <Megaphone className="w-4.5 h-4.5" /> Create Live Alert
        </Button>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AlertStat label="Active Broadcasts" value={alerts.length} type="Blue" />
        <AlertStat label="Critical Warnings" value={alerts.filter(a => a.type === 'Error').length} type="Red" />
        <AlertStat label="Targeted Nodes" value={institutes.length} type="Indigo" />
      </div>

      <Card className="border-slate-200 shadow-sm rounded-[32px] overflow-hidden bg-white">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
           <h3 className="text-lg font-bold text-black">Broadcasting History</h3>
           <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input placeholder="Search alerts..." className="pl-10 h-10 rounded-xl border-slate-200" />
           </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100 h-14">
                <TableHead className="px-8 text-[11px] font-black text-black  ">Type</TableHead>
                <TableHead className="text-[11px] font-black text-black  ">Target Node</TableHead>
                <TableHead className="text-[11px] font-black text-black  ">Alert Content</TableHead>
                <TableHead className="text-[11px] font-black text-black  ">Sent At</TableHead>
                <TableHead className="px-8 text-[11px] font-black text-black   text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((alert) => (
                <TableRow key={alert.id} className="border-slate-100 h-20 group hover:bg-slate-50/50">
                  <TableCell className="px-8">
                    <Badge className={cn(
                      "rounded-lg px-2.5 py-1 text-[9px] font-black border-none",
                      alert.type === 'Error' ? "bg-rose-50 text-rose-600" : 
                      alert.type === 'Warning' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {alert.type || 'Info'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-bold text-slate-700">{alert.targetName}</span>
                  </TableCell>
                  <TableCell className="max-w-[400px]">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">{alert.title}</span>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{alert.message}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700">{format(new Date(alert.timestamp), "MMM dd, hh:mm a")}</span>
                      <span className="text-[10px] font-medium text-slate-400">{formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-8 text-right">
                    <Button onClick={() => deleteAlert(alert.id)} variant="ghost" size="icon" className="h-10 w-10 text-slate-300 hover:text-rose-600 rounded-xl"><Trash2 className="w-5 h-5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create Alert Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-y-auto border-slate-200 rounded-[40px] bg-white">
           <div className="bg-rose-600 p-10 text-white relative">
             <div className="flex items-center gap-6 relative z-10">
               <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-[28px] flex items-center justify-center border border-white/20 shadow-2xl">
                 <AlertTriangle className="w-8 h-8" />
               </div>
               <div>
                  <DialogTitle className="text-3xl font-black">Issue Broadcast</DialogTitle>
                  <p className="text-rose-100 text-sm font-medium mt-1">Live notification to selected nodes</p>
               </div>
             </div>
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20" />
           </div>

           <div className="p-10 space-y-8">
             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-400   ml-1">Target</Label>
                    <Select value={newAlert.targetId} onValueChange={v => setNewAlert({...newAlert, targetId: v})}>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">Every Institute</SelectItem>
                        {institutes.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-400   ml-1">Severity</Label>
                    <Select value={newAlert.type} onValueChange={v => setNewAlert({...newAlert, type: v})}>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Info">Informational (Blue)</SelectItem>
                        <SelectItem value="Warning">Warning (Yellow)</SelectItem>
                        <SelectItem value="Error">Critical (Red)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-slate-400   ml-1">Title</Label>
                  <Input value={newAlert.title} onChange={e => setNewAlert({...newAlert, title: e.target.value})} placeholder="e.g. Scheduled Maintenance" className="h-12 rounded-xl bg-slate-50 border-slate-100" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-slate-400   ml-1">Body Message</Label>
                  <Textarea value={newAlert.message} onChange={e => setNewAlert({...newAlert, message: e.target.value})} placeholder="Message content..." className="min-h-[100px] rounded-xl bg-slate-50 border-slate-100 resize-none" />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">Display as Popup</span>
                    <span className="text-[10px] text-slate-400 font-medium">Auto opens when client logs in</span>
                  </div>
                  <Switch checked={newAlert.showInPopup} onCheckedChange={v => setNewAlert({...newAlert, showInPopup: v})} />
                </div>
             </div>

             <Button onClick={handleSendAlert} className="w-full h-16 bg-rose-600 hover:bg-rose-700 text-white rounded-[24px] font-black text-lg shadow-2xl shadow-rose-100 flex items-center justify-center gap-3">
               <Send className="w-5 h-5" /> Broadcast Now
             </Button>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AlertStat({ label, value, type }: any) {
  return (
    <Card className="border-slate-200 shadow-sm rounded-[32px] overflow-hidden group">
      <CardContent className="p-8 flex items-center gap-6">
        <div className={cn(
          "w-16 h-16 rounded-[24px] flex items-center justify-center border transition-all",
          type === 'Red' ? "bg-rose-50 border-rose-100 text-rose-600" : 
          type === 'Blue' ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-indigo-50 border-indigo-100 text-indigo-600"
        )}>
           <BellRing className="w-8 h-8" />
        </div>
        <div>
           <p className="text-[10px] font-black text-black  ">{label}</p>
           <h4 className="text-3xl font-black text-black mt-1">{value}</h4>
        </div>
      </CardContent>
    </Card>
  )
}
