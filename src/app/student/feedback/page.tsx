"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  MessageSquare,
  Send,
  History,
  Clock,
  CheckCircle2,
  Star,
  Loader2
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, off } from "firebase/database"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { toast } from "@/hooks/use-toast"
import { useResolvedId } from "@/hooks/use-resolved-id"

export default function StudentFeedbackPage() {
  const { database } = useFirebase()
  const { user } = useUser()

  const { resolvedId: adminUid, staffId: studentId, isLoading: idLoading } = useResolvedId()

  const [student, setStudent] = useState<any>(null)
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch student and listen to their feedback
  useEffect(() => {
    if (!database || !adminUid || !studentId) {
      if (!idLoading) setIsLoading(false)
      return
    }

    // Fetch Student Profile
    const studentRef = ref(database, `Institutes/${adminUid}/admissions/${studentId}`)
    const unsubStudent = onValue(studentRef, (snapshot) => {
      if (snapshot.exists()) {
        const stu = snapshot.val()
        setStudent({ ...stu, id: studentId })
      }
    })

    // Listen only to this student's feedback
    const feedbackRef = ref(database, `Institutes/${adminUid}/concerns`)

    const feedbackUnsub = onValue(feedbackRef, (fSnap) => {
      const data = fSnap.val() || {}
      const myFeedbacks = Object.keys(data)
        .map(k => ({ ...data[k], id: k }))
        .filter(f => f.studentId === studentId && f.category === "Feedback")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      setFeedbacks(myFeedbacks)
      setIsLoading(false)
    })

    return () => {
      unsubStudent()
      feedbackUnsub()
    }
  }, [database, adminUid, studentId, idLoading])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!database || !adminUid || !student) return

    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    const feedbackData = {
      studentId: student.id,
      studentName: student.studentName,
      type: formData.get("type") as string,
      category: "Feedback",
      subject: formData.get("subject") as string,
      message: formData.get("message") as string,
      rating: formData.get("rating") as string,
      status: "Pending",
      createdAt: new Date().toISOString(),
      updatedAt: Date.now(),
      isAnonymous: false,
    }

    try {
      await push(ref(database, `Institutes/${adminUid}/concerns`), feedbackData)

      toast({
        title: "Complaint Submitted",
        description: "Your complaint has been sent to the administration.",
      })

        ; (e.target as HTMLFormElement).reset()
    } catch (err) {
      toast({ variant: "destructive", title: "Submission Failed" })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading || idLoading) {
    return (
      <div className="p-20 text-center font-black text-zinc-300 animate-pulse">
        Opening Communication Channel...
      </div>
    )
  }

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-32">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Form Side */}
        <div className="lg:col-span-5 space-y-8">
          <Card className="border-none shadow-xl rounded-[40px] bg-white overflow-hidden p-10">
            <div className="space-y-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-[24px] bg-blue-50 flex items-center justify-center text-primary shadow-inner">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-black tracking-tight">Raise Complaint</h2>
                  <p className="text-[10px] font-bold text-black tracking-widest">Grievance & Suggestion Portal</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-black tracking-widest ml-1">Complaint Type</Label>
                  <Select name="type" defaultValue="Suggestion" required>
                    <SelectTrigger className="h-12 rounded-2xl border-zinc-100 bg-zinc-50/50">
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Suggestion">General Suggestion</SelectItem>
                      <SelectItem value="Grievance">Complaint / Grievance</SelectItem>
                      <SelectItem value="Academic">Academic Issue</SelectItem>
                      <SelectItem value="Facilities">Facilities Issue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-black tracking-widest ml-1">Subject</Label>
                  <Input name="subject" placeholder="Brief subject of your complaint..." required className="h-12 rounded-2xl border-zinc-100 bg-zinc-50/50" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-black tracking-widest ml-1">Experience Rating</Label>
                  <Select name="rating" defaultValue="5">
                    <SelectTrigger className="h-12 rounded-2xl border-zinc-100 bg-zinc-50/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">Excellent (5 Stars)</SelectItem>
                      <SelectItem value="4">Very Good (4 Stars)</SelectItem>
                      <SelectItem value="3">Average (3 Stars)</SelectItem>
                      <SelectItem value="2">Poor (2 Stars)</SelectItem>
                      <SelectItem value="1">Critical Issue (1 Star)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-black tracking-widest ml-1">Detailed Message</Label>
                  <Textarea name="message" placeholder="Describe your complaint in detail..." required className="rounded-2xl border-zinc-100 bg-zinc-50/50 min-h-[150px]" />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-14 bg-zinc-900 hover:bg-black text-white rounded-2xl font-black text-[14px] tracking-[0.2em] shadow-xl transition-all active:scale-95 border-none gap-3"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send to Administration
                </Button>
              </form>
            </div>
          </Card>
        </div>

        {/* Previous Complaints */}
        <div className="lg:col-span-7 space-y-8">
          <div className="flex items-center gap-3 px-4">
            <History className="w-4 h-4 text-black" />
            <h3 className="text-[14px] font-black text-black tracking-[0.2em]">My Previous Complaints</h3>
          </div>

          <ScrollArea className="h-[750px]">
            <div className="space-y-6">
              {feedbacks.map((f) => (
                <Card key={f.id} className="border-none shadow-sm rounded-[32px] bg-white p-8 group hover:shadow-lg transition-all duration-500 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-zinc-50 group-hover:bg-primary transition-colors" />

                  <div className="space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className="bg-zinc-50 text-black border-none text-[9px] font-black px-3">{f.type}</Badge>
                          <Badge className={cn(
                            "rounded-lg px-2.5 py-0.5 text-[9px] font-black border-none",
                            (f.status === 'Resolved' || f.status === 'Replied') ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                          )}>
                            {f.status || "Pending"}
                          </Badge>
                        </div>
                        <h4 className="text-lg font-black text-black tracking-tight">{f.subject}</h4>
                        <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-400 tracking-widest">
                          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {format(new Date(f.createdAt), "PPp")}</span>
                          <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-400" /> {f.rating}/5</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[14px] text-black leading-relaxed font-medium bg-zinc-50 p-6 rounded-2xl italic border border-zinc-100/50">
                      "{f.message}"
                    </p>

                    {(f.adminRemark || f.adminReply) && (
                      <div className="pt-6 border-t border-zinc-50 flex items-start gap-4">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-black tracking-widest">Response from Administration</p>
                          <p className="text-[14px] font-bold text-emerald-700">{f.adminRemark || f.adminReply}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}

              {feedbacks.length === 0 && (
                <div className="py-32 text-center space-y-6 bg-white rounded-[40px] border-2 border-dashed border-zinc-100">
                  <div className="w-20 h-20 bg-zinc-50 rounded-[28px] flex items-center justify-center mx-auto text-zinc-200 shadow-inner">
                    <MessageSquare className="w-10 h-10" />
                  </div>
                  <p className="text-[14px] font-bold text-black tracking-widest">No complaints submitted yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </main>
  )

}