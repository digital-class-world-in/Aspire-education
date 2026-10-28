"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  CalendarDays, 
  Plus, 
  History, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  FileUp, 
  Info, 
  AlertCircle,
  X,
  FileText,
  Loader2,
  Calendar,
  ChevronRight
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, set, off } from "firebase/database"
import { cn } from "@/lib/utils"
import { format, differenceInDays, parseISO, isBefore } from "date-fns"
import { toast } from "@/hooks/use-toast"

const LEAVE_TYPES = [
  { id: 'Sick', label: 'Sick Leave', color: 'border-t-rose-500', total: 10 },
  { id: 'Casual', label: 'Casual Leave', color: 'border-t-blue-500', total: 10 },
  { id: 'Emergency', label: 'Emergency Leave', color: 'border-t-amber-500', total: 5 },
  { id: 'Annual', label: 'Annual Leave', color: 'border-t-[#1e3a8a]', total: 15 }
]

export default function StudentLeavePage() {
  const { database } = useFirebase()
  const { user } = useUser()
  
  const [student, setStudent] = useState<any>(null)
  const [adminUid, setAdminUid] = useState<string | null>(null)
  const [requests, setRequests] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [leaveType, setLeaveType] = useState("Sick Leave")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  useEffect(() => {
    if (!database || !user) return
    
    const instRef = ref(database, `Institutes`)
    onValue(instRef, (snap) => {
      const institutes = snap.val() || {}
      let foundStudent = null
      let foundAdmin = null

      Object.keys(institutes).forEach(id => {
        const adms = institutes[id].admissions || {}
        Object.keys(adms).forEach(aid => {
          if (adms[aid].email?.toLowerCase() === user.email?.toLowerCase()) {
            foundStudent = { ...adms[aid], id: aid }
            foundAdmin = id
          }
        })
      })

      if (foundStudent && foundAdmin) {
        setStudent(foundStudent)
        setAdminUid(foundAdmin)
        
        // Fetch History
        onValue(ref(database, `Institutes/${foundAdmin}/leave-requests`), (s) => {
          const data = s.val() || {}
          const list = Object.keys(data)
            .map(k => ({ ...data[k], id: k }))
            .filter(r => r.requesterId === foundStudent.id)
          setRequests(list.reverse())
        })
      }
      setIsLoading(false)
    })
  }, [database, user])

  const totalDays = useMemo(() => {
    if (!fromDate || !toDate) return 0
    const diff = differenceInDays(parseISO(toDate), parseISO(fromDate)) + 1
    return diff > 0 ? diff : 0
  }, [fromDate, toDate])

  const leaveStats = useMemo(() => {
    const stats: Record<string, any> = {}
    
    LEAVE_TYPES.forEach(type => {
      // Logic: Used leaves are calculated from approved requests in the history
      const used = requests
        .filter(r => r.leaveType === type.label && r.status === 'Approved')
        .reduce((sum, r) => sum + (Number(r.totalDays) || 0), 0)
      
      stats[type.id] = {
        ...type,
        used,
        remaining: Math.max(0, type.total - used)
      }
    })
    
    return stats
  }, [requests])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!database || !adminUid || !student) return

    if (totalDays <= 0) {
      toast({ variant: "destructive", title: "Invalid Dates", description: "To date must be after from date." })
      return
    }

    const formData = new FormData(e.currentTarget)
    const selectedType = leaveStats[leaveType.split(' ')[0]] // Simple mapping
    
    if (selectedType && selectedType.remaining < totalDays) {
      toast({ variant: "destructive", title: "Insufficient Balance", description: `You only have ${selectedType.remaining} days remaining for this leave type.` })
      return
    }

    setIsSubmitting(true)
    const requestData = {
      requesterId: student.id,
      requesterName: student.studentName,
      role: "Student",
      leaveType,
      fromDate,
      toDate,
      totalDays,
      reason: formData.get("reason") as string,
      status: "Pending",
      appliedDate: new Date().toISOString(),
      updatedAt: Date.now()
    }

    try {
      await push(ref(database, `Institutes/${adminUid}/leave-requests`), requestData)
      toast({ title: "Request Submitted", description: "Your leave application is pending approval." })
      setIsApplyModalOpen(false)
      setFromDate(""); setToDate("");
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to submit request." })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 tracking-[0.2em] animate-pulse">Accessing Leave Registry...</div>

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-32">
      
      {/* 📊 LEAVE BALANCE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.values(leaveStats).map((stat: any) => (
          <Card key={stat.id} className={cn(
            "border-none shadow-sm rounded-3xl bg-white p-6 border-t-4 transition-all hover:shadow-md",
            stat.color
          )}>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-[14px] font-black text-black tracking-widest">{stat.label}</h4>
                <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center">
                  {stat.remaining > 0 ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-rose-500" />}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <BalanceBox label="Total" value={stat.total} />
                <BalanceBox label="Used" value={stat.used} color="text-amber-500" />
                <BalanceBox label="Left" value={stat.remaining} color="text-emerald-600" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-between items-end gap-6">
        <div>
          <h2 className="text-2xl font-black text-black tracking-tight">Leave Management</h2>
          <p className="text-[14px] font-bold text-black tracking-widest">Apply and track your absence requests</p>
        </div>
        <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1e3a8a] hover:bg-[#162e6a] text-white rounded-2xl h-12 px-8 font-black text-[10px] tracking-widest shadow-xl shadow-blue-900/20 active:scale-95 border-none transition-all gap-2">
              <Plus className="w-4 h-4" /> Apply for Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl p-0 border-none rounded-[40px] overflow-hidden bg-white shadow-2xl">
            <div className="bg-[#1e3a8a] p-10 text-white relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
              
              <div className="space-y-4">
                <Badge className="bg-white/10 text-white border-none text-[9px] font-black tracking-widest px-3">New Application</Badge>
                <DialogTitle className="text-3xl font-black tracking-tight">Request Leave</DialogTitle>
                <p className="text-[14px] text-blue-200 font-medium">Institutional absence protocol must be followed.</p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-[10px] font-black text-black tracking-widest ml-1">Leave Type</Label>
                  <Select value={leaveType} onValueChange={setLeaveType} required>
                    <SelectTrigger className="h-12 rounded-2xl border-zinc-100 bg-zinc-50/50">
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAVE_TYPES.map(type => (
                        <SelectItem key={type.id} value={type.label} disabled={leaveStats[type.id].remaining <= 0}>
                          {type.label} ({leaveStats[type.id].remaining} Left)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-black tracking-widest ml-1">From Date</Label>
                  <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} required className="h-12 rounded-2xl border-zinc-100" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-black tracking-widest ml-1">To Date</Label>
                  <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} required className="h-12 rounded-2xl border-zinc-100" />
                </div>
              </div>

              <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100 flex justify-between items-center">
                <span className="text-[10px] font-black text-black tracking-widest">Calculated Duration</span>
                <span className="text-xl font-black text-[#1e3a8a]">{totalDays} Working Days</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-black tracking-widest ml-1">Reason for Absence</Label>
                <Textarea name="reason" placeholder="Briefly describe the reason for your leave..." required className="rounded-2xl border-zinc-100 min-h-[100px]" />
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting || totalDays === 0}
                className="w-full h-14 bg-[#1e3a8a] hover:bg-[#162e6a] text-white rounded-2xl font-black text-[14px] tracking-[0.2em] shadow-xl shadow-blue-900/20 active:scale-95 transition-all border-none"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />} Submit Application
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 📜 LEAVE HISTORY */}
      <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
        <div className="p-8 border-b border-zinc-50 flex items-center gap-3">
          <History className="w-4 h-4 text-black" />
          <h3 className="font-black text-black text-[10px] tracking-[0.2em]">Application History</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50">
              <TableRow>
                <TableHead className="pl-8 text-[10px] font-black h-14">Applied On</TableHead>
                <TableHead className="text-[10px] font-black">Leave Type</TableHead>
                <TableHead className="text-[10px] font-black">From - To</TableHead>
                <TableHead className="text-[10px] font-black text-center">Days</TableHead>
                <TableHead className="text-[10px] font-black">Reason</TableHead>
                <TableHead className="text-right pr-8 text-[10px] font-black">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((row, i) => (
                <TableRow key={i} className="border-zinc-50 group hover:bg-zinc-50/30 transition-all">
                  <TableCell className="pl-8 text-[14px] font-bold text-black font-public-sans">{row.appliedDate ? format(new Date(row.appliedDate), "yyyy-MM-dd") : '-'}</TableCell>
                  <TableCell className="text-[14px] font-bold text-black">{row.leaveType}</TableCell>
                  <TableCell className="text-[14px] text-black">
                    <div className="flex items-center gap-2">
                      <span>{row.fromDate}</span>
                      <ChevronRight className="w-3 h-3 text-zinc-200" />
                      <span>{row.toDate}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-black text-black">{row.totalDays}</TableCell>
                  <TableCell className="max-w-[250px] truncate text-[14px] text-black font-medium italic" title={row.reason}>"{row.reason}"</TableCell>
                  <TableCell className="text-right pr-8">
                    <Badge className={cn(
                      "rounded-lg px-3 py-1 text-[9px] font-black  border-none shadow-none",
                      row.status === 'Approved' ? "bg-emerald-50 text-emerald-600" :
                      row.status === 'Rejected' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {row.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow><TableCell colSpan={6} className="h-48 text-center text-zinc-300 italic">No leave requests found in history</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

    </main>
  )
}

function BalanceBox({ label, value, color }: any) {
  return (
    <div className="bg-zinc-50/50 p-3 rounded-2xl border border-zinc-100/50 text-center">
      <p className="text-[8px] font-black text-zinc-300 tracking-widest mb-1">{label}</p>
      <p className={cn("text-lg font-black tracking-tight", color || "text-black")}>{value}</p>
    </div>
  )
}

function DashboardTabTrigger({ value, label, icon }: any) {
  return (
    <TabsTrigger 
      value={value} 
      className="h-11 px-6 rounded-xl data-[state=active]:bg-[#1e3a8a] data-[state=active]:text-white text-black font-bold text-[10px] tracking-widest transition-all border border-transparent data-[state=active]:shadow-lg"
    >
      <span className="flex items-center gap-2">{icon} {label}</span>
    </TabsTrigger>
  )
}
