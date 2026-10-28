
"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  User,
  Wallet,
  Info,
  GraduationCap,
  CalendarCheck,
  ArrowLeft,
  Printer,
  X,
  ShieldCheck,
  Users,
  Loader2,
  Award,
  IdCard,
  FileText,
  TrendingUp,
  Download,
  Search,
  CheckCircle2,
  MapPin,
  MessageCircle,
  Calendar,
  History
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off, push, update } from "firebase/database"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { toPng } from 'html-to-image'
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"

function PrintLine({ num, label, value }: { num: string, label: string, value: any }) {
  return (
    <div style={{ display: 'flex', gap: '4px', marginBottom: '2px' }}>
      <span style={{ fontWeight: 'bold', width: '25px' }}>{num}</span>
      <span style={{ fontWeight: 'bold' }}>{label}</span>
      <span style={{ borderBottom: '1px solid #333', flex: 1, marginLeft: '8px', paddingLeft: '4px', minHeight: '16px' }}>{value || ''}</span>
    </div>
  )
}

export default function StudentProfilePage() {
  const { id } = useParams()
  const router = useRouter()
  const { database } = useFirebase()
  const { user } = useUser()
  const { resolvedId, isLoading: isIdLoading } = useResolvedId()
  const { toast } = useToast()
  const cardRef = useRef<HTMLDivElement>(null)

  const [student, setStudent] = useState<any>(null)
  const [fees, setFees] = useState<any[]>([])
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([])
  const [marksheets, setMarksheets] = useState<any[]>([])
  const [awardedCertificates, setAwardedCertificates] = useState<any[]>([])
  const [offlineExams, setOfflineExams] = useState<any[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("details")
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false)
  const [isDownloadingId, setIsDownloadingId] = useState(false)
  const [instituteName, setInstituteName] = useState("Your Institute")
  const [instituteProfile, setInstituteProfile] = useState<any>(null)

  useEffect(() => {
    if (!database || !resolvedId || !id) return

    const rootPath = `Institutes/${resolvedId}`
    setIsLoading(true)

    const studentRef = ref(database, `${rootPath}/admissions/${id}`)
    onValue(studentRef, (snapshot) => {
      if (snapshot.exists()) {
        setStudent({ ...snapshot.val(), id: snapshot.key })
      } else {
        setStudent(null)
      }
      setIsLoading(false)
    })

    const feesRef = ref(database, `${rootPath}/fees`)
    onValue(feesRef, (snapshot) => {
      const data = snapshot.val() || {}
      setFees(Object.values(data).filter((f: any) => f.studentId === id).reverse())
    })

    const attRef = ref(database, `${rootPath}/attendance/Student`)
    onValue(attRef, (snapshot) => {
      const data = snapshot.val() || {}
      const logs: any[] = []
      Object.keys(data).forEach(date => {
        Object.keys(data[date]).forEach(batch => {
          if (data[date][batch][id as string]) logs.push({ date, ...data[date][batch][id as string] })
        })
      })
      setAttendanceLogs(logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
    })

    onValue(ref(database, `${rootPath}/marksheets`), (snapshot) => {
      const data = snapshot.val() || {}
      setMarksheets(Object.values(data).filter((m: any) => m.studentId === id))
    })

    onValue(ref(database, `${rootPath}/awarded-certificates/${id}`), (snapshot) => {
      const data = snapshot.val() || {}
      setAwardedCertificates(Object.values(data).reverse())
    })

    onValue(ref(database, `${rootPath}/offline-exams`), (snapshot) => {
      const data = snapshot.val() || {}
      const list = Object.keys(data).map(k => ({ ...data[k], id: k }))
      setOfflineExams(list.filter(e => e.assignedStudents?.[id as string]))
    })

    onValue(ref(database, `${rootPath}/profile`), (s) => {
      if (s.val()) {
        setInstituteProfile(s.val())
        setInstituteName(s.val().instituteName || "Your Institute")
      }
    })

    return () => {
      off(studentRef)
      off(feesRef)
      off(attRef)
    }
  }, [database, resolvedId, id])

  const totalCollected = useMemo(() => fees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0), [fees])
  const pendingFees = useMemo(() => (Number(student?.netFees || 0)) - totalCollected, [student, totalCollected])

  const handleDownloadPDF = (record: any) => {
    const doc = new jsPDF()
    doc.setDrawColor(0).setLineWidth(0.5).rect(5, 5, 200, 287)
    doc.setFont("helvetica", "bold").setFontSize(22).setTextColor(30, 58, 138)
    doc.text(instituteName.toUpperCase(), 105, 25, { align: 'center' })
    doc.setFontSize(9).setTextColor(80).setFont("helvetica", "normal")
    doc.text(instituteProfile?.address || "Institutional Academic Center", 105, 32, { align: 'center' })
    doc.text(`Email: ${instituteProfile?.email || '-'} | Web: ${instituteProfile?.websiteUrl || '-'}`, 105, 38, { align: 'center' })

    doc.setFillColor(30, 58, 138).rect(5.5, 50, 199, 10, 'F')
    doc.setTextColor(255).setFontSize(12).setFont("helvetica", "bold").text(record.examName.toUpperCase(), 105, 56.5, { align: 'center' })

    autoTable(doc, {
      startY: 65,
      margin: { left: 10, right: 10 },
      head: [['Candidate Details', 'Academic Info']],
      body: [[`Name: ${record.studentName.toUpperCase()}\nAdm No: ${record.enrollmentNo}\nRoll No: ${record.rollNo}`, `Class: ${record.courseName}\nSem: ${record.semester}\nYear: ${record.academicYear}`]],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 5 }
    })

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      margin: { left: 10, right: 10 },
      head: [['Sr', 'Subject', 'Theory Max', 'Obtained', 'Practical Max', 'Obtained', 'Grade', 'Result']],
      body: record.subjects.map((s: any, i: number) => [i + 1, s.name.toUpperCase(), s.theoryTotal, s.theoryObtain, s.practicalTotal, s.practicalObtain, s.grade, s.result]),
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40], halign: 'center' },
      styles: { fontSize: 8, halign: 'center' }
    })

    const finalY = (doc as any).lastAutoTable.finalY + 15
    doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(0)
    doc.text(`GRAND TOTAL: ${record.grandObtained} / ${record.grandTotalMax}`, 15, finalY)
    doc.text(`PERCENTAGE: ${record.percentage}%`, 15, finalY + 10)
    doc.text(`RESULT: ${record.overallResult}`, 15, finalY + 20)
    doc.save(`Transcript_${record.studentName}.pdf`)
  }

  const generatePremiumReceipt = (payment: any) => {
    const doc = new jsPDF();
    const dueAmount = pendingFees;

    // Header Color Accent
    const primaryColor: [number, number, number] = [30, 58, 138]; // Deep Blue
    const accentColor: [number, number, number] = [13, 148, 136]; // Teal

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

    // Institute Logo & Name Section
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

    // Details Grid with colors
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
        ['COLLECTING AMOUNT', payment.txId || '-', payment.paymentMode || payment.method || 'Portal', `INR ${Number(payment.amount).toLocaleString()}`],
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
    if (!resolvedId || !database || !student) return
    const formData = new FormData(e.currentTarget)
    const amount = Number(formData.get("amount"))

    if (amount > pendingFees) {
      toast({
        variant: "destructive",
        title: "Limit Exceeded",
        description: `Cannot collect more than the pending balance of INR ${pendingFees.toLocaleString()}`
      })
      return
    }

    const paymentData = {
      studentId: student.id,
      studentName: student.studentName,
      amount: formData.get("amount") as string,
      fineAmount: formData.get("fineAmount") || "0",
      otherAmount: formData.get("otherAmount") || "0",
      date: formData.get("date") as string,
      method: formData.get("method") as string,
      txId: formData.get("txId") || `TXN-${Date.now()}`,
      receiptNo: `RCP-${Date.now().toString().slice(-6)}`,
      createdAt: Date.now()
    }
    try {
      await push(ref(database, `Institutes/${resolvedId}/fees`), paymentData)
      toast({ title: "Payment Recorded" })
      if (formData.get("generateCopy") === "on") generatePremiumReceipt(paymentData)
      setIsCollectModalOpen(false)
    } catch (err) { toast({ variant: "destructive", title: "Error" }) }
  }

  const handleDownloadId = async () => {
    if (!cardRef.current) return
    setIsDownloadingId(true)
    try {
      const dataUrl = await toPng(cardRef.current, { quality: 1.0, pixelRatio: 3, skipFonts: true })
      const link = document.createElement('a')
      link.download = `ID_CARD_${student?.studentName?.replace(/\s+/g, '_')}.png`
      link.href = dataUrl
      link.click()
    } catch (err) { console.error(err) }
    finally { setIsDownloadingId(false) }
  }

  if (isLoading || isIdLoading) return <div className="p-20 text-center font-black text-zinc-300 tracking-widest animate-pulse">Establishing Secure Profile Sync...</div>
  if (!student) return <div className="p-20 text-center text-black font-bold">Record Mapping Failed</div>

  return (
    <div className="min-h-screen bg-[#F8FAFC] print:bg-white flex font-public-sans text-black">
      <Sidebar className="print:hidden" />
      <div className="lg:pl-[300px] print:pl-0 flex flex-col flex-1 w-full overflow-x-hidden text-[14px]">
        <TopNav className="print:hidden" />
        <main className="flex-1 p-4 md:p-8 space-y-4 md:space-y-8 animate-in fade-in duration-500 print:p-0 print:m-0">

          <div className="flex items-center justify-between print:hidden">
            <Button variant="ghost" onClick={() => router.back()} className="text-black hover:text-black transition-none gap-2 font-bold tracking-widest text-[10px]">
              <ArrowLeft className="w-4 h-4" /> Directory
            </Button>
            <div className="flex items-center gap-3">
              <Button onClick={() => window.print()} className="bg-zinc-900 text-white rounded-lg h-10 px-6 font-bold text-[14px] gap-2 transition-none border-none shadow-sm">
                <Printer className="h-4 w-4" /> Print Form
              </Button>
            </div>
          </div>

          <Card className="border-none shadow-sm rounded-[32px] bg-white p-6 md:p-10 overflow-hidden relative print:hidden">
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="relative group">
                <Avatar className="h-40 w-40 rounded-[48px] border-8 border-zinc-50 shadow-2xl transition-transform duration-500 group-hover:scale-105">
                  <AvatarImage src={student?.studentPhotoUrl} />
                  <AvatarFallback className="bg-primary text-white text-5xl font-black">{student?.studentName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2.5 rounded-2xl shadow-xl border-4 border-white"><ShieldCheck className="w-6 h-6" /></div>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-6">
                <ProfileHeaderItem label="NAME" value={student?.studentName} />
                <ProfileHeaderItem label="ID NUMBER" value={student?.admissionNo} />
                <ProfileHeaderItem label="ROLL NO" value={student?.rollNo || '-'} />
                <ProfileHeaderItem label="CLASS" value={student?.course} />
                <ProfileHeaderItem label="BOARD" value={student?.board || '-'} />
                <ProfileHeaderItem label="BATCH" value={student?.batch} />
                <ProfileHeaderItem label="SECTION" value={student?.section || 'A'} />
              </div>
            </div>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full print:hidden">
            <TabsList className="bg-white p-2 rounded-[24px] h-auto flex flex-wrap md:flex-nowrap justify-start gap-2 shadow-sm border border-zinc-100 overflow-x-auto scrollbar-none">
              <ProfileTabTrigger value="details" label="Profile" icon={<User className="w-4 h-4" />} />
              <ProfileTabTrigger value="fees" label="Fees" icon={<Wallet className="w-4 h-4" />} />
              <ProfileTabTrigger value="attendance" label="Attendance" icon={<CalendarCheck className="w-4 h-4" />} />
              <ProfileTabTrigger value="exams" label="Exams & Marks" icon={<Award className="w-4 h-4" />} />
              <ProfileTabTrigger value="certificates" label="Certificates" icon={<Award className="w-4 h-4 text-rose-500" />} />
              <ProfileTabTrigger value="idcard" label="ID Card" icon={<IdCard className="w-4 h-4 text-blue-500" />} />
            </TabsList>

            <TabsContent value="details" className="mt-8 space-y-8">
              <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-6 md:p-10">
                <div className="space-y-12">
                  <SectionGrid title="Identity & Personal" icon={<Info className="text-[#0D9488]" />}>
                    <DetailBox label="GENDER" value={student?.gender} />
                    <DetailBox label="D.O.B." value={student?.dob} />
                    <DetailBox label="BLOOD GROUP" value={student?.bloodGroup} />
                    <DetailBox label="RELIGION" value={student?.religion} />
                    <DetailBox label="CATEGORY" value={student?.category} />
                    <DetailBox label="BOARD" value={student?.board} />
                    <DetailBox label="ADHAR NO" value={student?.adharNumber} />
                  </SectionGrid>
                  <SectionGrid title="Academic Mapping" icon={<GraduationCap className="text-indigo-500" />}>
                    <DetailBox label="SESSION" value={student?.session} />
                    <DetailBox label="ADMISSION DATE" value={student?.admissionDate} />
                    <DetailBox label="SOURCE" value={student?.source} />
                    <DetailBox label="MOBILE" value={student?.mobile} />
                    <DetailBox label="EMAIL" value={student?.email} />
                    <DetailBox label="QUALIFICATION" value={student?.qualification} />
                  </SectionGrid>
                  <SectionGrid title="Parent/Guardian" icon={<Users className="text-amber-500" />}>
                    <DetailBox label="FATHER NAME" value={student?.fatherName} />
                    <DetailBox label="FATHER MOBILE" value={student?.fatherMobile} />
                    <DetailBox label="MOTHER NAME" value={student?.motherName} />
                  </SectionGrid>
                  <div className="space-y-2"><Label className="text-[10px] font-black text-black tracking-widest ml-1">ADDRESS</Label><div className="p-5 bg-zinc-50/50 border border-zinc-100 rounded-2xl text-black font-bold">{student?.address || '-'}</div></div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="fees" className="mt-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <MetricBox label="Total Fees" value={student?.netFees} color="text-black" />
                <MetricBox label="Fees Paid" value={totalCollected} color="text-emerald-600" />
                <MetricBox label="Balance" value={pendingFees} color="text-rose-600" />
              </div>
              <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
                <div className="p-6 md:p-8 border-b border-zinc-50 flex flex-col md:flex-row items-center justify-between gap-4">
                  <h3 className="text-[14px] font-black text-black tracking-widest">Transaction Ledger</h3>
                  <Button onClick={() => setIsCollectModalOpen(true)} className="bg-[#0D9488] text-white h-9 px-6 rounded-xl font-bold text-[14px] shadow-lg border-none active:scale-95 transition-all w-full md:w-auto">Collect Fee+</Button>
                </div>
                <div className="overflow-x-auto scrollbar-thin">
                  <Table className="lg:min-w-full">
                    <TableHeader className="bg-zinc-50">
                      <TableRow>
                        <TableHead className="pl-10 text-[10px] font-black h-14">Date</TableHead>
                        <TableHead className="text-[10px] font-black">Method</TableHead>
                        <TableHead className="text-[10px] font-black">Amount</TableHead>
                        <TableHead className="text-right pr-10 text-[10px] font-black">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fees.map((f, i) => (
                        <TableRow key={i} className="border-zinc-50 hover:bg-zinc-50/30">
                          <TableCell data-label="DATE" className="pl-6 md:pl-10 text-[14px] font-bold text-black font-public-sans">{f.date}</TableCell>
                          <TableCell data-label="METHOD" className="text-[14px] font-black text-black">{f.method || f.paymentMode}</TableCell>
                          <TableCell data-label="AMOUNT" className="font-black text-emerald-600">₹{Number(f.amount).toLocaleString()}</TableCell>
                          <TableCell data-label="ACTIONS" className="text-right pr-6 md:pr-10">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => generatePremiumReceipt(f)} className="p-2 hover:bg-zinc-100 rounded-xl transition-all border-none bg-transparent" title="Download Receipt"><Download className="h-4 w-4 text-emerald-600" /></button>
                              <button
                                onClick={() => window.open(`https://wa.me/${student?.mobile?.replace(/\D/g, '')}?text=Hello *${student?.studentName}*,\n\nYour fee payment of *₹${Number(f.amount).toLocaleString()}* has been successfully recorded at *${instituteName}*.\n\nReceipt No: ${f.receiptNo || '-'}\nBalance: ₹${pendingFees.toLocaleString()}`, '_blank')}
                                className="p-2 hover:bg-zinc-100 rounded-xl transition-all border-none bg-transparent" title="Share on WhatsApp"
                              >
                                <MessageCircle className="h-4 w-4 text-emerald-500" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="attendance" className="mt-8">
              <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
                <div className="p-8 border-b border-zinc-50"><h3 className="text-[14px] font-black text-black tracking-widest">Presence Logs</h3></div>
                <div className="overflow-x-auto scrollbar-thin">
                  <Table>
                    <TableHeader className="bg-zinc-50">
                      <TableRow>
                        <TableHead className="pl-10 text-[10px] font-black h-14">Date</TableHead>
                        <TableHead className="text-[10px] font-black">Status</TableHead>
                        <TableHead className="text-right pr-10 text-[10px] font-black">Internal Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceLogs.map((log, i) => (
                        <TableRow key={i} className="border-zinc-50">
                          <TableCell data-label="DATE" className="pl-6 md:pl-10 font-black text-black font-public-sans text-[14px]">{log.date}</TableCell>
                          <TableCell data-label="STATUS"><Badge className={cn("rounded-md text-[9px] font-black border-none", log.status === 'Present' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>{log.status}</Badge></TableCell>
                          <TableCell data-label="NOTE" className="text-right pr-6 md:pr-10 text-[14px] text-black italic">"{log.remarks || 'No notes'}"</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="exams" className="mt-8 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <section className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-zinc-50 pb-2"><TrendingUp className="w-5 h-5 text-[#1e3a8a]" /><h3 className="text-[14px] font-black text-black tracking-widest">Marksheets</h3></div>
                  <div className="grid grid-cols-1 gap-4">
                    {marksheets.map((m, i) => (
                      <Card key={i} className="p-6 rounded-3xl border border-zinc-100 bg-white flex items-center justify-between group hover:shadow-lg transition-all">
                        <div>
                          <p className="text-[14px] font-black text-black">{m.examName}</p>
                          <p className="text-[10px] font-bold text-black tracking-widest">Score: {m.percentage}% • Grade {m.grade} • {m.status}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDownloadPDF(m)} className="h-10 w-10 p-0 rounded-xl bg-zinc-50 text-black hover:text-primary transition-all">
                          <FileText className="w-5 h-5" />
                        </Button>
                      </Card>
                    ))}
                  </div>
                </section>
                <section className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-zinc-50 pb-2"><Search className="w-5 h-5 text-rose-500" /><h3 className="text-[14px] font-black text-black tracking-widest">Offline Exam Assignments</h3></div>
                  <div className="grid grid-cols-1 gap-4">
                    {offlineExams.map((e, i) => (
                      <Card key={i} className="p-6 rounded-3xl border border-zinc-100 bg-white flex items-center justify-between">
                        <div>
                          <p className="text-[14px] font-black text-black">{e.title}</p>
                          <p className="text-[10px] font-bold text-black tracking-widest">Date: {e.examDate} | {e.timing} | Marks: {e.totalMarks}</p>
                        </div>
                        <Badge className="bg-emerald-50 text-emerald-600 border-none text-[8px] font-black">Mapped</Badge>
                      </Card>
                    ))}
                  </div>
                </section>
              </div>
            </TabsContent>

            <TabsContent value="certificates" className="mt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {awardedCertificates.map((cert, i) => (
                  <Card key={i} className="border-none shadow-sm rounded-[32px] bg-white p-8 group hover:shadow-xl transition-all duration-500">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center text-rose-500 mb-6 shadow-inner group-hover:bg-rose-50 transition-colors"><Award className="w-8 h-8" /></div>
                    <div className="space-y-1 mb-8"><h4 className="text-lg font-black text-black tracking-tight">{cert.name}</h4><p className="text-[10px] font-bold text-black tracking-widest">Issued: {cert.issuedDate}</p></div>
                    <Button variant="outline" className="w-full rounded-2xl h-11 border-zinc-100 text-black font-black text-[10px] tracking-widest gap-2"><Download className="w-3.5 h-3.5" /> Get Copy</Button>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="idcard" className="mt-8 flex flex-col items-center gap-10">
              <div ref={cardRef} className="w-[350px] bg-white rounded-[40px] border border-zinc-100 shadow-2xl overflow-hidden flex flex-col print:m-0 print:shadow-none">
                <div className="bg-[#1e3a8a] p-8 text-center space-y-1 relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
                  <h3 className="text-white font-black text-[14px] tracking-widest">{instituteName}</h3>
                  <p className="text-white/40 text-[9px] font-bold tracking-[0.3em]">Identity Card</p>
                </div>
                <div className="p-10 flex flex-col items-center gap-8">
                  <div className="relative">
                    <Avatar className="h-32 w-32 rounded-[40px] border-8 border-zinc-50 shadow-lg">
                      <AvatarFallback className="text-4xl font-black bg-zinc-100 text-zinc-300">{student?.studentName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-2xl shadow-xl border-4 border-white"><ShieldCheck className="w-5 h-5" /></div>
                  </div>
                  <div className="text-center space-y-1">
                    <h4 className="text-2xl font-black text-black tracking-tight">{student?.studentName}</h4>
                    <p className="text-primary font-black text-[14px] tracking-widest">{student?.course}</p>
                  </div>
                  <div className="w-full grid grid-cols-2 gap-y-6 pt-8 border-t border-zinc-50">
                    <CardMeta label="ADM NO." value={student?.admissionNo} />
                    <CardMeta label="ROLL NO." value={student?.rollNo || '-'} />
                    <CardMeta label="SECTION" value={student?.section || 'A'} />
                    <CardMeta label="SESSION" value={student?.session || '2024-25'} />
                  </div>
                </div>
                <div className="bg-zinc-50 p-6 border-t border-zinc-100 text-center">
                  <p className="text-[8px] font-bold text-black tracking-widest">{instituteProfile?.address || 'Main Campus, Academic Block'}</p>
                </div>
              </div>
              <Button onClick={handleDownloadId} disabled={isDownloadingId} className="bg-primary hover:opacity-90 text-white rounded-xl h-14 px-12 font-black text-[14px] tracking-widest shadow-xl border-none gap-2">
                {isDownloadingId ? <Loader2 className="animate-spin w-4 h-4" /> : <Download className="w-4 h-4" />} Download ID PNG
              </Button>
            </TabsContent>
          </Tabs>

          <Dialog open={isCollectModalOpen} onOpenChange={setIsCollectModalOpen}>
            <DialogContent className="max-w-md w-[95vw] p-0 border-none rounded-[32px] overflow-hidden bg-white shadow-2xl">
              <div className="bg-[#1e3a8a] p-6 md:p-8 text-white flex items-center justify-between">
                <DialogTitle className="text-xl font-black">Collect Fee</DialogTitle>
                <DialogClose asChild><button className="p-2 hover:bg-white/10 rounded-xl transition-all border-none bg-transparent text-white"><X className="w-5 h-5" /></button></DialogClose>
              </div>
              <ScrollArea className="flex-1 w-full text-black px-6 md:px-8 py-6" type="always">
                <form onSubmit={handleCollectFee} className="space-y-6">
                  <div className="space-y-1.5"><Label className="text-[10px] font-black text-black tracking-widest">Amount (INR)</Label><Input name="amount" type="number" required className="h-12 rounded-xl font-black text-emerald-600 text-lg" defaultValue={pendingFees > 0 ? pendingFees : ""} /></div>
                  <div className="space-y-1.5"><Label className="text-[10px] font-black text-black tracking-widest">Fine / Late Charges</Label><Input name="fineAmount" type="number" defaultValue="0" className="h-12 border-zinc-200 rounded-xl font-bold" /></div>
                  <div className="space-y-1.5"><Label className="text-[10px] font-black text-black tracking-widest">Other Charges</Label><Input name="otherAmount" type="number" defaultValue="0" className="h-12 border-zinc-200 rounded-xl font-bold" /></div>
                  <div className="space-y-1.5"><Label className="text-[10px] font-black text-black tracking-widest">Method</Label><Select name="method" defaultValue="Cash"><SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Online">Online</SelectItem><SelectItem value="Bank">Bank Transfer</SelectItem></SelectContent></Select></div>
                  <div className="space-y-1.5"><Label className="text-[10px] font-black text-black tracking-widest">Reference / TX ID</Label><Input name="txId" placeholder="Optional..." className="h-12 rounded-xl font-bold" /></div>
                  <div className="space-y-1.5"><Label className="text-[10px] font-black text-black tracking-widest">Date</Label><Input name="date" type="date" required defaultValue={format(new Date(), "yyyy-MM-dd")} className="h-12 rounded-xl font-bold" /></div>
                  <div className="flex items-center space-x-2 pt-2"><Checkbox id="generateCopy" name="generateCopy" defaultChecked /><Label htmlFor="generateCopy" className="text-xs font-bold cursor-pointer">Generate Receipt Copy</Label></div>
                  <Button type="submit" className="w-full h-14 bg-primary text-white rounded-2xl font-black text-[10px] tracking-widest shadow-xl border-none active:scale-95">Record Payment</Button>
                </form>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          {/* HIDDEN PRINT DOSSIER - Nirvana Education Admission Form */}
          <div className="absolute -left-[9999px] top-0 opacity-0 pointer-events-none print:static print:left-0 print:opacity-100 print:pointer-events-auto print:block font-sans bg-white text-black print-dossier w-full" style={{ padding: '20px', fontSize: '11px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: '10px' }}>Helpline: {instituteProfile?.phone || '18849049334'}</div>
              </div>
              <div style={{ textAlign: 'center', flex: 2 }}>
                {instituteProfile?.logoUrl && (
                  <img src={instituteProfile.logoUrl} alt="Logo" style={{ height: '80px', margin: '0 auto', display: 'block' }} />
                )}
                <div style={{ fontWeight: '900', fontSize: '16px', marginTop: '4px' }}>{instituteName}</div>
                {instituteProfile?.address && <div style={{ fontSize: '9px' }}>{instituteProfile.address}</div>}
              </div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold', fontSize: '10px' }}>Email: {instituteProfile?.email || ''}</div>
              </div>
            </div>
            <div style={{ borderTop: '2px solid #333', borderBottom: '2px solid #333', background: '#2d5a27', color: 'white', textAlign: 'center', fontWeight: '900', fontSize: '13px', padding: '4px 0', marginBottom: '8px', letterSpacing: '2px' }}>
              ADMISSION FORM
            </div>

            {/* Admission No + Class + Photo Row (ID removed from upper side as requested) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 'bold' }}>Admission Sought for Class: </span>
                <span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '100px', marginRight: '10px' }}>{student?.course}</span>
                <span style={{ fontWeight: 'bold' }}>Board: </span>
                <span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '100px' }}>{student?.board || ''}</span>
              </div>
              <div style={{ width: '110px', height: '130px', border: '2px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '16px', flexShrink: 0, overflow: 'hidden' }}>
                {student?.studentPhotoUrl
                  ? <img
                    src={student.studentPhotoUrl}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                    alt="Student"
                  />
                  : <div style={{ textAlign: 'center', fontSize: '9px', color: '#999', padding: '6px' }}>Fix Photograph of Student</div>
                }
              </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: '10px', marginBottom: '8px', fontStyle: 'italic' }}>(USE CAPITAL LETTERS ONLY)</div>

            {/* Fields 1–9 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px', marginBottom: '6px' }}>
              <PrintLine num="1." label="Name (Master/Miss)" value={student?.studentName} />
              <PrintLine num="2." label="Father's Name" value={student?.fatherName} />
              <PrintLine num="3." label="Mother's Name" value={student?.motherName} />
              <PrintLine num="4." label="Date of Birth" value={student?.dob} />
              <PrintLine num="5." label="School Name" value={student?.schoolName} />
            </div>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '4px' }}>
              <div style={{ flex: 2 }}><span style={{ fontWeight: 'bold' }}>6. Category SC/OBC/ST: </span><span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '120px' }}>{student?.category || ''}</span></div>
              <div style={{ flex: 1 }}><span style={{ fontWeight: 'bold' }}>7. Caste: </span><span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '80px' }}>{student?.caste || ''}</span></div>
            </div>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '4px' }}>
              <div style={{ flex: 2 }}><span style={{ fontWeight: 'bold' }}>8. Religion: </span><span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '140px' }}>{student?.religion || ''}</span></div>
              <div style={{ flex: 1 }}><span style={{ fontWeight: 'bold' }}>9. Sex (Male/Female): </span><span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '80px' }}>{student?.gender || ''}</span></div>
            </div>

            <div style={{ marginBottom: '4px' }}>
              <div style={{ fontWeight: 'bold' }}>10. Permanent Address:</div>
              <div style={{ borderBottom: '1px solid #333', minHeight: '18px', marginLeft: '8px', marginBottom: '3px' }}>{student?.address || ''}</div>
              <div style={{ borderBottom: '1px solid #333', minHeight: '18px', marginLeft: '8px', marginBottom: '3px' }}></div>
              <div style={{ borderBottom: '1px solid #333', minHeight: '18px', marginLeft: '8px' }}></div>
            </div>
            <div style={{ marginBottom: '4px' }}>
              <div style={{ fontWeight: 'bold' }}>11. Correspondence Address:</div>
              <div style={{ borderBottom: '1px solid #333', minHeight: '18px', marginLeft: '8px', marginBottom: '3px' }}>{student?.correspondenceAddress || ''}</div>
              <div style={{ borderBottom: '1px solid #333', minHeight: '18px', marginLeft: '8px', marginBottom: '3px' }}></div>
              <div style={{ borderBottom: '1px solid #333', minHeight: '18px', marginLeft: '8px' }}></div>
            </div>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '4px' }}>
              <div style={{ flex: 1 }}><span style={{ fontWeight: 'bold' }}>12. Phone/Mobile Office: </span><span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '100px' }}>{student?.officePhone || ''}</span></div>
              <div style={{ flex: 1 }}><span style={{ fontWeight: 'bold' }}>Res.: </span><span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '100px' }}>{student?.residencePhone || student?.mobile || ''}</span></div>
            </div>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '4px' }}>
              <div style={{ flex: 1 }}><span style={{ fontWeight: 'bold' }}>13. Mother Tongue: </span><span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '100px' }}>{student?.motherTongue || ''}</span></div>
              <div style={{ flex: 1 }}><span style={{ fontWeight: 'bold' }}>Nationality: </span><span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '100px' }}>{student?.nationality || 'Indian'}</span></div>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontWeight: 'bold' }}>14. Transport facilities required (Yes/ No): </span>
              <span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '60px', marginRight: '8px' }}>{student?.transportRequired || ''}</span>
              <span style={{ fontWeight: 'bold' }}> If yes, from </span>
              <span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '80px', marginRight: '8px' }}>{student?.transportFrom || ''}</span>
              <span style={{ fontWeight: 'bold' }}> to </span>
              <span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '80px' }}>{student?.transportTo || ''}</span>
            </div>

            {/* Tuition / Previous School */}
            <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>15. Tuition Class in which he/she has been studying:</div>
            <div style={{ marginLeft: '12px', marginBottom: '2px' }}><span style={{ fontWeight: 'bold' }}>Name of institution: </span><span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '280px' }}>{student?.prevInstitution || ''}</span></div>
            <div style={{ marginLeft: '12px', marginBottom: '2px' }}><span style={{ fontWeight: 'bold' }}>Class: </span><span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '280px' }}>{student?.prevClass || ''}</span></div>
            <div style={{ marginLeft: '12px', marginBottom: '8px' }}><span style={{ fontWeight: 'bold' }}>Medium: </span><span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '280px' }}>{student?.prevMedium || ''}</span></div>

            <div style={{ marginBottom: '15px', pageBreakInside: 'avoid' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>16. Particulars of all brother's/ sister's study in the same institute:</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5', height: '25px' }}>
                    <th style={{ border: '1.5px solid #333', padding: '4px 8px', width: '60px', textAlign: 'left' }}>S.No.</th>
                    <th style={{ border: '1.5px solid #333', padding: '4px 8px', textAlign: 'left' }}>Name of the Child</th>
                    <th style={{ border: '1.5px solid #333', padding: '4px 8px', width: '80px', textAlign: 'left' }}>Age</th>
                    <th style={{ border: '1.5px solid #333', padding: '4px 8px', width: '100px', textAlign: 'left' }}>Class</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3].map(i => (
                    <tr key={i} style={{ height: '25px' }}>
                      <td style={{ border: '1px solid #333', padding: '4px 8px' }}>{i}.</td>
                      <td style={{ border: '1px solid #333', padding: '4px 8px' }}>{(student as any)?.[`siblingName${i}`] || '-'}</td>
                      <td style={{ border: '1px solid #333', padding: '4px 8px' }}>{(student as any)?.[`siblingAge${i}`] || '-'}</td>
                      <td style={{ border: '1px solid #333', padding: '4px 8px' }}>{(student as any)?.[`siblingClass${i}`] || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Miscellaneous */}
            <div style={{ marginBottom: '4px' }}><span style={{ fontWeight: 'bold' }}>17. Any Physical ailment: </span><span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '300px' }}>{student?.physicalAilment || ''}</span></div>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '4px' }}>
              <div style={{ flex: 1 }}><span style={{ fontWeight: 'bold' }}>18. Any two hobbies of your child: (a) </span><span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '80px' }}>{student?.hobby1 || ''}</span></div>
              <div style={{ flex: 1 }}><span style={{ fontWeight: 'bold' }}>(b) </span><span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '80px' }}>{student?.hobby2 || ''}</span></div>
            </div>
            <div style={{ marginBottom: '12px' }}><span style={{ fontWeight: 'bold' }}>19. Special Interest: </span><span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '300px' }}>{student?.specialInterest || ''}</span></div>

            {/* Family Information */}
            <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '6px', fontSize: '11px' }}>20. Family Information (WRITE IN CAPITAL LETTERS)</div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: '3px' }}><span style={{ fontWeight: 'bold' }}>Mother's Name: </span><span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '180px' }}>{student?.motherName || ''}</span></div>
                <div style={{ marginBottom: '3px' }}><span style={{ fontWeight: 'bold' }}>Academic Qualification: </span><span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '150px' }}>{student?.motherQualification || ''}</span></div>
                <div style={{ marginBottom: '6px' }}><span style={{ fontWeight: 'bold' }}>Occupation &amp; Designation: </span><span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '130px' }}>{student?.motherOccupation || ''}</span></div>
                <div style={{ marginBottom: '3px' }}><span style={{ fontWeight: 'bold' }}>Father's Name: </span><span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '180px' }}>{student?.fatherName || ''}</span></div>
                <div style={{ marginBottom: '3px' }}><span style={{ fontWeight: 'bold' }}>Academic Qualification: </span><span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '150px' }}>{student?.fatherQualification || ''}</span></div>
                <div style={{ marginBottom: '3px' }}><span style={{ fontWeight: 'bold' }}>Occupation &amp; Designation: </span><span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '130px' }}>{student?.fatherOccupation || ''}</span></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100px' }}>
                <div style={{ width: '100px', height: '110px', border: '2px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {student?.motherPhotoUrl ? <img src={student.motherPhotoUrl} crossOrigin="anonymous" loading="eager" style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Mother" /> : <div style={{ textAlign: 'center', fontSize: '8px', color: '#999', padding: '4px' }}>Fix Photograph of Mother</div>}
                </div>
                <div style={{ width: '100px', height: '110px', border: '2px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {student?.fatherPhotoUrl ? <img src={student.fatherPhotoUrl} crossOrigin="anonymous" loading="eager" style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Father" /> : <div style={{ textAlign: 'center', fontSize: '8px', color: '#999', padding: '4px' }}>Fix Photograph of Father</div>}
                </div>
              </div>
            </div>

            {/* Declaration */}
            <div style={{ marginTop: '12px', fontSize: '9px', fontStyle: 'italic', lineHeight: '1.5', borderTop: '1px solid #ccc', paddingTop: '8px' }}>
              I certify that I am the parent/ bonafide guardian of the child, and the information given in this form is true to the best of my knowledge. I carefully read the prospectus and agree to abide by the rules, regulations, and procedures laid down therein and accept that they may change from time to time at the directions of the school management and extend my full co-operation to keep things moving in a healthy manner.
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '160px', borderBottom: '1px solid #333', marginBottom: '3px' }}></div>
                <div style={{ fontSize: '10px', fontWeight: 'bold' }}>Signature of Mother</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '160px', borderBottom: '1px solid #333', marginBottom: '3px' }}></div>
                <div style={{ fontSize: '10px', fontWeight: 'bold' }}>Signature of Father</div>
              </div>
            </div>
            <div style={{ marginTop: '12px' }}><span style={{ fontWeight: 'bold', fontSize: '10px' }}>Date of Signature: </span><span style={{ borderBottom: '1px solid #333', display: 'inline-block', minWidth: '120px' }}></span></div>

            {/* PAGE 2: For Office Use Only */}
            <div style={{ pageBreakBefore: 'always', padding: '40px', backgroundColor: '#FDE6D2', minHeight: '1000px', border: '2px solid #333', marginTop: '20px' }}>
              <div style={{ textAlign: 'center', textDecoration: 'underline', fontWeight: 'bold', fontSize: '14px', marginBottom: '20px' }}>For Office Use Only</div>
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12px', marginBottom: '20px' }}>TO BE ATTACH FOLLOWING DOCUMENTS :</div>

              <ul style={{ listStyleType: 'disc', marginLeft: '40px', fontSize: '11px', lineHeight: '2' }}>
                <li style={{ marginBottom: '10px' }}>Attested Xerox copy of Date of Birth Certificate</li>
                <li style={{ marginBottom: '10px' }}>Photographs of student And Parents (Father and Mother)</li>
                <li style={{ marginBottom: '10px' }}>Passing Certificate/ Mark Sheet</li>
                <li>Attested Xerox copy of SC/OBC/ ST</li>
              </ul>

              <div style={{ border: '2px solid #333', padding: '20px', marginTop: '40px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                  <div>Admission No.__________________________</div>
                  <div>Reg. No.__________________________</div>
                  <div>Admitted to class _________________</div>
                </div>
                <div style={{ display: 'flex', gap: '40px', marginBottom: '15px' }}>
                  <div>Date__________________________</div>
                  <div>Section__________________________</div>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  Parents expectations and remarks: __________________________________________________________________________________________
                </div>
                <div style={{ marginBottom: '15px' }}>
                  Checked and recommended: __________________________________________________________________________________________________
                </div>
                <div style={{ marginTop: '40px' }}>
                  Approved By Name and Date_________________________________________________________________________________________________
                </div>
              </div>
            </div>

            {/* PAGE 3: Terms & Conditions */}
            <div style={{ pageBreakBefore: 'always', padding: '40px', backgroundColor: '#fff', fontSize: '10px', lineHeight: '1.6' }}>
              <div style={{ textAlign: 'center', textDecoration: 'underline', fontWeight: 'bold', fontSize: '14px', marginBottom: '20px' }}>Admission Procedures, Terms, and Conditions</div>

              <div style={{ marginBottom: '15px' }}>
                <span style={{ fontWeight: 'bold' }}>1. Refund of Fees</span><br />
                1.1 Fees once paid are non refundable.
              </div>

              <div style={{ marginBottom: '15px' }}>
                <span style={{ fontWeight: 'bold' }}>2. Withdrawal Rules</span><br />
                2.1. Application for withdrawal must be submitted before a month and a written letter should be sent by the parent to confirm the same.<br />
                2.2. Clearance must be obtained from the library and transport before putting withdrawal.<br />
                2.3. All due clearance certificates will be issued once all the fees and relative charges are taken care of.
              </div>

              <div style={{ marginBottom: '15px' }}>
                <span style={{ fontWeight: 'bold' }}>3. Transport Rules</span><br />
                3.1. Request for transport should be raised 15 days before the commencement of classes.<br />
                3.2. It will be the sole responsibility of parents to escort the child to the designated stop. The transport facility is extended at the sole risk and responsibility of parents.<br />
                3.3. Any suggestions or complaints should be reported to the institute on priority.<br />
                3.4. The vehicle will stop only at the pre-decided stops and those who are late should reach the institute on their own.<br />
                3.5. Parking for vehicles at the institute should be done at the defined Parking spots by the students.
              </div>

              <div style={{ marginBottom: '15px' }}>
                <span style={{ fontWeight: 'bold' }}>4. Right of alteration/Modification</span><br />
                4.1 The Management reserves the right to modify, after, and including any other terms and conditions that may be deemed fit in the interest of the institution, without any prior notice.
              </div>

              <div style={{ marginBottom: '15px' }}>
                <span style={{ fontWeight: 'bold' }}>5. Medical Facility.</span><br />
                5.1. The Institute provides facilities for First Aid only.<br />
                5.2. The Institute cannot be held responsible for an injury suffered by a child. No reimbursement of charges would be made towards any medical treatment.
              </div>

              <div style={{ marginBottom: '15px' }}>
                <span style={{ fontWeight: 'bold' }}>6. Procedure for Fee Payment.</span><br />
                • Fees are charged quarterly/ Half yearly / one time payment for every student - depend upon the payment selection method<br />
                • Fee at the time of admission is to be paid by Cash/Cheque/UPI in favor of Nirvana Education Commune.<br />
                • The name of you-ward, Class and admission No. & Phone No. of the parent should be written at the back of the Cheque.<br />
                • The fee is payable at the institute office between 12:30 p.m. to 8:00 p.m.<br />
                • In the case where cheque issued for any payment is dishonored by the Bank for the reason of insufficient funds, a penalty of Rs. 250/- will be charged and if dishonored due to any other reason a penalty of Rs. 500/- will be charged. The name of the child is liable to be struck off the rolls if the fee is not paid by the last date of the concerned month.
              </div>

              <div style={{ marginBottom: '15px' }}>
                <span style={{ fontWeight: 'bold' }}>7. Disclaimer:</span> All the above terms & conditions are subject to amendment from time to time as per the decision of the Institute Management. The decision of the Institute management shall be final on all matters pertaining to the admission process and matters of the institute.
              </div>

              <div style={{ marginTop: '30px', fontWeight: 'bold', fontStyle: 'italic' }}>
                Note: Only the Registration Form should be submitted at the time of Registration. Admission Forms and other forms are required only after the child is granted admission. Kindly keep a photocopy of all the forms for your record.
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}



function PrintDetail({ label, value, isMono = false }: { label: string, value: string | number, isMono?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] font-black tracking-widest text-black">{label}</p>
      <p className={cn("text-[14px] font-bold text-black  truncate border-b border-zinc-50 pb-1", isMono && "font-public-sans tracking-tighter")}>{value || '---'}</p>
    </div>
  )
}

function ProfileHeaderItem({ label, value }: any) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-black text-zinc-300 tracking-widest">{label}</span>
      <span className="text-[15px] font-bold text-black truncate">: {value || '-'}</span>
    </div>
  )
}

function DetailBox({ label, value }: any) {
  return (
    <div className="space-y-1.5 group">
      <p className="text-[10px] font-black text-black tracking-widest group-hover:text-primary transition-colors">{label}</p>
      <div className="h-11 flex items-center px-5 bg-zinc-50/50 rounded-2xl text-[14px] font-bold text-black border border-transparent group-hover:border-zinc-100 transition-all shadow-inner">{value || '-'}</div>
    </div>
  )
}

function SectionGrid({ title, icon, children }: any) {
  return (
    <div className="space-y-8">
      <h3 className="text-[14px] font-black text-black flex items-center gap-3 tracking-tight border-b border-zinc-50 pb-3">{icon} {title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-6">{children}</div>
    </div>
  )
}

function MetricBox({ label, value, color }: any) {
  return (
    <Card className="border border-zinc-50 shadow-sm rounded-3xl bg-white p-8 group hover:shadow-md transition-all">
      <p className="text-[10px] font-black text-black tracking-widest mb-2">{label}</p>
      <h4 className={cn("text-2xl font-black tracking-tighter", color)}>₹{Number(value || 0).toLocaleString()}</h4>
    </Card>
  )
}

function ProfileTabTrigger({ value, label, icon }: any) {
  return (
    <TabsTrigger value={value} className="h-11 px-6 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white text-black font-bold text-[10px] tracking-widest transition-all border border-transparent data-[state=active]:shadow-lg">{icon} {label}</TabsTrigger>
  )
}

function CardMeta({ label, value }: any) {
  return (
    <div className="space-y-1">
      <p className="text-[8px] font-black text-zinc-300 tracking-widest">{label}</p>
      <p className="text-[14px] font-black text-black">{value}</p>
    </div>
  )
}
