
"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Wallet,
  CreditCard,
  Calendar,
  FileText,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  History,
  TrendingUp,
  ShieldCheck,
  Smartphone,
  Landmark,
  ChevronRight,
  Info,
  BookOpen
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, set, off, update, get } from "firebase/database"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { toast } from "@/hooks/use-toast"

export default function StudentFeesPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const router = useRouter()

  const [student, setStudent] = useState<any>(null)
  const [adminUid, setAdminUid] = useState<string | null>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("upi")
  const [instituteProfile, setInstituteProfile] = useState<any>(null)
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null)
  const [isPayModalOpen, setIsPayModalOpen] = useState(false)

  useEffect(() => {
    if (!database) return

    // Resolve Student Identity from Session
    const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('student_session') : null
    if (!sessionStr) {
      router.push('/student/login')
      return
    }

    try {
      const session = JSON.parse(sessionStr)
      const adminId = session.adminUid
      const studentId = session.studentId

      if (adminId && studentId) {
        setAdminUid(adminId)
        const rootPath = `Institutes/${adminId}`

        onValue(ref(database, `${rootPath}/admissions/${studentId}`), (s) => {
          if (s.exists()) {
            setStudent({ ...s.val(), id: studentId })
          }
        })

        onValue(ref(database, `${rootPath}/profile`), (s) => {
          setInstituteProfile(s.val())
        })

        onValue(ref(database, `${rootPath}/fees`), (s) => {
          const data = s.val() || {}
          setPayments(Object.values(data).filter((p: any) => p.studentId === studentId).reverse())
        })
      }
      setIsLoading(false)
    } catch (e) {
      console.error("Session parse error", e)
      setIsLoading(false)
    }
  }, [database])

  const totals = useMemo(() => {
    if (!student) return { total: 0, paid: 0, pending: 0, status: 'Pending' }
    const total = Number(student.netFees) || 0
    const paid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    const pending = Math.max(0, total - paid)
    const status = pending === 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Pending'
    return { total, paid, pending, status }
  }, [student, payments])

  const breakdown = useMemo(() => {
    if (!totals.total) return []
    const base = totals.total
    return [
      { type: "Tuition Fee", total: Math.round(base * 0.7), paid: Math.round(totals.paid * 0.7), icon: <BookOpen className="w-4 h-4" /> },
      { type: "Admission Fee", total: Math.round(base * 0.1), paid: Math.round(totals.paid * 0.1), icon: <ShieldCheck className="w-4 h-4" /> },
      { type: "Examination Fee", total: Math.round(base * 0.1), paid: Math.round(totals.paid * 0.1), icon: <FileText className="w-4 h-4" /> },
      { type: "Transport/Misc", total: Math.round(base * 0.1), paid: Math.round(totals.paid * 0.1), icon: <TrendingUp className="w-4 h-4" /> },
    ]
  }, [totals])

  const generatePremiumReceipt = (payment: any) => {
    const doc = new jsPDF();
    const dueAmount = totals.pending;

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
    doc.text((instituteProfile?.instituteName || "ACADEMIC INSTITUTE").toUpperCase(), 105, 90, { align: 'center' });
    doc.setFontSize(10).setTextColor(100).setFont("helvetica", "normal");
    doc.text(instituteProfile?.address || '-', 105, 98, { align: 'center' });

    // Details Grid
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]).setLineWidth(0.3);
    doc.line(15, 105, 195, 105);

    doc.setFontSize(12).setTextColor(0).setFont("helvetica", "bold").text("Student Information:", 15, 115);
    doc.setFontSize(10).setTextColor(50).setFont("helvetica", "normal");
    doc.text(`Name: ${student?.studentName || 'N/A'}`, 15, 125);
    doc.text(`Admission No: ${student?.admissionNo || '-'}`, 15, 132);
    doc.text(`Roll no.: ${student?.rollNo || '-'}`, 15, 139);
    doc.text(`Date: ${payment.date || '-'}`, 110, 125);
    doc.text(`Receipt No.: #${payment.receiptNo || '-'}`, 110, 132);
    doc.text(`Contact: ${student?.mobile || '-'}`, 110, 139);

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
  };

  const handleViewReceipt = (payment: any) => {
    generatePremiumReceipt(payment);
  };

  const handlePayment = async () => {
    if (!database || !adminUid || !student || isProcessing) return
    setIsProcessing(true)
    const amount = totals.pending
    const receiptNo = `RCP-${Date.now().toString().slice(-6)}`
    const txId = `TXN-${Math.random().toString(36).substring(2, 11).toUpperCase()}`
    const paymentData = {
      studentId: student.id,
      studentName: student.studentName,
      amount: amount,
      fineAmount: 0,
      otherAmount: 0,
      date: format(new Date(), "yyyy-MM-dd"),
      paymentMode: paymentMethod.toUpperCase(),
      paymentOption: "Portal",
      txId: txId,
      receiptNo: receiptNo,
      status: "Successful",
      createdAt: Date.now()
    }
    try {
      await push(ref(database, `Institutes/${adminUid}/fees`), paymentData)
      await update(ref(database, `Institutes/${adminUid}/admissions/${student.id}`), { lastPaymentDate: new Date().toISOString() })
      handleViewReceipt(paymentData)
      toast({ title: "Payment Successful" })
      setIsPayModalOpen(false)
    } catch (e) {
      toast({ variant: "destructive", title: "Failed" })
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 animate-pulse">Establishing Node Connection...</div>
  if (!student) return (
    <div className="p-20 text-center space-y-6 max-w-md mx-auto">
      <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500 animate-bounce">
        <ShieldCheck className="w-10 h-10" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-black text-black tracking-tight">Access Locked</h3>
        <p className="text-[14px] text-black font-medium">Your enrollment record could not be synchronized with this node. Please re-authenticate to refresh your session.</p>
      </div>
      <Button onClick={() => router.push('/student/login')} className="w-full h-12 bg-primary text-white rounded-xl font-bold text-[14px] tracking-widest border-none">
        Refresh Session
      </Button>
    </div>
  )

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-32">


      <Card className="border-none shadow-xl rounded-[40px] bg-white overflow-hidden p-10">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-12">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="w-24 h-24 rounded-[36px] bg-blue-50 flex items-center justify-center text-[#1e3a8a] shadow-inner">
              <Wallet className="w-12 h-12" />
            </div>
            <div className="text-center md:text-left space-y-3">
              <h2 className="text-3xl font-black text-black tracking-tight leading-none">{student?.studentName || "Candidate"}</h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <Badge variant="outline" className="rounded-lg border-zinc-100 text-black font-bold text-[10px]">Session: {student.session || '2024-25'}</Badge>
                <Badge className={cn(
                  "rounded-full px-4 py-1 text-[9px] font-black  border-none",
                  totals.status === 'Paid' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                )}>{totals.status} Status</Badge>
              </div>
              <p className="text-[11px] font-bold text-black tracking-[0.2em]">{student.course} • Section {student.section}</p>
            </div>
          </div>

          <div className="flex flex-col items-center lg:items-end gap-2">
            <p className="text-[10px] font-black text-black tracking-widest">Balance Remaining</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-zinc-300">₹</span>
              <span className={cn("text-5xl font-black tracking-tighter", totals.pending > 0 ? "text-rose-500" : "text-emerald-600")}>{totals.pending.toLocaleString()}</span>
            </div>
            {student.feeDueDate && <p className="text-[10px] font-bold text-rose-400 tracking-widest mt-1 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Due on {student.feeDueDate}</p>}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <SummaryCard label="Total Academic Fee" value={`₹${totals.total.toLocaleString()}`} icon={<History className="text-black" />} />
        <SummaryCard label="Total Amount Paid" value={`₹${totals.paid.toLocaleString()}`} icon={<CheckCircle2 className="text-emerald-500" />} color="text-emerald-600" />
        <SummaryCard label="Discount / Relief" value="₹0" icon={<TrendingUp className="text-blue-500" />} />
      </div>



      <section className="space-y-6">
        <div className="flex items-center gap-3 px-2"><History className="w-4 h-4 text-black" /><h3 className="text-[14px] font-black text-black tracking-[0.2em]">Transaction Registry</h3></div>
        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
          <div className="overflow-x-auto"><Table><TableHeader className="bg-zinc-50"><TableRow><TableHead className="pl-8 text-[10px] font-black h-14">Date</TableHead><TableHead className="text-[10px] font-black">Receipt No</TableHead><TableHead className="text-[10px] font-black">Method</TableHead><TableHead className="text-[10px] font-black">Amount</TableHead><TableHead className="text-right pr-8 text-[10px] font-black">Receipt</TableHead></TableRow></TableHeader><TableBody>{payments.map((p, i) => (<TableRow key={i} className="border-zinc-50 hover:bg-zinc-50/30 transition-all"><TableCell className="pl-8 font-black text-black font-public-sans text-[14px]">{p.date}</TableCell><TableCell className="text-[14px] font-bold text-black">{p.receiptNo || '-'}</TableCell><TableCell className="text-[10px] font-black text-black tracking-widest">{p.paymentMode || p.method}</TableCell><TableCell className="text-[14px] font-black text-[#1e3a8a]">₹{Number(p.amount).toLocaleString()}</TableCell><TableCell className="text-right pr-8"><Button onClick={() => handleViewReceipt(p)} variant="ghost" className="h-9 px-4 rounded-xl bg-zinc-50 text-black font-black text-[9px] tracking-widest hover:bg-[#1e3a8a] hover:text-white transition-all"><Printer className="w-3.5 h-3.5 mr-1.5" /> Print</Button></TableCell></TableRow>))}</TableBody></Table></div>
        </Card>
      </section>
    </main>
  )
}

function SummaryCard({ label, value, icon, color = "text-black" }: any) {
  return (
    <Card className="border-none shadow-sm rounded-3xl bg-white p-8 group hover:shadow-md transition-all">
      <div className="flex flex-col gap-4"><div className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center transition-colors group-hover:bg-white">{icon}</div><div><p className="text-[10px] font-black text-black tracking-widest mb-1">{label}</p><h4 className={cn("text-2xl font-black tracking-tight leading-none", color)}>{value}</h4></div></div>
    </Card>
  )
}

function PaymentOption({ value, icon, label }: any) {
  return (
    <Label htmlFor={value} className="flex items-center justify-between p-5 rounded-2xl border-2 border-zinc-100 cursor-pointer hover:bg-zinc-50 transition-all [&:has([data-state=checked])]:border-[#1e3a8a] [&:has([data-state=checked])]:bg-blue-50/30 group">
      <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-black group-hover:text-[#1e3a8a] transition-all">{icon}</div><span className="text-[14px] font-bold text-black">{label}</span></div>
      <RadioGroupItem value={value} id={value} className="border-zinc-300 text-[#1e3a8a]" />
    </Label>
  )
}
