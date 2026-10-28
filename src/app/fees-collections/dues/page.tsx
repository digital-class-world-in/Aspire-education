
"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
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
  Search, 
  Eye, 
  CalendarCheck, 
  Settings2, 
  ChevronLeft, 
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Users,
  Wallet,
  X,
  Filter,
  Download
} from "lucide-react"
import { useFirebase } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { format } from "date-fns"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export default function DuesLedgerPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-black text-zinc-300 animate-pulse">Establishing Financial Node...</div>}>
      <DuesContent />
    </Suspense>
  )
}

function DuesContent() {
  const router = useRouter()
  const { database } = useFirebase()
  const { resolvedId, branchId, isBranch } = useResolvedId()

  const [students, setAdmissions] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [dropdownData, setDropdownData] = useState<Record<string, any[]>>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [filterClass, setFilterClass] = useState("all")
  const [filterBatch, setFilterBatch] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [instituteName, setInstituteName] = useState("Your Institute")
  
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  useEffect(() => {
    if (!database || !resolvedId) return
    const rootPath = `Institutes/${resolvedId}`
    
    onValue(ref(database, `${rootPath}/admissions`), (s) => {
      if (s.exists()) setAdmissions(Object.keys(s.val()).map(k => ({ ...s.val()[k], id: k })))
    })

    onValue(ref(database, `${rootPath}/fees`), (s) => {
      if (s.exists()) setPayments(Object.values(s.val()))
    })

    onValue(ref(database, `${rootPath}/profile/instituteName`), (s) => {
      if (s.exists()) setInstituteName(s.val())
    })

    onValue(ref(database, `${rootPath}/dropdowns`), (snapshot) => {
      const data = snapshot.val() || {}
      const processed: Record<string, any[]> = {}
      Object.keys(data).forEach(key => { 
        processed[key] = Object.keys(data[key]).map(id => ({ id, value: data[key][id].value })) 
      })
      setDropdownData(processed)
      setIsLoading(false)
    })
  }, [database, resolvedId])

  const duesList = useMemo(() => {
    let list = students
    if (isBranch && branchId) list = list.filter(s => s.branchId === branchId)

    const financials = list.map(student => {
      const studentPayments = payments.filter(p => p.studentId === student.id)
      const collected = studentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
      const total = Number(student.netFees) || 0
      const due = Math.max(0, total - collected)
      return { ...student, collectedFees: collected, dueFees: due, totalFees: total }
    })

    return financials.filter(s => {
      const isDue = s.dueFees > 0
      const matchesSearch = !searchTerm || s.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || s.admissionNo?.toString().includes(searchTerm)
      const matchesClass = filterClass === 'all' || s.course === filterClass
      const matchesBatch = filterBatch === 'all' || s.batch === filterBatch
      return isDue && matchesSearch && matchesClass && matchesBatch
    }).reverse()
  }, [students, payments, isBranch, branchId, searchTerm, filterClass, filterBatch])

  const totals = useMemo(() => {
    const studentCount = duesList.length
    const amount = duesList.reduce((sum, s) => sum + s.dueFees, 0)
    return { studentCount, amount }
  }, [duesList])

  const paginated = duesList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const totalPages = Math.ceil(duesList.length / itemsPerPage)

  const handleExportExcel = () => {
    const data = duesList.map((s, i) => ({
      "#": i + 1,
      "Student Name": s.studentName,
      "Admission No": s.admissionNo,
      "Class": s.course,
      "Due Amount": s.dueFees,
      "Due Date": s.feeDueDate || 'Not Set'
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Dues")
    XLSX.writeFile(wb, `Due_Fees_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`)
  }

  const handleExportPdf = () => {
    const doc = new jsPDF()
    doc.setFontSize(20).setTextColor(13, 148, 136).text(instituteName, 14, 20)
    doc.setFontSize(12).setTextColor(100).text(`Outstanding Dues Ledger - ${format(new Date(), "PPP")}`, 14, 28)
    
    const tableData = duesList.map((s, i) => [
      i + 1,
      s.studentName,
      s.admissionNo,
      s.course,
      `INR ${s.dueFees.toLocaleString()}`,
      s.feeDueDate || '-'
    ])

    autoTable(doc, {
      startY: 35,
      head: [['#', 'Student Name', 'Adm No', 'Class', 'Due Amount', 'Due Date']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [13, 148, 136] }
    })

    doc.save(`Dues_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`)
  }

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 animate-pulse">Establishing Financial Node...</div>

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans text-black">
      <Sidebar />
      <div className="lg:pl-[300px] flex flex-col flex-1 min-w-0">
        <TopNav />
        <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 w-full overflow-x-hidden text-[14px]">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div className="flex items-center gap-6">
              <Button variant="ghost" onClick={() => router.back()} className="h-10 w-10 p-0 rounded-full border border-zinc-100 bg-white text-black hover:text-black shadow-sm transition-all">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h2 className="text-[26px] font-normal text-black tracking-tight leading-none">Due Fees Ledger</h2>
                <p className="text-[14px] text-black font-medium mt-1">Detailed analysis of all outstanding institutional receivables</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleExportExcel} variant="outline" className="h-11 px-5 rounded-xl border-emerald-100 text-emerald-600 bg-white hover:bg-emerald-50 font-bold text-[14px] gap-2 transition-all shadow-sm">
                <FileSpreadsheet className="h-4 w-4" /> Export Excel
              </Button>
              <Button onClick={handleExportPdf} variant="outline" className="h-11 px-5 rounded-xl border-rose-100 text-rose-600 bg-white hover:bg-rose-50 font-bold text-[14px] gap-2 transition-all shadow-sm">
                <FileText className="h-4 w-4" /> Download PDF
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <SummaryCard label="Total Due Students" value={totals.studentCount} icon={<Users className="w-8 h-8 text-blue-500" />} />
            <SummaryCard label="Total Outstanding Due" value={totals.amount} isAmount icon={<Wallet className="w-8 h-8 text-rose-500" />} />
          </div>

          <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-normal text-black tracking-tight">Select Criteria</h3>
              {(searchTerm || filterClass !== 'all' || filterBatch !== 'all') && (
                <Button onClick={() => { setSearchTerm(""); setFilterClass("all"); setFilterBatch("all"); }} variant="ghost" className="h-8 px-4 text-rose-500 hover:bg-rose-50 rounded-lg text-[10px] font-black tracking-widest gap-2">
                  Reset Filters <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-black tracking-widest ml-1">Class Filter</Label>
                <Select value={filterClass} onValueChange={setFilterClass}>
                  <SelectTrigger className="h-11 rounded-xl border-zinc-200 bg-zinc-50/50 font-bold"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>{(dropdownData['course'] || []).map(opt => <SelectItem key={opt.id} value={opt.value}>{opt.value}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-black tracking-widest ml-1">Batch Filter</Label>
                <Select value={filterBatch} onValueChange={setFilterBatch}>
                  <SelectTrigger className="h-11 rounded-xl border-zinc-200 bg-zinc-50/50 font-bold"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>{students.map(a => ({id: a.id, value: a.batch})).filter((v, i, a) => v.value && a.findIndex(t => t.value === v.value) === i).map(opt => <SelectItem key={opt.id} value={opt.value}>{opt.value}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-black tracking-widest ml-1">Search Keyword</Label>
                <div className="relative w-full">
                  <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300" />
                  <Input placeholder="Search Name or ADM..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-11 rounded-xl pl-12 border-zinc-200 font-bold text-black" />
                </div>
              </div>
            </div>
          </Card>

          <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
            <div className="overflow-x-auto scrollbar-thin">
              <Table className="min-w-[1600px]">
                <TableHeader className="bg-zinc-50/50">
                  <TableRow className="border-zinc-100 hover:bg-transparent">
                    <TableHead className="text-[13px] font-black text-black h-14 pl-10 w-16">#</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14 w-40 text-center">ACTION</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14 w-48 text-center">OUTSTANDING DUE</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14">STUDENT NAME</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14">CLASS / COURSE</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14">ADMISSION NO</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14">COLLECTED</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14">TOTAL FEE</TableHead>
                    <TableHead className="text-right pr-10 text-[13px] font-black text-black h-14">DUE DATE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((row, index) => (
                    <TableRow key={row.id} className="border-zinc-50 hover:bg-zinc-50/20 transition-none group text-black font-public-sans">
                      <TableCell className="text-[14px] font-bold text-black pl-10">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="icon" asChild className="h-9 w-9 text-black hover:text-black rounded-xl transition-all">
                            <Link href={`/student-information/admission/${row.id}`}><Eye className="h-4 w-4" strokeWidth={3} /></Link>
                          </Button>
                          <Link href={`/fees-collections?studentId=${row.id}`} className="p-2 hover:bg-zinc-50 rounded-xl transition-all text-black hover:text-blue-600">
                            <CalendarCheck className="h-4 w-4" strokeWidth={3} />
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="bg-[#1e3a8a] text-white py-2 px-4 rounded-md inline-block min-w-[100px] text-center shadow-lg">
                          <span className="font-black text-[14px]">₹ {row.dueFees.toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[14px] font-black text-black font-public-sans">{row.studentName}</TableCell>
                      <TableCell className="text-[14px] font-bold text-black">{row.course}</TableCell>
                      <TableCell className="text-[14px] font-bold text-black font-public-sans tracking-tighter">{row.admissionNo}</TableCell>
                      <TableCell className="text-[14px] font-bold text-emerald-600">₹ {row.collectedFees.toLocaleString()}</TableCell>
                      <TableCell className="text-[14px] font-bold text-black">₹ {row.totalFees.toLocaleString()}</TableCell>
                      <TableCell className="text-right pr-10">
                        <Badge variant="outline" className="rounded-lg border-rose-100 text-rose-600 font-bold px-3 py-1 text-[10px]">
                          {row.feeDueDate || 'No Date Set'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {duesList.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="h-64 text-center text-zinc-300 italic">No outstanding dues found in registry</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-9 rounded-xl font-bold text-[10px] tracking-widest transition-none"><ChevronLeft className="w-4 h-4 mr-2" /> Previous</Button>
              <div className="flex items-center gap-2">{[...Array(totalPages)].map((_, i) => (<button key={i} onClick={() => setCurrentPage(i + 1)} className={cn("w-8 h-8 rounded-lg text-[10px] font-black transition-all", currentPage === i + 1 ? "bg-[#1e3a8a] text-white shadow-xl scale-110" : "bg-white text-black border border-zinc-100")}>{i + 1}</button>))}</div>
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-9 rounded-xl font-bold text-[10px] tracking-widest transition-none">Next <ChevronRight className="w-4 h-4 ml-2" /></Button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, icon, isAmount = false }: any) {
  return (
    <Card className="border border-zinc-100 shadow-sm rounded-2xl bg-white p-8 group hover:shadow-md transition-all">
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-zinc-50 flex items-center justify-center shadow-inner group-hover:bg-white transition-all">
          {icon}
        </div>
        <div>
          <p className="text-[11px] font-black text-black tracking-widest mb-1">{label}</p>
          <h4 className="text-3xl font-black text-black tracking-tighter">
            {isAmount && <span className="mr-1 text-zinc-300">₹</span>}
            {value.toLocaleString()}
          </h4>
        </div>
      </div>
    </Card>
  )
}
