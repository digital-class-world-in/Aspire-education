"use client"

import { useState, useEffect, useMemo, Suspense, useRef } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Wallet,
  Plus,
  Trash2,
  X,
  Search,
  Eye,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  Calendar,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Settings,
  CalendarDays,
  Printer,
  Users,
  Receipt,
  Clock,
  Save,
  Loader2,
  ShieldCheck,
  Download,
  Filter,
  Settings2,
  MessageCircle,
  CalendarCheck,
  DollarSign,
  ArrowRight,
  History,
  Pencil
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, set, off, update, get, remove } from "firebase/database"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useResolvedId } from "@/hooks/use-resolved-id"
import * as XLSX from "xlsx"
import { createStudentNotification, createAdminNotification, NotificationType } from "@/lib/notifications"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { format, isBefore, parseISO, isToday, addMonths } from "date-fns"

export default function FeesCollectionsPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-black text-zinc-300 animate-pulse font-public-sans">Initializing Financial Node...</div>}>
      <FeesContent />
    </Suspense>
  )
}

function FeesContent() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get("status") || "all"

  const isPortal = (pathname.startsWith('/branch') && !pathname.startsWith('/branch-management')) ||
    pathname.startsWith('/staff') ||
    (pathname.startsWith('/student') && !pathname.startsWith('/student-information'))

  const [isModalOpen, setIsModalOpen] = useState(false)

  const [selectedStudentForAction, setSelectedStudentForAction] = useState<any>(null)
  const [selectedEmiIndex, setSelectedEmiIndex] = useState<string>("none")
  const [payments, setPayments] = useState<any[]>([])
  const [students, setAdmissions] = useState<any[]>([])
  const [dropdownData, setDropdownData] = useState<Record<string, any[]>>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [instituteName, setInstituteName] = useState("Your Institute")
  const [instituteProfile, setInstituteProfile] = useState<any>(null)

  // Advanced Filter States
  const [filterSession, setFilterSession] = useState("all")
  const [filterClass, setFilterClass] = useState("all")
  const [filterSection, setFilterSection] = useState("all")
  const [filterBatch, setFilterBatch] = useState("all")
  const [filterStatus, setFilterStatus] = useState(initialStatus)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  // History Modal State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<any>(null)
  const [editingPayment, setEditingPayment] = useState<any>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const { database } = useFirebase()
  const { resolvedId, branchId, isBranch, isStaff, staffId } = useResolvedId()

  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])

  useEffect(() => {
    if (!database || !resolvedId) return

    const rootPath = `Institutes/${resolvedId}`
    const paymentsRef = ref(database, `${rootPath}/fees`)
    const studentsRef = ref(database, `${rootPath}/admissions`)
    const dropdownsRef = ref(database, `${rootPath}/dropdowns`)
    const profileRef = ref(database, `${rootPath}/profile`)

    setIsLoading(true)

    onValue(profileRef, (s) => {
      if (s.val()) {
        setInstituteProfile(s.val())
        setInstituteName(s.val().instituteName || "Your Institute")
      }
    })

    onValue(paymentsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) setPayments(Object.keys(data).map(key => ({ ...data[key], id: key })))
      else setPayments([])
    })

    onValue(studentsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setAdmissions(Object.keys(data).map(key => ({ ...data[key], id: key })))
      } else {
        setAdmissions([])
      }
      setIsLoading(false)
    })

    onValue(dropdownsRef, (snapshot) => {
      const data = snapshot.val() || {}
      const processed: Record<string, any[]> = {}
      Object.keys(data).forEach(key => {
        processed[key] = Object.keys(data[key]).map(id => ({ id, value: data[key][id].value }))
      })
      setDropdownData(processed)
    })

    return () => {
      off(paymentsRef)
      off(studentsRef)
      off(dropdownsRef)
      off(profileRef)
    }
  }, [database, resolvedId])

  useEffect(() => {
    const sId = searchParams.get("studentId")
    if (sId && students.length > 0) {
      const student = students.find(s => s.id === sId)
      if (student) {
        setSelectedStudentForHistory(student)
        setIsHistoryModalOpen(true)
      }
    }
  }, [searchParams, students])

  const studentFinancials = useMemo(() => {
    let list = students
    if (isBranch && branchId) list = list.filter(s => s.branchId === branchId)

    return list.map(student => {
      const studentPayments = payments.filter(p => p.studentId === student.id)
      const collected = studentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
      const total = Number(student.netFees) || 0
      const due = Math.max(0, total - collected)

      return {
        ...student,
        collectedFees: collected,
        dueFees: due,
        totalFees: total
      }
    })
  }, [students, payments, isBranch, branchId])

  const totalsSummary = useMemo(() => {
    const totalStudents = studentFinancials.length
    const totalFees = studentFinancials.reduce((sum, s) => sum + (Number(s.totalFees) || 0), 0)
    const totalCollected = studentFinancials.reduce((sum, s) => sum + (Number(s.collectedFees) || 0), 0)
    const totalDue = Math.max(0, totalFees - totalCollected)
    return { totalStudents, totalFees, totalCollected, totalDue }
  }, [studentFinancials])

  const filteredData = useMemo(() => {
    return studentFinancials.filter(s => {
      const matchesSearch = !searchTerm ||
        s.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.admissionNo?.toString().toLowerCase().includes(searchTerm.toLowerCase())

      const matchesSession = filterSession === 'all' || s.session === filterSession
      const matchesClass = filterClass === 'all' || s.class === filterClass
      const matchesSection = filterSection === 'all' || s.section === filterSection
      const matchesBatch = filterBatch === 'all' || s.batch === filterBatch

      let matchesStatus = true
      if (filterStatus === 'paid') matchesStatus = s.dueFees <= 0
      else if (filterStatus === 'due') matchesStatus = s.dueFees > 0

      let matchesDateRange = true
      if (fromDate || toDate) {
        const dueDate = s.feeDueDate
        if (fromDate && (!dueDate || dueDate < fromDate)) matchesDateRange = false
        if (toDate && (!dueDate || dueDate > toDate)) matchesDateRange = false
      }

      return matchesSearch && matchesSession && matchesClass && matchesSection && matchesBatch && matchesStatus && matchesDateRange
    })
  }, [studentFinancials, searchTerm, filterSession, filterClass, filterSection, filterBatch, filterStatus, fromDate, toDate])

  const hasActiveFilters = useMemo(() => {
    return filterSession !== "all" ||
      filterClass !== "all" ||
      filterSection !== "all" ||
      filterBatch !== "all" ||
      filterStatus !== "all" ||
      fromDate !== "" ||
      toDate !== "" ||
      searchTerm !== ""
  }, [filterSession, filterClass, filterSection, filterBatch, filterStatus, fromDate, toDate, searchTerm])

  const resetFilters = () => {
    setFilterSession("all")
    setFilterClass("all")
    setFilterSection("all")
    setFilterBatch("all")
    setFilterStatus("all")
    setFromDate("")
    setToDate("")
    setSearchTerm("")
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredData.slice(start, start + itemsPerPage)
  }, [filteredData, currentPage])

  const generatePremiumReceipt = (payment: any) => {
    const doc = new jsPDF();
    const studentMeta = students.find(s => s.id === payment.studentId) || selectedStudentForAction;
    const dueAmount = studentFinancials.find(s => s.id === payment.studentId)?.dueFees || 0;

    // Header Color Accent
    const primaryColor: [number, number, number] = [30, 58, 138]; // Deep Blue

    doc.setDrawColor(0).setLineWidth(0.5);
    doc.rect(10, 10, 190, 277);
    doc.setFontSize(10).setTextColor(100).setFont("helvetica", "normal").text("Office Copy", 105, 18, { align: 'center' });
    doc.line(10, 22, 200, 22);

    // Colorful Ribbon
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(10.5, 23, 189, 12, 'F');
    doc.setFontSize(14).setTextColor(255).setFont("helvetica", "bold");
    doc.text("PAYMENT RECEIPT", 105, 31, { align: 'center' });
    doc.line(10, 35, 200, 35);

    // Institute Name Section
    if (instituteProfile?.logoUrl) {
      try {
        doc.addImage(instituteProfile.logoUrl, 'PNG', 85, 40, 40, 40); // Centered logo
      } catch (e) {
        doc.setFontSize(12).setTextColor(150).text("INSTITUTE LOGO", 105, 60, { align: 'center' });
      }
    }

    doc.setFontSize(22).setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]).setFont("helvetica", "black");
    doc.text(instituteName.toUpperCase(), 105, 90, { align: 'center' });
    doc.setFontSize(10).setTextColor(100).setFont("helvetica", "normal");
    doc.text(instituteProfile?.address || '-', 105, 98, { align: 'center' });

    // Details Grid
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]).setLineWidth(0.3);
    doc.line(15, 105, 195, 105);

    doc.setFontSize(12).setTextColor(0).setFont("helvetica", "bold").text("Student Information:", 15, 115);
    doc.setFontSize(10).setTextColor(50).setFont("helvetica", "normal");
    doc.text(`Name: ${payment.studentName || 'N/A'}`, 15, 125);
    doc.text(`Admission No: ${studentMeta?.admissionNo || '-'}`, 15, 132);
    doc.text(`Roll no.: ${studentMeta?.rollNo || '-'}`, 15, 139);
    doc.text(`Date: ${payment.date || '-'}`, 110, 125);
    doc.text(`Receipt No.: #${payment.receiptNo || '-'}`, 110, 132);
    doc.text(`Contact: ${studentMeta?.mobile || '-'}`, 110, 139);

    autoTable(doc, {
      startY: 145,
      margin: { left: 15, right: 15 },
      head: [['Fee Head / Description', 'Transaction Id', 'Mode', 'Amount']],
      body: [
        ['COLLECTING AMOUNT', payment.txId || '-', payment.paymentMode || payment.method || 'Online/Portal', `INR ${Number(payment.amount).toLocaleString()}`],
        ['FINE / LATE CHARGES', '-', '-', `INR ${Number(payment.fineAmount || 0).toLocaleString()}`],
        ['OTHER CHARGES', '-', '-', `INR ${Number(payment.otherAmount || 0).toLocaleString()}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      bodyStyles: { textColor: [0, 0, 0], halign: 'center' },
      columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } }
    });

    const totalPaid = Number(payment.amount) + Number(payment.fineAmount || 0) + Number(payment.otherAmount || 0);
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]).setLineWidth(1);
    doc.setFillColor(245, 245, 245);
    doc.rect(140, finalY, 55, 15, 'FD');
    doc.setFontSize(12).setTextColor(0).text("TOTAL PAID:", 145, finalY + 10);
    doc.setFont("helvetica", "bold").text(`INR ${totalPaid.toLocaleString()}`, 172, finalY + 10);

    doc.setFontSize(10).setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`Balance Due: INR ${dueAmount.toLocaleString()}`, 15, finalY + 10);

    // Footer
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(150);
    doc.text("------------------------------------------------------------------------------------------------------------------------------------", 105, 255, { align: 'center' });
    doc.text(`Official Document Generated by Nirvana Education Portal | ${new Date().toLocaleString()}`, 105, 260, { align: 'center' });
    doc.setFont("helvetica", "bold").setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Terms: Once submitted, the fee is non-refundable and non-transferable.", 105, 268, { align: 'center' });

    doc.save(`Receipt_${payment.receiptNo}.pdf`);
  }

  const handleCollectFee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!resolvedId || !database || (!selectedStudentForAction && !editingPayment) || isSubmitting) return
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const amount = formData.get("collectingAmount") as string

    const paymentData: any = {
      studentId: editingPayment ? editingPayment.studentId : selectedStudentForAction.id,
      studentName: editingPayment ? editingPayment.studentName : selectedStudentForAction.studentName,
      amount: amount,
      fineAmount: formData.get("fineAmount") || "0",
      otherAmount: formData.get("otherAmount") || "0",
      date: formData.get("date") as string,
      receiptNo: formData.get("receiptNo") || `RCP-${Date.now().toString().slice(-6)}`,
      paymentMode: formData.get("paymentMode") as string,
      paymentOption: formData.get("paymentOption") as string,
      txId: formData.get("txId") || `TXN-${Date.now().toString().slice(-6)}`,
      nextDueDate: formData.get("nextDueDate") as string,
      remarks: formData.get("remarks") as string,
      branchId: isBranch ? branchId : (editingPayment ? editingPayment.branchId : (selectedStudentForAction.branchId || null)),
      updatedAt: Date.now()
    }

    if (!editingPayment) {
      paymentData.installmentNo = selectedEmiIndex !== "none" ? (Number(selectedEmiIndex) + 1) : null
      paymentData.createdAt = Date.now()
    } else {
      paymentData.createdAt = editingPayment.createdAt
      paymentData.installmentNo = editingPayment.installmentNo || null
    }

    try {
      if (editingPayment) {
        await update(ref(database, `Institutes/${resolvedId}/fees/${editingPayment.id}`), paymentData)
      } else {
        await push(ref(database, `Institutes/${resolvedId}/fees`), paymentData)
      }

      const updates: any = {}
      if (paymentData.nextDueDate) {
        const sId = editingPayment ? editingPayment.studentId : selectedStudentForAction.id
        updates[`Institutes/${resolvedId}/admissions/${sId}/feeDueDate`] = paymentData.nextDueDate
      }
      
      // Update EMI Status if selected (only for new payments)
      if (!editingPayment && selectedEmiIndex !== "none" && selectedStudentForAction.emiSchedule) {
        const updatedSchedule = [...selectedStudentForAction.emiSchedule]
        updatedSchedule[Number(selectedEmiIndex)].status = "Paid"
        updates[`Institutes/${resolvedId}/admissions/${selectedStudentForAction.id}/emiSchedule`] = updatedSchedule
      }

      await update(ref(database), updates)

      // Send Notifications (only for new payments)
      if (!editingPayment) {
        const notifPromises: Promise<any>[] = []

        // Admin Notification
        notifPromises.push(createAdminNotification(database, resolvedId, {
          title: "Fee Payment Recorded",
          message: `Payment of INR ${Number(paymentData.amount).toLocaleString()} received from ${paymentData.studentName} (Receipt: ${paymentData.receiptNo}).`,
          type: NotificationType.Fee
        }))

        // Student Notification
        notifPromises.push(createStudentNotification(database, resolvedId, selectedStudentForAction.id, {
          title: "Fee Receipt Generated",
          message: `We have successfully received your payment of INR ${Number(paymentData.amount).toLocaleString()}. Receipt: ${paymentData.receiptNo}. Balance Due: INR ${(selectedStudentForAction.dueFees - Number(paymentData.amount)).toLocaleString()}.`,
          type: NotificationType.Fee
        }))

        await Promise.all(notifPromises)
      }

      toast({ title: editingPayment ? "Payment Updated" : "Payment Recorded" })
      if (formData.get("generateCopy") === "on") generatePremiumReceipt(paymentData)

      setIsModalOpen(false)
      setSelectedStudentForAction(null)
      setEditingPayment(null)
    } catch (err) {
      toast({ variant: "destructive", title: "Error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePayment = async (payment: any) => {
    if (!confirm("Are you sure you want to delete this payment record? This will affect the student's due balance.")) return
    try {
      const rootPath = `Institutes/${resolvedId}`
      await remove(ref(database!, `${rootPath}/fees/${payment.id}`))

      // Reset EMI status if payment was linked to an installment
      if (payment.installmentNo) {
        const studentRef = ref(database!, `${rootPath}/admissions/${payment.studentId}`)
        const studentSnap = await get(studentRef)
        if (studentSnap.exists()) {
          const studentData = studentSnap.val()
          if (studentData.emiSchedule) {
            const updatedSchedule = [...studentData.emiSchedule]
            const index = payment.installmentNo - 1
            if (updatedSchedule[index]) {
              updatedSchedule[index].status = "Pending"
              await update(studentRef, { emiSchedule: updatedSchedule })
            }
          }
        }
      }

      toast({ title: "Payment Deleted" })
    } catch (err) {
      toast({ variant: "destructive", title: "Delete Failed" })
    }
  }

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData.map((s, i) => ({
      "#": i + 1,
      "Student Name": s.studentName,
      "Admission No": s.admissionNo,
      "Paid": s.collectedFees,
      "Total": s.totalFees,
      "Due": s.dueFees,
      "Due Date": s.feeDueDate || 'Not Set'
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Fees")
    XLSX.writeFile(wb, `Fees_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`)
  }

  const handleExportPdf = () => {
    const doc = new jsPDF()
    doc.setFontSize(20).setTextColor(13, 148, 136).text(instituteName, 14, 20)
    doc.setFontSize(12).setTextColor(100).text('Fees Registry Report', 14, 30)

    const tableData = filteredData.map((s, i) => [
      i + 1,
      s.studentName,
      s.admissionNo,
      s.collectedFees,
      s.totalFees,
      s.dueFees,
      s.feeDueDate || '-'
    ])

    autoTable(doc, {
      startY: 35,
      head: [['#', 'Name', 'ADM No', 'Paid', 'Total', 'Due', 'Due Date']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [13, 148, 136] }
    })

    doc.save(`Fees_Registry_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`)
  }

  const handleShareWhatsApp = (student: any) => {
    const phone = student.mobile?.replace(/\D/g, '') || ""
    const message = `Hello *${student.studentName}*,\n\nYour academic fee for *${instituteName}* is pending.\n\n*Amount Due: ₹${student.dueFees.toLocaleString()}*\n*Due Date: ${student.feeDueDate || 'Immediate'}*\n\nPlease clear the dues to avoid any late charges.\n\nRegards,\nAccounts Node`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans text-black">
      <Sidebar />
      <div className={cn("flex flex-col flex-1 min-w-0", !isPortal && "lg:pl-[300px]")}>
        <TopNav />
        <main className="flex-1 p-4 md:p-8 space-y-6 md:space-y-10 animate-in fade-in duration-500 w-full overflow-x-hidden text-[14px]">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div>
              <h2 className="text-[26px] font-normal text-black tracking-tight leading-none">Fees Management</h2>
              <p className="text-[14px] text-black font-medium mt-1.5">Consolidated institutional financial ledger</p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleExportExcel} variant="outline" className="h-11 px-5 rounded-xl border-emerald-100 text-emerald-600 bg-white hover:bg-emerald-50 font-bold text-[14px] gap-2 shadow-sm"><FileSpreadsheet className="h-4 w-4" /> Export Excel</Button>
              <Button onClick={handleExportPdf} variant="outline" className="h-11 px-5 rounded-xl border-rose-100 text-rose-600 bg-white hover:bg-rose-50 font-bold text-[14px] gap-2 shadow-sm"><FileText className="h-4 w-4" /> Export PDF</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <SummaryCard label="Total Students" value={totalsSummary.totalStudents} icon={<img src="https://img.icons8.com/3d-fluency/94/student-female--v1.png" className="w-10 h-10" />} />
            <SummaryCard label="Total Fees" value={totalsSummary.totalFees} isAmount icon={<img src="https://img.icons8.com/color/48/school.png" className="w-10 h-10" />} />
            <SummaryCard label="Collected Fees" value={totalsSummary.totalCollected} isAmount icon={<img src="https://img.icons8.com/3d-fluency/94/bill.png" className="w-10 h-10" />} />
            <SummaryCard
              label="Due Fees"
              value={totalsSummary.totalDue}
              isAmount
              icon={<img src="https://img.icons8.com/fluency/48/no-hidden-fee.png" className="w-10 h-10" />}
              color="text-rose-600"
              action={
                <Button onClick={() => router.push("/fees-collections/dues")} variant="ghost" size="sm" className="absolute top-4 right-4 h-7 px-3 text-[10px] font-black text-black hover:text-rose-500 rounded-lg hover:bg-rose-50 border-none transition-all">
                  View More <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              }
            />
          </div>

          <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-normal text-black tracking-tight">Select Criteria</h3>
              {hasActiveFilters && (
                <Button onClick={resetFilters} variant="ghost" className="h-8 px-4 text-rose-500 hover:bg-rose-50 rounded-lg text-[10px] font-black tracking-widest gap-2">
                  Reset <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 text-black">
              <CriteriaBox label="Session" value={filterSession} onChange={setFilterSession} options={dropdownData['session'] || []} />
              <CriteriaBox label="Class" value={filterClass} onChange={setFilterClass} options={dropdownData['class'] || []} />
              <CriteriaBox label="Section" value={filterSection} onChange={setFilterSection} options={dropdownData['section'] || []} />
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-black tracking-widest ml-1">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-11 rounded-xl border-zinc-200 bg-zinc-50/50 font-bold text-black text-[14px]"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="paid">Fully Paid</SelectItem><SelectItem value="due">Due</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 flex items-end"><div className="relative w-full"><Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300" /><Input placeholder="Search Name/ADM..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-11 rounded-xl pl-12 border-zinc-200 font-bold text-black text-[14px]" /></div></div>
            </div>
          </Card>

          <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
            <div className="overflow-x-auto scrollbar-thin">
              <Table className="min-w-[1400px]">
                <TableHeader className="bg-zinc-50/50">
                  <TableRow className="border-zinc-100 hover:bg-transparent">
                    <TableHead className="text-[13px] font-black text-black h-14 pl-4 w-16">#</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14 w-48 text-center">ACTION</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14 w-32 text-center">COLLECT FEE</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14 w-32 text-center">SHARE MESSAGE</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14 w-40 text-center">OUTSTANDING DUE</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14">PAID FEES</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14">TOTAL FEES</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14">DUE DATE</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14">STUDENT NAME</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14">ADMISSION NO</TableHead>
                    <TableHead className="text-[13px] font-black text-black h-14">CLASS / COURSE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((row, index) => (
                    <TableRow key={row.id} className="border-zinc-50 hover:bg-zinc-50/20 transition-none group text-black font-public-sans">
                      <TableCell className="text-[14px] font-bold text-black pl-4">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" asChild title="View Profile" className="h-8 w-8 text-black hover:text-black rounded-xl">
                            <Link href={`/student-information/admission/${row.id}`}><Eye className="h-4 w-4" strokeWidth={3} /></Link>
                          </Button>
                          <button
                            onClick={() => {
                              const lastPay = payments.filter(p => p.studentId === row.id).sort((a, b) => b.createdAt - a.createdAt)[0];
                              if (lastPay) generatePremiumReceipt(lastPay);
                              else toast({ variant: "destructive", title: "No Payments Found" });
                            }}
                            className="p-2 hover:bg-zinc-50 rounded-xl transition-all border-none bg-transparent" title="Get Last Receipt"
                          >
                            <Download className="h-4 w-4 text-black hover:text-emerald-600" strokeWidth={3} />
                          </button>
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-black hover:text-indigo-600 rounded-xl" title="Fee EMI Setup">
                            <Link href={`/fees-collections/setup?studentId=${row.id}`}><CreditCard className="h-4 w-4" /></Link>
                          </Button>
                          <Button 
                            onClick={() => { setSelectedStudentForHistory(row); setIsHistoryModalOpen(true); }} 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-black hover:text-amber-600 rounded-xl" 
                            title="Payment History"
                          >
                            <History className="h-4 w-4" strokeWidth={3} />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {row.dueFees <= 0 ? (
                          <Badge className="bg-emerald-500 text-white border-none h-7 px-4 text-[10px] font-black shadow-sm">Fully Paid</Badge>
                        ) : (
                          <Button onClick={() => { setSelectedStudentForAction(row); setIsModalOpen(true); }} className="bg-[#48CAE4] hover:bg-[#00B4D8] text-white rounded-lg h-8 px-4 text-[10px] font-black border-none transition-all shadow-sm">Collect Fee</Button>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.dueFees > 0 && (
                          <button
                            onClick={() => handleShareWhatsApp(row)}
                            className="p-2 hover:bg-emerald-50 rounded-xl transition-all border-none bg-transparent"
                            title="Share Dues Alert"
                          >
                            <img src="https://img.icons8.com/color/48/whatsapp--v1.png" className="w-5 h-5" alt="WA" />
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className={cn(
                          "py-2 px-4 rounded-md inline-block min-w-[100px] text-center shadow-lg",
                          row.dueFees > 0 ? "bg-[#1e3a8a] text-white" : "bg-emerald-50 text-emerald-600 shadow-none border border-emerald-100"
                        )}>
                          <span className="font-black text-[14px]">₹ {Number(row.dueFees || 0).toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[14px] font-bold text-emerald-600">₹ {Number(row.collectedFees || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-[14px] font-bold text-black">₹ {Number(row.totalFees || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-[14px] font-bold text-rose-500 font-public-sans">{row.feeDueDate || 'Not Set'}</TableCell>
                      <TableCell className="text-[14px] font-black text-black font-public-sans">{row.studentName}</TableCell>
                      <TableCell className="text-[14px] font-bold text-black font-public-sans tracking-tighter">{row.admissionNo}</TableCell>
                      <TableCell className="text-[14px] font-bold text-black">{row.course}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) { setSelectedStudentForAction(null); setEditingPayment(null); } }}>
            <DialogContent className="max-w-4xl p-0 border-none rounded-[32px] overflow-hidden bg-white shadow-2xl">
              <div className="bg-white px-10 py-8 text-black border-b flex items-center justify-between">
                <DialogTitle className="text-2xl font-normal text-black tracking-tight">
                  {editingPayment ? 'Edit Transaction' : 'Record Transaction'} {(selectedStudentForAction?.studentName || editingPayment?.studentName) && `- ${selectedStudentForAction?.studentName || editingPayment?.studentName}`}
                </DialogTitle>
                {(selectedStudentForAction?.admissionNo || editingPayment?.studentId) && <Badge variant="outline" className="rounded-lg border-zinc-100 text-black font-bold">ADM: {selectedStudentForAction?.admissionNo || '-'}</Badge>}
              </div>
              <ScrollArea className="max-h-[85vh]">
                <form onSubmit={handleCollectFee} className="p-10 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-black">
                    {!editingPayment && (
                      <div className="space-y-2">
                        <Label className="text-[11px] font-black text-black tracking-widest ml-1">SELECT INSTALLMENT (EMI)</Label>
                        <Select 
                          value={selectedEmiIndex} 
                          onValueChange={(val) => {
                            setSelectedEmiIndex(val)
                            if (val !== "none" && selectedStudentForAction?.emiSchedule) {
                              const emi = selectedStudentForAction.emiSchedule[Number(val)]
                              const form = document.querySelector('form') as HTMLFormElement
                              if (form) {
                                const amountInput = form.elements.namedItem('collectingAmount') as HTMLInputElement
                                const dateInput = form.elements.namedItem('nextDueDate') as HTMLInputElement
                                if (amountInput) amountInput.value = emi.amount.toString()
                                
                                // Set next due date if available
                                const nextEmi = selectedStudentForAction.emiSchedule[Number(val) + 1]
                                if (nextEmi && dateInput) dateInput.value = nextEmi.dueDate
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="h-12 border-zinc-200 rounded-xl font-bold bg-zinc-50/50">
                            <SelectValue placeholder="Custom Payment" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-zinc-100 shadow-2xl">
                            <SelectItem value="none" className="font-bold">Custom Payment</SelectItem>
                            {selectedStudentForAction?.emiSchedule?.map((emi: any, idx: number) => (
                              <SelectItem 
                                key={idx} 
                                value={idx.toString()} 
                                disabled={emi.status === 'Paid'}
                                className={cn("font-bold", emi.status === 'Paid' && "opacity-50 blur-[0.5px]")}
                              >
                                Inst. #{emi.installmentNo} - ₹{emi.amount} ({emi.dueDate}) {emi.status === 'Paid' ? ' [PAID]' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2"><Label className="text-[11px] font-black text-black tracking-widest ml-1">OUTSTANDING DUE</Label><Input value={selectedStudentForAction?.dueFees ?? (studentFinancials.find(s => s.id === editingPayment?.studentId)?.dueFees || 0)} readOnly className="h-12 border-zinc-200 rounded-xl font-bold bg-zinc-50/50 text-rose-600" /></div>
                    <div className="space-y-2"><Label className="text-[11px] font-black text-black tracking-widest ml-1">COLLECTING AMOUNT *</Label><Input id="collectingAmount" name="collectingAmount" type="number" required defaultValue={editingPayment ? editingPayment.amount : (selectedStudentForAction?.dueFees || 0)} className="h-12 rounded-xl border-[hsl(var(--primary))]/30 font-black text-[hsl(var(--primary))] text-lg shadow-sm" /></div>
                    <div className="space-y-2"><Label className="text-[11px] font-black text-black tracking-widest ml-1">FINE / LATE CHARGES</Label><Input name="fineAmount" type="number" defaultValue={editingPayment ? editingPayment.fineAmount : "0"} className="h-12 border-zinc-200 rounded-xl font-bold" /></div>
                    <div className="space-y-2"><Label className="text-[11px] font-black text-black tracking-widest ml-1">OTHER CHARGES</Label><Input name="otherAmount" type="number" defaultValue={editingPayment ? editingPayment.otherAmount : "0"} className="h-12 border-zinc-200 rounded-xl font-bold" /></div>
                    <div className="space-y-2"><Label className="text-[11px] font-black text-black tracking-widest ml-1">TRANSACTION DATE</Label><Input name="date" type="date" required defaultValue={editingPayment ? editingPayment.date : todayStr} className="h-12 border-zinc-200 rounded-xl font-bold text-[14px]" /></div>
                    <div className="space-y-2"><Label className="text-[11px] font-black text-black tracking-widest ml-1">RECEIPT IDENTIFIER</Label><Input name="receiptNo" defaultValue={editingPayment ? editingPayment.receiptNo : ""} placeholder="Auto-generated if empty" className="h-12 border-zinc-200 rounded-xl font-bold" /></div>
                    <div className="space-y-2"><Label className="text-[11px] font-black text-black tracking-widest ml-1">PAYMENT CHANNEL</Label><Select name="paymentMode" defaultValue={editingPayment ? editingPayment.paymentMode : "Online"}><SelectTrigger className="h-12 rounded-xl border-zinc-200 font-bold"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Online">Online Transfer</SelectItem><SelectItem value="Cash">Cash Payment</SelectItem><SelectItem value="Cheque">Cheque / Draft</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label className="text-[11px] font-black text-black tracking-widest ml-1">REFERENCE / TX ID</Label><Input name="txId" defaultValue={editingPayment ? editingPayment.txId : ""} placeholder="e.g. Bank Ref No" className="h-12 border-zinc-200 rounded-xl font-bold" /></div>
                    <div className="space-y-2"><Label className="text-[11px] font-black text-black tracking-widest ml-1">FOLLOW-UP DUE DATE</Label><Input id="nextDueDate" name="nextDueDate" type="date" defaultValue={editingPayment ? editingPayment.nextDueDate : ""} className="h-12 border-zinc-200 rounded-xl font-bold text-[14px]" /></div>
                  </div>
                  <div className="space-y-2"><Label className="text-[11px] font-black text-black tracking-widest ml-1">TRANSACTION REMARKS</Label><Textarea name="remarks" defaultValue={editingPayment ? editingPayment.remarks : ""} placeholder="Add internal payment notes..." className="rounded-xl border-zinc-200 min-h-[100px] font-medium" /></div>

                  <Button type="submit" disabled={isSubmitting} className="w-full h-16 bg-[#1e3a8a] hover:bg-black text-white rounded-3xl font-black text-[14px] tracking-[0.2em] shadow-xl transition-all active:scale-95 border-none">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-3" /> : <Save className="w-5 h-5 mr-3" />}
                    {editingPayment ? 'Update Payment' : 'Submit'}
                  </Button>
                </form>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          <Dialog open={isHistoryModalOpen} onOpenChange={(open) => { setIsHistoryModalOpen(open); if (!open) setSelectedStudentForHistory(null); }}>
            <DialogContent className="max-w-5xl p-0 border-none rounded-[32px] overflow-hidden bg-white shadow-2xl">
              <div className="bg-white px-10 py-8 text-black border-b flex items-center justify-between">
                <DialogTitle className="text-2xl font-normal text-black tracking-tight">Payment History - {selectedStudentForHistory?.studentName}</DialogTitle>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="rounded-lg border-emerald-100 text-emerald-600 font-bold px-3 py-1">Collected: ₹{selectedStudentForHistory?.collectedFees.toLocaleString()}</Badge>
                  <Badge variant="outline" className="rounded-lg border-rose-100 text-rose-600 font-bold px-3 py-1">Due: ₹{selectedStudentForHistory?.dueFees.toLocaleString()}</Badge>
                </div>
              </div>
              <ScrollArea className="max-h-[80vh]">
                <div className="p-8">
                  <Table>
                    <TableHeader className="bg-zinc-50/50">
                      <TableRow className="border-zinc-100 hover:bg-transparent">
                        <TableHead className="text-[12px] font-black text-black h-12">DATE</TableHead>
                        <TableHead className="text-[12px] font-black text-black h-12">RECEIPT</TableHead>
                        <TableHead className="text-[12px] font-black text-black h-12">MODE</TableHead>
                        <TableHead className="text-[12px] font-black text-black h-12">AMOUNT</TableHead>
                        <TableHead className="text-[12px] font-black text-black h-12">TX ID</TableHead>
                        <TableHead className="text-[12px] font-black text-black h-12 text-center">ACTION</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments
                        .filter(p => p.studentId === selectedStudentForHistory?.id)
                        .sort((a, b) => b.createdAt - a.createdAt)
                        .map((payment) => (
                          <TableRow key={payment.id} className="border-zinc-50 hover:bg-zinc-50/20 transition-none group text-black font-public-sans">
                            <TableCell className="text-[14px] font-bold text-black">{payment.date}</TableCell>
                            <TableCell className="text-[14px] font-black text-indigo-600">#{payment.receiptNo}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="rounded-lg border-zinc-100 text-zinc-500 font-bold text-[10px]">{payment.paymentMode}</Badge>
                            </TableCell>
                            <TableCell className="text-[14px] font-black text-emerald-600">₹{Number(payment.amount).toLocaleString()}</TableCell>
                            <TableCell className="text-[14px] font-medium text-zinc-400">{payment.txId || '-'}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button 
                                  onClick={() => { 
                                    setEditingPayment(payment); 
                                    setSelectedStudentForAction(selectedStudentForHistory);
                                    setIsModalOpen(true); 
                                  }} 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-blue-500 hover:bg-blue-50 rounded-xl"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  onClick={() => handleDeletePayment(payment)} 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-xl"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button 
                                  onClick={() => generatePremiumReceipt(payment)} 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-emerald-500 hover:bg-emerald-50 rounded-xl"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      {payments.filter(p => p.studentId === selectedStudentForHistory?.id).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="h-32 text-center text-zinc-300 italic">No payment history found for this student.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-9 rounded-xl font-normal text-[10px] tracking-widest transition-none"><ChevronLeft className="w-4 h-4 mr-2" /> Previous</Button>
              <div className="flex items-center gap-2">
                {[...Array(totalPages)].map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => setCurrentPage(i + 1)} 
                    className={cn(
                      "w-10 h-10 rounded-xl text-[10px] font-normal transition-all", 
                      currentPage === i + 1 ? "bg-primary text-white shadow-xl scale-110" : "bg-white text-black border border-zinc-100 hover:bg-zinc-50"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-9 rounded-xl font-normal text-[10px] tracking-widest transition-none">Next <ChevronRight className="w-4 h-4 ml-2" /></Button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, icon, isAmount = false, color = "text-black", action }: any) {
  return (
    <Card className="border border-zinc-100 shadow-sm rounded-[28px] bg-white p-6 relative overflow-hidden group hover:shadow-md transition-all">
      {action}
      <div className="flex flex-col gap-4">
        <p className="text-[15px] font-medium text-black tracking-tight">{label}</p>
        <div className="flex items-center gap-4">
          <div className="shrink-0 transition-transform group-hover:scale-110">{icon}</div>
          <h4 className={cn("text-[20px] font-black leading-none tracking-tight", color)}>
            {isAmount && <span className="mr-1 text-black font-bold">₹</span>}
            {Number(value || 0).toLocaleString()}
          </h4>
        </div>
      </div>
    </Card>
  )
}

function CriteriaBox({ label, value, onChange, options }: { label: string, value: string, onChange: (v: string) => void, options: any[] }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-black text-black tracking-widest ml-1">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 rounded-xl border-zinc-200 bg-zinc-50/50 font-bold text-black text-[14px] focus:ring-1"><SelectValue placeholder="All" /></SelectTrigger>
        <SelectContent className="rounded-xl border-zinc-100 shadow-xl"><SelectItem value="all" className="font-bold">All {label}s</SelectItem>{options.map(opt => <SelectItem key={opt.id} value={opt.value} className="font-bold">{opt.value}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  )
}
