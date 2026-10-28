
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  Building2, 
  Sparkles,
  Layers,
  Wallet,
  TrendingUp,
  Clock,
  ShieldCheck,
  Calendar
} from "lucide-react"
import { useFirebase, useTranslation } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { useResolvedId } from "@/hooks/use-resolved-id"
import Image from "next/image"

export default function BranchDashboardPage() {
  const { database } = useFirebase()
  const { resolvedId, branchId, isLoading: isIdLoading } = useResolvedId()
  const { t } = useTranslation()
  
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    totalBatches: 0,
    totalStaff: 0
  })
  const [branchProfile, setBranchProfile] = useState<any>(null)

  useEffect(() => {
    if (!database || !resolvedId || !branchId) return

    const rootPath = `Institutes/${resolvedId}`
    
    // Fetch Branch Info
    const branchRef = ref(database, `${rootPath}/branches/${branchId}`)
    onValue(branchRef, (snapshot) => {
      const data = snapshot.val()
      if (data) setBranchProfile(data)
    })

    // Fetch Branch Specific Stats
    onValue(ref(database, `${rootPath}/admissions`), (snap) => {
      const list = Object.values(snap.val() || {}).filter((s: any) => s.branchId === branchId)
      setStats(prev => ({ ...prev, totalStudents: list.length }))
    })

    onValue(ref(database, `${rootPath}/batches`), (snap) => {
      const list = Object.values(snap.val() || {}).filter((b: any) => b.branchId === branchId)
      setStats(prev => ({ ...prev, totalBatches: list.length }))
    })

    onValue(ref(database, `${rootPath}/employees`), (snap) => {
      const list = Object.values(snap.val() || {}).filter((e: any) => e.branchId === branchId)
      setStats(prev => ({ ...prev, totalStaff: list.length }))
    })

    return () => {
      off(branchRef)
    }
  }, [database, resolvedId, branchId])

  if (isIdLoading) return (
    <div className="p-20 text-center font-black text-zinc-300 animate-pulse">
      Syncing Branch Control...
    </div>
  )

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-32 overflow-x-hidden">
      
      {/* 🏙️ WELCOME SECTION */}
      <Card className="border-2 border-black shadow-sm rounded-[40px] bg-white overflow-hidden relative">
        <CardContent className="p-0 flex flex-col md:flex-row items-center h-full">
          <div className="p-12 flex-1 space-y-8 min-w-0">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-emerald-600 animate-pulse" />
              <h2 className="text-3xl font-black font-public-sans tracking-tight text-black whitespace-nowrap truncate">
                HELLO, {branchProfile?.branchName || 'BRANCH'}!
              </h2>
            </div>
            <p className="text-black max-w-sm leading-relaxed text-[14px] font-medium italic">
              "Excellence is not a skill, it's an attitude. Managing your campus operations with real-time accuracy."
            </p>
            <div className="pt-4 flex flex-wrap items-center gap-4">
              <Badge className="bg-emerald-50 text-emerald-600 border-none text-[9px] font-black px-4 py-2 tracking-widest">
                Branch Code: {branchProfile?.branchCode}
              </Badge>
              <Badge className="bg-blue-50 text-primary border-none text-[9px] font-black px-4 py-2 tracking-widest">
                Status: Operational
              </Badge>
            </div>
          </div>
          <div className="relative w-full md:w-[350px] h-full hidden md:flex items-end justify-end pr-12 pb-8">
            <Building2 className="w-48 h-48 text-emerald-50 opacity-20 absolute -z-10" />
            <Image 
              src="https://ik.imagekit.io/2wtn9m5bl/a-man-teacher-working-on-laptop-illustration.png" 
              alt="Branch Illustration" 
              width={280} 
              height={280} 
              className="object-contain drop-shadow-2xl grayscale"
            />
          </div>
        </CardContent>
      </Card>

      {/* 👤 BRANCH PROFILE CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
        <Card className="border-2 border-black shadow-sm rounded-[40px] bg-white p-10 space-y-8">
          <div className="flex items-center gap-4 border-b border-zinc-50 pb-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-primary shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[14px] font-black text-black tracking-widest">{t("campus_info")}</h3>
              <p className="text-[10px] font-bold text-black tracking-widest">Authorized Branch Registry</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-8">
            <ProfileMiniItem icon={<Building2 className="text-primary" />} label="Manager" value={branchProfile?.managerName} />
            <ProfileMiniItem icon={<Layers className="text-indigo-500" />} label="Contact" value={branchProfile?.phone} />
            <ProfileMiniItem icon={<ShieldCheck className="text-blue-500" />} label="Email" value={branchProfile?.email} />
            <ProfileMiniItem icon={<Users className="text-emerald-500" />} label="Total Students" value={stats.totalStudents} />
            <ProfileMiniItem icon={<Users className="text-amber-500" />} label="Total Staff" value={stats.totalStaff} />
            <ProfileMiniItem icon={<Calendar className="text-rose-500" />} label="Active Batches" value={stats.totalBatches} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <Card className="border-none shadow-sm rounded-[32px] bg-white p-10 space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner"><TrendingUp className="w-5 h-5" /></div>
              <div>
                <h3 className="text-lg font-black text-black tracking-tight">Campus Activity</h3>
                <p className="text-[10px] font-bold text-black tracking-widest">Recent Performance & Logs</p>
              </div>
            </div>
            <div className="h-[250px] w-full bg-zinc-50 rounded-[32px] flex items-center justify-center border-2 border-dashed border-zinc-100">
              <p className="text-[10px] font-black text-zinc-300 tracking-[0.3em]">Operational Metrics Stream Initializing...</p>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <Card className="border-none shadow-sm rounded-[40px] bg-zinc-900 p-10 text-white relative overflow-hidden h-fit">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <h4 className="text-[14px] font-black tracking-widest">{t("operational_status")}</h4>
              </div>
              <div className="space-y-6">
                <div className="space-y-1">
                  <p className="text-[14px] font-bold text-white">System Synced</p>
                  <p className="text-[10px] font-bold text-emerald-400 tracking-widest">Global Node: Connected</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[14px] font-bold text-white">Branch Privacy</p>
                  <p className="text-[10px] font-bold text-blue-400 tracking-widest">Level: Isolated & Secure</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  )
}

function ProfileMiniItem({ icon, label, value }: any) {
  return (
    <div className="flex items-center gap-4 group">
      <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center shadow-inner transition-all group-hover:scale-110 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black text-zinc-300 tracking-widest">{label}</p>
        <p className="text-[14px] font-bold text-black truncate">{value || '-'}</p>
      </div>
    </div>
  )
}
