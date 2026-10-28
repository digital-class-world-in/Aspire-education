
"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Trash2,
  Edit2,
  FileSpreadsheet,
  FileText,
  Download,
  Upload,
  X,
  Filter,
  Loader2,
  Info,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings2
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, update, remove, off, set, get } from "firebase/database"
import { useToast } from "@/hooks/use-toast"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { cn } from "@/lib/utils"
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function OfflineMarksPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const { resolvedId, isLoading: idLoading } = useResolvedId()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [marks, setMarks] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isStudentsLoading, setIsStudentsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [sectionFilter, setSectionFilter] = useState("all")
  const [batchFilter, setBatchFilter] = useState("all")
  const [subjectFilter, setSubjectFilter] = useState("all")
  const [instituteName, setInstituteName] = useState("Your Institute")
  const [dropdownData, setDropdownData] = useState<Record<string, any[]>>({})
  const [batches, setBatches] = useState<any[]>([])

  // Manual Entry & Preview State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [csvPreview, setCsvPreview] = useState<any[]>([])
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [formData, setFormData] = useState({
    studentId: "",
    subject: "",
    examDate: format(new Date(), "yyyy-MM-dd"),
    maxMarks: "100",
    minMarks: "33",
    obtainedMarks: ""
  })

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [previewPage, setPreviewPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    if (!database || !resolvedId) return
    const rootPath = `Institutes/${resolvedId}`

    // Fetch Marks
    onValue(ref(database, `${rootPath}/offline-marks`), (snapshot) => {
      const data = snapshot.val() || {}
      setMarks(Object.keys(data).map(k => ({ ...data[k], id: k })).reverse())
      setIsLoading(false)
    })

    // Fetch Students for Sample CSV
    onValue(ref(database, `${rootPath}/admissions`), (snapshot) => {
      const data = snapshot.val() || {}
      setStudents(Object.keys(data).map(k => ({ ...data[k], id: k })))
      setIsStudentsLoading(false)
    })

    // Fetch Batches
    onValue(ref(database, `${rootPath}/batches`), (snapshot) => {
      const data = snapshot.val() || {}
      setBatches(Object.keys(data).map(k => ({ ...data[k], id: k })))
    })

    onValue(ref(database, `${rootPath}/profile/instituteName`), (s) => {
      if (s.exists()) setInstituteName(s.val())
    })

    // Fetch Dropdowns for Filters
    onValue(ref(database, `${rootPath}/dropdowns`), (snapshot) => {
      const data = snapshot.val() || {}
      const processed: Record<string, any[]> = {}
      Object.keys(data).forEach(key => {
        processed[key] = Object.keys(data[key]).map(id => ({ id, value: data[key][id].value }))
      })
      setDropdownData(processed)
    })
  }, [database, resolvedId])

  const formatDateSafely = (dateVal: any) => {
    if (!dateVal) return "-";
    try {
      const d = typeof dateVal === 'string' ? parseISO(dateVal) : new Date(dateVal);
      if (isNaN(d.getTime())) return "-";
      return format(d, "dd-MM-yyyy");
    } catch (e) {
      return "-";
    }
  };

  const combinedData = useMemo(() => {
    return students.map(student => {
      const studentMarks = marks.filter(m => m.studentId === student.id);
      const latestMark = studentMarks.length > 0 
        ? studentMarks.sort((a,b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0] 
        : null;

      return {
        ...student,
        class: student.course || student.class || "-",
        section: student.section || "-",
        batch: student.batch || "-",
        studentId: student.id,
        markRecordId: latestMark ? latestMark.id : null,
        subject: latestMark ? latestMark.subject : "-",
        examDate: latestMark ? latestMark.examDate : null,
        maxMarks: latestMark ? latestMark.maxMarks : "-",
        minMarks: latestMark ? latestMark.minMarks : "-",
        obtainedMarks: latestMark ? latestMark.obtainedMarks : "-",
        status: latestMark ? latestMark.status : "-",
      }
    });
  }, [students, marks])

  const uniqueClasses = useMemo(() => {
    const classes = new Set(combinedData.map(m => m.class).filter(c => c && c !== "-"));
    return Array.from(classes).sort();
  }, [combinedData]);

  const uniqueBatches = useMemo(() => {
    const batches = new Set(combinedData.map(m => m.batch).filter(b => b && b !== "-"));
    return Array.from(batches).sort();
  }, [combinedData]);

  const uniqueSubjects = useMemo(() => {
    const subjects = new Set(combinedData.map(m => m.subject).filter(s => s && s !== "-"));
    return Array.from(subjects).sort();
  }, [combinedData]);

  const uniqueSections = useMemo(() => {
    const sections = new Set(combinedData.map(m => m.section).filter(s => s && s !== "-"));
    return Array.from(sections).sort();
  }, [combinedData]);

  const filteredMarks = useMemo(() => {
    return combinedData.filter(m => {
      const matchSearch = !searchTerm ||
        m.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.admissionNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.rollNo?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchClass = classFilter === "all" || m.class === classFilter;
      const matchSection = sectionFilter === "all" || m.section === sectionFilter;
      const matchBatch = batchFilter === "all" || m.batch === batchFilter;
      const matchSubject = subjectFilter === "all" || m.subject === subjectFilter;

      let matchDate = true
      if (fromDate || toDate) {
        if (!m.examDate || m.examDate === "-") {
          matchDate = false
        } else {
          try {
            const examDate = typeof m.examDate === 'string' ? parseISO(m.examDate) : new Date(m.examDate)
            const start = fromDate ? startOfDay(parseISO(fromDate)) : null
            const end = toDate ? endOfDay(parseISO(toDate)) : null
            if (start && end && !isNaN(examDate.getTime())) matchDate = isWithinInterval(examDate, { start, end })
            else if (start && !isNaN(examDate.getTime())) matchDate = examDate >= start
            else if (end && !isNaN(examDate.getTime())) matchDate = examDate <= end
          } catch (e) { matchDate = true }
        }
      }
      return matchSearch && matchDate && matchClass && matchSection && matchBatch && matchSubject
    })
  }, [combinedData, searchTerm, fromDate, toDate, classFilter, sectionFilter, batchFilter, subjectFilter])

  const paginated = filteredMarks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const totalPages = Math.ceil(filteredMarks.length / itemsPerPage)

  const mergedPreviewData = useMemo(() => {
    if (!isPreviewMode) return [];
    return csvPreview;
  }, [csvPreview, isPreviewMode]);

  const resetFilters = () => {
    setSearchTerm("")
    setFromDate("")
    setToDate("")
    setClassFilter("all")
    setSectionFilter("all")
    setBatchFilter("all")
    setSubjectFilter("all")
    setCurrentPage(1)
  }

  const downloadSampleCSV = () => {
    if (students.length === 0) {
      toast({ variant: "destructive", title: "No students", description: "Register students first to generate a sample sheet." })
      return
    }
    const data = students.map(s => ({
      "Student ID": s.id,
      "Roll No": s.rollNo || '-',
      "Admission No": s.admissionNo || '-',
      "Name": s.studentName,
      "Class": s.course || s.class || '-',
      "Section": s.section || '-',
      "Batch": s.batch || '-',
      "Subject": "Enter Subject",
      "Exam Date": format(new Date(), "dd-MM-yyyy"),
      "Max Marks": "100",
      "Min Marks": "33",
      "Obtained Marks": "0"
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Marking Sheet")
    XLSX.writeFile(wb, "offline_marks_template.csv")
  }

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !resolvedId || !database) return

    // Fetch students with their actual Firebase keys (ids)
    const studentsSnap = await get(ref(database, `Institutes/${resolvedId}/admissions`))
    const students = studentsSnap.exists() 
      ? Object.keys(studentsSnap.val()).map(k => ({ ...studentsSnap.val()[k], id: k })) 
      : []

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wsname])

        const parseExcelDate = (val: any) => {
          if (!val) return format(new Date(), "yyyy-MM-dd");
          if (typeof val === 'number') {
            // Excel serial date conversion (Excel base date is Dec 30, 1899)
            const date = new Date(Math.round((val - 25569) * 86400 * 1000));
            return format(date, "yyyy-MM-dd");
          }
          
          const str = val.toString().trim();
          // Handle dd-mm-yyyy
          const ddmmyyyy = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
          if (ddmmyyyy) {
            return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
          }

          // If it's a string, try to format it if it's a valid date string
          try {
            const d = new Date(str);
            if (!isNaN(d.getTime())) return format(d, "yyyy-MM-dd");
          } catch(e) {}
          return str;
        };

        const processed: any[] = []
        let skippedCount = 0

        for (const row of data as any[]) {
          const rollNo = row["Roll No"] || row["Roll_No"] || ""
          const admNo = row["Admission No"] || row["Admission_No"] || ""
          
          // Strictly match by Roll No or Admission No
          const student = students.find((s: any) => {
            const dbRoll = (s.rollNo || "").toString().toLowerCase().trim()
            const dbAdm = (s.admissionNo || "").toString().toLowerCase().trim()
            const csvRoll = rollNo.toString().toLowerCase().trim()
            const csvAdm = admNo.toString().toLowerCase().trim()
            return (csvRoll && (dbRoll === csvRoll || dbRoll === `stu_${csvRoll}`)) || 
                   (csvAdm && dbAdm === csvAdm)
          })

          if (student) {
            processed.push({
              studentId: (student as any).id || (student as any).rollNo, // Prefer actual DB ID
              studentName: student.studentName || row["Name"] || "N/A",
              admissionNo: student.admissionNo || admNo || "-",
              rollNo: student.rollNo || rollNo || "-",
              class: student.course || student.class || row["Class"] || "-",
              section: student.section || row["Section"] || "-",
              batch: student.batch || row["Batch"] || "-",
              subject: row["Subject"] || "General",
              examDate: parseExcelDate(row["Exam Date"] || row["Exam_Date"]),
              maxMarks: Number(row["Max Marks"] || row["Max_Marks"]) || 100,
              minMarks: Number(row["Min Marks"] || row["Min_Marks"]) || 33,
              obtainedMarks: Number(row["Obtained Marks"] || row["Obtained_Marks"]) || 0,
            })
          } else {
            skippedCount++
          }
        }


        setCsvPreview(processed)
        setIsPreviewMode(true)
        setPreviewPage(1)
        
        if (skippedCount > 0) {
          toast({ variant: "destructive", title: "Partial Load", description: `Matched ${processed.length} students. ${skippedCount} students not found in database and were skipped.` })
        } else {
          toast({ title: "CSV Loaded", description: `Successfully matched all ${processed.length} students.` })
        }
      } catch (err) {
        toast({ variant: "destructive", title: "Load Failed", description: "Could not parse CSV file." })
      }
    }
    reader.readAsBinaryString(file)
    e.target.value = ""
  }

  const sendSMSNotification = async (markRecord: any) => {
    try {
      console.log(`[Offline Marks] Fetching student details for ID: ${markRecord.studentId}...`);
      const student = students.find(s => s.id === markRecord.studentId);
      const mobile = student?.fatherMobile || student?.mobile;
      
      if (!mobile) {
        console.warn(`[Offline Marks] No contact number found for student ${markRecord.studentName}. Skipping SMS.`);
        return;
      }

      console.log(`[Offline Marks] Triggering MSG91 SMS for ${markRecord.studentName} to ${mobile}...`);

      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: mobile,
          type: "MARKS",
          var1: markRecord.obtainedMarks.toString(),
          var2: markRecord.subject,
          var3: formatDateSafely(markRecord.examDate)
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[Offline Marks] SMS fetch failed with status ${res.status}:`, errorText);
        return;
      }

      const data = await res.json();
      if (data.success) {
        console.log(`[Offline Marks] SUCCESS: SMS sent to parent of ${markRecord.studentName} (${mobile})`);
      } else {
        console.error(`[Offline Marks] ERROR: MSG91 failed for ${markRecord.studentName}:`, data.error);
      }
    } catch (err) {
      console.error(`[Offline Marks] CRITICAL: SMS worker fetch error:`, err);
    }
  };


  const saveCsvMarks = async () => {

    if (!resolvedId || !database || csvPreview.length === 0) return
    setIsSubmitting(true)

    try {
      const dbPath = `Institutes/${resolvedId}/offline-marks`
      const updates: any = {};

      for (const row of csvPreview) {
        if (!row.studentId) continue;

        const existingMark = marks.find(m => m.studentId === row.studentId && m.subject?.toLowerCase() === row.subject?.toLowerCase());
        const recordId = existingMark ? existingMark.id : push(ref(database, dbPath)).key!;

        updates[recordId] = {
          ...row,
          status: row.obtainedMarks >= row.minMarks ? "Pass" : "Fail",
          updatedAt: Date.now(),
          ...(existingMark ? { createdAt: existingMark.createdAt } : { createdAt: Date.now() })
        };
      }

      await update(ref(database, dbPath), updates);
      
      console.log(`[Offline Marks] Batch upload complete. Starting automated SMS notifications for ${csvPreview.length} records...`);
      
      // Trigger SMS for each mark entry (using for...of with await for reliability)
      for (const row of csvPreview) {
        if (!row.studentId) continue;
        try {
          await sendSMSNotification(row);
        } catch (smsErr) {
          console.error(`[Offline Marks] SMS notification failed for ${row.studentName}:`, smsErr);
        }
      }


      toast({ title: "Success", description: "All marks from CSV have been saved and SMS sent." })
      setIsPreviewMode(false)
      setCsvPreview([])
    } catch (error) {
      console.error("[Offline Marks] Save Failed:", error);
      toast({ variant: "destructive", title: "Save Failed" })
    } finally {
      setIsSubmitting(false)
    }
  }


  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredMarks.map((m, i) => ({
      "SR NO.": i + 1,
      "NAME": m.studentName,
      "ADM NO": m.admissionNo,
      "CLASS": m.class,
      "SECTION": m.section,
      "SUBJECT": m.subject,
      "EXAM DATE": formatDateSafely(m.examDate),
      "MAX MARKS": m.maxMarks,
      "OBTAINED MARKS": m.obtainedMarks,
      "RESULT": m.status
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Offline Marks")
    XLSX.writeFile(wb, `Offline_Marks_${format(new Date(), "yyyy-MM-dd")}.xlsx`)
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(20).setTextColor(13, 148, 136).text(instituteName, 14, 20)
    doc.setFontSize(12).setTextColor(100).text(`Offline Examination Results - ${format(new Date(), "PP")}`, 14, 30)

    const tableData = filteredMarks.map((m, i) => [
      i + 1, m.studentName, m.admissionNo, m.class, m.section, m.subject, formatDateSafely(m.examDate), m.maxMarks, m.obtainedMarks, m.status
    ])

    autoTable(doc, {
      startY: 40,
      head: [['#', 'Name', 'ADM No', 'Class', 'Sec', 'Subject', 'Date', 'Max', 'Obtained', 'Result']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [13, 148, 136] }
    })
    doc.save(`Offline_Marks_Report.pdf`)
  }

  const handleOpenAddModal = () => {
    setEditingId(null)
    setFormData({
      studentId: "",
      subject: "",
      examDate: format(new Date(), "yyyy-MM-dd"),
      maxMarks: "100",
      minMarks: "33",
      obtainedMarks: ""
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (row: any) => {
    setEditingId(row.markRecordId)
    setFormData({
      studentId: row.studentId,
      subject: row.subject !== "-" ? row.subject : "",
      examDate: row.examDate || format(new Date(), "yyyy-MM-dd"),
      maxMarks: row.maxMarks !== "-" ? row.maxMarks.toString() : "100",
      minMarks: row.minMarks !== "-" ? row.minMarks.toString() : "33",
      obtainedMarks: row.obtainedMarks !== "-" ? row.obtainedMarks.toString() : ""
    })
    setIsModalOpen(true)
  }

  const handleSaveMark = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!database || !resolvedId) return
    if (!formData.studentId || !formData.subject || !formData.obtainedMarks) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Please fill all required fields." })
      return
    }

    setIsSubmitting(true)
    try {
      const student = students.find(s => s.id === formData.studentId)
      if (!student) throw new Error("Student not found")

      const markData = {
        studentId: formData.studentId,
        studentName: student.studentName || "N/A",
        admissionNo: student.admissionNo || "-",
        rollNo: student.rollNo || "-",
        class: student.course || student.class || "-",
        batch: student.batch || "-",
        subject: formData.subject,
        examDate: formData.examDate,
        maxMarks: Number(formData.maxMarks),
        minMarks: Number(formData.minMarks),
        obtainedMarks: Number(formData.obtainedMarks),
        status: Number(formData.obtainedMarks) >= Number(formData.minMarks) ? "Pass" : "Fail",
        updatedAt: Date.now()
      }

      const dbPath = `Institutes/${resolvedId}/offline-marks`
      if (editingId) {
        await update(ref(database, `${dbPath}/${editingId}`), markData)
        toast({ title: "Updated", description: "Marks updated successfully." })
      } else {
        await push(ref(database, dbPath), { ...markData, createdAt: Date.now() })
        console.log(`[Offline Marks] Manual entry added. Sending SMS for ${markData.studentName}...`);
        sendSMSNotification(markData);
        toast({ title: "Added", description: "Marks added successfully." })
      }
      setIsModalOpen(false)
    } catch (error) {
      console.error("[Offline Marks] Manual Save Error:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save marks." })
    } finally {
      setIsSubmitting(false)
    }
  }


  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans text-black">
      <Sidebar />
      <div className="lg:pl-[300px] flex flex-col flex-1 min-w-0 overflow-x-hidden">
        <TopNav />
        <main className="flex-1 p-8 space-y-8 animate-in fade-in duration-500 text-[14px]">

          <Card className="border border-zinc-100 shadow-sm rounded-2xl bg-white p-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
              <h2 className="text-xl font-bold text-black tracking-tight">Select Criteria</h2>
              <Button onClick={resetFilters} className="bg-[#FF5C5C] hover:bg-rose-600 text-white rounded-xl px-8 h-10 font-bold text-[11px] tracking-widest border-none transition-all active:scale-95 shadow-lg w-full sm:w-auto">Reset Filters</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-6 items-end">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-black tracking-widest ml-1">CLASS</Label>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="h-12 rounded-xl bg-zinc-50/50 border-zinc-100 font-bold text-black">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-zinc-100">
                    <SelectItem value="all">All Classes</SelectItem>
                    {(dropdownData['course'] || []).map(c => <SelectItem key={c.id} value={c.value}>{c.value}</SelectItem>)}
                    {uniqueClasses.filter(c => !(dropdownData['course'] || []).some(d => d.value === c)).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-black tracking-widest ml-1">SECTION</Label>
                <Select value={sectionFilter} onValueChange={setSectionFilter}>
                  <SelectTrigger className="h-12 rounded-xl bg-zinc-50/50 border-zinc-100 font-bold text-black">
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-zinc-100">
                    <SelectItem value="all">All Sections</SelectItem>
                    {(dropdownData['section'] || []).map(s => <SelectItem key={s.id} value={s.value}>{s.value}</SelectItem>)}
                    {uniqueSections.filter(s => !(dropdownData['section'] || []).some(d => d.value === s)).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-black tracking-widest ml-1">BATCH</Label>
                <Select value={batchFilter} onValueChange={setBatchFilter}>
                  <SelectTrigger className="h-12 rounded-xl bg-zinc-50/50 border-zinc-100 font-bold text-black">
                    <SelectValue placeholder="All Batches" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-zinc-100">
                    <SelectItem value="all">All Batches</SelectItem>
                    {batches.map(b => <SelectItem key={b.id} value={b.batchName}>{b.batchName}</SelectItem>)}
                    {uniqueBatches.filter(b => !batches.some(db => db.batchName === b)).map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-black tracking-widest ml-1">EXAM (SUBJECT)</Label>
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger className="h-12 rounded-xl bg-zinc-50/50 border-zinc-100 font-bold text-black">
                    <SelectValue placeholder="All Exams" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-zinc-100">
                    <SelectItem value="all">All Exams</SelectItem>
                    {uniqueSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-black tracking-widest ml-1">FROM DATE</Label>
                <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-12 rounded-xl bg-zinc-50/50 border-zinc-100 font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-black tracking-widest ml-1">TO DATE</Label>
                <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-12 rounded-xl bg-zinc-50/50 border-zinc-100 font-bold" />
              </div>
            </div>
          </Card>

          <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
            <div className="p-8 border-b border-zinc-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-lg font-black text-black tracking-tight">
                  {isPreviewMode ? "Review Uploaded Marks" : "Mark List"}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  {!isPreviewMode ? (
                    <>
                      <button onClick={downloadSampleCSV} className="text-[10px] font-bold text-blue-600 hover:underline tracking-widest">Download Sample CSV</button>
                      <span className="text-zinc-200">|</span>
                      <input type="file" ref={fileInputRef} onChange={handleImportCSV} className="hidden" accept=".csv" />
                      <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-bold text-[hsl(var(--primary))] hover:underline tracking-widest flex items-center gap-1.5">
                        <Upload className="w-3 h-3" /> Import CSV Marks
                      </button>
                    </>
                  ) : (
                    <button onClick={() => { setIsPreviewMode(false); setCsvPreview([]); }} className="text-[10px] font-bold text-rose-600 hover:underline tracking-widest">Cancel Review</button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {isPreviewMode ? (
                  <Button onClick={saveCsvMarks} disabled={isSubmitting} className="h-11 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] tracking-widest shadow-lg transition-all active:scale-95">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    SAVE ALL {csvPreview.length} MARKS
                  </Button>
                ) : (
                  <>
                    <div className="relative w-80">
                      <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300" />
                      <Input
                        placeholder="Search Data...."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="h-11 rounded-xl pl-12 border-zinc-100 bg-zinc-50/50 font-bold text-black"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={handleOpenAddModal} className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-[11px] tracking-widest flex items-center gap-2 shadow-lg transition-all active:scale-95">
                        <Plus className="w-4 h-4" /> Add Marks
                      </button>
                      <button onClick={exportExcel} className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all border-none"><FileSpreadsheet className="w-5 h-5" /></button>
                      <button onClick={exportPDF} className="p-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all border-none"><FileText className="w-5 h-5" /></button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table className="min-w-[1200px]">
                <TableHeader className="bg-zinc-50/50">
                  <TableRow className="border-zinc-100">
                    <TableHead className="pl-10 text-[11px] font-black text-black tracking-widest h-14 uppercase">SR NO.</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14 uppercase">ROLL NO</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14 uppercase">ADM NO</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14 uppercase">NAME</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14 uppercase">CLASS</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14 uppercase">SECTION</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14 uppercase">BATCH</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14 uppercase">SUBJECT</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14 uppercase">EXAM DATE</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14 uppercase text-center">MAX</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14 uppercase text-center">MIN</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14 uppercase text-center">OBTAINED</TableHead>
                    <TableHead className={cn("text-right pr-10 text-[11px] font-black text-black tracking-widest h-14 uppercase", isPreviewMode && "hidden")}>ACTION</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(isLoading || isStudentsLoading) && !isPreviewMode ? (
                    [...Array(3)].map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={12} className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-200" /></TableCell></TableRow>
                    ))
                  ) : isPreviewMode ? (
                    mergedPreviewData.slice((previewPage - 1) * itemsPerPage, previewPage * itemsPerPage).map((row, index) => (
                      <TableRow key={index} className={cn("border-zinc-50 transition-none group", row.isExisting ? "opacity-60 bg-zinc-50/50" : "hover:bg-zinc-50/20")}>
                        <TableCell className="pl-10 font-bold text-black">{(previewPage - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell className="text-[14px] font-bold text-black">{row.rollNo}</TableCell>
                        <TableCell className="text-[14px] font-bold text-black">{row.admissionNo}</TableCell>
                        <TableCell><span className="text-[14px] font-bold text-black">{row.studentName}</span></TableCell>
                        <TableCell className="text-[14px] font-bold text-black">{row.class}</TableCell>
                        <TableCell className="text-[14px] font-bold text-black">{row.section}</TableCell>
                        <TableCell className="text-[14px] font-bold text-black">{row.batch}</TableCell>
                        <TableCell className="text-[14px] font-black text-primary">{row.subject}</TableCell>
                        <TableCell className="text-[14px] font-bold text-black tracking-tighter">
                          {formatDateSafely(row.examDate)}
                        </TableCell>
                        <TableCell className="font-bold text-black text-center">{row.maxMarks}</TableCell>
                        <TableCell className="font-bold text-black text-center">{row.minMarks}</TableCell>
                        <TableCell className="font-black text-[#1e3a8a] text-center">{row.obtainedMarks}</TableCell>
                        <TableCell className="hidden"></TableCell>
                      </TableRow>
                    ))
                  ) : paginated.map((row, index) => (
                    <TableRow key={row.id} className="border-zinc-50 hover:bg-zinc-50/20 transition-none group">
                      <TableCell className="pl-10 font-bold text-black">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                      <TableCell className="text-[14px] font-bold text-black">{row.rollNo}</TableCell>
                      <TableCell className="text-[14px] font-bold text-black">{row.admissionNo}</TableCell>
                      <TableCell><span className="text-[14px] font-bold text-black font-public-sans">{row.studentName}</span></TableCell>
                      <TableCell className="text-[14px] font-bold text-black">{row.class}</TableCell>
                      <TableCell className="text-[14px] font-bold text-black">{row.section}</TableCell>
                      <TableCell className="text-[14px] font-bold text-black">{row.batch}</TableCell>
                      <TableCell className="text-[14px] font-black text-primary">{row.subject}</TableCell>
                      <TableCell className="text-[14px] font-bold text-black font-public-sans tracking-tighter">
                        {formatDateSafely(row.examDate)}
                      </TableCell>
                      <TableCell className="font-bold text-black text-center">{row.maxMarks}</TableCell>
                      <TableCell className="font-bold text-black text-center">{row.minMarks}</TableCell>
                      <TableCell className="font-black text-[#1e3a8a] text-center">{row.obtainedMarks}</TableCell>
                      <TableCell className="text-right pr-10">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleOpenEditModal(row)} className="p-2 text-zinc-300 hover:text-blue-600 transition-all border-none bg-transparent"><Edit2 className="w-4 h-4" /></button>
                          {row.markRecordId && (
                            <button onClick={() => remove(ref(database!, `Institutes/${resolvedId}/offline-marks/${row.markRecordId}`))} className="p-2 text-zinc-300 hover:text-rose-600 transition-all border-none bg-transparent"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {((!isPreviewMode && filteredMarks.length === 0) || (isPreviewMode && mergedPreviewData.length === 0)) && !(isLoading || isStudentsLoading) && (
                    <TableRow><TableCell colSpan={12} className="h-64 text-center text-zinc-300 italic tracking-widest uppercase">No records found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {(isPreviewMode ? Math.ceil(mergedPreviewData.length / itemsPerPage) : totalPages) > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => isPreviewMode ? setPreviewPage(p => Math.max(1, p - 1)) : setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={(isPreviewMode ? previewPage : currentPage) === 1} 
                className="h-9 rounded-xl font-normal text-[10px] tracking-widest transition-none"
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Previous
              </Button>
              <div className="flex items-center gap-2">
                {[...Array(isPreviewMode ? Math.ceil(mergedPreviewData.length / itemsPerPage) : totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => isPreviewMode ? setPreviewPage(i + 1) : setCurrentPage(i + 1)}
                    className={cn(
                      "w-10 h-10 rounded-xl text-[10px] font-normal transition-all",
                      (isPreviewMode ? previewPage : currentPage) === i + 1 
                        ? "bg-[#10b981] text-white shadow-xl scale-110" 
                        : "bg-white text-black border border-zinc-100 hover:bg-zinc-50"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => isPreviewMode ? setPreviewPage(p => Math.min(Math.ceil(mergedPreviewData.length / itemsPerPage), p + 1)) : setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={(isPreviewMode ? previewPage : currentPage) === (isPreviewMode ? Math.ceil(mergedPreviewData.length / itemsPerPage) : totalPages)} 
                className="h-9 rounded-xl font-normal text-[10px] tracking-widest transition-none"
              >
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </main>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-zinc-900 text-white">
            <DialogTitle className="text-2xl font-black tracking-tight">{editingId ? "Edit" : "Add Manual"} Marks</DialogTitle>
            <p className="text-zinc-400 text-xs font-bold tracking-widest mt-1">OFFLINE EXAMINATION REGISTRY</p>
          </DialogHeader>
          <form onSubmit={handleSaveMark} className="p-8 space-y-6 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1">SELECT STUDENT *</Label>
                <Select
                  value={formData.studentId}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, studentId: v }))}
                  disabled={!!editingId}
                >
                  <SelectTrigger className="h-12 rounded-xl bg-zinc-50/50 border-zinc-100 font-bold text-black">
                    <SelectValue placeholder="Select Student" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-zinc-100">
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id} className="font-bold">
                        {s.studentName} ({s.course || s.class || 'N/A'} - {s.section || 'A'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1">SUBJECT *</Label>
                <Input
                  required
                  placeholder="e.g. Mathematics"
                  value={formData.subject}
                  onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  className="h-12 rounded-xl bg-zinc-50/50 border-zinc-100 font-bold text-black"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1">EXAM DATE</Label>
                <Input
                  type="date"
                  value={formData.examDate}
                  onChange={e => setFormData(prev => ({ ...prev, examDate: e.target.value }))}
                  className="h-12 rounded-xl bg-zinc-50/50 border-zinc-100 font-bold text-black"
                />
              </div>

              <div className="grid grid-cols-3 gap-4 md:col-span-1">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1">MAX</Label>
                  <Input
                    type="number"
                    value={formData.maxMarks}
                    onChange={e => setFormData(prev => ({ ...prev, maxMarks: e.target.value }))}
                    className="h-12 rounded-xl bg-zinc-50/50 border-zinc-100 font-bold text-black"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1">MIN</Label>
                  <Input
                    type="number"
                    value={formData.minMarks}
                    onChange={e => setFormData(prev => ({ ...prev, minMarks: e.target.value }))}
                    className="h-12 rounded-xl bg-zinc-50/50 border-zinc-100 font-bold text-black"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1 text-primary">OBTAINED *</Label>
                  <Input
                    type="number"
                    required
                    value={formData.obtainedMarks}
                    onChange={e => setFormData(prev => ({ ...prev, obtainedMarks: e.target.value }))}
                    className="h-12 rounded-xl bg-zinc-50/50 border-zinc-100 font-bold text-black focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-6 border-t border-zinc-50">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl font-bold h-12 px-8">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl font-black text-[11px] tracking-widest h-12 px-12 bg-zinc-900 hover:bg-black text-white shadow-xl shadow-zinc-200 transition-all active:scale-95">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingId ? "UPDATE RECORD" : "SAVE MARKS"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FormSelect({ label, name, options, onManage, defaultValue, required = false }: any) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center px-1">
        <Label className="text-[12px] font-medium text-black">{label} {required && "*"}</Label>
        <button type="button" onClick={onManage} className="text-[9px] font-bold text-blue-600 hover:underline">Manage <Settings2 className="w-2.5 h-2.5 inline" /></button>
      </div>
      <Select name={name} defaultValue={defaultValue} required={required}>
        <SelectTrigger className="h-12 rounded-xl border-zinc-200 font-normal text-black focus:ring-primary transition-none bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
        <SelectContent className="rounded-xl border-zinc-100 shadow-xl">{options.map((opt: any) => (<SelectItem key={opt.id} value={opt.value} className="rounded-lg">{opt.value}</SelectItem>))}</SelectContent>
      </Select>
    </div>
  )
}
