
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
  MonitorPlay,
  X,
  Check,
  UserPlus,
  Trash,
  Clock,
  Calendar,
  Loader2,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  Save
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, set, remove, off, update, get } from "firebase/database"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { format, isAfter, isBefore } from "date-fns"
import { usePathname } from "next/navigation"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { createStudentNotification, createAdminNotification, NotificationType } from "@/lib/notifications"

interface Question {
  id: string
  text: string
  options: string[]
  correctAnswer: string
  marks: number
}

export default function OnlineExamsPage() {
  const pathname = usePathname()
  const isPortal = (pathname.startsWith('/branch') && !pathname.startsWith('/branch-management')) ||
    pathname.startsWith('/staff') ||
    (pathname.startsWith('/student') && !pathname.startsWith('/student-information'))

  const { toast } = useToast()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [exams, setExams] = useState<any[]>([])
  const [dropdownData, setDropdownData] = useState<Record<string, any[]>>({})
  const [editingExam, setEditingExam] = useState<any>(null)
  const [assigningExam, setAssigningExam] = useState<any>(null)

  const [students, setStudents] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [filterClass, setFilterClass] = useState("all")
  const [filterSection, setFilterSection] = useState("all")
  const [filterBatch, setFilterBatch] = useState("all")
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [selectedBatchIdForCreate, setSelectedBatchIdForCreate] = useState<string>("")
  const [autoClass, setAutoClass] = useState("")
  const [autoSection, setAutoSection] = useState("")

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [questions, setQuestions] = useState<Question[]>([
    { id: '1', text: "", options: ["", "", "", ""], correctAnswer: "Option 1", marks: 1 }
  ])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDownloadSampleCSV = () => {
    const headers = "Question Text,Option 1,Option 2,Option 3,Option 4,Correct Option (Option 1/Option 2/Option 3/Option 4),Marks"
    const sampleRows = [
      "What is the capital of France?,Paris,London,Berlin,Madrid,Option 1,1",
      "Which planet is known as the Red Planet?,Venus,Mars,Jupiter,Saturn,Option 2,1"
    ]
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...sampleRows].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "online_exam_questions_sample.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split("\n").filter(line => line.trim())
      const newQuestions: Question[] = []

      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(",").map(col => col.trim())
        if (columns.length >= 7) {
          newQuestions.push({
            id: Math.random().toString(36).substr(2, 9),
            text: columns[0],
            options: [columns[1], columns[2], columns[3], columns[4]],
            correctAnswer: columns[5],
            marks: Number(columns[6]) || 1
          })
        }
      }

      if (newQuestions.length > 0) {
        setQuestions(prev => {
          // If the first question is empty, replace it
          if (prev.length === 1 && !prev[0].text && prev[0].options.every(o => !o)) {
            return newQuestions
          }
          return [...prev, ...newQuestions]
        })
        toast({ title: "CSV Uploaded", description: `${newQuestions.length} questions imported.` })
      } else {
        toast({ variant: "destructive", title: "Upload Failed", description: "Invalid CSV format or empty file." })
      }
    }
    reader.readAsText(file)
    e.target.value = "" // Reset
  }

  const addQuestion = () => {
    setQuestions(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), text: "", options: ["", "", "", ""], correctAnswer: "Option 1", marks: 1 }])
  }

  const removeQuestion = (index: number) => {
    if (questions.length === 1) {
      setQuestions([{ id: Math.random().toString(36).substr(2, 9), text: "", options: ["", "", "", ""], correctAnswer: "Option 1", marks: 1 }])
      return
    }
    setQuestions(prev => prev.filter((_, i) => i !== index))
  }

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    setQuestions(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const updateOption = (qIdx: number, optIdx: number, value: string) => {
    setQuestions(prev => {
      const next = [...prev]
      const nextOptions = [...next[qIdx].options]
      nextOptions[optIdx] = value
      next[qIdx] = { ...next[qIdx], options: nextOptions }
      return next
    })
  }

  const { database } = useFirebase()
  const { resolvedId, isBranch, branchId } = useResolvedId()

  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])

  useEffect(() => {
    if (!database || !resolvedId) return
    const rootPath = `Institutes/${resolvedId}`

    setIsLoading(true)

    // Fetch Exams
    onValue(ref(database, `${rootPath}/online-exams`), (snapshot) => {
      const data = snapshot.val()
      if (data) setExams(Object.keys(data).map(key => ({ ...data[key], id: key })).reverse())
      else setExams([])
      setIsLoading(false)
    })

    // Fetch Students
    onValue(ref(database, `${rootPath}/admissions`), (s) => {
      const data = s.val()
      if (data) {
        let list = Object.keys(data).map(k => ({ ...data[k], id: k }))
        if (isBranch && branchId) list = list.filter(stu => stu.branchId === branchId)
        setStudents(list)
      } else {
        setStudents([])
      }
    })

    // Fetch Active Batches Only
    onValue(ref(database, `${rootPath}/batches`), (s) => {
      const data = s.val()
      if (data) {
        let list = Object.keys(data).map(k => ({ ...data[k], id: k }))
        if (isBranch && branchId) list = list.filter(b => b.branchId === branchId)
        setBatches(list)
      } else {
        setBatches([])
      }
    })

    onValue(ref(database, `${rootPath}/dropdowns`), (snapshot) => {
      const data = snapshot.val() || {}
      const processed: Record<string, any[]> = {}
      Object.keys(data).forEach(key => {
        processed[key] = Object.keys(data[key]).map(id => ({ id, value: data[key][id].value }))
      })
      setDropdownData(processed)
    })
  }, [database, resolvedId, isBranch, branchId])

  useEffect(() => {
    if (editingExam) {
      setQuestions(editingExam.questions || [{ id: '1', text: "", options: ["", "", "", ""], correctAnswer: "Option 1", marks: 1 }])
      setSelectedBatchIdForCreate(editingExam.batchId || "")
      setAutoClass(editingExam.class || "")
      setAutoSection(editingExam.section || "")
    }
  }, [editingExam])

  const handleSaveExam = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!resolvedId || !database || isSubmitting) return
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const examData = {
      title: formData.get("title") as string,
      batchId: formData.get("batchId") as string,
      class: formData.get("class") as string,
      section: formData.get("section") as string,
      startDate: formData.get("startDate") as string,
      time: formData.get("time") as string,
      durationHours: formData.get("durationHours") as string,
      durationMinutes: formData.get("durationMinutes") as string,
      passingPercentage: formData.get("passingPercentage") as string,
      questions: questions,
      status: "Upcoming",
      updatedAt: Date.now()
    }

    const dbPath = `Institutes/${resolvedId}/online-exams`
    if (editingExam) {
      update(ref(database, `${dbPath}/${editingExam.id}`), examData)
        .then(() => {
          toast({ title: "Exam Updated" })
          setIsModalOpen(false)
          setIsSubmitting(false)
        })
    } else {
      const newRef = push(ref(database, dbPath))
      set(newRef, { ...examData, createdAt: Date.now() })
        .then(() => {
          toast({ title: "Online Exam Created" })
          setIsModalOpen(false)
          setIsSubmitting(false)
        })
    }
  }

  const handleAssignSubmit = async () => {
    if (!database || !resolvedId || !assigningExam || isSubmitting) return
    setIsSubmitting(true)

    try {
      const rootPath = `Institutes/${resolvedId}`
      const dbPath = `${rootPath}/online-exams/${assigningExam.id}/assignedStudents`
      const assignments: Record<string, boolean> = {}
      selectedStudentIds.forEach(id => { assignments[id] = true })

      await set(ref(database, dbPath), assignments)

      // Send Notifications
      const notifPromises: Promise<any>[] = []

      // Admin Notification
      notifPromises.push(createAdminNotification(database, resolvedId, {
        title: "Exam Assignment Synced",
        message: `Assigned students for exam "${assigningExam.title}" have been updated. Total: ${selectedStudentIds.size} candidates mapped.`,
        type: NotificationType.Exam
      }))

      // Student Notifications
      selectedStudentIds.forEach(studentId => {
        notifPromises.push(createStudentNotification(database, resolvedId, studentId, {
          title: "New Exam Assigned",
          message: `You have been assigned to the online exam: "${assigningExam.title}". Schedule: ${assigningExam.startDate} at ${assigningExam.time}.`,
          type: NotificationType.Exam
        }))
      })

      await Promise.all(notifPromises)

      toast({ title: "Assignment Synced", description: `${selectedStudentIds.size} students mapped and notified.` })
      setIsAssignModalOpen(false)
    } catch (e) {
      toast({ variant: "destructive", title: "Sync Failed" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredExams = useMemo(() => {
    if (!searchTerm) return exams
    const lower = searchTerm.toLowerCase()
    return exams.filter(e => e.title?.toLowerCase().includes(lower))
  }, [exams, searchTerm])

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

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBatchSelect = (batchId: string) => {
    setSelectedBatchIdForCreate(batchId)
    const batch = batches.find(b => b.id === batchId)
    if (batch) {
      setAutoClass(batch.className || "")
      setAutoSection(batch.courseName || "")
    }
  }

  const getExamStatus = (exam: any) => {
    const now = new Date()
    const startString = `${exam.startDate}T${exam.time || "00:00"}`
    let start = new Date(startString)
    if (isNaN(start.getTime())) start = new Date()
    if (isBefore(now, start)) return "Upcoming"
    const durationMin = (Number(exam.durationHours || 0) * 60) + Number(exam.durationMinutes || 0)
    const end = new Date(start.getTime() + (durationMin || 60) * 60000)
    if (isAfter(now, end)) return "Expired"
    return "Live"
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-public-sans">
      {!isPortal && <Sidebar />}
      <div className={cn("flex flex-col flex-1 min-w-0", !isPortal && "lg:pl-[300px]")}>
        <TopNav />
        <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-500 w-full overflow-x-hidden text-black font-public-sans text-[14px]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div>
              <h2 className="text-[26px] font-normal text-black font-public-sans tracking-tight leading-none">Online Examination</h2>
              <p className="text-[14px] text-black font-medium mt-1.5">Manage digital evaluations and question registries</p>
            </div>

            <Dialog open={isModalOpen} onOpenChange={(o) => { setIsModalOpen(o); if (!o) setEditingExam(null); }}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingExam(null);
                  setQuestions([{ id: '1', text: "", options: ["", "", "", ""], correctAnswer: "Option 1", marks: 1 }]);
                  setSelectedBatchIdForCreate("");
                  setAutoClass("");
                  setAutoSection("");
                }} className="bg-primary hover:opacity-90 text-white rounded-xl h-11 px-8 font-black text-[14px] tracking-widest border-none shadow-lg active:scale-95 shrink-0">
                  <Plus className="h-4 w-4 mr-2" /> Create New Exam
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl p-0 border border-zinc-200 rounded-[32px] overflow-y-auto bg-white shadow-2xl sm:max-w-[95vw]">
                <div className="bg-white px-8 py-6 border-b border-zinc-100 flex items-center justify-between">
                  <DialogTitle className="text-xl font-medium text-black tracking-tight">Setup Online Examination</DialogTitle>
                </div>
                <ScrollArea className="max-h-[80vh]">
                  <form onSubmit={handleSaveExam} className="p-8 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 text-black font-medium">
                      <div className="space-y-1.5">
                        <Label className="text-[12px] font-medium text-black tracking-widest ml-1">SELECT BATCH</Label>
                        <Select name="batchId" value={selectedBatchIdForCreate} onValueChange={handleBatchSelect}>
                          <SelectTrigger className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[14px]"><SelectValue placeholder="Select Batch" /></SelectTrigger>
                          <SelectContent className="rounded-xl border-zinc-100 shadow-xl">
                            {batches.map(b => <SelectItem key={b.id} value={b.id} className="font-bold text-[14px]">{b.batchName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] font-medium text-black tracking-widest ml-1">CLASS</Label>
                        <Input name="class" value={autoClass} onChange={(e) => setAutoClass(e.target.value)} required className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[14px]" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] font-medium text-black tracking-widest ml-1">SECTION / COURSE</Label>
                        <Input name="section" value={autoSection} onChange={(e) => setAutoSection(e.target.value)} required className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[14px]" />
                      </div>
                      <div className="md:col-span-3 space-y-1.5">
                        <Label className="text-[12px] font-medium text-black tracking-widest ml-1">EXAM TITLE</Label>
                        <Input name="title" defaultValue={editingExam?.title} required className="h-12 rounded-xl border-zinc-200 font-medium text-black text-[14px]" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] font-medium text-black tracking-widest ml-1">START DATE</Label>
                        <Input name="startDate" type="date" required defaultValue={editingExam?.startDate || today} className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[14px]" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] font-medium text-black tracking-widest ml-1">TIME</Label>
                        <Input name="time" type="time" required defaultValue={editingExam?.time} className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[14px]" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] font-medium text-black tracking-widest ml-1">EXAM DURATION</Label>
                        <div className="flex gap-2">
                          <Input name="durationHours" type="number" placeholder="Hours" defaultValue={editingExam?.durationHours || "1"} className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[14px]" />
                          <Input name="durationMinutes" type="number" placeholder="Minutes" defaultValue={editingExam?.durationMinutes || "0"} className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[14px]" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] font-medium text-black tracking-widest ml-1">PASSING PERCENTAGE (%)</Label>
                        <Input name="passingPercentage" type="number" placeholder="33" defaultValue={editingExam?.passingPercentage || "33"} className="h-12 rounded-xl border-zinc-200 font-bold text-black text-[14px]" />
                      </div>
                    </div>
                    <div className="space-y-6 pt-10 border-t border-zinc-100">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-black tracking-tight">Assessment Registry</h3>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" onClick={handleDownloadSampleCSV} className="rounded-xl h-10 border-zinc-200 text-black font-bold text-[12px] bg-zinc-50 hover:bg-zinc-100">
                            <Download className="h-4 w-4 mr-2" /> Sample CSV
                          </Button>
                          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-xl h-10 border-zinc-200 text-black font-bold text-[12px] bg-zinc-50 hover:bg-zinc-100">
                            <Upload className="h-4 w-4 mr-2" /> Upload CSV
                          </Button>
                          <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
                        </div>
                      </div>

                      <div className="space-y-4">
                        {questions.map((q, idx) => (
                          <Card key={q.id} className="p-6 border-zinc-100 shadow-sm rounded-[24px] relative group bg-zinc-50/30">
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(idx)} className="absolute top-4 right-4 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-50 rounded-xl">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                              <div className="md:col-span-12 space-y-1.5">
                                <Label className="text-[10px] font-black tracking-widest text-zinc-400">QUESTION {idx + 1}</Label>
                                <Input value={q.text} onChange={(e) => updateQuestion(idx, 'text', e.target.value)} placeholder="Type question here..." className="h-12 rounded-xl border-zinc-200 font-medium text-black text-[14px]" />
                              </div>
                              {q.options.map((opt, optIdx) => (
                                <div key={optIdx} className="md:col-span-3 space-y-1.5">
                                  <Label className="text-[10px] font-black tracking-widest text-zinc-400">OPTION {optIdx + 1}</Label>
                                  <Input value={opt} onChange={(e) => updateOption(idx, optIdx, e.target.value)} placeholder={`Option ${optIdx + 1}`} className="h-11 rounded-xl border-zinc-200 font-medium text-black text-[14px]" />
                                </div>
                              ))}
                              <div className="md:col-span-6 space-y-1.5">
                                <Label className="text-[10px] font-black tracking-widest text-zinc-400">CORRECT ANSWER</Label>
                                <Select value={q.correctAnswer} onValueChange={(val) => updateQuestion(idx, 'correctAnswer', val)}>
                                  <SelectTrigger className="h-11 rounded-xl border-zinc-200 font-medium text-black text-[14px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl border-zinc-100">
                                    {q.options.map((_, i) => (
                                      <SelectItem key={i} value={`Option ${i + 1}`} className="font-medium text-[14px]">Option {i + 1}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="md:col-span-6 space-y-1.5">
                                <Label className="text-[10px] font-black tracking-widest text-zinc-400">MARKS</Label>
                                <Input type="number" value={q.marks} onChange={(e) => updateQuestion(idx, 'marks', Number(e.target.value))} className="h-11 rounded-xl border-zinc-200 font-medium text-black text-[14px]" />
                              </div>
                            </div>
                          </Card>
                        ))}
                        <Button type="button" onClick={addQuestion} variant="outline" className="w-full h-14 border-dashed border-zinc-200 rounded-2xl text-zinc-400 hover:text-primary hover:border-primary transition-all bg-white font-bold text-[12px] tracking-widest">
                          <Plus className="h-4 w-4 mr-2" /> ADD MANUAL QUESTION
                        </Button>
                      </div>
                    </div>
                    <div className="pt-4 pb-10">
                      <Button type="submit" disabled={isSubmitting} className="w-fit h-12 px-12 bg-primary hover:opacity-90 text-white rounded-xl font-black text-[14px] tracking-widest shadow-xl border-none active:scale-95 transition-all">
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Publish Online Assessment
                      </Button>
                    </div>
                  </form>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="border border-zinc-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
            <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
              <div className="relative group w-full md:w-80">
                <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
                <Input placeholder="Search examinations..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); }} className="pl-11 h-11 bg-zinc-50 border-none rounded-xl text-[14px] font-medium transition-none focus-visible:ring-primary shadow-inner" />
              </div>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <Table className="min-w-[1400px]">
                <TableHeader className="bg-zinc-50/50">
                  <TableRow className="border-zinc-100">
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14 pl-10 w-20">SR NO.</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14">Assessment Title</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14">Current Status</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14">Date & Session</TableHead>
                    <TableHead className="text-[11px] font-black text-black tracking-widest h-14">Duration</TableHead>
                    <TableHead className="text-right pr-10 text-[11px] font-black text-black tracking-widest h-14">Operations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (<TableRow key={i}><TableCell colSpan={6} className="p-4"><div className="h-12 w-full bg-zinc-50 animate-pulse rounded-xl" /></TableCell></TableRow>))
                  ) : paginatedExams.map((row, index) => {
                    const status = getExamStatus(row)
                    return (
                      <TableRow key={row.id} className="border-zinc-50 hover:bg-zinc-50/20 transition-none group">
                        <TableCell className="text-[14px] font-medium text-black pl-10">{index + 1}</TableCell>
                        <TableCell className="text-[14px] font-black text-black tracking-tight">{row.title}</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "rounded-lg px-3 py-1 text-[9px] font-black  border-none shadow-none transition-none",
                            status === 'Live' ? "bg-emerald-50 text-emerald-600" :
                              status === 'Upcoming' ? "bg-blue-50 text-blue-600" : "bg-zinc-100 text-black"
                          )}>{status}</Badge>
                        </TableCell>
                        <TableCell className="text-[14px] font-bold text-black font-public-sans tracking-tighter">{row.startDate} | {row.time}</TableCell>
                        <TableCell className="text-[14px] font-bold text-black font-public-sans tracking-tighter">{row.durationHours}H {row.durationMinutes}M</TableCell>
                        <TableCell className="text-right pr-10">
                          <div className="flex items-center justify-end gap-1">
                            <Button onClick={() => { setAssigningExam(row); setSelectedStudentIds(new Set(Object.keys(row.assignedStudents || {}))); setIsAssignModalOpen(true); }} className="bg-[#00B4D8] hover:bg-[#00B4D8]/90 text-white h-8 px-4 text-[9px] font-black rounded-xl border-none shadow-sm transition-all active:scale-95">Assign</Button>
                            <Button variant="ghost" size="icon" onClick={() => { setEditingExam(row); setIsModalOpen(true); }} className="h-9 w-9 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Edit2 className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete exam?")) remove(ref(database!, `Institutes/${resolvedId}/online-exams/${row.id}`)) }} className="h-9 w-9 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
            <DialogContent className="max-w-2xl p-0 border border-zinc-200 rounded-[32px] overflow-y-auto bg-white shadow-2xl">
              <div className="bg-white px-8 py-5 border-b border-zinc-100 flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl font-black text-black tracking-tight">Assign Enrollment</DialogTitle>
                  <p className="text-[10px] font-bold text-black tracking-widest mt-1">Target Assessment: {assigningExam?.title}</p>
                </div>

              </div>
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black text-black tracking-widest ml-1">Class</Label>
                    <Select value={filterClass} onValueChange={setFilterClass}>
                      <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-none font-bold text-black shadow-inner text-[11px]"><SelectValue placeholder="All" /></SelectTrigger>
                      <SelectContent className="rounded-xl border-zinc-100 shadow-xl">
                        <SelectItem value="all" className="text-[14px] font-bold">All Classes</SelectItem>
                        {(dropdownData['class'] || []).map(opt => <SelectItem key={opt.id} value={opt.value} className="text-[14px] font-bold">{opt.value}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black text-black tracking-widest ml-1">Section</Label>
                    <Select value={filterSection} onValueChange={setFilterSection}>
                      <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-none font-bold text-black shadow-inner text-[11px]"><SelectValue placeholder="All" /></SelectTrigger>
                      <SelectContent className="rounded-xl border-zinc-100 shadow-xl">
                        <SelectItem value="all" className="text-[14px] font-bold">All Sections</SelectItem>
                        {(dropdownData['section'] || []).map(opt => <SelectItem key={opt.id} value={opt.value} className="text-[14px] font-bold">{opt.value}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black text-black tracking-widest ml-1">Batch</Label>
                    <Select value={filterBatch} onValueChange={setFilterBatch}>
                      <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-none font-bold text-black shadow-inner text-[11px]"><SelectValue placeholder="All" /></SelectTrigger>
                      <SelectContent className="rounded-xl border-zinc-100 shadow-xl">
                        <SelectItem value="all" className="text-[14px] font-bold">All Batches</SelectItem>
                        {batches.map(b => <SelectItem key={b.id} value={b.id} className="text-[14px] font-bold">{b.batchName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="border border-zinc-100 rounded-3xl overflow-hidden bg-zinc-50/30">
                  <div className="bg-zinc-50 px-6 py-3 border-b border-zinc-100 flex items-center justify-between">
                    <span className="text-[10px] font-black text-black tracking-widest">Candidates Found ({filteredStudents.length})</span>
                    <button onClick={() => { if (selectedStudentIds.size === filteredStudents.length) setSelectedStudentIds(new Set()); else setSelectedStudentIds(new Set(filteredStudents.map(s => s.id))) }} className="text-[10px] font-black text-primary hover:underline tracking-widest border-none bg-transparent">Select All</button>
                  </div>
                  <ScrollArea className="h-[300px]">
                    <div className="p-4 space-y-2">
                      {filteredStudents.map(s => (
                        <div key={s.id} onClick={() => toggleStudent(s.id)} className={cn("flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer", selectedStudentIds.has(s.id) ? "bg-white border-primary/20 shadow-md scale-[1.02]" : "bg-transparent border-transparent hover:bg-white hover:shadow-sm")}>
                          <div className="flex items-center gap-4">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black text-[14px] ", selectedStudentIds.has(s.id) ? "bg-primary text-white" : "bg-white text-zinc-300 shadow-inner")}>
                              {s.studentName?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-[14px] font-bold text-black tracking-tight">{s.studentName}</p>
                              <p className="text-[10px] font-bold text-black tracking-widest">{s.admissionNo} • {s.course}</p>
                            </div>
                          </div>
                          {selectedStudentIds.has(s.id) && <div className="bg-primary text-white p-1 rounded-full"><Check className="w-3.5 h-3.5 stroke-[4px]" /></div>}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                <Button onClick={handleAssignSubmit} disabled={isSubmitting} className="w-full h-16 bg-primary text-white rounded-2xl h-14 font-black shadow-xl border-none text-[14px] tracking-[0.2em] active:scale-95 transition-all border-none">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Finalize Mapping & Notify"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}

function FormGroup({ label, name, type = "text", required = false, defaultValue }: any) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px] font-medium text-black ml-1">{label} {required && "*"}</Label>
      <Input name={name} type={type} required={required} defaultValue={defaultValue} className="rounded-xl border-zinc-200 h-12 font-normal text-black text-[14px]" />
    </div>
  )
}
