"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Contact, 
  Download, 
  Printer, 
  ShieldCheck, 
  Info,
  Loader2,
  CheckCircle2,
  Share2,
  Maximize,
  User,
  MapPin,
  Phone,
  Mail
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { toPng } from 'html-to-image'
import { cn } from "@/lib/utils"
import { format } from "date-fns"

export default function StudentIdCardPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const router = useRouter()
  const cardRef = useRef<HTMLDivElement>(null)
  
  const [student, setStudent] = useState<any>(null)
  const [instituteProfile, setInstituteProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    if (!database) return
    
    // Resolve Student and Admin Context from Session
    const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('student_session') : null
    if (!sessionStr) {
      router.push('/student/login')
      return
    }

    try {
      const session = JSON.parse(sessionStr)
      const adminUid = session.adminUid
      const studentId = session.studentId

      if (adminUid && studentId) {
        // Fetch Student Data Directly
        onValue(ref(database, `Institutes/${adminUid}/admissions/${studentId}`), (s) => {
          if (s.exists()) {
            setStudent({ ...s.val(), id: studentId })
          }
        })

        // Fetch Institute Profile
        onValue(ref(database, `Institutes/${adminUid}/profile`), (s) => {
          setInstituteProfile(s.val())
          setIsLoading(false)
        })
      } else {
        setIsLoading(false)
      }
    } catch (e) {
      console.error("Session parse error", e)
      setIsLoading(false)
    }
  }, [database])

  const handleDownload = async () => {
    if (!cardRef.current) return
    setIsDownloading(true)
    try {
      const dataUrl = await toPng(cardRef.current, { quality: 1.0, pixelRatio: 3 });
      const link = document.createElement('a');
      link.download = `ID_CARD_${student.studentName.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err)
    } finally {
      setIsDownloading(false)
    }
  }

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 tracking-[0.2em] animate-pulse">Authenticating Identity Credentials...</div>
  if (!student) return (
    <div className="p-20 text-center space-y-6 max-w-md mx-auto">
      <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500 animate-bounce">
        <ShieldCheck className="w-10 h-10" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-black text-black tracking-tight">Access Locked</h3>
        <p className="text-[14px] text-black font-medium">Your enrollment record could not be synchronized with this node. Please re-authenticate to refresh your session.</p>
      </div>
      <Button onClick={() => router.push('/student/login')} className="w-full h-12 bg-primary text-white rounded-xl font-bold text-[14px] tracking-widest border-none">
        Refresh Session
      </Button>
    </div>
  )

  const instituteName = instituteProfile?.instituteName || "ACADEMIC INSTITUTE"

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-5xl mx-auto pb-32">
      
      {/* 💳 HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          {/* <h2 className="text-3xl font-black text-black tracking-tight">Institutional ID Card</h2>
          <p className="text-[14px] text-black font-medium tracking-widest">Official digital identification for the current session</p> */}
        </div>
        <div className="flex items-center gap-3">
          {/* <Button onClick={() => window.print()} variant="outline" className="h-12 px-6 rounded-2xl border-zinc-200 bg-white font-black text-[10px] tracking-widest gap-2 shadow-sm transition-all hover:bg-zinc-50">
            <Printer className="w-4 h-4" /> Print ID Card
          </Button> */}
          <Button 
            onClick={handleDownload} 
            disabled={isDownloading}
            className="h-12 px-8 bg-[#1e3a8a] hover:bg-[#162e6a] text-white rounded-2xl font-black text-[10px] tracking-widest shadow-xl shadow-blue-900/20 active:scale-95 border-none transition-all gap-2"
          >
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isDownloading ? "Generating..." : "Download PNG"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* 💳 THE ID CARD PREVIEW */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div ref={cardRef} className="w-[380px] bg-white rounded-[40px] border border-zinc-100 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col print:shadow-none print:border print:m-0">
            {/* Front Header */}
            <div className="bg-[#1e3a8a] p-8 text-center space-y-1 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
              <h3 className="text-white font-black text-[14px] tracking-[0.2em]">{instituteName}</h3>
              <p className="text-white/40 text-[9px] font-bold tracking-[0.3em]">Student Identity Card</p>
            </div>

            {/* Photo & Main Info */}
            <div className="p-10 flex flex-col items-center gap-8">
              <div className="relative">
                <Avatar className="h-36 w-36 rounded-[40px] border-[8px] border-zinc-50 shadow-lg">
                  <AvatarFallback className="text-4xl font-black bg-zinc-100 text-zinc-300">{student.studentName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2.5 rounded-2xl shadow-xl border-4 border-white">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>

              <div className="text-center space-y-1">
                <h4 className="text-2xl font-black text-black tracking-tight leading-none">{student.studentName}</h4>
                <p className="text-[#1e3a8a] font-black text-[14px] tracking-[0.2em]">{student.course}</p>
              </div>

              <div className="w-full grid grid-cols-2 gap-y-6 pt-8 text-black border-t border-zinc-50">
                <IdMeta label="Adm No." value={student.admissionNo} />
                <IdMeta label="Roll No." value={student.rollNo || '-'} />
                <IdMeta label="Section" value={student.section || 'General'} />
                <IdMeta label="Validity" value="2024-2025" />
              </div>
            </div>

            {/* Card Footer */}
            <div className="bg-zinc-50 p-6 border-t border-zinc-100 text-center space-y-4">
              {/* <div className="h-10 w-full bg-white rounded-xl border border-zinc-100 flex items-center justify-center font-public-sans text-[9px] text-black tracking-[0.5em] shadow-inner">
                * * * * ACADEMIC VERIFIED * * * *
              </div> */}
            </div>
          </div>
        </div>

        {/* 📋 INSTRUCTIONS & STATUS */}
        <div className="lg:col-span-6 space-y-8">
          <Card className="border-none shadow-sm rounded-[32px] bg-white p-10 space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-black text-black tracking-tight">Identity Status: Verified</h4>
                <p className="text-[10px] font-bold text-black tracking-widest">Last Synced: {format(new Date(), "PP")}</p>
              </div>
            </div>

            <div className="space-y-6">
              <h5 className="text-[10px] font-black text-black tracking-[0.2em] border-b border-zinc-50 pb-2">Usage Policies</h5>
              <div className="space-y-4">
                <PolicyItem icon={<Maximize className="w-4 h-4" />} text="This card is valid for the entire academic session 2024-25." />
                <PolicyItem icon={<Share2 className="w-4 h-4" />} text="Always carry a digital or physical copy within the campus." />
                <PolicyItem icon={<ShieldCheck className="w-4 h-4" />} text="Misuse or alteration of this card is a serious academic offense." />
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-50 grid grid-cols-2 gap-6">
              <ContactMini label="Contact Office" value={instituteProfile?.phone || '-'} icon={<Phone />} />
              <ContactMini label="Support Email" value={instituteProfile?.email || '-'} icon={<Mail />} />
            </div>
          </Card>
          
        </div>
      </div>
    </main>
  )
}

function IdMeta({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="space-y-1">
      <p className="text-[8px] font-black text-black tracking-[0.2em]">{label}</p>
      <p className="text-[14px] font-black text-black tracking-tight">{value}</p>
    </div>
  )
}

function PolicyItem({ icon, text }: { icon: any, text: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="text-black mt-0.5">{icon}</div>
      <p className="text-[14px] text-black font-medium leading-relaxed">{text}</p>
    </div>
  )
}

function ContactMini({ label, value, icon }: { label: string, value: string, icon: any }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center text-black">{icon}</div>
      <div className="flex flex-col">
        <span className="text-[8px] font-black text-black tracking-tighter">{label}</span>
        <span className="text-[10px] font-bold text-black truncate max-w-[120px]">{value}</span>
      </div>
    </div>
  )
}
