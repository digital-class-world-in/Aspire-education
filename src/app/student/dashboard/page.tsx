
"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Wallet, 
  UserCheck, 
  GraduationCap, 
  Info,
  Calendar,
  Clock,
  Sparkles,
  ShieldCheck,
  User,
  BookOpen,
  FileText,
  Download,
  History,
  TrendingUp,
  MapPin,
  CheckCircle2,
  Phone,
  Mail,
  Users,
  Award,
  IdCard,
  Search,
  Printer,
  CalendarCheck,
  Video,
  ExternalLink,
  Layers,
  X,
  ChevronRight,
  Plus,
  Loader2,
  Save,
  Library,
  Book
} from "lucide-react"
import { useFirebase, useUser, useTranslation } from "@/firebase"
import { ref, onValue, off, push, update } from "firebase/database"
import { format, parseISO } from "date-fns"
import Link from "next/link"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { ScrollArea } from "@/components/ui/scroll-area"
import Image from "next/image"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { cn } from "@/lib/utils"
import { toPng } from 'html-to-image'
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useToast } from "@/hooks/use-toast"

export default function StudentDashboardPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const { t } = useTranslation()
  const { resolvedId, staffId: studentId, isLoading: idLoading } = useResolvedId()
  const { toast } = useToast()
  const cardRef = useRef<HTMLDivElement>(null)
  
  const [student, setStudent] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [attendance, setAttendance] = useState<any[]>([])
  const [marksheets, setMarksheets] = useState<any[]>([])
  const [awardedCertificates, setAwardedCertificates] = useState<any[]>([])
  const [eContent, setEContent] = useState<any[]>([])
  const [offlineExams, setOfflineExams] = useState<any[]>([])
  const [issuedBooks, setIssuedBooks] = useState<any[]>([])
  const [liveClasses, setLiveClasses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("profile")
  const [instituteName, setInstituteName] = useState("Your Institute")
  const [instituteProfile, setInstituteProfile] = useState<any>(null)
  const [isDownloadingId, setIsDownloadingId] = useState(false)

  useEffect(() => {
    const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('student_session') : null
    const session = sessionStr ? JSON.parse(sessionStr) : null
    const currentResolvedId = resolvedId || session?.adminUid
    const currentStudentId = studentId || session?.studentId

    if (!database || !currentResolvedId || !currentStudentId) {
      if (!idLoading && !currentStudentId) setIsLoading(false)
      return
    }

    const rootPath = `Institutes/${currentResolvedId}`
    
    onValue(ref(database, `${rootPath}/profile`), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        setInstituteProfile(data)
        setInstituteName(data.instituteName || "Your Institute")
      }
    })

    onValue(ref(database, `${rootPath}/admissions/${currentStudentId}`), (snapshot) => {
      if (snapshot.exists()) {
        const s = snapshot.val()
        setStudent({ ...s, id: currentStudentId })
        
        onValue(ref(database, `${rootPath}/content`), (csnap) => {
          const data = csnap.val() || {}
          const list = Object.values(data).filter((item: any) => 
            item.batch === s.batch && 
            item.course === s.course
          )
          setEContent(list)
        })

        // Fetch Live Classes (Nested to access student 's' for filtering)
        onValue(ref(database, `${rootPath}/live-classes`), (snapshot) => {
          const data = snapshot.val() || {}
          const list = Object.keys(data).map(k => ({ ...data[k], id: k }))
          
          const sBatch = (s.batch || "").trim().toLowerCase();
          const sCourse = (s.course || "").trim().toLowerCase();
          const sSection = (s.section || "A").trim().toLowerCase();

          const filtered = list.filter((c: any) => {
            const cBatch = (c.targetBatch || "").trim().toLowerCase();
            const cClass = (c.targetClass || "").trim().toLowerCase();
            const cSection = (c.targetSection || "A").trim().toLowerCase();

            const matchesBatch = (cBatch === sBatch && sBatch !== "") || 
                                 (cClass === sCourse && cSection === sSection && sCourse !== "");
            
            const matchesBranch = !c.branchId || c.branchId === "null" || c.branchId === s.branchId;
            return matchesBatch && matchesBranch
          })
          setLiveClasses(filtered.sort((a: any, b: any) => new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime()))
        })
      }
    })

    onValue(ref(database, `${rootPath}/fees`), (snapshot) => {
      const data = snapshot.val() || {}
      const list = Object.values(data).filter((p: any) => p.studentId === currentStudentId)
      setPayments(list)
    })

    onValue(ref(database, `${rootPath}/attendance/Student`), (snapshot) => {
      const data = snapshot.val() || {}
      const logs: any[] = []
      Object.keys(data).forEach(date => {
        Object.keys(data[date]).forEach(batch => {
          if (data[date][batch][currentStudentId]) {
            logs.push({ date, ...data[date][batch][currentStudentId] })
          }
        })
      })
      setAttendance(logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
    })

    onValue(ref(database, `${rootPath}/marksheets`), (snapshot) => {
      const data = snapshot.val() || {}
      setMarksheets(Object.values(data).filter((m: any) => m.studentId === currentStudentId))
    })

    onValue(ref(database, `${rootPath}/awarded-certificates/${currentStudentId}`), (snapshot) => {
      const data = snapshot.val() || {}
      setAwardedCertificates(Object.values(data).reverse())
    })

    onValue(ref(database, `${rootPath}/offline-exams`), (snapshot) => {
      const data = snapshot.val() || {}
      const list = Object.keys(data).map(k => ({ ...data[k], id: k }))
      setOfflineExams(list.filter(e => e.assignedStudents?.[currentStudentId]))
    })

    // Fetch Library Issues
    onValue(ref(database, `${rootPath}/library/issues`), (snapshot) => {
      const data = snapshot.val() || {}
      const list = Object.keys(data)
        .map(k => ({ ...data[k], id: k }))
        .filter(i => i.userId === currentStudentId)
      setIssuedBooks(list.reverse())
      setIsLoading(false)
    })
  }, [database, resolvedId, studentId, idLoading])

  const stats = useMemo(() => {
    if (!student) return { totalFee: 0, totalPaid: 0, pending: 0, attendancePercent: 0 }
    const totalFee = Number(student.netFees) || 0
    const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    const pending = Math.max(0, totalFee - totalPaid)
    const totalDays = attendance.length
    const presentDays = attendance.filter(a => a.status === 'Present').length
    const attendancePercent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
    return { totalFee, totalPaid, pending, attendancePercent }
  }, [student, payments, attendance])

  const handleDownloadPDF = (record: any) => {
    const doc = new jsPDF()
    const instName = (instituteName || "Your Institute").toUpperCase()
    
    // 1. Background and Border
    doc.setFillColor(253, 251, 240); // Cream background
    doc.rect(0, 0, 210, 297, 'F');
    
    doc.setDrawColor(0).setLineWidth(0.8).rect(5, 5, 200, 287); // Outer thick border
    doc.setDrawColor(0).setLineWidth(0.2).rect(7, 7, 196, 283); // Inner thin border

    // 2. Linear Institute Name (Top Header)
    doc.setFont("helvetica", "bold").setFontSize(30).setTextColor(0);
    doc.text(instName, 105, 55, { align: 'center' });

    // Logo (Centered Top)
    if (instituteProfile?.logoUrl) {
      doc.addImage(instituteProfile.logoUrl as string, 'PNG', 95, 25, 20, 20);
    } else {
      // Placeholder Circle with Logo Text
      doc.setDrawColor(0).setFillColor(255, 255, 255);
      doc.circle(105, 35, 12, 'FD');
      doc.setFontSize(8).text("NIrvana", 105, 36, { align: 'center' });
    }

    // 3. Official Header
    doc.setFontSize(14).setFont("helvetica", "bold").setTextColor(0);
    doc.text(`OFFICIAL MARK SHEET - ${record.examName?.toUpperCase() || "ACADEMIC SESSION"}`, 105, 68, { align: 'center' });

    // 4. Student Dossier (Dotted Lines)
    doc.setFontSize(10).setFont("helvetica", "bold");
    const labelX1 = 15, labelX2 = 115;
    const fieldOffset = 38;
    
    const docAny = doc as any;

    // Row 1
    doc.text(`STUDENT NAME:`, labelX1, 80);
    doc.setFont("helvetica", "normal").text(`${(record.studentName || "").toUpperCase()}`, labelX1 + fieldOffset, 80);
    docAny.setLineDash([0.3, 0.7]); doc.line(labelX1 + fieldOffset, 81, 108, 81); docAny.setLineDash([]);

    doc.setFont("helvetica", "bold").text(`ROLL NUMBER:`, labelX2, 80);
    doc.setFont("helvetica", "normal").text(`${record.rollNo || "-"}`, labelX2 + fieldOffset - 5, 80);
    docAny.setLineDash([0.3, 0.7]); doc.line(labelX2 + fieldOffset - 5, 81, 195, 81); docAny.setLineDash([]);

    // Row 2
    doc.setFont("helvetica", "bold").text(`MOTHER'S NAME:`, labelX1, 90);
    doc.setFont("helvetica", "normal").text(`${(record.motherName || "").toUpperCase()}`, labelX1 + fieldOffset, 90);
    docAny.setLineDash([0.3, 0.7]); doc.line(labelX1 + fieldOffset, 91, 108, 91); docAny.setLineDash([]);

    doc.setFont("helvetica", "bold").text(`FATHER'S NAME:`, labelX2, 90);
    doc.setFont("helvetica", "normal").text(`${(record.fatherName || "").toUpperCase()}`, labelX2 + fieldOffset - 5, 90);
    docAny.setLineDash([0.3, 0.7]); doc.line(labelX2 + fieldOffset - 5, 91, 195, 91); docAny.setLineDash([]);

    // Row 3
    doc.setFont("helvetica", "bold").text(`DATE OF BIRTH:`, labelX1, 100);
    doc.setFont("helvetica", "normal").text(`${record.dob || "-"}`, labelX1 + fieldOffset, 100);
    docAny.setLineDash([0.3, 0.7]); doc.line(labelX1 + fieldOffset, 101, 108, 101); docAny.setLineDash([]);

    // 5. Marks Table
    autoTable(doc, {
      startY: 110,
      margin: { left: 15, right: 15 },
      head: [['SUBJECT CODE', 'SUBJECT NAME', 'THEORY MARKS', 'PRACTICAL MARKS', 'TOTAL MARKS', 'GRADE', 'REMARKS']],
      body: record.subjects.map((s: any) => [
        s.code || '-', 
        (s.name || "").toUpperCase(), 
        `${s.theoryObtain || 0} / ${s.theoryTotal || 0}`, 
        `${s.practicalObtain || 0} / ${s.practicalTotal || 0}`, 
        `${s.subjectObtain || 0} / ${s.subjectTotal || 0}`, 
        s.grade || '-', 
        s.remarks || '-'
      ]),
      theme: 'grid',
      headStyles: { fillColor: [54, 43, 31] as [number, number, number], textColor: [255, 255, 255] as [number, number, number], fontSize: 8, halign: 'center', cellPadding: 3, fontStyle: 'bold' },
      bodyStyles: { fillColor: [255, 255, 255] as [number, number, number], fontSize: 9, halign: 'center', textColor: [0, 0, 0] as [number, number, number], lineWidth: 0.1, minCellHeight: 10 },
      columnStyles: { 1: { halign: 'left', cellWidth: 50 } },
      styles: { cellPadding: 2 }
    });

    // 6. Summary Section
    const summaryY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFillColor(54, 43, 31).rect(15, summaryY, 180, 8, 'F');
    doc.setTextColor(255).setFontSize(10).setFont("helvetica", "bold").text("OVERALL PERFORMANCE SUMMARY", 105, summaryY + 5.5, { align: 'center' });
    
    autoTable(doc, {
      startY: summaryY + 8,
      margin: { left: 15, right: 15 },
      body: [[
        `GRAND TOTAL: ${record.grandObtained} / ${record.grandTotalMax}`,
        `PERCENTAGE: ${record.percentage}%`,
        `GRADE: ${record.overallGrade}`,
        `RESULT: ${record.overallResult}`
      ]],
      theme: 'grid',
      bodyStyles: { fontSize: 10, fontStyle: 'bold', halign: 'center', fillColor: [255, 255, 255] as [number, number, number], textColor: [0, 0, 0] as [number, number, number], lineWidth: 0.1 }
    });

    // 7. Signatures
    const footerY = (doc as any).lastAutoTable.finalY + 25;
    doc.setTextColor(0).setFontSize(9).setFont("helvetica", "bold");
    doc.line(15, footerY, 75, footerY);
    doc.text("SIGNATURE OF PRINCIPAL", 45, footerY + 5, { align: 'center' });

    doc.line(135, footerY, 195, footerY);
    doc.text("SIGNATURE OF TEACHER IN-CHARGE", 165, footerY + 5, { align: 'center' });

    // 8. Grading Scale
    const scaleY = 248;
    doc.setFillColor(54, 43, 31).rect(15, scaleY, 180, 6, 'F');
    doc.setTextColor(255).setFontSize(8).text("GRADE POINT AND GRADING SCALE", 105, scaleY + 4.5, { align: 'center' });
    
    autoTable(doc, {
      startY: scaleY + 6,
      margin: { left: 15, right: 15 },
      body: [
        ['A - GRADE POINT - 10-20', 'B-- FIRST POINT - 70', 'E - GRADE POINT - 10-20', 'F - END POINT - 0'],
        ['B - GRADE POINT - 90', 'C-- FIRST POINT - 50', 'F - GRADE POINT - 40', 'E - GRADING POINT - 1'],
        ['C - GRADE POINT - 80', 'D-- FIDEL POINT - 50', 'G - GRADE POINT - 30', '']
      ],
      theme: 'grid',
      bodyStyles: { fontSize: 7.5, halign: 'left', cellPadding: 2, fillColor: [255, 255, 255] as [number, number, number], textColor: [0, 0, 0] as [number, number, number], lineWidth: 0.1, font: 'helvetica' }
    });

    // Decorative Tree Logos on Corners
    const cornerLogosY = [15, 140, 265];
    cornerLogosY.forEach(y => {
        doc.setFontSize(6).setTextColor(150).text("NIrvana", 10, y, { angle: 90 });
        doc.setFontSize(6).setTextColor(150).text("NIrvana", 200, y, { angle: -90 });
    });

    doc.save(`Marksheet_${record.studentName || "Candidate"}.pdf`);
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

  const generatePremiumReceipt = (payment: any) => {
    const doc = new jsPDF();
    const dueAmount = stats.pending;

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

  if (isLoading || idLoading) return <div className="p-20 text-center font-black text-zinc-300 tracking-widest animate-pulse">Establishing Academic Node...</div>

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-32 overflow-x-hidden font-public-sans text-black text-[14px]">
      
      <Card className="border-2 border-zinc-100 shadow-sm rounded-[40px] bg-white overflow-hidden">
        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x-2 divide-zinc-50">
          <div className="flex-1 p-10 flex flex-row items-center gap-8">
            <Avatar className="h-24 w-24 rounded-[32px] border-4 border-white shadow-xl shrink-0 hidden md:flex">
              <AvatarImage src={student?.studentPhotoUrl} />
              <AvatarFallback className="bg-primary text-white text-2xl font-black">{student?.studentName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                <h2 className="text-3xl font-black text-black tracking-tight leading-none">Welcome, {student?.studentName || "Candidate"}!</h2>
              </div>
              <p className="text-black font-medium leading-relaxed italic max-w-sm">"Your academic journey is live and synchronized with the institute node."</p>
              <div className="flex items-center gap-3 pt-2">
                <Badge className="bg-blue-50 text-primary border-none text-[9px] font-black tracking-widest px-4 py-1.5">Session: {student?.session || '2024-25'}</Badge>
                <Badge className="bg-emerald-50 text-emerald-600 border-none text-[9px] font-black tracking-widest px-4 py-1.5">Status: Verified</Badge>
              </div>
            </div>
          </div>
          <div className="w-full md:w-[350px] p-0 bg-zinc-50/20 flex items-center justify-center overflow-hidden relative">
            <Image 
              src="https://ik.imagekit.io/2wtn9m5bl/a-man-teacher-working-on-laptop-illustration.png" 
              alt="Banner Illustration" 
              width={280}
              height={180}
              className="object-contain"
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <QuickStat color="text-blue-600" label="Total Fee" value={`₹${stats.totalFee.toLocaleString()}`} />
        <QuickStat color="text-emerald-600" label="Collected Fees" value={`₹${stats.totalPaid.toLocaleString()}`} />
        <QuickStat color="text-rose-500" label="Due Fees" value={`₹${stats.pending.toLocaleString()}`} />
        <QuickStat color="text-indigo-600" label="Attendance" value={`${stats.attendancePercent}%`} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white p-2 rounded-[24px] h-auto flex-wrap justify-start gap-2 shadow-sm border border-zinc-100">
          <DashboardTabTrigger value="profile" label="MY PROFILE" icon={<User className="w-4 h-4" />} />
          {/* <DashboardTabTrigger value="curriculum" label="CURRICULUM" icon={<Layers className="w-4 h-4" />} /> */}
          <DashboardTabTrigger value="attendance" label="ATTENDANCE" icon={<UserCheck className="w-4 h-4" />} />
          <DashboardTabTrigger value="exams" label="RESULTS & MARKS" icon={<GraduationCap className="w-4 h-4" />} />
          {/* <DashboardTabTrigger value="library" label="LIBRARY" icon={<Library className="w-4 h-4" />} /> */}
          <DashboardTabTrigger value="payments" label="FEES REPORT" icon={<Wallet className="w-4 h-4" />} />
          <DashboardTabTrigger value="certificates" label="CERTIFICATES" icon={<Award className="w-4 h-4" />} />
          <DashboardTabTrigger value="live" label="LIVE CLASSES" icon={<Video className="w-4 h-4" />} />
          <DashboardTabTrigger value="idcard" label="ID CARD" icon={<IdCard className="w-4 h-4" />} />
        </TabsList>

        <div className="mt-8">
          <TabsContent value="profile" className="mt-0 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <Card className="lg:col-span-4 border border-zinc-100 shadow-sm rounded-[32px] bg-white p-10 flex flex-col items-center text-center">
                <Avatar className="h-32 w-32 rounded-[40px] border-8 border-zinc-50 shadow-xl mb-6">
                  <AvatarImage src={student?.studentPhotoUrl} />
                  <AvatarFallback className="bg-primary text-white text-4xl font-black">{student?.studentName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-black text-black tracking-tight">{student?.studentName}</h3>
                <p className="text-[10px] font-bold text-black tracking-widest mt-1">ID: {student?.admissionNo}</p>
                <div className="w-full pt-8 mt-8 border-t border-zinc-50 space-y-4 text-left">
                  <DetailBox label="ROLL NUMBER" value={student?.rollNo || '-'} />
                  <DetailBox label="ACADEMIC CLASS" value={student?.course} />
                  <DetailBox label="SECTION" value={student?.section || 'A'} />
                  <DetailBox label="JOINING DATE" value={student?.admissionDate} />
                </div>
              </Card>
              
              <Card className="lg:col-span-8 border border-zinc-100 shadow-sm rounded-[32px] bg-white p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <section className="space-y-8">
                    <SectionHeader icon={<Info className="text-primary" />} title="Personal Registry" />
                    <div className="space-y-4">
                      <DetailBox label="GENDER" value={student?.gender} />
                      <DetailBox label="DATE OF BIRTH" value={student?.dob} />
                      <DetailBox label="RELIGION" value={student?.religion} />
                      <DetailBox label="CATEGORY" value={student?.category} />
                      <DetailBox label="ADHAR NO" value={student?.adharNumber} />
                      <DetailBox label="CONTACT" value={student?.mobile} />
                    </div>
                  </section>
                  <section className="space-y-8">
                    <SectionHeader icon={<Users className="text-amber-500" />} title="Parental Context" />
                    <div className="space-y-4">
                      <DetailBox label="FATHER NAME" value={student?.fatherName} />
                      <DetailBox label="MOTHER NAME" value={student?.motherName} />
                      <DetailBox label="FATHER MOBILE" value={student?.fatherMobile} />
                    </div>
                  </section>
                </div>
                <section className="space-y-6 pt-6 border-t border-zinc-50">
                  <SectionHeader icon={<MapPin className="text-rose-500" />} title="Address Registry" />
                  <DetailBox label="PERMANENT PHYSICAL ADDRESS" value={student?.address} />
                </section>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="mt-0 animate-in fade-in duration-500">
            <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
              <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
                <h3 className="text-[14px] font-black text-black tracking-widest">Daily Attendance Registry</h3>
                <Badge className="bg-emerald-50 text-emerald-600 border-none text-[10px] font-black">Sync Frequency: Real-time</Badge>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-50">
                    <TableRow>
                      <TableHead className="pl-8 text-[10px] font-black h-14">Date</TableHead>
                      <TableHead className="text-[10px] font-black">Status</TableHead>
                      <TableHead className="text-[10px] font-black">Remarks / Note</TableHead>
                      <TableHead className="text-right pr-8 text-[10px] font-black">Registry Context</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((log, i) => (
                      <TableRow key={i} className="border-zinc-50 hover:bg-zinc-50/20 transition-all">
                        <TableCell className="pl-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center text-black"><Calendar className="w-4 h-4" /></div>
                            <span className="text-[14px] font-bold text-black font-public-sans">{log.date}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "rounded-lg px-2.5 py-0.5 text-[9px] font-black  border-none shadow-none",
                            log.status === 'Present' ? "bg-emerald-50 text-emerald-600" : 
                            log.status === 'Absent' ? "bg-rose-50 text-rose-600" :
                            log.status === 'Half Day' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-[#1e3a8a]"
                          )}>{log.status}</Badge>
                        </TableCell>
                        <TableCell className="text-[13px] font-medium text-black max-w-xs truncate">{log.remarks || 'Standard Session Log'}</TableCell>
                        <TableCell className="text-right pr-8">
                           <span className="text-[9px] font-black text-zinc-300 tracking-widest uppercase">Verified Node</span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {attendance.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="h-48 text-center text-zinc-300 italic text-[10px]">No attendance nodes recorded for your registry</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="curriculum" className="mt-0 animate-in fade-in duration-500 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {eContent.map((module, i) => (
                <Card key={i} className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-8 group hover:shadow-xl transition-all h-fit">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-primary mb-6 shadow-inner"><BookOpen className="w-6 h-6" /></div>
                  <h4 className="text-lg font-black text-black tracking-tight mb-2 line-clamp-1">{module.title}</h4>
                  <p className="text-[10px] font-bold text-black tracking-widest mb-6">{module.chapters?.length || 0} Academic Chapters</p>
                  
                  <Accordion type="single" collapsible className="w-full space-y-3">
                    {(module.chapters || []).map((chapter: any, cIdx: number) => (
                      <AccordionItem key={chapter.id} value={chapter.id} className="border border-zinc-50 rounded-xl px-4">
                        <AccordionTrigger className="hover:no-underline py-3 text-[14px] font-bold text-black">
                          {cIdx + 1}. {chapter.title}
                        </AccordionTrigger>
                        <AccordionContent className="pb-4 space-y-2">
                          {chapter.topics?.map((topic: any, tIdx: number) => (
                            <div key={tIdx} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                              <span className="text-[11px] font-medium text-black">{topic.title}</span>
                              <div className="flex gap-2">
                                {topic.videoUrl && <Button onClick={() => window.open(topic.videoUrl, '_blank')} size="icon" variant="ghost" className="h-6 w-6 text-blue-500"><Video className="h-3 w-3" /></Button>}
                                {topic.documentUrl && <Button onClick={() => window.open(topic.documentUrl, '_blank')} size="icon" variant="ghost" className="h-6 w-6 text-emerald-500"><FileText className="h-3 w-3" /></Button>}
                              </div>
                            </div>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </Card>
              ))}
              {eContent.length === 0 && (
                <div className="col-span-full py-20 text-center bg-zinc-50/50 rounded-[40px] border-2 border-dashed border-zinc-100">
                  <p className="text-[14px] font-bold text-black tracking-widest">No curriculum nodes assigned to your batch</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="exams" className="mt-0 animate-in fade-in duration-500 space-y-8">
            <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
              <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
                <h3 className="text-[14px] font-black text-black tracking-widest">Digital Marksheets</h3>
                <Badge className="bg-emerald-50 text-emerald-600 border-none text-[10px] font-black">Verified Registry</Badge>
              </div>
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead className="text-[10px] font-black pl-8 h-14">Examination</TableHead>
                    <TableHead className="text-[10px] font-black text-center">Score</TableHead>
                    <TableHead className="text-[10px] font-black text-center">Status</TableHead>
                    <TableHead className="text-right pr-8 text-[10px] font-black">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marksheets.map((m, i) => (
                    <TableRow key={i} className="border-zinc-50 group hover:bg-zinc-50/20 transition-all">
                      <TableCell className="pl-8 py-4 font-bold text-black">{m.examName}</TableCell>
                      <TableCell className="text-center font-black text-black">{m.percentage}%</TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("rounded-md text-[9px] font-black ", m.overallResult === 'PASS' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>{m.overallResult}</Badge>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(m)} className="h-8 rounded-xl bg-zinc-50 text-black hover:text-primary transition-all font-black text-[9px] tracking-widest gap-2">
                          <Download className="w-3.5 h-3.5" /> Download Marksheet
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
              <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
                <h3 className="text-[14px] font-black text-black tracking-widest">Offline Exam Node</h3>
              </div>
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead className="text-[10px] font-black pl-8 h-14">Exam Title</TableHead>
                    <TableHead className="text-[10px] font-black text-center">Date & Session</TableHead>
                    <TableHead className="text-right pr-8 text-[10px] font-black">Marks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offlineExams.map((e, i) => (
                    <TableRow key={i} className="border-zinc-50">
                      <TableCell className="pl-8 py-4 font-bold text-black">{e.title}</TableCell>
                      <TableCell className="text-center text-black font-public-sans">{e.examDate} | {e.timing}</TableCell>
                      <TableCell className="text-right pr-8 font-black text-[#1e3a8a]">{e.totalMarks || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* <TabsContent value="library" className="mt-0 animate-in fade-in duration-500">
            ...
          </TabsContent> */}

          <TabsContent value="payments" className="mt-0 animate-in fade-in duration-500">
            <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
              <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
                <h3 className="text-[14px] font-black text-black tracking-widest">Financial Ledger</h3>
                <Badge className="bg-[#1e3a8a] text-white border-none text-[10px] font-black">Authorized</Badge>
              </div>
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead className="text-[10px] font-black pl-8 h-14">Date</TableHead>
                    <TableHead className="text-[10px] font-black">Receipt Identifier</TableHead>
                    <TableHead className="text-[10px] font-black">Amount</TableHead>
                    <TableHead className="text-right pr-8 text-[10px] font-black">Operation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p, i) => (
                    <TableRow key={i} className="border-zinc-50 hover:bg-zinc-50/30 transition-all">
                      <TableCell className="pl-8 font-black text-black font-public-sans text-[14px]">{p.date}</TableCell>
                      <TableCell className="text-[14px] font-bold text-black">{p.receiptNo || '-'}</TableCell>
                      <TableCell className="text-[14px] font-black text-emerald-600">₹ {Number(p.amount).toLocaleString()}</TableCell>
                      <TableCell className="text-right pr-8">
                        <Button variant="ghost" size="sm" onClick={() => handleViewReceipt(p)} className="h-8 rounded-xl bg-zinc-50 text-black hover:text-[#1e3a8a] transition-all text-[9px] font-black tracking-widest gap-2">
                          <Download className="w-3.5 h-3.5 mr-1.5" /> PDF Receipt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="live" className="mt-0 animate-in fade-in duration-500 space-y-8">
            <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
              <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner"><Video className="w-5 h-5" /></div>
                  <div>
                    <h3 className="text-[14px] font-black text-black tracking-widest">Active Academic Stream</h3>
                    <p className="text-[10px] text-black font-bold tracking-widest mt-0.5">Assigned to: {student?.batch || 'Regular Batch'}</p>
                  </div>
                </div>
                <Badge className="bg-emerald-50 text-emerald-600 border-none text-[10px] font-black px-4 py-1.5 rounded-xl">Live Sync: Enabled</Badge>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-50">
                    <TableRow>
                      <TableHead className="pl-8 text-[10px] font-black h-14">Topic / Subject</TableHead>
                      <TableHead className="text-[10px] font-black">Schedule</TableHead>
                      <TableHead className="text-[10px] font-black text-center">Duration</TableHead>
                      <TableHead className="text-[10px] font-black">Platform</TableHead>
                      <TableHead className="text-right pr-8 text-[10px] font-black">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liveClasses.map((c, i) => {
                      const isToday = c.date === format(new Date(), "yyyy-MM-dd")
                      return (
                        <TableRow key={i} className="border-zinc-50 hover:bg-zinc-50/20 transition-all group">
                          <TableCell className="pl-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-inner", isToday ? "bg-primary text-white" : "bg-zinc-100 text-black")}>
                                <Video className="w-5 h-5" />
                              </div>
                              <span className="text-[14px] font-black text-black tracking-tight">{c.topic}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-[13px] font-bold text-black font-public-sans">{c.date}</span>
                              <span className="text-[10px] font-black text-primary tracking-widest">{c.time}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-bold text-black text-[13px]">{c.duration} Mins</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="rounded-lg border-zinc-100 text-black font-bold text-[9px]">{c.platform}</Badge>
                          </TableCell>
                          <TableCell className="text-right pr-8">
                            <Button 
                              onClick={() => {
                                if(!c.meetingUrl) return toast({ variant: "destructive", title: "Missing Link", description: "This class has no join URL yet." })
                                window.open(c.meetingUrl, '_blank')
                              }}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-10 px-6 font-black text-[10px] tracking-widest shadow-lg active:scale-95 border-none transition-all"
                            >
                              Join Class
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {liveClasses.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="h-48 text-center text-zinc-300 italic text-[10px]">No live streams scheduled for your batch</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="idcard" className="mt-0 animate-in fade-in duration-500 flex flex-col items-center gap-10">
            <div ref={cardRef} className="w-[350px] bg-[#fdfbf0] rounded-[40px] border-2 border-zinc-200 shadow-xl overflow-hidden flex flex-col print:m-0 print:shadow-none">
              <div className="bg-[#f0ece2] p-8 text-center space-y-1 relative border-b border-zinc-200">
                <div className="absolute top-0 right-0 w-32 h-32 bg-black/5 rounded-full -mr-16 -mt-16" />
                <h3 className="text-black font-black text-[14px] tracking-widest">{instituteName}</h3>
                <p className="text-black/40 text-[9px] font-bold tracking-[0.3em] uppercase">Identity Card</p>
              </div>
              <div className="p-10 flex flex-col items-center gap-8">
                <div className="relative">
                  <Avatar className="h-32 w-32 rounded-[40px] border-8 border-zinc-50 shadow-lg">
                    <AvatarImage src={student?.studentPhotoUrl} />
                    <AvatarFallback className="bg-primary text-white text-4xl font-black">{student?.studentName?.charAt(0)}</AvatarFallback>
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
        </div>
      </Tabs>
    </main>
  )
}

function QuickStat({ label, value, color }: { label: string, value: string | number, color: string }) {
  return (
    <Card className="border border-zinc-100 shadow-sm rounded-[24px] bg-white p-6 transition-all hover:shadow-md">
      <p className="text-[10px] font-black text-black tracking-widest mb-1">{label}</p>
      <h4 className={cn("text-2xl font-black tracking-tighter leading-none", color)}>{value}</h4>
    </Card>
  )
}

function DashboardTabTrigger({ value, label, icon }: any) {
  return (
    <TabsTrigger 
      value={value} 
      className="h-11 px-6 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white text-black font-bold text-[10px] tracking-widest transition-all border border-transparent data-[state=active]:shadow-lg"
    >
      <span className="flex items-center gap-2">{icon} {label}</span>
    </TabsTrigger>
  )
}

function SectionHeader({ icon, title }: { icon: any, title: string }) {
  return (
    <h3 className="text-[14px] font-black text-black flex items-center gap-3 tracking-tight border-b border-zinc-50 pb-3">
      <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center shadow-inner">{icon}</div>
      {title}
    </h3>
  )
}

function DetailBox({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-2 group">
      <p className="text-[10px] font-black text-black tracking-widest group-hover:text-primary transition-colors ml-1">{label}</p>
      <div className="h-11 flex items-center px-5 bg-zinc-50/50 rounded-2xl text-[14px] font-bold text-black border border-transparent group-hover:border-zinc-100 transition-all shadow-inner truncate">
        {value || '-'}
      </div>
    </div>
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
  
