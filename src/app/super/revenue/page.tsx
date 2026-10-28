
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Search,
  Download,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Clock
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
  Cell 
} from 'recharts'
import { useFirebase } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function RevenueManagementPage() {
  const { database } = useFirebase()
  const [institutes, setInstitutes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (!database) return
    const projectsRef = ref(database, 'MasterProjects')
    onValue(projectsRef, (snapshot) => {
      const data = snapshot.val() || {}
      const list = Object.keys(data).map(k => ({
        id: k,
        instituteName: data[k].businessName,
        fullName: data[k].clientName,
        currentPlan: data[k].planType,
        totalRevenue: Number(data[k].receivedAmount || 0),
        dueAmount: Number(data[k].dueAmount || 0),
        status: 'Active', // Default for projects in ledger
        planExpiryDate: data[k].renewalDate || data[k].expectedDeliveryDate
      }))
      setInstitutes(list)
      setIsLoading(false)
    })
  }, [database])

  const stats = useMemo(() => {
    const total = institutes.reduce((sum, i) => sum + i.totalRevenue, 0)
    const active = institutes.filter(i => i.status === 'Active').length
    const expired = institutes.filter(i => i.status === 'Expired').length
    const growth = 12.5 // Mock
    return { total, active, expired, growth }
  }, [institutes])

  const filtered = useMemo(() => {
    return institutes.filter(i => 
      i.instituteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [institutes, searchTerm])

  const chartData = [
    { name: 'Mon', revenue: 4000 },
    { name: 'Tue', revenue: 3000 },
    { name: 'Wed', revenue: 2000 },
    { name: 'Thu', revenue: 2780 },
    { name: 'Fri', revenue: 1890 },
    { name: 'Sat', revenue: 2390 },
    { name: 'Sun', revenue: 3490 },
  ]

  const planRevenue = [
    { name: 'Basic', value: 45000 },
    { name: 'Standard', value: 32000 },
    { name: 'Premium', value: 15000 },
    { name: 'Enterprise', value: 8000 },
  ]

  const handleDownloadInvoice = () => {
    const doc = new jsPDF()
    doc.setFontSize(22).setFont("helvetica", "bold").text("Revenue Summary Report", 14, 25)
    doc.setFontSize(10).setFont("helvetica", "normal").text(`Generated: ${format(new Date(), 'PPP p')}`, 14, 32)
    
    autoTable(doc, {
      startY: 45,
      head: [['Client', 'Plan', 'Amount', 'Renewal Date', 'Status']],
      body: filtered.map(i => [
        i.instituteName,
        i.currentPlan || 'SaaS Basic',
        `INR ${i.totalRevenue.toLocaleString()}`,
        i.planExpiryDate || '-',
        i.status || 'Active'
      ]),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    })
    doc.save(`Revenue_Report_${format(new Date(), 'yyyy_MM_dd')}.pdf`)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-body">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black font-public-sans  tracking-tight">Revenue Management</h1>
          <p className="text-sm text-black font-medium">Subscription tracking and financial performance</p>
        </div>
        <Button onClick={handleDownloadInvoice} className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2 shadow-lg shadow-indigo-100 font-bold px-6">
          <Download className="w-4 h-4" /> Download Statement
        </Button>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <RevenueChip title="Total LifeTime" value={`₹${stats.total.toLocaleString()}`} change="+14%" isPositive={true} icon={<Wallet className="w-5 h-5" />} color="text-indigo-600" bg="bg-indigo-50" />
        <RevenueChip title="Monthly Revenue" value={`₹84,200`} change="+8.2%" isPositive={true} icon={<TrendingUp className="w-5 h-5" />} color="text-emerald-600" bg="bg-emerald-50" />
        <RevenueChip title="Active Subs" value={stats.active} change="-2" isPositive={false} icon={<RefreshCw className="w-5 h-5" />} color="text-blue-600" bg="bg-blue-50" />
        <RevenueChip title="Dues Pending" value={`₹${institutes.reduce((sum, i) => sum + i.dueAmount, 0).toLocaleString()}`} change="4 nodes" isPositive={false} icon={<Clock className="w-5 h-5" />} color="text-amber-600" bg="bg-amber-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-slate-200 shadow-sm rounded-[32px] bg-white overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
             <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-indigo-600 border border-slate-100"><BarChart3 className="w-5 h-5" /></div>
              <div><h3 className="text-lg font-bold text-black tracking-tight">Revenue Growth</h3><p className="text-[10px] font-bold text-black  ">Daily earnings influx</p></div>
             </div>
          </div>
          <div className="p-8 h-[350px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: '700' }} dy={10} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: '700' }} />
                 <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                 <Bar dataKey="revenue" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={40} />
               </BarChart>
             </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-[32px] bg-white overflow-hidden">
          <div className="p-8 border-b border-slate-50">
             <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-amber-600 border border-slate-100"><PieChartIcon className="w-5 h-5" /></div>
              <div><h3 className="text-lg font-bold text-black tracking-tight">Plan Revenue</h3><p className="text-[10px] font-bold text-black  ">Revenue by tier</p></div>
             </div>
          </div>
          <div className="p-8 h-[350px] flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={planRevenue} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value">
                  {planRevenue.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black text-black">100%</span>
              <span className="text-[10px] font-bold text-black  ">Share</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Revenue Table */}
      <Card className="border-slate-200 shadow-sm rounded-[32px] overflow-hidden bg-white">
        <div className="p-8 border-b border-slate-50 bg-slate-50/10 flex items-center justify-between">
          <div><h3 className="text-lg font-bold text-black">Subscription Ledger</h3><p className="text-xs text-black font-medium">Comprehensive transaction history</p></div>
          <div className="relative group w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Filter by institute..." 
              className="pl-10 h-10 rounded-xl border-slate-200 bg-white" 
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100 h-14">
                <TableHead className="px-8 text-[11px] font-black text-black  ">Institute</TableHead>
                <TableHead className="text-[11px] font-black text-black  ">Plan Tier</TableHead>
                <TableHead className="text-[11px] font-black text-black  ">Revenue</TableHead>
                <TableHead className="text-[11px] font-black text-black  ">Renewal On</TableHead>
                <TableHead className="px-8 text-[11px] font-black text-black   text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((client) => (
                <TableRow key={client.id} className="border-slate-100 group hover:bg-slate-50/30 transition-colors h-20">
                  <TableCell className="px-8 flex flex-col py-6">
                    <span className="font-bold text-sm text-black">{client.instituteName}</span>
                    <span className="text-[10px] font-medium text-black mt-1  tracking-tight">Admin: {client.fullName}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-lg px-2.5 py-1 bg-white border-slate-200 text-indigo-600 font-bold text-[10px]">
                      {client.currentPlan || 'SaaS Basic'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-black text-sm text-black tracking-tight">₹{client.totalRevenue.toLocaleString()}</TableCell>
                  <TableCell className="font-bold text-xs text-black">{client.planExpiryDate || '-'}</TableCell>
                  <TableCell className="px-8 text-center">
                    <Badge className={cn(
                      "rounded-lg px-3 py-1 text-[10px] font-black border-none shadow-sm",
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

function RevenueChip({ title, value, change, isPositive, icon, color, bg }: any) {
  return (
    <Card className="border-slate-200 shadow-sm rounded-[28px] overflow-hidden group hover:border-indigo-100 transition-all">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner group-hover:rotate-6 transition-transform", bg, color)}>
            {icon}
          </div>
          <div className="flex-1">
             <p className="text-[10px] font-bold text-black  ">{title}</p>
             <div className="flex items-baseline gap-2 mt-0.5">
               <h4 className="text-xl font-black text-black">{value}</h4>
               <div className={cn("flex items-center text-[10px] font-bold", isPositive ? "text-emerald-500" : "text-rose-500")}>
                 {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                 {change}
               </div>
             </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
