
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  FileDown, 
  GraduationCap, 
  ShieldCheck, 
  CheckCircle2,
  FileText,
  TrendingUp,
  Download,
  Award,
  Loader2,
  History,
  XCircle
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { cn } from "@/lib/utils"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"

export default function StudentMarksheetPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const [marksheets, setMarksheets] = useState<any[]>([])
  const [offlineMarks, setOfflineMarks] = useState<any[]>([])
  const [student, setStudent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [instituteName, setInstituteName] = useState("Your Institute")
  const [instituteProfile, setInstituteProfile] = useState<any>(null)

  useEffect(() => {
    if (!database || !user) return
    
    // Resolve Student Identity from Local Session
    const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('student_session') : null
    const session = sessionStr ? JSON.parse(sessionStr) : null
    const currentResolvedId = session?.adminUid
    const currentStudentId = session?.studentId

    if (!currentResolvedId || !currentStudentId) {
      setIsLoading(false)
      return
    }

    const rootPath = `Institutes/${currentResolvedId}`
    
    // Fetch Student Info
    onValue(ref(database, `${rootPath}/admissions/${currentStudentId}`), (s) => {
      if (s.exists()) setStudent({ ...s.val(), id: currentStudentId })
    })

    // Fetch Formal Marksheets
    onValue(ref(database, `${rootPath}/marksheets`), (snapshot) => {
      const data = snapshot.val() || {}
      // Robust filtering by student ID
      const list = Object.keys(data).map(k => ({ ...data[k], id: k }))
      setMarksheets(list.filter((m: any) => m.studentId === currentStudentId))
      setIsLoading(false)
    })

    // Fetch Offline Assessment Scores
    onValue(ref(database, `${rootPath}/offline-marks`), (snapshot) => {
      const data = snapshot.val() || {}
      const list = Object.keys(data).map(k => ({ ...data[k], id: k }))
      setOfflineMarks(list.filter((m: any) => m.studentId === currentStudentId))
    })

    // Fetch Institute Identity
    onValue(ref(database, `${rootPath}/profile`), (s) => {
      if (s.val()) {
        setInstituteProfile(s.val())
        setInstituteName(s.val().instituteName || "Your Institute")
      }
    })
  }, [database, user])

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
    doc.text(`OFFICIAL MARK SHEET - ${record.examName.toUpperCase()}`, 105, 68, { align: 'center' });

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

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 animate-pulse">Establishing Node Sync...</div>

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 font-public-sans text-black text-[14px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h2 className="text-3xl font-black text-black tracking-tight font-public-sans">My Results</h2>
          <p className="text-[14px] text-black font-medium mt-1">Verified academic marksheets from the institutional node</p>
        </div>
      </div>

      <div className="space-y-10">
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-zinc-50 pb-2">
            <ShieldCheck className="w-5 h-5 text-[#1e3a8a]" />
            <h3 className="text-[15px] font-black tracking-widest">Official Marksheets</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {marksheets.map((m, i) => (
              <Card key={i} className="border-none shadow-sm rounded-[32px] bg-white p-8 group hover:shadow-xl transition-all duration-500">
                <div className="flex justify-between items-start mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center text-[#1e3a8a] shadow-inner">
                    <GraduationCap className="w-8 h-8" />
                  </div>
                  <Badge className={cn(
                    "rounded-lg px-3 py-1 text-[9px] font-black  border-none",
                    m.overallResult === 'PASS' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  )}>{m.overallResult}</Badge>
                </div>
                <div className="space-y-4 mb-8">
                  <h4 className="text-lg font-black text-black tracking-tight leading-tight">{m.examName}</h4>
                  <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-black tracking-widest">
                    <div className="space-y-1"><p>Score</p><p className="text-[14px] font-black text-black">{m.grandObtained} / {m.grandTotalMax}</p></div>
                    <div className="space-y-1"><p>Percentage</p><p className="text-[14px] font-black text-emerald-600">{m.percentage}%</p></div>
                  </div>
                </div>
                <Button onClick={() => handleDownloadPDF(m)} className="w-full rounded-2xl h-12 bg-zinc-900 text-white font-black text-[10px] tracking-widest gap-2 active:scale-95 transition-all">
                  <Download className="w-4 h-4" /> Download Marksheet
                </Button>
              </Card>
            ))}
            {marksheets.length === 0 && (
              <div className="col-span-full py-20 text-center text-zinc-300 italic text-[10px] tracking-widest">No official marksheets published in registry</div>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-zinc-50 pb-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            <h3 className="text-[15px] font-black tracking-widest">Assessment Scores</h3>
          </div>
          <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-zinc-50">
                <TableRow>
                  <TableHead className="pl-10 text-[10px] font-black h-14">Subject</TableHead>
                  <TableHead className="text-[10px] font-black h-14 text-center">Marks</TableHead>
                  <TableHead className="text-right pr-10 text-[10px] font-black h-14">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offlineMarks.map((m, i) => (
                  <TableRow key={i} className="border-zinc-50">
                    <TableCell className="pl-10 py-4 font-bold text-black">{m.subject}</TableCell>
                    <TableCell className="text-center font-black text-[#1e3a8a]">{m.obtainedMarks} / {m.maxMarks}</TableCell>
                    <TableCell className="text-right pr-10">
                      <Badge className={cn(
                        "rounded-lg px-2.5 py-0.5 text-[9px] font-black  border-none",
                        m.status === 'Pass' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                      )}>{m.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {offlineMarks.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="h-32 text-center text-zinc-300 italic text-[10px] tracking-widest">No scores found in registry</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </section>
      </div>
    </main>
  )
}
