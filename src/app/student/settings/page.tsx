"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  Settings, 
  Type, 
  ShieldCheck, 
  Lock, 
  Clock, 
  Monitor, 
  Save, 
  Loader2,
  Info,
  CheckCircle2,
  User,
  Eye,
  EyeOff
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, update, off } from "firebase/database"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

const FONT_FAMILIES = [
  { label: "Public Sans (Standard)", value: "Public Sans" },
  { label: "Poppins (Modern)", value: "Poppins" },
  { label: "Inter (Technical)", value: "Inter" },
  { label: "Montserrat (Bold)", value: "Montserrat" },
  { label: "Playfair Display (Academic)", value: "Playfair Display" },
]

export default function StudentSettingsPage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const { toast } = useToast()
  const [student, setStudent] = useState<any>(null)
  const [fontFamily, setFontFamily] = useState("Public Sans")
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!database || !user) return
    const instRef = ref(database, `Institutes`)
    onValue(instRef, (snap) => {
      const institutes = snap.val() || {}
      let found = false
      Object.keys(institutes).forEach(id => {
        const adms = institutes[id].admissions || {}
        Object.keys(adms).forEach(aid => {
          if (adms[aid].email?.toLowerCase() === user.email?.toLowerCase()) {
            setStudent({ ...adms[aid], id: aid, adminUid: id })
            setFontFamily(adms[aid].fontPreference || "Public Sans")
            found = true
          }
        })
      })
      setIsLoading(false)
    }, { onlyOnce: true })
  }, [database, user])

  const handleSaveSettings = async () => {
    if (!database || !student) return
    setIsSaving(true)
    try {
      await update(ref(database, `Institutes/${student.adminUid}/admissions/${student.id}`), {
        fontPreference: fontFamily,
        updatedAt: Date.now()
      })
      document.documentElement.style.setProperty('--font-dynamic', `'${fontFamily}', sans-serif`)
      toast({ title: "Preferences Synced", description: "Your portal theme has been updated." })
    } catch (e) {
      toast({ variant: "destructive", title: "Sync Failed" })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div className="p-20 text-center font-black text-zinc-300 animate-pulse">Accessing User Preferences...</div>
  if (!student && !isLoading) return <div className="p-20 text-center text-black font-bold">Record Mapping Failed</div>

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-5xl mx-auto pb-32 font-public-sans text-black">
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 px-2">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[24px] bg-zinc-900 flex items-center justify-center text-white shadow-xl">
            <Settings className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-black tracking-tight leading-none">Portal Settings</h2>
            <p className="text-[10px] font-bold text-black tracking-widest mt-1">Personalize your academic node experience</p>
          </div>
        </div>
        <Button 
          onClick={handleSaveSettings} 
          disabled={isSaving}
          className="bg-primary hover:opacity-90 text-white rounded-2xl h-14 px-10 font-black text-[10px] tracking-widest shadow-xl border-none active:scale-95 transition-all"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Save Preferences
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-10">
          <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-10 space-y-10">
            <div className="flex items-center gap-3 border-b border-zinc-50 pb-4">
              <Type className="w-5 h-5 text-primary" />
              <h3 className="text-[14px] font-black text-black tracking-widest">Typography & Theme</h3>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-black tracking-widest ml-1">Portal Font Family</Label>
                <Select value={fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger className="h-14 rounded-2xl border-zinc-100 bg-zinc-50/50 font-black text-black shadow-inner">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-zinc-100 shadow-2xl">
                    {FONT_FAMILIES.map(font => (
                      <SelectItem key={font.value} value={font.value} className="font-bold">{font.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[9px] text-black font-bold tracking-widest mt-2 ml-1">This preference will follow your account across devices.</p>
              </div>
            </div>
          </Card>

          <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-10 space-y-8">
            <div className="flex items-center gap-3 border-b border-zinc-50 pb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <h3 className="text-[14px] font-black text-black tracking-widest">Security Overview</h3>
            </div>
            <div className="space-y-6">
              <div className="flex justify-between items-center p-6 bg-zinc-50 rounded-[24px] border border-zinc-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-black shadow-sm"><Lock className="w-5 h-5" /></div>
                  <div>
                    <p className="text-[14px] font-black text-black">Portal Password</p>
                    <p className="text-[10px] font-bold text-black tracking-widest">Last updated: Session Start</p>
                  </div>
                </div>
                <Button variant="outline" className="rounded-xl font-black text-[9px] tracking-widest h-9 px-4">Change</Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-8">
          <Card className="border-none shadow-xl rounded-[40px] bg-zinc-900 p-10 text-white relative overflow-hidden h-fit">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="relative z-10 space-y-8 text-center">
              <div className="w-20 h-20 rounded-[28px] bg-white/10 flex items-center justify-center mx-auto mb-6">
                <User className="w-10 h-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h4 className="text-2xl font-black tracking-tight">{student?.studentName}</h4>
                <p className="text-[14px] text-black font-medium tracking-widest">{student?.course} • Section {student?.section || 'A'}</p>
              </div>
              <div className="pt-8 border-t border-white/5 grid grid-cols-2 gap-8">
                <div className="text-left space-y-1">
                  <p className="text-[9px] font-black text-black tracking-widest">Enrollment No</p>
                  <p className="text-[14px] font-black text-white">{student?.admissionNo}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[9px] font-black text-black tracking-widest">Joined On</p>
                  <p className="text-[14px] font-black text-white">{student?.admissionDate}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border border-zinc-100 shadow-sm rounded-[32px] bg-white p-8 space-y-4">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-primary" />
              <h4 className="text-[10px] font-black text-black tracking-widest">Compliance Status</h4>
            </div>
            <p className="text-[14px] text-black font-medium leading-relaxed">Your academic node is currently verified and in sync with the central institution server.</p>
          </Card>
        </div>
      </div>
    </main>
  )
}
