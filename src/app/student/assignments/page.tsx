
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  ClipboardList, 
  Clock, 
  Calendar, 
  FileUp, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  FileText,
  User,
  Loader2,
  TrendingUp,
  History,
  Send,
  MessageSquare,
  Award
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, set, off } from "firebase/database"
import { cn } from "@/lib/utils"
import { format, formatDistanceToNow, isAfter, parseISO } from "date-fns"

export default function StudentAssignmentsPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const [student, setStudent] = useState<any>(null)
  const [adminUid, setAdminUid] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("assignments")
  const [assignments, setAssignments] = useState<any[]>([])
  const [homework, setHomework] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(true)
  
  const [selectedTask, setSelectedClass] = useState<any>(null)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (!database || !user) return
    
    const instRef = ref(database, `Institutes`)
    onValue(instRef, (snap) => {
      const institutes = snap.val() || {}
      let foundStudent = null
      let foundAdmin = null

      Object.keys(institutes).forEach(id => {
        const adms = institutes[id].admissions || {}
        Object.keys(adms).forEach(aid => {
          if (adms[aid].email?.toLowerCase() === user.email?.toLowerCase()) {
            foundStudent = { ...adms[aid], id: aid }
            foundAdmin = id
          }
        })
      })

      if (foundStudent && foundAdmin) {
        setStudent(foundStudent)
        setAdminUid(foundAdmin)
        const rootPath = `Institutes/${foundAdmin}`
        
        // Fetch Assignments
        onValue(ref(database, `${rootPath}/assignments`), (s) => {
          const data = s.val() || {}
          setAssignments(Object.keys(data).map(k => ({ ...data[k], id: k })).filter(a => a.targetClass === foundStudent.course))
        })

        // Fetch Homework
        onValue(ref(database, `${rootPath}/homework`), (s) => {
          const data = s.val() || {}
          setHomework(Object.keys(data).map(k => ({ ...data[k], id: k })).filter(h => h.targetClass === foundStudent.course))
        })

        // Fetch Submissions
        onValue(ref(database, `${rootPath}/submissions/${foundStudent.id}`), (s) => {
          setSubmissions(s.val() || {})
        })
      }
      setIsLoading(false)
    })
  }, [database, user])

  const stats = useMemo(() => {
    const total = assignments.length + homework.length
    const pending = total - Object.keys(submissions).length
    return { total, pending }
  }, [assignments, homework, submissions])

  const handleSubmission = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!database || !adminUid || !student || !selectedTask) return
    setIsUploading(true)

    const formData = new FormData(e.currentTarget)
    const submissionData = {
      studentId: student.id,
      studentName: student.studentName,
      taskId: selectedTask.id,
      notes: formData.get("notes") as string,
      fileUrl: formData.get("fileUrl") as string, // In a real app, this would handle actual file upload to storage
      submittedAt: new Date().toISOString(),
      status: "Submitted"
    }

    try {
      await set(ref(database, `Institutes/${adminUid}/submissions/${student.id}/${selectedTask.id}`), submissionData)
      toast({ title: "Submitted Successfully", description: "Your academic response has been recorded." })
      setIsSubmitModalOpen(false)
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to submit." })
    } finally {
      setIsUploading(false)
    }
  }

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 tracking-[0.3em] animate-pulse">Accessing Academic Registry...</div>

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto">
      
      {/* 📊 DASHBOARD SUMMARY SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8">
          <Card className="border-none shadow-xl rounded-[40px] bg-white overflow-hidden p-10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-10">
              <div className="flex items-center gap-8">
                <div className="w-20 h-20 rounded-[28px] bg-blue-50 flex items-center justify-center text-[#1e3a8a] shadow-inner">
                  <ClipboardList className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-black tracking-tight">Academic Tasks</h2>
                  <div className="flex gap-3">
                    <Badge variant="outline" className="rounded-lg border-zinc-100 text-black font-bold text-[10px]">Pending: {stats.pending}</Badge>
                    <Badge className="bg-blue-50 text-[#1e3a8a] border-none font-bold text-[10px]">Active Session</Badge>
                  </div>
                </div>
              </div>
              <div className="text-center md:text-right space-y-1">
                <p className="text-[10px] font-black text-black tracking-widest">Enrollment</p>
                <p className="text-lg font-black text-[#1e3a8a]">{student?.course} - {student?.section}</p>
              </div>
            </div>
          </Card>

          {/* 📝 TABS FOR ASSIGNMENTS AND HOMEWORK */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-white p-2 rounded-[24px] h-auto flex-wrap justify-start gap-2 shadow-sm border border-zinc-100">
              <DashboardTabTrigger value="assignments" label="Main Assignments" count={assignments.length} />
              <DashboardTabTrigger value="homework" label="Daily Homework" count={homework.length} />
            </TabsList>

            <div className="mt-8">
              <TabsContent value="assignments" className="mt-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {assignments.map((item) => (
                    <TaskCard 
                      key={item.id} 
                      item={item} 
                      submission={submissions[item.id]} 
                      onView={() => { setSelectedClass(item); setIsDetailModalOpen(true); }}
                      onSubmit={() => { setSelectedClass(item); setIsSubmitModalOpen(true); }}
                    />
                  ))}
                  {assignments.length === 0 && <EmptyState message="No assignments published for your class." />}
                </div>
              </TabsContent>

              <TabsContent value="homework" className="mt-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {homework.map((item) => (
                    <TaskCard 
                      key={item.id} 
                      item={item} 
                      submission={submissions[item.id]} 
                      onView={() => { setSelectedClass(item); setIsDetailModalOpen(true); }}
                      onSubmit={() => { setSelectedClass(item); setIsSubmitModalOpen(true); }}
                    />
                  ))}
                  {homework.length === 0 && <EmptyState message="No homework assigned today." />}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* 🕒 RIGHT COLUMN: STATS & NOTICES */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="border-none shadow-sm rounded-[40px] bg-[#1e3a8a] p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <Award className="w-6 h-6" />
                </div>
                <h4 className="text-[14px] font-black tracking-widest">Task Analytics</h4>
              </div>
              <div className="space-y-4">
                <AnalyticRow label="Submission Rate" value={`${Math.round(((stats.total - stats.pending) / stats.total) * 100 || 0)}%`} />
                <AnalyticRow label="Avg. Score" value="84%" />
                <AnalyticRow label="Late Submissions" value="0" />
              </div>
            </div>
          </Card>

          <Card className="border-none shadow-sm rounded-[40px] bg-white p-8 space-y-6">
            <h4 className="text-[14px] font-black text-black tracking-[0.2em]">Academic Instructions</h4>
            <div className="space-y-4">
              <PolicyItem text="Always upload PDF for assignments." />
              <PolicyItem text="Late submissions carry a 10% penalty." />
              <PolicyItem text="Plagiarism is strictly prohibited." />
            </div>
          </Card>
        </div>
      </div>

      {/* 📤 SUBMISSION MODAL */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="max-w-xl p-0 border-none rounded-[40px] overflow-hidden bg-white shadow-2xl">
          <div className="bg-[#1e3a8a] p-10 text-white relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
            
            <div className="space-y-4">
              <Badge className="bg-white/10 text-white border-none text-[9px] font-black tracking-widest px-3">Assignment Submission</Badge>
              <DialogTitle className="text-2xl font-black tracking-tight leading-tight">{selectedTask?.title}</DialogTitle>
              <p className="text-[14px] text-blue-200 font-medium">Please provide your solution and any additional remarks.</p>
            </div>
          </div>
          <form onSubmit={handleSubmission} className="p-10 space-y-8">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-black tracking-widest ml-1">Solution File Link (Cloud Storage)</Label>
                <Input name="fileUrl" placeholder="https://drive.google.com/..." required className="h-12 rounded-2xl border-zinc-100 bg-zinc-50/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-black tracking-widest ml-1">Submission Remarks</Label>
                <Textarea name="notes" placeholder="Any notes for the teacher..." className="rounded-2xl border-zinc-100 bg-zinc-50/50 min-h-[100px]" />
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={isUploading}
              className="w-full h-14 bg-[#1e3a8a] hover:bg-[#162e6a] text-white rounded-2xl font-black text-[14px] tracking-[0.2em] shadow-xl shadow-blue-900/20 active:scale-95 transition-all border-none"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />} Submit Task
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* 🔍 DETAIL MODAL */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl p-0 border-none rounded-[40px] overflow-hidden bg-white shadow-2xl">
          <div className="bg-zinc-900 p-10 text-white relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
            
            <div className="space-y-4">
              <Badge className="bg-primary/20 text-primary border-none text-[9px] font-black tracking-widest px-3">Task Overview</Badge>
              <DialogTitle className="text-2xl font-black tracking-tight leading-tight">{selectedTask?.title}</DialogTitle>
              <div className="flex items-center gap-4 text-[10px] font-black text-black tracking-widest">
                <span className="flex items-center gap-1.5"><User className="w-3 h-3" /> Teacher: {selectedTask?.teacherName || 'Admin'}</span>
                <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                <span className="flex items-center gap-1.5"><Award className="w-3 h-3" /> Max Marks: {selectedTask?.marks || 100}</span>
              </div>
            </div>
          </div>
          <ScrollArea className="max-h-[60vh]">
            <div className="p-10 space-y-10">
              <div className="space-y-4">
                <h5 className="text-[10px] font-black text-black tracking-[0.2em] border-b border-zinc-50 pb-2">Full Description</h5>
                <p className="text-[14px] text-black leading-relaxed font-medium">
                  {selectedTask?.description || 'No detailed instructions provided for this task.'}
                </p>
              </div>

              {submissions[selectedTask?.id] && (
                <div className="space-y-4 bg-emerald-50/50 p-8 rounded-[32px] border border-emerald-100">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <h5 className="text-[14px] font-black text-emerald-700 tracking-tight">Your Submission</h5>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black text-emerald-600/60">
                      <span>Submitted on</span>
                      <span>{format(new Date(submissions[selectedTask.id].submittedAt), "PPP p")}</span>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-emerald-100 text-[14px] font-bold text-black truncate">
                      {submissions[selectedTask.id].fileUrl}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

    </main>
  )
}

function TaskCard({ item, submission, onView, onSubmit }: any) {
  const isExpired = item.dueDate ? isAfter(new Date(), parseISO(item.dueDate)) : false
  const status = submission ? 'Submitted' : isExpired ? 'Late' : 'Pending'

  return (
    <Card className="border-none shadow-sm rounded-[32px] bg-white p-8 group hover:shadow-xl transition-all duration-500 relative">
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-2",
        status === 'Submitted' ? "bg-emerald-500" : status === 'Late' ? "bg-rose-500" : "bg-[#1e3a8a]"
      )} />
      
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <Badge className={cn(
              "rounded-lg px-2.5 py-0.5 text-[9px] font-black  border-none shadow-none mb-2",
              status === 'Submitted' ? "bg-emerald-50 text-emerald-600" : status === 'Late' ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-[#1e3a8a]"
            )}>
              {status}
            </Badge>
            <h4 className="text-lg font-black text-black tracking-tight group-hover:text-primary transition-colors">{item.title}</h4>
            <p className="text-[10px] font-bold text-black tracking-widest">{item.subject} • {item.teacherName || 'Admin'}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-300 shadow-inner group-hover:bg-blue-50 group-hover:text-primary transition-all">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Meta icon={<Calendar className="w-3 h-3" />} label="Assigned" value={item.assignedDate || '-'} />
          <Meta icon={<Clock className="w-3 h-3" />} label="Due Date" value={item.dueDate || '-'} />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onView} className="flex-1 h-11 rounded-2xl bg-zinc-50 text-black font-black text-[10px] tracking-widest gap-2 hover:bg-zinc-100 transition-all">
            <Eye className="w-3.5 h-3.5" /> View Details
          </Button>
          {!submission && !isExpired && (
            <Button onClick={onSubmit} className="flex-1 h-11 rounded-2xl bg-primary text-white font-black text-[10px] tracking-widest shadow-lg shadow-teal-900/20 active:scale-95 border-none transition-all">
              <FileUp className="w-3.5 h-3.5" /> Submit Now
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

function Meta({ icon, label, value }: any) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-300">
        {icon} <span>{label}</span>
      </div>
      <p className="text-[14px] font-bold text-black">{value}</p>
    </div>
  )
}

function DashboardTabTrigger({ value, label, count, icon }: any) {
  return (
    <TabsTrigger 
      value={value} 
      className="h-11 px-6 rounded-xl data-[state=active]:bg-[#1e3a8a] data-[state=active]:text-white text-black font-bold text-[10px] tracking-widest transition-all border border-transparent data-[state=active]:shadow-lg"
    >
      <span className="flex items-center gap-2">{icon} {label} ({count})</span>
    </TabsTrigger>
  )
}

function AnalyticRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
      <span className="text-[10px] font-bold text-white/50 tracking-widest">{label}</span>
      <span className="text-[14px] font-black text-white">{value}</span>
    </div>
  )
}

function PolicyItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1.5 w-1 h-1 rounded-full bg-primary" />
      <p className="text-[11px] font-medium text-black leading-relaxed">{text}</p>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="col-span-full py-20 text-center space-y-4 bg-zinc-50/50 rounded-[40px] border-2 border-dashed border-zinc-100">
      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto text-zinc-200 shadow-sm">
        <ClipboardList className="w-8 h-8" />
      </div>
      <p className="text-[14px] font-bold text-black tracking-widest">{message}</p>
    </div>
  )
}

function toast({ title, description, variant }: any) {
  // Access global toast hook context here if needed, 
  // but standard usage is to use useToast() in the component.
}
