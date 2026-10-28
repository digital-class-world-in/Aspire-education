
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
  Plus,
  Search,
  FileSpreadsheet,
  FileText,
  History,
  DollarSign,
  Calculator,
  Download,
  Lock,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Landmark,
  UserCheck,
  Settings2,
  Clock
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useResolvedId } from "@/hooks/use-resolved-id"

export default function PayrollDashboard() {
  const pathname = usePathname()
  const isPortal = pathname.startsWith('/branch') || pathname.startsWith('/staff') || pathname.startsWith('/student')

  const { database } = useFirebase()
  const { user } = useUser()
  const { resolvedId } = useResolvedId()
  const [payrollHistory, setPayrollHistory] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!database || !resolvedId) return
    const rootPath = `Institutes/${resolvedId}`
    setIsLoading(true)
    const historyRef = ref(database, `${rootPath}/payroll-history`)
    const unsubscribe = onValue(historyRef, (snapshot) => {
      const data = snapshot.val()
      if (data) setPayrollHistory(Object.keys(data).map(key => ({ ...data[key], id: key })).reverse())
      else setPayrollHistory([])
      setIsLoading(false)
    })
    return () => off(historyRef)
  }, [database, resolvedId])

  const filtered = useMemo(() => {
    if (!searchTerm) return payrollHistory
    const lower = searchTerm.toLowerCase()
    return payrollHistory.filter(p => p.staffName?.toLowerCase().includes(lower))
  }, [payrollHistory, searchTerm])

  const mainContent = (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 w-full overflow-x-hidden font-public-sans text-black text-[14px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h2 className="text-3xl font-black text-black tracking-tight font-public-sans">Payroll Management</h2>
          <p className="text-[14px] text-black font-medium">Track salary processing history and disbursements</p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" className="h-11 px-6 rounded-xl border-zinc-200 font-bold text-[14px] tracking-widest bg-white">
            <Link href="/hr/payroll/setup"><Settings2 className="w-4 h-4 mr-2" /> Salary Setup</Link>
          </Button>
          <Button asChild className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-8 font-bold text-[14px] gap-2 border-none shadow-lg active:scale-95 transition-all tracking-widest"><Link href="/hr/payroll/process"><Plus className="h-4 w-4" /> Process Monthly</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard title="Processed Records" value={payrollHistory.length} icon={<History className="w-6 h-6 text-indigo-500" />} />
        <StatCard title="Total Net Payable" value={`₹${payrollHistory.reduce((s, p) => s + (Number(p.netSalary) || 0), 0).toLocaleString()}`} icon={<DollarSign className="w-6 h-6 text-emerald-500" />} />
        <StatCard title="Total Deductions" value={`₹${payrollHistory.reduce((s, p) => s + (Number(p.totalDeductions) || 0), 0).toLocaleString()}`} icon={<TrendingUp className="w-6 h-6 text-rose-500" />} />
      </div>

      <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
        <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
          <div className="relative w-80 group">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search Staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-11 bg-zinc-50 border-none rounded-xl text-[14px] font-bold shadow-inner"
            />
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <Table className="min-w-[1400px]">
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="border-zinc-100">
                <TableHead className="text-[11px] font-black text-black tracking-widest h-14 pl-8">SR NO.</TableHead>
                <TableHead className="text-[11px] font-black text-black tracking-widest h-14">Staff Name</TableHead>
                <TableHead className="text-[11px] font-black text-black tracking-widest h-14">Month/Year</TableHead>
                <TableHead className="text-[11px] font-black text-black tracking-widest text-center">Present Days</TableHead>
                <TableHead className="text-[11px] font-black text-black tracking-widest text-center">Gross (INR)</TableHead>
                <TableHead className="text-[11px] font-black text-black tracking-widest text-center">Deductions</TableHead>
                <TableHead className="text-[11px] font-black text-black tracking-widest text-center">Net Salary</TableHead>
                <TableHead className="text-[11px] font-black text-black tracking-widest">Status</TableHead>
                <TableHead className="text-right pr-8 text-[11px] font-black text-black tracking-widest h-14">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row, index) => (
                <TableRow key={row.id} className="border-zinc-50 transition-none group hover:bg-zinc-50/20 text-black font-public-sans">
                  <TableCell className="text-[14px] font-medium text-black pl-8">{index + 1}</TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center text-black font-black text-[10px] shadow-inner">{row.staffName?.charAt(0)}</div>
                      <span className="text-[14px] font-bold text-black font-public-sans">{row.staffName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[14px] text-black font-bold">{row.month} {row.year}</TableCell>
                  <TableCell className="text-center text-[14px] font-bold text-primary font-public-sans">{row.presentDays || 0} Days</TableCell>
                  <TableCell className="text-center text-[14px] font-bold text-black">₹{Number(row.grossEarnings).toLocaleString()}</TableCell>
                  <TableCell className="text-center text-[14px] font-bold text-rose-500">-₹{Number(row.totalDeductions).toLocaleString()}</TableCell>
                  <TableCell className="text-center text-[14px] font-black text-emerald-600">₹{Number(row.netSalary).toLocaleString()}</TableCell>
                  <TableCell><Badge className="bg-emerald-50 text-emerald-600 border-none text-[9px] font-black px-3 py-1">Locked</Badge></TableCell>
                  <TableCell className="text-right pr-6"><Button variant="ghost" size="sm" asChild className="h-8 px-4 text-primary font-black text-[9px] hover:bg-primary/5 rounded-lg"><Link href={`/hr/payroll/payslip/${row.id}`}><Download className="w-3.5 h-3.5 mr-1.5" /> Payslip</Link></Button></TableCell>
                </TableRow>
              ))}
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

function StatCard({ title, value, icon }: any) {
  return (
    <Card className="border border-zinc-100 shadow-sm rounded-2xl p-6 bg-white flex items-center gap-5 group hover:shadow-md transition-all">
      <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-white transition-all">{icon}</div>
      <div><p className="text-[11px] font-black text-black tracking-widest mb-1">{title}</p><h3 className="text-2xl font-black text-black">{value}</h3></div>
    </Card>
  )
}
 
