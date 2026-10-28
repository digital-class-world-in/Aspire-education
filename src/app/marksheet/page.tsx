
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  FileDown, 
  X, 
  GraduationCap, 
  ShieldCheck,
  FileText,
  TrendingUp,
  Award,
  Loader2,
  Save,
  Info,
  IdCard
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, remove, off, update } from "firebase/database"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useResolvedId } from "@/hooks/use-resolved-id"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"
import { usePathname } from "next/navigation"
import { Eye } from "lucide-react"

interface SubjectMark {
  id: string
  code: string
  name: string
  theoryTotal: number
  theoryObtain: number
  practicalTotal: number
  practicalObtain: number
  subjectTotal: number
  subjectObtain: number
  grade: string
  remarks: string
  result: "Pass" | "Fail"
}

export default function MarksheetPage() {
  const pathname = usePathname()
  const isPortal = pathname.startsWith('/staff') || pathname.startsWith('/student') || pathname.startsWith('/branch')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [marksheets, setMarksheets] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [previewItem, setPreviewItem] = useState<any>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [instituteName, setInstituteName] = useState("Your Institute")
  const [instituteProfile, setInstituteProfile] = useState<any>(null)

  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [studentPhoto, setStudentPhoto] = useState("")
  const [enrollmentNo, setEnrollmentNo] = useState("")
  const [rollNo, setRollNo] = useState("")
  const [fatherName, setFatherName] = useState("")
  const [motherName, setMotherName] = useState("")
  const [courseName, setCourseName] = useState("")
  const [semester, setSemester] = useState("")
  const [section, setSection] = useState("")
  const [dob, setDob] = useState("")
  const [examSeatNo, setExamSeatNo] = useState("")
  const [examTitle, setExamTitle] = useState("CLASS X BOARD EXAMINATION")
  const [academicYear, setAcademicYear] = useState("2024-25")
  const [declarationDate, setDeclarationDate] = useState(new Date().toISOString().split('T')[0])
  const [attendancePercent, setAttendancePercent] = useState("0")
  const [remarks, setRemarks] = useState("Good")
  
  const [subjects, setSubjects] = useState<SubjectMark[]>([
    { id: '1', code: "101", name: "", theoryTotal: 100, theoryObtain: 0, practicalTotal: 20, practicalObtain: 0, subjectTotal: 120, subjectObtain: 0, grade: "F", remarks: "", result: "Fail" }
  ])

  const { database } = useFirebase()
  const { user } = useUser()
  const { resolvedId } = useResolvedId()

  useEffect(() => {
    if (!database || !resolvedId) return
    const rootPath = `Institutes/${resolvedId}`
    
    onValue(ref(database, `${rootPath}/marksheets`), (snapshot) => {
      const data = snapshot.val()
      if (data) setMarksheets(Object.keys(data).map(key => ({ ...data[key], id: key })).reverse())
      else setMarksheets([])
      setIsLoading(false)
    })

    onValue(ref(database, `Institutes/${resolvedId}/admissions`), (s) => {
      const data = s.val()
      if (data) setStudents(Object.keys(data).map(k => ({ ...data[k], id: k })))
      else setStudents([])
    })

    onValue(ref(database, `${rootPath}/profile`), (s) => {
      if (s.val()) {
        setInstituteProfile(s.val())
        setInstituteName(s.val().instituteName || "Your Institute")
      }
    })
  }, [database, resolvedId])

  useEffect(() => {
    if (selectedStudentId && !editingItem) {
      const s = students.find(item => item.id === selectedStudentId)
      if (s) {
        setEnrollmentNo(s.admissionNo || "")
        setRollNo(s.rollNo || "")
        setFatherName(s.fatherName || "")
        setMotherName(s.motherName || "")
        setCourseName(s.course || "")
        setSection(s.section || "")
        setDob(s.dob || "")
        setStudentPhoto(s.studentPhotoUrl || "")
      }
    }
  }, [selectedStudentId, students, editingItem])

  const calculateGrade = (obtained: number, total: number) => {
    if (total === 0) return "F"
    const percent = (obtained / total) * 100
    if (percent >= 90) return "A+"
    if (percent >= 80) return "A"
    if (percent >= 70) return "B+"
    if (percent >= 60) return "B"
    if (percent >= 50) return "C"
    if (percent >= 35) return "D"
    return "F"
  }

  const handleAddSubject = () => {
    setSubjects([
      ...subjects,
      { id: Date.now().toString(), code: "", name: "", theoryTotal: 100, theoryObtain: 0, practicalTotal: 20, practicalObtain: 0, subjectTotal: 120, subjectObtain: 0, grade: "F", remarks: "", result: "Fail" }
    ])
  }

  const handleRemoveSubject = (id: string) => {
    if (subjects.length > 1) {
      setSubjects(subjects.filter(s => s.id !== id))
    }
  }

  const updateSubject = (id: string, field: keyof SubjectMark, value: any) => {
    setSubjects(prev => prev.map(s => {
      if (s.id === id) {
        const updated = { ...s, [field]: value }
        updated.subjectTotal = (Number(updated.theoryTotal) || 0) + (Number(updated.practicalTotal) || 0)
        updated.subjectObtain = (Number(updated.theoryObtain) || 0) + (Number(updated.practicalObtain) || 0)
        
        // Prevent obtained marks from exceeding total marks
        if (updated.theoryObtain > updated.theoryTotal) updated.theoryObtain = updated.theoryTotal
        if (updated.practicalObtain > updated.practicalTotal) updated.practicalObtain = updated.practicalTotal
        updated.subjectObtain = (Number(updated.theoryObtain) || 0) + (Number(updated.practicalObtain) || 0)

        const theoryPass = (Number(updated.theoryObtain) / (Number(updated.theoryTotal) || 1)) * 100 >= 35
        const practicalPass = (Number(updated.practicalObtain) / (Number(updated.practicalTotal) || 1)) * 100 >= 35
        updated.result = (theoryPass && practicalPass) ? "Pass" : "Fail"
        updated.grade = calculateGrade(updated.subjectObtain, updated.subjectTotal)
        return updated
      }
      return s
    }))
  }

  const finalResults = useMemo(() => {
    let grandTotalMax = 0
    let grandObtained = 0
    let anyFail = false
    subjects.forEach(s => {
      grandTotalMax += s.subjectTotal
      grandObtained += s.subjectObtain
      if (s.result === "Fail") anyFail = true
    })
    const percentageVal = grandTotalMax > 0 ? Math.min(100, (grandObtained / grandTotalMax) * 100) : 0
    const percentage = percentageVal.toFixed(2)
    const overallGrade = calculateGrade(grandObtained, grandTotalMax)
    const overallResult = (anyFail || percentageVal < 35) ? "FAIL" : "PASS"
    return { grandTotalMax, grandObtained, percentage, overallGrade, overallResult }
  }, [subjects])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resolvedId || !database || !selectedStudentId) return
    const data = {
      studentId: selectedStudentId, 
      studentName: students.find(s => s.id === selectedStudentId)?.studentName, 
      studentPhoto, 
      enrollmentNo, 
      rollNo, 
      fatherName, 
      motherName, 
      courseName, 
      semester, 
      section, 
      dob, 
      examSeatNo, 
      examName: examTitle, 
      academicYear, 
      declarationDate, 
      attendancePercent, 
      remarks, 
      subjects, 
      ...finalResults, 
      updatedAt: Date.now()
    }
    const dbPath = `Institutes/${resolvedId}/marksheets`
    try {
      if (editingItem) await update(ref(database, `${dbPath}/${editingItem.id}`), data)
      else await push(ref(database, dbPath), { ...data, createdAt: Date.now(), resultId: `RES-${Date.now().toString().slice(-6)}` })
      toast({ title: "Transcript Published" })
      setIsModalOpen(false)
    } catch (err) { toast({ variant: "destructive", title: "Sync Error" }) }
  }

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


  const filteredMarksheets = useMemo(() => {
    return marksheets.filter(m => m.studentName?.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [marksheets, searchTerm])

  const resetForm = () => {
    setSelectedStudentId(""); setFatherName(""); setMotherName(""); setEnrollmentNo(""); setRollNo("");
    setCourseName(""); setSemester(""); setSection(""); setDob(""); setExamSeatNo("");
    setSubjects([{ id: '1', code: "101", name: "", theoryTotal: 100, theoryObtain: 0, practicalTotal: 20, practicalObtain: 0, subjectTotal: 120, subjectObtain: 0, grade: "F", remarks: "", result: "Fail" }]);
  }

  const loadForEdit = (item: any) => {
    setSelectedStudentId(item.studentId); setFatherName(item.fatherName || ""); setMotherName(item.motherName || "");
    setEnrollmentNo(item.enrollmentNo || ""); setRollNo(item.rollNo || ""); setCourseName(item.courseName || "");
    setSemester(item.semester || ""); setSection(item.section || ""); setDob(item.dob || "");
    setExamSeatNo(item.examSeatNo || ""); setExamTitle(item.examName || ""); setAcademicYear(item.academicYear || "");
    setDeclarationDate(item.declarationDate || ""); setAttendancePercent(item.attendancePercent || "0");
    setRemarks(item.remarks || ""); setSubjects(item.subjects || []);
  }

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 animate-pulse">Synchronizing Node...</div>

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      <Sidebar />
      <div className="lg:pl-[300px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        <main className="flex-1 p-4 md:p-8 space-y-6 md:space-y-10 animate-in fade-in duration-500 font-public-sans text-black text-[14px]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div>
              <h2 className="text-3xl font-black text-black tracking-tight font-public-sans leading-none">Transcript Registry</h2>
              <p className="text-[14px] text-black font-medium mt-1">Generate official academic credentials in high-fidelity format</p>
            </div>
            <Button onClick={() => { setEditingItem(null); resetForm(); setIsModalOpen(true); }} className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-8 font-black text-[14px] tracking-widest shadow-lg border-none active:scale-95 transition-all">
              <Plus className="h-4 w-4 mr-2" /> Create Marksheet
            </Button>
          </div>

          <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
            <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
              <div className="relative group w-full md:w-80">
                <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
                <Input placeholder="Search Registry..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-11 h-11 bg-zinc-50 border-none rounded-xl text-[14px] font-bold shadow-inner" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table className="min-w-[1200px]">
                <TableHeader className="bg-zinc-50/50">
                  <TableRow className="border-zinc-100">
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14 pl-10">Candidate Identity</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14">Academic Node</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14 text-center">Percentage</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14 text-center">Outcome</TableHead>
                    <TableHead className="text-right pr-10 text-[11px] font-black text-black tracking-widest h-14">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMarksheets.map((row) => (
                    <TableRow key={row.id} className="border-zinc-50 hover:bg-zinc-50/30 group transition-none">
                      <TableCell className="pl-10 py-6">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                            <AvatarImage src={row.studentPhoto} />
                            <AvatarFallback className="bg-zinc-100 text-black font-black text-[14px]">{row.studentName?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-[14px] font-black text-black tracking-tight">{row.studentName}</span>
                            <span className="text-[10px] font-bold text-black">Roll: {row.rollNo}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[14px] font-bold text-black">{row.courseName}</span>
                          <span className="text-[10px] font-black text-primary tracking-widest">{row.examName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-black text-lg text-black">{row.percentage}%</TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "rounded-lg px-3 py-1 text-[9px] font-black  border-none",
                          row.overallResult === 'PASS' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>{row.overallResult}</Badge>
                      </TableCell>
                      <TableCell className="text-right pr-10">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setPreviewItem(row); setIsPreviewOpen(true); }} className="h-9 w-9 text-amber-500 hover:bg-amber-50 rounded-xl transition-all"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDownloadPDF(row)} className="h-9 w-9 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"><FileDown className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { setEditingItem(row); loadForEdit(row); setIsModalOpen(true); }} className="h-9 w-9 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { if(confirm("Permanently remove record?")) remove(ref(database!, `Institutes/${resolvedId}/marksheets/${row.id}`)) }} className="h-9 w-9 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-4xl p-0 border-none rounded-[40px] overflow-hidden bg-white shadow-2xl sm:max-w-[95vw] flex flex-col max-h-[90vh]">
              <div className="bg-[#1e3a8a] px-10 py-8 text-white relative shrink-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
                <DialogHeader className="space-y-3">
                  <DialogTitle className="text-3xl text-[14px] font-black tracking-tight font-public-sans">Create Marksheet</DialogTitle>
                  <p className="text-blue-200 text-[14px] font-bold tracking-widest flex items-center gap-2"></p>
                </DialogHeader>
                
              </div>
              <ScrollArea className="flex-1">
                <form onSubmit={handleSave} className="p-10 space-y-12">
                  <div className="space-y-8">
                    <h3 className="text-[10px] font-black text-primary tracking-[0.3em] border-b pb-3">1. Candidate Identity</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="space-y-1.5">
                        <Label className="text-[13px] font-bold text-black tracking-widest ml-1">Target Candidate *</Label>
                        <Select value={selectedStudentId} onValueChange={setSelectedStudentId} required>
                          <SelectTrigger className="h-12 rounded-xl border-zinc-100 bg-zinc-50/50 font-black text-black text-[14px]"><SelectValue placeholder="Select Student" /></SelectTrigger>
                          <SelectContent className="rounded-2xl border-zinc-100 shadow-2xl">
                            {students.map(s => <SelectItem key={s.id} value={s.id} className="font-bold text-[14px]">{s.studentName} ({s.admissionNo})</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <FormGroup label="FATHER NAME" value={fatherName} onChange={setFatherName} />
                      <FormGroup label="MOTHER NAME" value={motherName} onChange={setMotherName} />
                      <FormGroup label="ENROLLMENT NO" value={enrollmentNo} onChange={setEnrollmentNo} />
                      <FormGroup label="ROLL NUMBER" value={rollNo} onChange={setRollNo} />
                      <FormGroup label="DOB" type="date" value={dob} onChange={setDob} />
                      <FormGroup label="COURSE NAME" value={courseName} onChange={setCourseName} />
                      <FormGroup label="SEMESTER / YEAR" value={semester} onChange={setSemester} />
                      <FormGroup label="SECTION" value={section} onChange={setSection} />
                      <FormGroup label="EXAM SEAT NO" value={examSeatNo} onChange={setExamSeatNo} />
                      <FormGroup label="ACADEMIC YEAR" value={academicYear} onChange={setAcademicYear} />
                      <FormGroup label="EXAM TITLE" value={examTitle} onChange={setExamTitle} />
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                      <h3 className="text-[10px] font-black text-[#1e3a8a] tracking-[0.3em]">2. Performance Matrix</h3>
                      <Button type="button" onClick={handleAddSubject} variant="outline" className="h-8 rounded-lg text-[9px] font-black tracking-widest border-blue-100 text-[#1e3a8a] hover:bg-blue-50">+ Add Subject </Button>
                    </div>
                    <div className="overflow-x-auto scrollbar-thin">
                      <Table className="min-w-[1400px]">
                        <TableHeader className="bg-zinc-50/50">
                          <TableRow className="border-zinc-100">
                            <TableHead className="text-[11px] font-black text-black tracking-widest h-12">CODE</TableHead>
                            <TableHead className="text-[11px] font-black text-black tracking-widest h-12">SUBJECT DESCRIPTION</TableHead>
                            <TableHead className="text-[11px] font-black text-black tracking-widest text-center">THEORY TOTAL</TableHead>
                            <TableHead className="text-[11px] font-black text-black tracking-widest text-center">THEORY OBTAINED</TableHead>
                            <TableHead className="text-[11px] font-black text-black tracking-widest text-center">PRAC TOTAL</TableHead>
                            <TableHead className="text-[11px] font-black text-black tracking-widest text-center">PRAC OBTAINED</TableHead>
                            <TableHead className="text-[11px] font-black text-black tracking-widest text-center">GRADE</TableHead>
                            <TableHead className="text-[11px] font-black text-black tracking-widest text-center">REMARKS</TableHead>
                            <TableHead className="text-right pr-4 text-[11px] font-black text-black tracking-widest">RESULT</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {subjects.map((s) => (
                            <TableRow key={s.id} className="border-zinc-50">
                              <TableCell className="w-[120px]"><Input value={s.code} onChange={e => updateSubject(s.id, 'code', e.target.value)} placeholder="101" className="h-11 rounded-xl font-bold text-[14px]" /></TableCell>
                              <TableCell className="w-[250px]"><Input value={s.name} onChange={e => updateSubject(s.id, 'name', e.target.value)} placeholder="Physics" className="h-11 rounded-xl font-bold text-[14px]" /></TableCell>
                              <TableCell><Input type="number" value={s.theoryTotal || ''} onChange={e => updateSubject(s.id, 'theoryTotal', Number(e.target.value))} className="h-11 text-center font-bold text-zinc-400 text-[14px]" /></TableCell>
                              <TableCell><Input type="number" value={s.theoryObtain || ''} onChange={e => updateSubject(s.id, 'theoryObtain', Number(e.target.value))} className="h-11 text-center font-black text-primary text-[14px]" /></TableCell>
                              <TableCell><Input type="number" value={s.practicalTotal || ''} onChange={e => updateSubject(s.id, 'practicalTotal', Number(e.target.value))} className="h-11 text-center font-bold text-zinc-400 text-[14px]" /></TableCell>
                              <TableCell><Input type="number" value={s.practicalObtain || ''} onChange={e => updateSubject(s.id, 'practicalObtain', Number(e.target.value))} className="h-11 text-center font-black text-primary text-[14px]" /></TableCell>
                              <TableCell className="text-center font-black text-lg">{s.grade}</TableCell>
                              <TableCell><Input value={s.remarks} onChange={e => updateSubject(s.id, 'remarks', e.target.value)} placeholder="Distinction" className="h-11 rounded-xl text-[12px]" /></TableCell>
                              <TableCell className="text-right pr-4">
                                <Badge className={cn(
                                  "rounded-lg px-2.5 py-0.5 text-[9px] font-black ",
                                  s.result === 'Pass' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                )}>{s.result}</Badge>
                              </TableCell>
                              <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveSubject(s.id)} className="text-rose-500 hover:bg-rose-50 transition-none outline-none border-none"><Trash2 className="w-4 h-4" /></Button></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="bg-zinc-900 p-10 rounded-[40px] text-white flex flex-col md:flex-row justify-between items-center gap-10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-3xl" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12 flex-1 w-full relative z-10">
                      <SummaryItem label="AGG. MAX" value={finalResults.grandTotalMax} />
                      <SummaryItem label="AGG. OBTAINED" value={finalResults.grandObtained} color="text-primary" />
                      <SummaryItem label="PERCENTAGE" value={`${finalResults.percentage}%`} />
                      <SummaryItem label="RESULT" value={finalResults.overallResult} color={finalResults.overallResult === 'PASS' ? "text-emerald-400" : "text-rose-400"} />
                    </div>
                    <Button type="submit" className="h-16 px-16 bg-primary hover:bg-primary/90 text-white rounded-3xl font-black text-[14px] tracking-[0.2em] shadow-xl border-none active:scale-95 transition-all">
                      <Save className="w-5 h-5 mr-3" />Submit
                    </Button>
                  </div>
                </form>
              </ScrollArea>
            </DialogContent>
          </Dialog>
          <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogContent className="max-w-[800px] p-0 border-none rounded-[40px] overflow-hidden bg-zinc-100 shadow-2xl flex flex-col max-h-[95vh]">
                <div className="p-4 bg-white border-b flex justify-between items-center shrink-0">
                    <h3 className="font-black text-[14px] tracking-widest text-black px-4">Credential Preview</h3>
                    <div className="flex gap-2">
                        <Button onClick={() => handleDownloadPDF(previewItem)} className="bg-emerald-600 text-white rounded-xl h-10 px-6 font-black text-[10px] tracking-widest"><FileDown className="w-4 h-4 mr-2" /> Download Document</Button>
                        <DialogClose asChild><Button variant="ghost" className="rounded-xl h-10 w-10 p-0 text-black"><X /></Button></DialogClose>
                    </div>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-10 flex justify-center">
                        {previewItem && <MarksheetTemplate record={previewItem} instituteName={instituteName} logo={instituteProfile?.logoUrl} />}
                    </div>
                </ScrollArea>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}

function MarksheetTemplate({ record, instituteName, logo }: any) {
    return (
        <div className="w-[700px] bg-[#fdfbf0] p-4 relative border-[1px] border-zinc-300 shadow-xl" id="marksheet-canvas">
            {/* Outer Frames */}
            <div className="border-[3px] border-black p-1.5 h-full min-h-[900px] relative overflow-hidden">
                <div className="border-[1px] border-black h-full p-8 relative flex flex-col items-center">
                    
                    {/* Linear Title */}
                    <div className="w-full text-center mt-12 mb-4">
                        <h1 className="text-[34px] font-black tracking-[0.05em] text-black">
                             {instituteName || "NIRVANA EDUCATION COMMUNE"}
                        </h1>
                    </div>

                    {/* Logo */}
                    <div className="mt-8 mb-4 relative z-10">
                        {logo ? (
                            <img src={logo} alt="Logo" className="w-20 h-20 object-contain" />
                        ) : (
                            <div className="w-20 h-20 border-[2px] border-black rounded-full flex items-center justify-center bg-white">
                                <span className="text-[12px] font-black">Nirvana</span>
                            </div>
                        )}
                    </div>

                    {/* Header Text */}
                    <h2 className="text-[16px] font-black text-black tracking-tight mb-8">
                        OFFICIAL MARK SHEET - {record.examName?.toUpperCase() || "CLASS X BOARD EXAMINATION"}
                    </h2>

                    {/* Student Info */}
                    <div className="w-full grid grid-cols-2 gap-x-12 gap-y-6 mb-10 text-[13px] font-bold">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-end justify-between border-b-[1px] border-dotted border-black/40 pb-0.5">
                                <span className="whitespace-nowrap mr-2">STUDENT NAME:</span>
                                <span className="text-left flex-1 font-semibold">{(record.studentName || "").toUpperCase()}</span>
                            </div>
                            <div className="flex items-end justify-between border-b-[1px] border-dotted border-black/40 pb-0.5 mt-4">
                                <span className="whitespace-nowrap mr-2">MOTHER'S NAME:</span>
                                <span className="text-left flex-1 font-semibold">{(record.motherName || "").toUpperCase()}</span>
                            </div>
                            <div className="flex items-end justify-between border-b-[1px] border-dotted border-black/40 pb-0.5 mt-4">
                                <span className="whitespace-nowrap mr-2">DATE OF BIRTH:</span>
                                <span className="text-left flex-1 font-semibold">{record.dob || "-"}</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-end justify-between border-b-[1px] border-dotted border-black/40 pb-0.5">
                                <span className="whitespace-nowrap mr-2">ROLL NUMBER:</span>
                                <span className="text-left flex-1 font-semibold">{record.rollNo || "-"}</span>
                            </div>
                            <div className="flex items-end justify-between border-b-[1px] border-dotted border-black/40 pb-0.5 mt-4">
                                <span className="whitespace-nowrap mr-2">FATHER'S NAME:</span>
                                <span className="text-left flex-1 font-semibold">{(record.fatherName || "").toUpperCase()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Marks Table */}
                    <div className="w-full mb-8">
                        <table className="w-full border-collapse border-[1px] border-black">
                            <thead>
                                <tr className="bg-[#362b1f] text-white">
                                    <th className="border-[1px] border-black p-2 text-[10px] font-black w-[80px]">Subject Code</th>
                                    <th className="border-[1px] border-black p-2 text-[10px] font-black text-left">Subject Name</th>
                                    <th className="border-[1px] border-black p-2 text-[10px] font-black w-[100px]">Theory Marks</th>
                                    <th className="border-[1px] border-black p-2 text-[10px] font-black w-[120px]">Practical Marks</th>
                                    <th className="border-[1px] border-black p-2 text-[10px] font-black w-[80px]">Total Marks</th>
                                    <th className="border-[1px] border-black p-2 text-[10px] font-black w-[60px]">Grade</th>
                                    <th className="border-[1px] border-black p-2 text-[10px] font-black w-[80px]">Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {record.subjects?.map((s: any, i: number) => (
                                    <tr key={i} className="text-[12px] font-bold text-center">
                                        <td className="border-[1px] border-black p-2">{s.code || '-'}</td>
                                        <td className="border-[1px] border-black p-2 text-left">{(s.name || "").toUpperCase()}</td>
                                        <td className="border-[1px] border-black p-2">{s.theoryObtain || 0} / {s.theoryTotal || 0}</td>
                                        <td className="border-[1px] border-black p-2">{s.practicalObtain || 0} / {s.practicalTotal || 0}</td>
                                        <td className="border-[1px] border-black p-2">{s.subjectObtain || 0} / {s.subjectTotal || 0}</td>
                                        <td className="border-[1px] border-black p-2">{s.grade || '-'}</td>
                                        <td className="border-[1px] border-black p-2">{s.remarks || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Overall Summary Bar */}
                    <div className="w-full bg-[#362b1f] text-white text-center py-1.5 mb-0.5">
                        <span className="text-[11px] font-black tracking-widest">Overall Performance Summary</span>
                    </div>
                    <table className="w-full border-collapse border-[1px] border-black mb-10">
                        <tbody>
                            <tr className="text-[12px] font-black text-center h-10 bg-white">
                                <td className="border-[1px] border-black">Grand Total: {record.grandObtained} / {record.grandTotalMax}</td>
                                <td className="border-[1px] border-black">Percentage: {record.percentage}%</td>
                                <td className="border-[1px] border-black">Grade: {record.overallGrade}</td>
                                <td className="border-[1px] border-black">Result: {record.overallResult}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Signatures */}
                    <div className="w-full flex justify-between mt-12 px-4 mb-20">
                        <div className="flex flex-col items-center">
                            <div className="w-[180px] border-t-[1px] border-black mb-2"></div>
                            <span className="text-[10px] font-black">Signature of Principal</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-[180px] border-t-[1px] border-black mb-2"></div>
                            <span className="text-[10px] font-black">Signature of Teacher In-charge</span>
                        </div>
                    </div>

                    {/* Grading Scale */}
                    <div className="w-full bg-[#362b1f] text-white text-center py-1 mb-0.5">
                        <span className="text-[10px] font-black tracking-widest">Grade Point and Grading Scale</span>
                    </div>
                    <div className="w-full grid grid-cols-4 border-[1px] border-black divide-x-[1px] divide-black bg-white text-[9px] font-bold p-1">
                        <div className="flex flex-col gap-1 p-1">
                            <span>A - GRADE POINT - 10-20</span>
                            <span>B - GRADE POINT - 90</span>
                            <span>C - GRADE POINT - 80</span>
                        </div>
                        <div className="flex flex-col gap-1 p-1">
                            <span>B-- FIRST POINT - 70</span>
                            <span>C-- FIRST POINT - 50</span>
                            <span>D-- FIDEL POINT - 50</span>
                        </div>
                        <div className="flex flex-col gap-1 p-1">
                            <span>E - GRADE POINT - 10-20</span>
                            <span>F - GRADE POINT - 40</span>
                            <span>G - GRADE POINT - 30</span>
                        </div>
                        <div className="flex flex-col gap-1 p-1">
                            <span>F - END POINT - 0</span>
                            <span>E - GRADING POINT - 1</span>
                        </div>
                    </div>

                    {/* Side Decorative Mark */}
                    <div className="absolute top-1/2 -left-1 text-[8px] font-black text-zinc-300 transform -rotate-90 origin-top-left -translate-y-1/2 opacity-50">Nirvana Nirvana Nirvana</div>
                    <div className="absolute top-1/2 -right-1 text-[8px] font-black text-zinc-300 transform rotate-90 origin-top-right -translate-y-1/2 opacity-50">Nirvana Nirvana Nirvana</div>

                </div>
            </div>
        </div>
    )
}

function FormGroup({ label, value, onChange, type = "text" }: any) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[13px] font-bold text-black tracking-widest ml-1">{label}</Label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} className="h-12 rounded-xl border-zinc-100 bg-zinc-50/50 font-bold text-black text-[14px]" />
    </div>
  )
}

function SummaryItem({ label, value, color }: any) {
  return (
    <div className="space-y-1 text-center">
      <p className="text-[9px] font-black text-white/40 tracking-widest">{label}</p>
      <h4 className={cn("text-2xl font-black tracking-tight", color || "text-white")}>{value}</h4>
    </div>
  )
}

