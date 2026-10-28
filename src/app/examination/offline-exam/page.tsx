
"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  FileText, 
  Printer, 
  X, 
  FileSpreadsheet, 
  FileDown,
  AlertCircle,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Layers,
  Settings2,
  FileUp,
  Info,
  UserPlus,
  Check,
  Upload,
  Loader2,
  Download
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, set, remove, off, update } from "firebase/database"
import { uploadFileToImageKit } from "@/lib/imagekit"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import { usePathname } from "next/navigation"

interface ExamSection {
  id: string
  title: string
  marksPerQuestion: number
  questionCount: number
}

interface OfflineQuestion {
  id: string
  text: string
  marks: number
}

export default function OfflineExamsPage() {
  const pathname = usePathname()
  const isPortal = (pathname.startsWith('/branch') && !pathname.startsWith('/branch-management')) || 
                   pathname.startsWith('/staff') || 
                   (pathname.startsWith('/student') && !pathname.startsWith('/student-information'))

  const { toast } = useToast()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPaperModalOpen, setIsPaperModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [exams, setExams] = useState<any[]>([])
  const [dropdownData, setDropdownData] = useState<Record<string, any[]>>({})
  const [editingExam, setEditingExam] = useState<any>(null)
  const [viewingExam, setViewingExam] = useState<any>(null)
  const [assigningExam, setAssigningExam] = useState<any>(null)
  
  const [students, setStudents] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [filterClass, setFilterClass] = useState("all")
  const [filterSection, setFilterSection] = useState("all")
  const [filterBatch, setFilterBatch] = useState("all")
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [instituteName, setInstituteName] = useState("Your Institute")
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [sections, setSections] = useState<ExamSection[]>([
    { id: '1', title: "Section A: Objective Type", marksPerQuestion: 2, questionCount: 10 }
  ])
  const [questions, setQuestions] = useState<OfflineQuestion[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const { database, storage } = useFirebase()
  const { user } = useUser()

  useEffect(() => {
    if (!database || !user) return
    const rootPath = `Institutes/${user.uid}`
    
    setIsLoading(true)
    onValue(ref(database, `${rootPath}/offline-exams`), (snapshot) => {
      const data = snapshot.val()
      if (data) setExams(Object.keys(data).map(key => ({ ...data[key], id: key })).reverse())
      else setExams([])
      setIsLoading(false)
    })

    onValue(ref(database, `${rootPath}/profile`), (s) => {
      if (s.val()?.instituteName) setInstituteName(s.val().instituteName)
    })

    onValue(ref(database, `${rootPath}/admissions`), (s) => {
      const data = s.val()
      if (data) setStudents(Object.keys(data).map(k => ({ ...data[k], id: k })))
      else setStudents([])
    })

    onValue(ref(database, `${rootPath}/batches`), (s) => {
      const data = s.val()
      if (data) setBatches(Object.keys(data).map(k => ({ ...data[k], id: k })))
      else setBatches([])
    })

    onValue(ref(database, `${rootPath}/dropdowns`), (snapshot) => {
      const data = snapshot.val() || {}
      const processed: Record<string, any[]> = {}
      Object.keys(data).forEach(key => {
        processed[key] = Object.keys(data[key]).map(id => ({ id, value: data[key][id].value }))
      })
      setDropdownData(processed)
    })
  }, [database, user])

  const filteredExams = useMemo(() => {
    if (!searchTerm) return exams
    const lower = searchTerm.toLowerCase()
    return exams.filter(e => e.title?.toLowerCase().includes(lower))
  }, [exams, searchTerm])

  const totalPages = Math.ceil(filteredExams.length / itemsPerPage)
  const paginatedExams = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredExams.slice(start, start + itemsPerPage)
  }, [filteredExams, currentPage])

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchClass = filterClass === 'all' || s.course === filterClass
      const matchSection = filterSection === 'all' || s.section === filterSection
      const matchBatch = filterBatch === 'all' || (batches.find(b => b.id === filterBatch)?.assignedStudents?.[s.id])
      return matchClass && matchSection && matchBatch
    })
  }, [students, filterClass, filterSection, filterBatch, batches])

  const handleAddSection = () => {
    setSections([...sections, { id: Date.now().toString(), title: `Section ${String.fromCharCode(65 + sections.length)}`, marksPerQuestion: 5, questionCount: 5 }])
  }

  const updateSection = (id: string, field: keyof ExamSection, value: any) => {
    setSections(sections.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n')
      const newQuestions: OfflineQuestion[] = []

      lines.forEach((line, idx) => {
        const parts = line.split(',').map(p => p.trim())
        if (parts.length >= 2 && parts[0] !== "" && idx > 0) {
          newQuestions.push({
            id: `imported-${Date.now()}-${idx}`,
            text: parts[0],
            marks: Number(parts[1]) || 1
          })
        }
      })

      if (newQuestions.length > 0) {
        setQuestions(prev => [...prev, ...newQuestions])
        toast({ title: "Import Successful", description: `${newQuestions.length} questions added to the registry.` })
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setIsSubmitting(true)
    try {
      const res = await uploadFileToImageKit(file, `/exam-papers/${user.uid}`)
      const url = res.url
      
      if (editingExam) {
        await update(ref(database!, `Institutes/${user.uid}/offline-exams/${editingExam.id}`), { paperUrl: url })
      }
      toast({ title: "Document Attached", description: "Examination paper successfully uploaded to ImageKit." })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: err.message || "Failed to upload" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveExam = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user || !database || isSubmitting) return
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const examData = {
      title: formData.get("title") as string,
      class: formData.get("class") as string,
      section: formData.get("section") as string,
      examDate: formData.get("date") as string,
      timing: formData.get("timing") as string,
      sections: sections,
      questions: questions,
      totalMarks: sections.reduce((sum, s) => sum + (s.questionCount * s.marksPerQuestion), 0),
      updatedAt: Date.now()
    }

    const dbPath = `Institutes/${user.uid}/offline-exams`
    if (editingExam) {
      update(ref(database, `${dbPath}/${editingExam.id}`), examData)
        .then(() => { toast({ title: "Exam Updated" }); setIsModalOpen(false); setIsSubmitting(false); })
    } else {
      const newRef = push(ref(database, dbPath))
      set(newRef, { ...examData, createdAt: Date.now() })
        .then(() => { toast({ title: "Exam Scheduled" }); setIsModalOpen(false); setIsSubmitting(false); })
    }
  }

  const handleAssignSubmit = async () => {
    if (!user || !database || !assigningExam || isSubmitting) return
    setIsSubmitting(true)
    
    try {
      const dbPath = `Institutes/${user.uid}/offline-exams/${assigningExam.id}/assignedStudents`
      const assignments: Record<string, boolean> = {}
      selectedStudentIds.forEach(id => { assignments[id] = true })
      
      await set(ref(database, dbPath), assignments)
      
      toast({ title: "Students Mapped", description: `${selectedStudentIds.size} candidates assigned to physical paper.` })
      setIsAssignModalOpen(false)
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to map students." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const mainContent = (
    <main className="flex-1 p-8 space-y-8 animate-in fade-in duration-500 w-full overflow-x-hidden text-black font-public-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h2 className="text-[26px] font-normal text-black font-public-sans tracking-tight leading-none">Offline Assessments ({filteredExams.length})</h2>
          <p className="text-[14px] text-black font-medium mt-1">Manage printable academic evaluations</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingExam(null); }}>
          <Button onClick={() => { setEditingExam(null); setSections([{ id: '1', title: "Section A", marksPerQuestion: 5, questionCount: 10 }]); setQuestions([]); setIsModalOpen(true); }} className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-6 font-bold text-[14px] gap-2 border-none shadow-sm transition-all active:scale-95">
            <Plus className="h-4 w-4" /> Create Offline Exam
          </Button>
          <DialogContent className="max-w-xl p-0 border border-zinc-200 rounded-3xl overflow-y-auto bg-white">
            <div className="bg-white px-8 py-5 flex items-center justify-between border-b border-zinc-100">
              <DialogTitle className="text-[22px] font-medium text-black tracking-tight">Setup Exam Paper</DialogTitle>
            </div>
            <ScrollArea className="max-h-[85vh]">
              <form onSubmit={handleSaveExam} className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-[12px] font-medium text-black tracking-widest ml-1">EXAM NAME</Label>
                    <Input name="title" defaultValue={editingExam?.title} required className="h-12 rounded-xl border-zinc-200 font-medium text-black" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-black tracking-widest ml-1">CLASS</Label>
                    <Select name="class" defaultValue={editingExam?.class} required>
                      <SelectTrigger className="h-12 rounded-xl border-zinc-200 font-medium text-black"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{(dropdownData['course'] || []).map(opt => <SelectItem key={opt.id} value={opt.value}>{opt.value}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-black tracking-widest ml-1">SECTION</Label>
                    <Select name="section" defaultValue={editingExam?.section} required>
                      <SelectTrigger className="h-12 rounded-xl border-zinc-200 font-medium text-black"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{(dropdownData['section'] || []).map(opt => <SelectItem key={opt.id} value={opt.value}>{opt.value}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-black tracking-widest ml-1">DATE</Label>
                    <Input name="date" type="date" required defaultValue={editingExam?.examDate} className="h-12 rounded-xl border-zinc-200 font-medium text-black" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-black tracking-widest ml-1">TIMING</Label>
                    <Input name="timing" type="time" required defaultValue={editingExam?.timing} className="h-12 rounded-xl border-zinc-200 font-medium text-black" />
                  </div>
                </div>

                <div className="pt-6 space-y-6 text-black font-medium">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="text-[11px] font-medium text-black tracking-[0.2em]">Format & Content</h3>
                    <div className="flex items-center gap-3">
                      <input type="file" ref={pdfInputRef} onChange={handlePdfUpload} className="hidden" accept=".pdf" />
                      <Button type="button" variant="ghost" onClick={() => pdfInputRef.current?.click()} className="text-primary font-bold text-[10px] gap-1.5 border border-primary/10 rounded-lg h-8">
                        {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileUp className="w-3 h-3" />} Upload PDF
                      </Button>
                      <input type="file" ref={fileInputRef} onChange={handleCsvImport} className="hidden" accept=".csv" />
                      <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()} className="text-primary font-bold text-[10px] gap-1.5 border border-primary/10 rounded-lg h-8">
                        <FileSpreadsheet className="w-3 h-3" /> Import CSV
                      </Button>
                      <Button type="button" variant="ghost" onClick={handleAddSection} className="text-primary font-bold text-[10px] h-8 hover:underline">+ Add Section</Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {sections.map(s => (
                      <div key={s.id} className="grid grid-cols-12 gap-4 items-end bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                        <div className="col-span-5 space-y-1.5">
                          <Label className="text-[9px] font-bold text-black">SECTION TITLE</Label>
                          <Input value={s.title} onChange={(e) => updateSection(s.id, 'title', e.target.value)} className="h-10 bg-white border-zinc-200 font-medium text-black" />
                        </div>
                        <div className="col-span-3 space-y-1.5">
                          <Label className="text-[9px] font-bold text-black">COUNT</Label>
                          <Input type="number" value={s.questionCount} onChange={(e) => updateSection(s.id, 'questionCount', Number(e.target.value))} className="h-10 bg-white border-zinc-200 font-medium text-black" />
                        </div>
                        <div className="col-span-3 space-y-1.5">
                          <Label className="text-[9px] font-bold text-black">MARKS/Q</Label>
                          <Input type="number" value={s.marksPerQuestion} onChange={(e) => updateSection(s.id, 'marksPerQuestion', Number(e.target.value))} className="h-10 bg-white border-zinc-200 font-medium text-black" />
                        </div>
                        <div className="col-span-1">
                          <Button type="button" variant="ghost" size="icon" onClick={() => setSections(sections.filter(sec => sec.id !== s.id))} className="text-rose-500 h-10 w-10"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-fit h-12 px-12 bg-primary hover:opacity-90 text-white rounded-xl font-black shadow-lg border-none text-[14px] tracking-widest active:scale-95 transition-all">
                  Schedule Assessment
                </Button>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border border-zinc-100 shadow-sm rounded-3xl overflow-hidden bg-white">
        <div className="p-8 border-b border-zinc-50">
          <div className="relative group w-full md:w-80">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
            <Input placeholder="Search Registry..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="pl-11 h-11 bg-zinc-50 border-none rounded-xl text-[14px] font-medium transition-none focus-visible:ring-primary shadow-inner" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[1200px]">
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="border-zinc-100">
                <TableHead className="text-[11px] font-black text-black tracking-widest h-14 pl-10 w-20">SR NO.</TableHead>
                <TableHead className="text-[11px] font-black text-black tracking-widest h-14">TITLE</TableHead>
                <TableHead className="text-[11px] font-black text-black tracking-widest h-14">DETAILS</TableHead>
                <TableHead className="text-[11px] font-black text-black tracking-widest h-14">CLASS/SEC</TableHead>
                <TableHead className="text-[11px] font-black text-black tracking-widest h-14">DATE</TableHead>
                <TableHead className="text-[11px] font-black text-black tracking-widest h-14 pr-10 text-right">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (<TableRow key={i}><TableCell colSpan={6} className="p-4"><div className="h-12 w-full bg-zinc-50 animate-pulse rounded-lg" /></TableCell></TableRow>))
              ) : paginatedExams.map((row, index) => (
                <TableRow key={row.id} className="border-zinc-50 hover:bg-zinc-50/20 transition-none group">
                  <TableCell className="text-[14px] font-medium text-black pl-10">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                  <TableCell className="text-[14px] font-bold text-black font-public-sans">{row.title}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-black">Sections: {row.sections?.length || 0}</span>
                      <span className="text-[10px] font-black text-primary">Total Marks: {row.totalMarks || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[14px] font-bold text-black">{row.class} - {row.section}</TableCell>
                  <TableCell className="text-[14px] font-bold text-black font-public-sans">{row.examDate ? format(parseISO(row.examDate), "dd-MM-yyyy") : "-"}</TableCell>
                  <TableCell className="text-right pr-10">
                    <div className="flex items-center justify-end gap-2">
                      <Button onClick={() => { setAssigningExam(row); setSelectedStudentIds(new Set(Object.keys(row.assignedStudents || {}))); setIsAssignModalOpen(true); }} className="bg-[#00B4D8] hover:bg-[#00B4D8]/90 text-white h-7 px-3 text-[10px] font-black rounded-md shadow-sm border-none transition-all gap-1.5"><UserPlus className="w-3 h-3" /> Assign</Button>
                      <Button onClick={() => { setViewingExam(row); setIsPaperModalOpen(true); }} className="bg-primary hover:opacity-90 text-white h-7 px-3 text-[10px] font-black rounded-md shadow-sm border-none transition-all gap-1.5"><FileDown className="w-3 h-3" /> Paper</Button>
                      <Button variant="ghost" size="icon" onClick={() => { setEditingExam(row); setSections(row.sections || []); setQuestions(row.questions || []); setIsModalOpen(true); }} className="text-black hover:text-blue-600 h-8 w-8"><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(ref(database!, `Institutes/${user?.uid}/offline-exams/${row.id}`))} className="text-black hover:text-rose-600 h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-xl p-0 border border-zinc-200 rounded-3xl overflow-y-auto bg-white shadow-2xl">
          <div className="bg-white px-8 py-5 border-b border-zinc-100 flex items-center justify-between">
            <div><DialogTitle className="text-xl font-bold text-black tracking-tight">Assign Candidates</DialogTitle><p className="text-[10px] font-bold text-black tracking-widest mt-1">Target Exam: {assigningExam?.title}</p></div>
          </div>
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CriteriaSelect label="Class" value={filterClass} onChange={(v) => { setFilterClass(v); }} options={dropdownData['course'] || []} />
              <CriteriaSelect label="Section" value={filterSection} onChange={(v) => { setFilterSection(v); }} options={dropdownData['section'] || []} />
              <CriteriaSelect label="Batch" value={filterBatch} onChange={(v) => { setFilterBatch(v); }} options={batches.map(b => ({id: b.id, value: b.batchName}))} />
            </div>
            <div className="border border-zinc-100 rounded-2xl overflow-hidden bg-zinc-50/30">
              <div className="bg-zinc-50 px-6 py-3 border-b border-zinc-100 flex items-center justify-between"><span className="text-[10px] font-black text-black tracking-widest">Candidates Found ({filteredStudents.length})</span><button onClick={() => { if (selectedStudentIds.size === filteredStudents.length) setSelectedStudentIds(new Set()); else setSelectedStudentIds(new Set(filteredStudents.map(s => s.id))) }} className="text-[10px] font-bold text-primary hover:underline tracking-widest">Select All</button></div>
              <ScrollArea className="h-[300px]"><div className="p-4 space-y-2">{filteredStudents.map(s => (<div key={s.id} onClick={() => toggleStudent(s.id)} className={cn("flex items-center justify-between p-3 rounded-xl border border-transparent transition-all cursor-pointer", selectedStudentIds.has(s.id) ? "bg-white border-primary/20 shadow-sm" : "hover:bg-zinc-50")}><div className="flex items-center gap-3"><div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px]", selectedStudentIds.has(s.id) ? "bg-primary text-white" : "bg-zinc-100 text-black")}>{s.studentName?.charAt(0)}</div><div><p className="text-[14px] font-bold text-black">{s.studentName}</p><p className="text-[10px] font-medium text-black tracking-tight">{s.admissionNo} • {s.course}</p></div></div>{selectedStudentIds.has(s.id) && <Check className="w-4 h-4 text-primary" />}</div>))}</div></ScrollArea>
            </div>
            <Button onClick={handleAssignSubmit} disabled={isSubmitting} className="w-full bg-primary hover:opacity-90 text-white rounded-xl h-12 font-black shadow-lg transition-all border-none text-[14px] tracking-widest">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Confirm & Sync Assignment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )

  if (isPortal) return mainContent

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      <Sidebar />
      <div className="lg:pl-[280px] flex flex-col flex-1 w-full overflow-x-hidden">
        <TopNav />
        {mainContent}
      </div>
    </div>
  )
}

function CriteriaSelect({ label, value, onChange, options }: { label: string, value: string, onChange: (v: string) => void, options: any[] }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-black text-black tracking-widest ml-1">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-none font-bold text-black shadow-inner text-[14px] transition-none"><SelectValue placeholder="All" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All {label}s</SelectItem>
          {options.map(opt => <SelectItem key={opt.id} value={opt.value || opt.id}>{opt.value}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}
