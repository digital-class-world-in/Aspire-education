
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  MessageSquareShare, 
  Send, 
  History, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  User,
  Plus,
  X,
  Loader2,
  ShieldAlert,
  Search,
  MessageSquare
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, push, off, get } from "firebase/database"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { useResolvedId } from "@/hooks/use-resolved-id"

export default function StudentConcernsPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const { toast } = useToast()
  const { resolvedId: adminUid, staffId: studentId, isLoading: idLoading } = useResolvedId()
  
  const [student, setStudent] = useState<any>(null)
  const [concerns, setConcerns] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (!database || !adminUid || !studentId) {
      if (!idLoading) setIsLoading(false)
      return
    }
    
    // Fetch Student Profile
    onValue(ref(database, `Institutes/${adminUid}/admissions/${studentId}`), (snapshot) => {
      if (snapshot.exists()) {
        setStudent({ ...snapshot.val(), id: studentId })
      }
    })

    // Fetch Concerns Ledger
    const dbRef = ref(database, `Institutes/${adminUid}/concerns`)
    const unsubConcerns = onValue(dbRef, (s) => {
      const data = s.val() || {}
      setConcerns(Object.keys(data)
        .map(k => ({ ...data[k], id: k }))
        .filter(f => f.studentId === studentId)
        .reverse()
      )
      setIsLoading(false)
    })

    return () => {
      off(dbRef)
    }
  }, [database, adminUid, studentId, idLoading])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!database || !adminUid || !student || isSubmitting) return

    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const isAnonymous = formData.get("isAnonymous") === "on"
    
    const concernData = {
      studentId: student.id,
      studentName: student.studentName,
      isAnonymous,
      category: formData.get("category") as string,
      subject: formData.get("subject") as string,
      message: formData.get("message") as string,
      status: "Pending",
      adminReply: "",
      createdAt: new Date().toISOString(),
      updatedAt: Date.now()
    }

    try {
      await push(ref(database, `Institutes/${adminUid}/concerns`), concernData)
      toast({ title: "Concern Dispatched", description: "Your message has been sent to the administration node." })
      ;(e.target as HTMLFormElement).reset()
    } catch (e) {
      toast({ variant: "destructive", title: "Sync Failed" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const filtered = useMemo(() => {
    if (!searchTerm) return concerns
    const lower = searchTerm.toLowerCase()
    return concerns.filter(c => 
      c.subject?.toLowerCase().includes(lower) || 
      c.message?.toLowerCase().includes(lower) ||
      c.category?.toLowerCase().includes(lower)
    )
  }, [concerns, searchTerm])

  if (isLoading || idLoading) return <div className="p-20 text-center font-black text-zinc-300 animate-pulse">Syncing Concern Nodes...</div>

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-32 font-public-sans text-black">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* 📝 SUBMISSION COLUMN */}
        <div className="lg:col-span-5 space-y-8">
          <Card className="border-none shadow-xl rounded-[40px] bg-white overflow-hidden p-10">
            <div className="space-y-10">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-[24px] bg-indigo-50 flex items-center justify-center text-primary shadow-inner">
                  <MessageSquareShare className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-black tracking-tight">Concerns Hub</h2>
                  <p className="text-[10px] font-bold text-black tracking-widest">Submit Institutional Queries</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-black tracking-widest ml-1">Concern Category</Label>
                  <Select name="category" defaultValue="Academic" required>
                    <SelectTrigger className="h-12 rounded-2xl border-zinc-100 bg-zinc-50/50 font-bold">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-zinc-100 shadow-xl">
                      <SelectItem value="Academic" className="font-bold">Academic Quality</SelectItem>
                      <SelectItem value="Infrastructure" className="font-bold">Campus Facilities</SelectItem>
                      <SelectItem value="Fees" className="font-bold">Financial Queries</SelectItem>
                      <SelectItem value="General" className="font-bold">General Feedback</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-black tracking-widest ml-1">Subject Header</Label>
                  <Input name="subject" placeholder="e.g. Lab equipment inquiry" required className="h-12 rounded-2xl border-zinc-100 bg-zinc-50/50 font-bold" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-black tracking-widest ml-1">Detailed Concern</Label>
                  <Textarea name="message" placeholder="Describe your concern in detail..." required className="rounded-2xl border-zinc-100 bg-zinc-50/50 min-h-[150px] font-medium" />
                </div>

                <div className="flex items-center justify-between p-5 bg-zinc-50 rounded-2xl border border-zinc-100 transition-all hover:bg-white hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 text-indigo-500" />
                    <div className="space-y-0.5">
                      <p className="text-[14px] font-black text-black">Post Anonymously</p>
                      <p className="text-[9px] font-bold text-black">Hide identity from Admin</p>
                    </div>
                  </div>
                  <Checkbox name="isAnonymous" className="data-[state=checked]:bg-indigo-500 rounded-md" />
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full h-16 bg-zinc-900 hover:bg-black text-white rounded-[24px] font-black text-[14px] tracking-[0.2em] shadow-xl transition-all active:scale-95 border-none gap-3"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Dispatch Concern
                </Button>
              </form>
            </div>
          </Card>
        </div>

        {/* 📜 LEDGER COLUMN */}
        <div className="lg:col-span-7 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4">
            <div className="flex items-center gap-3">
              <History className="w-4 h-4 text-black" />
              <h3 className="text-[14px] font-black text-black tracking-[0.2em]">My Concerns Ledger</h3>
            </div>
            <div className="relative w-full md:w-64 group">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-300" />
              <Input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search ledger..." 
                className="pl-10 h-9 rounded-xl border-zinc-100 bg-white text-[14px] font-bold" 
              />
            </div>
          </div>

          <ScrollArea className="h-[750px] pr-4">
            <div className="space-y-6">
              {filtered.map((c) => (
                <Card key={c.id} className="border-none shadow-sm rounded-[32px] bg-white p-8 group hover:shadow-lg transition-all duration-500 relative overflow-hidden">
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1.5 transition-colors",
                    c.status === 'Replied' ? "bg-emerald-500" : "bg-indigo-500"
                  )} />
                  
                  <div className="space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-zinc-50 text-black border-none text-[9px] font-black px-3">{c.category}</Badge>
                          <Badge className={cn(
                            "rounded-lg px-2.5 py-0.5 text-[9px] font-black  border-none",
                            c.status === 'Replied' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                          )}>{c.status}</Badge>
                          {c.isAnonymous && <Badge className="bg-rose-50 text-rose-500 border-none text-[8px] font-black px-2">Anonymous</Badge>}
                        </div>
                        <h4 className="text-xl font-black text-black tracking-tight">{c.subject}</h4>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-300 tracking-widest">
                          <Clock className="w-3.5 h-3.5" /> {format(new Date(c.createdAt), "PPp")}
                        </div>
                      </div>
                    </div>

                    <div className="bg-zinc-50/50 p-6 rounded-2xl border border-zinc-100/50">
                      <p className="text-[14px] text-black font-medium leading-relaxed italic">"{c.message}"</p>
                    </div>

                    {c.adminReply && (
                      <div className="pt-6 border-t border-zinc-50 animate-in slide-in-from-top-2 duration-500">
                        <div className="flex items-start gap-4 p-6 bg-emerald-50/30 rounded-[24px] border border-emerald-100/50">
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-500 shadow-sm shrink-0">
                            <MessageSquare className="w-5 h-5" />
                          </div>
                          <div className="space-y-1 flex-1">
                            <div className="flex justify-between items-center">
                              <p className="text-[10px] font-black text-emerald-700 tracking-[0.2em]">Institutional Response</p>
                              <span className="text-[8px] font-black text-emerald-400 tracking-widest">Verified Hub</span>
                            </div>
                            <p className="text-[14px] font-bold text-emerald-800 leading-relaxed">{c.adminReply}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}

              {filtered.length === 0 && (
                <div className="py-32 text-center space-y-6 bg-white rounded-[40px] border-2 border-dashed border-zinc-100">
                  <div className="w-20 h-20 bg-zinc-50 rounded-[28px] flex items-center justify-center mx-auto text-zinc-200 shadow-inner">
                    <History className="w-10 h-10" />
                  </div>
                  <p className="text-[14px] font-bold text-black tracking-widest px-10">Your concern history is empty. Use the form to submit your first query.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </main>
  )
}
