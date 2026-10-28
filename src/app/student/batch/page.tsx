
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Layers,
  Users,
  UserCheck,
  Info,
  User,
  ExternalLink,
  Check,
  Briefcase,
  ShieldCheck,
  MapPin,
  Clock,
  Timer,
  MessageSquare,
  Send,
  Loader2,
  Video
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off, push } from "firebase/database"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { useResolvedId } from "@/hooks/use-resolved-id"

export default function StudentBatchDetailsPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const { resolvedId, staffId: studentId, isLoading: isIdLoading } = useResolvedId()

  const [student, setStudent] = useState<any>(null)
  const [batches, setBatches] = useState<any[]>([])
  const [liveClasses, setLiveClasses] = useState<any[]>([])
  const [selectedBatchIndex, setSelectedBatchIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("class-info")

  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [feedbackText, setFeedbackText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!database || !resolvedId || !studentId) return

    const rootPath = `Institutes/${resolvedId}`
    const studentRef = ref(database, `${rootPath}/admissions/${studentId}`)
    const batchesRef = ref(database, `${rootPath}/batches`)
    const liveClassesRef = ref(database, `${rootPath}/live-classes`)

    let currentStudentData: any = null
    let currentBatchesData: any = null
    let currentLiveClasses: any = []

    let isStudentLoaded = false
    let isBatchesLoaded = false
    let isLiveLoaded = false

    const updateDashboard = () => {
      if (!isStudentLoaded || !isBatchesLoaded || !isLiveLoaded) return
      
      if (!currentStudentData) {
        setIsLoading(false)
        return
      }
      setStudent(currentStudentData)

      const allBatches = currentBatchesData || {}
      
      const filteredBatches = Object.keys(allBatches)
        .filter(k => 
          allBatches[k].batchName === currentStudentData.batch ||
          (allBatches[k].assignedStudents && allBatches[k].assignedStudents[studentId])
        )
        .map(k => ({ ...allBatches[k], id: k }))

      setBatches(filteredBatches)
      setLiveClasses(currentLiveClasses) // Keep all for per-batch check

      setIsLoading(false)
    }

    onValue(studentRef, (snapshot) => {
      currentStudentData = snapshot.val()
      isStudentLoaded = true
      updateDashboard()
    })

    onValue(batchesRef, (snapshot) => {
      currentBatchesData = snapshot.val()
      isBatchesLoaded = true
      updateDashboard()
    })

    onValue(liveClassesRef, (snapshot) => {
      const data = snapshot.val() || {}
      currentLiveClasses = Object.keys(data).map(k => ({ ...data[k], id: k }))
      isLiveLoaded = true
      updateDashboard()
    })

    return () => {
      off(studentRef)
      off(batchesRef)
      off(liveClassesRef)
    }
  }, [database, resolvedId, studentId])

  const currentBatch = batches[selectedBatchIndex >= batches.length ? 0 : selectedBatchIndex] || null
  const facultyList = currentBatch?.faculty ? [{ id: 'faculty-1', name: currentBatch.faculty, role: 'Faculty Member' }] : []

  const handleSubmitFeedback = async () => {
    if (!currentBatch || !feedbackText.trim() || !resolvedId || !database) return
    setIsSubmitting(true)
    try {
      const feedbackRef = ref(database, `Institutes/${resolvedId}/batches/${currentBatch.id}/feedback`)
      await push(feedbackRef, {
        date: new Date().toISOString().split('T')[0],
        description: feedbackText.trim(),
        studentId: studentId,
        studentName: student.studentName || 'Student',
        timestamp: Date.now()
      })
      toast({ title: "Feedback Submitted Successfully" })
      setIsFeedbackModalOpen(false)
      setFeedbackText("")
    } catch (err) {
      toast({ variant: "destructive", title: "Submission Failed" })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isIdLoading || isLoading) return <div className="p-20 text-center font-black text-zinc-300 tracking-widest animate-pulse">Syncing Academic Registry...</div>

  if (!student || batches.length === 0) return (
    <div className="flex flex-col items-center justify-center p-20 text-center space-y-6">
      <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 shadow-inner">
        <Info className="w-10 h-10" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-black tracking-tight">No Batch Assigned</h2>
        <p className="text-[14px] text-black max-w-sm mx-auto font-medium leading-relaxed">
          You are not currently linked to an active academic batch. Please contact the administration office.
        </p>
      </div>
    </div>
  )

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-32">

      {/* 🟢 NEW BATCH SELECTOR HEADER */}
      <div className="space-y-4">
        <div className="flex items-center gap-4 px-2">
          <div className="w-1.5 h-8 bg-primary rounded-full" />
          <h2 className="text-2xl font-black text-black tracking-tighter">My Enrolled Batches</h2>
        </div>

        <div className="flex flex-wrap gap-4 px-2">
          {batches.map((b, idx) => {
            const isActive = selectedBatchIndex === idx;
            const liveClass = liveClasses.find(c => {
              const matchesBatch = (c.targetBatch || "").trim().toLowerCase() === (b.batchName || "").trim().toLowerCase();
              const matchesBranch = !c.branchId || c.branchId === "null" || c.branchId === student.branchId;
              return matchesBatch && matchesBranch;
            });

            return (
              <div
                key={b.id}
                onClick={() => setSelectedBatchIndex(idx)}
                className={cn(
                  "px-6 py-4 rounded-[24px] border transition-all flex items-center gap-4 group cursor-pointer relative min-w-[200px]",
                  isActive
                    ? "bg-white border-primary shadow-xl shadow-blue-900/10 ring-1 ring-primary/20 scale-[1.02]"
                    : "bg-zinc-50 border-transparent text-black hover:bg-white hover:border-zinc-200"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
                  isActive ? "bg-primary text-white" : "bg-zinc-100 text-black group-hover:bg-zinc-200"
                )}>
                  <Layers className="w-5 h-5" />
                </div>
                <div className="text-left flex-1 pr-6">
                  <p className="text-[10px] font-black tracking-widest leading-none mb-1 opacity-60">Batch {idx + 1}</p>
                  <h4 className={cn("text-[14px] font-black  truncate max-w-[120px]", isActive ? "text-black" : "text-black")}>{b.batchName}</h4>
                </div>
                
                {liveClass && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (liveClass.meetingUrl) window.open(liveClass.meetingUrl, '_blank');
                    }}
                    size="icon"
                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg border-2 border-white animate-pulse"
                  >
                    <Video className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {currentBatch && (
        <div className="animate-in slide-in-from-bottom-2 duration-500 space-y-10">
          {/* 1️⃣ PAGE HEADER – CLASS OVERVIEW */}
          <Card className="border-none shadow-xl rounded-[40px] bg-white overflow-hidden">
            <div className="h-2 w-full bg-[#1e3a8a]" />
            <CardContent className="p-10 flex flex-col lg:flex-row justify-between items-center gap-10">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-24 h-24 rounded-[32px] bg-blue-50 flex items-center justify-center text-[#1e3a8a] shadow-inner">
                  <Layers className="w-12 h-12" />
                </div>
                <div className="text-center md:text-left space-y-2">
                  <h2 className="text-3xl font-black text-black tracking-tight leading-none">{currentBatch.courseName || student.course}</h2>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <Badge className="bg-blue-50 text-[#1e3a8a] border-none font-bold text-[10px] px-3">Section {currentBatch.section || student.section || 'A'}</Badge>
                    <Badge className="bg-emerald-50 text-emerald-600 border-none font-bold text-[10px] px-3">{student.session || '2024-25'}</Badge>
                    <span className="text-[11px] font-bold text-black tracking-widest">Roll No: {student.rollNo || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3 pr-4 border-l border-zinc-100 pl-10 hidden xl:flex">
                <div className="flex items-center gap-4">
                  <div className="text-right space-y-1">
                    <p className="text-[10px] font-black text-black tracking-widest">Current Batch</p>
                    <p className="text-xl font-black text-black tracking-tight">{currentBatch.batchName}</p>
                    <p className="text-[11px] text-primary font-bold">Code: {currentBatch.batchCode}</p>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-primary shadow-sm">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 w-full">
                  {liveClasses.find(c => (c.targetBatch || "").trim().toLowerCase() === (currentBatch.batchName || "").trim().toLowerCase()) && (
                    <Button 
                      onClick={() => {
                        const active = liveClasses.find(c => (c.targetBatch || "").trim().toLowerCase() === (currentBatch.batchName || "").trim().toLowerCase());
                        if (active?.meetingUrl) window.open(active.meetingUrl, '_blank')
                        else toast({ title: "No Class Active", description: "Currently no live class is streaming for this batch." })
                      }}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-[10px] tracking-widest px-6 h-10 shadow-lg active:scale-95 animate-pulse"
                    >
                      <Video className="w-4 h-4 mr-2" /> Join Live Class
                    </Button>
                  )}
                  <Button onClick={() => setIsFeedbackModalOpen(true)} className="bg-zinc-50 hover:bg-zinc-100 text-black border border-zinc-100 rounded-xl font-bold text-[10px] tracking-widest px-6 h-10 shadow-sm w-full"><MessageSquare className="w-4 h-4 mr-2" /> Share Feedback</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2️⃣ QUICK INFO SUMMARY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SummaryCard icon={<Users className="text-emerald-500" />} title="Class Stream" value={student.stream || 'Academic'} />
            <SummaryCard icon={<UserCheck className="text-indigo-500" />} title="Faculty Count" value={`${facultyList.length} Teachers`} />
            <SummaryCard icon={<Clock className="text-rose-500" />} title="Joining Date" value={student.admissionDate} />
          </div>

          {/* 3️⃣ TABS NAVIGATION */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-white p-2 rounded-[24px] h-auto flex-wrap justify-start gap-2 shadow-sm border border-zinc-100">
              <DashboardTabTrigger value="class-info" label="Batch Info" icon={<Info className="w-4 h-4" />} />
              <DashboardTabTrigger value="faculty" label="Assigned Faculty" icon={<User className="w-4 h-4" />} />
            </TabsList>

            <div className="mt-8">
              {/* 4️⃣ CLASS INFORMATION TAB */}
              <TabsContent value="class-info" className="mt-0 animate-in fade-in duration-500">
                <Card className="border-none shadow-sm rounded-[32px] bg-white p-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                      <SectionHeader title="Batch Timeline" />
                      <div className="space-y-4">
                        <DetailRow label="Batch Name" value={currentBatch.batchName} />
                        <DetailRow label="Batch Type" value={currentBatch.batchType || '-'} />
                        <DetailRow label="Batch Code" value={currentBatch.batchCode || '-'} />
                        <DetailRow label="Start Date" value={currentBatch.startDate || '-'} />
                        <DetailRow label="End Date" value={currentBatch.endDate || 'Ongoing'} />
                        <DetailRow label="Current Status" value={currentBatch.status || 'Active'} />
                      </div>
                    </div>
                    <div className="space-y-8">
                      <SectionHeader title="Academic Mapping" />
                      <div className="space-y-4">
                        <DetailRow label="Primary Course" value={currentBatch.courseName} />
                        <DetailRow label="Instruction Language" value="English" />
                        <DetailRow label="Session" value={student.session} />
                        <DetailRow label="Campus Location" value="Main Academic Block" />
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* 5️⃣ FACULTY TAB */}
              <TabsContent value="faculty" className="mt-0 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {facultyList.length > 0 ? facultyList.map((t, i) => (
                    <Card key={i} className="border-none shadow-sm rounded-[32px] bg-white p-8 group hover:shadow-xl transition-all duration-500">
                      <div className="flex flex-col items-center text-center space-y-6">
                        <div className="relative">
                          <Avatar className="h-24 w-24 rounded-[28px] border-4 border-zinc-50 shadow-lg group-hover:scale-105 transition-transform duration-500">
                            <AvatarFallback className="bg-primary/5 text-primary font-black text-2xl">{t.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-lg shadow-md border-2 border-white"><Check className="w-3 h-3 stroke-[4px]" /></div>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-lg font-black text-black tracking-tight">{t.name}</h4>
                          <p className="text-primary font-black text-[10px] tracking-[0.2em]">{t.role || 'Faculty Member'}</p>
                        </div>
                        <div className="w-full pt-6 border-t border-zinc-50">
                          {/* <p className="text-[9px] font-bold text-black tracking-widest mb-1">Affiliation</p>
                          <p className="text-[14px] font-black text-black">Academic Department</p> */}
                        </div>
                        <Badge className="bg-zinc-50 text-black border-none px-4 py-1 text-[9px] font-black">Verified Faculty</Badge>
                      </div>
                    </Card>
                  )) : (
                    <div className="col-span-full py-20 text-center space-y-4 bg-zinc-50/50 rounded-[40px] border-2 border-dashed border-zinc-100">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto text-zinc-200">
                        <Briefcase className="w-8 h-8" />
                      </div>
                      <p className="text-[14px] font-bold text-black tracking-widest">No faculty members currently assigned to this batch</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      )}

      {/* Feedback Modal */}
      <Dialog open={isFeedbackModalOpen} onOpenChange={setIsFeedbackModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md p-0 border border-zinc-200 rounded-[32px] overflow-hidden bg-white shadow-2xl flex flex-col">
          <div className="bg-white px-8 py-6 border-b border-zinc-100">
            <DialogTitle className="text-lg font-black tracking-tight">Batch Feedback</DialogTitle>
            <p className="text-[10px] text-black font-bold tracking-widest mt-0.5">Share your experience for {currentBatch?.batchName}</p>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[14px] font-bold text-black ml-1">Your Feedback</Label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="How was the class? Did you understand the topic?..."
                className="w-full h-40 p-4 rounded-2xl bg-zinc-50 border-none text-[14px] font-medium text-black placeholder:text-zinc-300 focus:ring-2 focus:ring-primary/20 transition-all resize-none outline-none"
              />
            </div>
            <div className="pt-4 border-t border-zinc-100">
              <Button
                onClick={handleSubmitFeedback}
                disabled={isSubmitting || !feedbackText.trim()}
                className="w-full h-12 bg-primary hover:opacity-90 text-white rounded-xl font-bold text-[14px] tracking-widest shadow-lg border-none transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Submit Feedback
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function SummaryCard({ icon, title, value }: any) {
  return (
    <Card className="border-none shadow-sm rounded-[24px] bg-white p-6 group hover:shadow-md transition-all">
      <div className="flex items-center gap-5">
        <div className="w-12 h-12 rounded-xl bg-zinc-50 flex items-center justify-center transition-colors group-hover:bg-white group-hover:shadow-inner">
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-black text-black tracking-widest mb-0.5">{title}</p>
          <h4 className="text-xl font-black text-black tracking-tight">{value}</h4>
        </div>
      </div>
    </Card>
  )
}

function DashboardTabTrigger({ value, label, icon }: any) {
  return (
    <TabsTrigger
      value={value}
      className="h-11 px-6 rounded-xl data-[state=active]:bg-[#1e3a8a] data-[state=active]:text-white text-black font-bold text-[10px] tracking-widest transition-all border border-transparent data-[state=active]:shadow-lg"
    >
      <span className="flex items-center gap-2">{icon} {label}</span>
    </TabsTrigger>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-[14px] font-black text-primary tracking-[0.2em] border-b border-primary/10 pb-3">
      {title}
    </h3>
  )
}

function DetailRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-50 group">
      <span className="text-[11px] font-bold text-black tracking-widest group-hover:text-black transition-colors">{label}</span>
      <span className="text-[14px] font-black text-black">{value || '-'}</span>
    </div>
  )
}