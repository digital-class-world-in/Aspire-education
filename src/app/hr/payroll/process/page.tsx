
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Calculator, 
  Lock, 
  Clock, 
  AlertCircle,
  Loader2,
  Calendar,
  Users,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  History,
  Save,
  ShieldCheck
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, set, update, off, get } from "firebase/database"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useRouter, usePathname } from "next/navigation"
import { format, getDaysInMonth } from "date-fns"
import { useResolvedId } from "@/hooks/use-resolved-id"

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const YEARS = [2024, 2025, 2026]

export default function ProcessPayrollPage() {
  const router = useRouter()
  const pathname = usePathname()
  const isPortal = pathname.startsWith('/staff') || pathname.startsWith('/student') || pathname.startsWith('/branch')

  const { database } = useFirebase()
  const { resolvedId } = useResolvedId()
  
  const [step, setStep] = useState(1)
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "MMMM"))
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  
  const [employees, setEmployees] = useState<any[]>([])
  const [processedPayroll, setProcessedPayroll] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLocking, setIsLocking] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    if (!database || !resolvedId) return
    const rootPath = `Institutes/${resolvedId}`
    
    // Fetch Employees
    onValue(ref(database, `${rootPath}/employees`), (snapshot) => {
      const data = snapshot.val()
      if (data) setEmployees(Object.keys(data).map(key => ({ ...data[key], id: key })))
      else setEmployees([])
    })
  }, [database, resolvedId])

  const handleNextStep = async () => {
    if (!database || !resolvedId) return
    setIsProcessing(true)
    
    const rootPath = `Institutes/${resolvedId}`
    const year = selectedYear
    const month = selectedMonth
    const monthIndex = MONTHS.indexOf(month)
    const daysInMonth = getDaysInMonth(new Date(Number(year), monthIndex))

    // 1. Fetch attendance for the month
    const attendanceRef = ref(database, `${rootPath}/attendance/Staff`)
    const snapshot = await get(attendanceRef)
    const attMap: Record<string, number> = {}
    const absentMap: Record<string, Set<string>> = {}
    const presentMap: Record<string, Set<string>> = {}
    
    if (snapshot.exists()) {
      const allAtt = snapshot.val()
      Object.keys(allAtt).forEach(date => {
        const d = new Date(date)
        const inCurrentMonth = d.getFullYear() === Number(year) && d.getMonth() === monthIndex
        
        const dailyStaff = allAtt[date]
        Object.keys(dailyStaff).forEach(empId => {
          const status = dailyStaff[empId]?.status
          if (status === 'Present') {
            if (inCurrentMonth) {
              attMap[empId] = (attMap[empId] || 0) + 1
              if (!presentMap[empId]) presentMap[empId] = new Set()
              presentMap[empId].add(date)
            }
          } else if (status === 'Absent' || status === 'Leave') {
            if (!absentMap[empId]) absentMap[empId] = new Set()
            absentMap[empId].add(date)
          }
        })
      })
    }

    // Apply Sunday deduction rule for absences on Saturday or Monday
    const sundays: Date[] = []
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(Number(year), monthIndex, i)
        if (d.getDay() === 0) sundays.push(d)
    }

    employees.forEach(emp => {
      const id = emp.id

      sundays.forEach(sunday => {
        const sundayStr = format(sunday, 'yyyy-MM-dd')
        
        if (presentMap[id]?.has(sundayStr)) return
        
        let isSundayPaid = true
        
        if (absentMap[id]?.has(sundayStr)) {
          isSundayPaid = false
        } else {
          const prevSat = new Date(sunday)
          prevSat.setDate(sunday.getDate() - 1)
          const nextMon = new Date(sunday)
          nextMon.setDate(sunday.getDate() + 1)

          const prevSatStr = format(prevSat, 'yyyy-MM-dd')
          const nextMonStr = format(nextMon, 'yyyy-MM-dd')

          if (absentMap[id]?.has(prevSatStr) || absentMap[id]?.has(nextMonStr)) {
            isSundayPaid = false
          }
        }

        if (isSundayPaid) {
          attMap[id] = (attMap[id] || 0) + 1
        }
      })
    })

    // 2. Calculate Payroll based on Attendance
    const results = employees.map(emp => {
      const presentDays = attMap[emp.id] || 0
      const basic = Number(emp.basicSalary) || 0
      const pf = Number(emp.pfAmount) || 0
      const esic = Number(emp.esicAmount) || 0
      const pt = Number(emp.ptAmount) || 0

      // Calculation logic: (Component / Total Days) * Present Days
      const proRatedBasic = Math.round((basic / daysInMonth) * presentDays)
      
      let totalGross = proRatedBasic
      let totalDeductions = pf + esic + pt

      // Handle extra components if any
      if (emp.salarySetup && Array.isArray(emp.salarySetup)) {
        emp.salarySetup.forEach((c: any) => {
          if (c.id === 'basic') return
          let monthlyVal = 0
          if (c.calcType === 'Percentage') monthlyVal = (basic * c.value) / 100
          else monthlyVal = Number(c.value) || 0

          const actual = Math.round((monthlyVal / daysInMonth) * presentDays)
          if (c.type === 'Earning') totalGross += actual
          else totalDeductions += actual
        })
      }

      const netSalary = Math.max(0, totalGross - totalDeductions)

      return {
        ...emp,
        staffName: `${emp.firstName} ${emp.lastName}`,
        presentDays,
        grossEarnings: totalGross,
        totalDeductions,
        netSalary,
        month,
        year,
        status: 'Generated'
      }
    })

    setProcessedPayroll(results)
    setIsProcessing(false)
    setStep(2)
  }

  const handleLockPayroll = async () => {
    if (!database || !resolvedId) return
    setIsLocking(true)
    
    try {
      const rootPath = `Institutes/${resolvedId}/payroll-history`
      const updates: any = {}
      
      processedPayroll.forEach(p => {
        const recordId = `${p.id}_${selectedMonth}_${selectedYear}`
        updates[`${rootPath}/${recordId}`] = {
          staffId: p.id,
          staffName: p.staffName,
          month: p.month,
          year: p.year,
          presentDays: p.presentDays,
          grossEarnings: p.grossEarnings,
          totalDeductions: p.totalDeductions,
          netSalary: p.netSalary,
          status: 'Locked',
          lockedAt: new Date().toISOString()
        }
      })

      await update(ref(database), updates)
      toast({ title: "Payroll Finalized", description: `Disbursements for ${selectedMonth} locked.` })
      router.push("/hr/payroll")
    } catch (e) {
      toast({ variant: "destructive", title: "Error" })
    } finally {
      setIsLocking(false)
    }
  }

  const totalPages = Math.ceil(processedPayroll.length / itemsPerPage)
  const paginatedPayroll = processedPayroll.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const mainContent = (
    <main className="flex-1 p-8 space-y-8 animate-in fade-in duration-500 w-full overflow-x-hidden font-public-sans text-black text-[14px]">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => step === 1 ? router.back() : setStep(1)} className="h-10 w-10 p-0 rounded-full border border-zinc-100 hover:bg-zinc-50 transition-none">
          <ArrowLeft className="w-4 h-4 text-black" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-black tracking-tight font-public-sans">Process Monthly Payouts</h2>
          <p className="text-[10px] text-black font-medium tracking-widest">Attendance-Synchronized Calculation</p>
        </div>
      </div>

      {step === 1 ? (
        <div className="max-w-2xl mx-auto pt-12 space-y-8">
          <Card className="border border-zinc-100 shadow-sm rounded-[40px] bg-white p-12 text-center space-y-10">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto shadow-inner">
              <Calendar className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-black tracking-tight leading-none">Select Period</h3>
              <p className="text-[14px] text-black max-w-sm mx-auto font-medium">Choose the month and year to calculate pro-rated payouts based on attendance logs.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-6 text-left">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-black tracking-widest ml-1">MONTH</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-12 rounded-xl bg-zinc-50 border-none font-bold text-black shadow-inner">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-zinc-100 shadow-xl">
                    {MONTHS.map(m => <SelectItem key={m} value={m} className="font-bold">{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-black tracking-widest ml-1">YEAR</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="h-12 rounded-xl bg-zinc-50 border-none font-bold text-black shadow-inner">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-zinc-100 shadow-xl">
                    {YEARS.map(y => <SelectItem key={y} value={y.toString()} className="font-bold">{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleNextStep} 
              disabled={isProcessing}
              className="w-full h-14 bg-primary hover:opacity-90 text-white rounded-2xl font-black shadow-xl border-none text-[14px] tracking-widest active:scale-95 transition-all"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Calculate Payroll Engine"} <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Card>
        </div>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between bg-zinc-900 p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10"><ShieldCheck className="w-32 h-32" /></div>
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-widest text-white/50">Ledger for</p>
                <h3 className="text-xl font-black font-public-sans text-white">{selectedMonth} {selectedYear}</h3>
              </div>
            </div>
            <Button 
              onClick={handleLockPayroll} 
              disabled={isLocking}
              className="bg-primary hover:opacity-90 text-white h-12 px-10 rounded-xl font-black text-[10px] tracking-widest border-none transition-all active:scale-95 relative z-10 shadow-lg"
            >
              {isLocking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />} 
              Authorize & Finalize
            </Button>
          </div>

          <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50/50">
                  <TableRow className="hover:bg-transparent border-zinc-100">
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14 pl-8">Employee Identity</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14">Presence</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest text-center">Gross (INR)</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest text-center">Deductions</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest text-center">Net Payable</TableHead>
                    <TableHead className="text-right pr-8 text-[11px] font-black text-black tracking-widest h-14">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPayroll.map((p) => (
                    <TableRow key={p.id} className="border-zinc-50 hover:bg-zinc-50/30 transition-none group text-black font-public-sans">
                      <TableCell className="pl-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center text-black font-bold text-[10px] shadow-inner">
                            {p.firstName?.charAt(0)}
                          </div>
                          <span className="text-[14px] font-bold text-black font-public-sans">{p.firstName} {p.lastName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[14px] font-bold text-primary font-public-sans">{p.presentDays || 0} Days</TableCell>
                      <TableCell className="text-center text-[14px] font-bold text-black">₹{Number(p.grossEarnings || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-center text-[14px] font-bold text-rose-500">-₹{Number(p.totalDeductions || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-center text-[14px] font-black text-black">₹{Number(p.netSalary || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right pr-8">
                        <Badge className="bg-emerald-50 text-emerald-600 border-none text-[9px] font-black px-3 py-1">Calculated</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1}
                className="h-10 px-6 rounded-xl font-black text-[10px] tracking-widest transition-all"
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Previous
              </Button>
              <div className="flex items-center gap-2">
                {[...Array(totalPages)].map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => setCurrentPage(i + 1)} 
                    className={cn(
                      "w-10 h-10 rounded-xl text-[10px] font-black transition-all",
                      currentPage === i + 1 ? "bg-primary text-white shadow-xl scale-110" : "bg-white border border-zinc-100 text-black hover:bg-zinc-50"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage >= totalPages}
                className="h-10 px-6 rounded-xl font-black text-[10px] tracking-widest transition-all"
              >
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      )}
    </main>
  )

  if (isPortal) return mainContent

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans overflow-x-hidden">
      <Sidebar />
      <div className="lg:pl-[300px] flex flex-col flex-1 min-w-0">
        <TopNav />
        {mainContent}
      </div>
    </div>
  )
}
