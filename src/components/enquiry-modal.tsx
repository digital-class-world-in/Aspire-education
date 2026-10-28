"use client"

import { useState } from "react"
import { useFirebase } from "@/firebase"
import { push, ref } from "firebase/database"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CheckCircle2, Loader2, X } from "lucide-react"

interface EnquiryModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  resolvedUid?: string | null
  displayedCourses?: any[]
  branchName?: string
}

export function EnquiryModal({ isOpen, onOpenChange, resolvedUid, displayedCourses = [], branchName }: EnquiryModalProps) {
  const { database } = useFirebase()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState({ name: "", phone: "", course: "", message: "" })

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!database || !resolvedUid || isSubmitting) return
    setIsSubmitting(true)
    try {
      await push(ref(database, `landing page enquiry`), {
        ...formData,
        submittedAt: new Date().toISOString(),
        status: "New",
        branch: branchName || "Main"
      })
      setIsSubmitted(true)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { onOpenChange(open); if (!open) setIsSubmitted(false); }}>
      <DialogContent className="w-[95vw] sm:max-w-lg rounded-[32px] p-0 overflow-hidden border-none shadow-2xl bg-white max-h-[95vh] flex flex-col">
        <div className="overflow-y-auto flex-1 w-full scrollbar-thin scrollbar-thumb-zinc-200">
          <div className="p-6 md:p-10 text-black relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />

            <DialogTitle className="text-3xl font-black mb-3 tracking-tight">Begin Your Success Journey</DialogTitle>
            <p className="text-black font-medium mb-8">Fill this quick form — our counsellor will call you within 24 hours.</p>

            {isSubmitted ? (
              <div className="bg-zinc-50 rounded-2xl p-10 text-center border border-zinc-100 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Thank You!</h3>
                <p className="text-black font-medium">We have received your details. Expect a call very soon.</p>
                <Button onClick={() => onOpenChange(false)} className="mt-8 w-full bg-primary text-white hover:opacity-90 h-12 rounded-xl border-none font-bold">Close Window</Button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[14px] font-bold tracking-widest text-black ml-1">Full Name</Label>
                    <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="bg-zinc-50 border-zinc-200 text-black placeholder:text-black h-12 rounded-xl focus:ring-primary focus:border-primary font-bold" placeholder="Enter your full name" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[14px] font-bold tracking-widest text-black ml-1">Mobile Number</Label>
                    <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} className="bg-zinc-50 border-zinc-200 text-black placeholder:text-black h-12 rounded-xl focus:ring-primary focus:border-primary font-bold" placeholder="10-digit number" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[14px] font-bold tracking-widest text-black ml-1">Target Exam / Course</Label>
                  <Select value={formData.course} onValueChange={v => setFormData({ ...formData, course: v })}>
                    <SelectTrigger className="bg-zinc-50 border-zinc-200 text-black h-12 rounded-xl focus:ring-primary focus:border-primary font-bold">
                      <SelectValue placeholder="Select your goal" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-zinc-100 text-black">
                      {displayedCourses.map(c => <SelectItem key={c.id} value={c.name} className="font-bold">{c.name}</SelectItem>)}
                      <SelectItem value="doubt" className="font-bold">Just have some doubts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[14px] font-bold tracking-widest text-black ml-1">Your Message</Label>
                  <Textarea value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} className="bg-zinc-50 border-zinc-200 text-black placeholder:text-black min-h-[140px] rounded-xl focus:ring-primary focus:border-primary font-bold" placeholder="Current class • Target exam • Main problem / goal..." />
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full h-14 bg-primary text-white hover:opacity-90 font-black tracking-widest text-[14px] rounded-2xl shadow-lg border-none active:scale-[0.98] transition-all">
                  {isSubmitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sending...</> : "Submit Enquiry"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
