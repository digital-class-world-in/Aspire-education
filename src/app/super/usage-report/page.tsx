
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart3, 
  Building2, 
  Users, 
  GraduationCap, 
  GitBranch, 
  ChevronRight, 
  Search, 
  Download,
  Filter,
  Eye,
  TrendingUp,
  Activity,
  ArrowUpRight,
  UserPlus,
  Network,
  Layers,
  Mail,
  Phone,
  MapPin,
  User,
  Calendar,
  CreditCard,
  Package,
  Info,
  Clock,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  Edit,
  Trash2
} from "lucide-react"
import { useFirebase } from "@/firebase"
import { ref, onValue, off, get } from "firebase/database"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import * as XLSX from "xlsx"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogClose 
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"

export default function UsageReportPage() {
  const { database } = useFirebase()
  const [institutes, setInstitutes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedInst, setSelectedInst] = useState<any>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailedStats, setDetailedStats] = useState<any>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  // Quick stats overview
  const [globalStats, setGlobalStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalBranches: 0,
    totalBatches: 0,
    activeInstitutes: 0
  })

  useEffect(() => {
    if (!database) return
    const instRef = ref(database, 'Institutes')
    const unsubscribe = onValue(instRef, (snapshot) => {
      const data = snapshot.val() || {}
      const list = Object.keys(data).map(k => ({
        id: k,
        ...data[k].profile,
        stats: data[k].Stats || {},
        allData: data[k]
      }))
      
      list.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      })

      setInstitutes(list)
      setIsLoading(false)
      
      // Calculate global basic stats
      const s = list.reduce((acc, curr) => acc + (Number(curr.stats?.totalStudents) || 0), 0)
      const b = list.reduce((acc, curr) => acc + (Number(curr.stats?.branches) || 1), 0)
      const batches = list.reduce((acc, curr) => acc + (curr.allData?.batches ? Object.keys(curr.allData.batches).length : 0), 0)
      const active = list.filter(i => i.status === 'Active').length
      
      setGlobalStats(prev => ({
        ...prev,
        totalStudents: s,
        totalBranches: b,
        totalBatches: batches,
        activeInstitutes: active
      }))
    })

    return () => off(instRef)
  }, [database])

  const filtered = useMemo(() => {
    return institutes.filter(i => 
      i.instituteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [institutes, searchTerm])

  const handleViewReport = async (inst: any) => {
    setSelectedInst(inst)
    setIsDetailOpen(true)
    setIsCalculating(true)
    setDetailedStats(null)

    if (!database) return

    try {
      // Fetch detailed counts specifically for this institute
      const paths = [
        `Institutes/${inst.id}/admissions`,
        `Institutes/${inst.id}/employees`,
        `Institutes/${inst.id}/branches`,
        `Institutes/${inst.id}/batches`
      ]

      const results = await Promise.all(paths.map(p => get(ref(database, p))))
      
      const studentData = results[0].val() || {}
      const teacherData = results[1].val() || {}
      const branchData = results[2].val() || {}
      const batchData = results[3].val() || {}

      const studentsCount = Object.keys(studentData).length
      const staffCount = Object.keys(teacherData).length
      const branchesCount = Object.keys(branchData).length || 1
      const batchesCount = Object.keys(batchData).length

      setDetailedStats({
        students: studentsCount,
        staff: staffCount,
        branches: branchesCount,
        batches: batchesCount,
        lastActive: inst.statusUpdatedAt ? format(new Date(inst.statusUpdatedAt), "PPP") : "No recent activity"
      })
    } catch (e) {
      console.error("Error fetching detailed stats:", e)
    } finally {
      setIsCalculating(false)
    }
  }

  const exportData = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(i => ({
      "Institute Name": i.instituteName,
      "Owner": i.fullName,
      "Email": i.email,
      "Plan": i.currentPlan,
      "Students": i.stats?.totalStudents || 0,
      "Branches": i.stats?.branches || 1,
      "Batches": i.allData?.batches ? Object.keys(i.allData.batches).length : 0,
      "Status": i.status,
      "Joined On": i.createdAt ? format(new Date(i.createdAt), "PPP") : "N/A"
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "UsageReport")
    XLSX.writeFile(wb, "SaaS_Usage_Report.xlsx")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Gathering platform data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-public-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-black tracking-tight flex items-center gap-3">
            <Activity className="w-6 h-6 text-indigo-600" />
            Institute Usage Report
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Detailed consumption metrics for all registered institutes</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={exportData} className="h-10 px-4 rounded-xl font-medium text-sm gap-2 border-slate-200 bg-white text-black hover:bg-slate-50 shadow-sm transition-all active:scale-95">
            <Download className="w-4 h-4" /> Export Excel
          </Button>
        </div>
      </div>

      {/* Global Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <UsageMetricCard 
          label="Total Students" 
          value={globalStats.totalStudents.toLocaleString()} 
          icon={<Users className="w-5 h-5" />} 
          color="indigo"
          trend="Real-time count"
        />
        <UsageMetricCard 
          label="Total Batches" 
          value={globalStats.totalBatches.toLocaleString()} 
          icon={<Layers className="w-5 h-5" />} 
          color="blue"
          trend="Across all nodes"
        />
        <UsageMetricCard 
          label="Active Branches" 
          value={globalStats.totalBranches.toLocaleString()} 
          icon={<GitBranch className="w-5 h-5" />} 
          color="emerald"
          trend="Live nodes"
        />
        <UsageMetricCard 
          label="Active Subscriptions" 
          value={globalStats.activeInstitutes.toLocaleString()} 
          icon={<Network className="w-5 h-5" />} 
          color="rose"
          trend="Currently active"
        />
      </div>

      {/* Filter and Search */}
      <Card className="border-slate-200 shadow-sm rounded-2xl bg-white p-1">
        <CardContent className="p-3">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-4 top-3 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <Input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by institute, owner, or email..." 
                className="pl-11 h-10 rounded-xl border-none bg-slate-50 font-medium text-black focus-visible:ring-indigo-600/20" 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="border-slate-100 hover:bg-transparent">
              <TableHead className="text-xs font-semibold text-slate-500 px-6 py-4">Sr.</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 px-6 py-4">Institute Details</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 px-6 py-4 text-center">Plan Tier</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 px-6 py-4 text-center">Students</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 px-6 py-4 text-center">Branches</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 px-6 py-4 text-center">Created Batches</TableHead>
              <TableHead className="text-right px-6 py-4 text-xs font-semibold text-slate-500">Report</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((inst, idx) => (
              <TableRow key={inst.id} className="border-slate-50 group hover:bg-slate-50 transition-all duration-200">
                <TableCell className="px-6 py-4 text-sm font-medium text-slate-400">
                  {idx + 1}
                </TableCell>
                <TableCell className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100/50 group-hover:scale-105 transition-transform duration-300">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-semibold text-black leading-tight">{inst.instituteName}</h4>
                      <p className="text-[12px] font-medium text-slate-500 mt-0.5">{inst.fullName}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4 text-center">
                  <Badge variant="secondary" className={cn(
                    "rounded-lg px-2.5 py-0.5 text-[11px] font-medium border-none shadow-none",
                    inst.currentPlan?.toLowerCase().includes('white') ? "bg-amber-50 text-amber-700" :
                    inst.currentPlan?.toLowerCase().includes('pro') ? "bg-indigo-50 text-indigo-700" : 
                    "bg-slate-100 text-slate-600"
                  )}>
                    {inst.currentPlan || 'Not Assigned'}
                  </Badge>
                </TableCell>
                <TableCell className="px-6 py-4 text-center">
                   <div className="inline-flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    <Users className="w-3 h-3 text-emerald-600" />
                    <span className="text-[13px] font-medium text-emerald-700">{inst.stats?.totalStudents || 0}</span>
                   </div>
                </TableCell>
                <TableCell className="px-6 py-4 text-center">
                   <div className="inline-flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                    <GitBranch className="w-3 h-3 text-indigo-600" />
                    <span className="text-[13px] font-medium text-indigo-700">{inst.stats?.branches || 1}</span>
                   </div>
                </TableCell>
                <TableCell className="px-6 py-4 text-center">
                   <div className="inline-flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                    <Layers className="w-3 h-3 text-blue-600" />
                    <span className="text-[13px] font-medium text-blue-700">{inst.allData?.batches ? Object.keys(inst.allData.batches).length : 0} Batches</span>
                   </div>
                </TableCell>
                <TableCell className="px-6 py-4 text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleViewReport(inst)}
                    className="h-9 px-4 rounded-lg font-medium text-[13px] text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-all"
                  >
                    View Report <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Report Dialog - Redesigned CRM Style */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-5xl p-0 overflow-y-auto border border-slate-200 rounded-[32px] bg-white font-public-sans shadow-2xl flex flex-col max-h-[92vh]">
           
           {/* Top Date Header */}
           <div className="bg-white px-8 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
              <span className="text-[13px] font-semibold text-slate-500">
                {format(new Date(), "eeee, MMMM do, yyyy")}
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] text-white font-bold">A</div>
                  <span className="text-[12px] font-semibold text-slate-600">superadmin@digitalclass.com</span>
                </div>
              </div>
           </div>

           <div className="overflow-y-auto flex-1">
             {/* Profile Header Section */}
             <div className="bg-[#F8FAFC]/50 p-8 flex flex-col lg:flex-row gap-8 border-b border-slate-100">
                {/* Left: Avatar & Primary Info */}
                <div className="flex-1 flex gap-6">
                    <div className="w-24 h-24 rounded-[28px] bg-white shadow-xl shadow-indigo-100/50 flex items-center justify-center text-3xl font-bold text-indigo-600 border border-slate-100 shrink-0">
                      {selectedInst?.instituteName?.charAt(0)}
                    </div>
                    <div className="space-y-2 py-1">
                      <h2 className="text-3xl font-bold text-black tracking-tight">{selectedInst?.instituteName}</h2>
                      <p className="text-[15px] font-medium text-slate-500 flex items-center gap-2">
                        <Mail className="w-4 h-4" /> {selectedInst?.email}
                      </p>
                      <p className="text-[15px] font-medium text-slate-500 flex items-center gap-2">
                        <Phone className="w-4 h-4" /> {selectedInst?.phone || "+91 9876543210"}
                      </p>
                      <div className="pt-2 flex flex-wrap gap-x-6 gap-y-2">
                        <span className="text-[13px] font-medium text-slate-400">Owner: <span className="text-slate-600">{selectedInst?.fullName}</span></span>
                        <span className="text-[13px] font-medium text-slate-400">Joined: <span className="text-slate-600">{selectedInst?.createdAt ? format(new Date(selectedInst.createdAt), "PPP") : 'N/A'}</span></span>
                        <span className="text-[13px] font-medium text-slate-400">Last Active: <span className="text-slate-600">{detailedStats?.lastActive || 'Just now'}</span></span>
                      </div>
                    </div>
                </div>

                {/* Right: Status & Actions */}
                <div className="flex flex-col md:flex-row lg:flex-col gap-4 min-w-[300px]">
                   <div className="flex-1 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-100 transition-all">
                      <div>
                        <p className="text-[11px] font-bold text-slate-400  tracking-wider">Account Status</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className={cn("w-2 h-2 rounded-full animate-pulse", selectedInst?.status === 'Active' ? "bg-emerald-500" : "bg-rose-500")} />
                          <span className="text-[15px] font-bold text-black">{selectedInst?.status || 'Active'}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-slate-300 hover:text-indigo-600">
                        <ChevronDown className="w-5 h-5" />
                      </Button>
                   </div>
                   <div className="flex-1 bg-amber-50/30 p-5 rounded-2xl border border-amber-100/50 shadow-sm flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                         <p className="text-[11px] font-bold text-amber-600/70  tracking-wider">Next Renewal</p>
                         <p className="text-[15px] font-bold text-amber-900 mt-0.5">May 21st, 2026</p>
                         <p className="text-[12px] font-medium text-amber-600/60">No pending payments</p>
                      </div>
                   </div>
                </div>
             </div>

             {/* Navigation Tabs */}
             <Tabs defaultValue="overview" className="w-full">
                <div className="px-8 border-b border-slate-100 bg-white sticky top-0 z-10">
                  <TabsList className="h-14 bg-transparent p-0 gap-8 justify-start">
                    <TabsTrigger value="overview" className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 px-1 text-[14px] font-bold text-slate-500 shadow-none transition-none">Overview</TabsTrigger>
                    <TabsTrigger value="usage" className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 px-1 text-[14px] font-bold text-slate-500 shadow-none transition-none">Resource Usage</TabsTrigger>
                    <TabsTrigger value="billing" className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 px-1 text-[14px] font-bold text-slate-500 shadow-none transition-none">Billing & Plan</TabsTrigger>
                    <TabsTrigger value="activity" className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 px-1 text-[14px] font-bold text-slate-500 shadow-none transition-none">Activity Log</TabsTrigger>
                  </TabsList>
                </div>

                {/* Overview Content */}
                <TabsContent value="overview" className="m-0 p-8 space-y-8 animate-in fade-in duration-500">
                   <div className="flex items-center justify-between">
                     <h3 className="text-xl font-bold text-black flex items-center gap-2">
                        Institute Information
                     </h3>
                     <Button variant="outline" className="h-9 px-4 rounded-lg border-slate-200 text-[13px] font-bold gap-2 hover:bg-slate-50">
                        <Edit className="w-3.5 h-3.5" /> Edit Information
                     </Button>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-bold text-slate-400 pl-1">Primary Owner Name</label>
                        <div className="h-12 w-full px-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center text-[14px] font-semibold text-black">
                          {selectedInst?.fullName}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-bold text-slate-400 pl-1">Current Implementation Tier</label>
                        <div className="h-12 w-full px-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center text-[14px] font-semibold text-black">
                           {selectedInst?.currentPlan || 'Starter Website'}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-bold text-slate-400 pl-1">Institute Portal URL</label>
                        <div className="h-12 w-full px-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-[14px] font-semibold text-black">
                          <span>{selectedInst?.slug ? `${selectedInst.slug}.digitalclass.org` : 'Not configured'}</span>
                          <ExternalLink className="w-4 h-4 text-slate-300" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-bold text-slate-400 pl-1">Primary Support Contact</label>
                        <div className="h-12 w-full px-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center text-[14px] font-semibold text-black italic">
                          {selectedInst?.phone || 'No phone provided'}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-bold text-slate-400 pl-1">Registered Address</label>
                        <div className="h-12 w-full px-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center text-[14px] font-semibold text-black">
                          {selectedInst?.address || 'Not specified in profile'}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-bold text-slate-400 pl-1">Account Creation Type</label>
                        <div className="h-12 w-full px-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center text-[14px] font-semibold text-black">
                           Manual Administration Signup
                        </div>
                      </div>
                   </div>

                   {/* Quick Snapshot Metrics */}
                   <div className="pt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-3">
                         <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Users className="w-5 h-5" />
                         </div>
                         <div>
                            <p className="text-[20px] font-bold text-black">{detailedStats?.students || 0}</p>
                            <p className="text-[12px] font-bold text-slate-400  ">Students</p>
                         </div>
                      </div>
                      <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-3">
                         <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <Layers className="w-5 h-5" />
                         </div>
                         <div>
                            <p className="text-[20px] font-bold text-black">{detailedStats?.batches || 0}</p>
                            <p className="text-[12px] font-bold text-slate-400  ">Batches</p>
                         </div>
                      </div>
                      <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-3">
                         <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <GitBranch className="w-5 h-5" />
                         </div>
                         <div>
                            <p className="text-[20px] font-bold text-black">{detailedStats?.branches || 1}</p>
                            <p className="text-[12px] font-bold text-slate-400  ">Branches</p>
                         </div>
                      </div>
                      <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-3">
                         <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                            <ArrowUpRight className="w-5 h-5" />
                         </div>
                         <div>
                            <p className="text-[20px] font-bold text-black">94%</p>
                            <p className="text-[12px] font-bold text-slate-400  ">Activity Score</p>
                         </div>
                      </div>
                   </div>
                </TabsContent>

                {/* Usage Analytics Content */}
                <TabsContent value="usage" className="m-0 p-8 space-y-6 animate-in fade-in duration-500">
                   {isCalculating ? (
                      <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-slate-500 font-medium">Synchronizing live data nodes...</p>
                      </div>
                   ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DetailStatCard label="Student Admissions" value={detailedStats?.students || 0} icon={<GraduationCap className="w-5 h-5" />} sub="Unique student IDs" />
                        <DetailStatCard label="Faculty & Staff" value={detailedStats?.staff || 0} icon={<UserPlus className="w-5 h-5" />} sub="Active employee records" />
                        <DetailStatCard label="Academic Batches" value={detailedStats?.batches || 0} icon={<Layers className="w-5 h-5" />} sub="Course groups managed" />
                        <DetailStatCard label="Physical Branches" value={detailedStats?.branches || 1} icon={<Building2 className="w-5 h-5" />} sub="Independent locations" />
                        
                        <div className="md:col-span-2 bg-slate-50 p-6 rounded-[24px] border border-slate-100 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-black text-lg">System Resource Utilization</h4>
                            <Badge className="bg-white border-slate-200 text-indigo-600 px-3">Standard Plan</Badge>
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between text-[13px] font-bold text-slate-500">
                              <span>Node Synchronization</span>
                              <span>Optimized</span>
                            </div>
                            <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-slate-200 shadow-inner">
                              <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full" style={{ width: '85%' }} />
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium">Metric based on API polling frequency and database interactions.</p>
                          </div>
                        </div>
                     </div>
                   )}
                </TabsContent>

                <TabsContent value="billing" className="m-0 p-8 animate-in fade-in duration-500">
                   <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                        <CreditCard className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xl font-bold text-black">Billing module initialization</h4>
                        <p className="text-slate-500 font-medium max-w-sm">This module is currently being synchronized with the revenue hub for real-time invoice tracking.</p>
                      </div>
                   </div>
                </TabsContent>

                <TabsContent value="activity" className="m-0 p-8 animate-in fade-in duration-500">
                   <div className="space-y-6">
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-indigo-600 border border-slate-100">
                          <Network className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[14px] font-bold text-black">Platform Registration Verified</p>
                          <p className="text-[12px] font-medium text-slate-500">{detailedStats?.lastActive || 'Today'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 opacity-60">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[14px] font-bold text-black border-slate-100">Plan Activated: {selectedInst?.currentPlan || 'Starter'}</p>
                          <p className="text-[12px] font-medium text-slate-500">System generated log</p>
                        </div>
                      </div>
                   </div>
                </TabsContent>
             </Tabs>
           </div>

           {/* Footer Action Bar */}
           <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between sticky bottom-0 z-20">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-slate-400"><Trash2 className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="text-slate-400"><TrendingUp className="w-4 h-4" /></Button>
              </div>
              <div className="flex gap-3">
                <DialogClose asChild>
                  <Button variant="ghost" className="h-11 px-6 rounded-xl text-slate-500 font-bold text-[14px]">
                    Close Report
                  </Button>
                </DialogClose>
                <Button className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-slate-900 text-white font-bold text-[14px] shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2">
                  <Download className="w-4 h-4" /> Download Audit PDF
                </Button>
              </div>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function UsageMetricCard({ label, value, icon, color, trend }: any) {
  const colors: any = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
  }

  return (
    <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white p-5 group hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110", colors[color])}>
          {icon}
        </div>
        <div className="text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
          {trend}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        <h3 className="text-2xl font-bold text-black mt-1 tracking-tight">{value}</h3>
      </div>
    </Card>
  )
}

function DetailStatCard({ label, value, icon, sub, isStatus }: any) {
  return (
    <div className={cn(
      "p-5 rounded-2xl border transition-all bg-white group hover:shadow-md",
      isStatus ? "border-emerald-100 bg-emerald-50/10" : "border-slate-100"
    )}>
      <div className="flex items-center gap-4">
        <div className={cn(
           "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner",
           isStatus ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
        )}>
          {icon}
        </div>
        <div>
          <p className="text-[12px] font-medium text-slate-500">{label}</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <h4 className="text-[18px] font-bold text-black leading-tight">{value}</h4>
            <span className="text-[10px] font-medium text-slate-400 truncate max-w-[80px]">{sub}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

