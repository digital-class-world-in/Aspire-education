
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  CalendarDays, 
  ShieldCheck, 
  CheckCircle2,
  Info,
  Clock,
  Landmark,
  FileText
} from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, off } from "firebase/database"
import { useResolvedId } from "@/hooks/use-resolved-id"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

export default function StaffProfilePage() {
  const { database } = useFirebase()
  const { user } = useUser()
  const { resolvedId, isLoading: isIdLoading } = useResolvedId()
  
  const [staff, setStaff] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!database || !resolvedId || !user) return

    const rootPath = `Institutes/${resolvedId}`
    const employeesRef = ref(database, `${rootPath}/employees`)
    
    onValue(employeesRef, (snapshot) => {
      const data = snapshot.val() || {}
      const current = Object.values(data).find((e: any) => e.staffEmail?.toLowerCase() === user.email?.toLowerCase())
      setStaff(current)
      setIsLoading(false)
    })

    return () => off(employeesRef)
  }, [database, resolvedId, user])

  if (isLoading || isIdLoading) return <div className="p-20 text-center font-black text-zinc-300 tracking-widest animate-pulse">Establishing Secure Profile Sync...</div>
  if (!staff) return <div className="p-20 text-center text-black font-bold">Record Mapping Failed</div>

  return (
    <main className="flex-1 p-8 space-y-10 animate-in fade-in duration-700 max-w-6xl mx-auto pb-32">
      
      {/* 👤 PROFILE HEADER */}
      <Card className="border-none shadow-xl rounded-[40px] bg-white overflow-hidden p-12">
        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="relative shrink-0">
            <Avatar className="h-48 w-48 rounded-[48px] border-[10px] border-zinc-50 shadow-2xl">
              <AvatarFallback className="bg-primary text-white text-6xl font-black">{staff.firstName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-3 -right-3 bg-emerald-500 text-white p-4 rounded-[24px] shadow-xl border-4 border-white">
              <ShieldCheck className="w-8 h-8" />
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-6">
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-black tracking-tight leading-none">{staff.firstName} {staff.lastName}</h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <Badge className="bg-blue-50 text-primary border-none text-[10px] font-black tracking-widest px-4 py-1">Emp ID: {staff.employeeId}</Badge>
                <Badge className="bg-emerald-50 text-emerald-600 border-none text-[10px] font-black tracking-widest px-4 py-1">Verified Account</Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pt-4">
              <ContactItem icon={<Mail className="text-blue-500" />} label="Work Email" value={staff.staffEmail} />
              <ContactItem icon={<Phone className="text-emerald-500" />} label="Mobile" value={staff.phone} />
              <ContactItem icon={<Briefcase className="text-amber-500" />} label="Designation" value={staff.designation} />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* 📋 PROFESSIONAL DETAILS */}
        <div className="lg:col-span-8 space-y-8">
          <Card className="border-none shadow-sm rounded-[32px] bg-white p-10 space-y-12">
            <section className="space-y-8">
              <SectionHeader icon={<Info className="text-primary" />} title="Employment Context" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                <DetailRow label="Department" value={staff.department} />
                <DetailRow label="Date of Joining" value={staff.joiningDate} />
                <DetailRow label="Work Experience" value={staff.workExperience || 'N/A'} />
                <DetailRow label="Qualification" value={staff.qualification || 'N/A'} />
                <DetailRow label="Marital Status" value={staff.maritalStatus} />
                <DetailRow label="Gender" value={staff.gender} />
              </div>
            </section>

            <section className="space-y-8">
              <SectionHeader icon={<MapPin className="text-rose-500" />} title="Residency & Contact" />
              <div className="grid grid-cols-1 gap-6">
                <DetailRow label="Current Address" value={staff.address} />
                <DetailRow label="Permanent Address" value={staff.permanentAddress} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <DetailRow label="Emergency Contact" value={staff.emergencyContact} />
                  <DetailRow label="Father Name" value={staff.fatherName} />
                </div>
              </div>
            </section>
          </Card>
        </div>

        {/* 🏦 BANK & SOCIAL */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="border-none shadow-sm rounded-[32px] bg-zinc-900 p-10 text-white space-y-8 h-fit">
            <SectionHeader icon={<Landmark className="text-primary" />} title="Bank Details" />
            <div className="space-y-6">
              <BankRow label="Account Holder" value={staff.accountHolderName || `${staff.firstName} ${staff.lastName}`} />
              <BankRow label="Bank Name" value={staff.bankName || '-'} />
              <BankRow label="Account Number" value={staff.bankAccountNumber ? `XXXX${staff.bankAccountNumber.slice(-4)}` : '-'} />
              <BankRow label="IFSC Code" value={staff.ifscCode || '-'} />
            </div>
          </Card>

          <Card className="border-none shadow-sm rounded-[32px] bg-white p-10 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-black">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-[14px] font-black tracking-tight">Access Level</h4>
                <p className="text-[10px] font-bold text-emerald-500 tracking-widest">Authorized Faculty</p>
              </div>
            </div>
            <p className="text-[14px] text-black leading-relaxed font-medium">Your profile information is secured using institutional encryption standards.</p>
          </Card>
        </div>
      </div>
    </main>
  )
}

function ContactItem({ icon, label, value }: any) {
  return (
    <div className="flex items-center gap-4 group">
      <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black text-zinc-300 tracking-widest">{label}</p>
        <p className="text-[14px] font-bold text-black truncate">{value || '-'}</p>
      </div>
    </div>
  )
}

function SectionHeader({ icon, title }: any) {
  return (
    <h3 className="text-[14px] font-black text-black flex items-center gap-3 tracking-tight">
      <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center shadow-inner">{icon}</div>
      {title}
    </h3>
  )
}

function DetailRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-1.5 group">
      <p className="text-[10px] font-black text-black tracking-widest group-hover:text-primary transition-colors">{label}</p>
      <div className="min-h-[44px] flex items-center px-5 bg-zinc-50/50 rounded-2xl text-[14px] font-bold text-black border border-transparent group-hover:border-zinc-100 transition-all shadow-inner">
        {value || '-'}
      </div>
    </div>
  )
}

function BankRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
      <span className="text-[9px] font-bold text-white/40 tracking-widest">{label}</span>
      <span className="text-[14px] font-black text-white">{value}</span>
    </div>
  )
}
