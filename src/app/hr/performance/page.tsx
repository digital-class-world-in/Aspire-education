
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  Star, 
  Award, 
  TrendingUp, 
  Users, 
  Search, 
  Plus, 
  X, 
  Edit2, 
  Trash2,
  Trophy,
  Activity,
  UserCheck,
  History,
  ShieldCheck
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off, push, set, remove, update } from "firebase/database"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"

export default function StaffPerformancePage() {
  const pathname = usePathname()
  const isPortal = pathname.startsWith('/staff') || pathname.startsWith('/student') || pathname.startsWith('/branch')

  const { database } = useFirebase()
  const { user } = useUser()
  const [employees, setEmployees] = useState<any[]>([])
  const [appraisals, setAppraisals] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedStaffId, setSelectedStaffId] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!database || !user) return
    const rootPath = `Institutes/${user.uid}`
    
    // Fetch Employees
    onValue(ref(database, `${rootPath}/employees`), (snapshot) => {
      const data = snapshot.val()
      if (data) setEmployees(Object.keys(data).map(k => ({ ...data[k], id: k })))
      else setEmployees([])
    })

    // Fetch Appraisals
    onValue(ref(database, `${rootPath}/appraisals`), (snapshot) => {
      const data = snapshot.val()
      if (data) setAppraisals(Object.keys(data).map(k => ({ ...data[k], id: k })).reverse())
      else setAppraisals([])
      setIsLoading(false)
    })
  }, [database, user])

  const handleSaveAppraisal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user || !database || !selectedStaffId) return

    const formData = new FormData(e.currentTarget)
    const staff = employees.find(emp => emp.id === selectedStaffId)
    
    const appraisalData = {
      staffId: selectedStaffId,
      staffName: `${staff?.firstName} ${staff?.lastName}`,
      rating: formData.get("rating") as string,
      period: formData.get("period") as string,
      achievements: formData.get("achievements") as string,
      remarks: formData.get("remarks") as string,
      date: new Date().toISOString().split('T')[0],
      createdAt: Date.now()
    }

    push(ref(database, `Institutes/${user.uid}/appraisals`), appraisalData)
      .then(() => {
        toast({ title: "Appraisal Recorded" })
        setIsModalOpen(false)
        setSelectedStaffId("")
      })
  }

  const handleDelete = (id: string) => {
    if (database && user) {
      remove(ref(database, `Institutes/${user.uid}/appraisals/${id}`))
    }
  }

  const mainContent = (
    <main className="flex-1 p-8 space-y-8 animate-in fade-in duration-500 w-full overflow-x-hidden font-public-sans text-black">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h2 className="text-3xl font-black text-black font-public-sans tracking-tight">Staff Performance</h2>
          <p className="text-[14px] text-black font-medium mt-1">Record appraisals and track institutional excellence</p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsModalOpen(true)} className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-8 font-bold text-[14px] gap-2 border-none shadow-lg active:scale-95 transition-all">
              <Plus className="h-4 w-4" /> New Appraisal
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] sm:max-w-xl p-0 border border-zinc-200 rounded-[32px] overflow-hidden bg-white shadow-2xl max-h-[95vh] flex flex-col">
            <div className="overflow-y-auto flex-1 w-full scrollbar-thin scrollbar-thumb-zinc-200 text-black">
              <div className="bg-white px-10 py-8 border-b border-zinc-100 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
                <div className="space-y-4">
                  <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black tracking-widest px-3">Quality Control</Badge>
                  <DialogTitle className="text-2xl font-black tracking-tight">Faculty Appraisal</DialogTitle>
                  <p className="text-[14px] text-black font-bold tracking-widest">Rate staff performance & milestones</p>
                </div>
              </div>
              <form onSubmit={handleSaveAppraisal} className="p-10 space-y-6">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-black tracking-widest ml-1">Select Staff Member</Label>
                  <Select value={selectedStaffId} onValueChange={setSelectedStaffId} required>
                    <SelectTrigger className="h-12 rounded-2xl border-zinc-100 bg-zinc-50/50 font-bold">
                      <SelectValue placeholder="Search faculty..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-zinc-100 shadow-xl">
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id} className="font-bold">{emp.firstName} {emp.lastName} ({emp.designation})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-black tracking-widest ml-1">Performance Rating</Label>
                    <Select name="rating" defaultValue="5" required>
                      <SelectTrigger className="h-12 rounded-2xl border-zinc-100 bg-zinc-50/50 font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl border-zinc-100 shadow-xl">
                        <SelectItem value="5" className="font-bold">Excellent (5 Stars)</SelectItem>
                        <SelectItem value="4" className="font-bold">Very Good (4 Stars)</SelectItem>
                        <SelectItem value="3" className="font-bold">Good (3 Stars)</SelectItem>
                        <SelectItem value="2" className="font-bold">Average (2 Stars)</SelectItem>
                        <SelectItem value="1" className="font-bold">Below Average (1 Star)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-black tracking-widest ml-1">Review Period</Label>
                    <Input name="period" placeholder="e.g. Q1 2024" required className="h-12 rounded-2xl border-zinc-100 font-bold" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-black tracking-widest ml-1">Key Achievements</Label>
                  <Input name="achievements" placeholder="Major milestones reached..." className="h-12 rounded-2xl border-zinc-100 font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-black tracking-widest ml-1">HR Remarks</Label>
                  <Input name="remarks" placeholder="Notes for official record..." className="h-12 rounded-2xl border-zinc-100 font-bold" />
                </div>
                <Button type="submit" className="w-full h-14 bg-zinc-900 text-white rounded-2xl font-black text-[10px] tracking-[0.2em] shadow-xl transition-all active:scale-95 border-none mt-4">Save Performance Data</Button>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <MetricCard label="Average Rating" value="4.8/5" icon={<Star className="text-amber-500" />} />
        <MetricCard label="Total Appraisals" value={appraisals.length} icon={<Trophy className="text-blue-500" />} />
        <MetricCard label="System Compliance" value="100%" icon={<ShieldCheck className="text-emerald-500" />} />
      </div>

      <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
        <div className="p-8 border-b border-zinc-50">
          <div className="relative w-80">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-black" />
            <Input 
              placeholder="Search performance logs..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 h-11 bg-zinc-50 border-none rounded-xl text-[14px] font-bold"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="border-zinc-100">
                <TableHead className="text-[11px] font-black text-black tracking-widest h-14 pl-8">SR NO.</TableHead>
                <TableHead className="text-[11px] font-black text-black tracking-widest h-14">Staff Member</TableHead>
                <TableHead className="text-[11px] font-black text-black tracking-widest h-14">Period</TableHead>
                <TableHead className="text-[11px] font-black text-black tracking-widest h-14 text-center">Rating</TableHead>
                <TableHead className="text-[11px] font-black text-black tracking-widest h-14">Achievements</TableHead>
                <TableHead className="text-right pr-8 text-[11px] font-black text-black tracking-widest h-14">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appraisals.map((item, idx) => (
                <TableRow key={item.id} className="border-zinc-50 group hover:bg-zinc-50/20 transition-none">
                  <TableCell className="text-[14px] font-bold text-black pl-8">{idx + 1}</TableCell>
                  <TableCell><span className="text-[14px] font-black text-black font-public-sans">{item.staffName}</span></TableCell>
                  <TableCell><span className="text-[14px] font-bold text-black">{item.period}</span></TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-[14px] font-black text-black">{item.rating}/5</span>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-[14px] text-black font-bold max-w-[250px] truncate">{item.achievements || '-'}</span></TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-9 w-9 text-rose-500 hover:bg-rose-50 rounded-xl transition-all border-none">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {appraisals.length === 0 && (
                <TableRow><TableCell colSpan={6} className="h-48 text-center text-zinc-300 italic">No appraisal history found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </main>
  )

  if (isPortal) return mainContent

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans overflow-x-hidden">
      <Sidebar />
      <div className="lg:pl-[300px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        {mainContent}
      </div>
    </div>
  )
}

function MetricCard({ label, value, icon }: any) {
  return (
    <Card className="border border-zinc-100 shadow-sm rounded-[24px] bg-white p-8 group hover:shadow-md transition-all">
      <div className="flex flex-col gap-4">
        <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center transition-colors group-hover:bg-white shadow-inner">
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-black text-black tracking-widest mb-1">{label}</p>
          <h4 className="text-2xl font-black text-black tracking-tight">{value}</h4>
        </div>
      </div>
    </Card>
  )
}
