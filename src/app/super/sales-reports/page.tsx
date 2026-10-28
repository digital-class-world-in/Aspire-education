
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Filter,
  Download,
  Share2,
  Phone,
  BarChart3,
  PieChart as PieChartIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText
} from "lucide-react"
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Label
} from 'recharts'
import { useFirebase } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function SalesReportPage() {
  const { database } = useFirebase()
  const [institutes, setInstitutes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Filters
  const [selectedAsm, setSelectedAsm] = useState("all")
  const [dateRange, setDateRange] = useState("all")
  const [planType, setPlanType] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (!database) return
    const projectsRef = ref(database, 'MasterProjects')
    onValue(projectsRef, (snapshot) => {
      const data = snapshot.val() || {}
      const list = Object.keys(data).map(k => ({
        id: k,
        instituteName: data[k].businessName,
        asmName: data[k].asmName || 'Direct',
        currentPlan: data[k].planType,
        receivedAmount: Number(data[k].receivedAmount || 0),
        status: 'Active',
        planExpiryDate: data[k].renewalDate || data[k].expectedDeliveryDate,
        email: data[k].clientEmail
      }))
      setInstitutes(list)
      setIsLoading(false)
    })
  }, [database])

  const asms = useMemo(() => {
    const unique = new Set(institutes.map(i => i.asmName))
    return Array.from(unique).filter(Boolean)
  }, [institutes])

  const reportData = useMemo(() => {
    return institutes.filter(i => {
      const matchAsm = selectedAsm === 'all' || i.asmName === selectedAsm
      const matchPlan = planType === 'all' || i.currentPlan === planType
      const matchSearch = !searchTerm || i.instituteName?.toLowerCase().includes(searchTerm.toLowerCase())
      return matchAsm && matchPlan && matchSearch
    })
  }, [institutes, selectedAsm, planType, searchTerm])

  const stats = useMemo(() => {
    const totalRevenue = reportData.reduce((sum, i) => sum + (Number(i.profile?.receivedAmount || 0)), 0)
    const activeSubs = reportData.filter(i => i.status === 'Active').length
    const renewals = 0 // Mock for now
    return {
      totalClients: reportData.length,
      totalRevenue,
      activeSubs,
      renewals
    }
  }, [reportData])

  const chartData = [
    { name: 'Jan', sales: 4000 },
    { name: 'Feb', sales: 3000 },
    { name: 'Mar', sales: 2000 },
    { name: 'Apr', sales: 2780 },
    { name: 'May', sales: 1890 },
    { name: 'Jun', sales: 2390 },
  ]

  const planDist = [
    { name: 'Basic', value: reportData.filter(i => i.currentPlan === 'Basic').length || 10 },
    { name: 'Standard', value: reportData.filter(i => i.currentPlan === 'Standard').length || 5 },
    { name: 'Premium', value: reportData.filter(i => i.currentPlan === 'Premium').length || 2 },
  ]

  const handleExportPdf = () => {
    const doc = new jsPDF()
    doc.setFontSize(20)
    doc.text(`Sales Report - ${selectedAsm === 'all' ? 'All ASMs' : selectedAsm}`, 14, 22)
    doc.setFontSize(10)
    doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, 30)

    autoTable(doc, {
      startY: 40,
      head: [['Client Name', 'Plan', 'Email', 'Amount', 'Status']],
      body: reportData.map(i => [
        i.instituteName,
        i.currentPlan || 'Basic',
        i.email,
        `INR ${i.receivedAmount || 0}`,
        i.status
      ]),
    })
    doc.save(`Sales_Report_${selectedAsm}.pdf`)
  }

  const handleShareWhatsApp = () => {
    const message = `Sales Report for ${selectedAsm === 'all' ? 'All ASMs' : selectedAsm}\n\nTotal Clients: ${stats.totalClients}\nTotal Revenue: ₹${stats.totalRevenue}\n\nView Full Report: ${window.location.href}`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-body">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">Sales Report</h1>
          <p className="text-sm text-black font-medium">Performance tracking for ASMs and Sales Team</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleExportPdf} variant="outline" className="rounded-xl gap-2 border-slate-200 bg-white text-slate-600 shadow-sm">
            <Download className="h-4 w-4" /> Export PDF
          </Button>
          <Button onClick={handleShareWhatsApp} variant="outline" className="rounded-xl gap-2 border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 shadow-sm">
            <Share2 className="h-4 w-4" /> Share WhatsApp
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardContent className="p-5 flex flex-wrap items-center gap-4">
          <div className="w-[200px]">
            <Label className="text-[10px] font-black text-slate-400   ml-1 mb-1.5 block">Select ASM</Label>
            <Select value={selectedAsm} onValueChange={setSelectedAsm}>
              <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50/50">
                <SelectValue placeholder="All ASMs" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="all">All ASMs</SelectItem>
                {asms.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-[180px]">
            <Label className="text-[10px] font-black text-slate-400   ml-1 mb-1.5 block">Plan Type</Label>
            <Select value={planType} onValueChange={setPlanType}>
              <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50/50">
                <SelectValue placeholder="All Plans" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="Basic">Basic SaaS</SelectItem>
                <SelectItem value="Standard">Standard</SelectItem>
                <SelectItem value="Premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[250px]">
            <Label className="text-[10px] font-black text-slate-400   ml-1 mb-1.5 block">Search Client</Label>
            <div className="relative group">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <Input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by institute name..." 
                className="pl-10 h-10 rounded-xl border-slate-200 bg-slate-50/50" 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard title="Total Clients" value={stats.totalClients} icon={<Users className="w-5 h-5" />} color="text-indigo-600" bg="bg-indigo-50" />
        <SummaryCard title="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} color="text-emerald-600" bg="bg-emerald-50" />
        <SummaryCard title="Active Subs" value={stats.activeSubs} icon={<TrendingUp className="w-5 h-5" />} color="text-blue-600" bg="bg-blue-50" />
        <SummaryCard title="Total Renewals" value={stats.renewals} icon={<Calendar className="w-5 h-5" />} color="text-amber-600" bg="bg-amber-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm rounded-[32px] bg-white overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-black">Sales Performance</h3>
              <p className="text-xs text-black font-medium tracking-tight">Onboarding trends over time</p>
            </div>
            <BarChart3 className="w-5 h-5 text-black" />
          </div>
          <div className="p-8 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: '700' }}
                />
                <Line type="monotone" dataKey="sales" stroke="#4f46e5" strokeWidth={4} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Plan Dist */}
        <Card className="border-slate-200 shadow-sm rounded-[32px] bg-white overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Plan Distribution</h3>
              <p className="text-xs text-slate-500 font-medium tracking-tight">SaaS vs Enterprise</p>
            </div>
            <PieChartIcon className="w-5 h-5 text-slate-300" />
          </div>
          <div className="p-8 h-[350px] flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={planDist} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value">
                  {planDist.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-black">{reportData.length}</span>
              <span className="text-[10px] font-bold text-black  ">Total Nodes</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card className="border-slate-200 shadow-sm rounded-[32px] overflow-hidden bg-white">
        <div className="p-8 border-b border-slate-50 bg-slate-50/10">
           <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-black">Detailed Onboarding List</h3>
            <Badge variant="secondary" className="rounded-lg px-3 py-1 bg-white border border-slate-200 shadow-sm text-black font-bold">{reportData.length} Records</Badge>
           </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100 h-14">
                <TableHead className="px-8 text-xs font-black text-black  ">Client Name</TableHead>
                <TableHead className="text-xs font-black text-black  ">ASM</TableHead>
                <TableHead className="text-xs font-black text-black  ">Plan</TableHead>
                <TableHead className="text-xs font-black text-black  ">Amount</TableHead>
                <TableHead className="text-xs font-black text-black  ">Expiry</TableHead>
                <TableHead className="px-8 text-xs font-black text-black   text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.map((client) => (
                <TableRow key={client.id} className="border-slate-100 group hover:bg-slate-50/50 transition-colors h-20">
                  <TableCell className="px-8 font-bold text-sm text-black">{client.instituteName}</TableCell>
                  <TableCell className="font-medium text-xs text-black">{client.asmName}</TableCell>
                  <TableCell className="font-bold text-xs text-indigo-600">{client.currentPlan || 'Basic'}</TableCell>
                  <TableCell className="font-black text-sm text-black">₹{client.receivedAmount || 0}</TableCell>
                  <TableCell className="font-medium text-xs text-black">{client.planExpiryDate || '-'}</TableCell>
                  <TableCell className="px-8 text-center">
                    <Badge className={cn(
                      "rounded-lg px-2.5 py-0.5 text-[10px] font-bold border-none",
                      client.status === 'Active' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                      {client.status || 'Active'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}

function SummaryCard({ title, value, icon, color, bg }: any) {
  return (
    <Card className="border-slate-200 shadow-sm rounded-[24px] bg-white transition-all hover:shadow-xl hover:shadow-indigo-900/5 group cursor-default">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform", bg, color)}>
            {icon}
          </div>
          <div className="flex flex-col items-end">
             <span className="text-[10px] font-black text-black   ml-1">{title}</span>
             <h4 className="text-2xl font-black text-black mt-1">{value}</h4>
          </div>
        </div>
        <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full w-2/3", bg.replace('bg-', 'bg-opacity-100 bg-'))} style={{ backgroundColor: color === 'text-indigo-600' ? '#4f46e5' : color === 'text-emerald-600' ? '#10b981' : color === 'text-blue-600' ? '#3b82f6' : '#f59e0b' }} />
        </div>
      </CardContent>
    </Card>
  )
}
