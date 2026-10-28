
"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useParams, useRouter, usePathname } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  Landmark, 
  Briefcase, 
  ShieldCheck, 
  DollarSign, 
  Loader2,
  Calendar,
  User,
  TrendingUp,
  TrendingDown
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { toPng } from 'html-to-image'
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

export default function PayslipPage() {
  const params = useParams()
  const id = params.id as string
  const pathname = usePathname()
  const router = useRouter()
  const isPortal = pathname.startsWith('/staff') || pathname.startsWith('/student') || pathname.startsWith('/branch')

  const { database } = useFirebase()
  const { user } = useUser()
  const captureRef = useRef<HTMLDivElement>(null)
  
  const [record, setRecord] = useState<any>(null)
  const [staff, setStaff] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [instituteName, setInstituteName] = useState("Your Institute")

  useEffect(() => {
    if (!database || !id) return
    
    // Resolve context logic
    const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('staff_session') : null
    const session = sessionStr ? JSON.parse(sessionStr) : null
    const currentAdminUid = session?.adminUid || user?.uid

    if (!currentAdminUid) return

    const rootPath = `Institutes/${currentAdminUid}`
    
    onValue(ref(database, `${rootPath}/profile/instituteName`), (s) => {
      if (s.exists()) setInstituteName(s.val())
    })

    const recordRef = ref(database, `${rootPath}/payroll-history/${id}`)
    onValue(recordRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        setRecord(data)
        
        onValue(ref(database, `${rootPath}/employees/${data.staffId}`), (s) => {
          setStaff(s.val())
          setIsLoading(false)
        })
      } else {
        router.push(isPortal ? "/staff/salary" : "/hr/payroll")
      }
    })
  }, [database, user, id, router, isPortal])

  const handleDownload = async () => {
    if (!captureRef.current) return
    setIsDownloading(true)
    try {
      const dataUrl = await toPng(captureRef.current, { quality: 1.0, pixelRatio: 3, skipFonts: true });
      const link = document.createElement('a');
      link.download = `Payslip_${record.staffName}_${record.month}_${record.year}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err)
    } finally {
      setIsDownloading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
        {!isPortal && <Sidebar />}
        <div className={cn("flex flex-col flex-1", !isPortal && "lg:pl-[300px]")}>
          {!isPortal && <TopNav />}
          <main className="p-8"><Skeleton className="h-[600px] w-full rounded-[40px] bg-zinc-50" /></main>
        </div>
      </div>
    )
  }

  const mainContent = (
    <main className="flex-1 p-8 space-y-8 animate-in fade-in duration-500 print:p-0 print:space-y-4 font-public-sans text-black">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" onClick={() => router.back()} className="text-black hover:text-black transition-none gap-2 font-black tracking-widest text-[10px]">
          <ArrowLeft className="w-4 h-4" /> Back to Payroll
        </Button>
        <div className="flex items-center gap-3">
          <Button onClick={() => window.print()} variant="outline" className="h-11 px-6 rounded-xl font-bold text-[14px] gap-2 border-zinc-200 bg-white shadow-sm transition-all hover:bg-zinc-50">
            <Printer className="h-4 w-4 text-black" /> Print
          </Button>
          <Button 
            onClick={handleDownload} 
            disabled={isDownloading}
            className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-8 font-bold text-[14px] gap-2 border-none shadow-lg transition-all active:scale-95"
          >
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} 
            {isDownloading ? "Generating..." : "Download PNG Slip"}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto print:max-w-full">
        <div ref={captureRef} className="bg-white p-16 rounded-none shadow-2xl border-t-[12px] border-primary print:shadow-none print:p-8 print:border-t-[6px] print:border print:rounded-none">
          <div className="flex justify-between items-start border-b border-zinc-100 pb-10 mb-10 print:pb-6 print:mb-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-black tracking-tight font-public-sans print:text-xl">{instituteName}</h1>
              <p className="text-[14px] font-bold text-black tracking-widest print:text-[10px]">Official Salary Disbursement Advice</p>
            </div>
            <div className="text-right">
              <Badge className="bg-primary text-white border-none px-4 py-1.5 rounded-full text-[14px] font-black tracking-widest mb-3 print:mb-1">Locked & Verified</Badge>
              <p className="text-[14px] font-bold text-black print:text-[9px]">{record.month} {record.year}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-12 print:gap-6 print:mb-6">
            <div className="space-y-6 print:space-y-3">
              <h4 className="text-[10px] font-black text-primary tracking-[0.2em] border-b border-primary/10 pb-2 print:pb-1">Employee Details</h4>
              <div className="space-y-4 print:space-y-2">
                <InfoRow label="Employee Name" value={record.staffName} />
                <InfoRow label="Employee ID" value={staff?.employeeId || '-'} />
                <InfoRow label="Designation" value={staff?.designation || '-'} />
                <InfoRow label="Department" value={staff?.department || '-'} />
              </div>
            </div>
            <div className="space-y-6 print:space-y-3">
              <h4 className="text-[10px] font-black text-primary tracking-[0.2em] border-b border-primary/10 pb-2 print:pb-1">Disbursement Info</h4>
              <div className="space-y-4 print:space-y-2">
                <InfoRow label="Payment Date" value={record.lockedAt ? format(new Date(record.lockedAt), "PPP") : '-'} />
                <InfoRow label="Present Days" value={`${record.presentDays} Days`} />
                <InfoRow label="Bank Account" value={staff?.bankAccountNumber ? `XXXX${staff.bankAccountNumber.slice(-4)}` : '-'} />
                <InfoRow label="Bank Name" value={staff?.bankName || '-'} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 border-y border-zinc-100 divide-x divide-zinc-100">
            <div className="p-8 space-y-6 print:p-4 print:space-y-3">
              <h4 className="text-[14px] font-black text-emerald-600 tracking-widest flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Earnings Breakdown
              </h4>
              <div className="space-y-3">
                <ComponentRow label="Calculated Gross" value={record.grossEarnings} />
                <p className="text-[9px] text-black italic font-medium pt-2">* Pro-rated based on {record.presentDays} days attendance.</p>
              </div>
            </div>
            <div className="p-8 space-y-6 print:p-4 print:space-y-3">
              <h4 className="text-[14px] font-black text-rose-600 tracking-widest flex items-center gap-2">
                <TrendingDown className="w-4 h-4" /> Total Deductions
              </h4>
              <div className="space-y-3">
                <ComponentRow label="Total Reductions" value={record.totalDeductions} isDeduction />
                <p className="text-[9px] text-black italic font-medium pt-2">* Includes PF, ESIC, PT and Other Deductions.</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-50 p-10 mt-10 rounded-3xl flex justify-between items-center border border-zinc-100 print:p-6 print:mt-6 print:rounded-xl">
            <div>
              <p className="text-[10px] font-black text-black tracking-[0.2em] mb-1 print:text-[8px]">Net Amount Disbursed</p>
              <h2 className="text-4xl font-black text-black tracking-tight print:text-2xl">₹{Number(record.netSalary).toLocaleString()}</h2>
            </div>
            <div className="text-right">
              <div className="w-24 h-24 border-2 border-dashed border-zinc-200 rounded-2xl flex items-center justify-center mb-2 print:w-16 print:h-16">
                <span className="text-[8px] font-bold text-zinc-300 rotate-[-15deg]">Institutional Seal</span>
              </div>
              <p className="text-[10px] font-bold text-black tracking-widest print:text-[8px]">Authorized Signatory</p>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-zinc-50 text-center print:mt-8 print:pt-4">
            <p className="text-[9px] text-zinc-300 font-bold tracking-[0.3em]">This is a system-verified digital payroll node and does not require a physical signature.</p>
          </div>
        </div>
      </div>
    </main>
  )

  if (isPortal) return mainContent

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans print:bg-white print:block overflow-x-hidden">
      <Sidebar />
      <div className="lg:pl-[300px] flex flex-col flex-1 w-full overflow-x-hidden print:pl-0">
        <TopNav />
        {mainContent}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="flex justify-between items-center group">
      <span className="text-[11px] font-bold text-black tracking-wider print:text-[9px]">{label}</span>
      <span className="text-[14px] font-black text-black print:text-[14px]">{value}</span>
    </div>
  )
}

function ComponentRow({ label, value, isDeduction = false }: { label: string, value: number, isDeduction?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[14px] font-bold text-black print:text-[14px]">{label}</span>
      <span className={cn("text-[14px] font-black print:text-[14px]", isDeduction ? "text-rose-600" : "text-emerald-600")}>
        {isDeduction ? '-' : ''}₹{Number(value).toLocaleString()}
      </span>
    </div>
  )
}
