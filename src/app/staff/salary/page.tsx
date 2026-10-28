
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  History, 
  DollarSign, 
  Download, 
  TrendingUp, 
  CheckCircle2,
  Calendar,
  Clock,
  ShieldCheck,
  UserCheck
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useResolvedId } from "@/hooks/use-resolved-id"

export default function StaffSalaryHistoryPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const { resolvedId, staffId } = useResolvedId()
  
  const [history, setHistory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Priority: use staffId from resolved context (manual session or lookup)
    const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('staff_session') : null
    const session = sessionStr ? JSON.parse(sessionStr) : null
    const currentStaffId = staffId || session?.staffId
    const currentAdminId = resolvedId || session?.adminUid

    if (!database || !currentAdminId || !currentStaffId) {
      if (!isLoading) setIsLoading(false)
      return
    }
    
    const historyRef = ref(database, `Institutes/${currentAdminId}/payroll-history`)
    const unsubscribe = onValue(historyRef, (snapshot) => {
      const data = snapshot.val() || {}
      const list = Object.keys(data)
        .map(k => ({ ...data[k], id: k }))
        .filter(p => p.staffId === currentStaffId)
      setHistory(list.reverse())
      setIsLoading(false)
    })

    return () => off(historyRef)
  }, [database, resolvedId, staffId])

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 animate-pulse">Syncing Secure Payroll Data...</div>

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-32 font-public-sans text-black text-[14px]">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h2 className="text-3xl font-black text-black font-public-sans tracking-tight leading-none">Salary Registry</h2>
          <p className="text-[14px] text-black font-medium mt-1.5">Official record of salary disbursements and itemized payslips</p>
        </div>
        <Badge className="bg-emerald-50 text-emerald-600 border-none px-4 py-1.5 rounded-xl font-black text-[10px] tracking-widest shadow-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Node Verified
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard label="Yearly Net Paid" value={`₹${history.reduce((s, p) => s + (Number(p.netSalary) || 0), 0).toLocaleString()}`} icon={<UserCheck className="text-emerald-500" />} />
        <StatCard label="Total Deductions" value={`₹${history.reduce((s, p) => s + (Number(p.totalDeductions) || 0), 0).toLocaleString()}`} icon={<TrendingUp className="text-rose-500" />} />
        <StatCard label="Registry Nodes" value={history.length} icon={<History className="text-indigo-500" />} />
      </div>

      <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
        <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
          <h3 className="text-[14px] font-black text-black tracking-[0.2em]">Disbursement Ledger</h3>
          <Clock className="w-4 h-4 text-zinc-200" />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="hover:bg-transparent border-zinc-100">
                <TableHead className="pl-10 text-[11px] font-black text-black h-14">Month & Session</TableHead>
                <TableHead className="text-[11px] font-black text-black h-14 text-center">Working Days</TableHead>
                <TableHead className="text-[11px] font-black text-black h-14 text-center">Gross Pay</TableHead>
                <TableHead className="text-[11px] font-black text-black h-14 text-center">Deductions</TableHead>
                <TableHead className="text-[11px] font-black text-black h-14 text-center">Net Disbursed</TableHead>
                <TableHead className="text-right pr-10 text-[11px] font-black text-black h-14">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((row) => (
                <TableRow key={row.id} className="border-zinc-50 hover:bg-zinc-50/20 transition-none group text-black font-public-sans">
                  <TableCell className="pl-10 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-primary shadow-inner">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <span className="text-[14px] font-bold text-black font-public-sans tracking-tight">{row.month} {row.year}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-bold text-black font-public-sans">{row.presentDays} Days</TableCell>
                  <TableCell className="text-center font-bold text-black">₹{Number(row.grossEarnings).toLocaleString()}</TableCell>
                  <TableCell className="text-center font-bold text-rose-500">₹{Number(row.totalDeductions).toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    <div className="bg-emerald-50 text-emerald-600 py-2 px-4 rounded-xl inline-block min-w-[100px] text-center shadow-sm">
                      <span className="font-black text-[14px]">₹{Number(row.netSalary).toLocaleString()}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-10">
                    <Button variant="ghost" size="sm" asChild className="h-9 px-4 rounded-xl text-primary bg-blue-50/50 hover:bg-primary hover:text-white font-black text-[9px] tracking-widest gap-2 transition-all">
                      <Link href={`/hr/payroll/payslip/${row.id}`}>
                        <Download className="w-3.5 h-3.5" /> Download Slip
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-16 h-16 rounded-[24px] bg-zinc-50 flex items-center justify-center text-zinc-200">
                        <DollarSign className="w-8 h-8" />
                      </div>
                      <p className="text-[14px] font-black text-zinc-300 tracking-widest">No salary records found in your node</p>
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
}

function StatCard({ label, value, icon }: any) {
  return (
    <Card className="border border-zinc-100 shadow-sm rounded-2xl p-8 bg-white flex items-center gap-6 group hover:shadow-md transition-all">
      <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center shadow-inner group-hover:bg-white transition-all">{icon}</div>
      <div><p className="text-[10px] font-black text-black tracking-widest mb-1">{label}</p><h4 className="text-2xl font-black text-black tracking-tighter">{value}</h4></div>
    </Card>
  )
}
