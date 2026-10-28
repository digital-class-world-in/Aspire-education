
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Building2, 
  ImageIcon, 
  GraduationCap, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  ChevronLeft,
  Loader2,
  ShieldCheck,
  Rocket,
  Globe,
  Plus,
  UserPlus,
  Sparkles
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, update, push, set } from "firebase/database"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function OnboardingSetupPage() {
  const router = useRouter()
  const { database } = useFirebase()
  const { user } = useUser()
  
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    if (!database || !user) return
    onValue(ref(database, `Institutes/${user.uid}/profile`), (snapshot) => {
      if (snapshot.exists()) setProfile(snapshot.val())
    })
  }, [database, user])

  const nextStep = () => setStep(prev => Math.min(prev + 1, 5))
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1))

  const handleFinalize = async () => {
    if (!database || !user) return
    setIsSubmitting(true)
    try {
      await update(ref(database, `Institutes/${user.uid}/profile`), {
        onboarding_completed: true,
        status: "Active",
        setupDate: new Date().toISOString()
      })
      toast({ title: "Setup Complete", description: "Your institutional dashboard is now ready." })
      router.push("/")
    } catch (e) {
      toast({ variant: "destructive", title: "Error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (step) {
      case 1: return <StepInstituteDetails profile={profile} onNext={nextStep} />
      case 2: return <StepLogo profile={profile} onNext={nextStep} />
      case 3: return <StepFirstCourse onNext={nextStep} />
      case 4: return <StepFirstStaff onNext={nextStep} />
      case 5: return <StepReady onFinalize={handleFinalize} isSubmitting={isSubmitting} />
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-public-sans text-black">
      <header className="h-20 bg-white border-b border-zinc-100 flex items-center justify-between px-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg">
            <Rocket className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black tracking-tight">Onboarding <span className="text-primary">Studio</span></h1>
        </div>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={cn(
                "w-2.5 h-2.5 rounded-full transition-all duration-500",
                step >= i ? "bg-primary scale-110 shadow-lg" : "bg-zinc-200"
              )} />
            ))}
          </div>
          <Badge className="bg-zinc-900 text-white border-none text-[9px] font-black px-3 py-1">Step {step} of 5</Badge>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        </div>
        <div className="max-w-4xl mx-auto h-full flex flex-col justify-center p-10 relative z-10">
          <div className="animate-in slide-in-from-bottom-4 duration-700">
            {renderStep()}
          </div>
        </div>
      </main>
    </div>
  )
}

function StepInstituteDetails({ profile, onNext }: any) {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <h2 className="text-4xl font-black text-black tracking-tight leading-none">Institute Identity</h2>
        <p className="text-lg text-black font-medium italic">"Verify your institutional metadata for official registry."</p>
      </div>
      <Card className="border border-zinc-100 shadow-xl rounded-[40px] bg-white p-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <Label className="text-[10px] font-black tracking-widest text-black ml-1">Institute Name</Label>
            <Input defaultValue={profile?.instituteName} className="h-14 rounded-2xl font-bold bg-zinc-50/50" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black tracking-widest text-black ml-1">Contact Email</Label>
            <Input defaultValue={profile?.email} className="h-14 rounded-2xl font-bold bg-zinc-50/50" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-[10px] font-black tracking-widest text-black ml-1">Physical Address</Label>
            <Textarea defaultValue={profile?.address} className="rounded-3xl bg-zinc-50/50 min-h-[100px] font-medium" />
          </div>
        </div>
        <Button onClick={onNext} className="w-full h-16 bg-zinc-900 hover:bg-black text-white rounded-3xl font-black text-[14px] tracking-widest shadow-xl transition-all border-none">
          Verify & Continue <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </Card>
    </div>
  )
}

function StepLogo({ profile, onNext }: any) {
  return (
    <div className="space-y-10 text-center">
      <div className="space-y-3">
        <h2 className="text-4xl font-black text-black tracking-tight leading-none">Brand Identity</h2>
        <p className="text-lg text-black font-medium italic">"Upload your master logo for portals and receipts."</p>
      </div>
      <div className="max-w-md mx-auto">
        <Card className="border-2 border-dashed border-zinc-200 shadow-sm rounded-[48px] bg-white p-16 flex flex-col items-center gap-8 cursor-pointer hover:border-primary/40 transition-all">
          <div className="w-32 h-32 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-300">
            <ImageIcon className="w-16 h-16" />
          </div>
          <div className="space-y-2">
            <p className="text-[14px] font-black tracking-widest text-black">Drop your logo here</p>
            <p className="text-[10px] font-bold text-black tracking-widest">PNG or SVG • Max 2MB</p>
          </div>
          <Input type="file" className="hidden" />
        </Card>
        <div className="mt-10 flex gap-4">
          <Button onClick={onNext} className="flex-1 h-14 bg-primary text-white rounded-2xl font-black text-[10px] tracking-widest border-none shadow-xl">Use Default & Continue</Button>
        </div>
      </div>
    </div>
  )
}

function StepFirstCourse({ onNext }: any) {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <h2 className="text-4xl font-black text-black tracking-tight leading-none">Catalog Node</h2>
        <p className="text-lg text-black font-medium italic">"Initialize your first academic program."</p>
      </div>
      <Card className="border border-zinc-100 shadow-xl rounded-[40px] bg-white p-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2 md:col-span-2">
            <Label className="text-[10px] font-black tracking-widest text-black ml-1">Program Name</Label>
            <Input placeholder="e.g. Master of Data Science" className="h-14 rounded-2xl font-bold bg-zinc-50/50" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black tracking-widest text-black ml-1">Duration (Months)</Label>
            <Input type="number" placeholder="12" className="h-14 rounded-2xl font-bold bg-zinc-50/50" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black tracking-widest text-black ml-1">Annual Fee (INR)</Label>
            <Input type="number" placeholder="45000" className="h-14 rounded-2xl font-bold bg-zinc-50/50" />
          </div>
        </div>
        <Button onClick={onNext} className="w-full h-16 bg-zinc-900 hover:bg-black text-white rounded-3xl font-black text-[14px] tracking-widest shadow-xl transition-all border-none">
          Add Program Node <Plus className="ml-2 w-5 h-5" />
        </Button>
      </Card>
    </div>
  )
}

function StepFirstStaff({ onNext }: any) {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <h2 className="text-4xl font-black text-black tracking-tight leading-none">Faculty Registry</h2>
        <p className="text-lg text-black font-medium italic">"Invite or register your first staff member."</p>
      </div>
      <Card className="border border-zinc-100 shadow-xl rounded-[40px] bg-white p-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <Label className="text-[10px] font-black tracking-widest text-black ml-1">Staff Full Name</Label>
            <Input placeholder="Dr. Alice Johnson" className="h-14 rounded-2xl font-bold bg-zinc-50/50" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black tracking-widest text-black ml-1">Official Email</Label>
            <Input type="email" placeholder="alice@institute.com" className="h-14 rounded-2xl font-bold bg-zinc-50/50" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-[10px] font-black tracking-widest text-black ml-1">Designation</Label>
            <Input placeholder="Professor / HOD / Administrator" className="h-14 rounded-2xl font-bold bg-zinc-50/50" />
          </div>
        </div>
        <Button onClick={onNext} className="w-full h-16 bg-zinc-900 hover:bg-black text-white rounded-3xl font-black text-[14px] tracking-widest shadow-xl transition-all border-none">
          Register Staff Member <UserPlus className="ml-2 w-5 h-5" />
        </Button>
      </Card>
    </div>
  )
}

function StepReady({ onFinalize, isSubmitting }: any) {
  return (
    <div className="space-y-12 text-center max-w-2xl mx-auto">
      <div className="relative">
        <div className="w-32 h-32 rounded-[40px] bg-emerald-50 flex items-center justify-center text-emerald-500 mx-auto shadow-inner animate-bounce duration-1000">
          <CheckCircle2 className="w-16 h-16" />
        </div>
        <div className="absolute -top-4 -right-4">
          <Sparkles className="w-12 h-12 text-amber-400 animate-pulse" />
        </div>
      </div>
      <div className="space-y-4">
        <h2 className="text-5xl font-black text-black tracking-tight leading-none">Node Synchronized</h2>
        <p className="text-xl text-black font-medium italic">"Your institutional workspace is fully configured and ready for production."</p>
      </div>
      <div className="bg-zinc-900 p-10 rounded-[48px] text-white space-y-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-3xl" />
        <div className="space-y-4 relative z-10">
          <Badge className="bg-emerald-500/20 text-emerald-400 border-none px-4 py-1.5 text-[10px] font-black tracking-widest">Active License</Badge>
          <div className="flex flex-col items-center gap-2">
            <p className="text-[14px] font-bold text-black tracking-widest">Global Status</p>
            <p className="text-2xl font-black tracking-tight flex items-center gap-3"><ShieldCheck className="w-6 h-6 text-primary" /> Verified Hub Established</p>
          </div>
        </div>
        <Button 
          onClick={onFinalize} 
          disabled={isSubmitting}
          className="w-full h-16 bg-primary hover:opacity-90 text-white rounded-[24px] font-black text-[14px] tracking-[0.2em] border-none shadow-xl shadow-teal-900/40 active:scale-95 transition-all"
        >
          {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : "Launch Mainframe Dashboard"}
        </Button>
      </div>
    </div>
  )
}
